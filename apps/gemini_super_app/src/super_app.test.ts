import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { startGeminiSuperAppServer, validateChatAttachments } from "./server";
import { createWavPcm16Buffer } from "@gemini-live/mediabunny";
import { YtmCompanionClient } from "@gemini-live/ytm-client";

setDefaultTimeout(20000);

test("protects local API routes and CORS preflight from unapproved origins", async () => {
  const instance = startGeminiSuperAppServer(0);
  try {
    const base = `http://127.0.0.1:${instance.server.port}`;
    expect(instance.server.hostname).toBe("127.0.0.1");
    expect((await fetch(`${base}/api/health`)).status).toBe(200);
    for (const path of ["/api/app/conversations", "/api/pc/fs", "/api/runtime/execute"]) {
      const response = await fetch(`${base}${path}`, { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } });
      expect(response.status).toBe(403);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
    const exec = await fetch(`${base}/api/pc/exec`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
    expect(exec.status).toBe(403);
    const rebinding = await fetch(`${base}/api/health`, { headers: { host: "attacker.example:8787" } });
    expect(rebinding.status).toBe(403);
    expect((await fetch(`${base}/api/gemini/cookies/status`, { headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect((await fetch(`${base}/ws`, { headers: { origin: "https://evil.example", connection: "Upgrade", upgrade: "websocket" } })).status).toBe(403);
    const previous = Bun.env.SUPER_APP_ALLOWED_ORIGINS;
    try {
      Bun.env.SUPER_APP_ALLOWED_ORIGINS = "https://gemini.google.com";
      const preflight = await fetch(`${base}/api/pc/fs`, { method: "OPTIONS", headers: { origin: "https://gemini.google.com", "access-control-request-method": "GET" } });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
      expect((await fetch(`${base}/api/health`, { headers: { origin: "https://gemini.google.com" } })).status).toBe(200);
    } finally {
      if (previous === undefined) delete Bun.env.SUPER_APP_ALLOWED_ORIGINS;
      else Bun.env.SUPER_APP_ALLOWED_ORIGINS = previous;
    }
  } finally { instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
});

test("pairing requires a local same-origin request and never returns the token", async () => {
  let saved: string | null = null;
  const companion = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path.endsWith("/requestcode")) return Response.json({ code: "1234" });
    if (path.endsWith("/request")) return Response.json({ token: "private-test-token" });
    return new Response(null, { status: 404 });
  } });
  const client = new YtmCompanionClient({ port: companion.port, token: "" }, { get: async () => saved, set: async token => { saved = token; } });
  const instance = startGeminiSuperAppServer(0, ":memory:", client);
  try {
    const base = `http://127.0.0.1:${instance.server.port}`;
    const pair = (step: string, origin: string) => fetch(`${base}/api/ytm/pair/${step}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
    expect((await pair("start", "https://example.com")).status).toBe(403);
    const start = await pair("start", base);
    expect(await start.json()).toEqual({ code: "1234" });
    const complete = await pair("complete", base);
    expect(await complete.json()).toEqual({ ok: true, persistent: true });
    expect(String(saved)).toBe("private-test-token");
  } finally { instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); companion.stop(true); }
});

test("attachment validation checks signatures, formats and size", () => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  expect(validateChatAttachments([{ name: "test.png", mimeType: "image/png", data: png }])).toHaveLength(1);
  expect(() => validateChatAttachments([{ name: "test.pdf", mimeType: "application/pdf", data: png }])).toThrow();
  expect(() => validateChatAttachments([{ name: "test.png", mimeType: "image/png", data: "bad!" }])).toThrow();
  expect(() => validateChatAttachments(Array(4).fill({ name: "test.png", mimeType: "image/png", data: png }))).toThrow();
});

test("does not report a successful wallpaper application when the native service is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith("http://127.0.0.1:8788/")) return Promise.reject(new Error("native service unavailable"));
    if (String(input).startsWith("http://127.0.0.1:8765/")) return Promise.reject(new Error("voice service unavailable"));
    return originalFetch(input, init);
  }) as typeof fetch;
  const instance = startGeminiSuperAppServer(0);
  try {
    const base = `http://127.0.0.1:${instance.server.port}`;
    const status = await (await fetch(`${base}/api/wallpaper/status`)).json() as { wallpaper: unknown };
    expect(status.wallpaper).toBeNull();
    const apply = await fetch(`${base}/api/wallpaper/apply`, { method: "POST" });
    expect(apply.status).toBe(503);
    expect((await apply.json() as { error: string }).error).toContain("indisponible");
  } finally { globalThis.fetch = originalFetch; instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
}, 20000);

test("requires the native service to confirm wallpaper application", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "http://127.0.0.1:8788/api/tauri/wallpaper/apply") return Promise.resolve(Response.json({ static_wallpaper_applied: false }));
    return originalFetch(input, init);
  }) as typeof fetch;
  const instance = startGeminiSuperAppServer(0);
  try {
    const response = await fetch(`http://127.0.0.1:${instance.server.port}/api/wallpaper/apply`, { method: "POST" });
    expect(response.status).toBe(502);
    expect((await response.json() as { error: string }).error).toContain("pas confirmé");
  } finally { globalThis.fetch = originalFetch; instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
});

test("does not claim voice activation or transcribe audio when the voice service is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith("http://127.0.0.1:8765/")) return Promise.reject(new Error("voice service unavailable"));
    return originalFetch(input, init);
  }) as typeof fetch;
  const instance = startGeminiSuperAppServer(0);
  try {
    const url = `http://127.0.0.1:${instance.server.port}/api/voice`;
    const post = (body: string) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body });
    const toggle = await post(JSON.stringify({ action: "toggle_live", enabled: true }));
    expect(toggle.status).toBe(503);
    expect((await toggle.json() as { is_live_active?: boolean }).is_live_active).toBeUndefined();
    expect((await post(JSON.stringify({ pcm16_base64: "AA==" }))).status).toBe(503);
    expect((await post("null")).status).toBe(400);
    expect((await post("{" )).status).toBe(400);
  } finally { globalThis.fetch = originalFetch; instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
});

test("checks the hardware microphone before enabling wallpaper voice", async () => {
  const originalFetch = globalThis.fetch;
  let active = false;
  let commands = 0;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "http://127.0.0.1:8765/api/audio/hardware") return Promise.resolve(Response.json({ hardware_audio: { mic_stream_active: active } }));
    if (String(input) === "http://127.0.0.1:8765/api/voice") { commands++; return Promise.resolve(Response.json({ is_live_active: true })); }
    return originalFetch(input, init);
  }) as typeof fetch;
  const instance = startGeminiSuperAppServer(0);
  try {
    const url = `http://127.0.0.1:${instance.server.port}/api/voice`;
    const start = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "toggle_live", enabled: true, surface: "windows_live_wallpaper" }) });
    expect((await start()).status).toBe(409);
    expect(commands).toBe(0);
    active = true;
    expect((await start()).status).toBe(200);
    expect(commands).toBe(1);
  } finally { globalThis.fetch = originalFetch; instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
});

test("wallpaper polls the read-only voice telemetry endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:8765/")) {
      requested.push(url);
      return Promise.resolve(Response.json({ state: "IDLE", is_live_active: false, history: [] }));
    }
    if (url.startsWith("http://127.0.0.1:8788/")) return Promise.reject(new Error("offline"));
    return originalFetch(input, init);
  }) as typeof fetch;
  const instance = startGeminiSuperAppServer(0);
  try {
    const response = await fetch(`http://127.0.0.1:${instance.server.port}/api/wallpaper/status`);
    expect(response.status).toBe(200);
    expect(requested).toEqual(["http://127.0.0.1:8765/api/voice/telemetry"]);
    expect((await response.json() as { voice: { state: string } }).voice.state).toBe("IDLE");
  } finally { globalThis.fetch = originalFetch; instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
}, 20000);

test.skipIf(!new TextDecoder().decode(Bun.spawnSync([Bun.which("bun") ?? "bun", "uv", "--help"], { stdout: "ignore", stderr: "pipe" }).stderr).includes('Script not found "uv"'))("reports the missing bun uv runtime in a real MusicGen job", async () => {
  const instance = startGeminiSuperAppServer(0);
  try {
    const base = `http://127.0.0.1:${instance.server.port}`;
    const response = await fetch(`${base}/api/audiocraft/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "piano", model: "facebook/musicgen-small", durationSec: 1 }) });
    expect(response.status).toBe(202);
    const { id } = await response.json() as { id: string };
    let job: { status: string; error?: string } = { status: "running" };
    for (let i = 0; i < 30 && job.status === "running"; i++) {
      await Bun.sleep(100);
      job = await (await fetch(`${base}/api/audiocraft/jobs/${id}`)).json() as typeof job;
    }
    expect(job.status).toBe("failed");
    expect(job.error).toContain("ne fournit pas bun uv");
    expect((await fetch(`${base}/api/audiocraft/jobs/${id}/audio`)).status).toBe(404);
  } finally { instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
}, 10000);

test("searches conversation titles and stored messages without exposing their contents", async () => {
  const instance = startGeminiSuperAppServer(0);
  try {
    const db = instance.db;
    db.query("INSERT INTO app_conversations (id, title, model_id, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1)").run("a", "Voyage", "test", 0);
    db.query("INSERT INTO app_conversations (id, title, model_id, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 2)").run("b", "ÉTÉ", "test", 1);
    db.query("INSERT INTO app_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, 1)").run("m", "a", "assistant", "Destination : été à Paris");
    const base = `http://127.0.0.1:${instance.server.port}/api/app/conversations`;
    const result = await (await fetch(`${base}?q=${encodeURIComponent("e\u0301te\u0301")}`)).json() as { conversations: Array<{ id: string; content?: string }> };
    expect(result.conversations.map(row => row.id)).toEqual(["b", "a"]);
    expect(result.conversations[1]?.content).toBeUndefined();
    expect((await (await fetch(`${base}?q=absent`)).json() as { conversations: unknown[] }).conversations).toHaveLength(0);
    expect((await fetch(`${base}?q=${"x".repeat(201)}`)).status).toBe(400);
    await fetch(`${base}/a`, { method: "DELETE" });
    expect((await (await fetch(`${base}?q=Paris`)).json() as { conversations: unknown[] }).conversations).toHaveLength(0);
  } finally { instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
});

test("returns stored attachments only through their conversation and removes them with it", async () => {
  const instance = startGeminiSuperAppServer(0);
  try {
    const db = instance.db;
    db.query("INSERT INTO app_conversations (id, title, model_id, is_pinned, created_at, updated_at) VALUES (?, ?, ?, 0, 1, 1)").run("chat-a", "Test", "test");
    db.query("INSERT INTO app_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, 1)").run("message-a", "chat-a", "user", "Test");
    const bytes = Buffer.from("iVBORw0KGgo=", "base64");
    db.query("INSERT INTO app_attachments (id, message_id, name, mime_type, data) VALUES (?, ?, ?, ?, ?)").run("file-a", "message-a", "été.png", "image/png", bytes);
    const base = `http://127.0.0.1:${instance.server.port}`;
    const detail = await (await fetch(`${base}/api/app/conversations/chat-a`)).json() as { messages: Array<{ attachments: Array<{ id: string; name: string; data?: string }> }> };
    expect(detail.messages[0]?.attachments[0]).toMatchObject({ id: "file-a", name: "été.png" });
    expect(detail.messages[0]?.attachments[0]?.data).toBeUndefined();
    const download = await fetch(`${base}/api/app/conversations/chat-a/attachments/file-a`);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("%C3%A9t%C3%A9.png");
    expect(download.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(new Uint8Array(bytes));
    expect((await fetch(`${base}/api/app/conversations/other/attachments/file-a`)).status).toBe(404);
    await fetch(`${base}/api/app/conversations/chat-a`, { method: "DELETE" });
    expect((await fetch(`${base}/api/app/conversations/chat-a/attachments/file-a`)).status).toBe(404);
  } finally { instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
}, 15000);

test.skipIf(!(Bun.env.GEMINI_API_KEY || Bun.env.GOOGLE_API_KEY))("sends an image and retains it for the next Gemini turn", async () => {
  const instance = startGeminiSuperAppServer(0);
  try {
    const base = `http://127.0.0.1:${instance.server.port}`;
    const create = await fetch(`${base}/api/app/conversations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Test image" }) });
    const { conversation } = await create.json() as { conversation: { id: string } };
    const url = `${base}/api/app/conversations/${conversation.id}/messages`;
    const post = (body: unknown) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const first = await post({ content: "Décris brièvement cette image.", model: "gemini-3.8-flash", attachments: [{ name: "pixel.png", mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=" }] });
    expect(first.status).toBe(200);
    const response = await first.json() as { messages: Array<{ attachments: Array<{ name: string; data?: string }>; markdown?: unknown[] }> };
    expect(response.messages[0]?.attachments[0]?.name).toBe("pixel.png");
    expect(response.messages[0]?.attachments[0]?.data).toBeUndefined();
    expect(response.messages[1]?.markdown?.length).toBeGreaterThan(0);
    const second = await post({ content: "Combien de dimensions possède l'image ?", model: "gemini-3.8-flash" });
    expect(second.status).toBe(200);
    expect((instance.db.query("SELECT COUNT(*) AS count FROM app_attachments").get() as { count: number }).count).toBe(1);
    await fetch(`${base}/api/app/conversations/${conversation.id}`, { method: "DELETE" });
    expect((instance.db.query("SELECT COUNT(*) AS count FROM app_attachments").get() as { count: number }).count).toBe(0);
  } finally { instance.cookieManager.stopAutoRefreshDaemon(); instance.server.stop(true); instance.db.close(); }
}, 60000);

describe("One Big Gemini Super App (@gemini-live/super-app)", () => {
  test("serves unified health, Voicebox, YTM, AudioCraft, Media, Jan ADK, and WebSocket hub", async () => {
    using srvObj = {
      ...startGeminiSuperAppServer(0),
      [Symbol.dispose]() {
        this.cookieManager.stopAutoRefreshDaemon();
        this.server.stop(true);
        this.db.close();
      },
    };
    const baseUrl = `http://127.0.0.1:${srvObj.server.port}`;

    // 1. Health endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);
    const health = (await healthRes.json()) as {
      tauriVersion: string;
      models: { live: string; deepReasoning: string };
      consolidatedSubmodules: string[];
    };
    expect(health.tauriVersion).toBe("3.0.0-alpha.5");
    expect(health.models.live).toBe("gemini-3.8-live");
    expect(health.models.deepReasoning).toBe("gemini-4-argon");
    expect(health.consolidatedSubmodules.length).toBe(11);
    expect(health.consolidatedSubmodules).toContain("vendor/mochi-desktop");

    // 2. The product entry point serves the workspace
    const htmlRes = await fetch(`${baseUrl}/`);
    const html = await htmlRes.text();
    expect(html).toContain('id="promptForm"');
    expect(html).toContain('href="/voice"');

    // 3. YTM Companion API
    const ytmRes = await fetch(`${baseUrl}/api/ytm/state`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: "setVolume", data: 101 }),
    });
    expect(ytmRes.status).toBe(400);

    // 4. AudioCraft generation API
    const acRes = await fetch(`${baseUrl}/api/audiocraft/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "facebook/musicgen-stereo-large",
        prompt: "Deep techno synth bassline",
        durationSec: 0,
      }),
    });
    expect(acRes.status).toBe(400);

    // 5. Media analysis API
    const mediaRes = await fetch(`${baseUrl}/api/media/analyze`, {
      method: "POST",
      headers: { "content-type": "audio/wav" },
      body: new Uint8Array(createWavPcm16Buffer(new Int16Array(1600).fill(16384), 16000)).buffer,
    });
    const mediaJson = (await mediaRes.json()) as { rms: number; durationSec: number };
    expect(mediaRes.status).toBe(200);
    expect(mediaJson.rms).toBeCloseTo(0.5);
    expect(mediaJson.durationSec).toBeCloseTo(0.1);

    // 6. Jan ADK API
    const janRes = await fetch(`${baseUrl}/api/jan/agent`);
    const janJson = (await janRes.json()) as {
      manifest: { liveModel: string };
      parsedEvents: unknown[];
    };
    expect(janJson.manifest.liveModel).toBe("gemini-3.8-live");
    expect(janJson.parsedEvents.length).toBe(1);

    // 7. Durable Gemini Session Cookies API
    const cookieRes = await fetch(`${baseUrl}/api/gemini/cookies/status`);
    expect(cookieRes.status).toBe(200);
    const cookieJson = (await cookieRes.json()) as {
      hasValid1Psid: boolean;
      hasValid1PsidTs: boolean;
      totalCookiesStored: number;
    };
    expect(cookieJson.hasValid1Psid).toBe(true);
    expect(cookieJson.hasValid1PsidTs).toBe(true);
    expect(cookieJson.totalCookiesStored).toBeGreaterThanOrEqual(15);

    // 8. Migrated Gemini Windows App -> Native Tauri v3.0.0-alpha.5 Status & Immersive UI
    const winStatusRes = await fetch(`${baseUrl}/api/windows-tauri/status`);
    expect(winStatusRes.status).toBe(200);
    const winStatus = (await winStatusRes.json()) as {
      legacyElectron: { found: boolean; exeSizeBytes: number };
      nativeTauriV3: { version: string; binaryExists: boolean };
    };
    expect(winStatus.legacyElectron.found).toBe(true);
    expect(winStatus.legacyElectron.exeSizeBytes).toBeGreaterThan(100_000_000);
    expect(winStatus.nativeTauriV3.version).toBe("3.0.0-alpha.5");
    expect(winStatus.nativeTauriV3.binaryExists).toBe(true);

    const winUiRes = await fetch(`${baseUrl}/windows-tauri`);
    expect(winUiRes.status).toBe(200);
    const winUiHtml = await winUiRes.text();
    expect(winUiHtml).toContain("TAURI v3.0.0-alpha.5 NATIVE");
    expect(winUiHtml).toContain("AnimatedGeminiSvgOrb");

    // 9. OpenPets × Gemini Pet Companion Studio (/pet, /api/pet/state, /api/pet/action, /api/openpets/ipc)
    const petHtmlRes = await fetch(`${baseUrl}/pet`);
    expect(petHtmlRes.status).toBe(200);
    const petHtml = await petHtmlRes.text();
    expect(petHtml).toContain("Gemini Pet Companion Studio");

    const svgAtlasRes = await fetch(
      `${baseUrl}/assets/openpets/gemini-pet-spritesheet.svg`,
    );
    expect(svgAtlasRes.status).toBe(200);
    const svgAtlas = await svgAtlasRes.text();
    expect(svgAtlas).toContain('viewBox="0 0 1536 2288"');

    const petStateRes = await fetch(`${baseUrl}/api/pet/state`);
    expect(petStateRes.status).toBe(200);
    const petState = (await petStateRes.json()) as {
      pet: { activePetId: string; hunger: number };
      characters: unknown[];
      mochiEmotes: unknown[];
    };
    expect(petState.pet.activePetId).toBe("gemini-sparkle");
    expect(petState.characters.length).toBe(3);
    expect(petState.mochiEmotes.length).toBe(12);

    const mochiManifestRes = await fetch(
      `${baseUrl}/assets/mochi/mochi/manifest.json`,
    );
    expect(mochiManifestRes.status).toBe(200);
    const mochiManifest = (await mochiManifestRes.json()) as {
      format: string;
      animations: Record<string, unknown>;
    };
    expect(mochiManifest.format).toBe("mochi-animation-set-v1");
    expect(Object.keys(mochiManifest.animations).length).toBeGreaterThanOrEqual(
      35,
    );

    const mochiEmoteRes = await fetch(`${baseUrl}/api/pet/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "mochi-emote", emoteId: "mochi-exe" }),
    });
    expect(mochiEmoteRes.status).toBe(200);
    const mochiEmote = (await mochiEmoteRes.json()) as {
      ok: boolean;
      pet: { mochiAnimation: string };
    };
    expect(mochiEmote.ok).toBe(true);
    expect(mochiEmote.pet.mochiAnimation).toBe("emote_mochi_exe");

    // 9b. Real-Time Pet Customization & Dynamic SVG Spritesheet (/api/pet/customize)
    const petCustomRes = await fetch(`${baseUrl}/api/pet/customize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        petId: "gemini-sparkle",
        reaction: "celebrating",
        speechText: "Couronne cosmique équipée par agy ✦👑",
        customStyle: {
          customName: "Aphrody Sparkle King ✦",
          primaryColor: "#10B981",
          secondaryColor: "#6366F1",
          accentColor: "#F43F5E",
          accessory: "crown",
          scale: 1.25,
          animationSpeed: 1.5,
        },
      }),
    });
    expect(petCustomRes.status).toBe(200);
    const petCustom = (await petCustomRes.json()) as {
      ok: boolean;
      pet: {
        reaction: string;
        speechText: string;
        customStyle: {
          customName: string;
          primaryColor: string;
          accessory: string;
          scale: number;
        };
      };
    };
    expect(petCustom.ok).toBe(true);
    expect(petCustom.pet.customStyle.customName).toBe("Aphrody Sparkle King ✦");
    expect(petCustom.pet.customStyle.primaryColor).toBe("#10B981");
    expect(petCustom.pet.customStyle.accessory).toBe("crown");

    const customSvgRes = await fetch(
      `${baseUrl}/assets/openpets/gemini-pet-spritesheet.svg`,
    );
    const customSvgText = await customSvgRes.text();
    expect(customSvgText).toContain("#10B981");
    expect(customSvgText).toContain("#FBBF24"); // Crown gold polygon

    // 10. OpenPets 3D Plugin: 2D PNG -> 3D Voxel Mesh & Binary glTF 2.0 .GLB + gfx-rs/wgpu WGSL
    const glbRes = await fetch(
      `${baseUrl}/api/pet/3d/glb?sprite=mochi/master/mochi_default.png&depth=0.16&step=8`,
    );
    expect(glbRes.status).toBe(200);
    const glbJson = (await glbRes.json()) as {
      ok: boolean;
      width: number;
      height: number;
      voxelCount: number;
      triangleCount: number;
      glbByteLength: number;
      wgpuShaderWgsl: string;
    };
    expect(glbJson.ok).toBe(true);
    expect(glbJson.width).toBe(256);
    expect(glbJson.height).toBe(256);
    expect(glbJson.voxelCount).toBeGreaterThan(50);
    expect(glbJson.triangleCount).toBeGreaterThan(100);
    expect(glbJson.glbByteLength).toBeGreaterThan(1000);
    expect(glbJson.wgpuShaderWgsl).toContain("@vertex");

    const petFeedRes = await fetch(`${baseUrl}/api/pet/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "feed" }),
    });
    expect(petFeedRes.status).toBe(200);
    const petFeed = (await petFeedRes.json()) as {
      ok: boolean;
      pet: { hunger: number; reaction: string };
    };
    expect(petFeed.ok).toBe(true);
    expect(petFeed.pet.hunger).toBe(100);

    const ipcHelloRes = await fetch(`${baseUrl}/api/openpets/ipc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "ipc-1", version: 1, method: "hello" }),
    });
    const ipcHello = (await ipcHelloRes.json()) as {
      ok: boolean;
      result: { protocolVersion: number };
    };
    expect(ipcHello.ok).toBe(true);
    expect(ipcHello.result.protocolVersion).toBe(1);
  });

  test("executes real live Gemini API calls (gemini-4-argon, gemini-3.8-flash-tts, gemini-3.8-live)", async () => {
    const hasKey = Boolean(Bun.env.GEMINI_API_KEY || Bun.env.GOOGLE_API_KEY);
    if (!hasKey) {
      return;
    }

    using srvObj = {
      ...startGeminiSuperAppServer(0),
      [Symbol.dispose]() {
        this.cookieManager.stopAutoRefreshDaemon();
        this.server.stop(true);
        this.db.close();
      },
    };
    const baseUrl = `http://127.0.0.1:${srvObj.server.port}`;

    // 1. Real gemini-4-argon deep reasoning
    const reasonRes = await fetch(`${baseUrl}/api/gemini/reason`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "gemini-4-argon",
        prompt: "Reply with the single word ARGON_LIVE_OK",
      }),
    });
    expect(reasonRes.status).toBe(200);
    const reasonJson = (await reasonRes.json()) as {
      model: string;
      text: string;
    };
    expect(reasonJson.model).toBe("gemini-4-argon");
    expect(reasonJson.text).toContain("ARGON_LIVE_OK");

    // 2. Real gemini-3.8-flash-tts synthesis (Aoede voice)
    const ttsRes = await fetch(`${baseUrl}/api/gemini/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.8-flash-tts",
        voice: "Aoede",
        text: "Bonjour depuis la Super Application Gemini.",
      }),
    });
    expect(ttsRes.status).toBe(200);
    const ttsJson = (await ttsRes.json()) as {
      model: string;
      voice: string;
      mimeType: string;
      base64Length: number;
    };
    expect(ttsJson.model).toBe("gemini-3.8-flash-tts");
    expect(ttsJson.voice).toBe("Aoede");
    expect(ttsJson.base64Length).toBeGreaterThan(1000);

    // 3. Real gemini-3.8-live bidirectional WebSocket audio turn
    const liveRes = await fetch(`${baseUrl}/api/gemini/live-turn`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.8-live",
        voice: "Aoede",
        prompt: "Say Bonjour in one word.",
      }),
    });
    expect(liveRes.status).toBe(200);
    const liveJson = (await liveRes.json()) as {
      model: string;
      audioChunks: number;
      totalAudioBase64Chars: number;
      turnDone: boolean;
    };
    expect(liveJson.model).toBe("gemini-3.8-live");
    expect(liveJson.audioChunks).toBeGreaterThan(0);
    expect(liveJson.totalAudioBase64Chars).toBeGreaterThan(1000);
    expect(liveJson.turnDone).toBe(true);

    // 4. Real Gemini Pet Companion Voice Turn (/api/pet/voice -> gemini-3.8-live)
    const petVoiceRes = await fetch(`${baseUrl}/api/pet/voice`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        voice: "Puck",
        prompt: "Dis Miaou en un seul mot !",
      }),
    });
    expect(petVoiceRes.status).toBe(200);
    const petVoiceJson = (await petVoiceRes.json()) as {
      model: string;
      audio_chunks_count: number;
      pcm24k_bytes_len: number;
      wav_base64: string;
      orb_spectrum: { bands: number[]; rms: number } | null;
      pet: { reaction: string };
    };
    expect(petVoiceJson.model).toBe("gemini-3.8-live");
    expect(petVoiceJson.audio_chunks_count).toBeGreaterThan(0);
    expect(petVoiceJson.pcm24k_bytes_len).toBeGreaterThan(500);
    expect(petVoiceJson.wav_base64.length).toBeGreaterThan(500);
    if (Bun.env.VOICE_DSP_BIN) {
      expect(petVoiceJson.orb_spectrum?.bands).toHaveLength(32);
      expect(petVoiceJson.orb_spectrum?.rms).toBeGreaterThan(0);
    }
    expect(petVoiceJson.pet.reaction).toBe("celebrating");
  }, 120000);

  test("serves clean-room Gemini Web App Replica (/app, S01-S05) and SQLite WAL conversation thread CRUD", async () => {
    using srvObj = {
      ...startGeminiSuperAppServer(0),
      [Symbol.dispose]() {
        this.cookieManager.stopAutoRefreshDaemon();
        this.server.stop(true);
        this.db.close();
      },
    };
    const baseUrl = `http://127.0.0.1:${srvObj.server.port}`;

    // 1. Verify /app serves all S01-S05 screens and semantic tokens
    const appRes = await fetch(`${baseUrl}/app`);
    expect(appRes.status).toBe(200);
    const appHtml = await appRes.text();
    expect(appHtml).toContain("zeroStateSection");
    expect(appHtml).toContain("threadSection");
    expect(appHtml).toContain("promptForm");
    expect(appHtml).toContain('src="/workspace.js"');
    const markdownScript = await fetch(`${baseUrl}/markdown-dom.js`);
    expect(markdownScript.status).toBe(200);
    expect(markdownScript.headers.get("content-type")).toContain("javascript");
    expect(appHtml).not.toContain('id="promptForm" hidden');

    // 2. A fresh database starts without fabricated conversations
    const listRes = await fetch(`${baseUrl}/api/app/conversations`);
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as {
      conversations: Array<{ id: string; is_pinned: boolean }>;
    };
    expect(listJson.conversations).toHaveLength(0);

    // 3. Create new conversation & send message (vertical slice S01 -> S04 -> S02)
    const createRes = await fetch(`${baseUrl}/api/app/conversations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Test WCAG 2.2 AA & Bun SQLite",
        model_id: "gemini-4-argon",
      }),
    });
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as {
      conversation: { id: string; title: string };
    };
    const chatId = createJson.conversation.id;

    const msgRes = await fetch(
      `${baseUrl}/api/app/conversations/${chatId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: "Vérifie la persistance SQLite WAL et les citations.",
          model: "gemini-4-argon",
          attachments: [{ name: "spec.md", mimeType: "text/markdown" }],
        }),
      },
    );
    expect(msgRes.status).toBe(400);
    const conversationRes = await fetch(`${baseUrl}/api/app/conversations/${chatId}`);
    const conversationJson = (await conversationRes.json()) as { messages: unknown[] };
    expect(conversationJson.messages).toHaveLength(0);

    // 4. Pin and rename a conversation, validating rejected edits
    const patchRes = await fetch(`${baseUrl}/api/app/conversations/${chatId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_pinned: true, title: "Notes audio" }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await (await fetch(`${baseUrl}/api/app/conversations/${chatId}`)).json() as { conversation: { title: string; is_pinned: boolean } };
    expect(updated.conversation.title).toBe("Notes audio");
    expect(updated.conversation.is_pinned).toBe(true);
    const invalid = await fetch(`${baseUrl}/api/app/conversations/${chatId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "   ", is_pinned: false }) });
    expect(invalid.status).toBe(400);
    const unchanged = await (await fetch(`${baseUrl}/api/app/conversations/${chatId}`)).json() as { conversation: { title: string; is_pinned: boolean } };
    expect(unchanged.conversation).toMatchObject({ title: "Notes audio", is_pinned: true });
    const missing = await fetch(`${baseUrl}/api/app/conversations/not-found`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ is_pinned: true }) });
    expect(missing.status).toBe(404);

    const delRes = await fetch(`${baseUrl}/api/app/conversations/${chatId}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);

    // 5. Verify Hardware Audio Auto-Detection + 11 Vendor Engines + Minimalist Voice Routes
    const voiceRes = await fetch(`${baseUrl}/voice`);
    expect(voiceRes.status).toBe(200);
    const voiceHtml = await voiceRes.text();
    expect(voiceHtml).toContain("AnimatedGeminiSvgOrb");
    expect(voiceHtml).toContain("petCanvas");

    const hwRes = await fetch(`${baseUrl}/api/audio/hardware`);
    expect(hwRes.status).toBe(200);
    const hwJson = (await hwRes.json()) as {
      ok: boolean;
      dspVerification: { sampleRateHz: number; spectrumBands32Count: number | null; nativeDspAvailable: boolean };
      vendorEnginesActive: string[];
    };
    expect(hwJson.ok).toBe(true);
    expect(hwJson.dspVerification.sampleRateHz).toBe(16000);
    expect(hwJson.dspVerification.spectrumBands32Count).toBe(hwJson.dspVerification.nativeDspAvailable ? 32 : null);
    expect(hwJson.vendorEnginesActive.length).toBe(11);

    // 6. Verify Real Full PC Filesystem (/api/pc/fs), PC Exec (/api/pc/exec), and Permanent Antigravity Session with Auto-Compact (gemini-3.8-flash low)
    const fsListRes = await fetch(`${baseUrl}/api/pc/fs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "list", path: "." }),
    });
    expect(fsListRes.status).toBe(200);
    const fsListJson = (await fsListRes.json()) as {
      ok: boolean;
      count: number;
      entries: Array<{ name: string; isDir: boolean }>;
    };
    expect(fsListJson.ok).toBe(true);
    expect(fsListJson.count).toBeGreaterThan(5);
    expect(fsListJson.entries.some((e) => e.name === "package.json")).toBe(
      true,
    );

    const fsReadRes = await fetch(`${baseUrl}/api/pc/fs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "read",
        path: "package.json",
        startLine: 1,
        endLine: 15,
      }),
    });
    expect(fsReadRes.status).toBe(200);
    const fsReadJson = (await fsReadRes.json()) as {
      ok: boolean;
      content: string;
    };
    expect(fsReadJson.ok).toBe(true);
    expect(fsReadJson.content).toContain("gemini");

    const agyTurnRes = await fetch(`${baseUrl}/api/antigravity/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "turn",
        prompt: "/read package.json Résume ce fichier.",
        forceCompact: true,
      }),
    });
    expect(agyTurnRes.status).toBe(200);
    const agyTurnJson = (await agyTurnRes.json()) as {
      ok: boolean;
      model: string;
      thinkingLevel: string;
      autoCompacted: boolean;
      compactCount: number;
      pcContextAttached: string[];
    };
    expect(agyTurnJson.ok).toBe(true);
    expect(agyTurnJson.model).toBe("gemini-3.8-flash");
    expect(agyTurnJson.thinkingLevel).toBe("low");
    expect(agyTurnJson.autoCompacted).toBe(true);
    expect(agyTurnJson.compactCount).toBeGreaterThanOrEqual(1);
    expect(agyTurnJson.pcContextAttached.length).toBeGreaterThanOrEqual(1);

    // 7. Verify Real-Time Clock/Date & Full Tools/Skills/MCP Registry (/api/antigravity/tools)
    const toolsRes = await fetch(`${baseUrl}/api/antigravity/tools`);
    expect(toolsRes.status).toBe(200);
    const toolsJson = (await toolsRes.json()) as {
      ok: boolean;
      time_hm: string;
      date_fr: string;
      skills_count: number;
      mcp_count: number;
    };
    expect(toolsJson.ok).toBe(true);
    expect(toolsJson.time_hm).toMatch(/^\d{2}h\d{2}$/);
    expect(toolsJson.date_fr.length).toBeGreaterThan(8);
    expect(toolsJson.skills_count).toBeGreaterThanOrEqual(30);
    expect(toolsJson.mcp_count).toBeGreaterThanOrEqual(10);

    const clockTurnRes = await fetch(`${baseUrl}/api/antigravity/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "turn",
        prompt: "Quelle heure est-il et quelle est la date du jour ?",
      }),
    });
    expect(clockTurnRes.status).toBe(200);
    const clockTurnJson = (await clockTurnRes.json()) as {
      ok: boolean;
      reply: string;
      pcContextAttached: string[];
    };
    expect(clockTurnJson.ok).toBe(true);
    expect(clockTurnJson.reply).toContain(toolsJson.date_fr);
    expect(clockTurnJson.pcContextAttached).toContain(
      "clock:realtime_datetime",
    );

    // 8. Verify Extracted Real "Gemini in Chrome" (Glic) WebUI (/glic, /api/chrome/glic) & WebMCP + Built-in AI runtime (/webmcp_chrome_ai.js)
    const glicApiRes = await fetch(`${baseUrl}/api/chrome/glic`);
    expect(glicApiRes.status).toBe(200);
    const glicApiJson = (await glicApiRes.json()) as {
      ok: boolean;
      webMcpStandard: string;
      imperativeTools: string[];
      declarativeFormTool: string;
      builtinAiApis: string[];
      glicExtraction: {
        ok: boolean;
        chromeVersion: string;
        extractedCount: number;
      };
    };
    expect(glicApiJson.ok).toBe(true);
    expect(glicApiJson.webMcpStandard).toContain("document.modelContext");
    expect(glicApiJson.imperativeTools).toContain(
      "get_realtime_clock_and_date",
    );
    expect(glicApiJson.declarativeFormTool).toBe("send_voice_prompt_to_gemini");
    expect(glicApiJson.builtinAiApis).toContain("LanguageModel");
    expect(glicApiJson.glicExtraction.ok).toBe(true);
    expect(glicApiJson.glicExtraction.extractedCount).toBeGreaterThanOrEqual(
      48,
    );

    const glicWebUiRes = await fetch(`${baseUrl}/glic`);
    expect(glicWebUiRes.status).toBe(200);
    const glicWebUiHtml = await glicWebUiRes.text();
    expect(glicWebUiHtml).toContain("<title>Gemini in Chrome</title>");
    expect(glicWebUiHtml).toContain("glic-app-container");

    const webmcpJsRes = await fetch(`${baseUrl}/webmcp_chrome_ai.js`);
    expect(webmcpJsRes.status).toBe(200);
    const webmcpJsText = await webmcpJsRes.text();
    expect(webmcpJsText).toContain("document.modelContext");
    expect(webmcpJsText).toContain("LanguageModel.availability");
  }, 25000);
});
