/**
 * Durable Gemini Session Cookie Importer, Vault & Auto-Refresh Engine
 * (`packages/google_ai_suite/src/cookie_session.ts`).
 *
 * Capabilities:
 * 1. Native Windows DPAPI (`Crypt32.dll` via `bun:ffi`) + WebCrypto AES-256-GCM decryption
 *    of Chromium/Electron SQLite cookies from `C:\Users\aphro\AppData\Roaming\gemini\Network\Cookies`.
 * 2. Durable multi-tier persistence:
 *    - OS Credential Manager (`Bun.secrets`)
 *    - SQLite WAL database (`config/secrets/gemini_cookies.sqlite`)
 *    - Shared JSON Vault (`config/secrets/gemini_session_cookies.json` for Bun + Python `uv`)
 *    - `.env` synchronization (`GEMINI_1PSID`, `GEMINI_1PSIDTS`, `GEMINI_1PSIDCC`, `GEMINI_SAPISID`)
 * 3. Automatic Cookie Rotation & Refresh:
 *    - Calls `POST https://accounts.google.com/RotateCookies` and `GET https://gemini.google.com/app`
 *    - Parses `Set-Cookie` headers (`__Secure-1PSIDTS`, `__Secure-1PSIDCC`, `SIDCC`, `COMPASS`, `NID`)
 *    - Computes `SAPISIDHASH` (`Authorization: SAPISIDHASH <ts>_<sha1>`)
 *    - Extracts `SNlM0e` (at token) & `cfb2h` (build label) when present
 *    - Schedules periodic background auto-refresh (default: every 9 minutes).
 */

import { Database } from "bun:sqlite";
import { dlopen, FFIType, ptr, toArrayBuffer } from "bun:ffi";

export interface GeminiCookieEntry {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
  readonly expiresUtc: number;
  readonly updatedAtMs: number;
}

export interface GeminiSessionVault {
  readonly importedAtIso: string;
  readonly lastRefreshedAtIso: string;
  readonly sourcePath: string;
  readonly refreshCount: number;
  readonly lastRotateStatus: number;
  readonly hasValid1Psid: boolean;
  readonly hasValid1PsidTs: boolean;
  readonly sapisidHashOrigin: string;
  readonly snlm0eToken?: string;
  readonly cfb2hBuildLabel?: string;
  readonly cookies: Record<string, GeminiCookieEntry>;
}

const TARGET_COOKIE_NAMES = new Set([
  "__Secure-1PSID",
  "__Secure-1PSIDTS",
  "__Secure-1PSIDRTS",
  "__Secure-1PSIDCC",
  "__Secure-3PSID",
  "__Secure-3PSIDTS",
  "__Secure-3PSIDRTS",
  "__Secure-3PSIDCC",
  "__Secure-1PAPISID",
  "__Secure-3PAPISID",
  "SAPISID",
  "APISID",
  "HSID",
  "SSID",
  "SID",
  "SIDCC",
  "NID",
  "LSID",
  "__Host-1PLSID",
  "__Host-3PLSID",
  "__Host-GAPS",
  "__Host-GAPSTS",
  "COMPASS",
  "SOCS",
  "ACCOUNT_CHOOSER",
]);

const DEFAULT_ELECTRON_USER_DATA = `${Bun.env.APPDATA ?? "C:/Users/aphro/AppData/Roaming"}/gemini`;
const DEFAULT_ORIGIN = "https://gemini.google.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

/**
 * Decrypt a Windows DPAPI blob in-process using `Crypt32.dll` (`CryptUnprotectData`).
 */
export function dpapiUnprotect(encryptedBytes: Uint8Array): Uint8Array {
  if (process.platform !== "win32") {
    throw new Error("Windows DPAPI is only available on win32");
  }

  const crypt32 = dlopen("Crypt32.dll", {
    CryptUnprotectData: {
      args: [
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.u32,
        FFIType.ptr,
      ],
      returns: FFIType.bool,
    },
  });

  const kernel32 = dlopen("Kernel32.dll", {
    LocalFree: {
      args: [FFIType.ptr],
      returns: FFIType.ptr,
    },
  });

  // DATA_BLOB on x64 Windows: { u32 cbData; u32 _pad; void* pbData; } = 16 bytes
  const inBlob = new BigUint64Array(2);
  inBlob[0] = BigInt(encryptedBytes.byteLength);
  inBlob[1] = BigInt(ptr(encryptedBytes));

  const outBlob = new BigUint64Array(2);
  const ok = crypt32.symbols.CryptUnprotectData(
    ptr(inBlob),
    null,
    null,
    null,
    null,
    0,
    ptr(outBlob),
  );

  if (!ok) {
    throw new Error("CryptUnprotectData failed to decrypt os_crypt master key");
  }

  const outLen = Number((outBlob[0] ?? 0n) & 0xffffffffn);
  const outPtr = Number(outBlob[1] ?? 0n);
  if (!outPtr || outLen <= 0) {
    throw new Error("CryptUnprotectData returned empty master key");
  }

  try {
    const rawBuffer = toArrayBuffer(outPtr as unknown as never, 0, outLen);
    return new Uint8Array(rawBuffer).slice();
  } finally {
    kernel32.symbols.LocalFree(outPtr as unknown as never);
  }
}

/**
 * Compute Google's `SAPISIDHASH` authorization header value for `https://gemini.google.com`.
 */
export /* @__PURE__ */ function computeSapisidHash(
  sapisid: string,
  origin: string = DEFAULT_ORIGIN,
  timestampSec: number = Math.floor(Date.now() / 1000),
): string {
  const hasher = new Bun.CryptoHasher("sha1");
  hasher.update(`${timestampSec} ${sapisid} ${origin}`);
  const digestHex = hasher.digest("hex");
  return `SAPISIDHASH ${timestampSec}_${digestHex}`;
}

/**
 * Format a cookie map into a standard HTTP `Cookie:` request header string.
 */
export /* @__PURE__ */ function formatCookieHeader(
  cookies: Record<string, GeminiCookieEntry>,
  onlyGoogleMain: boolean = false,
): string {
  const preferredOrder = [
    "__Secure-1PSID",
    "__Secure-1PSIDTS",
    "__Secure-1PSIDCC",
    "__Secure-3PSID",
    "__Secure-3PSIDTS",
    "__Secure-3PSIDCC",
    "__Secure-1PAPISID",
    "__Secure-3PAPISID",
    "SAPISID",
    "APISID",
    "HSID",
    "SSID",
    "SID",
    "SIDCC",
    "NID",
    "COMPASS",
  ];

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const name of preferredOrder) {
    const entry = cookies[name];
    if (entry?.value) {
      parts.push(`${name}=${entry.value}`);
      seen.add(name);
    }
  }

  if (!onlyGoogleMain) {
    for (const [name, entry] of Object.entries(cookies)) {
      if (!seen.has(name) && entry.value) {
        parts.push(`${name}=${entry.value}`);
      }
    }
  }

  return parts.join("; ");
}

/**
 * Parse `Set-Cookie` headers from a `Response` and merge updated values into the cookie map.
 */
export function parseAndMergeSetCookieHeaders(
  setCookieHeaders: string[],
  existing: Record<string, GeminiCookieEntry>,
): { merged: Record<string, GeminiCookieEntry>; updatedNames: string[] } {
  const merged: Record<string, GeminiCookieEntry> = { ...existing };
  const updatedNames: string[] = [];
  const now = Date.now();

  for (const rawHeader of setCookieHeaders) {
    const segments = rawHeader.split(";").map((s) => s.trim());
    const first = segments[0];
    if (!first) continue;
    const eqIdx = first.indexOf("=");
    if (eqIdx <= 0) continue;

    const name = first.slice(0, eqIdx).trim();
    const value = first.slice(eqIdx + 1).trim();
    if (!name || !value || value === "deleted") continue;

    let domain = merged[name]?.domain ?? ".google.com";
    let path = merged[name]?.path ?? "/";
    let expiresUtc = merged[name]?.expiresUtc ?? 0;

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i]!;
      const lower = seg.toLowerCase();
      if (lower.startsWith("domain=")) {
        domain = seg.slice(7).trim();
      } else if (lower.startsWith("path=")) {
        path = seg.slice(5).trim();
      } else if (lower.startsWith("expires=")) {
        const parsedDate = Date.parse(seg.slice(8).trim());
        if (!Number.isNaN(parsedDate)) {
          expiresUtc = parsedDate;
        }
      }
    }

    if (
      TARGET_COOKIE_NAMES.has(name) ||
      name.startsWith("__Secure-") ||
      name.startsWith("__Host-")
    ) {
      merged[name] = {
        name,
        value,
        domain,
        path,
        expiresUtc,
        updatedAtMs: now,
      };
      updatedNames.push(name);
    }
  }

  return { merged, updatedNames };
}

/**
 * Extract and decrypt all Google/Gemini session cookies from the native Gemini Desktop
 * Electron profile (`C:\Users\aphro\AppData\Roaming\gemini`).
 */
export async function extractCookiesFromElectronProfile(
  userDataDir: string = DEFAULT_ELECTRON_USER_DATA,
): Promise<Record<string, GeminiCookieEntry>> {
  const localStatePath = `${userDataDir}/Local State`;
  const cookiesDbPath = `${userDataDir}/Network/Cookies`;

  if (
    !(await Bun.file(localStatePath).exists()) ||
    !(await Bun.file(cookiesDbPath).exists())
  ) {
    throw new Error(`Gemini Electron profile not found at ${userDataDir}`);
  }

  const localState = (await Bun.file(localStatePath).json()) as {
    os_crypt?: { encrypted_key?: string };
  };
  const encryptedKeyB64 = localState.os_crypt?.encrypted_key;
  if (!encryptedKeyB64) {
    throw new Error("Missing os_crypt.encrypted_key in Local State");
  }

  const encryptedKeyBytes = Buffer.from(encryptedKeyB64, "base64");
  const prefix = new TextDecoder().decode(encryptedKeyBytes.subarray(0, 5));
  if (prefix !== "DPAPI") {
    throw new Error(`Unexpected os_crypt key prefix: ${prefix}`);
  }

  const masterKey = dpapiUnprotect(
    new Uint8Array(encryptedKeyBytes.subarray(5)),
  );
  const aesKey = await crypto.subtle.importKey(
    "raw",
    masterKey as unknown as BufferSource,
    "AES-GCM",
    false,
    ["decrypt"],
  );

  using db = new Database(cookiesDbPath, { readonly: true });
  const metaRow = db
    .query("SELECT value FROM meta WHERE key = 'version'")
    .get() as { value?: string | number } | null;
  const dbVersion = Number(metaRow?.value ?? 24);

  const rows = db
    .query(
      "SELECT host_key, name, path, value, encrypted_value, expires_utc FROM cookies",
    )
    .all() as Array<{
    host_key: string;
    name: string;
    path: string;
    value: string;
    encrypted_value: Uint8Array;
    expires_utc: number;
  }>;

  const cookies: Record<string, GeminiCookieEntry> = {};
  const now = Date.now();

  for (const row of rows) {
    if (!TARGET_COOKIE_NAMES.has(row.name)) continue;

    let plainValue = row.value;
    if (
      !plainValue &&
      row.encrypted_value &&
      row.encrypted_value.byteLength > 15
    ) {
      const enc = new Uint8Array(row.encrypted_value);
      const versionTag = new TextDecoder().decode(enc.subarray(0, 3));
      if (versionTag === "v10" || versionTag === "v11") {
        const nonce = enc.subarray(3, 15);
        const ciphertextAndTag = enc.subarray(15);
        const decryptedBuf = new Uint8Array(
          await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: nonce as unknown as BufferSource },
            aesKey,
            ciphertextAndTag as unknown as BufferSource,
          ),
        );
        // Chromium Cookie DB version >= 24 prepends 32-byte SHA-256(host_key)
        const payloadBytes =
          dbVersion >= 24 && decryptedBuf.byteLength > 32
            ? decryptedBuf.subarray(32)
            : decryptedBuf;
        plainValue = new TextDecoder().decode(payloadBytes);
      }
    }

    if (plainValue) {
      cookies[row.name] = {
        name: row.name,
        value: plainValue,
        domain: row.host_key,
        path: row.path,
        expiresUtc: Number(row.expires_utc),
        updatedAtMs: now,
      };
    }
  }

  return cookies;
}

export class DurableGeminiCookieManager {
  private readonly repoRoot: string;
  private readonly vaultJsonPath: string;
  private readonly vaultSqlitePath: string;
  private readonly envFilePath: string;
  private vault: GeminiSessionVault | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(repoRoot: string = `${import.meta.dir}/../../..`) {
    this.repoRoot = repoRoot;
    this.vaultJsonPath = `${repoRoot}/config/secrets/gemini_session_cookies.json`;
    this.vaultSqlitePath = `${repoRoot}/config/secrets/gemini_cookies.sqlite`;
    this.envFilePath = `${repoRoot}/.env`;
  }

  public getVaultPath(): string {
    return this.vaultJsonPath;
  }

  /**
   * Import cookies from the Electron profile (or fallback to existing durable vault),
   * persist across all 4 durable tiers, and return the active vault.
   */
  public async importAndPersist(
    electronUserDataDir: string = DEFAULT_ELECTRON_USER_DATA,
  ): Promise<GeminiSessionVault> {
    let cookies: Record<string, GeminiCookieEntry> = {};
    let sourcePath = electronUserDataDir;

    try {
      cookies = await extractCookiesFromElectronProfile(electronUserDataDir);
    } catch {
      const existing = await this.loadFromVault();
      if (existing) {
        return existing;
      }
      sourcePath = "env-fallback";
    }

    const nowIso = new Date().toISOString();
    const vault: GeminiSessionVault = {
      importedAtIso: this.vault?.importedAtIso ?? nowIso,
      lastRefreshedAtIso: nowIso,
      sourcePath,
      refreshCount: this.vault?.refreshCount ?? 0,
      lastRotateStatus: this.vault?.lastRotateStatus ?? 200,
      hasValid1Psid: Boolean(cookies["__Secure-1PSID"]?.value),
      hasValid1PsidTs: Boolean(cookies["__Secure-1PSIDTS"]?.value),
      sapisidHashOrigin: DEFAULT_ORIGIN,
      snlm0eToken: this.vault?.snlm0eToken,
      cfb2hBuildLabel: this.vault?.cfb2hBuildLabel,
      cookies,
    };

    await this.saveToAllTiers(vault);
    return vault;
  }

  /**
   * Load the durable session vault from `config/secrets/gemini_session_cookies.json` or SQLite.
   */
  public async loadFromVault(): Promise<GeminiSessionVault | null> {
    if (this.vault) return this.vault;
    const file = Bun.file(this.vaultJsonPath);
    if (await file.exists()) {
      this.vault = (await file.json()) as GeminiSessionVault;
      return this.vault;
    }
    return null;
  }

  /**
   * Persist the session vault durably across:
   * 1. `config/secrets/gemini_session_cookies.json`
   * 2. `config/secrets/gemini_cookies.sqlite` (WAL mode)
   * 3. OS Credential Manager (`Bun.secrets`)
   * 4. `.env` (`GEMINI_1PSID`, `GEMINI_1PSIDTS`, `GEMINI_1PSIDCC`, `GEMINI_SAPISID`)
   */
  public async saveToAllTiers(vault: GeminiSessionVault): Promise<void> {
    this.vault = vault;

    // 1. JSON Vault
    await Bun.write(this.vaultJsonPath, `${JSON.stringify(vault, null, 2)}\n`);

    // 2. SQLite WAL Vault
    try {
      using db = new Database(this.vaultSqlitePath, { create: true });
      db.run("PRAGMA journal_mode = WAL;");
      db.run(`
        CREATE TABLE IF NOT EXISTS gemini_cookies (
          name TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          domain TEXT NOT NULL,
          path TEXT NOT NULL,
          expires_utc INTEGER NOT NULL,
          updated_at_ms INTEGER NOT NULL
        );
      `);
      const upsert = db.query(`
        INSERT OR REPLACE INTO gemini_cookies (name, value, domain, path, expires_utc, updated_at_ms)
        VALUES ($name, $value, $domain, $path, $expiresUtc, $updatedAtMs)
      `);
      for (const c of Object.values(vault.cookies)) {
        upsert.run({
          $name: c.name,
          $value: c.value,
          $domain: c.domain,
          $path: c.path,
          $expiresUtc: c.expiresUtc,
          $updatedAtMs: c.updatedAtMs,
        });
      }
    } catch {}

    // 3. OS Keychain (`Bun.secrets`)
    try {
      if (typeof Bun !== "undefined" && Bun.secrets) {
        const psid = vault.cookies["__Secure-1PSID"]?.value;
        const psidts = vault.cookies["__Secure-1PSIDTS"]?.value;
        if (psid) {
          await Bun.secrets.set({
            service: "aphrody-gemini-session",
            name: "__Secure-1PSID",
            value: psid,
          });
        }
        if (psidts) {
          await Bun.secrets.set({
            service: "aphrody-gemini-session",
            name: "__Secure-1PSIDTS",
            value: psidts,
          });
        }
      }
    } catch {}

    // 4. Synchronize `.env` keys without disturbing existing entries
    await this.syncDotEnv(vault);
  }

  private async syncDotEnv(vault: GeminiSessionVault): Promise<void> {
    const psid = vault.cookies["__Secure-1PSID"]?.value ?? "";
    const psidts = vault.cookies["__Secure-1PSIDTS"]?.value ?? "";
    const psidcc = vault.cookies["__Secure-1PSIDCC"]?.value ?? "";
    const sapisid =
      vault.cookies["SAPISID"]?.value ??
      vault.cookies["__Secure-1PAPISID"]?.value ??
      "";
    if (!psid) return;

    // Update current process env immediately
    process.env.GEMINI_1PSID = psid;
    process.env.GEMINI_1PSIDTS = psidts;
    process.env.GEMINI_1PSIDCC = psidcc;
    process.env.GEMINI_SAPISID = sapisid;

    const envFile = Bun.file(this.envFilePath);
    let content = (await envFile.exists()) ? await envFile.text() : "";
    const updates: Record<string, string> = {
      GEMINI_1PSID: psid,
      GEMINI_1PSIDTS: psidts,
      GEMINI_1PSIDCC: psidcc,
      GEMINI_SAPISID: sapisid,
    };

    for (const [key, val] of Object.entries(updates)) {
      if (!val) continue;
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${val}`);
      } else {
        content = `${content.trimEnd()}\n${key}=${val}\n`;
      }
    }
    await Bun.write(this.envFilePath, content);
  }

  /**
   * Perform a live Google Accounts Cookie Rotation (`POST https://accounts.google.com/RotateCookies`)
   * and Gemini Web App session handshake (`GET https://gemini.google.com/app`),
   * merging all refreshed `Set-Cookie` tokens and persisting them durably.
   */
  public async refreshSessionCookies(): Promise<{
    readonly ok: boolean;
    readonly rotateHttpStatus: number;
    readonly appHttpStatus: number;
    readonly updatedCookies: string[];
    readonly hasSnlm0eToken: boolean;
    readonly vault: GeminiSessionVault;
  }> {
    let current = await this.loadFromVault();
    if (!current || !current.hasValid1Psid) {
      current = await this.importAndPersist();
    }

    // Also check if Electron's Cookies DB has a newer __Secure-1PSIDTS on disk
    try {
      const diskCookies = await extractCookiesFromElectronProfile();
      for (const [name, entry] of Object.entries(diskCookies)) {
        if (!current.cookies[name]) {
          current.cookies[name] = entry;
        }
      }
    } catch {}

    const cookieHeader = formatCookieHeader(current.cookies);
    const allUpdatedNames = new Set<string>();
    let mergedCookies = { ...current.cookies };
    let rotateHttpStatus = 0;
    let appHttpStatus = 0;
    let snlm0eToken = current.snlm0eToken;
    let cfb2hBuildLabel = current.cfb2hBuildLabel;

    // 1. Call Google Accounts RotateCookies endpoint to rotate __Secure-1PSIDTS & __Secure-1PSIDCC
    try {
      const rotateResp = await fetch(
        "https://accounts.google.com/RotateCookies",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
            Origin: "https://accounts.google.com",
            Referer: "https://accounts.google.com/",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify([655, "-0000000000000000000"]),
          redirect: "manual",
        },
      );
      rotateHttpStatus = rotateResp.status;
      const setCookies = rotateResp.headers.getSetCookie?.() ?? [];
      if (setCookies.length > 0) {
        const res = parseAndMergeSetCookieHeaders(setCookies, mergedCookies);
        mergedCookies = res.merged;
        for (const n of res.updatedNames) allUpdatedNames.add(n);
      }
    } catch {}

    // 2. Call https://gemini.google.com/app to harvest COMPASS / __Secure-1PSIDCC & SNlM0e token
    try {
      const updatedHeader = formatCookieHeader(mergedCookies);
      const appResp = await fetch("https://gemini.google.com/app", {
        method: "GET",
        headers: {
          Cookie: updatedHeader,
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-User": "?1",
          "Sec-Fetch-Dest": "document",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
      });
      appHttpStatus = appResp.status;
      const setCookies = appResp.headers.getSetCookie?.() ?? [];
      if (setCookies.length > 0) {
        const res = parseAndMergeSetCookieHeaders(setCookies, mergedCookies);
        mergedCookies = res.merged;
        for (const n of res.updatedNames) allUpdatedNames.add(n);
      }

      const html = await appResp.text();
      const snlmMatch = /SNlM0e["\\]*:\s*["\\]*([^"\\]+)/.exec(html);
      if (snlmMatch?.[1]) {
        snlm0eToken = snlmMatch[1];
      }
      const cfbMatch = /cfb2h["\\]*:\s*["\\]*([^"\\]+)/.exec(html);
      if (cfbMatch?.[1]) {
        cfb2hBuildLabel = cfbMatch[1];
      }
    } catch {}

    const nextVault: GeminiSessionVault = {
      importedAtIso: current.importedAtIso,
      lastRefreshedAtIso: new Date().toISOString(),
      sourcePath: current.sourcePath,
      refreshCount: current.refreshCount + 1,
      lastRotateStatus: rotateHttpStatus || appHttpStatus || 200,
      hasValid1Psid: Boolean(mergedCookies["__Secure-1PSID"]?.value),
      hasValid1PsidTs: Boolean(mergedCookies["__Secure-1PSIDTS"]?.value),
      sapisidHashOrigin: DEFAULT_ORIGIN,
      snlm0eToken,
      cfb2hBuildLabel,
      cookies: mergedCookies,
    };

    await this.saveToAllTiers(nextVault);

    return {
      ok: nextVault.hasValid1Psid && nextVault.hasValid1PsidTs,
      rotateHttpStatus,
      appHttpStatus,
      updatedCookies: Array.from(allUpdatedNames),
      hasSnlm0eToken: Boolean(snlm0eToken),
      vault: nextVault,
    };
  }

  /**
   * Build ready-to-use authenticated HTTP headers (`Cookie`, `Authorization: SAPISIDHASH`, `X-Same-Domain`)
   * for any direct Gemini Web / Internal RPC request.
   */
  public getAuthenticatedRequestHeaders(
    origin: string = DEFAULT_ORIGIN,
  ): Record<string, string> {
    const cookies = this.vault?.cookies ?? {};
    const cookieHeader = formatCookieHeader(cookies);
    const sapisid =
      cookies["SAPISID"]?.value ?? cookies["__Secure-1PAPISID"]?.value ?? "";
    const headers: Record<string, string> = {
      Cookie: cookieHeader,
      Origin: origin,
      Referer: `${origin}/`,
      "User-Agent": USER_AGENT,
      "X-Same-Domain": "1",
    };
    if (sapisid) {
      headers.Authorization = computeSapisidHash(sapisid, origin);
    }
    return headers;
  }

  /**
   * Return a redacted public status summary safe for API responses and logs.
   */
  public getRedactedStatus() {
    const cookies = this.vault?.cookies ?? {};
    const cookieSummaries = Object.values(cookies).map((c) => ({
      name: c.name,
      domain: c.domain,
      valueLength: c.value.length,
      preview:
        c.value.length > 8
          ? `${c.value.slice(0, 4)}...${c.value.slice(-4)}`
          : "***",
      updatedAtMs: c.updatedAtMs,
    }));

    return {
      importedAtIso: this.vault?.importedAtIso ?? null,
      lastRefreshedAtIso: this.vault?.lastRefreshedAtIso ?? null,
      refreshCount: this.vault?.refreshCount ?? 0,
      lastRotateStatus: this.vault?.lastRotateStatus ?? 0,
      hasValid1Psid: Boolean(cookies["__Secure-1PSID"]?.value),
      hasValid1PsidTs: Boolean(cookies["__Secure-1PSIDTS"]?.value),
      hasSapisid: Boolean(
        cookies["SAPISID"]?.value || cookies["__Secure-1PAPISID"]?.value,
      ),
      hasSnlm0eToken: Boolean(this.vault?.snlm0eToken),
      cfb2hBuildLabel: this.vault?.cfb2hBuildLabel ?? null,
      totalCookiesStored: cookieSummaries.length,
      autoRefreshActive: this.refreshTimer !== null,
      cookies: cookieSummaries,
    };
  }

  /**
   * Start background auto-refresh timer (default: every 9 minutes = 540,000 ms).
   */
  public startAutoRefreshDaemon(intervalMs: number = 540_000): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      void this.refreshSessionCookies();
    }, intervalMs);
    if (typeof this.refreshTimer.unref === "function") {
      this.refreshTimer.unref();
    }
  }

  public stopAutoRefreshDaemon(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
