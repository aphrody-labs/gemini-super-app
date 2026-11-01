/**
 * Gemini Session Cookie CLI & Auto-Refresh Daemon (`scripts/gemini_cookie_daemon.ts`).
 *
 * Usage:
 *   bun run scripts/gemini_cookie_daemon.ts import
 *   bun run scripts/gemini_cookie_daemon.ts refresh
 *   bun run scripts/gemini_cookie_daemon.ts status
 *   bun run scripts/gemini_cookie_daemon.ts daemon
 */

import { DurableGeminiCookieManager } from "@gemini-live/google-ai-suite";

const cmd = Bun.argv[2] ?? "refresh";
const manager = new DurableGeminiCookieManager();

if (cmd === "import") {
  await manager.importAndPersist();
  console.log(JSON.stringify(manager.getRedactedStatus(), null, 2));
} else if (cmd === "status") {
  await manager.loadFromVault();
  console.log(JSON.stringify(manager.getRedactedStatus(), null, 2));
} else if (cmd === "daemon") {
  await manager.importAndPersist();
  const initial = await manager.refreshSessionCookies();
  console.log(
    `[gemini-cookie-daemon] Active (${initial.vault.refreshCount} refreshes, ${Object.keys(initial.vault.cookies).length} cookies). Rotating every 9 minutes...`,
  );
  manager.startAutoRefreshDaemon(540_000);
  // Keep daemon alive
  await new Promise(() => {});
} else {
  await manager.importAndPersist();
  const res = await manager.refreshSessionCookies();
  console.log(
    JSON.stringify(
      {
        ok: res.ok,
        rotateHttpStatus: res.rotateHttpStatus,
        appHttpStatus: res.appHttpStatus,
        updatedCookies: res.updatedCookies,
        status: manager.getRedactedStatus(),
      },
      null,
      2,
    ),
  );
}
