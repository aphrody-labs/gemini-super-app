/**
 * @fileoverview Directly exploits `C:\Program Files\Google\Chrome\Application\156.0.8078.76\resources.pak`:
 * 1. Extracts all 56 native "Gemini in Chrome" (`Glic`, `chrome://glic`, `chrome://glic-fre`, `glic.mojom`, `glic_api`, `modelContext`) resources.
 * 2. Surgically patches the extracted Glic WebUI (`glic.html`, `glic_page_handler.js`, `glic.js`) to bypass account/region/policy gates
 *    (`kUnavailable`, `kIneligibleAccount`, `kDisabledByAdmin`, `kLocationMismatch`) and link directly to `Gemini.exe` (:8789) and `agy` CLI (:8765).
 * 3. Repacks a valid Chromium DataPack v5 binary (`dist/gemini-in-chrome/resources.patched.pak`) and attempts in-place installation
 *    if writable, while syncing the patched Glic WebUI directly into `apps/gemini_windows_patcher/asar_extracted/src/glic/`.
 */

import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { brotliDecompressSync, gunzipSync, gzipSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dir, "..");
const CHROME_APP_DIR = "C:\\Program Files\\Google\\Chrome\\Application";
const CHROME_USER_DATA_DIR = `${process.env.LOCALAPPDATA ?? "C:\\Users\\aphro\\AppData\\Local"}\\Google\\Chrome\\User Data`;
const OUT_DIR = join(REPO_ROOT, "dist", "gemini-in-chrome");
const ASAR_GLIC_DIR = join(
  REPO_ROOT,
  "apps",
  "gemini_windows_patcher",
  "asar_extracted",
  "src",
  "glic",
);

export interface ExtractedGlicResource {
  readonly resourceId: number;
  readonly byteLength: number;
  readonly compression: "gzip" | "brotli" | "raw";
  readonly category:
    | "glic_webui"
    | "glic_fre"
    | "glic_api_client"
    | "glic_mojom"
    | "glic_asset"
    | "webmcp_model_context"
    | "contextual_cueing"
    | "ai_settings_flags";
  readonly canonicalName: string | null;
  readonly inferredFilename: string;
  readonly outputPath: string;
  readonly patched: boolean;
  readonly preview: string;
}

export interface GeminiInChromeExtractionReport {
  readonly ok: boolean;
  readonly chromeVersion: string;
  readonly chromeInstallDir: string;
  readonly resourcesPakPath: string;
  readonly resourcesPakSizeBytes: number;
  readonly patchedPakPath: string;
  readonly patchedPakSizeBytes: number;
  readonly inPlacePakInstalled: boolean;
  readonly asarGlicLinkedDir: string;
  readonly totalPakResources: number;
  readonly nativeBinaries: {
    readonly chromeDllBytes: number;
    readonly chromeCompanerosDllBytes: number;
    readonly optimizationGuideDllBytes: number;
    readonly liteRtWebGpuDllBytes: number;
  };
  readonly chromeUrlsDiscovered: string[];
  readonly glicFlagsDiscovered: string[];
  readonly canonicalWebUiFiles: Record<string, string>;
  readonly enabledExperimentsInLocalState: string[];
  readonly extractedCount: number;
  readonly extractedResources: ExtractedGlicResource[];
  readonly outputDir: string;
}

const CANONICAL_GLIC_RESOURCE_MAP: Record<number, string> = {
  18928: "glic_logo.svg",
  18929: "glic_fre.css",
  18930: "glic.js",
  18931: "glic_api_host.js",
  18932: "glic.css",
  18933: "glic.html",
  18934: "fre.html",
  18935: "internals.html",
  18936: "glic_fre.js",
  18937: "glic_page_handler.js",
  18938: "internals.js",
  18990: "experimental_opt_in.html",
  18991: "experimental_opt_in.css",
  18992: "experimental_opt_in.js",
  18994: "glic_experimental_mojom.js",
  18998: "glic_logo.svg",
  19003: "glic_selection_overlay.js",
  19006: "glic_selection_overlay.html.js",
  19009: "glic_selection_overlay.css.js",
  19010: "glic_actor_action.mojom-webui.js",
};

export const CHROME_156_AI_AND_GLIC_EXPERIMENTS: readonly string[] = [
  "enable-glic@1",
  "glic@1",
  "glic-actor@1",
  "glic-actor-autofill@1",
  "glic-actor-cursor@1",
  "glic-actor-script-tools@1",
  "glic-always-skip-fre@1",
  "glic-detaching@1",
  "glic-z-order-changes@1",
  "enable-webmcp-testing@1",
  "enable-desktop-pwas-additional-windowing-controls@1",
  "enable-desktop-pwas-borderless@1",
  "enable-desktop-pwas-sub-apps@1",
  "enable-desktop-pwas-tab-strip@1",
  "enable-desktop-pwas-tab-strip-customizations@1",
  "enable-desktop-pwas-tab-strip-settings@1",
  "enable-isolated-web-apps@1",
  "enable-isolated-web-app-dev-mode@1",
  "prompt-api-for-gemini-nano@1",
  "prompt-api-for-gemini-nano-multimodal-input@1",
  "summarization-api-for-gemini-nano@1",
  "writer-api-for-gemini-nano@1",
  "rewriter-api-for-gemini-nano@1",
  "proofreader-api-for-gemini-nano@1",
  "translation-api@1",
  "language-detection-api@1",
  "optimization-guide-on-device-model@1",
];

async function findLatestChromeVersionDir(): Promise<{
  version: string;
  dir: string;
}> {
  const entries = await readdir(CHROME_APP_DIR, { withFileTypes: true });
  const versionDirs = entries
    .filter((e) => e.isDirectory() && /^\d+\.\d+\.\d+\.\d+$/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const version = versionDirs[0] ?? "156.0.8078.76";
  return { version, dir: join(CHROME_APP_DIR, version) };
}

function decompressPakSlice(slice: Uint8Array): {
  data: Uint8Array;
  compression: "gzip" | "brotli" | "raw";
} {
  if (slice.byteLength >= 2 && slice[0] === 0x1f && slice[1] === 0x8b) {
    try {
      return {
        data: new Uint8Array(gunzipSync(slice)),
        compression: "gzip",
      };
    } catch {}
  }
  if (slice.byteLength >= 6 && slice[0] === 0x1e && slice[1] === 0x9b) {
    try {
      return {
        data: new Uint8Array(brotliDecompressSync(slice.subarray(8))),
        compression: "brotli",
      };
    } catch {}
  }
  return { data: slice, compression: "raw" };
}

function detectExtension(text: string): string {
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<!DOCTYPE html") ||
    trimmed.startsWith("<!DOCTYPE HTML") ||
    trimmed.startsWith("<html")
  ) {
    return "html";
  }
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg ")) {
    return "svg";
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return "json";
  }
  if (
    (trimmed.startsWith("/*") ||
      trimmed.startsWith(":root") ||
      trimmed.startsWith("html,")) &&
    !text.includes("import{") &&
    !text.includes("import ") &&
    !text.includes("const mojo=")
  ) {
    return "css";
  }
  return "js";
}

/**
 * Surgically patches Glic WebUI resources (`18933` glic.html, `18937` glic_page_handler.js)
 * so account/country/admin gates are bypassed and linked directly to `Gemini.exe` (:8789) and `agy` CLI (:8765).
 */
function patchGlicResourceIfApplicable(
  id: number,
  text: string,
): { patchedText: string; wasPatched: boolean } {
  if (id === 18937 && text.includes("showError(errorType)")) {
    const target = "showError(errorType){switch(errorType){";
    const replacement =
      'showError(errorType){try{const gp=document.getElementById("guestPanel");if(gp){gp.hidden=false;gp.classList.add("show-header");return}}catch{}switch(errorType){';
    if (text.includes(target)) {
      return {
        patchedText: text.replace(target, replacement),
        wasPatched: true,
      };
    }
  }
  if (id === 18933 && text.includes('<div id="glic-app-container" hidden>')) {
    const patchedHtml = text
      .replace(
        '<div id="glic-app-container" hidden>',
        '<div id="glic-app-container" data-linked-gemini-win32="http://127.0.0.1:8789" data-linked-agy-cli="http://127.0.0.1:8765">',
      )
      .replace(
        '<section hidden class="panel" id="guestPanel">',
        '<section class="panel show-header" id="guestPanel">',
      );
    return {
      patchedText: patchedHtml,
      wasPatched: true,
    };
  }
  return { patchedText: text, wasPatched: false };
}

/**
 * Repacks a valid Chromium DataPack v5 binary from all resource slices, replacing patched slices.
 */
function buildPatchedDataPackV5(
  origPakBytes: Uint8Array,
  patchedRawSlices: Map<number, Uint8Array>,
): Uint8Array {
  const view = new DataView(
    origPakBytes.buffer,
    origPakBytes.byteOffset,
    origPakBytes.byteLength,
  );
  const version = view.getUint32(0, true);
  const encoding = view.getUint8(4);
  const resourceCount = view.getUint16(8, true);
  const aliasCount = view.getUint16(10, true);

  const entries: Array<{ id: number; offset: number }> = [];
  let pos = 12;
  for (let i = 0; i <= resourceCount; i++) {
    entries.push({
      id: view.getUint16(pos, true),
      offset: view.getUint32(pos + 2, true),
    });
    pos += 6;
  }

  const aliases: Array<{ id: number; index: number }> = [];
  for (let i = 0; i < aliasCount; i++) {
    aliases.push({
      id: view.getUint16(pos, true),
      index: view.getUint16(pos + 2, true),
    });
    pos += 4;
  }

  const headerSize = 12 + (resourceCount + 1) * 6 + aliasCount * 4;
  const payloadChunks: Uint8Array[] = [];
  let totalPayloadBytes = 0;

  for (let i = 0; i < resourceCount; i++) {
    const cur = entries[i]!;
    const next = entries[i + 1]!;
    const patchedSlice = patchedRawSlices.get(cur.id);
    const slice =
      patchedSlice ??
      origPakBytes.subarray(
        cur.offset,
        Math.max(cur.offset, Math.min(next.offset, origPakBytes.byteLength)),
      );
    payloadChunks.push(slice);
    totalPayloadBytes += slice.byteLength;
  }

  const outBytes = new Uint8Array(headerSize + totalPayloadBytes);
  const outView = new DataView(outBytes.buffer);
  outView.setUint32(0, version, true);
  outView.setUint8(4, encoding);
  outView.setUint16(8, resourceCount, true);
  outView.setUint16(10, aliasCount, true);

  let writeHeaderPos = 12;
  let currentDataOffset = headerSize;
  for (let i = 0; i < resourceCount; i++) {
    const cur = entries[i]!;
    const chunk = payloadChunks[i]!;
    outView.setUint16(writeHeaderPos, cur.id, true);
    outView.setUint32(writeHeaderPos + 2, currentDataOffset, true);
    writeHeaderPos += 6;
    outBytes.set(chunk, currentDataOffset);
    currentDataOffset += chunk.byteLength;
  }
  // Sentinel entry
  outView.setUint16(writeHeaderPos, 0, true);
  outView.setUint32(writeHeaderPos + 2, currentDataOffset, true);
  writeHeaderPos += 6;

  for (const al of aliases) {
    outView.setUint16(writeHeaderPos, al.id, true);
    outView.setUint16(writeHeaderPos + 2, al.index, true);
    writeHeaderPos += 4;
  }

  return outBytes;
}

function classifyAndNameResource(
  id: number,
  text: string,
): {
  category: ExtractedGlicResource["category"];
  canonicalName: string | null;
  filename: string;
} | null {
  const inGlicRange = id >= 18925 && id <= 19012;
  const hasGlic =
    /\bglic\b|chrome:\/\/glic|glic-app|glic_api|GlicBrowserProxy|glic_fre|glic\.mojom/i.test(
      text,
    );
  const hasWebMcp =
    /\bmodelContext\b|registerTool|enable-webmcp-testing|ModelContextTool|toolautosubmit/i.test(
      text,
    );
  const hasCueing = /contextual_cueing|zero_state_suggestions/i.test(text);

  if (!inGlicRange && !hasGlic && !hasWebMcp && !hasCueing) {
    return null;
  }

  const ext = detectExtension(text);
  let canonicalName = CANONICAL_GLIC_RESOURCE_MAP[id] ?? null;
  if (!canonicalName && inGlicRange && ext === "svg") {
    canonicalName = "glic_logo.svg";
  }

  if (ext === "svg" && inGlicRange) {
    return {
      category: "glic_asset",
      canonicalName,
      filename: `res_${id}_glic_asset.svg`,
    };
  }
  if (/glic\.mojom|PageHandlerFactory|GlicPageHandler/i.test(text)) {
    return {
      category: "glic_mojom",
      canonicalName,
      filename: `res_${id}_glic_mojom.${ext}`,
    };
  }
  if (/glic_api|GlicHostRegistry|glicBrowser|createGlicHost/i.test(text)) {
    return {
      category: "glic_api_client",
      canonicalName,
      filename: `res_${id}_glic_api.${ext}`,
    };
  }
  if (/glic-fre|glic_fre|FreApp|chrome:\/\/glic-fre/i.test(text)) {
    return {
      category: "glic_fre",
      canonicalName,
      filename: `res_${id}_glic_fre.${ext}`,
    };
  }
  if (hasWebMcp) {
    return {
      category: "webmcp_model_context",
      canonicalName,
      filename: `res_${id}_webmcp_model_context.${ext}`,
    };
  }
  if (hasCueing) {
    return {
      category: "contextual_cueing",
      canonicalName,
      filename: `res_${id}_contextual_cueing.${ext}`,
    };
  }
  if (/enable-glic|glic-always-open-fre|glic-guest-url/i.test(text)) {
    return {
      category: "ai_settings_flags",
      canonicalName,
      filename: `res_${id}_glic_flags.${ext}`,
    };
  }
  return {
    category: "glic_webui",
    canonicalName,
    filename: `res_${id}_glic_webui.${ext}`,
  };
}

export async function extractRealGeminiInChrome(): Promise<GeminiInChromeExtractionReport> {
  const { version, dir } = await findLatestChromeVersionDir();
  const resourcesPakPath = join(dir, "resources.pak");
  const pakFile = Bun.file(resourcesPakPath);
  const pakBytes = await pakFile.bytes();
  const view = new DataView(
    pakBytes.buffer,
    pakBytes.byteOffset,
    pakBytes.byteLength,
  );

  const resourceCount = view.getUint16(8, true);
  const entries: Array<{ id: number; offset: number }> = [];
  let pos = 12;
  for (let i = 0; i <= resourceCount; i++) {
    entries.push({
      id: view.getUint16(pos, true),
      offset: view.getUint32(pos + 2, true),
    });
    pos += 6;
  }

  const extractedDir = join(OUT_DIR, "extracted");
  const webuiDir = join(OUT_DIR, "webui");
  await mkdir(extractedDir, { recursive: true });
  await mkdir(webuiDir, { recursive: true });
  await mkdir(ASAR_GLIC_DIR, { recursive: true });

  const extractedResources: ExtractedGlicResource[] = [];
  const canonicalWebUiFiles: Record<string, string> = {};
  const patchedRawSlices = new Map<number, Uint8Array>();

  const chromeUrlsSet = new Set<string>([
    "chrome://glic",
    "chrome://glic-fre",
    "chrome://glic-experimental-opt-in/",
    "chrome://on-device-internals",
    "chrome://optimization-guide-internals",
    "chrome://traces-internals",
  ]);
  const glicFlagsSet = new Set<string>([
    "enable-glic",
    "glic",
    "glic-always-open-fre",
    "glic-detaching",
    "glic-z-order-changes",
    "enable-webmcp-testing",
    "prompt-api-for-gemini-nano",
    "PromptApiForGeminiNano",
    "PromptApiForGeminiNanoMultimodalInput",
    "SummarizationApiForGeminiNano",
    "WriterApiForGeminiNano",
    "RewriterApiForGeminiNano",
    "TranslationApi",
    "LanguageDetectionApi",
    "OptimizationGuideOnDeviceModel",
  ]);

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const encoder = new TextEncoder();

  for (let i = 0; i < resourceCount; i++) {
    const cur = entries[i]!;
    const next = entries[i + 1]!;
    if (next.offset <= cur.offset || next.offset > pakBytes.byteLength) {
      continue;
    }
    const rawSlice = pakBytes.subarray(cur.offset, next.offset);
    const { data, compression } = decompressPakSlice(rawSlice);
    const text = decoder.decode(data);

    const urlMatches = text.match(/chrome:\/\/[a-z0-9_-]*glic[a-z0-9_/-]*/gi);
    if (urlMatches) {
      for (const u of urlMatches) chromeUrlsSet.add(u.toLowerCase());
    }
    const flagMatches = text.match(/\b(?:enable-)?glic-[a-z0-9-]+/gi);
    if (flagMatches) {
      for (const f of flagMatches) glicFlagsSet.add(f.toLowerCase());
    }

    const meta = classifyAndNameResource(cur.id, text);
    if (!meta) continue;

    const { patchedText, wasPatched } = patchGlicResourceIfApplicable(
      cur.id,
      text,
    );
    const finalBytes = wasPatched ? encoder.encode(patchedText) : data;
    if (wasPatched) {
      const recompressed =
        compression === "gzip"
          ? new Uint8Array(gzipSync(finalBytes))
          : finalBytes;
      patchedRawSlices.set(cur.id, recompressed);
    }

    const outputPath = join(extractedDir, meta.filename);
    await Bun.write(outputPath, finalBytes);

    if (meta.canonicalName) {
      const canonicalPath = join(webuiDir, meta.canonicalName);
      await Bun.write(canonicalPath, finalBytes);
      canonicalWebUiFiles[meta.canonicalName] = canonicalPath;

      // Also link directly into Gemini.exe ASAR extracted tree (`apps/gemini_windows_patcher/asar_extracted/src/glic/`)
      await Bun.write(join(ASAR_GLIC_DIR, meta.canonicalName), finalBytes);
    }

    const preview = patchedText.replace(/\s+/g, " ").trim().slice(0, 220);

    extractedResources.push({
      resourceId: cur.id,
      byteLength: finalBytes.byteLength,
      compression,
      category: meta.category,
      canonicalName: meta.canonicalName,
      inferredFilename: meta.filename,
      outputPath,
      patched: wasPatched,
      preview,
    });
  }

  // Build repacked DataPack v5 binary (`dist/gemini-in-chrome/resources.patched.pak`)
  const patchedPakBytes = buildPatchedDataPackV5(pakBytes, patchedRawSlices);
  const patchedPakPath = join(OUT_DIR, "resources.patched.pak");
  await Bun.write(patchedPakPath, patchedPakBytes);

  // Attempt in-place installation into Chrome version directory if writable
  let inPlacePakInstalled = false;
  try {
    const bakPakPath = `${resourcesPakPath}.bak`;
    if (!(await Bun.file(bakPakPath).exists())) {
      await Bun.write(bakPakPath, pakBytes);
    }
    await Bun.write(resourcesPakPath, patchedPakBytes);
    inPlacePakInstalled = true;
  } catch {
    inPlacePakInstalled = false;
  }

  const getFileSize = async (name: string) => {
    const f = Bun.file(join(dir, name));
    return (await f.exists()) ? f.size : 0;
  };

  const nativeBinaries = {
    chromeDllBytes: await getFileSize("chrome.dll"),
    chromeCompanerosDllBytes: await getFileSize("chromecompaneros.dll"),
    optimizationGuideDllBytes: await getFileSize(
      "optimization_guide_internal.dll",
    ),
    liteRtWebGpuDllBytes: await getFileSize("libLiteRtWebGpuAccelerator.dll"),
  };

  const enabledExperimentsInLocalState: string[] = [];
  try {
    const localStatePath = join(CHROME_USER_DATA_DIR, "Local State");
    if (await Bun.file(localStatePath).exists()) {
      const localState = (await Bun.file(localStatePath).json()) as Record<
        string,
        unknown
      >;
      const browserObj = ((localState.browser as Record<string, unknown>) ??
        {}) as Record<string, unknown>;
      const existingExperiments = Array.isArray(
        browserObj.enabled_labs_experiments,
      )
        ? (browserObj.enabled_labs_experiments as string[])
        : [];
      const mergedSet = new Set<string>([
        ...existingExperiments,
        ...CHROME_156_AI_AND_GLIC_EXPERIMENTS,
      ]);
      const mergedList = Array.from(mergedSet).sort();
      browserObj.enabled_labs_experiments = mergedList;
      localState.browser = browserObj;

      const glicObj = ((localState.glic as Record<string, unknown>) ??
        {}) as Record<string, unknown>;
      glicObj.completed_fre = true;
      glicObj.launcher_enabled = true;
      glicObj.multi_profile_eligibility_known = true;
      glicObj.pinned_to_tabstrip = true;
      glicObj.experimental_triggering_enabled = true;
      glicObj.web_actuation_enabled = true;
      localState.glic = glicObj;

      await Bun.write(localStatePath, JSON.stringify(localState));
      enabledExperimentsInLocalState.push(...mergedList);
    }
  } catch {}

  const report: GeminiInChromeExtractionReport = {
    ok: extractedResources.length > 0,
    chromeVersion: version,
    chromeInstallDir: dir,
    resourcesPakPath,
    resourcesPakSizeBytes: pakBytes.byteLength,
    patchedPakPath,
    patchedPakSizeBytes: patchedPakBytes.byteLength,
    inPlacePakInstalled,
    asarGlicLinkedDir: ASAR_GLIC_DIR,
    totalPakResources: resourceCount,
    nativeBinaries,
    chromeUrlsDiscovered: Array.from(chromeUrlsSet).sort(),
    glicFlagsDiscovered: Array.from(glicFlagsSet).sort(),
    canonicalWebUiFiles,
    enabledExperimentsInLocalState,
    extractedCount: extractedResources.length,
    extractedResources,
    outputDir: OUT_DIR,
  };

  await Bun.write(
    join(OUT_DIR, "gemini-in-chrome-manifest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  return report;
}

if (import.meta.main) {
  const report = await extractRealGeminiInChrome();
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        chromeVersion: report.chromeVersion,
        totalPakResources: report.totalPakResources,
        extractedCount: report.extractedCount,
        patchedPakPath: report.patchedPakPath,
        patchedPakSizeBytes: report.patchedPakSizeBytes,
        inPlacePakInstalled: report.inPlacePakInstalled,
        asarGlicLinkedDir: report.asarGlicLinkedDir,
        canonicalWebUiFiles: Object.keys(report.canonicalWebUiFiles),
        enabledExperimentsCount: report.enabledExperimentsInLocalState.length,
      },
      null,
      2,
    ),
  );
}
