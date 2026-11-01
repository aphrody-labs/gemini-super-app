import { describe, expect, test } from "bun:test";
import { buildAudioCraftUvCommand, generatePreviewStemWav } from "./index";

describe("@gemini-live/audiocraft-bridge", () => {
  test("builds uv run command and synthesizes harmonic WAV preview stem", () => {
    const req = {
      model: "facebook/musicgen-stereo-large" as const,
      prompt: "Cinematic ambient pads with warm analog synth",
      durationSec: 1,
      sampleRateHz: 16000,
    };
    const cmd = buildAudioCraftUvCommand(req);
    expect(cmd[0]).toBe("uv");
    expect(cmd[1]).toBe("run");

    const stem = generatePreviewStemWav(req);
    expect(stem.previewWavBytes.byteLength).toBe(44 + 16000 * 2);
    expect(String.fromCharCode(...stem.previewWavBytes.slice(0, 4))).toBe(
      "RIFF",
    );
  });
});
