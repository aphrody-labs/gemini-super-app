/**
 * Core Types for Gemini Live Voice Mode & Antigravity Hub
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
