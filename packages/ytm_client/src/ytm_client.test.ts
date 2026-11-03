import { expect, test } from "bun:test";
import { YtmCompanionClient, YtmCompanionError } from "./index";

test("reads actual companion state and forwards commands with its token", async () => {
  const commands: unknown[] = [];
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) {
    if (req.headers.get("authorization") !== "test-token") return new Response(null, { status: 401 });
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/state") return Response.json({ player: { trackState: "PAUSED", videoProgress: 5, volume: 42, adPlaying: false }, video: null });
    if (path === "/api/v1/command") { commands.push(await req.json()); return new Response(null, { status: 204 }); }
    return new Response(null, { status: 404 });
  } });
  try {
    const client = new YtmCompanionClient({ port: server.port, token: "test-token" });
    expect((await client.getCurrentState()).player.trackState).toBe("PAUSED");
    await client.sendCommand({ command: "setVolume", data: 72 });
    expect(commands).toEqual([{ command: "setVolume", data: 72 }]);
    await expect(client.sendCommand({ command: "setVolume", data: 101 })).rejects.toBeInstanceOf(YtmCompanionError);
    expect(commands).toHaveLength(1);
    await expect(new YtmCompanionClient({ port: server.port, token: "bad" }).getCurrentState()).rejects.toMatchObject({ status: 502 });
  } finally { server.stop(true); }
});

test("reports missing authorization instead of inventing a player state", async () => {
  const client = new YtmCompanionClient({ token: "" }, { get: async () => null, set: async () => {} });
  await expect(client.getCurrentState()).rejects.toMatchObject({ status: 503 });
});

test("pairs through the companion and restores the token from a credential store", async () => {
  let stored: string | null = null;
  const store = { get: async () => stored, set: async (token: string) => { stored = token; } };
  const received: Array<{ path: string; body: unknown }> = [];
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/auth/requestcode") { received.push({ path, body: await req.json() }); return Response.json({ code: "0123" }); }
    if (path === "/api/v1/auth/request") { received.push({ path, body: await req.json() }); return Response.json({ token: "paired-token" }); }
    if (path === "/api/v1/state" && req.headers.get("authorization") === "paired-token") return Response.json({ player: { trackState: "PLAYING" }, video: null });
    return new Response(null, { status: 401 });
  } });
  try {
    const client = new YtmCompanionClient({ port: server.port, token: "" }, store);
    await expect(client.completePairing()).rejects.toMatchObject({ status: 400 });
    expect(await client.beginPairing()).toBe("0123");
    expect(await client.completePairing()).toEqual({ persistent: true });
    expect(received[1]?.body).toEqual({ appId: "gemini-super-app", code: "0123" });
    expect((await new YtmCompanionClient({ port: server.port, token: "" }, store).getCurrentState()).player.trackState).toBe("PLAYING");
    const temporary = new YtmCompanionClient({ port: server.port, token: "" }, { get: async () => null, set: async () => { throw new Error("store unavailable"); } });
    await temporary.beginPairing();
    expect(await temporary.completePairing()).toEqual({ persistent: false });
    expect((await temporary.getCurrentState()).player.trackState).toBe("PLAYING");
  } finally { server.stop(true); }
});
