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

  const insertSessionStmt = db.query(
    "INSERT OR REPLACE INTO voice_sessions (id, surface, model, created_at) VALUES ($id, $surface, $model, $createdAt)",
  );
  const insertGenStmt = db.query(
    "INSERT OR REPLACE INTO studio_generations (id, engine, prompt, duration_sec, created_at) VALUES ($id, $engine, $prompt, $durationSec, $createdAt)",
  );

  const server = Bun.serve<SuperAppSocketData>({
    port,
    routes: {
      "/": async () => {
        const html = await Bun.file(indexHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
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
