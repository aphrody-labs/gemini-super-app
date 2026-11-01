/**
 * Consolidated Voicebox Studio SDK (`vendor/voicebox/app` & `web` -> `packages/voicebox_sdk`).
 *
 * Upgraded to Tauri v3 Alpha (`@tauri-apps/api@^3.0.0-alpha.3`) and integrated with
 * `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, Qwen3-TTS, and Kokoro for
 * multi-speaker voice cloning and studio timeline authoring.
 */

import {
  GEMINI_HD_VOICES,
  GEMINI_TTS_LITE_MODEL,
  GEMINI_TTS_MODEL,
  type GeminiHdVoice,
} from "@gemini-live/voice-core";

export type VoiceCloningEngineId =
  | "gemini-3.8-flash-tts"
  | "gemini-3.8-flash-lite-tts"
  | "qwen3-tts-clone"
  | "kokoro-82m"
  | "edge-tts-neural";

export interface StudioVoiceProfile {
  readonly id: string;
  readonly name: string;
  readonly engine: VoiceCloningEngineId;
  readonly hdVoice: GeminiHdVoice;
  readonly language: string;
  readonly styleInstruction: string;
  readonly sampleAudioPath?: string;
}

export interface StudioTrackClip {
  readonly id: string;
  readonly profileId: string;
  readonly text: string;
  readonly startTimeMs: number;
  readonly durationMs: number;
  readonly pitchSemitones: number;
  readonly speed: number;
}

export interface StudioProjectState {
  readonly projectId: string;
  readonly title: string;
  readonly tauriVersion: "3.0.0-alpha.5";
  readonly profiles: StudioVoiceProfile[];
  readonly clips: StudioTrackClip[];
}

export /* @__PURE__ */ function createDefaultStudioProfiles(): StudioVoiceProfile[] {
  return GEMINI_HD_VOICES.map((voice, idx) => ({
    id: `voicebox-${voice.toLowerCase()}`,
    name: `${voice} — Studio HD`,
    engine: idx % 2 === 0 ? GEMINI_TTS_MODEL : GEMINI_TTS_LITE_MODEL,
    hdVoice: voice,
    language: idx % 2 === 0 ? "fr-FR" : "en-US",
    styleInstruction:
      "Expressive studio narration with natural <breath> and <short pause> tags",
  }));
}

export /* @__PURE__ */ function createStudioProject(
  title: string,
): StudioProjectState {
  const profiles = createDefaultStudioProfiles();
  return {
    projectId: `vb-proj-${Date.now()}`,
    title,
    tauriVersion: "3.0.0-alpha.5",
    profiles,
    clips: [
      {
        id: "clip-intro",
        profileId: profiles[0]?.id ?? "voicebox-aoede",
        text: "<short pause> Bienvenue dans le studio vocal unifié Gemini 3.8 Live et Voicebox.",
        startTimeMs: 0,
        durationMs: 4200,
        pitchSemitones: 0,
        speed: 1.0,
      },
    ],
  };
}
