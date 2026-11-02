/**
 * Gemini Windows App ASAR Patcher & Native Tauri v3 Sync CLI (`bun run patch:gemini`).
 *
 * 1. Verifies the extracted & upgraded ASAR payloads in `apps/gemini_windows_patcher/asar_extracted`:
 *    - `src/voice_bridge_native.js` (Bridges `:8765` Voice Hub, `:8787` Super App & `/pet`, `:8788` Tauri v3, `:24713` Mic TCP)
 *    - `src/top_bar/top_bar.html` & `top_bar_preload.js` (`/voice Live`, `● Record (STC)`, `🐾 Pet`, `Hub`)
 *    - `src/stc/stc_pill.html` & `src/preload.js`
 * 2. Runs `uv run python scripts/patch_and_pilot_gemini_windows.py --install` to repack
 *    `%LOCALAPPDATA%\Google\Gemini\app-1.17.0\resources\app.asar` with valid SHA-256 integrity blocks.
 * 3. Verifies the native Rust Tauri v3 binary (`gemini-windows-tauri-v3.exe`) is compiled and ready.
 */

import path from "node:path";

export interface GeminiPatcherReport {
  ok: boolean;
  timestamp: string;
  asarPath: string;
  asarExists: boolean;
  asarSizeBytes: number;
  backupAsarExists: boolean;
  tauriBinaryPath: string;
  tauriBinaryExists: boolean;
  patchedFilesVerified: string[];
  installOutput: string;
}

export async function runGeminiDesktopPatcher(options?: {
  repoRoot?: string;
  skipRepack?: boolean;
}): Promise<GeminiPatcherReport> {
  const repoRoot =
    options?.repoRoot ?? path.resolve(import.meta.dir, "../../..");
  const localAppData =
    process.env.LOCALAPPDATA ?? "C:\\Users\\aphro\\AppData\\Local";
  const geminiAppDir = path.join(
    localAppData,
    "Google",
    "Gemini",
    "app-1.17.0",
  );
  const asarPath = path.join(geminiAppDir, "resources", "app.asar");
  const backupAsarPath = path.join(geminiAppDir, "resources", "app.asar.bak");

  const tauriBinCandidates = [
    path.join(
      localAppData,
      "Aphrody",
      "cache",
      "cargo-target",
      "debug",
      "gemini-windows-tauri-v3.exe",
    ),
    path.join(repoRoot, "target", "debug", "gemini-windows-tauri-v3.exe"),
  ];
  let tauriBinaryPath = tauriBinCandidates[0] ?? "";
  let tauriBinaryExists = false;
  for (const cand of tauriBinCandidates) {
    if (await Bun.file(cand).exists()) {
      tauriBinaryPath = cand;
      tauriBinaryExists = true;
      break;
    }
  }

  const requiredFiles = [
    "apps/gemini_windows_patcher/asar_extracted/src/voice_bridge_native.js",
    "apps/gemini_windows_patcher/asar_extracted/src/top_bar/top_bar.html",
    "apps/gemini_windows_patcher/asar_extracted/src/top_bar/top_bar_preload.js",
    "apps/gemini_windows_patcher/asar_extracted/src/stc/stc_pill.html",
    "apps/gemini_voice_extension/content.js",
  ];

  const patchedFilesVerified: string[] = [];
  for (const rel of requiredFiles) {
    const abs = path.join(repoRoot, rel);
    if (await Bun.file(abs).exists()) {
      patchedFilesVerified.push(rel);
    }
  }

  let installOutput = "skipped";
  const asarFile = Bun.file(asarPath);
  const asarExistsBefore = await asarFile.exists();

  if (!options?.skipRepack && asarExistsBefore) {
    const proc = Bun.spawn(
      [
        "uv",
        "run",
        "python",
        path.join(repoRoot, "scripts", "patch_and_pilot_gemini_windows.py"),
        "--install",
      ],
      {
        cwd: repoRoot,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    installOutput = `${stdout}\n${stderr}`.trim();
    if (exitCode !== 0) {
      throw new Error(
        `patch_and_pilot_gemini_windows.py --install failed (exit ${exitCode}): ${installOutput}`,
      );
    }
  }

  const finalAsarFile = Bun.file(asarPath);
  const asarExists = await finalAsarFile.exists();
  const asarSizeBytes = asarExists ? finalAsarFile.size : 0;
  const backupAsarExists = await Bun.file(backupAsarPath).exists();

  return {
    ok: patchedFilesVerified.length === requiredFiles.length,
    timestamp: new Date().toISOString(),
    asarPath,
    asarExists,
    asarSizeBytes,
    backupAsarExists,
    tauriBinaryPath,
    tauriBinaryExists,
    patchedFilesVerified,
    installOutput,
  };
}

if (import.meta.main) {
  const skipRepack = process.argv.includes("--verify-only");
  const report = await runGeminiDesktopPatcher({ skipRepack });
  console.log(JSON.stringify(report, null, 2));
}
