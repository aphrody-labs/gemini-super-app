/**
 * Consolidated AudioCraft & Google Lyria Music Bridge (`vendor/audiocraft` -> `packages/audiocraft_bridge`).
 *
 * Orchestrates `uv`-managed AudioCraft models (`MusicGen`, `AudioGen`, `EnCodec`, `MultiBandDiffusion`)
 * and synthesizes procedural harmonic PCM16 stems in Bun for instant preview in the Gemini Super App.
 */

import { createWavPcm16Buffer } from "@gemini-live/mediabunny";

export type AudioCraftModelId =
  | "facebook/musicgen-stereo-large"
  | "facebook/musicgen-melody-large"
  | "facebook/audiogen-medium"
  | "facebook/encodec_32khz"
  | "google/lyria-realtime-3.8";

export interface AudioCraftGenerationRequest {
  readonly model: AudioCraftModelId;
  readonly prompt: string;
  readonly durationSec: number;
  readonly sampleRateHz?: number;
  readonly topK?: number;
  readonly temperature?: number;
}

export interface AudioCraftStemResult {
  readonly id: string;
  readonly model: AudioCraftModelId;
  readonly prompt: string;
  readonly durationSec: number;
  readonly sampleRateHz: number;
  readonly uvCommand: string[];
  readonly previewWavBytes: Uint8Array;
}

/**
 * Build the `uv run` command to invoke the consolidated Python AudioCraft hub (`backend/super_app_hub.py`).
 */
export /* @__PURE__ */ function buildAudioCraftUvCommand(
  req: AudioCraftGenerationRequest,
  hubScriptPath: string = "backend/super_app_hub.py",
): string[] {
  return [
    "uv",
    "run",
    "python",
    hubScriptPath,
    "--mode",
    "audiocraft",
    "--model",
    req.model,
    "--prompt",
    req.prompt,
    "--duration",
    String(req.durationSec),
    "--sample-rate",
    String(req.sampleRateHz ?? 32000),
  ];
}

/**
 * Synthesize an instant harmonic chord preview stem (16-bit PCM WAV) in pure Bun
 * while background AudioCraft / Lyria generation runs.
 */
export /* @__PURE__ */ function generatePreviewStemWav(
  req: AudioCraftGenerationRequest,
): AudioCraftStemResult {
  const sampleRateHz = req.sampleRateHz ?? 16000;
  const previewSec = Math.min(2, Math.max(0.2, req.durationSec));
  const totalSamples = Math.floor(sampleRateHz * previewSec);
  const samples = new Int16Array(totalSamples);

  // Harmonic triad (A4=440Hz, C#5=554.37Hz, E5=659.25Hz) modulated by prompt hash
  const hash = Number(Bun.hash(req.prompt) % 120n);
  const rootFreq = 220 + hash;
  const thirdFreq = rootFreq * 1.2599;
  const fifthFreq = rootFreq * 1.4983;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRateHz;
    const env = Math.min(1, t * 8) * Math.exp(-t * 1.2);
    const wave =
      (Math.sin(2 * Math.PI * rootFreq * t) +
        0.7 * Math.sin(2 * Math.PI * thirdFreq * t) +
        0.5 * Math.sin(2 * Math.PI * fifthFreq * t)) /
      2.2;
    samples[i] = Math.round(wave * env * 18000);
  }

  return {
    id: `stem-${Date.now()}`,
    model: req.model,
    prompt: req.prompt,
    durationSec: req.durationSec,
    sampleRateHz,
    uvCommand: buildAudioCraftUvCommand(req),
    previewWavBytes: createWavPcm16Buffer(samples, sampleRateHz, 1),
  };
}
