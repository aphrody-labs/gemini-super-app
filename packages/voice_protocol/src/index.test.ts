import { describe, expect, test } from "bun:test";
import { serializeClientCommand } from "./index";

describe("voice-protocol serialization", () => {
  test("serializeClientCommand formats correct JSON", () => {
    const raw = serializeClientCommand("toggle_live", "flutter_app");
    const parsed = JSON.parse(raw);
    expect(parsed.type).toBe("command");
    expect(parsed.action).toBe("toggle_live");
    expect(parsed.surface).toBe("flutter_app");
  });
});
