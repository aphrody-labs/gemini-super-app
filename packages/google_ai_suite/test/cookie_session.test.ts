import { describe, expect, test } from "bun:test";
import {
  computeSapisidHash,
  DurableGeminiCookieManager,
} from "../src/cookie_session";

describe("DurableGeminiCookieManager (DPAPI + AES-GCM + RotateCookies Auto-Refresh)", () => {
  test("imports real Gemini session cookies from Electron profile, persists to all tiers, and executes live auto-refresh", async () => {
    const manager = new DurableGeminiCookieManager();

    // 1. Import and decrypt real cookies from C:\Users\aphro\AppData\Roaming\gemini\Network\Cookies
    const vault = await manager.importAndPersist();
    expect(vault.hasValid1Psid).toBe(true);
    expect(vault.hasValid1PsidTs).toBe(true);
    expect(Object.keys(vault.cookies).length).toBeGreaterThanOrEqual(15);

    // 2. Verify SAPISIDHASH generation
    const headers = manager.getAuthenticatedRequestHeaders();
    expect(headers.Cookie).toContain("__Secure-1PSID=");
    expect(headers.Cookie).toContain("__Secure-1PSIDTS=");
    expect(headers.Authorization).toStartWith("SAPISIDHASH ");

    const hashSample = computeSapisidHash(
      "test_sapisid",
      "https://gemini.google.com",
      1730460000,
    );
    expect(hashSample).toStartWith("SAPISIDHASH 1730460000_");

    // 3. Execute live RotateCookies + gemini.google.com/app auto-refresh
    const refreshResult = await manager.refreshSessionCookies();
    expect(refreshResult.ok).toBe(true);
    expect(refreshResult.vault.refreshCount).toBeGreaterThanOrEqual(1);

    const status = manager.getRedactedStatus();
    console.log(
      "Gemini Session Cookie Status:",
      JSON.stringify(
        {
          totalCookiesStored: status.totalCookiesStored,
          hasValid1Psid: status.hasValid1Psid,
          hasValid1PsidTs: status.hasValid1PsidTs,
          hasSapisid: status.hasSapisid,
          hasSnlm0eToken: status.hasSnlm0eToken,
          cfb2hBuildLabel: status.cfb2hBuildLabel,
          refreshCount: status.refreshCount,
          rotateHttpStatus: refreshResult.rotateHttpStatus,
          appHttpStatus: refreshResult.appHttpStatus,
          updatedCookies: refreshResult.updatedCookies,
        },
        null,
        2,
      ),
    );

    // 4. Verify auto-refresh daemon lifecycle
    manager.startAutoRefreshDaemon(540_000);
    expect(manager.getRedactedStatus().autoRefreshActive).toBe(true);
    manager.stopAutoRefreshDaemon();
    expect(manager.getRedactedStatus().autoRefreshActive).toBe(false);
  }, 25000);
});
