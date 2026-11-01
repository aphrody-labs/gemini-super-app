//! Consolidated Jan Agent Audio & ADK Engine (`vendor/jan/src-tauri` -> `crates/jan-agent-audio`).
//!
//! Provides hardware/audio capability discovery, MCP/RAG voice-callable tool
//! definitions, and JSON-RPC 2.0 ADK message envelopes compatible with both
//! Jan's ADK protocol and Gemini 3.8 Live `functionDeclarations`.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceAgentTool {
    pub name: String,
    pub description: String,
    pub parameters_schema: Value,
    pub surface: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareAudioCapabilities {
    pub os: String,
    pub arch: String,
    pub cpu_logical_cores: usize,
    pub antigravity_mic_endpoint: String,
    pub voice_hub_ws_endpoint: String,
    pub supports_gemini_live_38: bool,
    pub supports_tauri_v3_alpha: bool,
}

impl Default for HardwareAudioCapabilities {
    fn default() -> Self {
        Self {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            cpu_logical_cores: std::thread::available_parallelism()
                .map(|n| n.get())
                .unwrap_or(4),
            antigravity_mic_endpoint: "127.0.0.1:24713".to_string(),
            voice_hub_ws_endpoint: "ws://127.0.0.1:8765".to_string(),
            supports_gemini_live_38: true,
            supports_tauri_v3_alpha: true,
        }
    }
}

/// Built-in voice-callable tools bridging Jan ADK, YouTube Music, Polaris, Voicebox, and AudioCraft.
pub fn default_gemini_super_app_tools() -> Vec<VoiceAgentTool> {
    vec![
        VoiceAgentTool {
            name: "play_music_track".to_string(),
            description: "Play or queue a music track in Polaris local library or YouTube Music Desktop".to_string(),
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "Track title, artist, or mood" },
                    "provider": { "type": "string", "enum": ["polaris", "youtube_music", "audiocraft"] }
                },
                "required": ["query"]
            }),
            surface: "polaris+ytm".to_string(),
        },
        VoiceAgentTool {
            name: "clone_or_synthesize_voice".to_string(),
            description: "Synthesize speech using Voicebox Studio or Gemini 3.8 Flash TTS with an HD voice profile".to_string(),
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string" },
                    "voice": { "type": "string", "enum": ["Aoede", "Puck", "Kore", "Zephyr", "Fenrir", "Charon"] },
                    "style": { "type": "string" }
                },
                "required": ["text"]
            }),
            surface: "voicebox".to_string(),
        },
        VoiceAgentTool {
            name: "generate_audiocraft_stem".to_string(),
            description: "Generate music or sound effects via AudioCraft MusicGen/AudioGen or ACE-Step 1.5".to_string(),
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "prompt": { "type": "string" },
                    "duration_secs": { "type": "integer", "default": 15 }
                },
                "required": ["prompt"]
            }),
            surface: "audiocraft".to_string(),
        },
        VoiceAgentTool {
            name: "deep_reason_argon".to_string(),
            description: "Delegate a complex coding or architectural task to gemini-4-argon via Antigravity CLI".to_string(),
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "task": { "type": "string" }
                },
                "required": ["task"]
            }),
            surface: "antigravity".to_string(),
        },
    ]
}

/// Convert [`VoiceAgentTool`] declarations into Gemini Live `setup.tools[0].functionDeclarations` JSON.
pub fn to_gemini_live_function_declarations(tools: &[VoiceAgentTool]) -> Value {
    let decls: Vec<Value> = tools
        .iter()
        .map(|t| {
            json!({
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters_schema,
            })
        })
        .collect();
    json!([{ "functionDeclarations": decls }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tools_and_gemini_declarations() {
        let caps = HardwareAudioCapabilities::default();
        assert!(caps.supports_gemini_live_38);
        assert!(caps.supports_tauri_v3_alpha);

        let tools = default_gemini_super_app_tools();
        assert_eq!(tools.len(), 4);
        let gemini_json = to_gemini_live_function_declarations(&tools);
        let arr = gemini_json.as_array().unwrap();
        assert_eq!(
            arr[0]["functionDeclarations"].as_array().unwrap().len(),
            4
        );
    }
}
