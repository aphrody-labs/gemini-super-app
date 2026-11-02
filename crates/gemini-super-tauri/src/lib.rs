//! Unified Tauri v3 Alpha (`3.0.0-alpha.5`) Host Crate & Migrated Gemini Windows Native Engine.
//!
//! Replaces the legacy 246 MB Electron binary (`%LOCALAPPDATA%\Google\Gemini\app-1.17.0\Gemini.exe`)
//! with a native Rust Edition 2024 + Tauri v3 Alpha (`3.0.0-alpha.5`) + WebView2 / `Bun.WebView`
//! architecture featuring immersive Full-Duplex Voice-to-Voice (`gemini-3.8-live`).
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
use base64::Engine as _;
use flowcat_core::realtime::gemini_live::GeminiLive;
use flowcat_core::realtime::RealtimeLlm;
use flowcat_core::types::{AudioChunk, RealtimeEvent, RealtimeSetup};
use jan_agent_audio::{
    default_gemini_super_app_tools, to_gemini_live_function_declarations,
    HardwareAudioCapabilities, VoiceAgentTool,
};
use lu_voice_engine::{LuVoiceLoopConfig, MusicGenerationSpec};
use mic_bridge::MicStreamConfig;
use openpets_core::{
    default_mochi_emote_catalogue, export_mesh_to_glb, extrude_rgba_to_3d_mesh,
    GeminiPetCareState, MochiBondState, MochiEmoteSpec, MochiFocusPlan, OpenPets3dExtrudeConfig,
    OPENPETS_3D_WGPU_SHADER_WGSL,
};
use polaris_audio::{AudioCodecFormat, IndexedTrack, PolarisLibraryIndex};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use voice_dsp::{compute_spectrum_32, SpectrumFrame};
use voicebox_audio::{default_gemini_voice_profiles, encode_wav_pcm16_mono, VoiceProfile};

pub const TAURI_V3_ALPHA_VERSION: &str = "3.0.0-alpha.5";
pub const SUPER_APP_ID: &str = "com.google.antigravity.gemini-super-app";
pub const GEMINI_WINDOWS_LEGACY_APP_ID: &str = "com.google.gemini.windows";

/// Localized & discovered metadata for the installed Google Gemini Windows App (`app-1.17.0`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiWindowsInstallationReport {
    pub found: bool,
    pub install_root: String,
    pub active_app_dir: String,
    pub legacy_electron_exe: String,
    pub legacy_electron_size_bytes: u64,
    pub asar_path: String,
    pub asar_size_bytes: u64,
    pub user_data_dir: String,
    pub cookie_db_path: String,
    pub cookie_db_exists: bool,
    pub extracted_asar_dir: String,
    pub migrated_tauri_version: String,
    pub migrated_binary_name: String,
}

/// Automatically locate the installed Google Gemini Windows App (`%LOCALAPPDATA%\Google\Gemini`)
/// and its Chromium profile (`%APPDATA%\gemini`).
pub fn locate_gemini_windows_app(repo_root: &Path) -> GeminiWindowsInstallationReport {
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| {
        let user = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\aphro".to_string());
        format!("{user}\\AppData\\Local")
    });
    let roaming_app_data = std::env::var("APPDATA").unwrap_or_else(|_| {
        let user = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\aphro".to_string());
        format!("{user}\\AppData\\Roaming")
    });

    let install_root = PathBuf::from(&local_app_data).join("Google").join("Gemini");
    let active_app_dir = install_root.join("app-1.17.0");
    let legacy_exe = active_app_dir.join("Gemini.exe");
    let asar_path = active_app_dir.join("resources").join("app.asar");
    let user_data_dir = PathBuf::from(&roaming_app_data).join("gemini");
    let cookie_db_path = user_data_dir.join("Network").join("Cookies");
    let extracted_asar_dir = repo_root
        .join("apps")
        .join("gemini_windows_patcher")
        .join("asar_extracted");

    let legacy_electron_size_bytes = std::fs::metadata(&legacy_exe).map(|m| m.len()).unwrap_or(0);
    let asar_size_bytes = std::fs::metadata(&asar_path).map(|m| m.len()).unwrap_or(0);
    let found = legacy_exe.exists() || asar_path.exists();

    GeminiWindowsInstallationReport {
        found,
        install_root: install_root.to_string_lossy().into_owned(),
        active_app_dir: active_app_dir.to_string_lossy().into_owned(),
        legacy_electron_exe: legacy_exe.to_string_lossy().into_owned(),
        legacy_electron_size_bytes,
        asar_path: asar_path.to_string_lossy().into_owned(),
        asar_size_bytes,
        user_data_dir: user_data_dir.to_string_lossy().into_owned(),
        cookie_db_path: cookie_db_path.to_string_lossy().into_owned(),
        cookie_db_exists: cookie_db_path.exists(),
        extracted_asar_dir: extracted_asar_dir.to_string_lossy().into_owned(),
        migrated_tauri_version: TAURI_V3_ALPHA_VERSION.to_string(),
        migrated_binary_name: "gemini-windows-tauri-v3.exe".to_string(),
    }
}

/// Complete runtime snapshot exposed via Tauri v3 IPC & Bun fullstack server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiSuperAppSnapshot {
    pub app_id: String,
    pub tauri_version: String,
    pub gemini_live_wss_endpoint: String,
    pub windows_installation: GeminiWindowsInstallationReport,
    pub mic_bridge_config: MicStreamConfig,
    pub voice_loop_config: LuVoiceLoopConfig,
    pub hardware: HardwareAudioCapabilities,
    pub voice_profiles: Vec<VoiceProfile>,
    pub agent_tools: Vec<VoiceAgentTool>,
    pub gemini_function_declarations: Value,
    pub rust_audio_catalog_count: usize,
    pub gemini_pet: GeminiPetCareState,
    pub mochi_bond: MochiBondState,
    pub mochi_emotes: Vec<MochiEmoteSpec>,
    pub mochi_focus_plan: MochiFocusPlan,
    pub wgpu_3d_shader_len: usize,
}

impl GeminiSuperAppSnapshot {
    pub fn build(repo_root: &Path) -> Self {
        let tools = default_gemini_super_app_tools();
        let gemini_function_declarations = to_gemini_live_function_declarations(&tools);
        let catalog = load_awesome_rust_audio_catalog(repo_root);
        let windows_installation = locate_gemini_windows_app(repo_root);
        Self {
            app_id: SUPER_APP_ID.to_string(),
            tauri_version: TAURI_V3_ALPHA_VERSION.to_string(),
            gemini_live_wss_endpoint: flowcat_core::realtime::gemini_live::GEMINI_LIVE_WSS_BASE
                .to_string(),
            windows_installation,
            mic_bridge_config: MicStreamConfig::default(),
            voice_loop_config: LuVoiceLoopConfig::default(),
            hardware: HardwareAudioCapabilities::default(),
            voice_profiles: default_gemini_voice_profiles(),
            agent_tools: tools,
            gemini_function_declarations,
            rust_audio_catalog_count: catalog.len(),
            gemini_pet: GeminiPetCareState::default(),
            mochi_bond: MochiBondState::default(),
            mochi_emotes: default_mochi_emote_catalogue(),
            mochi_focus_plan: MochiFocusPlan::default(),
            wgpu_3d_shader_len: OPENPETS_3D_WGPU_SHADER_WGSL.len(),
        }
    }
}

/// Generate a binary glTF 2.0 `.glb` 3D voxel/relief mesh for the Gemini Pet / Mochi sprite.
pub fn ipc_generate_pet_3d_glb() -> Vec<u8> {
    let width = 8u32;
    let height = 8u32;
    let mut rgba = vec![0u8; (width * height * 4) as usize];
    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let dist = ((x as f32 - 3.5).abs() + (y as f32 - 3.5).abs()) as u32;
            if dist <= 4 {
                rgba[idx] = 110;
                rgba[idx + 1] = 231;
                rgba[idx + 2] = 183;
                rgba[idx + 3] = 255;
            }
        }
    }
    let cfg = OpenPets3dExtrudeConfig::default();
    let mesh = extrude_rgba_to_3d_mesh(&rgba, width, height, &cfg);
    export_mesh_to_glb(&mesh, None)
}

/// Result of a native Rust Tauri v3 Voice-to-Voice (`gemini-3.8-live`) immersive turn.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImmersiveVoiceTurnResult {
    pub model: String,
    pub voice: String,
    pub input_transcript: String,
    pub output_transcript: String,
    pub audio_chunks_count: usize,
    pub pcm24k_bytes_len: usize,
    pub wav_base64: String,
    pub orb_spectrum: SpectrumFrame,
}

/// Resolve `GEMINI_API_KEY` or `GOOGLE_API_KEY` from process environment or `.env` in `repo_root`.
pub fn resolve_gemini_api_key(repo_root: &Path) -> Option<String> {
    if let Ok(k) = std::env::var("GEMINI_API_KEY").or_else(|_| std::env::var("GOOGLE_API_KEY")) {
        let trimmed = k.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    let env_path = repo_root.join(".env");
    if let Ok(content) = std::fs::read_to_string(env_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if let Some(val) = trimmed
                .strip_prefix("GEMINI_API_KEY=")
                .or_else(|| trimmed.strip_prefix("GOOGLE_API_KEY="))
            {
                let cleaned = val.trim().trim_matches('"').trim_matches('\'');
                if !cleaned.is_empty() {
                    return Some(cleaned.to_string());
                }
            }
        }
    }
    None
}

/// Execute a real Full-Duplex Voice-to-Voice turn over `flowcat_core::GeminiLive` (`BidiGenerateContent` WSS).
/// Supports either 16 kHz PCM16 microphone input bytes or a direct voice kickstart prompt,
/// and returns 24 kHz WAV audio + 32-band FFT spectrum for the immersive Gemini SVG Orb.
pub async fn ipc_execute_immersive_voice_to_voice(
    api_key: &str,
    voice_name: &str,
    pcm16_16khz_input: Option<&[u8]>,
    text_prompt_fallback: Option<&str>,
) -> anyhow::Result<ImmersiveVoiceTurnResult> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    if !voice_name.is_empty() {
        unsafe {
            std::env::set_var("FLOWCAT_VOICE", voice_name);
        }
    }

    let model = "models/gemini-3.8-live".to_string();
    let prompt_instruction = match text_prompt_fallback {
        Some(p) if !p.trim().is_empty() => format!(
            "Tu es Gemini 3.8 Live dans l'application native Windows Tauri v3. Réponds vocalement en français de manière concise à : {p}"
        ),
        _ => "Tu es Gemini 3.8 Live dans l'application native Windows Tauri v3. Réponds vocalement en français de manière naturelle, chaleureuse et concise.".to_string(),
    };

    let mut client = GeminiLive::new(api_key.to_string());
    let setup = RealtimeSetup {
        model: model.clone(),
        system_prompt: prompt_instruction,
        tools: Vec::new(),
        input_sample_rate: 16_000,
        output_sample_rate: 24_000,
    };

    client
        .connect(setup)
        .await
        .map_err(|e| anyhow::anyhow!("GeminiLive connect error: {e}"))?;

    if let Some(pcm_bytes) = pcm16_16khz_input.filter(|b| b.len() >= 3200) {
        let samples_16k: Vec<i16> = pcm_bytes
            .chunks_exact(2)
            .map(|b| i16::from_le_bytes([b[0], b[1]]))
            .collect();
        for chunk in samples_16k.chunks(3200) {
            client
                .send_audio(AudioChunk {
                    pcm: chunk.to_vec(),
                    sample_rate: 16_000,
                })
                .await
                .map_err(|e| anyhow::anyhow!("send_audio error: {e}"))?;
        }
        client
            .send_user_text_turn(
                text_prompt_fallback.unwrap_or("Réponds vocalement en français."),
            )
            .await
            .map_err(|e| anyhow::anyhow!("send_user_text_turn after audio error: {e}"))?;
    } else {
        client
            .send_user_text_turn(
                text_prompt_fallback.unwrap_or("Dis Bonjour en un seul mot."),
            )
            .await
            .map_err(|e| anyhow::anyhow!("send_user_text_turn error: {e}"))?;
    }

    let mut all_pcm24k_samples: Vec<i16> = Vec::new();
    let mut audio_chunks_count = 0usize;
    let mut input_transcript = String::new();
    let mut output_transcript = String::new();

    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
    while tokio::time::Instant::now() < deadline {
        let ev = tokio::time::timeout(std::time::Duration::from_millis(1600), client.next_event())
            .await;
        match ev {
            Ok(Some(RealtimeEvent::AudioOut(chunk))) => {
                audio_chunks_count += 1;
                all_pcm24k_samples.extend_from_slice(&chunk.pcm);
            }
            Ok(Some(RealtimeEvent::UserText(t))) | Ok(Some(RealtimeEvent::UserInterimText(t))) => {
                if !t.is_empty() {
                    input_transcript.push_str(&t);
                }
            }
            Ok(Some(RealtimeEvent::BotText(t))) => {
                if !t.is_empty() {
                    output_transcript.push_str(&t);
                }
            }
            Ok(Some(RealtimeEvent::Usage(_))) => {
                if !all_pcm24k_samples.is_empty() {
                    break;
                }
            }
            Ok(Some(RealtimeEvent::Closed)) | Ok(None) => break,
            Ok(Some(_)) => {}
            Err(_) => {
                if !all_pcm24k_samples.is_empty() {
                    break;
                }
            }
        }
    }

    let orb_spectrum = if all_pcm24k_samples.is_empty() {
        compute_spectrum_32(&[0i16; 512], 24_000)
    } else {
        compute_spectrum_32(&all_pcm24k_samples, 24_000)
    };

    let f32_samples: Vec<f32> = all_pcm24k_samples
        .iter()
        .map(|&s| (s as f32) / 32768.0)
        .collect();
    let wav_bytes = encode_wav_pcm16_mono(&f32_samples, 24_000)
        .map_err(|e| anyhow::anyhow!("WAV encode error: {e}"))?;
    let wav_base64 = base64::engine::general_purpose::STANDARD.encode(&wav_bytes);

    Ok(ImmersiveVoiceTurnResult {
        model,
        voice: voice_name.to_string(),
        input_transcript: input_transcript.trim().to_string(),
        output_transcript: output_transcript.trim().to_string(),
        audio_chunks_count,
        pcm24k_bytes_len: all_pcm24k_samples.len() * 2,
        wav_base64,
        orb_spectrum,
    })
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
    fn test_super_app_snapshot_unifies_all_crates_and_locates_gemini_windows() {
        let root = Path::new("../..");
        let snapshot = GeminiSuperAppSnapshot::build(root);
        assert_eq!(snapshot.tauri_version, "3.0.0-alpha.5");
        assert!(snapshot
            .gemini_live_wss_endpoint
            .contains("BidiGenerateContent"));
        assert!(snapshot.windows_installation.found);
        assert!(snapshot
            .windows_installation
            .legacy_electron_exe
            .ends_with("Gemini.exe"));
        assert_eq!(snapshot.voice_profiles.len(), 3);
        assert_eq!(snapshot.agent_tools.len(), 4);
        assert!(snapshot.rust_audio_catalog_count >= 3);
        assert_eq!(snapshot.mochi_emotes.len(), 12);
        assert_eq!(snapshot.mochi_focus_plan.focus_minutes, 25);
        assert!(snapshot.wgpu_3d_shader_len > 100);

        let glb = ipc_generate_pet_3d_glb();
        assert!(glb.len() > 64);
        assert_eq!(&glb[0..4], b"glTF");

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
    async fn test_real_rust_flowcat_gemini_live_immersive_voice_turn() {
        let root = Path::new("../..");
        let Some(key) = resolve_gemini_api_key(root) else {
            return;
        };

        let turn = ipc_execute_immersive_voice_to_voice(
            &key,
            "Aoede",
            None,
            Some("Dis Bonjour depuis Tauri v3 en un seul mot."),
        )
        .await
        .expect("Real Rust Tauri v3 immersive voice-to-voice turn should succeed");

        assert!(turn.audio_chunks_count > 0);
        assert!(turn.pcm24k_bytes_len > 1000);
        assert!(!turn.wav_base64.is_empty());
        assert_eq!(turn.orb_spectrum.bands.len(), 32);
    }
}
