/**
 * Consolidated Mediabunny Audio/Video Container & Transcode Pipeline
 * (`vendor/bun-video/mediabunny` -> `packages/mediabunny`).
 *
 * Replaces legacy `node-av` / `node:fs` bindings with pure Upstream Bun v1.4.5 APIs:
 * `Bun.file()`, `Bun.write()`, `Bun.spawn()`, and `Bun.CryptoHasher`.
 */

import {
  GEMINI_INPUT_SAMPLE_RATE,
  GEMINI_OUTPUT_SAMPLE_RATE,
} from "@gemini-live/voice-core";

export type MediaContainerFormat =
  "wav" | "flac" | "mp3" | "ogg" | "opus" | "mp4" | "webm";

export interface MediaTrackDescriptor {
  readonly index: number;
  readonly codecType: "audio" | "video" | "subtitle";
  readonly codecName: string;
  readonly sampleRateHz?: number;
  readonly channels?: number;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs: number;
}

export interface MediaConversionJob {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly targetFormat: MediaContainerFormat;
  readonly sampleRateHz: number;
  readonly channels: 1 | 2;
  readonly normalizeLoudness: boolean;
}

export interface WavHeaderInfo {
  readonly format: "WAV";
  readonly channels: number;
  readonly sampleRateHz: number;
  readonly bitsPerSample: number;
  readonly dataByteLength: number;
  readonly durationMs: number;
}

/**
 * Create a standard 44-byte RIFF/WAVE header + 16-bit PCM mono/stereo payload in memory.
 */
export /* @__PURE__ */ function createWavPcm16Buffer(
  samples: Int16Array,
  sampleRateHz: number = GEMINI_INPUT_SAMPLE_RATE,
  channels: number = 1,
): Uint8Array {
  const bytesPerSample = 2;
  const dataByteLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, sampleRateHz * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataByteLength, true);

  const outInt16 = new Int16Array(buffer, 44, samples.length);
  outInt16.set(samples);
  return new Uint8Array(buffer);
}

/**
 * Parse a 44-byte RIFF/WAVE header directly from a `Uint8Array` or `Bun.file().bytes()`.
 */
export /* @__PURE__ */ function parseWavHeader(
  bytes: Uint8Array,
): WavHeaderInfo {
  if (bytes.byteLength < 44) {
    throw new Error(`Invalid WAV buffer: length ${bytes.byteLength} < 44`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  const wave = String.fromCharCode(
    bytes[8]!,
    bytes[9]!,
    bytes[10]!,
    bytes[11]!,
  );
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error("Invalid RIFF/WAVE signature");
  }
  const channels = view.getUint16(22, true);
  const sampleRateHz = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataByteLength = view.getUint32(40, true);
  const bytesPerFrame = Math.max(1, channels * (bitsPerSample / 8));
  const totalFrames = dataByteLength / bytesPerFrame;
  const durationMs =
    sampleRateHz > 0 ? Math.round((totalFrames * 1000) / sampleRateHz) : 0;

  return {
    format: "WAV",
    channels,
    sampleRateHz,
    bitsPerSample,
    dataByteLength,
    durationMs,
  };
}

/**
 * Build deterministic FFmpeg CLI arguments for `Bun.spawn()` to convert any media
 * file into Gemini Live 16 kHz / 24 kHz PCM or lossless FLAC/Opus.
 */
export /* @__PURE__ */ function buildBunFfmpegArgs(
  job: MediaConversionJob,
): string[] {
  const args = [
    "ffmpeg",
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    job.inputPath,
  ];
  if (job.normalizeLoudness) {
    args.push("-af", "loudnorm=I=-16:TP=-1.5:LRA=11");
  }
  args.push("-ar", String(job.sampleRateHz), "-ac", String(job.channels));
  if (job.targetFormat === "wav") {
    args.push("-c:a", "pcm_s16le");
  } else if (job.targetFormat === "flac") {
    args.push("-c:a", "flac");
  } else if (job.targetFormat === "opus") {
    args.push("-c:a", "libopus", "-b:a", "96k");
  }
  args.push(job.outputPath);
  return args;
}

/**
 * Save a PCM16 audio buffer to disk using native `Bun.write()`.
 */
export async function writeWavFileWithBun(
  destPath: string,
  samples: Int16Array,
  sampleRateHz: number = GEMINI_OUTPUT_SAMPLE_RATE,
): Promise<WavHeaderInfo> {
  const wavBytes = createWavPcm16Buffer(samples, sampleRateHz, 1);
  await Bun.write(destPath, wavBytes);
  const verifyBytes = await Bun.file(destPath).bytes();
  return parseWavHeader(verifyBytes);
}
