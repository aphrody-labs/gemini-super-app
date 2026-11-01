import type {
  ConversationTurn,
  VoiceHubTelemetry,
  VoiceSessionConfig,
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

export function serializeClientCommand(
  action: "toggle_live" | "ptt_start" | "ptt_stop" | "interrupt",
  surface = "web",
): string {
  return JSON.stringify({
    type: "command",
    action,
    surface,
  });
}
