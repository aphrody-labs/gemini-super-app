/**
 * One Big Gemini Super App — Unified Fullstack Bun v1.4.5 Server (`apps/gemini_super_app/src/server.ts`).
 *
 * Uses native `Bun.serve()`, `bun:sqlite` (WAL mode), `Bun.file()`, and WebSockets to unify:
 * 1. Gemini 3.8 Live & Extended Thinking (`@gemini-live/voice-core`, `@gemini-live/voice-protocol`)
 * 2. Voicebox Studio & Voice Cloning (`@gemini-live/voicebox-sdk`)
 * 3. AudioCraft & Google Lyria Music Lab (`@gemini-live/audiocraft-bridge`)
 * 4. YouTube Music Desktop & Polaris Streamer (`@gemini-live/ytm-client`)
 * 5. Bun-Video & Mediabunny Audio/Video Pipeline (`@gemini-live/bun-media`, `@gemini-live/mediabunny`)
 * 6. Jan ADK & Awesome-Rust Audio Catalog (`@gemini-live/jan-adk`)
 */

import { Database } from "bun:sqlite";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  generatePreviewStemWav,
  type AudioCraftGenerationRequest,
} from "@gemini-live/audiocraft-bridge";
import { analyzePcm16AudioTimeline } from "@gemini-live/bun-media";
import {
  DurableGeminiCookieManager,
  type GeminiCookieEntry,
} from "@gemini-live/google-ai-suite";
import {
  DEFAULT_GEMINI_JAN_AGENT,
  formatJanAdkJsonl,
  parseJanAdkJsonlStream,
} from "@gemini-live/jan-adk";
import { createWavPcm16Buffer, parseWavHeader } from "@gemini-live/mediabunny";
import {
  GEMINI_PET_CHARACTERS,
  GeminiPetStateManager,
  generateGeminiPetSvgSpritesheet,
  isAllowedReaction,
  type OpenPetsReaction,
} from "@gemini-live/openpets-gemini";
import { inspectAndMigrateGeminiWindowsToTauriV3 } from "../../../scripts/gemini_windows_tauri_v3";
import {
  DEFAULT_SURFACE_ENDPOINTS,
  GEMINI_DEEP_REASONING_MODEL,
  GEMINI_EXTENDED_THINKING_LIVE_MODEL,
  GEMINI_HD_VOICES,
  GEMINI_LIVE_MODEL,
  GEMINI_STT_LIVE_MODEL,
  GEMINI_TTS_LITE_MODEL,
  GEMINI_TTS_MODEL,
} from "@gemini-live/voice-core";
import {
  createStartCommandFrame,
  createSpectrumFrame,
  parseHubMessage,
  serializeHubMessage,
} from "@gemini-live/voice-protocol";
import { createStudioProject } from "@gemini-live/voicebox-sdk";
import {
  YtmCompanionClient,
  type YtmCommandPayload,
} from "@gemini-live/ytm-client";

export interface SuperAppSocketData {
  readonly clientId: string;
  readonly surface: string;
}

export interface SuperAppHubState {
  readonly db: Database;
  readonly ytm: YtmCompanionClient;
}

export function createSuperAppDatabase(dbPath: string = ":memory:"): Database {
  const db = new Database(dbPath);
  db.run("PRAGMA journal_mode = WAL;");
  db.run(`
    CREATE TABLE IF NOT EXISTS voice_sessions (
      id TEXT PRIMARY KEY,
      surface TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS studio_generations (
      id TEXT PRIMARY KEY,
      engine TEXT NOT NULL,
      prompt TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS pet_care_state (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

export function startGeminiSuperAppServer(
  port: number = 0,
  dbPath: string = ":memory:",
) {
  const db = createSuperAppDatabase(dbPath);
  const ytm = new YtmCompanionClient();
  const cookieManager = new DurableGeminiCookieManager();
  void cookieManager.importAndPersist().then(() => {
    cookieManager.startAutoRefreshDaemon(540_000);
  });
  const studioProject = createStudioProject("Gemini Super App Master Session");
  const indexHtmlPath = `${import.meta.dir}/index.html`;
  const windowsTauriHtmlPath = `${import.meta.dir}/windows_tauri.html`;
  const geminiPetHtmlPath = `${import.meta.dir}/gemini_pet.html`;
  const openPetsAssetsDir = `${import.meta.dir}/../../../vendor/openpets/apps/desktop/assets`;
  const petManager = new GeminiPetStateManager();
  const cachedGeminiPetSvg = generateGeminiPetSvgSpritesheet();

  const insertSessionStmt = db.query(
    "INSERT OR REPLACE INTO voice_sessions (id, surface, model, created_at) VALUES ($id, $surface, $model, $createdAt)",
  );
  const insertGenStmt = db.query(
    "INSERT OR REPLACE INTO studio_generations (id, engine, prompt, duration_sec, created_at) VALUES ($id, $engine, $prompt, $durationSec, $createdAt)",
  );
  const upsertPetStateStmt = db.query(
    "INSERT OR REPLACE INTO pet_care_state (id, payload_json, updated_at) VALUES ('default', $payloadJson, $updatedAt)",
  );
  const persistPetSnapshot = () => {
    const snap = petManager.getSnapshot();
    upsertPetStateStmt.run({
      $payloadJson: JSON.stringify(snap),
      $updatedAt: Date.now(),
    });
    return snap;
  };
  persistPetSnapshot();

  const server = Bun.serve<SuperAppSocketData>({
    port,
    routes: {
      "/": async () => {
        const html = await Bun.file(indexHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/windows-tauri": async () => {
        const html = await Bun.file(windowsTauriHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/pet": async () => {
        const html = await Bun.file(geminiPetHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/assets/openpets/gemini-pet-spritesheet.svg": () =>
        new Response(cachedGeminiPetSvg, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
      "/assets/openpets/default-pet-spritesheet.webp": () =>
        new Response(
          Bun.file(`${openPetsAssetsDir}/default-pet-spritesheet.webp`),
          {
            headers: { "content-type": "image/webp" },
          },
        ),
      "/assets/openpets/default-pet-thumbnail.png": () =>
        new Response(
          Bun.file(`${openPetsAssetsDir}/default-pet-thumbnail.png`),
          {
            headers: { "content-type": "image/png" },
          },
        ),
      "/assets/openpets/outfits/:outfit": (
        req: Request & { params: { outfit: string } },
      ) => {
        const outfit = req.params.outfit.replace(/[^a-z0-9._-]/gi, "");
        return new Response(
          Bun.file(`${openPetsAssetsDir}/default-pet-outfits/${outfit}`),
          {
            headers: { "content-type": "image/webp" },
          },
        );
      },
      "/api/pet/state": {
        GET: () =>
          Response.json({
            pet: persistPetSnapshot(),
            characters: GEMINI_PET_CHARACTERS,
            leases: petManager.leaseManager.list(),
          }),
      },
      "/api/pet/action": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            action?: string;
            reaction?: string;
            text?: string;
            petId?: "gemini-sparkle" | "hoodie-cat";
            outfitId?: string;
            autoSchedule?: boolean;
            gravityEnabled?: boolean;
            position?: { x: number; y: number };
          };
          let leveledUp = false;
          switch (body.action) {
            case "feed":
              leveledUp = petManager.feed().leveledUp;
              break;
            case "play":
              leveledUp = petManager.play().leveledUp;
              break;
            case "pet":
              leveledUp = petManager.pet().leveledUp;
              break;
            case "nap":
              leveledUp = petManager.nap().leveledUp;
              break;
            case "react":
              if (isAllowedReaction(body.reaction)) {
                petManager.react(body.reaction, body.text);
              }
              break;
            case "say":
              if (body.text) petManager.say(body.text);
              break;
            case "switchPet":
              if (
                body.petId === "gemini-sparkle" ||
                body.petId === "hoodie-cat"
              ) {
                petManager.switchPet(body.petId, body.outfitId);
              }
              break;
            case "outfit":
              if (body.outfitId) {
                petManager.setOutfit(body.outfitId, Boolean(body.autoSchedule));
              }
              break;
            case "physics":
              petManager.setPhysics(
                body.gravityEnabled ?? petManager.getSnapshot().gravityEnabled,
                body.position,
              );
              break;
            default:
              break;
          }
          return Response.json({
            ok: true,
            leveledUp,
            pet: persistPetSnapshot(),
            characters: GEMINI_PET_CHARACTERS,
          });
        },
      },
      "/api/pet/voice": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            prompt?: string;
            voice?: string;
            pcm16_base64?: string;
          };
          petManager.react(
            "thinking",
            "Réflexion Gemini 3.8 Live en cours... ✦",
          );
          persistPetSnapshot();

          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY ?? "";
          const ai = new GoogleGenAI({ apiKey, vertexai: false });
          const model = GEMINI_LIVE_MODEL;
          const voiceName = body.voice ?? "Puck";
          const pcm24kChunks: Uint8Array[] = [];
          let inputTranscript = "";
          let outputTranscript = "";
          let turnDone = false;

          const snap = petManager.getSnapshot();
          const petPersona =
            snap.activePetId === "gemini-sparkle"
              ? "Tu es Gemini Sparkle Pet ✦, le compagnon virtuel officiel de la Super App Gemini Live. Réponds en français avec enthousiasme en 1 ou 2 phrases courtes."
              : "Tu es Hoodie Cat 🐾, le chat compagnon OpenPets propulsé par Gemini 3.8 Live. Réponds en français de manière féline, chaleureuse et concise en 1 ou 2 phrases.";

          const session = await ai.live.connect({
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: {
                parts: [{ text: petPersona }],
              },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
            callbacks: {
              onmessage(msg) {
                const sc = msg.serverContent;
                if (sc?.inputTranscription?.text) {
                  inputTranscript += sc.inputTranscription.text;
                }
                if (sc?.outputTranscription?.text) {
                  outputTranscript += sc.outputTranscription.text;
                }
                const parts = sc?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      pcm24kChunks.push(
                        new Uint8Array(
                          Buffer.from(part.inlineData.data, "base64"),
                        ),
                      );
                    }
                  }
                }
                if (sc?.turnComplete) {
                  turnDone = true;
                }
              },
            },
          });

          if (body.pcm16_base64 && body.pcm16_base64.length > 200) {
            session.sendRealtimeInput({
              audio: {
                data: body.pcm16_base64,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }

          session.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      body.prompt ??
                      "Coucou Gemini Pet ! Dis bonjour à ton humain en une phrase joyeuse.",
                  },
                ],
              },
            ],
            turnComplete: true,
          });

          const started = Date.now();
          while (!turnDone && Date.now() - started < 8500) {
            await Bun.sleep(80);
          }
          session.close();

          let totalBytes = 0;
          for (const c of pcm24kChunks) totalBytes += c.byteLength;
          const mergedPcmBytes = new Uint8Array(totalBytes);
          let offset = 0;
          for (const c of pcm24kChunks) {
            mergedPcmBytes.set(c, offset);
            offset += c.byteLength;
          }

          const sampleCount = Math.floor(mergedPcmBytes.byteLength / 2);
          const samples24k = new Int16Array(
            mergedPcmBytes.buffer,
            mergedPcmBytes.byteOffset,
            sampleCount,
          );
          const timeline = analyzePcm16AudioTimeline(
            samples24k.length > 0 ? samples24k : new Int16Array(512),
            24000,
          );
          const wavBuffer = createWavPcm16Buffer(samples24k, 24000, 1);
          const wavBase64 = Buffer.from(wavBuffer).toString("base64");

          const spokenBubble =
            outputTranscript.trim() ||
            "Coucou ! Je suis ravi de discuter avec toi en Gemini 3.8 Live ✦";
          petManager.pet();
          petManager.react("celebrating", spokenBubble);
          const updatedPet = persistPetSnapshot();

          return Response.json({
            model,
            voice: voiceName,
            input_transcript: inputTranscript.trim(),
            output_transcript: spokenBubble,
            audio_chunks_count: pcm24kChunks.length,
            pcm24k_bytes_len: mergedPcmBytes.byteLength,
            wav_base64: wavBase64,
            orb_spectrum: {
              bands: timeline.spectrumBands32,
              rms: 0.25,
              bpmEstimate: timeline.bpmEstimate,
            },
            pet: updatedPet,
          });
        },
      },
      "/api/openpets/ipc": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            id?: string;
            version?: number;
            method?: string;
            params?: Record<string, unknown>;
          };
          const id = body.id ?? `ipc-${Date.now()}`;
          const params = body.params ?? {};

          switch (body.method) {
            case "hello":
              return Response.json({
                id,
                ok: true,
                result: {
                  app: "gemini-super-app-openpets",
                  protocolVersion: 1,
                  authenticated: true,
                },
              });
            case "status":
              return Response.json({
                id,
                ok: true,
                result: {
                  status: "ready",
                  activePetId: petManager.getSnapshot().activePetId,
                  leases: petManager.leaseManager.list(),
                },
              });
            case "pets.list":
              return Response.json({
                id,
                ok: true,
                result: {
                  activePetId: petManager.getSnapshot().activePetId,
                  pets: GEMINI_PET_CHARACTERS.map((c) => ({
                    id: c.id,
                    name: c.name,
                    active: c.id === petManager.getSnapshot().activePetId,
                  })),
                },
              });
            case "lease.acquire": {
              const lease = petManager.leaseManager.acquire({
                sessionId: String(params.sessionId ?? "session-default"),
                agent: String(params.agent ?? "antigravity"),
                cwd: params.cwd ? String(params.cwd) : undefined,
                petId: params.petId ? String(params.petId) : undefined,
              });
              return Response.json({ id, ok: true, result: { lease } });
            }
            case "lease.heartbeat": {
              const lease = petManager.leaseManager.heartbeat(
                String(params.sessionId ?? "session-default"),
              );
              return Response.json({
                id,
                ok: Boolean(lease),
                result: { lease },
              });
            }
            case "lease.release": {
              const released = petManager.leaseManager.release(
                String(params.sessionId ?? "session-default"),
              );
              return Response.json({ id, ok: true, result: { released } });
            }
            case "pet.react": {
              const reaction = isAllowedReaction(params.reaction)
                ? (params.reaction as OpenPetsReaction)
                : "working";
              const text =
                typeof params.text === "string" ? params.text : undefined;
              const snap = petManager.react(reaction, text);
              persistPetSnapshot();
              return Response.json({ id, ok: true, result: { pet: snap } });
            }
            case "pet.say": {
              const text = String(params.text ?? "Bonjour ✦");
              const snap = petManager.say(text);
              persistPetSnapshot();
              return Response.json({ id, ok: true, result: { pet: snap } });
            }
            default:
              return Response.json(
                {
                  id,
                  ok: false,
                  error: `Unknown IPC method: ${String(body.method)}`,
                },
                { status: 400 },
              );
          }
        },
      },
      "/api/windows-tauri/status": async () => {
        const report = await inspectAndMigrateGeminiWindowsToTauriV3();
        return Response.json(report);
      },
      "/api/tauri/voice-to-voice": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            prompt?: string;
            voice?: string;
            pcm16_base64?: string;
          };
          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY ?? "";
          const ai = new GoogleGenAI({ apiKey, vertexai: false });
          const model = GEMINI_LIVE_MODEL;
          const voiceName = body.voice ?? "Aoede";
          const pcm24kChunks: Uint8Array[] = [];
          let inputTranscript = "";
          let outputTranscript = "";
          let turnDone = false;

          const session = await ai.live.connect({
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
            callbacks: {
              onmessage(msg) {
                const sc = msg.serverContent;
                if (sc?.inputTranscription?.text) {
                  inputTranscript += sc.inputTranscription.text;
                }
                if (sc?.outputTranscription?.text) {
                  outputTranscript += sc.outputTranscription.text;
                }
                const parts = sc?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      pcm24kChunks.push(
                        new Uint8Array(
                          Buffer.from(part.inlineData.data, "base64"),
                        ),
                      );
                    }
                  }
                }
                if (sc?.turnComplete) {
                  turnDone = true;
                }
              },
            },
          });

          if (body.pcm16_base64 && body.pcm16_base64.length > 200) {
            session.sendRealtimeInput({
              audio: {
                data: body.pcm16_base64,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }

          session.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      body.prompt ??
                      "Bonjour Gemini ! Confirme en français que la version Windows Tauri v3 Voice-to-Voice fonctionne.",
                  },
                ],
              },
            ],
            turnComplete: true,
          });

          const started = Date.now();
          while (!turnDone && Date.now() - started < 8500) {
            await Bun.sleep(80);
          }
          session.close();

          let totalBytes = 0;
          for (const c of pcm24kChunks) totalBytes += c.byteLength;
          const mergedPcmBytes = new Uint8Array(totalBytes);
          let offset = 0;
          for (const c of pcm24kChunks) {
            mergedPcmBytes.set(c, offset);
            offset += c.byteLength;
          }

          const sampleCount = Math.floor(mergedPcmBytes.byteLength / 2);
          const samples24k = new Int16Array(
            mergedPcmBytes.buffer,
            mergedPcmBytes.byteOffset,
            sampleCount,
          );
          const timeline = analyzePcm16AudioTimeline(
            samples24k.length > 0 ? samples24k : new Int16Array(512),
            24000,
          );
          const wavBuffer = createWavPcm16Buffer(samples24k, 24000, 1);
          const wavBase64 = Buffer.from(wavBuffer).toString("base64");

          const avgRms =
            timeline.rmsEnvelope.length > 0
              ? timeline.rmsEnvelope.reduce((a, b) => a + b, 0) /
                timeline.rmsEnvelope.length
              : 0.18;

          return Response.json({
            model,
            voice: voiceName,
            input_transcript: inputTranscript.trim(),
            output_transcript: outputTranscript.trim(),
            audio_chunks_count: pcm24kChunks.length,
            pcm24k_bytes_len: mergedPcmBytes.byteLength,
            wav_base64: wavBase64,
            orb_spectrum: {
              bands: timeline.spectrumBands32,
              rms: avgRms,
              bpmEstimate: timeline.bpmEstimate,
            },
          });
        },
      },
      "/api/health": () =>
        Response.json({
          status: "ok",
          app: "@gemini-live/super-app",
          version: "2026.11.0",
          runtime: `bun/${Bun.version}`,
          tauriVersion: "3.0.0-alpha.5",
          pythonManager: "uv",
          models: {
            live: GEMINI_LIVE_MODEL,
            extendedThinking: GEMINI_EXTENDED_THINKING_LIVE_MODEL,
            deepReasoning: GEMINI_DEEP_REASONING_MODEL,
            tts: GEMINI_TTS_MODEL,
            ttsLite: GEMINI_TTS_LITE_MODEL,
            sttLive: GEMINI_STT_LIVE_MODEL,
          },
          voices: GEMINI_HD_VOICES,
          endpoints: DEFAULT_SURFACE_ENDPOINTS,
          consolidatedSubmodules: [
            "vendor/voicebox",
            "vendor/locally-uncensored",
            "vendor/jan",
            "vendor/ytmdesktop",
            "vendor/awesome-rust",
            "vendor/flowcat",
            "vendor/polaris",
            "vendor/audiocraft",
            "vendor/bun-video",
            "vendor/openpets",
          ],
        }),
      "/api/voicebox/project": () => Response.json(studioProject),
      "/api/ytm/state": {
        GET: () =>
          Response.json({
            state: ytm.getCurrentState(),
            djIntro: ytm.buildGeminiDjIntroPrompt(),
          }),
        POST: async (req: Request) => {
          const body = (await req.json()) as YtmCommandPayload;
          const nextState = ytm.applyLocalCommand(body);
          return Response.json({
            state: nextState,
            djIntro: ytm.buildGeminiDjIntroPrompt(),
          });
        },
      },
      "/api/audiocraft/generate": {
        POST: async (req: Request) => {
          const body =
            (await req.json()) as Partial<AudioCraftGenerationRequest>;
          const request: AudioCraftGenerationRequest = {
            model: body.model ?? "facebook/musicgen-stereo-large",
            prompt:
              body.prompt ??
              "Warm ambient synth pads with Gemini Live voice harmony",
            durationSec: body.durationSec ?? 2,
            sampleRateHz: body.sampleRateHz ?? 16000,
          };
          const stem = generatePreviewStemWav(request);
          const wavInfo = parseWavHeader(stem.previewWavBytes);
          insertGenStmt.run({
            $id: stem.id,
            $engine: stem.model,
            $prompt: stem.prompt,
            $durationSec: stem.durationSec,
            $createdAt: Date.now(),
          });
          return Response.json({
            id: stem.id,
            model: stem.model,
            prompt: stem.prompt,
            uvCommand: stem.uvCommand,
            wavHeader: wavInfo,
          });
        },
      },
      "/api/media/analyze": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            frequencyHz?: number;
            sampleCount?: number;
          };
          const freq = body.frequencyHz ?? 440;
          const count = body.sampleCount ?? 1600;
          const samples = new Int16Array(count);
          for (let i = 0; i < count; i++) {
            samples[i] = Math.round(
              Math.sin((2 * Math.PI * freq * i) / 16000) * 14000,
            );
          }
          const timeline = analyzePcm16AudioTimeline(samples, 16000);
          const wav = createWavPcm16Buffer(samples, 16000, 1);
          const header = parseWavHeader(wav);
          return Response.json({
            header,
            timeline,
          });
        },
      },
      "/api/jan/agent": () => {
        const sampleEvent = formatJanAdkJsonl({
          jsonrpc: "2.0",
          method: "agent.status",
          params: {
            agentId: DEFAULT_GEMINI_JAN_AGENT.id,
            model: DEFAULT_GEMINI_JAN_AGENT.liveModel,
            text: "Gemini Super App ADK Agent Ready",
            timestampMs: Date.now(),
          },
        });
        return Response.json({
          manifest: DEFAULT_GEMINI_JAN_AGENT,
          parsedEvents: parseJanAdkJsonlStream(sampleEvent),
        });
      },
      "/api/gemini/reason": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            prompt?: string;
            model?: string;
          };
          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY ?? "";
          const ai = new GoogleGenAI({ apiKey, vertexai: false });
          const model = body.model ?? GEMINI_DEEP_REASONING_MODEL;
          const resp = await ai.models.generateContent({
            model,
            contents: body.prompt ?? "Reply with the single word ARGON_LIVE_OK",
          });
          return Response.json({
            model,
            text: resp.text?.trim() ?? "",
          });
        },
      },
      "/api/gemini/tts": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            text?: string;
            voice?: string;
            model?: string;
          };
          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY ?? "";
          const ai = new GoogleGenAI({ apiKey, vertexai: false });
          const model = body.model ?? GEMINI_TTS_MODEL;
          const voiceName = body.voice ?? "Aoede";
          const resp = await ai.models.generateContent({
            model,
            contents:
              body.text ?? "Bonjour depuis la Super Application Gemini Live.",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });
          const inlineData =
            resp.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          return Response.json({
            model,
            voice: voiceName,
            mimeType: inlineData?.mimeType ?? "audio/wav",
            base64Length: inlineData?.data?.length ?? 0,
          });
        },
      },
      "/api/gemini/live-turn": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            prompt?: string;
            voice?: string;
            model?: string;
          };
          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY ?? "";
          const ai = new GoogleGenAI({ apiKey, vertexai: false });
          const model = body.model ?? GEMINI_LIVE_MODEL;
          const voiceName = body.voice ?? "Aoede";
          let audioChunks = 0;
          let totalAudioBase64Chars = 0;
          let turnDone = false;

          const session = await ai.live.connect({
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
            callbacks: {
              onmessage(msg) {
                const parts = msg.serverContent?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      audioChunks++;
                      totalAudioBase64Chars += part.inlineData.data.length;
                    }
                  }
                }
                if (msg.serverContent?.turnComplete) {
                  turnDone = true;
                }
              },
            },
          });

          session.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: body.prompt ?? "Say Bonjour in one word." }],
              },
            ],
            turnComplete: true,
          });

          const started = Date.now();
          while (!turnDone && Date.now() - started < 8000) {
            await Bun.sleep(80);
          }
          session.close();

          return Response.json({
            model,
            voice: voiceName,
            audioChunks,
            totalAudioBase64Chars,
            turnDone,
          });
        },
      },
      "/api/gemini/cookies/status": {
        GET: async () => {
          await cookieManager.loadFromVault();
          return Response.json(cookieManager.getRedactedStatus());
        },
      },
      "/api/gemini/cookies/refresh": {
        POST: async () => {
          const result = await cookieManager.refreshSessionCookies();
          return Response.json({
            ok: result.ok,
            rotateHttpStatus: result.rotateHttpStatus,
            appHttpStatus: result.appHttpStatus,
            updatedCookies: result.updatedCookies,
            status: cookieManager.getRedactedStatus(),
          });
        },
      },
      "/api/gemini/cookies/sync": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            cookies?: Record<string, GeminiCookieEntry>;
          };
          const current =
            (await cookieManager.loadFromVault()) ??
            (await cookieManager.importAndPersist());
          const merged = {
            ...current.cookies,
            ...body.cookies,
          };
          await cookieManager.saveToAllTiers({
            ...current,
            lastRefreshedAtIso: new Date().toISOString(),
            hasValid1Psid: Boolean(merged["__Secure-1PSID"]?.value),
            hasValid1PsidTs: Boolean(merged["__Secure-1PSIDTS"]?.value),
            cookies: merged,
          });
          return Response.json(cookieManager.getRedactedStatus());
        },
      },
    },
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        const origin = req.headers.get("origin") ?? "http://127.0.0.1";
        if (
          !origin.startsWith("http://") &&
          !origin.startsWith("https://") &&
          !origin.startsWith("tauri://")
        ) {
          return new Response("Forbidden origin", { status: 403 });
        }
        const upgraded = srv.upgrade(req, {
          data: {
            clientId: `client-${Date.now()}`,
            surface: url.searchParams.get("surface") ?? "super-app",
          },
        });
        if (upgraded) return undefined;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      data: {} as SuperAppSocketData,
      open(ws) {
        insertSessionStmt.run({
          $id: ws.data.clientId,
          $surface: ws.data.surface,
          $model: GEMINI_LIVE_MODEL,
          $createdAt: Date.now(),
        });
        const welcome = createSpectrumFrame(
          Array.from({ length: 32 }, () => 0.12),
          0.15,
          false,
        );
        ws.send(serializeHubMessage(welcome));
      },
      message(ws, message) {
        const text =
          typeof message === "string"
            ? message
            : new TextDecoder().decode(message);
        const frame = parseHubMessage(text);
        if (frame.type === "cmd_start") {
          const ack = createStartCommandFrame(
            "super-app",
            frame.model ?? GEMINI_LIVE_MODEL,
          );
          ws.send(serializeHubMessage(ack));
        } else {
          ws.send(serializeHubMessage(frame));
        }
      },
    },
  });

  return { server, db, ytm, cookieManager };
}

if (import.meta.main) {
  const port = Number(Bun.env.SUPER_APP_PORT ?? 8787);
  const { server } = startGeminiSuperAppServer(port);
  console.log(`Gemini Super App running on http://127.0.0.1:${server.port}`);
}
