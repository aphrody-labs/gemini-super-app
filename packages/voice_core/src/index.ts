/**
 * Core Types & Canonical Constants for Gemini Live Voice Mode & Antigravity Hub
 */

export type VoiceInteractionState =
  "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "INTERRUPTED";

export interface VoiceSessionConfig {
  live_model: string;
  reasoning_model: string;
  tts_model: string;
  voice_name: string;
  language_code: string;
  vad_mode: "hybrid" | "manual_ptt";
  speech_style: string;
  thinking_level: "low" | "medium" | "high";
  always_on_background: boolean;
  barge_in_enabled: boolean;
  custom_vocabulary: string[];
}

export interface ConversationTurn {
  id: string;
  role: "user" | "model" | "system";
  text: string;
  timestamp: number;
  surface: string;
  model_used?: string;
  latency_ms?: number;
}

export interface VoiceHubTelemetry {
  state: VoiceInteractionState;
  is_live_active: boolean;
  is_recording_ptt: boolean;
  input_rms: number;
  output_rms: number;
  fft: number[];
  active_clients: number;
}

export const DEFAULT_HUB_WS_URL = "ws://127.0.0.1:8765/ws/voice";
export const DEFAULT_HUB_HTTP_URL = "http://127.0.0.1:8765";
export const ANTIGRAVITY_MIC_PORT = 24713;

export const GEMINI_INPUT_SAMPLE_RATE = 16000;
export const GEMINI_OUTPUT_SAMPLE_RATE = 24000;
export const FFT_BAND_COUNT = 32;

export const GEMINI_LIVE_MODEL = "gemini-3.8-live" as const;
export const GEMINI_EXTENDED_THINKING_LIVE_MODEL =
  "gemini-3.8-live-extended-thinking" as const;
export const GEMINI_DEEP_REASONING_MODEL = "gemini-4-argon" as const;
export const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts" as const;
export const GEMINI_TTS_LITE_MODEL = "gemini-3.8-flash-lite-tts" as const;
export const GEMINI_STT_LIVE_MODEL = "gemini-3.5-transcribe-live" as const;

export const GEMINI_HD_VOICES = [
  "Aoede",
  "Puck",
  "Kore",
  "Zephyr",
  "Fenrir",
  "Charon",
] as const;

export type GeminiHdVoice = (typeof GEMINI_HD_VOICES)[number];

export const DEFAULT_SURFACE_ENDPOINTS = {
  hubWsUrl: DEFAULT_HUB_WS_URL,
  hubHttpUrl: DEFAULT_HUB_HTTP_URL,
  superAppHttpUrl: "http://127.0.0.1:8787",
  superAppWsUrl: "ws://127.0.0.1:8787/ws",
  antigravityMicTcp: `127.0.0.1:${ANTIGRAVITY_MIC_PORT}`,
  ytmCompanionHttpUrl: "http://127.0.0.1:9863/api/v1",
} as const;
