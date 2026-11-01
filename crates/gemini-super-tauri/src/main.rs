//! Native Rust Tauri v3 Alpha (`3.0.0-alpha.5`) Binary for Migrated Google Gemini Windows App (`gemini-windows-tauri-v3.exe`).
//!
//! Replaces the 246 MB Electron binary (`%LOCALAPPDATA%\Google\Gemini\app-1.17.0\Gemini.exe`)
//! with a lightweight native Rust Edition 2024 + Tauri v3 Alpha host exposing:
//! - `GET /api/tauri/snapshot` — Full Tauri v3 + localized Gemini Windows App installation report
//! - `POST /api/tauri/voice-to-voice` — Native Rust `flowcat_core::GeminiLive` (`BidiGenerateContent`)
//!   Full-Duplex Voice-to-Voice turn (16 kHz PCM16 mic in -> 24 kHz WAV out + 32-band FFT Orb spectrum)
//! - `POST /api/tauri/spectrum` — Native Rust `voice_dsp::compute_spectrum_32` IPC command
//! - `--snapshot` CLI flag for instant JSON inspection
//! - `--voice-turn "<prompt>"` CLI flag for direct terminal Voice-to-Voice execution

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use base64::Engine as _;
use gemini_super_tauri::{
    ipc_compute_orb_spectrum, ipc_execute_immersive_voice_to_voice, resolve_gemini_api_key,
    GeminiSuperAppSnapshot, ImmersiveVoiceTurnResult,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone)]
struct TauriHostState {
    repo_root: PathBuf,
    api_key: String,
}

#[derive(Debug, Deserialize)]
struct VoiceToVoiceRequest {
    voice: Option<String>,
    prompt: Option<String>,
    pcm16_base64: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SpectrumRequest {
    samples: Vec<i16>,
    sample_rate_hz: Option<u32>,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

async fn handle_snapshot(State(state): State<Arc<TauriHostState>>) -> Json<GeminiSuperAppSnapshot> {
    Json(GeminiSuperAppSnapshot::build(&state.repo_root))
}

async fn handle_voice_to_voice(
    State(state): State<Arc<TauriHostState>>,
    Json(req): Json<VoiceToVoiceRequest>,
) -> Result<Json<ImmersiveVoiceTurnResult>, (axum::http::StatusCode, Json<ErrorResponse>)> {
    let voice = req.voice.as_deref().unwrap_or("Aoede");
    let decoded_pcm = match req.pcm16_base64.as_deref() {
        Some(b64) if !b64.is_empty() => base64::engine::general_purpose::STANDARD
            .decode(b64)
            .ok(),
        _ => None,
    };

    match ipc_execute_immersive_voice_to_voice(
        &state.api_key,
        voice,
        decoded_pcm.as_deref(),
        req.prompt.as_deref(),
    )
    .await
    {
        Ok(res) => Ok(Json(res)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )),
    }
}

async fn handle_spectrum(
    Json(req): Json<SpectrumRequest>,
) -> Json<voice_dsp::SpectrumFrame> {
    let sr = req.sample_rate_hz.unwrap_or(16_000);
    Json(ipc_compute_orb_spectrum(&req.samples, sr))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    let args: Vec<String> = std::env::args().collect();
    let repo_root = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let api_key = resolve_gemini_api_key(&repo_root).unwrap_or_default();

    if args.iter().any(|a| a == "--snapshot") {
        let snap = GeminiSuperAppSnapshot::build(&repo_root);
        println!("{}", serde_json::to_string_pretty(&snap)?);
        return Ok(());
    }

    if let Some(pos) = args.iter().position(|a| a == "--voice-turn") {
        let prompt = args
            .get(pos + 1)
            .map(|s| s.as_str())
            .unwrap_or("Dis Bonjour depuis Gemini Windows Tauri v3 en une phrase courte.");
        let voice = args
            .iter()
            .position(|a| a == "--voice")
            .and_then(|i| args.get(i + 1))
            .map(|s| s.as_str())
            .unwrap_or("Aoede");
        let turn =
            ipc_execute_immersive_voice_to_voice(&api_key, voice, None, Some(prompt)).await?;
        println!("{}", serde_json::to_string_pretty(&turn)?);
        return Ok(());
    }

    let port: u16 = std::env::var("TAURI_V3_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8788);

    let state = Arc::new(TauriHostState { repo_root, api_key });
    let app = Router::new()
        .route("/api/tauri/snapshot", get(handle_snapshot))
        .route("/api/tauri/voice-to-voice", post(handle_voice_to_voice))
        .route("/api/tauri/spectrum", post(handle_spectrum))
        .with_state(state);

    let addr = format!("127.0.0.1:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("Gemini Windows Native Tauri v3.0.0-alpha.5 IPC Host listening on http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
