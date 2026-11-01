import { describe, expect, test } from "bun:test";
import {
  buildBunFfmpegArgs,
  createWavPcm16Buffer,
  parseWavHeader,
} from "./index";

describe("@gemini-live/mediabunny", () => {
  test("creates and parses 16 kHz mono WAV buffer using pure typed arrays", () => {
    const samples = new Int16Array(1600);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.round(Math.sin(i * 0.1) * 10000);
    }
    const wav = createWavPcm16Buffer(samples, 16000, 1);
    const header = parseWavHeader(wav);
    expect(header.format).toBe("WAV");
    expect(header.sampleRateHz).toBe(16000);
    expect(header.channels).toBe(1);
    expect(header.bitsPerSample).toBe(16);
    expect(header.durationMs).toBe(100);
  });

  test("builds Bun.spawn ffmpeg arguments for Gemini Live 16kHz conversion", () => {
    const args = buildBunFfmpegArgs({
      inputPath: "input.mp4",
      outputPath: "output.wav",
      targetFormat: "wav",
      sampleRateHz: 16000,
      channels: 1,
      normalizeLoudness: true,
    });
    expect(args[0]).toBe("ffmpeg");
    expect(args).toContain("pcm_s16le");
    expect(args).toContain("16000");
  });
});
