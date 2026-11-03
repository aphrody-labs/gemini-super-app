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
import { dirname, join } from "node:path";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  generateMusicGen,
  validateMusicGenRequest,
  type MusicGenRequest,
} from "@gemini-live/audiocraft-bridge";
import { analyzeNativeSpectrum, analyzeWavPcm16 } from "@gemini-live/bun-media";
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
  MOCHI_EMOTE_CATALOGUE,
  OPENPETS_3D_WGPU_SHADER_WGSL,
  convertPngToGlb,
  generateGeminiPetSvgSpritesheet,
  isAllowedReaction,
  type GeminiPetCareSnapshot,
  type GeminiPetChoreographyStep,
  type GeminiPetCustomStyle,
  type MochiPocketKind,
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
  YtmCompanionError,
  type YtmCommandPayload,
} from "@gemini-live/ytm-client";
import {
  CORS_HEADERS,
  PermanentAntigravitySessionManager,
  executePcCommand,
  executePcFilesystemAction,
  getLiveClockAndToolsContext,
} from "./pc_antigravity_bridge";
import { resolveProductRoot } from "./product_paths";
import { allowsLocalRequest, protectApiRoutes } from "./local_access";
import { parseMessageMarkdown } from "./markdown";

export interface SuperAppSocketData {
  readonly clientId: string;
  readonly surface: string;
}

type ChatAttachment = { name: string; mimeType: string; data: string };
export function validateChatAttachments(value: unknown): ChatAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 3) throw new Error("Trois fichiers maximum sont autorisés.");
  let total = 0;
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Fichier invalide.");
    const { name, mimeType, data } = item as ChatAttachment;
    if (typeof name !== "string" || !name.trim() || name.length > 255 || typeof data !== "string" || typeof mimeType !== "string") throw new Error("Fichier invalide.");
    if (data.length > 4 * 1024 * 1024 * 4 / 3 + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw new Error("Fichier trop volumineux ou mal encodé.");
    const bytes = Buffer.from(data, "base64");
    total += bytes.length;
    if (total > 4 * 1024 * 1024) throw new Error("Les fichiers dépassent 4 Mo au total.");
    const valid = mimeType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : mimeType === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : mimeType === "image/webp" ? bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
      : mimeType === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-" : false;
    if (!valid) throw new Error("Utilisez une image PNG, JPEG, WebP ou un PDF valide.");
    return { name: name.trim(), mimeType, data };
  });
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
  db.run(`
    CREATE TABLE IF NOT EXISTS app_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model_id TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS app_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      thought_process TEXT,
      citations_json TEXT NOT NULL DEFAULT '[]',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS app_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data BLOB NOT NULL
    );
  `);

  return db;
}

export function startGeminiSuperAppServer(
  port: number = 0,
  dbPath: string = ":memory:",
  ytmClient?: YtmCompanionClient,
) {
  const db = createSuperAppDatabase(dbPath);
  const ytm = ytmClient ?? new YtmCompanionClient();
  const cookieManager = new DurableGeminiCookieManager();
  void cookieManager.importAndPersist().then(() => {
    cookieManager.startAutoRefreshDaemon(540_000);
  });
  const studioProject = createStudioProject("Gemini Super App Master Session");
  const repoRootDir = resolveProductRoot({ override: Bun.env.SUPER_APP_ROOT, entryDir: import.meta.dir, cwd: process.cwd(), executableDir: dirname(process.execPath) });
  const srcDir = join(repoRootDir, "apps", "gemini_super_app", "src");
  const windowsTauriHtmlPath = `${srcDir}/windows_tauri.html`;
  const geminiPetHtmlPath = `${srcDir}/gemini_pet.html`;
  const geminiAppHtmlPath = `${srcDir}/workspace.html`;
  const wallpaperHtmlPath = `${srcDir}/wallpaper.html`;
  const chromeHomeHtmlPath = `${repoRootDir}/apps/gemini_voice_extension/newtab/newtab.html`;
  const chromeHomeJsPath = `${repoRootDir}/apps/gemini_voice_extension/newtab/newtab.js`;
  const openPetsAssetsDir = `${repoRootDir}/vendor/openpets/apps/desktop/assets`;
  const mochiAssetsDir = `${repoRootDir}/vendor/mochi-desktop/assets`;
  const savedPetRow = db
    .query("SELECT payload_json FROM pet_care_state WHERE id = 'default'")
    .get() as { payload_json: string } | null;
  let initialPetState: Partial<GeminiPetCareSnapshot> | undefined;
  if (savedPetRow?.payload_json) {
    try {
      initialPetState = JSON.parse(
        savedPetRow.payload_json,
      ) as Partial<GeminiPetCareSnapshot>;
    } catch {}
  }
  const petManager = new GeminiPetStateManager(initialPetState);
  const agySession = new PermanentAntigravitySessionManager(db);
  let activeChoreographyTimer: ReturnType<typeof setTimeout> | null = null;
  let serverRef: ReturnType<typeof Bun.serve<SuperAppSocketData>> | null = null;

  const insertSessionStmt = db.query(
    "INSERT OR REPLACE INTO voice_sessions (id, surface, model, created_at) VALUES ($id, $surface, $model, $createdAt)",
  );
  const musicJobs = new Map<string, { status: "running" | "complete" | "failed"; output: string; error?: string }>();
  const attachmentsForMessage = (messageId: string, legacyJson: string) => {
    const rows = db.query("SELECT id, name, mime_type AS mimeType, length(data) AS sizeBytes FROM app_attachments WHERE message_id = $id ORDER BY rowid").all({ $id: messageId });
    return rows.length ? rows : JSON.parse(legacyJson || "[]");
  };
  const upsertPetStateStmt = db.query(
    "INSERT OR REPLACE INTO pet_care_state (id, payload_json, updated_at) VALUES ('default', $payloadJson, $updatedAt)",
  );
  const persistPetSnapshot = (broadcast = false) => {
    const snap = petManager.getSnapshot();
    upsertPetStateStmt.run({
      $payloadJson: JSON.stringify(snap),
      $updatedAt: Date.now(),
    });
    if (broadcast && serverRef) {
      try {
        serverRef.publish(
          "super-app-live",
          JSON.stringify({
            type: "pet:realtime-update",
            pet: snap,
            timestamp: Date.now(),
          }),
        );
      } catch {}
    }
    return snap;
  };
  persistPetSnapshot(false);

  const runChoreographySteps = (steps: GeminiPetChoreographyStep[]) => {
    if (activeChoreographyTimer) {
      clearTimeout(activeChoreographyTimer);
      activeChoreographyTimer = null;
    }
    if (!Array.isArray(steps) || steps.length === 0) return;
    let idx = 0;
    const nextStep = () => {
      if (idx >= steps.length) {
        activeChoreographyTimer = null;
        return;
      }
      const step = steps[idx++];
      if (!step) return;
      petManager.customizeAndAnimate({
        reaction: step.reaction,
        mochiAnimation: step.mochiAnimation,
        emoteId: step.emoteId,
        speechText: step.speechText,
        position: step.position,
      });
      persistPetSnapshot(true);
      const waitMs = Math.max(250, Math.min(15_000, step.durationMs || 1200));
      activeChoreographyTimer = setTimeout(nextStep, waitMs);
    };
    nextStep();
  };

  const server = Bun.serve<SuperAppSocketData>({
    port,
    hostname: "127.0.0.1",
    idleTimeout: 60,
    routes: protectApiRoutes({
      "/": async () => {
        const html = await Bun.file(geminiAppHtmlPath).text();
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
      "/wallpaper": async () => {
        const html = await Bun.file(wallpaperHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/api/wallpaper/status": async () => {
        let tauriWallpaper: Record<string, unknown> | null = null;
        try {
          const r = await fetch("http://127.0.0.1:8788/api/tauri/wallpaper", {
            signal: AbortSignal.timeout(1800),
          });
          if (r.ok) {
            tauriWallpaper = (await r.json()) as Record<string, unknown>;
          }
        } catch {}

        let voiceState: Record<string, unknown> | null = null;
        try {
          const vr = await fetch("http://127.0.0.1:8765/api/voice/telemetry", {
            signal: AbortSignal.timeout(1500),
          });
          if (vr.ok) {
            voiceState = (await vr.json()) as Record<string, unknown>;
          }
        } catch {}

        return Response.json({
          status: "ok",
          wallpaper: tauriWallpaper,
          voice: voiceState,
          pet: petManager.getSnapshot(),
        });
      },
      "/api/wallpaper/apply": {
        POST: async () => {
          try {
            const r = await fetch(
              "http://127.0.0.1:8788/api/tauri/wallpaper/apply",
              {
                method: "POST",
                signal: AbortSignal.timeout(4500),
              },
            );
            if (!r.ok) return Response.json({ error: "Le service natif a refusé l'application du fond d'écran." }, { status: 502 });
            const wallpaper = await r.json() as Record<string, unknown>;
            if (wallpaper.static_wallpaper_applied !== true) return Response.json({ error: "Le service natif n'a pas confirmé l'application du fond d'écran.", wallpaper }, { status: 502 });
            return Response.json({ status: "ok", wallpaper });
          } catch {
            return Response.json({ error: "Service de fond d'écran natif indisponible." }, { status: 503 });
          }
        },
      },
      "/app": async () => {
        const html = await Bun.file(geminiAppHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/workspace.js": () => new Response(Bun.file(`${srcDir}/workspace.js`), {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      }),
      "/markdown-dom.js": () => new Response(Bun.file(`${srcDir}/markdown-dom.js`), {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      }),
      "/chrome-home": async () => {
        const html = await Bun.file(chromeHomeHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/voice": async () => {
        const html = await Bun.file(chromeHomeHtmlPath).text();
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/newtab.js": async () => {
        const js = await Bun.file(chromeHomeJsPath).text();
        return new Response(js, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      },
      "/webmcp_chrome_ai.js": async () => {
        const webmcpJsPath = `${repoRootDir}/apps/gemini_voice_extension/webmcp_chrome_ai.js`;
        const js = await Bun.file(webmcpJsPath).text();
        return new Response(js, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      },
      "/glic": async () => {
        const glicHtmlPath = `${repoRootDir}/dist/gemini-in-chrome/webui/glic.html`;
        const file = Bun.file(glicHtmlPath);
        if (!(await file.exists())) {
          return new Response("Gemini in Chrome (Glic) not extracted yet", {
            status: 404,
          });
        }
        const rawHtml = await file.text();
        const hydratedHtml = rawHtml
          .replace(
            /href="chrome:\/\/resources\/[^"]+"/g,
            'href="/glic/glic.css"',
          )
          .replace(/href="chrome:\/\/theme\/[^"]+"/g, 'href="/glic/glic.css"')
          .replace('href="glic.css"', 'href="/glic/glic.css"')
          .replace('src="glic.js"', 'src="/webmcp_chrome_ai.js"')
          .replace(/src="glic_logo\.svg"/g, 'src="/glic/glic_logo.svg"')
          .replace(
            '<div id="glic-app-container" hidden>',
            '<div id="glic-app-container">',
          )
          .replace(
            '<section hidden class="panel" id="guestPanel">',
            '<section class="panel show-header" id="guestPanel">',
          )
          .replace(
            '<div id="webviewContainer"></div>',
            '<div id="webviewContainer"><iframe src="/voice" title="Gemini in Chrome Live Host" style="width:100%;height:100%;border:0;"></iframe></div>',
          );
        return new Response(hydratedHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      "/glic/:asset": async (req: Request & { params: { asset: string } }) => {
        const rawAsset = req.params.asset ?? "glic_logo.svg";
        const safeAsset = rawAsset.replace(/[^a-zA-Z0-9._-]/g, "");
        const assetPath = `${repoRootDir}/dist/gemini-in-chrome/webui/${safeAsset}`;
        const f = Bun.file(assetPath);
        if (!(await f.exists())) {
          return new Response("Not Found", { status: 404 });
        }
        const contentType = safeAsset.endsWith(".svg")
          ? "image/svg+xml"
          : safeAsset.endsWith(".css")
            ? "text/css; charset=utf-8"
            : safeAsset.endsWith(".html")
              ? "text/html; charset=utf-8"
              : "application/javascript; charset=utf-8";
        return new Response(await f.bytes(), {
          headers: { "content-type": contentType },
        });
      },
      "/api/chrome/glic": {
        GET: async () => {
          const manifestPath = `${repoRootDir}/dist/gemini-in-chrome/gemini-in-chrome-manifest.json`;
          const mf = Bun.file(manifestPath);
          const manifest = (await mf.exists())
            ? ((await mf.json()) as Record<string, unknown>)
            : { ok: false };
          return Response.json(
            {
              ok: true,
              feature: "Gemini in Chrome (Glic) + WebMCP + Built-in AI",
              webMcpStandard:
                "document.modelContext.registerTool (Chromium 150+)",
              imperativeTools: [
                "get_realtime_clock_and_date",
                "speak_with_gemini_live",
                "read_pc_filesystem",
                "execute_pc_command",
                "run_chrome_builtin_ai",
                "inspect_gemini_in_chrome_glic",
              ],
              declarativeFormTool: "send_voice_prompt_to_gemini",
              builtinAiApis: [
                "LanguageModel",
                "Summarizer",
                "Translator",
                "LanguageDetector",
                "Writer",
                "Rewriter",
                "Proofreader",
              ],
              win32GoogleApps: [
                "GoogleGeminiWin32.exe",
                "GeminiInChromeGlicWin32.exe",
                "GoogleAIStudioWin32.exe",
                "GoogleAntigravityWin32.exe",
                "GoogleNotebookLMWin32.exe",
                "YouTubeMusicWin32.exe",
                "GoogleDocsWin32.exe",
                "GoogleDriveWin32.exe",
                "GoogleGmailWin32.exe",
              ],
              glicExtraction: manifest,
            },
            { headers: CORS_HEADERS },
          );
        },
      },
      "/api/audio/hardware": {
        GET: async () => {
          let bridgeHardware: Record<string, unknown> = {};
          let settings: Record<string, unknown> = {};
          const settingsPath = `${repoRootDir}/config/audio_and_surfaces.json`;
          try {
            const sf = Bun.file(settingsPath);
            if (await sf.exists()) {
              settings = (await sf.json()) as Record<string, unknown>;
            }
          } catch {}
          try {
            const res = await fetch(
              "http://127.0.0.1:8765/api/audio/hardware",
              {
                signal: AbortSignal.timeout(1200),
              },
            );
            if (res.ok) {
              const data = (await res.json()) as {
                hardware_audio?: Record<string, unknown>;
                settings?: Record<string, unknown>;
              };
              bridgeHardware = data.hardware_audio ?? {};
              if (data.settings) {
                settings = data.settings;
              }
            }
          } catch {}

          // Real-time 16kHz PCM16 + 32-band FFT + WAV header verification via bun-media & mediabunny
          const sampleCount = 640; // 40ms @ 16kHz
          const synthSamples = new Int16Array(sampleCount);
          for (let i = 0; i < sampleCount; i++) {
            synthSamples[i] = Math.round(
              Math.sin((2 * Math.PI * 440 * i) / 16000) * 12000,
            );
          }
          const dspFrame = await analyzeNativeSpectrum(synthSamples, 16000, repoRootDir);
          const wavBuf = createWavPcm16Buffer(synthSamples, 16000);
          const wavMeta = parseWavHeader(wavBuf);

          return Response.json({
            ok: true,
            hardware: bridgeHardware,
            settings,
            dspVerification: {
              sampleRateHz: wavMeta.sampleRateHz,
              channels: wavMeta.channels,
              bitsPerSample: wavMeta.bitsPerSample,
              input: "synthetic-test-tone",
              rms: dspFrame?.rms ?? null,
              spectrumBands32Count: dspFrame?.bands.length ?? null,
              nativeDspAvailable: dspFrame !== null,
            },
            vendorEnginesActive: [
              "vendor/flowcat (BidiGenerateContent + StaleAudioLatch)",
              "vendor/voicebox (6 HD Voices Studio)",
              "vendor/locally-uncensored (Faster-Whisper large-v3-turbo + Piper ONNX)",
              "vendor/polaris (Symphonia FLAC/Opus/MP3/WAV)",
              "vendor/bun-video (32-Band FFT + Mediabunny 16kHz WAV)",
              "vendor/audiocraft (MusicGen + Lyria 3.5)",
              "vendor/ytmdesktop (YouTube Music Live Ducking)",
              "vendor/jan (Jan ADK JSONL Stream)",
              "vendor/awesome-rust (WASAPI cpal + Biquad High-Pass DSP)",
              "vendor/openpets (2D/3D glTF .glb + wgpu WGSL)",
              "vendor/mochi-desktop (35+ Animations & 12 Emotes)",
            ],
          });
        },
        POST: async (req: Request) => {
          const body = (await req.json()) as Record<string, unknown>;
          const settingsPath = `${repoRootDir}/config/audio_and_surfaces.json`;
          let settings: Record<string, unknown> = {};
          try {
            const sf = Bun.file(settingsPath);
            if (await sf.exists()) {
              settings = (await sf.json()) as Record<string, unknown>;
            }
          } catch {}
          const audioSec = (settings.audio ?? {}) as Record<string, unknown>;
          if (body.input_device_index !== undefined) {
            audioSec.input_device_index = Number(body.input_device_index);
          }
          if (body.output_device_index !== undefined) {
            audioSec.output_device_index = Number(body.output_device_index);
          }
          if (body.voice_name) {
            const ttsSec = (audioSec.tts ?? {}) as Record<string, unknown>;
            ttsSec.voice_name = String(body.voice_name);
            audioSec.tts = ttsSec;
          }
          if (body.vad_mode) {
            audioSec.vad_mode = String(body.vad_mode);
          }
          settings.audio = audioSec;
          if (body.gemini_web_app && typeof body.gemini_web_app === "object") {
            settings.gemini_web_app = {
              ...(settings.gemini_web_app as Record<string, unknown>),
              ...(body.gemini_web_app as Record<string, unknown>),
            };
          }
          if (body.antigravity && typeof body.antigravity === "object") {
            settings.antigravity = {
              ...(settings.antigravity as Record<string, unknown>),
              ...(body.antigravity as Record<string, unknown>),
            };
          }
          try {
            await Bun.write(settingsPath, JSON.stringify(settings, null, 2));
          } catch {}

          let bridgeData: Record<string, unknown> = {};
          try {
            const res = await fetch(
              "http://127.0.0.1:8765/api/audio/hardware",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(2000),
              },
            );
            if (res.ok) {
              bridgeData = (await res.json()) as Record<string, unknown>;
            }
          } catch {}

          return Response.json(
            {
              ok: true,
              chimePlayed: Boolean(bridgeData.chime_played),
              hardware: bridgeData.hardware_audio ?? {},
              settings: bridgeData.settings ?? settings,
            },
            { headers: CORS_HEADERS },
          );
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/pc/fs": {
        GET: async (req: Request) => {
          const url = new URL(req.url);
          const action = url.searchParams.get("action") || "list";
          const targetPath = url.searchParams.get("path") || undefined;
          const pattern = url.searchParams.get("pattern") || undefined;
          const result = await executePcFilesystemAction({
            action,
            path: targetPath,
            pattern,
          });
          return Response.json(result, { headers: CORS_HEADERS });
        },
        POST: async (req: Request) => {
          const body = (await req.json()) as Record<string, unknown>;
          const result = await executePcFilesystemAction(body);
          return Response.json(result, { headers: CORS_HEADERS });
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/pc/exec": {
        POST: async (req: Request) => {
          const body = (await req.json()) as Record<string, unknown>;
          const result = await executePcCommand(body);
          return Response.json(result, { headers: CORS_HEADERS });
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/antigravity/session": {
        GET: () => {
          return Response.json(
            {
              ok: true,
              session: agySession.getState(),
            },
            { headers: CORS_HEADERS },
          );
        },
        POST: async (req: Request) => {
          const body = (await req.json()) as Record<string, unknown>;
          const action = String(body.action || "turn");
          if (action === "status") {
            return Response.json(
              { ok: true, session: agySession.getState() },
              { headers: CORS_HEADERS },
            );
          }
          if (action === "configure") {
            return Response.json(
              { ok: true, session: agySession.configure(body) },
              { headers: CORS_HEADERS },
            );
          }
          if (action === "compact") {
            const keep =
              typeof body.keepRecentTurns === "number"
                ? body.keepRecentTurns
                : 2;
            const res = await agySession.compactSessionWithFlashLow(keep);
            return Response.json(
              { ok: true, ...res, session: agySession.getState() },
              { headers: CORS_HEADERS },
            );
          }
          const turnRes = await agySession.runTurn(body);
          return Response.json(turnRes, { headers: CORS_HEADERS });
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/antigravity/tools": {
        GET: async () => {
          const ctx = await getLiveClockAndToolsContext();
          return Response.json(
            {
              ok: true,
              status: "ok",
              ...ctx,
            },
            { headers: CORS_HEADERS },
          );
        },
        POST: async (req: Request) => {
          const body = (await req.json()) as Record<string, unknown>;
          const tool = String(body.tool || body.action || "clock");
          const ctx = await getLiveClockAndToolsContext();
          if (tool === "clock" || tool === "datetime" || tool === "time") {
            return Response.json(
              {
                ok: true,
                tool: "clock",
                reply: `Il est exactement ${ctx.time_hm} (${ctx.time_hms}), nous sommes le ${ctx.date_fr}.`,
                ...ctx,
              },
              { headers: CORS_HEADERS },
            );
          }
          if (tool === "pc_fs" || tool === "fs") {
            const res = await executePcFilesystemAction(body);
            return Response.json(res, { headers: CORS_HEADERS });
          }
          if (tool === "pc_exec" || tool === "exec" || tool === "cmd") {
            const res = await executePcCommand(body);
            return Response.json(res, { headers: CORS_HEADERS });
          }
          const turnRes = await agySession.runTurn(body);
          return Response.json(turnRes, { headers: CORS_HEADERS });
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/app/conversations": {
        GET: (req: Request) => {
          const search = (new URL(req.url).searchParams.get("q") ?? "").trim();
          if (search.length > 200) return Response.json({ error: "Recherche limitée à 200 caractères." }, { status: 400 });
          const normalize = (value: string) => value.normalize("NFC").toLocaleLowerCase("fr");
          const needle = normalize(search);
          const rows = db
            .query(
              "SELECT id, title, model_id, is_pinned, created_at, updated_at FROM app_conversations ORDER BY is_pinned DESC, updated_at DESC",
            )
            .all() as Array<{
            id: string;
            title: string;
            model_id: string;
            is_pinned: number;
            created_at: number;
            updated_at: number;
          }>;
          const matchingMessages = new Set<string>();
          if (needle) {
            for (const message of db.query("SELECT conversation_id, content FROM app_messages").iterate() as Iterable<{ conversation_id: string; content: string }>) {
              if (!matchingMessages.has(message.conversation_id) && normalize(message.content).includes(needle)) matchingMessages.add(message.conversation_id);
            }
          }
          return Response.json({
            conversations: rows.filter((r) => !needle || normalize(r.title).includes(needle) || matchingMessages.has(r.id)).map((r) => ({
              ...r,
              is_pinned: Boolean(r.is_pinned),
            })),
          });
        },
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            title?: string;
            model_id?: string;
          };
          const now = Date.now();
          const id = crypto.randomUUID();
          const title = body.title?.trim() || "Nouvelle discussion";
          const modelId = body.model_id || "gemini-3.8-flash";
          db.query(
            "INSERT INTO app_conversations (id, title, model_id, is_pinned, created_at, updated_at) VALUES ($id, $title, $modelId, 0, $now, $now)",
          ).run({
            $id: id,
            $title: title,
            $modelId: modelId,
            $now: now,
          });
          return Response.json({
            conversation: {
              id,
              title,
              model_id: modelId,
              is_pinned: false,
              created_at: now,
              updated_at: now,
            },
          });
        },
      },
      "/api/app/conversations/:id": {
        GET: (req: Request & { params: { id: string } }) => {
          const chatId = req.params.id;
          const conv = db
            .query(
              "SELECT id, title, model_id, is_pinned, created_at, updated_at FROM app_conversations WHERE id = $id",
            )
            .get({ $id: chatId }) as {
            id: string;
            title: string;
            model_id: string;
            is_pinned: number;
            created_at: number;
            updated_at: number;
          } | null;
          if (!conv) {
            return Response.json({ error: "Not found" }, { status: 404 });
          }
          const rawMsgs = db
            .query(
              "SELECT id, role, content, thought_process, citations_json, attachments_json, created_at FROM app_messages WHERE conversation_id = $id ORDER BY created_at ASC",
            )
            .all({ $id: chatId }) as Array<{
            id: string;
            role: string;
            content: string;
            thought_process: string | null;
            citations_json: string;
            attachments_json: string;
            created_at: number;
          }>;
          const messages = rawMsgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            markdown: m.role === "assistant" ? parseMessageMarkdown(m.content) : undefined,
            thought_process: m.thought_process,
            citations: JSON.parse(m.citations_json || "[]"),
            attachments: attachmentsForMessage(m.id, m.attachments_json),
            created_at: m.created_at,
          }));
          return Response.json({
            conversation: {
              ...conv,
              is_pinned: Boolean(conv.is_pinned),
            },
            messages,
          });
        },
        PATCH: async (req: Request & { params: { id: string } }) => {
          const chatId = req.params.id;
          let body: { title?: unknown; is_pinned?: unknown };
          try { body = await req.json() as { title?: unknown; is_pinned?: unknown }; }
          catch { return Response.json({ error: "Requête invalide." }, { status: 400 }); }
          if (!body || typeof body !== "object" || (body.title === undefined && body.is_pinned === undefined) || (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 120)) || (body.is_pinned !== undefined && typeof body.is_pinned !== "boolean")) {
            return Response.json({ error: "Indiquez un titre de 1 à 120 caractères ou un état d'épinglage valide." }, { status: 400 });
          }
          const result = db.query("UPDATE app_conversations SET title = COALESCE($title, title), is_pinned = COALESCE($pin, is_pinned), updated_at = $now WHERE id = $id").run({
            $title: typeof body.title === "string" ? body.title.trim() : null,
            $pin: typeof body.is_pinned === "boolean" ? Number(body.is_pinned) : null,
            $now: Date.now(), $id: chatId,
          });
          if (result.changes === 0) return Response.json({ error: "Discussion introuvable." }, { status: 404 });
          return Response.json({ ok: true });
        },
        DELETE: (req: Request & { params: { id: string } }) => {
          const chatId = req.params.id;
          db.transaction(() => {
            db.query("DELETE FROM app_attachments WHERE message_id IN (SELECT id FROM app_messages WHERE conversation_id = $id)").run({ $id: chatId });
            db.query("DELETE FROM app_messages WHERE conversation_id = $id").run({ $id: chatId });
            db.query("DELETE FROM app_conversations WHERE id = $id").run({ $id: chatId });
          })();
          return Response.json({ ok: true });
        },
      },
      "/api/app/conversations/:id/attachments/:attachmentId": {
        GET: (req: Request & { params: { id: string; attachmentId: string } }) => {
          const file = db.query("SELECT a.name, a.mime_type, a.data FROM app_attachments a JOIN app_messages m ON m.id = a.message_id WHERE a.id = $file AND m.conversation_id = $chat").get({ $file: req.params.attachmentId, $chat: req.params.id }) as { name: string; mime_type: string; data: Uint8Array } | null;
          if (!file) return Response.json({ error: "Fichier introuvable." }, { status: 404 });
          const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
          const name = encodeURIComponent(file.name.toWellFormed()).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
          return new Response(new Uint8Array(file.data).buffer, { headers: {
            "content-type": allowedTypes.includes(file.mime_type) ? file.mime_type : "application/octet-stream",
            "content-disposition": `attachment; filename="attachment"; filename*=UTF-8''${name}`,
            "x-content-type-options": "nosniff", "cache-control": "no-store",
          } });
        },
      },
      "/api/app/conversations/:id/messages": {
        POST: async (req: Request & { params: { id: string } }) => {
          const chatId = req.params.id;
          const body = (await req.json()) as {
            content?: string;
            model?: string;
            attachments?: ChatAttachment[];
          };
          const userContent = body.content?.trim() || "";
          const modelId = body.model || "gemini-3.8-flash";
          if (!db.query("SELECT id FROM app_conversations WHERE id = $id").get({ $id: chatId })) {
            return Response.json({ error: "Discussion introuvable" }, { status: 404 });
          }
          if (!userContent) return Response.json({ error: "Saisissez un message" }, { status: 400 });
          let attachments: ChatAttachment[];
          try { attachments = validateChatAttachments(body.attachments); }
          catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Fichier invalide." }, { status: 400 }); }
          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY;
          if (!apiKey) return Response.json({ error: "Configurez GEMINI_API_KEY ou GOOGLE_API_KEY" }, { status: 503 });
          const history = db.query("SELECT id, role, content FROM app_messages WHERE conversation_id = $id ORDER BY created_at ASC").all({ $id: chatId }) as Array<{ id: string; role: string; content: string }>;
          let assistantContent: string;
          try {
            const ai = new GoogleGenAI({ apiKey, vertexai: false });
            const response = await ai.models.generateContent({
              model: modelId,
              contents: [...history.filter((message) => message.role === "user" || message.role === "assistant").map((message) => {
                const files = db.query("SELECT mime_type, data FROM app_attachments WHERE message_id = $id ORDER BY rowid").all({ $id: message.id }) as Array<{ mime_type: string; data: Uint8Array }>;
                return { role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }, ...files.map((file) => ({ inlineData: { mimeType: file.mime_type, data: Buffer.from(file.data).toString("base64") } }))] };
              }), { role: "user", parts: [{ text: userContent }, ...attachments.map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.data } }))] }],
            });
            assistantContent = response.text?.trim() ?? "";
            if (!assistantContent) throw new Error("Empty response");
          } catch {
            return Response.json({ error: "Impossible d'obtenir une réponse du modèle. Vérifiez sa disponibilité et votre configuration." }, { status: 502 });
          }
          const now = Date.now();
          const userMsgId = crypto.randomUUID();

          const assistantNow = Date.now() + 1;
          const assistantMsgId = crypto.randomUUID();
          const saved = db.transaction(() => {
          if (!db.query("SELECT id FROM app_conversations WHERE id = $id").get({ $id: chatId })) return false;
          db.query(
            "INSERT INTO app_messages (id, conversation_id, role, content, thought_process, citations_json, attachments_json, created_at) VALUES ($id, $chatId, 'user', $content, NULL, '[]', $att, $now)",
          ).run({
            $id: userMsgId,
            $chatId: chatId,
            $content: userContent,
            $att: JSON.stringify(attachments.map(({ name, mimeType, data }) => ({ name, mimeType, sizeBytes: Buffer.from(data, "base64").length }))),
            $now: now,
          });
          for (const file of attachments) {
            db.query("INSERT INTO app_attachments (id, message_id, name, mime_type, data) VALUES ($id, $message, $name, $type, $data)").run({ $id: crypto.randomUUID(), $message: userMsgId, $name: file.name, $type: file.mimeType, $data: Buffer.from(file.data, "base64") });
          }

          const thoughtProcess = null;
          const citations: never[] = [];

          db.query(
            "INSERT INTO app_messages (id, conversation_id, role, content, thought_process, citations_json, attachments_json, created_at) VALUES ($id, $chatId, 'assistant', $content, $thought, $cit, '[]', $now)",
          ).run({
            $id: assistantMsgId,
            $chatId: chatId,
            $content: assistantContent,
            $thought: thoughtProcess,
            $cit: JSON.stringify(citations),
            $now: assistantNow,
          });

          db.query(
            "UPDATE app_conversations SET updated_at = $now, model_id = $model WHERE id = $id",
          ).run({
            $now: assistantNow,
            $model: modelId,
            $id: chatId,
          });
          return true;
          })();
          if (!saved) return Response.json({ error: "Discussion introuvable" }, { status: 404 });

          const rawMsgs = db
            .query(
              "SELECT id, role, content, thought_process, citations_json, attachments_json, created_at FROM app_messages WHERE conversation_id = $id ORDER BY created_at ASC",
            )
            .all({ $id: chatId }) as Array<{
            id: string;
            role: string;
            content: string;
            thought_process: string | null;
            citations_json: string;
            attachments_json: string;
            created_at: number;
          }>;

          return Response.json({
            messages: rawMsgs.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              markdown: m.role === "assistant" ? parseMessageMarkdown(m.content) : undefined,
              thought_process: m.thought_process,
              citations: JSON.parse(m.citations_json || "[]"),
              attachments: attachmentsForMessage(m.id, m.attachments_json),
              created_at: m.created_at,
            })),
          });
        },
      },
      "/assets/openpets/gemini-pet-spritesheet.svg": () => {
        const dynamicSvg = generateGeminiPetSvgSpritesheet(
          petManager.getSnapshot().customStyle,
        );
        return new Response(dynamicSvg, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "no-cache",
          },
        });
      },
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
          Response.json(
            {
              pet: persistPetSnapshot(false),
              characters: GEMINI_PET_CHARACTERS,
              mochiEmotes: MOCHI_EMOTE_CATALOGUE,
              leases: petManager.leaseManager.list(),
            },
            { headers: CORS_HEADERS },
          ),
      },
      "/api/pet/customize": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            petId?: "gemini-sparkle" | "hoodie-cat" | "mochi";
            outfitId?: string;
            autoScheduleOutfit?: boolean;
            reaction?: OpenPetsReaction;
            emoteId?: string;
            mochiAnimation?: string;
            speechText?: string;
            text?: string;
            gravityEnabled?: boolean;
            position?: { x: number; y: number };
            customStyle?: Partial<GeminiPetCustomStyle>;
            choreography?: GeminiPetChoreographyStep[];
          };
          petManager.customizeAndAnimate({
            petId: body.petId,
            outfitId: body.outfitId,
            autoScheduleOutfit: body.autoScheduleOutfit,
            reaction: isAllowedReaction(body.reaction)
              ? body.reaction
              : undefined,
            emoteId: body.emoteId,
            mochiAnimation: body.mochiAnimation,
            speechText: body.speechText ?? body.text,
            gravityEnabled: body.gravityEnabled,
            position: body.position,
            customStyle: body.customStyle,
            choreography: body.choreography,
          });
          const snap = persistPetSnapshot(true);
          if (
            Array.isArray(body.choreography) &&
            body.choreography.length > 0
          ) {
            runChoreographySteps(body.choreography);
          }
          return Response.json(
            {
              ok: true,
              pet: snap,
              characters: GEMINI_PET_CHARACTERS,
              mochiEmotes: MOCHI_EMOTE_CATALOGUE,
            },
            { headers: CORS_HEADERS },
          );
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/pet/action": {
        POST: async (req: Request) => {
          const body = (await req.json()) as {
            action?: string;
            reaction?: string;
            text?: string;
            speechText?: string;
            petId?: "gemini-sparkle" | "hoodie-cat" | "mochi";
            outfitId?: string;
            autoSchedule?: boolean;
            autoScheduleOutfit?: boolean;
            gravityEnabled?: boolean;
            position?: { x: number; y: number };
            emoteId?: string;
            mochiAnimation?: string;
            customStyle?: Partial<GeminiPetCustomStyle>;
            choreography?: GeminiPetChoreographyStep[];
            focusMinutes?: number;
            breakMinutes?: number;
            cycles?: number;
            completed?: boolean;
            pocketKind?: MochiPocketKind;
            pocketValue?: string;
            pocketTitle?: string;
            pocketId?: string;
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
                petManager.react(body.reaction, body.text ?? body.speechText);
              }
              break;
            case "say":
              if (body.text ?? body.speechText) {
                petManager.say((body.text ?? body.speechText) as string);
              }
              break;
            case "switchPet":
            case "switch-character":
              if (
                body.petId === "gemini-sparkle" ||
                body.petId === "hoodie-cat" ||
                body.petId === "mochi"
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
            case "mochi-emote":
              if (body.emoteId) {
                petManager.triggerMochiEmote(body.emoteId);
              }
              break;
            case "customize":
            case "animate":
            case "choreography":
              petManager.customizeAndAnimate({
                petId: body.petId,
                outfitId: body.outfitId,
                autoScheduleOutfit:
                  body.autoScheduleOutfit ?? body.autoSchedule,
                reaction: isAllowedReaction(body.reaction)
                  ? body.reaction
                  : undefined,
                emoteId: body.emoteId,
                mochiAnimation: body.mochiAnimation,
                speechText: body.speechText ?? body.text,
                gravityEnabled: body.gravityEnabled,
                position: body.position,
                customStyle: body.customStyle,
                choreography: body.choreography,
              });
              if (
                Array.isArray(body.choreography) &&
                body.choreography.length > 0
              ) {
                runChoreographySteps(body.choreography);
              }
              break;
            case "mochi-focus-start":
              petManager.startMochiFocus(
                body.focusMinutes ?? 25,
                body.breakMinutes ?? 5,
                body.cycles ?? 1,
              );
              break;
            case "mochi-focus-stop":
              petManager.stopMochiFocus(Boolean(body.completed));
              break;
            case "mochi-pocket-add":
              if (body.pocketValue) {
                petManager.addMochiPocketItem(
                  body.pocketKind ?? "text",
                  body.pocketValue,
                  body.pocketTitle,
                );
              }
              break;
            case "mochi-pocket-remove":
              if (body.pocketId) {
                petManager.removeMochiPocketItem(body.pocketId);
              }
              break;
            case "mochi-pocket-clear":
              petManager.clearMochiPocket();
              break;
            default:
              if (
                body.customStyle ||
                body.choreography ||
                body.petId ||
                body.reaction ||
                body.emoteId ||
                body.mochiAnimation
              ) {
                petManager.customizeAndAnimate({
                  petId: body.petId,
                  outfitId: body.outfitId,
                  reaction: isAllowedReaction(body.reaction)
                    ? body.reaction
                    : undefined,
                  emoteId: body.emoteId,
                  mochiAnimation: body.mochiAnimation,
                  speechText: body.speechText ?? body.text,
                  gravityEnabled: body.gravityEnabled,
                  position: body.position,
                  customStyle: body.customStyle,
                  choreography: body.choreography,
                });
                if (
                  Array.isArray(body.choreography) &&
                  body.choreography.length > 0
                ) {
                  runChoreographySteps(body.choreography);
                }
              }
              break;
          }
          return Response.json(
            {
              ok: true,
              leveledUp,
              pet: persistPetSnapshot(true),
              characters: GEMINI_PET_CHARACTERS,
              mochiEmotes: MOCHI_EMOTE_CATALOGUE,
            },
            { headers: CORS_HEADERS },
          );
        },
        OPTIONS: () =>
          new Response(null, { status: 204, headers: CORS_HEADERS }),
      },
      "/api/pet/3d/glb": {
        GET: async (req: Request) => {
          const url = new URL(req.url);
          const spriteParam =
            url.searchParams.get("sprite") ?? "mochi/master/mochi_default.png";
          const depth = Number(url.searchParams.get("depth") ?? 0.16);
          const sampleStep = Number(url.searchParams.get("step") ?? 6);
          const format = url.searchParams.get("format") ?? "json";

          const resolvedPath =
            spriteParam === "hoodie-cat"
              ? `${openPetsAssetsDir}/default-pet-thumbnail.png`
              : `${mochiAssetsDir}/${spriteParam.replace(/\.\./g, "").replace(/^\/+/, "")}`;

          const pngBytes = await Bun.file(resolvedPath).bytes();
          const { width, height, mesh, glbBytes } = convertPngToGlb(pngBytes, {
            depth,
            alphaThreshold: 24,
            sampleStep,
          });

          if (format === "binary") {
            const safeBytes = new Uint8Array(glbBytes);
            return new Response(safeBytes.buffer, {
              headers: {
                "content-type": "model/gltf-binary",
                "content-disposition":
                  'attachment; filename="openpets-companion-3d.glb"',
              },
            });
          }

          return Response.json({
            ok: true,
            sprite: spriteParam,
            width,
            height,
            voxelCount: mesh.voxelCount,
            vertexCount: mesh.vertexCount,
            triangleCount: mesh.triangleCount,
            glbByteLength: glbBytes.byteLength,
            glbBase64: Buffer.from(glbBytes).toString("base64"),
            wgpuShaderWgsl: OPENPETS_3D_WGPU_SHADER_WGSL,
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
          let streamClosed = false;

          const snap = petManager.getSnapshot();
          const petPersona =
            snap.activePetId === "gemini-sparkle"
              ? "Tu es Gemini Sparkle Pet ✦, le compagnon virtuel officiel de la Super App Gemini Live. Réponds en français avec enthousiasme en 1 ou 2 phrases courtes."
              : snap.activePetId === "mochi"
                ? "Tu es Mochi 🌱, l'adorable petit compagnon pixel-art multiplateforme (Windows/macOS/Linux) de la Super App Gemini Live. Réponds en français avec douceur et bonne humeur en 1 ou 2 phrases courtes."
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
              onclose() { streamClosed = true; },
              onerror() { streamClosed = true; },
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
          while (!turnDone && !streamClosed && Date.now() - started < 20000) {
            await Bun.sleep(80);
          }
          session.close();

          if (!turnDone || pcm24kChunks.length === 0) {
            petManager.react("idle");
            persistPetSnapshot();
            return Response.json({ error: turnDone ? "Gemini Live a terminé sans audio." : streamClosed ? "La connexion Gemini Live a été interrompue." : "Délai dépassé avant la fin de la réponse Gemini Live." }, { status: 502 });
          }

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
          const spectrum = await analyzeNativeSpectrum(samples24k, 24000, repoRootDir);
          const wavBuffer = createWavPcm16Buffer(samples24k, 24000, 1);
          const wavBase64 = Buffer.from(wavBuffer).toString("base64");

          const spokenBubble = outputTranscript.trim();
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
            orb_spectrum: spectrum,
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
          let streamClosed = false;

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
              onclose() { streamClosed = true; },
              onerror() { streamClosed = true; },
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
          while (!turnDone && !streamClosed && Date.now() - started < 20000) {
            await Bun.sleep(80);
          }
          session.close();

          if (!turnDone || pcm24kChunks.length === 0) {
            return Response.json({ error: turnDone ? "Gemini Live a terminé sans audio." : streamClosed ? "La connexion Gemini Live a été interrompue." : "Délai dépassé avant la fin de la réponse Gemini Live." }, { status: 502 });
          }

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
          const spectrum = await analyzeNativeSpectrum(samples24k, 24000, repoRootDir);
          const wavBuffer = createWavPcm16Buffer(samples24k, 24000, 1);
          const wavBase64 = Buffer.from(wavBuffer).toString("base64");

          return Response.json({
            model,
            voice: voiceName,
            input_transcript: inputTranscript.trim(),
            output_transcript: outputTranscript.trim(),
            audio_chunks_count: pcm24kChunks.length,
            pcm24k_bytes_len: mergedPcmBytes.byteLength,
            wav_base64: wavBase64,
            orb_spectrum: spectrum,
          });
        },
      },
      "/api/gemini-windows/status": async () => {
        try {
          const direct = await fetch("http://127.0.0.1:8789/api/status", {
            signal: AbortSignal.timeout(1200),
          });
          if (direct.ok) {
            const state = await direct.json();
            return Response.json({
              status: "ok",
              direct_connected: true,
              direct_url: "http://127.0.0.1:8789",
              gemini_windows_state: state,
            });
          }
        } catch {}
        try {
          const r = await fetch(
            "http://127.0.0.1:8765/api/gemini-windows/status",
            { signal: AbortSignal.timeout(1500) },
          );
          if (r.ok) {
            return Response.json(await r.json());
          }
        } catch {}
        return Response.json({
          status: "offline",
          direct_connected: false,
          direct_url: "http://127.0.0.1:8789",
        });
      },
      "/api/gemini-windows/pilot": {
        POST: async (req: Request) => {
          const raw = await req.text();
          const body = JSON.parse(raw || "{}") as {
            command?: string;
            prompt?: string;
            text?: string;
            launch?: boolean;
          };
          try {
            const direct = await fetch("http://127.0.0.1:8789/api/pilot", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: raw,
              signal: AbortSignal.timeout(1500),
            });
            if (direct.ok) {
              const directData = await direct.json();
              return Response.json({
                status: "ok",
                command: body.command ?? "status",
                direct_connected: true,
                direct_url: "http://127.0.0.1:8789",
                direct_result: directData,
                gemini_windows_state: directData.state ?? directData,
              });
            }
          } catch {}
          try {
            const r = await fetch(
              "http://127.0.0.1:8765/api/gemini-windows/pilot",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: raw,
                signal: AbortSignal.timeout(7500),
              },
            );
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          const geminiExe =
            "C:\\Users\\aphro\\AppData\\Local\\Google\\Gemini\\app-1.17.0\\Gemini.exe";
          if (await Bun.file(geminiExe).exists()) {
            const args = [geminiExe];
            if (
              body.command === "stc_trigger" ||
              body.command === "start_dictation"
            ) {
              args.push("--start-dictation");
            }
            Bun.spawn(args, {
              stdout: "ignore",
              stderr: "ignore",
              env: {
                ...Bun.env,
                GEMINI_ENABLE_SPEAK_TO_WINDOW: "true",
                ANTIGRAVITY_MIC: "127.0.0.1:24713",
              },
            });
            return Response.json({
              status: "ok",
              command: body.command ?? "launch",
              launched: true,
              gemini_exe: geminiExe,
            });
          }
          return Response.json(
            { status: "unavailable", gemini_exe: geminiExe },
            { status: 404 },
          );
        },
      },
      "/api/agy/status": async () => {
        try {
          const r = await fetch("http://127.0.0.1:8765/api/agy/status", {
            signal: AbortSignal.timeout(1500),
          });
          if (r.ok) {
            return Response.json(await r.json());
          }
        } catch {}
        const agyExe = "C:\\Users\\aphro\\AppData\\Local\\agy\\bin\\agy.exe";
        return Response.json({
          status: "ok",
          exe: agyExe,
          exists: await Bun.file(agyExe).exists(),
          antigravity_mic_addr: "127.0.0.1:24713",
          models: [
            "gemini-4-argon-medium",
            "gemini-4-argon-high",
            "gemini-4-argon-low",
            "gemini-3.8-flash-high",
            "gemini-3.8-flash-medium",
            "gemini-3.8-flash-low",
          ],
        });
      },
      "/api/agy/cli": {
        POST: async (req: Request) => {
          const raw = await req.text();
          try {
            const r = await fetch("http://127.0.0.1:8765/api/agy/cli", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: raw,
              signal: AbortSignal.timeout(15000),
            });
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          const body = JSON.parse(raw || "{}") as {
            action?: string;
            prompt?: string;
            text?: string;
            model?: string;
            conversation_id?: string;
          };
          const agyExe = "C:\\Users\\aphro\\AppData\\Local\\agy\\bin\\agy.exe";
          const prompt = (body.prompt ?? body.text ?? "").trim();
          const model = (body.model ?? "gemini-3.8-flash-low").trim();
          if (body.action === "agentapi") {
            const args = body.conversation_id
              ? [
                  agyExe,
                  "agentapi",
                  "send-message",
                  body.conversation_id,
                  prompt,
                ]
              : [
                  agyExe,
                  "agentapi",
                  "new-conversation",
                  "--title=Gemini Live Voice",
                  prompt,
                ];
            const proc = Bun.spawn(args, {
              stdout: "pipe",
              stderr: "pipe",
              env: { ...Bun.env, ANTIGRAVITY_MIC: "127.0.0.1:24713" },
            });
            const stdout = (await new Response(proc.stdout).text()).trim();
            const stderr = (await new Response(proc.stderr).text()).trim();
            const exitCode = await proc.exited;
            return Response.json({
              status: exitCode === 0 ? "ok" : "error",
              returncode: exitCode,
              stdout,
              stderr,
            });
          }
          const t0 = performance.now();
          const proc = Bun.spawn(
            [
              agyExe,
              "--model",
              model,
              "--disable-slash-commands",
              `--print=${prompt}`,
            ],
            {
              stdout: "pipe",
              stderr: "pipe",
              env: { ...Bun.env, ANTIGRAVITY_MIC: "127.0.0.1:24713" },
            },
          );
          const reply = (await new Response(proc.stdout).text()).trim();
          await proc.exited;
          return Response.json({
            status: reply ? "ok" : "empty",
            prompt,
            reply_text: reply,
            model: `agy-cli (${model})`,
            latency_ms: Math.round(performance.now() - t0),
          });
        },
      },
      "/mcp": {
        GET: async () => {
          try {
            const r = await fetch("http://127.0.0.1:8789/mcp", {
              signal: AbortSignal.timeout(2500),
            });
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          return Response.json({
            status: "ok",
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "gemini-app-runtime",
              version: "2026.11.2",
              description:
                "Gemini Web App & Windows Native Runtime MCP Server (Super App Bridge)",
            },
          });
        },
        POST: async (req: Request) => {
          const raw = await req.text();
          try {
            const r = await fetch("http://127.0.0.1:8789/mcp", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: raw,
              signal: AbortSignal.timeout(45000),
            });
            if (r.status === 202) {
              return new Response(null, { status: 202 });
            }
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          return Response.json(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32000,
                message: "Gemini.exe native MCP server (:8789) is starting up.",
              },
            },
            { status: 503 },
          );
        },
      },
      "/api/runtime/status": async () => {
        try {
          const r = await fetch("http://127.0.0.1:8789/api/runtime/status", {
            signal: AbortSignal.timeout(2500),
          });
          if (r.ok) {
            return Response.json(await r.json());
          }
        } catch {}
        return Response.json({
          status: "fallback_super_app",
          runtime: "gemini-app-runtime",
          version: "2026.11.2",
        });
      },
      "/api/runtime/tools": async () => {
        try {
          const r = await fetch("http://127.0.0.1:8789/api/runtime/tools", {
            signal: AbortSignal.timeout(2500),
          });
          if (r.ok) {
            return Response.json(await r.json());
          }
        } catch {}
        return Response.json({ status: "offline", catalog: [] });
      },
      "/api/runtime/memory": async () => {
        try {
          const r = await fetch("http://127.0.0.1:8789/api/runtime/memory", {
            signal: AbortSignal.timeout(2500),
          });
          if (r.ok) {
            return Response.json(await r.json());
          }
        } catch {}
        const memFile = Bun.file(
          "C:/Users/aphro/google/config/gemini_web_memory.json",
        );
        if (await memFile.exists()) {
          return Response.json({
            status: "ok",
            memory: await memFile.json(),
          });
        }
        return Response.json({ status: "empty", memory: {} });
      },
      "/api/runtime/memory/import": {
        POST: async (req: Request) => {
          const raw = await req.text();
          try {
            const r = await fetch(
              "http://127.0.0.1:8789/api/runtime/memory/import",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: raw,
                signal: AbortSignal.timeout(25000),
              },
            );
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          return Response.json({
            status: "offline",
            message: "Gemini.exe (:8789) offline",
          });
        },
      },
      "/api/runtime/memory/save": {
        POST: async (req: Request) => {
          const raw = await req.text();
          try {
            const r = await fetch(
              "http://127.0.0.1:8789/api/runtime/memory/save",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: raw,
                signal: AbortSignal.timeout(15000),
              },
            );
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          return Response.json({
            status: "offline",
            message: "Gemini.exe (:8789) offline",
          });
        },
      },
      "/api/runtime/execute": {
        POST: async (req: Request) => {
          const raw = await req.text();
          try {
            const r = await fetch("http://127.0.0.1:8789/api/runtime/execute", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: raw,
              signal: AbortSignal.timeout(45000),
            });
            if (r.ok) {
              return Response.json(await r.json());
            }
          } catch {}
          return Response.json({
            status: "offline",
            message: "Gemini.exe (:8789) offline",
          });
        },
      },
      "/api/status": async () => {
        try {
          const r = await fetch("http://127.0.0.1:8765/api/status", {
            signal: AbortSignal.timeout(1500),
          });
          if (r.ok) {
            return Response.json(await r.json());
          }
        } catch {}
        return Response.json({
          status: "ok",
          service: "gemini-super-app",
          state: "IDLE",
          is_live_active: false,
          models: {
            live: GEMINI_LIVE_MODEL,
            deepReasoning: GEMINI_DEEP_REASONING_MODEL,
            tts: GEMINI_TTS_MODEL,
          },
        });
      },
      "/api/voice": {
        POST: async (req: Request) => {
          const rawBody = await req.text();
          let parsed: { action?: string; enabled?: boolean; text?: string; pcm16_base64?: string; surface?: string };
          try { parsed = JSON.parse(rawBody || "{}"); }
          catch { return Response.json({ error: "Requête vocale invalide." }, { status: 400 }); }
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Response.json({ error: "Requête vocale invalide." }, { status: 400 });
          if (parsed.action === "toggle_live" && parsed.enabled === true && parsed.surface === "windows_live_wallpaper") {
            try {
              const hardwareResponse = await fetch("http://127.0.0.1:8765/api/audio/hardware", { signal: AbortSignal.timeout(2500) });
              if (!hardwareResponse.ok) throw new Error();
              const hardware = await hardwareResponse.json() as { hardware_audio?: { mic_stream_active?: boolean } };
              if (hardware.hardware_audio?.mic_stream_active !== true) return Response.json({ error: "Aucun flux microphone actif dans le service vocal." }, { status: 409 });
            } catch { return Response.json({ error: "Impossible de vérifier le microphone du service vocal." }, { status: 503 }); }
          }
          try {
            const r = await fetch("http://127.0.0.1:8765/api/voice", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: rawBody,
              signal: AbortSignal.timeout(9500),
            });
            if (r.ok) {
              return Response.json(await r.json());
            }
            if (parsed.action === "toggle_live" || parsed.pcm16_base64) return Response.json({ error: "Le service vocal a refusé la demande." }, { status: 502 });
          } catch {}
          if (parsed.action === "toggle_live") {
            return Response.json({ error: "Service vocal indisponible ; l'écoute n'a pas été activée." }, { status: 503 });
          }
          if (parsed.pcm16_base64) return Response.json({ error: "Service vocal indisponible ; l'audio n'a pas été traité." }, { status: 503 });
          if (typeof parsed.text !== "string" || !parsed.text.trim()) return Response.json({ error: "Saisissez un texte ou connectez le service vocal." }, { status: 400 });
          const apiKey = Bun.env.GEMINI_API_KEY ?? Bun.env.GOOGLE_API_KEY ?? "";
          const ai = new GoogleGenAI({ apiKey, vertexai: false });
          const liveCtx = await getLiveClockAndToolsContext();
          const promptText = parsed.text.trim();
          const resp = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `${liveCtx.system_prompt_block}\nTu es Gemini Live en full-duplex simultané zéro latence. Réponds naturellement à l'oral en 1 à 2 phrases courtes sans markdown : ${promptText}`,
          });
          const replyText = resp.text?.trim();
          if (!replyText) return Response.json({ error: "Gemini n'a fourni aucune réponse." }, { status: 502 });
          const ttsResp = await ai.models.generateContent({
            model: GEMINI_TTS_MODEL,
            contents: replyText,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Aoede" },
                },
              },
            },
          });
          const audioB64 =
            ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
            "";
          if (!audioB64) return Response.json({ error: "Gemini n'a fourni aucun audio." }, { status: 502 });
          return Response.json({
            status: "ok",
            transcript: promptText,
            reply_text: replyText,
            audio_base64: audioB64,
            mime_type: ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType ?? "audio/pcm;rate=24000",
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
            "vendor/mochi-desktop",
          ],
        }),
      "/api/voicebox/project": () => Response.json(studioProject),
      "/api/ytm/pair/:step": {
        POST: async (req: Request & { params: { step: string } }) => {
          const address = serverRef?.requestIP(req)?.address;
          const origin = req.headers.get("origin");
          const url = new URL(req.url);
          if (!address || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || origin !== url.origin || req.headers.get("content-type") !== "application/json") {
            return Response.json({ error: "Association réservée à l'interface locale." }, { status: 403 });
          }
          try {
            if (req.params.step === "start") return Response.json({ code: await ytm.beginPairing() });
            if (req.params.step === "complete") return Response.json({ ok: true, ...(await ytm.completePairing()) });
            return Response.json({ error: "Étape inconnue." }, { status: 404 });
          } catch (error) {
            return Response.json({ error: error instanceof YtmCompanionError ? error.message : "Association impossible." }, { status: error instanceof YtmCompanionError ? error.status : 502 });
          }
        },
      },
      "/api/ytm/state": {
        GET: async () => {
          try {
            return Response.json({ state: await ytm.getCurrentState() });
          } catch (error) {
            return Response.json({ error: error instanceof YtmCompanionError ? error.message : "Lecture de l'état impossible." }, { status: error instanceof YtmCompanionError ? error.status : 502 });
          }
        },
        POST: async (req: Request) => {
          try {
            const body = (await req.json()) as YtmCommandPayload;
            await ytm.sendCommand(body);
            return Response.json({ ok: true });
          } catch (error) {
            return Response.json({ error: error instanceof YtmCompanionError ? error.message : "Commande de lecture impossible." }, { status: error instanceof YtmCompanionError ? error.status : 502 });
          }
        },
      },
      "/api/audiocraft/generate": {
        POST: async (req: Request) => {
          let body: Partial<MusicGenRequest>;
          try { body = await req.json() as Partial<MusicGenRequest>; }
          catch { return Response.json({ error: "Requête invalide." }, { status: 400 }); }
          const validation = validateMusicGenRequest(body);
          if (validation) return Response.json({ error: validation }, { status: 400 });
          if ([...musicJobs.values()].some((job) => job.status === "running")) return Response.json({ error: "Une génération est déjà en cours." }, { status: 409 });
          if (musicJobs.size >= 50) return Response.json({ error: "La limite de générations de cette session est atteinte." }, { status: 429 });
          const id = crypto.randomUUID();
          const output = `${Bun.env.TEMP ?? Bun.env.TMPDIR ?? "."}/gemini-music-${id}.wav`;
          const job: { status: "running" | "complete" | "failed"; output: string; error?: string } = { status: "running", output };
          musicJobs.set(id, job);
          void generateMusicGen(body as MusicGenRequest, output, `${srcDir}/../../../backend/musicgen_generate.py`).then(async () => {
            const file = Bun.file(output);
            if (file.size > 16 * 1024 * 1024) throw new Error("Le fichier audio généré dépasse 16 Mo.");
            try { analyzeWavPcm16(await file.bytes()); }
            catch { throw new Error("Le fichier audio généré est invalide ou incomplet."); }
            job.status = "complete";
          }).catch(async (error: unknown) => {
            job.status = "failed";
            job.error = error instanceof Error ? error.message : "La génération a échoué.";
            try { await Bun.file(output).delete(); } catch { /* No output or cleanup unavailable. */ }
          });
          return Response.json({ id, status: job.status }, { status: 202 });
        },
      },
      "/api/audiocraft/jobs/:id": (req: Request & { params: { id: string } }) => {
        const job = musicJobs.get(req.params.id);
        if (!job) return Response.json({ error: "Génération introuvable." }, { status: 404 });
        return Response.json({ id: req.params.id, status: job.status, error: job.error });
      },
      "/api/audiocraft/jobs/:id/audio": (req: Request & { params: { id: string } }) => {
        const job = musicJobs.get(req.params.id);
        if (!job || job.status !== "complete") return Response.json({ error: "Audio indisponible." }, { status: 404 });
        return new Response(Bun.file(job.output), { headers: { "content-type": "audio/wav", "content-disposition": `attachment; filename="musicgen-${req.params.id}.wav"` } });
      },
      "/api/media/analyze": {
        POST: async (req: Request) => {
          const limit = 16 * 1024 * 1024;
          if (Number(req.headers.get("content-length")) > limit) return Response.json({ error: "Fichier limité à 16 Mo." }, { status: 413 });
          if (!req.body) return Response.json({ error: "Sélectionnez un fichier WAV." }, { status: 400 });
          const reader = req.body.getReader();
          const chunks: Uint8Array[] = [];
          let size = 0;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.length;
              if (size > limit) { await reader.cancel(); return Response.json({ error: "Fichier limité à 16 Mo." }, { status: 413 }); }
              chunks.push(value);
            }
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
            return Response.json(analyzeWavPcm16(bytes));
          } catch (error) {
            return Response.json({ error: error instanceof Error ? error.message : "Analyse impossible." }, { status: 400 });
          }
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
    }, req => allowsLocalRequest(req, serverRef?.requestIP(req) ?? null, Bun.env.SUPER_APP_ALLOWED_ORIGINS)),
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname.startsWith("/assets/mochi/")) {
        const relPath = url.pathname
          .slice("/assets/mochi/".length)
          .replace(/\.\./g, "")
          .replace(/^\/+/, "");
        const fullPath = `${mochiAssetsDir}/${relPath}`;
        const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
        const contentType =
          ext === "png"
            ? "image/png"
            : ext === "json"
              ? "application/json; charset=utf-8"
              : ext === "ogg"
                ? "audio/ogg"
                : ext === "wav"
                  ? "audio/wav"
                  : "application/octet-stream";
        return new Response(Bun.file(fullPath), {
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=3600",
          },
        });
      }
      if (url.pathname === "/ws") {
        if (!allowsLocalRequest(req, srv.requestIP(req), Bun.env.SUPER_APP_ALLOWED_ORIGINS)) {
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
        ws.subscribe("super-app-live");
        insertSessionStmt.run({
          $id: ws.data.clientId,
          $surface: ws.data.surface,
          $model: GEMINI_LIVE_MODEL,
          $createdAt: Date.now(),
        });
        const welcome = createSpectrumFrame(
          Array.from({ length: 32 }, () => 0),
          0,
          false,
        );
        ws.send(serializeHubMessage(welcome));
        ws.send(
          JSON.stringify({
            type: "pet:realtime-update",
            pet: petManager.getSnapshot(),
            timestamp: Date.now(),
          }),
        );
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
  serverRef = server;

  return { server, db, ytm, cookieManager };
}

if (import.meta.main) {
  const port = Number(Bun.env.SUPER_APP_PORT ?? 8787);
  const { server } = startGeminiSuperAppServer(port, Bun.env.SUPER_APP_DB_PATH ?? "gemini-super-app.sqlite");
  console.log(`Gemini Super App running on http://127.0.0.1:${server.port}`);
}
