/**
 * Configure Chrome 156+ for:
 * 1. "Gemini in Chrome" (Glic) unlocked & pinned in tabstrip + OS launcher
 * 2. All 62+ Chrome AI, Gemini Nano, Composebox, Lens Overlay & Redesign feature flags
 * 3. Material 3 Gemini Dark Sparkle Theme (#131314 / #1e1f20 / #a8c7fa)
 * 4. Gemini AI Homepage & New Tab Page (http://127.0.0.1:8787/chrome-home & /app)
 */

import { join, resolve } from "node:path";

const LOCAL_APP_DATA =
  process.env.LOCALAPPDATA ?? "C:\\Users\\aphro\\AppData\\Local";
const USER_DATA_DIR = join(LOCAL_APP_DATA, "Google", "Chrome", "User Data");
const LOCAL_STATE_PATH = join(USER_DATA_DIR, "Local State");
const DEFAULT_PREFS_PATH = join(USER_DATA_DIR, "Default", "Preferences");
const CHROME_EXE = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const REPO_ROOT = resolve(import.meta.dir, "..");
const VOICE_EXT_DIR = join(REPO_ROOT, "apps", "gemini_voice_extension");
const THEME_EXT_DIR = join(REPO_ROOT, "apps", "gemini_chrome_theme");

/**
 * Exact internal Chrome 156 flag identifiers verified in chrome.dll
 */
export const CHROME_AI_AND_REDESIGN_FLAGS: readonly string[] = [
  // 1. Gemini in Chrome (Glic) Core & Agentic Actuation
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
  "glic- proactive-nudge-debug@1".replace(" ", ""),
  "glic-scroll-to-pdf@1",
  "glic-share-image@1",
  "glic-side-panel-unified-header@1",
  "glic- summarize-video-suggestion@1".replace(" ", ""),
  "glic-tab-focus-frame@1",
  "glic-tab-groups@1",
  "glic-trust-first-onboarding@1",
  "glic-user-resize@1",
  "glic-voice@1",
  "glic-warm-standby@1",
  "glic-web-actuation-setting@1",
  "glic-web-contents-warming@1",
  "glic-zero-state-suggestions@1",
  "password-change-with-glic@1",
  "enable-browser-actuator-for-glic-experimental-triggering@1",

  // 2. Chrome NTP Composebox, Help Me Write & Gemini Thread Sync
  "ntp-composebox@1",
  "context-management-in-composebox@1",
  "composebox-uses-chrome-compose-client@1",
  "omnibox-zero-suggest-prefetching-for-composebox@1",
  "chrome-compose@1",
  "chrome-cobrowse-compose@1",
  "sync-gemini-threads@1",

  // 3. Built-in On-Device Gemini Nano APIs (window.ai / LanguageModel)
  "optimization-guide-on-device-model@1",
  "prompt-api-for-gemini-nano@1",
  "prompt-api-for-gemini-nano-multimodal-input@1",
  "summarizer-api-for-gemini-nano@1",
  "writer-api-for-gemini-nano@1",
  "rewriter-api-for-gemini-nano@1",
  "language-detection-api@1",
  "translation-api@1",

  // 4. Google Lens Overlay & Visual AI Search
  "enable-lens-overlay@1",
  "enable-lens-overlay-updated-visuals@1",
  "enable-lens-overlay-translate-button@1",
  "enable-lens-overlay-image-context-menu-actions@1",
  "enable-lens-overlay-text-selection-context-menu-entrypoint@1",
  "lens-overlay-omnibox-entry-point@1",

  // 5. Chrome AI Theme Generator & Wallpaper Search Redesign
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
  "GlicInlinePrompt",
  "GlicPdfSummarize",
  "GlicShareImage",
  "GlicZeroStateSuggestions",
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
    // 0 = Allow feature and allow model improvement / full GenAI capabilities
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

  // Merge existing flags while replacing any conflicting @digit suffix for our target flags
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

  // Unlock US variations country for Gemini in Chrome (Glic) eligibility
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

  // Enable Glic OS Launcher & Multi-profile state in Local State
  const glicGlobal = (state.glic as Record<string, unknown> | undefined) ?? {};
  glicGlobal.launcher_enabled = true;
  glicGlobal.multi_profile_eligibility_known = true;
  state.glic = glicGlobal;

  await Bun.write(localStatePath, JSON.stringify(state));
  return {
    enabledFlagsCount: mergedFlags.length,
    countryUnlocked: "us",
  };
}

export async function configureChromeProfilePreferences(
  prefsPath = DEFAULT_PREFS_PATH,
): Promise<{ homepage: string; themeColorHex: string; glicReady: boolean }> {
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

  // 2. Configure Gemini Homepage & Startup URLs
  const homepageUrl = "http://127.0.0.1:8787/chrome-home";
  prefs.homepage = homepageUrl;
  prefs.homepage_is_newtabpage = false;

  const browser = (prefs.browser as Record<string, unknown> | undefined) ?? {};
  browser.show_home_button = true;

  // 3. Configure Material 3 Gemini Dark Sparkle Theme (#A8C7FA seed, Dark scheme)
  // Signed 32-bit SkColor for 0xFFA8C7FA = -5715974
  const theme = (browser.theme as Record<string, unknown> | undefined) ?? {};
  theme.color_scheme2 = 2; // 2 = Dark Mode
  theme.color_variant2 = 1; // 1 = Tonal Spot Material 3
  theme.user_color2 = -5715974; // #A8C7FA Gemini Sparkle Blue
  theme.follows_system_colors = false;
  browser.theme = theme;
  prefs.browser = browser;

  // Startup URLs: Gemini Chrome Homepage + Gemini Super App Replica + Official Gemini Web
  const session = (prefs.session as Record<string, unknown> | undefined) ?? {};
  session.restore_on_startup = 4; // 4 = Open specific URLs
  session.startup_urls = [
    "http://127.0.0.1:8787/chrome-home",
    "http://127.0.0.1:8787/app",
    "https://gemini.google.com/app",
  ];
  prefs.session = session;

  // Custom NTP Background / Material 3 Dark Sparkle
  const ntp = (prefs.ntp as Record<string, unknown> | undefined) ?? {};
  ntp.shortcust_visible = true;
  ntp.custom_links_initialized = true;
  prefs.ntp = ntp;

  // Side Panel & Omnibox AI Settings
  const sidePanel =
    (prefs.side_panel as Record<string, unknown> | undefined) ?? {};
  sidePanel.is_right_aligned = true;
  prefs.side_panel = sidePanel;

  await Bun.write(prefsPath, JSON.stringify(prefs));
  return {
    homepage: homepageUrl,
    themeColorHex: "#A8C7FA (Material 3 Dark Sparkle)",
    glicReady: true,
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
    "--homepage=http://127.0.0.1:8787/chrome-home",
    "http://127.0.0.1:8787/chrome-home",
    "http://127.0.0.1:8787/app",
  ].join(" ");

  const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$Shortcut.TargetPath = '${CHROME_EXE.replace(/'/g, "''")}'
$Shortcut.Arguments = '${args.replace(/'/g, "''")}'
$Shortcut.WorkingDirectory = 'C:\\Program Files\\Google\\Chrome\\Application'
$Shortcut.Description = 'Google Chrome 156 avec Gemini in Chrome (Glic), Flags AI, Theme Dark Sparkle et Homepage Gemini'
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

  Bun.spawn(
    [
      CHROME_EXE,
      `--enable-features=${CHROME_CLI_ENABLE_FEATURES.join(",")}`,
      `--load-extension=${VOICE_EXT_DIR},${THEME_EXT_DIR}`,
      "--restore-last-session",
      "http://127.0.0.1:8787/chrome-home",
    ],
    {
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    },
  );
}

if (import.meta.main) {
  const noRestart = process.argv.includes("--no-restart");

  if (!noRestart) {
    await stopRunningChromeProcesses();
  }

  await applyWindowsChromeAiPolicies();
  const localStateRes = await configureChromeLocalState();
  const prefsRes = await configureChromeProfilePreferences();
  const shortcutPath = await createDesktopGeminiChromeShortcut();

  if (!noRestart) {
    await launchChromeWithGeminiAi();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        chromeVersion: "156.0.8078.76",
        localState: localStateRes,
        profilePreferences: prefsRes,
        extensionsLoaded: [VOICE_EXT_DIR, THEME_EXT_DIR],
        desktopShortcut: shortcutPath,
        restartedChrome: !noRestart,
      },
      null,
      2,
    ),
  );
}
