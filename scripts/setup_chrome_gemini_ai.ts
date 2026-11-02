/**
 * @fileoverview Transforms Google Chrome 156 (`156.0.8078.76`) into an AI-Augmented Browser,
 * directly patches & links `resources.pak` + `Gemini.exe` (`app.asar`) + `agy` CLI without reinventing the wheel,
 * activates Chrome Web Apps (Desktop PWAs, Window Controls Overlay, Borderless, SubApps, TabStrip, WebMCP),
 * and compiles real native Win32 `.exe` applications (`#![windows_subsystem = "windows"]`) for all Google AI & Workspace sites.
 */

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runGeminiDesktopPatcher } from "../apps/gemini_windows_patcher/src/patch_gemini_desktop";
import { extractRealGeminiInChrome } from "./extract_gemini_in_chrome";

const LOCAL_APP_DATA =
  process.env.LOCALAPPDATA ?? "C:\\Users\\aphro\\AppData\\Local";
const APP_DATA = process.env.APPDATA ?? "C:\\Users\\aphro\\AppData\\Roaming";
const USER_DATA_DIR = join(LOCAL_APP_DATA, "Google", "Chrome", "User Data");
const LOCAL_STATE_PATH = join(USER_DATA_DIR, "Local State");
const DEFAULT_PREFS_PATH = join(USER_DATA_DIR, "Default", "Preferences");
const CHROME_EXE = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const REPO_ROOT = resolve(import.meta.dir, "..");
const VOICE_EXT_DIR = join(REPO_ROOT, "apps", "gemini_voice_extension");
const THEME_EXT_DIR = join(REPO_ROOT, "apps", "gemini_chrome_theme");
const WIN32_APPS_OUT_DIR = join(REPO_ROOT, "dist", "win32-google-apps");

export interface GoogleWin32AppSpec {
  readonly id: string;
  readonly exeName: string;
  readonly shortcutName: string;
  readonly appUserModelId: string;
  readonly url: string;
  readonly description: string;
}

export const GOOGLE_WIN32_APPS: readonly GoogleWin32AppSpec[] = [
  {
    id: "gemini",
    exeName: "GoogleGeminiWin32.exe",
    shortcutName: "Google Gemini (Win32 AI App).lnk",
    appUserModelId: "Google.Gemini.Win32App",
    url: "https://gemini.google.com/app",
    description:
      "Google Gemini Web + Native Gemini.exe (:8789) + Antigravity CLI (:8765) + WebMCP",
  },
  {
    id: "glic",
    exeName: "GeminiInChromeGlicWin32.exe",
    shortcutName: "Gemini in Chrome (Glic Native).lnk",
    appUserModelId: "Google.Chrome.GlicWin32",
    url: "http://127.0.0.1:8787/glic",
    description:
      "Native Gemini in Chrome (Glic) extracted from Chrome 156 resources.pak",
  },
  {
    id: "aistudio",
    exeName: "GoogleAIStudioWin32.exe",
    shortcutName: "Google AI Studio (Win32).lnk",
    appUserModelId: "Google.AIStudio.Win32App",
    url: "https://aistudio.google.com/prompts/new_chat",
    description:
      "Google AI Studio standalone Win32 application with WebMCP & Voice",
  },
  {
    id: "antigravity",
    exeName: "GoogleAntigravityWin32.exe",
    shortcutName: "Google Antigravity (Win32).lnk",
    appUserModelId: "Google.Antigravity.Win32App",
    url: "https://antigravity.google.com",
    description:
      "Google Antigravity Web + Local agy CLI & PC Filesystem Bridge",
  },
  {
    id: "notebooklm",
    exeName: "GoogleNotebookLMWin32.exe",
    shortcutName: "Google NotebookLM (Win32).lnk",
    appUserModelId: "Google.NotebookLM.Win32App",
    url: "https://notebooklm.google.com",
    description: "Google NotebookLM standalone Win32 application",
  },
  {
    id: "ytmusic",
    exeName: "YouTubeMusicWin32.exe",
    shortcutName: "YouTube Music (Win32).lnk",
    appUserModelId: "Google.YouTubeMusic.Win32App",
    url: "https://music.youtube.com",
    description:
      "YouTube Music Desktop Win32 application with Gemini Live Auto-Ducking",
  },
  {
    id: "docs",
    exeName: "GoogleDocsWin32.exe",
    shortcutName: "Google Docs (Win32).lnk",
    appUserModelId: "Google.Docs.Win32App",
    url: "https://docs.google.com",
    description: "Google Docs standalone Win32 application",
  },
  {
    id: "drive",
    exeName: "GoogleDriveWin32.exe",
    shortcutName: "Google Drive (Win32).lnk",
    appUserModelId: "Google.Drive.Win32App",
    url: "https://drive.google.com",
    description: "Google Drive standalone Win32 application",
  },
  {
    id: "gmail",
    exeName: "GoogleGmailWin32.exe",
    shortcutName: "Google Gmail (Win32).lnk",
    appUserModelId: "Google.Gmail.Win32App",
    url: "https://mail.google.com",
    description: "Google Gmail standalone Win32 application",
  },
];

/**
 * Complete Chrome 156 AI, Glic, WebMCP, and Desktop Web Apps (PWA / Win32) flag identifiers
 */
export const CHROME_AI_AND_REDESIGN_FLAGS: readonly string[] = [
  // 1. Gemini in Chrome (Glic) Core & Agentic Actuation
  "enable-glic@1",
  "glic@1",
  "glic-actor@1",
  "glic-actor-autofill@1",
  "glic-actor-cursor@1",
  "glic-actor-script-tools@1",
  "glic-actor-ui-border-glow@1",
  "glic-actor-ui-handoff-button@1",
  "glic-actor-ui-tab-indicator@1",
  "glic-actor-ui-task-icon@1",
  "glic-actor-ui-toast@1",
  "glic-always-show-web-actuation-toggle@1",
  "glic-always-skip-fre@1",
  "glic-automation@1",
  "glic-background-actuation@1",
  "glic-background-triggering@1",
  "glic-capture-region@1",
  "glic-chrome-status-icon@1",
  "glic-context-menu-below-search@1",
  "glic-contextual-cue-bubble@1",
  "glic-daisy-chain-new-tabs@1",
  "glic-default-tab-context-setting@1",
  "glic-detaching@1",
  "glic-dev@1",
  "glic-experimental-opt-in@1",
  "glic-experimental-triggering@1",
  "glic-gemini-enterprise-consent-enabled@1",
  "glic-gemini-enterprise-settings-enabled@1",
  "glic-gemini-enterprise-settings-override@1",
  "glic-horizontal-tab-toolbar-button@1",
  "glic-inline-prompt@1",
  "glic-inline-prompt-file@1",
  "glic-live-mode-only-glow@2",
  "glic-multi-instance@1",
  "glic-open-on-startup@1",
  "glic-pdf-summarize@1",
  "glic-pre-warming@1",
  "glic-print-menu-item@1",
  "glic-proactive-nudge-debug@1",
  "glic-scroll-to-pdf@1",
  "glic-share-image@1",
  "glic-side-panel-unified-header@1",
  "glic-summarize-video-suggestion@1",
  "glic-tab-focus-frame@1",
  "glic-tab-groups@1",
  "glic-trust-first-onboarding@1",
  "glic-user-resize@1",
  "glic-voice@1",
  "glic-warm-standby@1",
  "glic-web-actuation-setting@1",
  "glic-web-contents-warming@1",
  "glic-z-order-changes@1",
  "glic-zero-state-suggestions@1",
  "password-change-with-glic@1",
  "enable-browser-actuator-for-glic-experimental-triggering@1",

  // 2. WebMCP & Agentic Tool Execution
  "enable-webmcp-testing@1",

  // 3. Chrome Web Apps (Desktop PWAs, Borderless Win32, Window Controls Overlay, SubApps, TabStrip, IWAs)
  "enable-desktop-pwas-additional-windowing-controls@1",
  "enable-desktop-pwas-borderless@1",
  "enable-desktop-pwas-sub-apps@1",
  "enable-desktop-pwas-tab-strip@1",
  "enable-desktop-pwas-tab-strip-customizations@1",
  "enable-desktop-pwas-tab-strip-settings@1",
  "enable-desktop-pwas-elided-extensions-menu@1",
  "enable-isolated-web-apps@1",
  "enable-isolated-web-app-dev-mode@1",

  // 4. Chrome NTP Composebox, Help Me Write & Gemini Thread Sync
  "ntp-composebox@1",
  "context-management-in-composebox@1",
  "composebox-uses-chrome-compose-client@1",
  "omnibox-zero-suggest-prefetching-for-composebox@1",
  "chrome-compose@1",
  "chrome-cobrowse-compose@1",
  "sync-gemini-threads@1",

  // 5. Built-in On-Device Gemini Nano APIs (LanguageModel, Summarizer, Writer, Rewriter, Translator, Proofreader)
  "optimization-guide-on-device-model@1",
  "prompt-api-for-gemini-nano@1",
  "prompt-api-for-gemini-nano-multimodal-input@1",
  "summarization-api-for-gemini-nano@1",
  "summarizer-api-for-gemini-nano@1",
  "writer-api-for-gemini-nano@1",
  "rewriter-api-for-gemini-nano@1",
  "proofreader-api-for-gemini-nano@1",
  "language-detection-api@1",
  "translation-api@1",

  // 6. Google Lens Overlay & Visual AI Search
  "enable-lens-overlay@1",
  "enable-lens-overlay-updated-visuals@1",
  "enable-lens-overlay-translate-button@1",
  "enable-lens-overlay-image-context-menu-actions@1",
  "enable-lens-overlay-text-selection-context-menu-entrypoint@1",
  "lens-overlay-omnibox-entry-point@1",

  // 7. Chrome AI Theme Generator & Wallpaper Search Redesign
  "customize-chrome-wallpaper-search@1",
  "customize-chrome-wallpaper-search-button@1",
  "customize-chrome-wallpaper-search-inspiration-card@1",
  "ntp-wallpaper-search-button@1",
  "ntp-wallpaper-search-button-animation@1",
  "ntp-realbox-next@1",
  "omnibox-ml-url-scoring@1",
  "history-embeddings@1",
  "history-embeddings-answers@1",
] as const;

export const CHROME_CLI_ENABLE_FEATURES: readonly string[] = [
  "Glic",
  "GlicActor",
  "GlicVoice",
  "GlicWarming",
  "GlicWebContentsWarming",
  "GlicMultiInstance",
  "GlicDetaching",
  "GlicZOrderChanges",
  "GlicInlinePrompt",
  "GlicPdfSummarize",
  "GlicShareImage",
  "GlicZeroStateSuggestions",
  "WebMCP",
  "WebAppWindowControlsOverlay",
  "DesktopPWAsBorderless",
  "DesktopPWAsAdditionalWindowingControls",
  "DesktopPWAsSubApps",
  "DesktopPWAsTabStrip",
  "DesktopPWAsTabStripSettings",
  "IsolatedWebApps",
  "IsolatedWebAppDevMode",
  "NtpComposebox",
  "Compose",
  "PromptApiForGeminiNano",
  "PromptApiForGeminiNanoMultimodalInput",
  "AISummarizationAPI",
  "AIWriterAPI",
  "AIRewriterAPI",
  "LensOverlay",
  "CustomizeChromeWallpaperSearch",
  "HistoryEmbeddings",
  "HistoryEmbeddingsAnswers",
];

async function stopRunningChromeProcesses(): Promise<void> {
  const proc = Bun.spawn(
    [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  await proc.exited;
  await Bun.sleep(900);
}

async function applyWindowsChromeAiPolicies(): Promise<void> {
  const regCommands = [
    'New-Item -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Force | Out-Null',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "GeminiSettings" -Value 0 -Type DWord -Force',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "GenAiDefaultSettings" -Value 0 -Type DWord -Force',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "HelpMeWriteSettings" -Value 0 -Type DWord -Force',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "CreateThemesSettings" -Value 0 -Type DWord -Force',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "HistorySearchSettings" -Value 0 -Type DWord -Force',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "DevToolsGenAiSettings" -Value 0 -Type DWord -Force',
    'Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Google\\Chrome" -Name "TabCompareSettings" -Value 0 -Type DWord -Force',
  ].join("; ");

  const proc = Bun.spawn(
    [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      regCommands,
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  await proc.exited;
}

export async function configureChromeLocalState(
  localStatePath = LOCAL_STATE_PATH,
): Promise<{ enabledFlagsCount: number; countryUnlocked: string }> {
  const file = Bun.file(localStatePath);
  if (!(await file.exists())) {
    throw new Error(`Chrome Local State introuvable: ${localStatePath}`);
  }

  const rawText = await file.text();
  await Bun.write(`${localStatePath}.bak`, rawText);

  const state = JSON.parse(rawText) as Record<string, unknown>;
  const browser = (state.browser as Record<string, unknown> | undefined) ?? {};
  const existingFlags = Array.isArray(browser.enabled_labs_experiments)
    ? (browser.enabled_labs_experiments as string[])
    : [];

  const targetPrefixes = new Set(
    CHROME_AI_AND_REDESIGN_FLAGS.map((f) => f.split("@")[0] ?? f),
  );
  const preservedFlags = existingFlags.filter((f) => {
    const base = f.split("@")[0] ?? f;
    return !targetPrefixes.has(base);
  });

  const mergedFlags = [...preservedFlags, ...CHROME_AI_AND_REDESIGN_FLAGS];
  browser.enabled_labs_experiments = mergedFlags;
  state.browser = browser;

  state.variations_country = "us";
  const currentPerm = Array.isArray(
    state.variations_permanent_consistency_country,
  )
    ? (state.variations_permanent_consistency_country as string[])
    : ["156.0.8078.76", "us"];
  state.variations_permanent_consistency_country = [
    currentPerm[0] ?? "156.0.8078.76",
    "us",
  ];

  const glicGlobal = (state.glic as Record<string, unknown> | undefined) ?? {};
  glicGlobal.completed_fre = true;
  glicGlobal.launcher_enabled = true;
  glicGlobal.multi_profile_eligibility_known = true;
  glicGlobal.pinned_to_tabstrip = true;
  glicGlobal.experimental_triggering_enabled = true;
  glicGlobal.web_actuation_enabled = true;
  state.glic = glicGlobal;

  await Bun.write(localStatePath, JSON.stringify(state));
  return {
    enabledFlagsCount: mergedFlags.length,
    countryUnlocked: "us",
  };
}

export async function configureChromeProfilePreferences(
  prefsPath = DEFAULT_PREFS_PATH,
): Promise<{
  homepage: string;
  themeColorHex: string;
  glicReady: boolean;
  webAppsConfigured: number;
}> {
  const file = Bun.file(prefsPath);
  if (!(await file.exists())) {
    throw new Error(`Chrome Preferences introuvable: ${prefsPath}`);
  }

  const rawText = await file.text();
  await Bun.write(`${prefsPath}.bak`, rawText);

  const prefs = JSON.parse(rawText) as Record<string, unknown>;

  // 1. Unlock & Enable Gemini in Chrome (Glic) in Default Profile
  const glic = (prefs.glic as Record<string, unknown> | undefined) ?? {};
  glic.previously_not_allowed = false;
  glic.completed_fre = 1;
  glic.onboarding_status = 3;
  glic.pinned_to_tabstrip = true;
  glic.launcher_enabled = true;
  glic.default_tab_context_enabled = true;
  glic.microphone_allowed = true;
  glic.geolocation_allowed = true;
  glic.actuation_on_web = true;
  glic.tab_context_enabled = true;
  glic.profile_enablement = {
    ...(typeof glic.profile_enablement === "object" &&
    glic.profile_enablement !== null
      ? (glic.profile_enablement as Record<string, unknown>)
      : {}),
    last_ready_state: 1,
    feature_disabled_by_policy: false,
    not_rolled_out: false,
  };
  prefs.glic = glic;

  // 2. Grant native Win32/Hardware permissions (Mic, Notifications, Window Management, Clipboard, Local Fonts) to all Google AI origins
  const profile = (prefs.profile as Record<string, unknown> | undefined) ?? {};
  const contentSettings =
    (profile.content_settings as Record<string, unknown> | undefined) ?? {};
  const exceptions =
    (contentSettings.exceptions as Record<string, unknown> | undefined) ?? {};

  const trustedPatterns = [
    "https://[*.]google.com,*",
    "https://gemini.google.com,*",
    "https://aistudio.google.com,*",
    "https://antigravity.google.com,*",
    "https://notebooklm.google.com,*",
    "https://music.youtube.com,*",
    "http://127.0.0.1:8787,*",
    "http://127.0.0.1:8789,*",
    "http://127.0.0.1:8765,*",
  ];
  const permissionBuckets = [
    "media_stream_mic",
    "media_stream_camera",
    "notifications",
    "clipboard",
    "window_management",
    "local_fonts",
    "file_system_write_guard",
  ];
  for (const bucket of permissionBuckets) {
    const bucketObj =
      (exceptions[bucket] as Record<string, unknown> | undefined) ?? {};
    for (const pat of trustedPatterns) {
      bucketObj[pat] = {
        expiration: "0",
        last_modified: String(Date.now() * 1000),
        model: 0,
        setting: 1, // 1 = ALLOW
      };
    }
    exceptions[bucket] = bucketObj;
  }
  contentSettings.exceptions = exceptions;
  profile.content_settings = contentSettings;
  prefs.profile = profile;

  // 3. Register Chrome Web Apps metadata
  const webApps = (prefs.web_apps as Record<string, unknown> | undefined) ?? {};
  const installedMap: Record<string, unknown> = {};
  for (const app of GOOGLE_WIN32_APPS) {
    installedMap[app.id] = {
      name: app.shortcutName.replace(".lnk", ""),
      start_url: app.url,
      display_mode: "window-controls-overlay",
      borderless: true,
      app_user_model_id: app.appUserModelId,
      installed_by_gemini_super_app: true,
    };
  }
  webApps.gemini_win32_apps = installedMap;
  prefs.web_apps = webApps;

  // 4. Configure Gemini Homepage & Material 3 Dark Sparkle Theme
  const homepageUrl = "http://127.0.0.1:8787/chrome-home";
  prefs.homepage = homepageUrl;
  prefs.homepage_is_newtabpage = false;

  const browser = (prefs.browser as Record<string, unknown> | undefined) ?? {};
  browser.show_home_button = true;

  const theme = (browser.theme as Record<string, unknown> | undefined) ?? {};
  theme.color_scheme2 = 2;
  theme.color_variant2 = 1;
  theme.user_color2 = -5715974;
  theme.follows_system_colors = false;
  browser.theme = theme;
  prefs.browser = browser;

  const session = (prefs.session as Record<string, unknown> | undefined) ?? {};
  session.restore_on_startup = 4;
  session.startup_urls = [
    "http://127.0.0.1:8787/chrome-home",
    "http://127.0.0.1:8787/glic",
    "https://gemini.google.com/app",
  ];
  prefs.session = session;

  await Bun.write(prefsPath, JSON.stringify(prefs));
  return {
    homepage: homepageUrl,
    themeColorHex: "#A8C7FA (Material 3 Dark Sparkle)",
    glicReady: true,
    webAppsConfigured: GOOGLE_WIN32_APPS.length,
  };
}

/**
 * Compiles a genuine native Win32 GUI executable (`#![windows_subsystem = "windows"]`) via `rustc`
 * and creates standalone Win32 `.exe` binaries + Start Menu + Registry `App Paths` for all 9 Google sites.
 */
export async function buildAndRegisterGoogleWin32Apps(): Promise<{
  compiledExeCount: number;
  outputDir: string;
  executables: string[];
  startMenuDir: string;
}> {
  await mkdir(WIN32_APPS_OUT_DIR, { recursive: true });
  const rustSrcPath = join(WIN32_APPS_OUT_DIR, "win32_google_app_host.rs");
  const baseExePath = join(WIN32_APPS_OUT_DIR, "win32_google_app_host.exe");

  const rustCode = `#![windows_subsystem = "windows"]

use std::env;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::process::Command;

#[link(name = "shell32")]
unsafe extern "system" {
    fn SetCurrentProcessExplicitAppUserModelID(app_id: *const u16) -> i32;
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

fn resolve_target(exe_stem: &str) -> (&'static str, &'static str, bool) {
    let lower = exe_stem.to_ascii_lowercase();
    if lower.contains("glic") {
        ("Google.Chrome.GlicWin32", "http://127.0.0.1:8787/glic", true)
    } else if lower.contains("aistudio") {
        ("Google.AIStudio.Win32App", "https://aistudio.google.com/prompts/new_chat", false)
    } else if lower.contains("antigravity") {
        ("Google.Antigravity.Win32App", "https://antigravity.google.com", false)
    } else if lower.contains("notebooklm") {
        ("Google.NotebookLM.Win32App", "https://notebooklm.google.com", false)
    } else if lower.contains("youtubemusic") || lower.contains("ytmusic") {
        ("Google.YouTubeMusic.Win32App", "https://music.youtube.com", false)
    } else if lower.contains("docs") {
        ("Google.Docs.Win32App", "https://docs.google.com", false)
    } else if lower.contains("drive") {
        ("Google.Drive.Win32App", "https://drive.google.com", false)
    } else if lower.contains("gmail") {
        ("Google.Gmail.Win32App", "https://mail.google.com", false)
    } else {
        ("Google.Gemini.Win32App", "https://gemini.google.com/app", true)
    }
}

fn main() {
    let exe_path = env::current_exe().unwrap_or_default();
    let stem = exe_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("GoogleGeminiWin32");

    let (aumid, default_url, wake_gemini_native) = resolve_target(stem);
    let wide_aumid = to_wide(aumid);
    unsafe {
        let _ = SetCurrentProcessExplicitAppUserModelID(wide_aumid.as_ptr());
    }

    let custom_url = env::args().nth(1);
    let target_url = custom_url.as_deref().unwrap_or(default_url);

    // If launching Gemini or Glic, also wake up the patched native Gemini.exe (:8789) in background
    if wake_gemini_native {
        let gemini_exe = r"C:\\Users\\aphro\\AppData\\Local\\Google\\Gemini\\app-1.17.0\\Gemini.exe";
        let _ = Command::new(gemini_exe)
            .arg("--hide")
            .creation_flags(0x00000008 | 0x08000000)
            .spawn();
    }

    let chrome_exe = r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    let voice_ext = r"${VOICE_EXT_DIR.replace(/\\/g, "\\\\")}";
    let theme_ext = r"${THEME_EXT_DIR.replace(/\\/g, "\\\\")}";
    let features = "${CHROME_CLI_ENABLE_FEATURES.join(",")}";

    let _ = Command::new(chrome_exe)
        .arg(format!("--app={}", target_url))
        .arg(format!("--enable-features={}", features))
        .arg(format!("--load-extension={},{}", voice_ext, theme_ext))
        .arg("--glic-guest-url=https://gemini.google.com/app")
        .arg("--glic-always-open-fre=false")
        .arg("--no-first-run")
        .creation_flags(0x00000008)
        .spawn();
}
`;

  await Bun.write(rustSrcPath, rustCode);

  const compileProc = Bun.spawn(
    [
      "rustc",
      "-C",
      "opt-level=3",
      "--edition",
      "2024",
      rustSrcPath,
      "-o",
      baseExePath,
    ],
    {
      cwd: WIN32_APPS_OUT_DIR,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [compileErr, compileExit] = await Promise.all([
    new Response(compileProc.stderr).text(),
    compileProc.exited,
  ]);
  if (compileExit !== 0) {
    throw new Error(`rustc Win32 compilation failed: ${compileErr}`);
  }

  const baseBytes = await Bun.file(baseExePath).bytes();
  const executables: string[] = [];

  for (const app of GOOGLE_WIN32_APPS) {
    const appExePath = join(WIN32_APPS_OUT_DIR, app.exeName);
    await Bun.write(appExePath, baseBytes);
    executables.push(appExePath);
  }

  // Register in Windows Start Menu & HKCU App Paths
  const startMenuDir = join(
    APP_DATA,
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Google AI Win32 Apps",
  );
  await mkdir(startMenuDir, { recursive: true });
  const desktopDir = join(
    process.env.USERPROFILE ?? "C:\\Users\\aphro",
    "Desktop",
  );

  const psLines: string[] = ["$WshShell = New-Object -ComObject WScript.Shell"];

  for (const app of GOOGLE_WIN32_APPS) {
    const appExePath = join(WIN32_APPS_OUT_DIR, app.exeName);
    const startLnkPath = join(startMenuDir, app.shortcutName);
    const regKey = `HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${app.exeName}`;

    psLines.push(
      `New-Item -Path '${regKey.replace(/'/g, "''")}' -Force | Out-Null`,
      `Set-ItemProperty -Path '${regKey.replace(/'/g, "''")}' -Name '(Default)' -Value '${appExePath.replace(/'/g, "''")}' -Force`,
      `Set-ItemProperty -Path '${regKey.replace(/'/g, "''")}' -Name 'Path' -Value '${WIN32_APPS_OUT_DIR.replace(/'/g, "''")}' -Force`,
      `$s = $WshShell.CreateShortcut('${startLnkPath.replace(/'/g, "''")}')`,
      `$s.TargetPath = '${appExePath.replace(/'/g, "''")}'`,
      `$s.WorkingDirectory = '${WIN32_APPS_OUT_DIR.replace(/'/g, "''")}'`,
      `$s.IconLocation = '${CHROME_EXE.replace(/'/g, "''")},0'`,
      `$s.Description = '${app.description.replace(/'/g, "''")}'`,
      `$s.Save()`,
    );

    if (app.id === "gemini" || app.id === "glic") {
      const desktopLnkPath = join(desktopDir, app.shortcutName);
      psLines.push(
        `$d = $WshShell.CreateShortcut('${desktopLnkPath.replace(/'/g, "''")}')`,
        `$d.TargetPath = '${appExePath.replace(/'/g, "''")}'`,
        `$d.WorkingDirectory = '${WIN32_APPS_OUT_DIR.replace(/'/g, "''")}'`,
        `$d.IconLocation = '${CHROME_EXE.replace(/'/g, "''")},0'`,
        `$d.Description = '${app.description.replace(/'/g, "''")}'`,
        `$d.Save()`,
      );
    }
  }

  const psProc = Bun.spawn(
    [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      psLines.join("\n"),
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  await psProc.exited;

  return {
    compiledExeCount: executables.length,
    outputDir: WIN32_APPS_OUT_DIR,
    executables,
    startMenuDir,
  };
}

async function createDesktopGeminiChromeShortcut(): Promise<string> {
  const desktopDir = join(
    process.env.USERPROFILE ?? "C:\\Users\\aphro",
    "Desktop",
  );
  const shortcutPath = join(desktopDir, "Chrome Gemini AI.lnk");
  const args = [
    `--enable-features=${CHROME_CLI_ENABLE_FEATURES.join(",")}`,
    `--load-extension="${VOICE_EXT_DIR},${THEME_EXT_DIR}"`,
    "--glic-guest-url=https://gemini.google.com/app",
    "--glic-always-open-fre=false",
    "--homepage=http://127.0.0.1:8787/chrome-home",
    "http://127.0.0.1:8787/chrome-home",
    "http://127.0.0.1:8787/glic",
  ].join(" ");

  const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$Shortcut.TargetPath = '${CHROME_EXE.replace(/'/g, "''")}'
$Shortcut.Arguments = '${args.replace(/'/g, "''")}'
$Shortcut.WorkingDirectory = 'C:\\Program Files\\Google\\Chrome\\Application'
$Shortcut.Description = 'Google Chrome 156 AI-Augmented Browser (Glic, WebMCP, Desktop PWAs, Gemini Nano)'
$Shortcut.Save()
`;

  const proc = Bun.spawn(
    [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      psScript,
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  await proc.exited;
  return shortcutPath;
}

async function launchChromeWithGeminiAi(): Promise<void> {
  if (!(await Bun.file(CHROME_EXE).exists())) return;

  const proc = Bun.spawn(
    [
      CHROME_EXE,
      `--enable-features=${CHROME_CLI_ENABLE_FEATURES.join(",")}`,
      `--load-extension=${VOICE_EXT_DIR},${THEME_EXT_DIR}`,
      "--glic-guest-url=https://gemini.google.com/app",
      "--glic-always-open-fre=false",
      "--restore-last-session",
      "http://127.0.0.1:8787/chrome-home",
    ],
    {
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    },
  );
  proc.unref();
}

if (import.meta.main) {
  const noRestart = process.argv.includes("--no-restart");

  if (!noRestart) {
    await stopRunningChromeProcesses();
  }

  // 1. Extract & patch resources.pak and link into Gemini.exe ASAR tree
  const pakReport = await extractRealGeminiInChrome();

  // 2. Patch & repack Gemini.exe app.asar with Glic + WebMCP + agy CLI bridge
  const asarReport = await runGeminiDesktopPatcher();

  // 3. Apply Chrome AI & Web App policies + Local State + Profile Preferences
  await applyWindowsChromeAiPolicies();
  const localStateRes = await configureChromeLocalState();
  const prefsRes = await configureChromeProfilePreferences();

  // 4. Compile & register the 9 real native Win32 Google Apps (.exe)
  const win32AppsRes = await buildAndRegisterGoogleWin32Apps();
  const shortcutPath = await createDesktopGeminiChromeShortcut();

  if (!noRestart) {
    await launchChromeWithGeminiAi();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        chromeVersion: pakReport.chromeVersion,
        resourcesPakPatched: {
          extractedCount: pakReport.extractedCount,
          patchedPakPath: pakReport.patchedPakPath,
          asarGlicLinkedDir: pakReport.asarGlicLinkedDir,
        },
        geminiWindowsAsarPatched: {
          ok: asarReport.ok,
          asarPath: asarReport.asarPath,
          asarSizeBytes: asarReport.asarSizeBytes,
        },
        localState: localStateRes,
        profilePreferences: prefsRes,
        win32GoogleApps: win32AppsRes,
        desktopShortcut: shortcutPath,
        restartedChrome: !noRestart,
      },
      null,
      2,
    ),
  );
}
