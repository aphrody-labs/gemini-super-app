//! Unified Tauri v3 Alpha (`3.0.0-alpha.5`) Host Crate for the **One Big Gemini Super App**.
//!
//! Bridges all consolidated Rust crates in `crates/`:
//! - [`voice_dsp`] (32-band FFT spectrum & RMS for the animated Gemini SVG Orb)
//! - [`mic_bridge`] (`127.0.0.1:24713` 16 kHz PCM16 TCP stream)
//! - [`flowcat_core`] (Native Rust `GeminiLive` S2S WebSocket client, SIP UA, RTP/SDP, VAD)
//! - [`polaris_audio`] (Lossless FLAC/Opus/MP3/WAV music indexer & waveform analyzer)
//! - [`voicebox_audio`] (Multi-speaker voice cloning, resampling, WAV encoding, speak monitor)
//! - [`lu_voice_engine`] (`uv`-managed local Whisper STT, Piper TTS, ACE-Step 1.5 & AudioCraft runner)
//! - [`jan_agent_audio`] (ADK hardware capabilities & Gemini Live function-calling tools)
//! - [`awesome_rust_audio`] (Curated `#audio-and-music` & `#google-gemini` crate registry)

use awesome_rust_audio::{load_awesome_rust_audio_catalog, RustAudioCrateEntry};
use jan_agent_audio::{
    default_gemini_super_app_tools, to_gemini_live_function_declarations,
    HardwareAudioCapabilities, VoiceAgentTool,
};
use lu_voice_engine::{LuVoiceLoopConfig, MusicGenerationSpec};
use mic_bridge::MicStreamConfig;
use polaris_audio::{AudioCodecFormat, IndexedTrack, PolarisLibraryIndex};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use voice_dsp::{compute_spectrum_32, SpectrumFrame};
use voicebox_audio::{default_gemini_voice_profiles, VoiceProfile};

pub const TAURI_V3_ALPHA_VERSION: &str = "3.0.0-alpha.5";
pub const SUPER_APP_ID: &str = "com.google.antigravity.gemini-super-app";

/// Complete runtime snapshot exposed via Tauri v3 IPC & Bun fullstack server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiSuperAppSnapshot {
    pub app_id: String,
    pub tauri_version: String,
    pub gemini_live_wss_endpoint: String,
    pub mic_bridge_config: MicStreamConfig,
    pub voice_loop_config: LuVoiceLoopConfig,
    pub hardware: HardwareAudioCapabilities,
    pub voice_profiles: Vec<VoiceProfile>,
    pub agent_tools: Vec<VoiceAgentTool>,
    pub gemini_function_declarations: Value,
    pub rust_audio_catalog_count: usize,
}

impl GeminiSuperAppSnapshot {
    pub fn build(repo_root: &Path) -> Self {
        let tools = default_gemini_super_app_tools();
        let gemini_function_declarations = to_gemini_live_function_declarations(&tools);
        let catalog = load_awesome_rust_audio_catalog(repo_root);
        Self {
            app_id: SUPER_APP_ID.to_string(),
            tauri_version: TAURI_V3_ALPHA_VERSION.to_string(),
            gemini_live_wss_endpoint: flowcat_core::realtime::gemini_live::GEMINI_LIVE_WSS_BASE
                .to_string(),
            mic_bridge_config: MicStreamConfig::default(),
            voice_loop_config: LuVoiceLoopConfig::default(),
            hardware: HardwareAudioCapabilities::default(),
            voice_profiles: default_gemini_voice_profiles(),
            agent_tools: tools,
            gemini_function_declarations,
            rust_audio_catalog_count: catalog.len(),
        }
    }
}

/// Compute a 32-band radial FFT spectrum frame for the Gemini SVG Orb via Tauri IPC.
pub fn ipc_compute_orb_spectrum(samples: &[i16], sample_rate_hz: u32) -> SpectrumFrame {
    compute_spectrum_32(samples, sample_rate_hz)
}

/// Index a PCM16 audio buffer into Polaris format for the Super App Music Hub.
pub fn ipc_index_pcm16_track(
    id: &str,
    title: &str,
    artist: &str,
    samples: &[i16],
    sample_rate_hz: u32,
) -> IndexedTrack {
    PolarisLibraryIndex::analyze_pcm16_track(
        id,
        title,
        artist,
        "Gemini Super App Studio",
        format!("/studio/{id}.wav"),
        AudioCodecFormat::Wav,
        samples,
        sample_rate_hz,
        1,
    )
}

/// Build the `uv run` command for AudioCraft / ACE-Step music synthesis.
pub fn ipc_build_music_uv_command(
    prompt: &str,
    duration_secs: u32,
) -> Result<Vec<String>, lu_voice_engine::LuVoiceError> {
    let spec = MusicGenerationSpec {
        engine: "audiocraft-musicgen-stereo-large".to_string(),
        prompt: prompt.to_string(),
        lyrics: None,
        duration_secs,
        bpm: Some(120),
        sample_rate_hz: 32_000,
    };
    spec.build_uv_music_args("backend/super_app_hub.py")
}

/// Load the curated Rust audio & Gemini crate catalog.
pub fn ipc_load_rust_audio_catalog(repo_root: &Path) -> Vec<RustAudioCrateEntry> {
    load_awesome_rust_audio_catalog(repo_root)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_super_app_snapshot_unifies_all_crates() {
        let root = Path::new("../..");
        let snapshot = GeminiSuperAppSnapshot::build(root);
        assert_eq!(snapshot.tauri_version, "3.0.0-alpha.5");
        assert!(snapshot
            .gemini_live_wss_endpoint
            .contains("BidiGenerateContent"));
        assert_eq!(snapshot.voice_profiles.len(), 3);
        assert_eq!(snapshot.agent_tools.len(), 4);
        assert!(snapshot.rust_audio_catalog_count >= 3);

        let samples: Vec<i16> = (0..512)
            .map(|i| ((i as f32 * 0.2).sin() * 14000.0) as i16)
            .collect();
        let frame = ipc_compute_orb_spectrum(&samples, 16_000);
        assert_eq!(frame.bands.len(), 32);

        let track = ipc_index_pcm16_track("t1", "Live Jam", "Gemini 3.8", &samples, 16_000);
        assert_eq!(track.title, "Live Jam");

        let uv_cmd = ipc_build_music_uv_command("Cyberpunk orchestral strings", 10).unwrap();
        assert_eq!(uv_cmd[0], "uv");
    }

    #[tokio::test]
    async fn test_real_rust_flowcat_gemini_live_connect() {
        let _ = rustls::crypto::ring::default_provider().install_default();
        let mut api_key = std::env::var("GEMINI_API_KEY")
            .or_else(|_| std::env::var("GOOGLE_API_KEY"))
            .ok();
        if api_key.is_none() {
            let env_path = Path::new("../../.env");
            if let Ok(content) = std::fs::read_to_string(env_path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if let Some(val) = trimmed
                        .strip_prefix("GEMINI_API_KEY=")
                        .or_else(|| trimmed.strip_prefix("GOOGLE_API_KEY="))
                    {
                        let cleaned = val.trim().trim_matches('"').trim_matches('\'');
                        if !cleaned.is_empty() {
                            api_key = Some(cleaned.to_string());
                            break;
                        }
                    }
                }
            }
        }
        let Some(key) = api_key else {
            return;
        };

        use flowcat_core::realtime::gemini_live::GeminiLive;
        use flowcat_core::realtime::RealtimeLlm;
        use flowcat_core::types::RealtimeSetup;

        let mut client = GeminiLive::new(key);
        let setup = RealtimeSetup {
            model: "models/gemini-3.8-live".to_string(),
            system_prompt: "You are Gemini 3.8 Live inside the Rust Tauri v3 Super App.".to_string(),
            tools: Vec::new(),
            input_sample_rate: 16_000,
            output_sample_rate: 24_000,
        };
        client
            .connect(setup)
            .await
            .expect("Real Rust GeminiLive BidiGenerateContent WSS handshake should succeed");
    }
}
