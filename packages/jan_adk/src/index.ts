/**
 * Consolidated Jan Agent Development Kit (`vendor/jan/packages/adk` & `vendor/jan/core` -> `packages/jan_adk`).
 *
 * Migrates Jan's Node `child_process`/`readline` JSON-RPC 2.0 agent transport to
 * Upstream Bun v1.4.5 `Bun.spawn()` and `Bun.JSONL.parse()`, with native support for
 * Gemini 3.8 Live voice tool calls and `gemini-4-argon` deep reasoning handoff.
 */

import {
  GEMINI_DEEP_REASONING_MODEL,
  GEMINI_LIVE_MODEL,
} from "@gemini-live/voice-core";

export interface JanAdkToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface JanAdkEvent {
  readonly jsonrpc: "2.0";
  readonly method:
    | "agent.status"
    | "agent.delta"
    | "agent.tool_call"
    | "agent.complete"
    | "agent.error";
  readonly params: {
    readonly agentId: string;
    readonly model: string;
    readonly text?: string;
    readonly toolCall?: JanAdkToolCall;
    readonly audioBase64?: string;
    readonly timestampMs: number;
  };
}

export interface JanVoiceAgentManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly liveModel: string;
  readonly reasoningModel: string;
  readonly tools: string[];
}

export const DEFAULT_GEMINI_JAN_AGENT: JanVoiceAgentManifest = {
  id: "jan-gemini-voice-orchestrator",
  name: "Jan x Gemini 3.8 Voice & Audio Orchestrator",
  description:
    "Full-duplex voice agent bridging Jan ADK tools, Flowcat WebRTC, Voicebox cloning, Polaris Music, and Antigravity gemini-4-argon",
  liveModel: GEMINI_LIVE_MODEL,
  reasoningModel: GEMINI_DEEP_REASONING_MODEL,
  tools: [
    "play_music_track",
    "clone_or_synthesize_voice",
    "generate_audiocraft_stem",
    "deep_reason_argon",
  ],
};

/**
 * Encode a Jan ADK JSON-RPC 2.0 event line for JSONL streaming.
 */
export /* @__PURE__ */ function formatJanAdkJsonl(event: JanAdkEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Parse one or more newline-delimited JSON-RPC 2.0 ADK events using native `Bun.JSONL.parse()`.
 */
export /* @__PURE__ */ function parseJanAdkJsonlStream(
  chunk: string | Uint8Array,
): JanAdkEvent[] {
  const parsed = Bun.JSONL.parse(chunk) as unknown[];
  return parsed.filter(
    (item): item is JanAdkEvent =>
      typeof item === "object" &&
      item !== null &&
      (item as Record<string, unknown>).jsonrpc === "2.0",
  );
}
