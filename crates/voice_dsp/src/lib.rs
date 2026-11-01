//! Voice DSP: Audio processing, RMS, and 32-band spectral magnitude simulation

use serde::{Deserialize, Serialize};

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

/// Computes the Root Mean Square (RMS) of 16-bit PCM little-endian samples.
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

/// Generates normalized 32-band frequency bins for the animated Gemini SVG orb
pub fn compute_spectrum_bands(rms: f32, phase: f32) -> [f32; FFT_BANDS] {
    let mut bands = [0.0f32; FFT_BANDS];
    for (i, item) in bands.iter_mut().enumerate() {
        let f_idx = i as f32;
        let wave = (phase * 1.5 + f_idx * 0.3).sin().abs() * (phase * 0.8 - f_idx * 0.15).cos().powi(2);
        let val = (rms * 1.8 + 0.08 * wave) * (1.0 - f_idx / 40.0);
        *item = val.clamp(0.02, 1.0);
    }
    bands
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_pcm_rms() {
        assert_eq!(compute_pcm16_rms(&[]), 0.0);
    }

    #[test]
    fn test_pcm16_rms_silence() {
        let zeros = vec![0u8; 640];
        assert_eq!(compute_pcm16_rms(&zeros), 0.0);
    }

    #[test]
    fn test_spectrum_bands_range() {
        let bands = compute_spectrum_bands(0.2, 1.0);
        assert_eq!(bands.len(), FFT_BANDS);
        for &b in &bands {
            assert!(b >= 0.0 && b <= 1.0);
        }
    }
}
