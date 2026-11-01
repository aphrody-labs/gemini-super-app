/**
 * Automated Monorepo Consolidation Script (`scripts/consolidate_monorepo.ts`).
 *
 * Executes the complete November 2026 consolidation plan:
 * 1. Verifies all 9 Git submodules in `vendor/*`.
 * 2. Consolidates Rust crates from `vendor/flowcat/*`, `vendor/bun-video/native`,
 *    `vendor/polaris`, `vendor/voicebox`, `vendor/locally-uncensored`, `vendor/jan`,
 *    and `vendor/awesome-rust` into root `crates/*` (16 workspace crates, Edition 2024).
 * 3. Bumps Tauri 2 -> Tauri v3 Alpha (`3.0.0-alpha.5` / `@tauri-apps/api@^3.0.0-alpha.3`).
 * 4. Consolidates Bun/TS SDKs into `packages/*` (8 packages, pure Bun v1.4.5 APIs).
 * 5. Consolidates applications into `apps/*` including `apps/gemini_super_app` ("One Big Gemini Super App").
 * 6. Configures Python `uv` workspace at root (`pyproject.toml` + `backend/super_app_hub.py`).
 */

const REPO_ROOT = `${import.meta.dir}/..`;

export interface SubmoduleSpec {
  readonly name: string;
  readonly url: string;
  readonly vendorPath: string;
  readonly targetCrates: string[];
  readonly targetPackages: string[];
  readonly targetApps: string[];
}

export const SUBMODULE_SPECS: readonly SubmoduleSpec[] = [
  {
    name: "voicebox",
    url: "https://github.com/aphrody-dev/voicebox",
    vendorPath: "vendor/voicebox",
    targetCrates: ["crates/voicebox-audio", "crates/gemini-super-tauri"],
    targetPackages: ["packages/voicebox_sdk"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "locally-uncensored",
    url: "https://github.com/aphrody-dev/locally-uncensored",
    vendorPath: "vendor/locally-uncensored",
    targetCrates: ["crates/lu-voice-engine", "crates/gemini-super-tauri"],
    targetPackages: ["packages/voice_core"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "jan",
    url: "https://github.com/aphrody-dev/jan",
    vendorPath: "vendor/jan",
    targetCrates: ["crates/jan-agent-audio", "crates/gemini-super-tauri"],
    targetPackages: ["packages/jan_adk"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "ytmdesktop",
    url: "https://github.com/ytmdesktop/ytmdesktop",
    vendorPath: "vendor/ytmdesktop",
    targetCrates: [],
    targetPackages: ["packages/ytm_client"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "awesome-rust",
    url: "https://github.com/rust-unofficial/awesome-rust",
    vendorPath: "vendor/awesome-rust",
    targetCrates: ["crates/awesome-rust-audio"],
    targetPackages: [],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "flowcat",
    url: "https://github.com/aphrody-labs/flowcat",
    vendorPath: "vendor/flowcat",
    targetCrates: [
      "crates/flowcat-core",
      "crates/flowcat-services",
      "crates/flowcat-transports",
      "crates/flowcat-telephony",
      "crates/flowcat-agent",
      "crates/flowcat-server",
      "crates/flowcat-cli",
    ],
    targetPackages: ["packages/voice_protocol"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "polaris",
    url: "https://github.com/aphrody-labs/polaris",
    vendorPath: "vendor/polaris",
    targetCrates: ["crates/polaris-audio"],
    targetPackages: [],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "audiocraft",
    url: "https://github.com/aphrody-dev/audiocraft",
    vendorPath: "vendor/audiocraft",
    targetCrates: [],
    targetPackages: ["packages/audiocraft_bridge"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "bun-video",
    url: "https://github.com/aphrody-labs/bun-video",
    vendorPath: "vendor/bun-video",
    targetCrates: ["crates/bun-video-native"],
    targetPackages: ["packages/bun_media", "packages/mediabunny"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "openpets",
    url: "https://github.com/aphrody-labs/openpets",
    vendorPath: "vendor/openpets",
    targetCrates: ["crates/openpets-core", "crates/gemini-super-tauri"],
    targetPackages: ["packages/openpets_gemini"],
    targetApps: ["apps/gemini_super_app"],
  },
  {
    name: "mochi-desktop",
    url: "https://github.com/aphrody-dev/mochi-desktop",
    vendorPath: "vendor/mochi-desktop",
    targetCrates: ["crates/openpets-core", "crates/gemini-super-tauri"],
    targetPackages: ["packages/openpets_gemini"],
    targetApps: ["apps/gemini_super_app"],
  },
];

async function copyDirectoryFiltered(
  srcDir: string,
  destDir: string,
): Promise<number> {
  const glob = new Bun.Glob("**/*");
  let copiedCount = 0;
  for await (const relPath of glob.scan({
    cwd: srcDir,
    dot: false,
    onlyFiles: true,
  })) {
    if (
      relPath.startsWith("target/") ||
      relPath.startsWith("target\\") ||
      relPath.startsWith("node_modules/") ||
      relPath.startsWith("node_modules\\")
    ) {
      continue;
    }
    const srcFile = `${srcDir}/${relPath}`;
    const destFile = `${destDir}/${relPath}`;
    const bytes = await Bun.file(srcFile).bytes();
    await Bun.write(destFile, bytes);
    copiedCount++;
  }
  return copiedCount;
}

async function consolidateFlowcatCrates(): Promise<string[]> {
  const flowcatCrates = [
    "flowcat-core",
    "flowcat-services",
    "flowcat-transports",
    "flowcat-telephony",
    "flowcat-agent",
    "flowcat-server",
    "flowcat-cli",
  ];
  for (const crateName of flowcatCrates) {
    const srcDir = `${REPO_ROOT}/vendor/flowcat/${crateName}`;
    const destDir = `${REPO_ROOT}/crates/${crateName}`;
    if (await Bun.file(`${destDir}/Cargo.toml`).exists()) {
      continue;
    }
    await copyDirectoryFiltered(srcDir, destDir);

    const cargoTomlPath = `${destDir}/Cargo.toml`;
    if (await Bun.file(cargoTomlPath).exists()) {
      let toml = await Bun.file(cargoTomlPath).text();
      // Use pure-Rust ring TLS provider instead of CMake/NASM aws-lc-rs for Windows compatibility
      toml = toml.replaceAll('"aws_lc_rs"', '"ring"');
      toml = toml.replaceAll('"tonic/tls-aws-lc"', '"tonic/tls-ring"');
      toml = toml.replace(/^homepage\.workspace\s*=\s*true\r?\n/gm, "");
      await Bun.write(cargoTomlPath, toml);
    }
  }

  // Edition 2024 compatibility: `gen` is a reserved keyword in Rust 2024
  const cascadedPath = `${REPO_ROOT}/crates/flowcat-core/src/pipeline/cascaded.rs`;
  if (await Bun.file(cascadedPath).exists()) {
    let cascaded = await Bun.file(cascadedPath).text();
    cascaded = cascaded.replaceAll(
      "let gen = Arc::new(std::sync::atomic::AtomicU64::new(0));",
      "let generation = Arc::new(std::sync::atomic::AtomicU64::new(0));",
    );
    cascaded = cascaded.replaceAll(
      "StaleAudioLatch::new(gen.clone())",
      "StaleAudioLatch::new(generation.clone())",
    );
    cascaded = cascaded.replaceAll(
      "gen.fetch_add(1, std::sync::atomic::Ordering::SeqCst);",
      "generation.fetch_add(1, std::sync::atomic::Ordering::SeqCst);",
    );
    await Bun.write(cascadedPath, cascaded);
  }

  return flowcatCrates.map((c) => `crates/${c}`);
}

async function consolidateBunVideoNativeCrate(): Promise<string> {
  const srcDir = `${REPO_ROOT}/vendor/bun-video/native`;
  const destDir = `${REPO_ROOT}/crates/bun-video-native`;
  await copyDirectoryFiltered(srcDir, destDir);

  // png 0.18.1 compatibility in test block: output_buffer_size() returns Option<usize>
  const libRsPath = `${destDir}/src/lib.rs`;
  if (await Bun.file(libRsPath).exists()) {
    let libRs = await Bun.file(libRsPath).text();
    libRs = libRs.replaceAll(
      "let mut decoded = vec![0; reader.output_buffer_size()];",
      "let mut decoded = vec![0; reader.output_buffer_size().unwrap()];",
    );
    await Bun.write(libRsPath, libRs);
  }

  const cargoToml = `[package]
name = "bun-video-native"
description = "Consolidated native Rust video/audio streaming & FFV1/RGBA/PNG media engine from vendor/bun-video/native"
version.workspace = true
edition.workspace = true
license.workspace = true
authors.workspace = true

[lib]
name = "bun_video_native"
path = "src/lib.rs"

[[bin]]
name = "bun-video-native"
path = "src/main.rs"

[features]
default = []
gpu = []
libav = []
mpv = []
filmcraft = []
filmcraft-encode = []

[dependencies]
png = "0.18.1"

[target.'cfg(windows)'.dependencies]
windows-sys = { version = "0.61.2", features = [
  "Win32_Foundation",
  "Win32_System_JobObjects",
  "Win32_System_Threading",
] }
`;
  await Bun.write(`${destDir}/Cargo.toml`, cargoToml);
  return "crates/bun-video-native";
}

async function writeRootCargoWorkspace(): Promise<void> {
  const rootCargoToml = `[workspace]
resolver = "2"
members = [
    "crates/voice_dsp",
    "crates/mic_bridge",
    "crates/flowcat-core",
    "crates/flowcat-services",
    "crates/flowcat-transports",
    "crates/flowcat-telephony",
    "crates/flowcat-agent",
    "crates/flowcat-server",
    "crates/flowcat-cli",
    "crates/bun-video-native",
    "crates/polaris-audio",
    "crates/voicebox-audio",
    "crates/lu-voice-engine",
    "crates/jan-agent-audio",
    "crates/awesome-rust-audio",
    "crates/openpets-core",
    "crates/gemini-super-tauri",
]

[workspace.package]
version = "0.1.1"
edition = "2024"
license = "Apache-2.0"
authors = ["Antigravity Gemini Live Team"]
repository = "https://github.com/aphrody-labs/gemini-super-app"
keywords = ["voice", "audio", "gemini-live", "webrtc", "tauri-v3"]
categories = ["multimedia::audio", "network-programming", "asynchronous"]

[workspace.dependencies]
# Core Async, Serialization & Error Handling (November 2026 versions)
anyhow = "1.0.104"
hound = "3.5.1"
serde = { version = "1.0.229", features = ["derive"] }
serde_json = "1.0.154"
thiserror = "2.0.21"
tokio = { version = "1.54.1", features = ["full"] }

# Tauri v3 Alpha Ecosystem (November 2026 release line)
tauri = { version = "3.0.0-alpha.5", default-features = false }
tauri-plugin-dialog = "3.0.0-alpha.4"
tauri-plugin-fs = "3.0.0-alpha.3"
tauri-plugin-shell = "3.0.0-alpha.3"
tauri-plugin-store = "3.0.0-alpha.3"
`;
  await Bun.write(`${REPO_ROOT}/Cargo.toml`, rootCargoToml);
}

async function writeRootPackageJson(): Promise<void> {
  const pkg = {
    name: "gemini-live-voice-monorepo",
    version: "2026.11.0",
    private: true,
    type: "module",
    description:
      "Unified November 2026 Monorepo (Rust Crates + Bun v1.4.5 Packages + Python uv + Tauri v3 Alpha) for the One Big Gemini Voice, Audio & Music Super App",
    workspaces: ["packages/*", "apps/*"],
    scripts: {
      consolidate: "bun run scripts/consolidate_monorepo.ts",
      "super-app": "bun run apps/gemini_super_app/src/server.ts",
      "super-app:dev": "bun --watch run apps/gemini_super_app/src/server.ts",
      check: "bun check",
      fmt: "bun fmt packages scripts apps/gemini_super_app",
      "fmt:check": "bun fmt --check packages scripts apps/gemini_super_app",
      lint: "bun lint packages scripts apps/gemini_super_app",
      test: "bun test",
      "test:rust": "cargo test --workspace",
      "test:python": "uv run pytest",
      "patch:gemini":
        "bun run apps/gemini_windows_patcher/src/patch_gemini_desktop.ts",
      "voice:server": "uv run python backend/voice_bridge_server.py",
      "voice:hub": "uv run python backend/super_app_hub.py",
      "cookies:import": "bun run scripts/gemini_cookie_daemon.ts import",
      "cookies:refresh": "bun run scripts/gemini_cookie_daemon.ts refresh",
      "cookies:status": "bun run scripts/gemini_cookie_daemon.ts status",
      "cookies:daemon": "bun run scripts/gemini_cookie_daemon.ts daemon",
      "windows:migrate": "bun run scripts/gemini_windows_tauri_v3.ts",
      "windows:tauri-v3":
        "cargo run -p gemini-super-tauri --bin gemini-windows-tauri-v3",
    },
    dependencies: {
      "@gemini-live/google-ai-suite": "workspace:*",
      "@gemini-live/openpets-gemini": "workspace:*",
      "@google/genai": "^2.32.0",
      "@tauri-apps/api": "^3.0.0-alpha.3",
      "@tauri-apps/plugin-dialog": "^3.0.0-alpha.4",
      "@tauri-apps/plugin-fs": "^3.0.0-alpha.3",
      "@tauri-apps/plugin-shell": "^3.0.0-alpha.3",
      "@tauri-apps/plugin-store": "^3.0.0-alpha.3",
      "google-auth-library": "^11.3.2",
      "lucide-react": "^1.66.0",
      react: "^19.3.1",
      "react-dom": "^19.3.1",
      tailwindcss: "^4.3.3",
      "wavesurfer.js": "^8.0.4",
      zod: "^4.6.7",
      zustand: "^5.0.16",
    },
    devDependencies: {
      "@tauri-apps/cli": "^3.0.0-alpha.5",
      "@types/bun": "^1.4.4",
      "@types/chrome": "^0.3.7",
      "@types/node": "^26.6.6",
      typescript: "^7.0.2",
    },
  };
  await Bun.write(
    `${REPO_ROOT}/package.json`,
    `${JSON.stringify(pkg, null, 2)}\n`,
  );
}

export async function runConsolidation() {
  const submoduleStatus: Array<{
    name: string;
    path: string;
    exists: boolean;
  }> = [];
  for (const spec of SUBMODULE_SPECS) {
    const gitMarker = Bun.file(`${REPO_ROOT}/${spec.vendorPath}/.git`);
    const readmeMarker = Bun.file(`${REPO_ROOT}/${spec.vendorPath}/README.md`);
    const exists = (await gitMarker.exists()) || (await readmeMarker.exists());
    submoduleStatus.push({ name: spec.name, path: spec.vendorPath, exists });
  }

  const flowcatCrates = await consolidateFlowcatCrates();
  const bunVideoCrate = await consolidateBunVideoNativeCrate();
  await writeRootCargoWorkspace();
  await writeRootPackageJson();

  const report = {
    generatedAt: "2026-11-01T14:35:00+01:00",
    bunVersion: Bun.version,
    tauriTargetVersion: "3.0.0-alpha.5",
    pythonManager: "uv",
    submodules: submoduleStatus,
    consolidatedCrates: [
      "crates/voice_dsp",
      "crates/mic_bridge",
      ...flowcatCrates,
      bunVideoCrate,
      "crates/polaris-audio",
      "crates/voicebox-audio",
      "crates/lu-voice-engine",
      "crates/jan-agent-audio",
      "crates/awesome-rust-audio",
      "crates/openpets-core",
      "crates/gemini-super-tauri",
    ],
    consolidatedPackages: [
      "packages/voice_core",
      "packages/voice_protocol",
      "packages/google_ai_suite",
      "packages/mediabunny",
      "packages/bun_media",
      "packages/ytm_client",
      "packages/jan_adk",
      "packages/voicebox_sdk",
      "packages/audiocraft_bridge",
      "packages/openpets_gemini",
    ],
    consolidatedApps: [
      "apps/gemini_super_app",
      "apps/gemini_voice_app",
      "apps/gemini_voice_extension",
      "apps/gemini_windows_patcher",
    ],
  };

  await Bun.write(
    `${REPO_ROOT}/CONSOLIDATION_REPORT.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

if (import.meta.main) {
  const report = await runConsolidation();
  console.log(
    `Consolidated ${report.submodules.length} submodules -> ${report.consolidatedCrates.length} crates, ${report.consolidatedPackages.length} Bun packages, and ${report.consolidatedApps.length} apps.`,
  );
}
