import {
  GEMINI_LIVE_MODEL,
  type ConversationTurn,
  type VoiceSessionConfig,
} from "@gemini-live/voice-core";

export type ClientMessage =
  | {
      type: "realtime_input";
      surface?: string;
      text?: string;
      audio?: { data: string; mime_type?: string };
      audio_stream_end?: boolean;
    }
  | {
      type: "command";
      action:
        | "toggle_live"
        | "ptt_start"
        | "ptt_stop"
        | "interrupt"
        | "update_config";
      enabled?: boolean;
      config?: Partial<VoiceSessionConfig>;
      surface?: string;
    };

export type ServerMessage =
  | {
      type: "welcome";
      state: string;
      is_live_active: boolean;
      config: VoiceSessionConfig;
      history: ConversationTurn[];
    }
  | {
      type: "telemetry";
      state: string;
      is_live_active: boolean;
      is_recording_ptt: boolean;
      input_rms: number;
      output_rms: number;
      fft: number[];
      active_clients: number;
    }
  | {
      type: "transcript";
      turn: ConversationTurn;
      is_final: boolean;
    }
  | {
      type: "model_response";
      turn: ConversationTurn;
      state: string;
    }
  | {
      type: "audio_output";
      turn_id: string;
      audio_base64: string;
      mime_type: string;
      sample_rate: number;
      text?: string;
    };

export interface HubSpectrumFrame {
  readonly type: "spectrum";
  readonly bands: number[];
  readonly rms: number;
  readonly isSpeaking: boolean;
  readonly timestampMs: number;
}

export interface HubStartCommandFrame {
  readonly type: "cmd_start";
  readonly surface: string;
  readonly model: string;
  readonly timestampMs: number;
}

export type HubWireFrame =
  ClientMessage | ServerMessage | HubSpectrumFrame | HubStartCommandFrame;

export /* @__PURE__ */ function serializeClientCommand(
  action: "toggle_live" | "ptt_start" | "ptt_stop" | "interrupt",
  surface = "web",
): string {
  return JSON.stringify({
    type: "command",
    action,
    surface,
  });
}

export /* @__PURE__ */ function createSpectrumFrame(
  bands: number[],
  rms: number,
  isSpeaking: boolean,
): HubSpectrumFrame {
  return {
    type: "spectrum",
    bands,
    rms,
    isSpeaking,
    timestampMs: Date.now(),
  };
}

export /* @__PURE__ */ function createStartCommandFrame(
  surface: string,
  model: string = GEMINI_LIVE_MODEL,
): HubStartCommandFrame {
  return {
    type: "cmd_start",
    surface,
    model,
    timestampMs: Date.now(),
  };
}

export /* @__PURE__ */ function serializeHubMessage(
  frame: HubWireFrame,
): string {
  return JSON.stringify(frame);
}

export /* @__PURE__ */ function parseHubMessage(raw: string): HubWireFrame {
  return JSON.parse(raw) as HubWireFrame;
}
