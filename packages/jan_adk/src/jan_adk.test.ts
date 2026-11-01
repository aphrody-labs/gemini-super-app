import { describe, expect, test } from "bun:test";
import {
  DEFAULT_GEMINI_JAN_AGENT,
  formatJanAdkJsonl,
  parseJanAdkJsonlStream,
} from "./index";

describe("@gemini-live/jan-adk", () => {
  test("serializes and parses JSONL agent events using Bun.JSONL.parse", () => {
    const line1 = formatJanAdkJsonl({
      jsonrpc: "2.0",
      method: "agent.status",
      params: {
        agentId: DEFAULT_GEMINI_JAN_AGENT.id,
        model: DEFAULT_GEMINI_JAN_AGENT.liveModel,
        text: "Listening on 16kHz PCM stream",
        timestampMs: 1730460000000,
      },
    });
    const line2 = formatJanAdkJsonl({
      jsonrpc: "2.0",
      method: "agent.complete",
      params: {
        agentId: DEFAULT_GEMINI_JAN_AGENT.id,
        model: DEFAULT_GEMINI_JAN_AGENT.reasoningModel,
        text: "Completed deep reasoning via gemini-4-argon",
        timestampMs: 1730460000500,
      },
    });
    const events = parseJanAdkJsonlStream(line1 + line2);
    expect(events.length).toBe(2);
    expect(events[0]?.params.model).toBe("gemini-3.8-live");
    expect(events[1]?.params.model).toBe("gemini-4-argon");
  });
});
