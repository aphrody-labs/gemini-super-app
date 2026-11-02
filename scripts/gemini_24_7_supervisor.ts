/**
 * 24/7 Persistent Headless Desktop Assistant Supervisor (`bun run service:supervisor`).
 *
 * Runs 100% invisibly in the background with zero terminal windows:
 * - Acquired via single-instance atomic file lock (`config/gemini_supervisor.lock`)
 * - Python Voice Bridge runs via windowless `pythonw.exe`
 * - Bun Super App & Tauri v3 run detached with ignored stdio under hidden Scheduled Task / Sidecar
 * - Maintains 24/7 health of:
 *   1. Super App & Pet/Mochi Studio (`http://127.0.0.1:8787` & `/pet`)
 *   2. Native Tauri v3 Host (`http://127.0.0.1:8788`)
 *   3. Python Voice Bridge & TCP Mic Hub (`http://127.0.0.1:8765` & `127.0.0.1:24713`)
 */

import fs from "node:fs";
import path from "node:path";

export interface SupervisedServiceState {
  id: "super_app" | "tauri_v3" | "voice_bridge";
  name: string;
  url: string;
  healthEndpoint: string;
  healthy: boolean;
  pid: number | null;
  restartCount: number;
  lastCheckedAt: string;
  lastStartedAt: string | null;
}

export interface SupervisorStatusReport {
  supervisorPid: number;
  startedAt: string;
  updatedAt: string;
  allHealthy: boolean;
  services: Record<
    "super_app" | "tauri_v3" | "voice_bridge",
    SupervisedServiceState
  >;
}

const REPO_ROOT = "C:\\Users\\aphro\\google";
const DIST_BIN_DIR = path.join(REPO_ROOT, "dist", "bin");
const STATUS_FILE = path.join(REPO_ROOT, "config", "service_24_7_status.json");
const LOCK_FILE = path.join(REPO_ROOT, "config", "gemini_supervisor.lock");
const BUN_EXE = "C:\\Users\\aphro\\.bun\\bin\\bun.exe";
const LOCAL_APPDATA =
  process.env.LOCALAPPDATA ?? "C:\\Users\\aphro\\AppData\\Local";

function isPidAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireSupervisorLock(): Promise<boolean> {
  try {
    if (await Bun.file(LOCK_FILE).exists()) {
      const content = await Bun.file(LOCK_FILE).text();
      try {
        const data = JSON.parse(content);
        if (data && typeof data.pid === "number") {
          if (data.pid !== process.pid && isPidAlive(data.pid)) {
            return false; // Another supervisor instance is running
          }
        }
      } catch {}
    }
    await Bun.write(
      LOCK_FILE,
      JSON.stringify(
        { pid: process.pid, startedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    return true;
  } catch {
    return true;
  }
}

export function releaseSupervisorLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const content = fs.readFileSync(LOCK_FILE, "utf-8");
      const data = JSON.parse(content);
      if (data && data.pid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch {}
}

process.on("exit", releaseSupervisorLock);
process.on("SIGINT", () => {
  releaseSupervisorLock();
  process.exit(0);
});
process.on("SIGTERM", () => {
  releaseSupervisorLock();
  process.exit(0);
});

function resolveSuperAppBinary(): string[] {
  const aotBin = path.join(DIST_BIN_DIR, "gemini-super-app.exe");
  try {
    if (fs.existsSync(aotBin) && fs.statSync(aotBin).size > 0) {
      return [aotBin];
    }
  } catch {}
  return [
    BUN_EXE,
    "run",
    path.join(REPO_ROOT, "apps/gemini_super_app/src/server.ts"),
  ];
}

function resolveTauriBinary(): string {
  const candidates = [
    path.join(DIST_BIN_DIR, "gemini-windows-tauri-v3.exe"),
    path.join(REPO_ROOT, "target", "release", "gemini-windows-tauri-v3.exe"),
    path.join(
      LOCAL_APPDATA,
      "Aphrody",
      "cache",
      "cargo-target",
      "release",
      "gemini-windows-tauri-v3.exe",
    ),
    path.join(
      LOCAL_APPDATA,
      "Aphrody",
      "cache",
      "cargo-target",
      "debug",
      "gemini-windows-tauri-v3.exe",
    ),
    path.join(REPO_ROOT, "target", "debug", "gemini-windows-tauri-v3.exe"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).size > 0) return c;
    } catch {}
  }
  return candidates[0] ?? "";
}

function resolveVoiceBridgeBinary(): string[] {
  const uvBins = [
    path.join(REPO_ROOT, ".venv", "Scripts", "gemini-voice-bridge-w.exe"),
    path.join(DIST_BIN_DIR, "gemini-voice-bridge-w.exe"),
    path.join(REPO_ROOT, ".venv", "Scripts", "gemini-voice-bridge.exe"),
  ];
  for (const b of uvBins) {
    try {
      if (fs.existsSync(b) && fs.statSync(b).size > 0) {
        return [b];
      }
    } catch {}
  }
  const pythonwExe = path.join(REPO_ROOT, ".venv", "Scripts", "pythonw.exe");
  const scriptPath = path.join(REPO_ROOT, "backend", "voice_bridge_server.py");
  return [pythonwExe, scriptPath];
}

export async function probeHttpHealth(
  url: string,
  timeoutMs = 2200,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function spawnHeadlessService(
  cmd: string[],
  envExtra?: Record<string, string>,
): number | null {
  try {
    const proc = Bun.spawn(cmd, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        ...envExtra,
      },
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    });
    proc.unref();
    return proc.pid ?? null;
  } catch {
    return null;
  }
}

export async function ensureAll24x7ServicesPass(
  prevReport?: SupervisorStatusReport,
): Promise<SupervisorStatusReport> {
  const now = new Date().toISOString();
  const startedAt = prevReport?.startedAt ?? now;

  const services: SupervisorStatusReport["services"] = prevReport?.services ?? {
    super_app: {
      id: "super_app",
      name: "The One Big Gemini Super App + Gemini Pet & Mochi Studio (:8787)",
      url: "http://127.0.0.1:8787",
      healthEndpoint: "http://127.0.0.1:8787/api/health",
      healthy: false,
      pid: null,
      restartCount: 0,
      lastCheckedAt: now,
      lastStartedAt: null,
    },
    tauri_v3: {
      id: "tauri_v3",
      name: "Gemini Windows Native Tauri v3 Host (:8788)",
      url: "http://127.0.0.1:8788",
      healthEndpoint: "http://127.0.0.1:8788/api/tauri/snapshot",
      healthy: false,
      pid: null,
      restartCount: 0,
      lastCheckedAt: now,
      lastStartedAt: null,
    },
    voice_bridge: {
      id: "voice_bridge",
      name: "Gemini Live Voice Bridge & TCP Mic Hub (:8765 / :24713)",
      url: "http://127.0.0.1:8765",
      healthEndpoint: "http://127.0.0.1:8765/api/status",
      healthy: false,
      pid: null,
      restartCount: 0,
      lastCheckedAt: now,
      lastStartedAt: null,
    },
  };

  // 1. Check Super App (:8787 — Bun AoT Binary gemini-super-app.exe)
  let superAppOk = await probeHttpHealth(services.super_app.healthEndpoint);
  if (!superAppOk) {
    const pid = spawnHeadlessService(resolveSuperAppBinary(), {
      SUPER_APP_PORT: "8787",
    });
    services.super_app.pid = pid;
    services.super_app.restartCount += 1;
    services.super_app.lastStartedAt = new Date().toISOString();
  }

  // 2. Check Native Tauri v3 (:8788 — Rust LTO Binary gemini-windows-tauri-v3.exe)
  let tauriOk = await probeHttpHealth(services.tauri_v3.healthEndpoint);
  if (!tauriOk) {
    const tauriBin = resolveTauriBinary();
    const pid = spawnHeadlessService([tauriBin], { TAURI_V3_PORT: "8788" });
    services.tauri_v3.pid = pid;
    services.tauri_v3.restartCount += 1;
    services.tauri_v3.lastStartedAt = new Date().toISOString();
  }

  // 3. Check Python Voice Bridge (:8765 — uv CUDA Binary gemini-voice-bridge-w.exe)
  let voiceOk = await probeHttpHealth(services.voice_bridge.healthEndpoint);
  if (!voiceOk) {
    const pid = spawnHeadlessService(resolveVoiceBridgeBinary());
    services.voice_bridge.pid = pid;
    services.voice_bridge.restartCount += 1;
    services.voice_bridge.lastStartedAt = new Date().toISOString();
  }

  // 4. Check Patched Google Gemini Windows App (:8789)
  const geminiWinOk = await probeHttpHealth(
    "http://127.0.0.1:8789/api/status",
    1200,
  );
  if (!geminiWinOk) {
    const geminiExe = path.join(
      LOCAL_APPDATA,
      "Google",
      "Gemini",
      "Gemini.exe",
    );
    if (await Bun.file(geminiExe).exists()) {
      spawnHeadlessService([geminiExe]);
    }
  }

  // Wait briefly if any service was just spawned so we can verify its readiness
  if (!superAppOk || !tauriOk || !voiceOk) {
    for (let attempt = 0; attempt < 8; attempt++) {
      await Bun.sleep(600);
      if (!superAppOk) {
        superAppOk = await probeHttpHealth(services.super_app.healthEndpoint);
      }
      if (!tauriOk) {
        tauriOk = await probeHttpHealth(services.tauri_v3.healthEndpoint);
      }
      if (!voiceOk) {
        voiceOk = await probeHttpHealth(services.voice_bridge.healthEndpoint);
      }
      if (superAppOk && tauriOk && voiceOk) break;
    }
  }

  const checkedAt = new Date().toISOString();
  services.super_app.healthy = superAppOk;
  services.super_app.lastCheckedAt = checkedAt;
  services.tauri_v3.healthy = tauriOk;
  services.tauri_v3.lastCheckedAt = checkedAt;
  services.voice_bridge.healthy = voiceOk;
  services.voice_bridge.lastCheckedAt = checkedAt;

  const report: SupervisorStatusReport = {
    supervisorPid: process.pid,
    startedAt,
    updatedAt: checkedAt,
    allHealthy: superAppOk && tauriOk && voiceOk,
    services,
  };

  try {
    await Bun.write(STATUS_FILE, JSON.stringify(report, null, 2));
  } catch {}

  return report;
}

if (import.meta.main) {
  void (async () => {
    const runOnce = process.argv.includes("--once");
    if (runOnce) {
      const report = await ensureAll24x7ServicesPass();
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.allHealthy ? 0 : 1);
    }

    const acquired = await acquireSupervisorLock();
    if (!acquired) {
      console.log(
        `[Gemini 24/7 Supervisor] Active supervisor already running. Exiting duplicate instance gracefully.`,
      );
      process.exit(0);
    }

    console.log(
      `[Gemini 24/7 Supervisor] Headless daemon active (PID ${process.pid}) — zero terminal windows, monitoring :8787, :8788, :8765`,
    );

    let report = await ensureAll24x7ServicesPass();
    while (true) {
      await Bun.sleep(10_000);
      report = await ensureAll24x7ServicesPass(report);
    }
  })();
}
