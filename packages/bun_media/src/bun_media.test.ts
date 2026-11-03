import { expect, test } from "bun:test";
import { analyzeNativeSpectrum, analyzeWavPcm16 } from "./index";
import { createWavPcm16Buffer } from "@gemini-live/mediabunny";
import { resolve } from "node:path";

test("analyzes stereo PCM and skips padded RIFF metadata chunks", () => {
  const original = createWavPcm16Buffer(new Int16Array([16384, -16384, 0, 0]), 16000, 2);
  const withChunk = new Uint8Array(original.length + 10);
  withChunk.set(original.subarray(0, 12));
  withChunk.set([74, 85, 78, 75, 1, 0, 0, 0, 7, 0], 12);
  withChunk.set(original.subarray(12), 22);
  new DataView(withChunk.buffer).setUint32(4, withChunk.length - 8, true);
  const analysis = analyzeWavPcm16(withChunk);
  expect(analysis.channels).toBe(2);
  expect(analysis.durationSec).toBe(2 / 16000);
  expect(analysis.peak).toBeCloseTo(0.5);
  expect(analysis.rms).toBeCloseTo(Math.sqrt(0.125));
  expect(analysis.waveform[0]).toEqual({ min: 0, max: 0 });
  expect(() => analyzeWavPcm16(withChunk.subarray(0, withChunk.length - 1))).toThrow();
  const nonPcm = original.slice();
  new DataView(nonPcm.buffer).setUint16(20, 3, true);
  expect(() => analyzeWavPcm16(nonPcm)).toThrow();
});

test("reports an unavailable native DSP rather than inventing a spectrum", async () => {
  const previous = Bun.env.VOICE_DSP_BIN;
  try {
    Bun.env.VOICE_DSP_BIN = "nonexistent-voice-dsp-test-executable";
    expect(await analyzeNativeSpectrum(new Int16Array(100), 16000)).toBeNull();
  } finally { Bun.env.VOICE_DSP_BIN = previous; }
});

test.skipIf(!Bun.env.VOICE_DSP_BIN)("sends PCM to the Rust DSP and receives its frequency bands", async () => {
  const samples = Int16Array.from({ length: 1024 }, (_, i) => Math.round(16000 * Math.sin(2 * Math.PI * 2000 * i / 16000)));
  const frame = await analyzeNativeSpectrum(samples, 16000);
  expect(frame).not.toBeNull();
  expect(frame?.bands.indexOf(Math.max(...frame.bands))).toBe(8);
  expect(frame?.rms).toBeCloseTo(16000 / 32768 / Math.sqrt(2), 3);
});

const productRoot = resolve(import.meta.dir, "../../..");
const packagedDsp = `${productRoot}/dist/bin/voice-dsp${process.platform === "win32" ? ".exe" : ""}`;
test.skipIf(!(await Bun.file(packagedDsp).exists()))("discovers the packaged DSP without an environment override", async () => {
  const previous = Bun.env.VOICE_DSP_BIN;
  try {
    Bun.env.VOICE_DSP_BIN = "";
    const frame = await analyzeNativeSpectrum(new Int16Array(1024), 16000, productRoot);
    expect(frame?.bands).toHaveLength(32);
    expect(frame?.rms).toBe(0);
  } finally { Bun.env.VOICE_DSP_BIN = previous; }
});
