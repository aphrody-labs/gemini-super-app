import { describe, expect, test } from "bun:test";
import { createDefaultStudioProfiles, createStudioProject } from "./index";

describe("@gemini-live/voicebox-sdk", () => {
  test("creates Tauri v3 alpha Voicebox studio project with 6 Gemini 3.8 HD voices", () => {
    const profiles = createDefaultStudioProfiles();
    expect(profiles.length).toBe(6);
    expect(profiles[0]?.hdVoice).toBe("Aoede");

    const proj = createStudioProject("Podcast Antigravity");
    expect(proj.tauriVersion).toBe("3.0.0-alpha.5");
    expect(proj.clips.length).toBe(1);
  });
});
