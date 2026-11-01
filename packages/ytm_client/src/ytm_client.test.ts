import { describe, expect, test } from "bun:test";
import { YtmCompanionClient } from "./index";

describe("@gemini-live/ytm-client", () => {
  test("manages playback state and generates Gemini 3.8 DJ prompt", () => {
    const client = new YtmCompanionClient();
    expect(client.getBaseUrl()).toBe("http://127.0.0.1:9863/api/v1");
    expect(client.getCurrentState().trackState).toBe("PAUSED");

    client.applyLocalCommand({ command: "play" });
    expect(client.getCurrentState().trackState).toBe("PLAYING");

    client.applyLocalCommand({ command: "setVolume", data: 72 });
    expect(client.getCurrentState().volume).toBe(72);

    const dj = client.buildGeminiDjIntroPrompt();
    expect(dj.model).toBe("gemini-3.8-live");
    expect(dj.ttsModel).toBe("gemini-3.8-flash-tts");
    expect(dj.prompt).toContain("Quantum Horizon");
  });
});
