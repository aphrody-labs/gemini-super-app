import { describe, expect, test } from "bun:test";
import { analyzePcm16AudioTimeline } from "./index";

describe("@gemini-live/bun-media", () => {
  test("computes 32-band spectrum and RMS envelope from PCM16 audio", () => {
    const samples = new Int16Array(3200);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.round(Math.sin(i * 0.25) * 16000);
    }
    const timeline = analyzePcm16AudioTimeline(samples, 16000);
    expect(timeline.spectrumBands32.length).toBe(32);
    expect(timeline.rmsEnvelope.length).toBe(10);
    expect(timeline.bpmEstimate).toBeGreaterThanOrEqual(60);
  });
});
