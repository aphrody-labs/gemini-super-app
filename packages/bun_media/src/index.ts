/**
 * Consolidated Bun-Video & Audio Pipeline (`vendor/bun-video/src` -> `packages/bun_media`).
 *
 * Migrates `vendor/bun-video/src/native-video.ts` from `node:fs`/`node:os` to pure
 * Upstream Bun v1.4.5 APIs (`Bun.spawn`, `Bun.file`, `Bun.write`) and links to
 * `crates/bun-video-native` (`bun-video-native` CLI binary).
 */


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

/** Use the canonical Rust DSP when its executable is installed; null means unavailable. */
export async function analyzeNativeSpectrum(samples: Int16Array, sampleRateHz: number, productRoot?: string): Promise<{ bands: number[]; rms: number; sample_rate_hz: number; is_speech: boolean } | null> {
  const packaged = productRoot ? `${productRoot}/dist/bin/voice-dsp${process.platform === "win32" ? ".exe" : ""}` : undefined;
  const executable = Bun.env.VOICE_DSP_BIN || (packaged && await Bun.file(packaged).exists() ? packaged : Bun.which("voice-dsp"));
  if (!executable || samples.byteLength > 8 * 1024 * 1024) return null;
  try {
    const proc = Bun.spawn([executable, String(sampleRateHz)], { stdin: "pipe", stdout: "pipe", stderr: "ignore" });
    const timer = setTimeout(() => proc.kill(), 5000);
    try {
      proc.stdin.write(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength));
      proc.stdin.end();
      const output = new Response(proc.stdout).text();
      if (await proc.exited !== 0) return null;
      const frame = JSON.parse(await output);
      if (!Array.isArray(frame.bands) || frame.bands.length !== 32 || !frame.bands.every((v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1) || typeof frame.rms !== "number" || !Number.isFinite(frame.rms) || frame.sample_rate_hz !== sampleRateHz || typeof frame.is_speech !== "boolean") return null;
      return frame;
    } finally { clearTimeout(timer); }
  } catch { return null; }
}

/** Analyze a RIFF/WAVE PCM16 file without interpreting temporal slices as frequencies. */
export function analyzeWavPcm16(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Fichier WAV RIFF invalide.");
  const end = view.getUint32(4, true) + 8;
  if (end > bytes.length || end < 12) throw new Error("Fichier WAV tronqué.");
  let format: { channels: number; rate: number; align: number; bits: number; codec: number } | null = null;
  let dataOffset = -1;
  let dataLength = 0;
  for (let offset = 12; offset + 8 <= end;) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > end) throw new Error("Bloc WAV tronqué.");
    if (tag(offset) === "fmt ") {
      if (size < 16) throw new Error("Format WAV incomplet.");
      format = { codec: view.getUint16(start, true), channels: view.getUint16(start + 2, true), rate: view.getUint32(start + 4, true), align: view.getUint16(start + 12, true), bits: view.getUint16(start + 14, true) };
    } else if (tag(offset) === "data" && dataOffset < 0) { dataOffset = start; dataLength = size; }
    offset = start + size + (size % 2);
  }
  if (!format || format.codec !== 1 || format.bits !== 16 || ![1, 2].includes(format.channels) || format.rate < 8000 || format.rate > 192000 || format.align !== format.channels * 2) throw new Error("Utilisez un WAV PCM 16 bits mono ou stéréo (8–192 kHz).");
  if (dataOffset < 0 || dataLength === 0 || dataLength % format.align !== 0) throw new Error("Données audio WAV invalides.");
  const frames = dataLength / format.align;
  const bucketCount = Math.min(200, frames);
  const waveform: Array<{ min: number; max: number }> = [];
  let sumSquares = 0;
  let peak = 0;
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = Math.floor(bucket * frames / bucketCount);
    const stop = Math.floor((bucket + 1) * frames / bucketCount);
    let min = 1;
    let max = -1;
    for (let frame = start; frame < stop; frame++) {
      let mono = 0;
      for (let channel = 0; channel < format.channels; channel++) {
        const sample = view.getInt16(dataOffset + frame * format.align + channel * 2, true) / 32768;
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        mono += sample / format.channels;
      }
      min = Math.min(min, mono);
      max = Math.max(max, mono);
    }
    waveform.push({ min, max });
  }
  return { channels: format.channels, sampleRateHz: format.rate, bitsPerSample: format.bits, durationSec: frames / format.rate, rms: Math.sqrt(sumSquares / (frames * format.channels)), peak, waveform };
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
