//! Consolidated Locally-Uncensored Voice & Music Engine (`vendor/locally-uncensored` -> `crates/lu-voice-engine`).
//!
//! Migrates all Python process invocations from legacy `python`/`pip` to `uv run`
//! (`uv 0.13.6+`), and unifies the configuration and command builders for:
//! - Full-duplex local Voice Loop (`voice_loop/main.py` & `voice_bridge_server.py`)
//! - Local Faster-Whisper / `whisper-server` STT (`127.0.0.1:8179`)
//! - Local Piper ONNX TTS & Gemini 3.8 Flash TTS fallback
//! - ACE-Step 1.5 & AudioCraft Music Generation

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LuVoiceError {
    #[error("Invalid port configuration: {0}")]
    InvalidPort(u16),
    #[error("Empty prompt provided for synthesis")]
    EmptyPrompt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VoiceLoopState {
    Stopped,
    Starting,
    Listening,
    Thinking,
    Speaking,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LuVoiceLoopConfig {
    pub ws_port: u16,
    pub whisper_port: u16,
    pub tts_engine: String,
    pub gemini_model: String,
    pub thinking_model: String,
    pub wake_word_enabled: bool,
    pub silence_duration_ms: u32,
}

impl Default for LuVoiceLoopConfig {
    fn default() -> Self {
        Self {
            ws_port: 8765,
            whisper_port: 8179,
            tts_engine: "gemini-3.8-flash-tts".to_string(),
            gemini_model: "gemini-3.8-live".to_string(),
            thinking_model: "gemini-4-argon".to_string(),
            wake_word_enabled: true,
            silence_duration_ms: 250,
        }
    }
}

impl LuVoiceLoopConfig {
    /// Build the `uv run` command arguments to launch the consolidated voice loop server.
    pub fn build_uv_command(&self, script_path: &str) -> Result<Vec<String>, LuVoiceError> {
        if self.ws_port == 0 || self.whisper_port == 0 {
            return Err(LuVoiceError::InvalidPort(0));
        }
        Ok(vec![
            "uv".to_string(),
            "run".to_string(),
            "python".to_string(),
            script_path.to_string(),
            "--ws-port".to_string(),
            self.ws_port.to_string(),
            "--whisper-port".to_string(),
            self.whisper_port.to_string(),
            "--tts-engine".to_string(),
            self.tts_engine.clone(),
            "--gemini-model".to_string(),
            self.gemini_model.clone(),
            "--silence-ms".to_string(),
            self.silence_duration_ms.to_string(),
        ])
    }
}

/// Music generation request supporting both ACE-Step 1.5 (from `locally-uncensored`)
/// and AudioCraft MusicGen / Google Lyria.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicGenerationSpec {
    pub engine: String,
    pub prompt: String,
    pub lyrics: Option<String>,
    pub duration_secs: u32,
    pub bpm: Option<u16>,
    pub sample_rate_hz: u32,
}

impl MusicGenerationSpec {
    pub fn validate(&self) -> Result<(), LuVoiceError> {
        if self.prompt.trim().is_empty() {
            return Err(LuVoiceError::EmptyPrompt);
        }
        Ok(())
    }

    pub fn build_uv_music_args(&self, hub_script: &str) -> Result<Vec<String>, LuVoiceError> {
        self.validate()?;
        let mut args = vec![
            "uv".to_string(),
            "run".to_string(),
            "python".to_string(),
            hub_script.to_string(),
            "--mode".to_string(),
            "music".to_string(),
            "--engine".to_string(),
            self.engine.clone(),
            "--prompt".to_string(),
            self.prompt.clone(),
            "--duration".to_string(),
            self.duration_secs.to_string(),
        ];
        if let Some(lyrics) = &self.lyrics {
            if !lyrics.trim().is_empty() {
                args.push("--lyrics".to_string());
                args.push(lyrics.clone());
            }
        }
        Ok(args)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uv_voice_loop_and_music_command_generation() {
        let cfg = LuVoiceLoopConfig::default();
        let cmd = cfg
            .build_uv_command("backend/voice_bridge_server.py")
            .unwrap();
        assert_eq!(cmd[0], "uv");
        assert_eq!(cmd[1], "run");
        assert!(cmd.contains(&"gemini-3.8-live".to_string()));

        let spec = MusicGenerationSpec {
            engine: "audiocraft-musicgen-stereo-large".to_string(),
            prompt: "Ambient synthwave with warm analog pads and deep sub bass".to_string(),
            lyrics: None,
            duration_secs: 15,
            bpm: Some(110),
            sample_rate_hz: 32_000,
        };
        let music_cmd = spec
            .build_uv_music_args("backend/super_app_hub.py")
            .unwrap();
        assert_eq!(music_cmd[0], "uv");
        assert!(music_cmd.contains(&"audiocraft-musicgen-stereo-large".to_string()));
    }
}
