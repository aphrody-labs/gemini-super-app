/** Client for the YouTube Music Desktop companion server's v1 HTTP API. */
export type YtmCommandAction = "playPause" | "play" | "pause" | "next" | "previous" | "setVolume" | "seekTo" | "changeVideo";

export interface YtmCommandPayload {
  readonly command: YtmCommandAction;
  readonly data?: number | { videoId?: string; playlistId?: string };
}

export interface YtmCompanionConfig {
  readonly host: string;
  readonly port: number;
  readonly token?: string;
}

export interface YtmPlayerState {
  readonly player: { readonly trackState: string; readonly videoProgress: number; readonly volume: number; readonly adPlaying: boolean };
  readonly video: { readonly id: string; readonly title: string; readonly author: string; readonly album: string | null; readonly durationSeconds: number } | null;
}

export class YtmCompanionError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export class YtmCompanionClient {
  private readonly config: YtmCompanionConfig;
  private token: string | undefined;
  private pendingCode: { code: string; expiresAt: number } | undefined;
  private pairing = false;
  private readonly store: { get(): Promise<string | null>; set(token: string): Promise<void> };

  constructor(config: Partial<YtmCompanionConfig> = {}, store = {
    get: () => Bun.secrets.get({ service: "gemini-super-app", name: "youtube-music-desktop" }),
    set: (value: string) => Bun.secrets.set({ service: "gemini-super-app", name: "youtube-music-desktop", value, persist: "local" }),
  }) {
    this.config = { host: "127.0.0.1", port: 9863, token: Bun.env.YTM_COMPANION_TOKEN, ...config };
    this.token = this.config.token || undefined;
    this.store = store;
  }

  public getBaseUrl(): string { return `http://${this.config.host}:${this.config.port}/api/v1`; }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.token) {
      try { this.token = (await this.store.get()) || undefined; } catch { /* The OS store may be unavailable. */ }
    }
    if (!this.token) throw new YtmCompanionError("Associez YouTube Music Desktop pour contrôler la lecture.", 503);
    let response: Response;
    try {
      response = await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        headers: { authorization: this.token, ...init.headers },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new YtmCompanionError("YouTube Music Desktop est inaccessible. Vérifiez que son serveur compagnon est actif.", 503);
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new YtmCompanionError("Autorisation YouTube Music Desktop refusée. Vérifiez le jeton compagnon.", 502);
      throw new YtmCompanionError(`Le serveur compagnon a répondu avec le statut ${response.status}.`, 502);
    }
    return response;
  }

  private async authRequest(path: string, body: object, timeout: number): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(`${this.getBaseUrl()}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    } catch { throw new YtmCompanionError("YouTube Music Desktop est inaccessible. Activez son serveur compagnon.", 503); }
    if (!response.ok) throw new YtmCompanionError(response.status === 403 ? "Activez les demandes d'autorisation dans les réglages du compagnon YouTube Music Desktop." : `Association refusée par le lecteur (${response.status}).`, 502);
    try { return await response.json() as Record<string, unknown>; }
    catch { throw new YtmCompanionError("Réponse d'association invalide.", 502); }
  }

  public async beginPairing(): Promise<string> {
    if (this.pairing) throw new YtmCompanionError("Une association est déjà en cours.", 409);
    this.pairing = true;
    this.pendingCode = undefined;
    try {
      const result = await this.authRequest("/auth/requestcode", { appId: "gemini-super-app", appName: "Gemini Super App", appVersion: "1.0.0" }, 15000);
      if (typeof result.code !== "string" || !/^\d{4}$/.test(result.code)) throw new YtmCompanionError("Code d'association invalide.", 502);
      this.pendingCode = { code: result.code, expiresAt: Date.now() + 55_000 };
      return result.code;
    } finally { this.pairing = false; }
  }

  public async completePairing(): Promise<{ persistent: boolean }> {
    if (this.pairing) throw new YtmCompanionError("Une association est déjà en cours.", 409);
    if (!this.pendingCode || this.pendingCode.expiresAt <= Date.now()) { this.pendingCode = undefined; throw new YtmCompanionError("Le code a expiré. Commencez une nouvelle association.", 400); }
    this.pairing = true;
    const code = this.pendingCode.code;
    this.pendingCode = undefined;
    try {
      const result = await this.authRequest("/auth/request", { appId: "gemini-super-app", code }, 35000);
      if (typeof result.token !== "string" || !result.token || result.token.length > 4096) throw new YtmCompanionError("Jeton compagnon invalide.", 502);
      this.token = result.token;
      try { await this.store.set(result.token); return { persistent: true }; }
      catch { return { persistent: false }; }
    } finally { this.pairing = false; }
  }

  public async getCurrentState(): Promise<YtmPlayerState> {
    const response = await this.request("/state");
    const state = await response.json() as YtmPlayerState;
    if (!state || typeof state !== "object" || !state.player || typeof state.player.trackState !== "string") {
      throw new YtmCompanionError("Réponse invalide du serveur compagnon.", 502);
    }
    return state;
  }

  public async sendCommand(command: YtmCommandPayload): Promise<void> {
    const simple = ["playPause", "play", "pause", "next", "previous"];
    const valid = command && (simple.includes(command.command) ||
      (command.command === "setVolume" && typeof command.data === "number" && Number.isFinite(command.data) && command.data >= 0 && command.data <= 100) ||
      (command.command === "seekTo" && typeof command.data === "number" && Number.isFinite(command.data) && command.data >= 0) ||
      (command.command === "changeVideo" && typeof command.data === "object" && command.data !== null && ((typeof command.data.videoId === "string" && command.data.videoId.length > 0) || (typeof command.data.playlistId === "string" && command.data.playlistId.length > 0))));
    if (!valid) throw new YtmCompanionError("Commande de lecture invalide.", 400);
    await this.request("/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command) });
  }
}
