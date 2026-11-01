/**
 * Consolidated Bun-Video & Audio Pipeline (`vendor/bun-video/src` -> `packages/bun_media`).
 *
 * Migrates `vendor/bun-video/src/native-video.ts` from `node:fs`/`node:os` to pure
 * Upstream Bun v1.4.5 APIs (`Bun.spawn`, `Bun.file`, `Bun.write`) and links to
 * `crates/bun-video-native` (`bun-video-native` CLI binary).
 */

import {
  FFT_BAND_COUNT,
  GEMINI_INPUT_SAMPLE_RATE,
} from "@gemini-live/voice-core";

export interface BunMediaProbeResult {
  readonly formatName: string;
  readonly durationSec: number;
  readonly sizeBytes: number;
  readonly bitRate: number;
  readonly hasAudio: boolean;
  readonly hasVideo: boolean;
  readonly audioCodec?: string;
  readonly sampleRateHz?: number;
  readonly channels?: number;
}

export interface AudioBeatTimeline {
  readonly bpmEstimate: number;
  readonly rmsEnvelope: number[];
  readonly spectrumBands32: number[];
}

/**
 * Compute a 32-band energy spectrum and RMS envelope from 16-bit PCM audio samples
 * in pure TypeScript/Bun for instant waveform & Gemini SVG Orb synchronization.
 */
export /* @__PURE__ */ function analyzePcm16AudioTimeline(
  samples: Int16Array,
  sampleRateHz: number = GEMINI_INPUT_SAMPLE_RATE,
): AudioBeatTimeline {
  if (samples.length === 0) {
    return {
      bpmEstimate: 0,
      rmsEnvelope: [],
      spectrumBands32: Array.from({ length: FFT_BAND_COUNT }, () => 0),
    };
  }

  const windowSize = Math.max(160, Math.floor(sampleRateHz * 0.02)); // 20 ms windows
  const rmsEnvelope: number[] = [];
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    const end = Math.min(samples.length, offset + windowSize);
    let sumSq = 0;
    for (let i = offset; i < end; i++) {
      const norm = (samples[i] ?? 0) / 32768;
      sumSq += norm * norm;
    }
    const rms = Math.min(1, Math.sqrt(sumSq / Math.max(1, end - offset)) * 2.4);
    rmsEnvelope.push(Number(rms.toFixed(4)));
  }

  const spectrumBands32: number[] = [];
  const bandChunk = Math.max(1, Math.floor(samples.length / FFT_BAND_COUNT));
  for (let b = 0; b < FFT_BAND_COUNT; b++) {
    const start = b * bandChunk;
    const end = Math.min(samples.length, start + bandChunk);
    let sumAbs = 0;
    for (let i = start; i < end; i++) {
      sumAbs += Math.abs(samples[i] ?? 0) / 32768;
    }
    const avg = end > start ? sumAbs / (end - start) : 0;
    spectrumBands32.push(Number(Math.min(1, avg * 2.8).toFixed(4)));
  }

  // Estimate BPM from RMS peak crossings
  let peaks = 0;
  for (let i = 1; i < rmsEnvelope.length - 1; i++) {
    const prev = rmsEnvelope[i - 1] ?? 0;
    const curr = rmsEnvelope[i] ?? 0;
    const next = rmsEnvelope[i + 1] ?? 0;
    if (curr > 0.25 && curr > prev && curr >= next) {
      peaks++;
    }
  }
  const durationMinutes = samples.length / Math.max(1, sampleRateHz) / 60;
  const rawBpm =
    durationMinutes > 0 ? Math.round(peaks / durationMinutes) : 120;
  const bpmEstimate = Math.max(60, Math.min(200, rawBpm || 120));

  return {
    bpmEstimate,
    rmsEnvelope,
    spectrumBands32,
  };
}

/**
 * Resolve the path to the consolidated Rust `bun-video-native` binary in `target/`.
 */
export async function resolveNativeVideoBinary(
  repoRoot: string,
): Promise<string> {
  const candidates = [
    `${repoRoot}/target/release/bun-video-native.exe`,
    `${repoRoot}/target/debug/bun-video-native.exe`,
    `${repoRoot}/target/release/bun-video-native`,
    `${repoRoot}/target/debug/bun-video-native`,
  ];
  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }
  return "bun-video-native";
}
