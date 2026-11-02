/**
 * Persistent 24/7 Headless Windows Service & Sidecar Manager (`scripts/setup_windows_persistent_service.ts`).
 *
 * Replaces ad-hoc scripts that pop up terminal windows with a true headless,
 * persistent, invisible Windows background process:
 *
 * 1. **Windows Persistent Scheduled Task (`\Aphrody\Aphrody Gemini Assistant 24x7`)**
 *    - Uses Windows Task Scheduler with `Settings.Hidden = $true` (completely invisible, 0 terminal windows).
 *    - Triggers at user logon (`AtLogon`), auto-restarts on failure (`RestartInterval = 1m`),
 *      runs with no execution time limit (`PT0S`), and ignores duplicate starts (`MultipleInstances: IgnoreNew`).
 * 2. **Antigravity Persistent Sidecar (`~/.gemini/config/sidecars/gemini-live-voice/sidecar.json`)**
 *    - Headless sidecar with `restart_policy: "always"`.
 * 3. **Single-Instance Mutex Lock (`config/gemini_supervisor.lock`)**
 *    - Prevents runaway duplicate supervisor processes.
 * 4. **Invisible Subprocess Spawning**
 *    - Uses `pythonw.exe` and detached background processes with ignored stdio so neither the supervisor
 *      nor its child services (:8787 Super App, :8788 Tauri v3, :8765 Voice Hub)
 *      ever open a visible terminal window on the desktop.
 */

import path from "node:path";
import {
  ensureAll24x7ServicesPass,
  type SupervisorStatusReport,
} from "./gemini_24_7_supervisor";

export interface PersistentAssistantReport {
  ok: boolean;
  timestamp: string;
  taskName: string;
  taskConfigured: boolean;
  sidecarConfigPath: string;
  sidecarConfigured: boolean;
  sessionHookPath: string;
  sessionHookConfigured: boolean;
  liveStatus: SupervisorStatusReport;
}

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const USER_HOME = process.env.USERPROFILE ?? "C:\\Users\\aphro";
const SIDECAR_PATH = path.join(
  USER_HOME,
  ".gemini",
  "config",
  "sidecars",
  "gemini-live-voice",
  "sidecar.json",
);
const HOOKS_PATH = path.join(REPO_ROOT, ".agents", "hooks.json");
const BUN_EXE = "C:\\Users\\aphro\\.bun\\bin\\bun.exe";
const SUPERVISOR_TS = path.join(
  REPO_ROOT,
  "scripts",
  "gemini_24_7_supervisor.ts",
);
const TASK_NAME = "Aphrody Gemini Assistant 24x7";
const TASK_PATH = "\\Aphrody\\";

export async function registerWindowsScheduledTask(): Promise<boolean> {
  const psScript = `
$action = New-ScheduledTaskAction -Execute '${BUN_EXE}' -Argument 'run "${SUPERVISOR_TS}"' -WorkingDirectory '${REPO_ROOT}'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden -ExecutionTimeLimit (New-TimeSpan -Days 0) -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$task = Register-ScheduledTask -TaskName '${TASK_NAME}' -TaskPath '${TASK_PATH}' -Action $action -Trigger $trigger -Settings $settings -Force
Start-ScheduledTask -TaskName '${TASK_NAME}' -TaskPath '${TASK_PATH}' -ErrorAction SilentlyContinue
`;

  try {
    const proc = Bun.spawn(
      ["powershell", "-NoProfile", "-NonInteractive", "-Command", psScript],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function configurePersistent24x7Assistant(): Promise<PersistentAssistantReport> {
  // 1. Configure Antigravity sidecar
  const sidecarConfig = {
    display_name:
      "Gemini 24/7 Super App, Live Voice Hub, Tauri v3 & OpenPets/Mochi Supervisor",
    description:
      "Headless persistent 24/7 desktop assistant supervisor maintaining Super App (:8787), Tauri v3 (:8788), and Voice Bridge (:8765 / :24713).",
    command: BUN_EXE,
    args: ["run", SUPERVISOR_TS],
    restart_policy: "always",
    env: {
      SUPER_APP_PORT: "8787",
      TAURI_V3_PORT: "8788",
      VOICE_BRIDGE_HOST: "127.0.0.1",
      VOICE_BRIDGE_PORT: "8765",
      ANTIGRAVITY_MIC_PORT: "24713",
      GOOGLE_CLOUD_PROJECT: "aphrody",
      GOOGLE_CLOUD_LOCATION: "us-central1",
      PYTHONUTF8: "1",
    },
  };

  await Bun.write(SIDECAR_PATH, `${JSON.stringify(sidecarConfig, null, 2)}\n`);
  const sidecarConfigured = await Bun.file(SIDECAR_PATH).exists();
  const sessionHookConfigured = await Bun.file(HOOKS_PATH).exists();

  // 2. Register native Windows Scheduled Task (Headless, AtLogon, Hidden)
  const taskConfigured = await registerWindowsScheduledTask();

  // 3. Verify live status
  const liveStatus = await ensureAll24x7ServicesPass();

  const report: PersistentAssistantReport = {
    ok: taskConfigured && sidecarConfigured && liveStatus.allHealthy,
    timestamp: new Date().toISOString(),
    taskName: `${TASK_PATH}${TASK_NAME}`,
    taskConfigured,
    sidecarConfigPath: SIDECAR_PATH,
    sidecarConfigured,
    sessionHookPath: HOOKS_PATH,
    sessionHookConfigured,
    liveStatus,
  };

  await Bun.write(
    path.join(REPO_ROOT, "config", "windows_persistent_service_report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  return report;
}

if (import.meta.main) {
  const report = await configurePersistent24x7Assistant();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
