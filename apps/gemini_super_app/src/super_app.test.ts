import { describe, expect, test } from "bun:test";
import { startGeminiSuperAppServer } from "./server";

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

    // 2. HTML UI with AnimatedGeminiSvgOrb
    const htmlRes = await fetch(`${baseUrl}/`);
    const html = await htmlRes.text();
    expect(html).toContain("AnimatedGeminiSvgOrb");
    expect(html).toContain("Gemini Super App");

    // 3. YTM Companion API
    const ytmRes = await fetch(`${baseUrl}/api/ytm/state`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: "play" }),
    });
    const ytmJson = (await ytmRes.json()) as { state: { trackState: string } };
    expect(ytmJson.state.trackState).toBe("PLAYING");

    // 4. AudioCraft generation API
    const acRes = await fetch(`${baseUrl}/api/audiocraft/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "facebook/musicgen-stereo-large",
        prompt: "Deep techno synth bassline",
        durationSec: 1,
      }),
    });
    const acJson = (await acRes.json()) as {
      uvCommand: string[];
      wavHeader: { format: string; sampleRateHz: number };
    };
    expect(acJson.uvCommand[0]).toBe("uv");
    expect(acJson.wavHeader.format).toBe("WAV");

    // 5. Media analysis API
    const mediaRes = await fetch(`${baseUrl}/api/media/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ frequencyHz: 440, sampleCount: 1600 }),
    });
    const mediaJson = (await mediaRes.json()) as {
      timeline: { spectrumBands32: number[] };
    };
    expect(mediaJson.timeline.spectrumBands32.length).toBe(32);

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
      pet: { reaction: string };
    };
    expect(petVoiceJson.model).toBe("gemini-3.8-live");
    expect(petVoiceJson.audio_chunks_count).toBeGreaterThan(0);
    expect(petVoiceJson.pcm24k_bytes_len).toBeGreaterThan(500);
    expect(petVoiceJson.wav_base64.length).toBeGreaterThan(500);
    expect(petVoiceJson.pet.reaction).toBe("celebrating");
  }, 45000);
});
