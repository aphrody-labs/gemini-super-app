import { describe, expect, test } from "bun:test";
import {
  ANTIGRAVITY_MIC_PORT,
  DEFAULT_HUB_HTTP_URL,
  DEFAULT_HUB_WS_URL,
} from "./index";

describe("voice-core config", () => {
  test("constants are properly defined", () => {
    expect(ANTIGRAVITY_MIC_PORT).toBe(24713);
    expect(DEFAULT_HUB_HTTP_URL).toBe("http://127.0.0.1:8765");
    expect(DEFAULT_HUB_WS_URL).toBe("ws://127.0.0.1:8765/ws/voice");
  });
});
