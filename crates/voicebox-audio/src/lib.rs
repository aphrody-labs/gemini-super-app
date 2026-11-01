//! Consolidated Voicebox Audio Engine (`vendor/voicebox/tauri/src-tauri` -> `crates/voicebox-audio`).
//!
//! Provides linear resampling, mono downmixing, WAV memory encoding (`hound`),
//! multi-device playback routing, SSE speak-monitor events, and voice cloning
//! profile definitions for Gemini 3.8 Flash TTS, Qwen3-TTS, and Kokoro.

use hound::{SampleFormat, WavSpec, WavWriter};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum VoiceboxAudioError {
    #[error("WAV encoding error: {0}")]
    WavError(#[from] hound::Error),
    #[error("Invalid sample rate: {0}")]
    InvalidSampleRate(u32),
}

/// Supported TTS & Voice Cloning engines in the consolidated Voicebox Studio.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VoiceboxTtsEngine {
    Gemini38FlashTts,
    Gemini38FlashLiteTts,
    Qwen3Tts,
    Kokoro82M,
    EdgeTtsNeural,
}

/// Voice profile for multi-speaker studio synthesis and cloning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceProfile {
    pub id: String,
    pub name: String,
    pub engine: VoiceboxTtsEngine,
    pub base_voice: String,
    pub language: String,
    pub style_prompt: String,
    pub reference_audio_path: Option<String>,
}

/// Multi-track studio clip item on the Voicebox timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioTimelineClip {
    pub clip_id: String,
    pub profile_id: String,
    pub transcript: String,
    pub start_ms: u64,
    pub duration_ms: u64,
    pub gain_db: f32,
}

/// Real-time speak monitor event (consolidated from `vendor/voicebox/tauri/src-tauri/src/speak_monitor.rs`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakMonitorEvent {
    pub channel_id: String,
    pub profile_id: String,
    pub is_speaking: bool,
    pub rms_level: f32,
    pub timestamp_ms: u64,
}

/// Downmix interleaved multi-channel f32 samples into mono f32 samples.
pub fn downmix_to_mono(samples: &[f32], channels: usize) -> Vec<f32> {
    if channels <= 1 {
        return samples.to_vec();
    }
    samples
        .chunks(channels)
        .map(|frame| frame.iter().copied().sum::<f32>() / (frame.len() as f32))
        .collect()
}

/// Linear resampler from `from_rate` to `to_rate` (adapted from `vendor/voicebox/tauri/src-tauri/src/audio_capture/mod.rs`).
pub fn resample_linear(samples: &[f32], from_rate: u32, to_rate: u32) -> Result<Vec<f32>, VoiceboxAudioError> {
    if from_rate == 0 || to_rate == 0 {
        return Err(VoiceboxAudioError::InvalidSampleRate(0));
    }
    if from_rate == to_rate || samples.is_empty() {
        return Ok(samples.to_vec());
    }
    let ratio = f64::from(from_rate) / f64::from(to_rate);
    let output_len = ((samples.len() as f64) / ratio).ceil() as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_idx = (i as f64) * ratio;
        let idx0 = src_idx.floor() as usize;
        let idx1 = (idx0 + 1).min(samples.len() - 1);
        let frac = (src_idx - (idx0 as f64)) as f32;
        let sample = samples[idx0] * (1.0 - frac) + samples[idx1] * frac;
        output.push(sample);
    }
    Ok(output)
}

/// Encode mono f32 samples (-1.0..1.0) into an in-memory 16-bit PCM WAV byte buffer.
pub fn encode_wav_pcm16_mono(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, VoiceboxAudioError> {
    if sample_rate == 0 {
        return Err(VoiceboxAudioError::InvalidSampleRate(0));
    }
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut writer = WavWriter::new(&mut buffer, spec)?;
        for &sample in samples {
            let clamped = sample.clamp(-1.0, 1.0);
            let pcm16 = (clamped * 32767.0) as i16;
            writer.write_sample(pcm16)?;
        }
        writer.finalize()?;
    }
    Ok(buffer.into_inner())
}

/// Built-in default Gemini 3.8 HD voices for Voicebox Studio.
pub fn default_gemini_voice_profiles() -> Vec<VoiceProfile> {
    vec![
        VoiceProfile {
            id: "gemini-aoede".to_string(),
            name: "Aoede (Gemini 3.8 HD)".to_string(),
            engine: VoiceboxTtsEngine::Gemini38FlashTts,
            base_voice: "Aoede".to_string(),
            language: "fr-FR".to_string(),
            style_prompt: "Warm, expressive, natural conversational cadence".to_string(),
            reference_audio_path: None,
        },
        VoiceProfile {
            id: "gemini-puck".to_string(),
            name: "Puck (Gemini 3.8 HD)".to_string(),
            engine: VoiceboxTtsEngine::Gemini38FlashTts,
            base_voice: "Puck".to_string(),
            language: "en-US".to_string(),
            style_prompt: "Dynamic, energetic technical assistant".to_string(),
            reference_audio_path: None,
        },
        VoiceProfile {
            id: "gemini-kore".to_string(),
            name: "Kore (Gemini 3.8 HD)".to_string(),
            engine: VoiceboxTtsEngine::Gemini38FlashTts,
            base_voice: "Kore".to_string(),
            language: "fr-FR".to_string(),
            style_prompt: "Calm, clear studio narrator".to_string(),
            reference_audio_path: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_downmix_and_resample_and_wav_encode() {
        let stereo = vec![0.5f32, -0.5f32, 0.2f32, 0.6f32];
        let mono = downmix_to_mono(&stereo, 2);
        assert_eq!(mono.len(), 2);
        assert!((mono[0] - 0.0).abs() < 1e-6);
        assert!((mono[1] - 0.4).abs() < 1e-6);

        let resampled = resample_linear(&vec![0.1f32; 480], 48_000, 16_000).unwrap();
        assert_eq!(resampled.len(), 160);

        let wav_bytes = encode_wav_pcm16_mono(&resampled, 16_000).unwrap();
        assert!(wav_bytes.starts_with(b"RIFF"));
        assert!(wav_bytes.len() > 44);

        let profiles = default_gemini_voice_profiles();
        assert_eq!(profiles.len(), 3);
        assert_eq!(profiles[0].base_voice, "Aoede");
    }
}
