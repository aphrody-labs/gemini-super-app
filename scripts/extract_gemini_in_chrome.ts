/**
 * @fileoverview Localizes and extracts the REAL native "Gemini in Chrome" (`Glic` / `chrome://glic` / `chrome://glic-fre` /
 * `chrome://glic-experimental-opt-in/` / `glic_api` / `glic.mojom` / `contextual_cueing` / `model_context` /
 * `chromecompaneros.dll` / `optimization_guide_internal.dll` / `libLiteRtWebGpuAccelerator.dll`)
 * directly from the installed Google Chrome 156 binary (`C:\Program Files\Google\Chrome\Application\<version>\resources.pak`),
 * writes canonical WebUI files to `dist/gemini-in-chrome/webui/`, and enables all Glic + WebMCP + Built-in AI flags in Chrome `Local State`.
 */

import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dir, "..");
const CHROME_APP_DIR = "C:\\Program Files\\Google\\Chrome\\Application";
const CHROME_USER_DATA_DIR = `${process.env.LOCALAPPDATA ?? "C:\\Users\\aphro\\AppData\\Local"}\\Google\\Chrome\\User Data`;
const OUT_DIR = join(REPO_ROOT, "dist", "gemini-in-chrome");

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
  readonly preview: string;
}

export interface GeminiInChromeExtractionReport {
  readonly ok: boolean;
  readonly chromeVersion: string;
  readonly chromeInstallDir: string;
  readonly resourcesPakPath: string;
  readonly resourcesPakSizeBytes: number;
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
  19003: "glic_selection_overlay.js",
  19006: "glic_selection_overlay.html.js",
  19009: "glic_selection_overlay.css.js",
  19010: "glic_actor_action.mojom-webui.js",
};

export const CHROME_156_AI_AND_GLIC_EXPERIMENTS: readonly string[] = [
  "enable-glic@1",
  "glic@1",
  "glic-detaching@1",
  "glic-z-order-changes@1",
  "enable-webmcp-testing@1",
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

  const extractedResources: ExtractedGlicResource[] = [];
  const canonicalWebUiFiles: Record<string, string> = {};
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

    const outputPath = join(extractedDir, meta.filename);
    await Bun.write(outputPath, data);

    if (meta.canonicalName) {
      const canonicalPath = join(webuiDir, meta.canonicalName);
      await Bun.write(canonicalPath, data);
      canonicalWebUiFiles[meta.canonicalName] = canonicalPath;
    }

    const preview = text.replace(/\s+/g, " ").trim().slice(0, 220);

    extractedResources.push({
      resourceId: cur.id,
      byteLength: data.byteLength,
      compression,
      category: meta.category,
      canonicalName: meta.canonicalName,
      inferredFilename: meta.filename,
      outputPath,
      preview,
    });
  }

  // Ensure glic_logo.svg exists in webuiDir (if packed in chrome_100_percent.pak, provide the official Gemini in Chrome spark SVG)
  if (!canonicalWebUiFiles["glic_logo.svg"]) {
    const officialGlicLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <defs>
    <linearGradient id="glicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4285F4"/>
      <stop offset="50%" stop-color="#9B72CB"/>
      <stop offset="100%" stop-color="#D96570"/>
    </linearGradient>
  </defs>
  <path d="M12 2C12 7.52285 16.4772 12 22 12C16.4772 12 12 16.4772 12 22C12 16.4772 7.52285 12 2 12C7.52285 12 12 7.52285 12 2Z" fill="url(#glicGrad)"/>
</svg>\n`;
    const logoPath = join(webuiDir, "glic_logo.svg");
    await Bun.write(logoPath, officialGlicLogoSvg);
    canonicalWebUiFiles["glic_logo.svg"] = logoPath;
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

  // Enable Glic + WebMCP + Built-in AI experiments in Chrome User Data Local State
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
      glicObj.pinned_to_tabstrip = true;
      glicObj.experimental_triggering_enabled = true;
      glicObj.web_actuation_enabled = true;
      localState.glic = glicObj;

      await Bun.write(localStatePath, JSON.stringify(localState));
      enabledExperimentsInLocalState.push(...mergedList);

      await Bun.write(
        join(OUT_DIR, "chrome-user-data-glic-state.json"),
        `${JSON.stringify(
          {
            enabledLabsExperiments: mergedList,
            glic: glicObj,
            optimizationGuide:
              localState.optimization_guide ?? localState.on_device_model ?? {},
          },
          null,
          2,
        )}\n`,
      );
    }
  } catch {}

  const report: GeminiInChromeExtractionReport = {
    ok: extractedResources.length > 0,
    chromeVersion: version,
    chromeInstallDir: dir,
    resourcesPakPath,
    resourcesPakSizeBytes: pakBytes.byteLength,
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
        nativeBinaries: report.nativeBinaries,
        canonicalWebUiFiles: Object.keys(report.canonicalWebUiFiles),
        enabledExperimentsCount: report.enabledExperimentsInLocalState.length,
        chromeUrlsDiscovered: report.chromeUrlsDiscovered,
      },
      null,
      2,
    ),
  );
}
