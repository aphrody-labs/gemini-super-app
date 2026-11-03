//! Voice DSP: PCM RMS and 32-band frequency analysis.

use rustfft::{Fft, FftPlanner, num_complex::Complex};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, OnceLock};

pub const FFT_BANDS: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioTelemetry {
    pub input_rms: f32,
    pub output_rms: f32,
    pub fft: [f32; FFT_BANDS],
    pub is_speech: bool,
}

impl Default for AudioTelemetry {
    fn default() -> Self {
        Self {
            input_rms: 0.0,
            output_rms: 0.0,
            fft: [0.0; FFT_BANDS],
            is_speech: false,
        }
    }
}

/// 32-band spectrum frame with RMS and VAD flag for the animated Gemini SVG Orb.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SpectrumFrame {
    pub bands: Vec<f32>,
    pub rms: f32,
    pub sample_rate_hz: u32,
    pub is_speech: bool,
}

/// Computes the Root Mean Square (RMS) of 16-bit PCM little-endian bytes.
pub fn compute_pcm16_rms(raw_bytes: &[u8]) -> f32 {
    if raw_bytes.len() < 2 {
        return 0.0;
    }
    let sample_count = raw_bytes.len() / 2;
    let mut sum_sq = 0.0f64;

    for chunk in raw_bytes.chunks_exact(2) {
        let sample = i16::from_le_bytes([chunk[0], chunk[1]]) as f64 / 32768.0;
        sum_sq += sample * sample;
    }

    (sum_sq / sample_count as f64).sqrt() as f32
}

/// Computes the Root Mean Square (RMS) directly from a slice of `i16` PCM samples.
pub fn compute_rms(samples: &[i16]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f64 = samples
        .iter()
        .map(|&s| {
            let v = f64::from(s) / 32768.0;
            v * v
        })
        .sum();
    (sum_sq / (samples.len() as f64)).sqrt() as f32
}

/// Analyze the most recent 1024 samples with a Hann-windowed FFT. Bands are
/// linearly spaced from DC to just below Nyquist and use peak bin amplitude.
pub fn compute_spectrum_32(samples: &[i16], sample_rate_hz: u32) -> SpectrumFrame {
    const FFT_SIZE: usize = 1024;
    static FFT: OnceLock<Arc<dyn Fft<f32>>> = OnceLock::new();
    let rms = compute_rms(samples);
    let recent = &samples[samples.len().saturating_sub(FFT_SIZE)..];
    let mut buffer = vec![Complex::new(0.0, 0.0); FFT_SIZE];
    let mut window_sum = 0.0;
    for (i, sample) in recent.iter().enumerate() {
        let window = if recent.len() > 2 {
            0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / (recent.len() - 1) as f32).cos()
        } else {
            1.0
        };
        buffer[i].re = f32::from(*sample) / 32768.0 * window;
        window_sum += window;
    }
    let mut bands = vec![0.0f32; FFT_BANDS];
    if window_sum > 0.0 {
        FFT.get_or_init(|| FftPlanner::<f32>::new().plan_fft_forward(FFT_SIZE))
            .process(&mut buffer);
        for (bin, value) in buffer.iter().enumerate().take(FFT_SIZE / 2) {
            let scale = if bin == 0 { 1.0 } else { 2.0 };
            let amplitude = (value.norm() * scale / window_sum).clamp(0.0, 1.0);
            let band = bin * FFT_BANDS / (FFT_SIZE / 2);
            bands[band] = bands[band].max(amplitude);
        }
    }
    SpectrumFrame {
        bands,
        rms,
        sample_rate_hz,
        is_speech: rms > 0.025,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_pcm_rms() {
        assert_eq!(compute_pcm16_rms(&[]), 0.0);
        assert_eq!(compute_rms(&[]), 0.0);
    }

    #[test]
    fn test_pcm16_rms_silence() {
        let zeros = vec![0u8; 640];
        assert_eq!(compute_pcm16_rms(&zeros), 0.0);
    }

    #[test]
    fn spectrum_tracks_frequency_and_silence() {
        let silence = compute_spectrum_32(&[0; 1024], 16_000);
        assert!(silence.bands.iter().all(|&value| value == 0.0));
        assert!(!silence.is_speech);
        for (frequency, expected_band) in [(500.0, 2), (2000.0, 8)] {
            let samples: Vec<i16> = (0..1024)
                .map(|i| {
                    (16000.0 * (2.0 * std::f32::consts::PI * frequency * i as f32 / 16000.0).sin())
                        as i16
                })
                .collect();
            let frame = compute_spectrum_32(&samples, 16_000);
            let peak = frame
                .bands
                .iter()
                .enumerate()
                .max_by(|a, b| a.1.total_cmp(b.1))
                .unwrap()
                .0;
            assert_eq!(peak, expected_band);
            assert!(frame.bands[peak] > 0.45);
            assert!(frame.is_speech);
        }
    }
}
