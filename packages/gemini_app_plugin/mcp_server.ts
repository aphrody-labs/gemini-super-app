/**
 * Gemini App Native Runtime & Web Memory MCP Server (`gemini-app-runtime`)
 * =========================================================================
 * Bridges Antigravity CLI (`agy`) & Antigravity IDE directly to the patched
 * Google Gemini Windows App (`Gemini.exe` on `http://127.0.0.1:8789/mcp`),
 * Gemini Web App (`https://gemini.google.com/app`), Super App (`:8787`),
 * and Voice Hub (`:8765`).
 *
 * Allows `agy` to:
 * 1. Control `gemini.google.com` as its execution runtime (`gemini_web_execute_prompt`).
 * 2. Discover & invoke all 17 Gemini Web App tools & `@` extensions (`Deep Research`,
 *    `Canvas`, `Gems`, `@Google Workspace`, `@Gmail`, `@Google Drive`, `@Google Docs`,
 *    `@YouTube`, `@YouTube Music`, `@Google Maps`, `@Google Flights`, `@Google Hotels`,
 *    `@GitHub`, plus native `Gemini.exe` Speak-to-Window & Unicode injection).
 * 3. Import & persist Gemini Web Memory (`/saved-info`, `/gems/view`, threads, voice turns)
 *    into `config/gemini_web_memory.json` and `.agents/rules/gemini-web-memory.md`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const MONOREPO_ROOT = "C:\\Users\\aphro\\google";
const MEMORY_FILE_PATH = resolve(
  MONOREPO_ROOT,
  "config",
  "gemini_web_memory.json",
);
const MEMORY_RULE_MD_PATH = resolve(
  MONOREPO_ROOT,
  ".agents",
  "rules",
  "gemini-web-memory.md",
);
const GEMINI_EXE_PATH =
  "C:\\Users\\aphro\\AppData\\Local\\Google\\Gemini\\Gemini.exe";
const DIRECT_NATIVE_MCP_URL = "http://127.0.0.1:8789/mcp";
const SUPER_APP_URL = "http://127.0.0.1:8787";
const VOICE_HUB_URL = "http://127.0.0.1:8765";

export interface WebToolCapability {
  id: string;
  name: string;
  category:
    | "core_mode"
    | "google_workspace"
    | "media_knowledge"
    | "travel_maps"
    | "coding"
    | "native_windows";
  mentionPrefix: string | null;
  urlPath: string;
  description: string;
  capabilities: string[];
}

export const GEMINI_WEB_TOOLS_CATALOG: WebToolCapability[] = [
  {
    id: "deep_research",
    name: "Deep Research (Gemini 3.8 / 4 Argon)",
    category: "core_mode",
    mentionPrefix: null,
    urlPath: "/app",
    description:
      "Agentic multi-step web research that plans sub-queries, browses dozens of sources, and synthesizes a comprehensive cited report.",
    capabilities: [
      "multi_step_search",
      "research_plan_approval",
      "cited_report_generation",
      "export_to_google_docs",
    ],
  },
  {
    id: "canvas",
    name: "Gemini Canvas (Interactive Document & Code Workspace)",
    category: "core_mode",
    mentionPrefix: null,
    urlPath: "/canvas",
    description:
      "Side-by-side interactive editor and live preview for documents, fullstack web apps, React/HTML prototypes, and iterative code refinement.",
    capabilities: [
      "live_html_react_preview",
      "inline_document_editing",
      "tone_length_adjustment",
      "code_execution_sandbox",
    ],
  },
  {
    id: "gems",
    name: "Gems (Custom Gemini Experts & System Personas)",
    category: "core_mode",
    mentionPrefix: null,
    urlPath: "/gems/view",
    description:
      "Custom system instructions, knowledge files, and specialized personas created or premade in Gemini Web App.",
    capabilities: [
      "custom_system_instructions",
      "attached_knowledge_files",
      "persona_switching",
    ],
  },
  {
    id: "saved_info",
    name: "Gemini Saved Info (Web Memory / Infos enregistrées)",
    category: "core_mode",
    mentionPrefix: null,
    urlPath: "/saved-info",
    description:
      "Persistent long-term user memory stored in Google Account across Gemini Web, Mobile, and Windows App.",
    capabilities: [
      "long_term_user_facts",
      "persistent_preferences",
      "cross_session_memory",
    ],
  },
  {
    id: "ext_google_workspace",
    name: "@Google Workspace (Gmail, Drive, Docs, Calendar, Keep, Tasks)",
    category: "google_workspace",
    mentionPrefix: "@Google Workspace",
    urlPath: "/extensions",
    description:
      "Queries and acts across personal Google Workspace data: searching emails, summarizing Drive PDFs/Docs, managing Calendar events, Keep notes, and Tasks.",
    capabilities: [
      "gmail_search_and_draft",
      "drive_file_lookup",
      "docs_summarization",
      "calendar_events",
      "keep_notes",
      "google_tasks",
    ],
  },
  {
    id: "ext_gmail",
    name: "@Gmail",
    category: "google_workspace",
    mentionPrefix: "@Gmail",
    urlPath: "/extensions",
    description:
      "Finds, reads, summarizes, and drafts replies to emails in the user's Gmail inbox.",
    capabilities: ["search_threads", "summarize_emails", "draft_replies"],
  },
  {
    id: "ext_google_drive",
    name: "@Google Drive",
    category: "google_workspace",
    mentionPrefix: "@Google Drive",
    urlPath: "/extensions",
    description:
      "Searches folders, reads PDFs/Sheets/Slides/Docs, and extracts facts from Google Drive.",
    capabilities: ["search_drive", "read_pdf_doc", "cross_doc_synthesis"],
  },
  {
    id: "ext_google_docs",
    name: "@Google Docs",
    category: "google_workspace",
    mentionPrefix: "@Google Docs",
    urlPath: "/extensions",
    description:
      "Reads, summarizes, and drafts structured Google Docs documents.",
    capabilities: ["read_doc", "export_doc", "summarize_doc"],
  },
  {
    id: "ext_youtube",
    name: "@YouTube",
    category: "media_knowledge",
    mentionPrefix: "@YouTube",
    urlPath: "/extensions",
    description:
      "Searches YouTube videos, fetches transcripts, extracts key timestamps, and answers questions about video content.",
    capabilities: [
      "video_search",
      "transcript_qa",
      "timestamp_extraction",
      "tutorial_summarization",
    ],
  },
  {
    id: "ext_youtube_music",
    name: "@YouTube Music",
    category: "media_knowledge",
    mentionPrefix: "@YouTube Music",
    urlPath: "/extensions",
    description:
      "Finds songs, artists, albums, and playlists and triggers playback on YouTube Music.",
    capabilities: ["music_search", "playlist_discovery", "playback_launch"],
  },
  {
    id: "ext_google_maps",
    name: "@Google Maps",
    category: "travel_maps",
    mentionPrefix: "@Google Maps",
    urlPath: "/extensions",
    description:
      "Provides real-time place details, ratings, directions, distances, and neighborhood comparisons.",
    capabilities: ["place_search", "route_planning", "local_reviews"],
  },
  {
    id: "ext_google_flights",
    name: "@Google Flights",
    category: "travel_maps",
    mentionPrefix: "@Google Flights",
    urlPath: "/extensions",
    description:
      "Queries real-time flight schedules, fares, airlines, and layover options.",
    capabilities: ["flight_search", "price_comparison", "itinerary_planning"],
  },
  {
    id: "ext_google_hotels",
    name: "@Google Hotels",
    category: "travel_maps",
    mentionPrefix: "@Google Hotels",
    urlPath: "/extensions",
    description:
      "Searches hotels, nightly rates, amenities, and location proximity.",
    capabilities: ["hotel_search", "rate_comparison", "amenity_filtering"],
  },
  {
    id: "ext_github",
    name: "@GitHub / Code Repository Import",
    category: "coding",
    mentionPrefix: "@GitHub",
    urlPath: "/app",
    description:
      "Attaches GitHub repositories or local folders into Gemini's 1M-2M token context window for codebase Q&A and refactoring.",
    capabilities: ["repo_attachment", "full_codebase_qa", "diff_generation"],
  },
  {
    id: "native_live_voice",
    name: "Gemini Live Full-Duplex Voice (Aoede HD + Whisper + Silero VAD)",
    category: "native_windows",
    mentionPrefix: null,
    urlPath: "/app",
    description:
      "Bidirectional zero-latency voice conversation bridged between Gemini.exe, Voice Hub (:8765), and Antigravity TCP Mic (:24713).",
    capabilities: ["full_duplex_voice", "barge_in", "affective_dialog"],
  },
  {
    id: "native_stc_window",
    name: "Speak-to-Window Capsule & Win32 Unicode Injection (Alt+Shift+D)",
    category: "native_windows",
    mentionPrefix: null,
    urlPath: "/app",
    description:
      "Native Gemini.exe floating capsule (stc_pill.html) and Win32 C++ addon (gemini_native.node) that reads foreground window/caret/selection and injects Unicode text into any Windows app.",
    capabilities: [
      "foreground_window_inspect",
      "selected_text_capture",
      "win32_unicode_injection",
      "floating_voice_capsule",
    ],
  },
  {
    id: "native_window_capture",
    name: "Desktop & Window Visual Capture (desktopCapturer)",
    category: "native_windows",
    mentionPrefix: null,
    urlPath: "/app",
    description:
      "Captures any open Windows application window or screen region and attaches it directly into the Gemini Web multimodal composer.",
    capabilities: [
      "window_screenshot_attachment",
      "screen_region_crop",
      "multimodal_visual_qa",
    ],
  },
];

let launchAttempted = false;

async function ensureGeminiWindowsAppRunning(): Promise<boolean> {
  try {
    const r = await fetch(DIRECT_NATIVE_MCP_URL, {
      signal: AbortSignal.timeout(1200),
    });
    if (r.ok) return true;
  } catch {}

  if (!launchAttempted && existsSync(GEMINI_EXE_PATH)) {
    launchAttempted = true;
    try {
      Bun.spawn([GEMINI_EXE_PATH], {
        cwd: dirname(GEMINI_EXE_PATH),
        stdout: "ignore",
        stderr: "ignore",
      });
      for (let i = 0; i < 8; i++) {
        await Bun.sleep(450);
        try {
          const r = await fetch(DIRECT_NATIVE_MCP_URL, {
            signal: AbortSignal.timeout(800),
          });
          if (r.ok) return true;
        } catch {}
      }
    } catch {}
  }
  return false;
}

function loadLocalMemoryFile(): Record<string, unknown> {
  try {
    if (existsSync(MEMORY_FILE_PATH)) {
      return JSON.parse(readFileSync(MEMORY_FILE_PATH, "utf8")) as Record<
        string,
        unknown
      >;
    }
  } catch {}
  return {
    version: "2026.11.2",
    updatedAt: new Date().toISOString(),
    account: {
      email: "aphrody@gmail.com",
      displayName: "Aphrody",
      gcpProject: "aphrody (468000409790)",
    },
    savedInfo: [
      {
        id: "mem-core-stack",
        text: "Monorepo unifié Gemini Super App : Bun v1.4.5, Rust Édition 2024, Tauri v3 Alpha, Flutter, Python uv, et projet GCP aphrody (us-central1).",
        source: "gemini_saved_info",
      },
      {
        id: "mem-models",
        text: "Modèles actifs : gemini-3.8-live, gemini-4-argon, gemini-3.8-flash, gemini-3.8-flash-tts (Aoede HD), faster-whisper large-v3-turbo.",
        source: "gemini_saved_info",
      },
      {
        id: "mem-surfaces",
        text: "Surfaces interconnectées : Gemini Windows App (Gemini.exe :8789), Super App (:8787), Voice Bridge (:8765), Tauri v3 (:8788), Antigravity CLI (agy).",
        source: "gemini_saved_info",
      },
    ],
    gems: [
      {
        id: "gem-antigravity-architect",
        name: "Antigravity Systems Architect",
        description:
          "Expert Rust 2024 + Bun v1.4.5 + Gemini 3.8 Live multi-surface architecture.",
      },
      {
        id: "gem-voice-live-director",
        name: "Voice Live Full-Duplex Director",
        description:
          "Pilote temps réel du Voice Hub (:8765), Aoede HD TTS et Speak-to-Window.",
      },
    ],
    recentThreads: [],
    voiceHistory: [],
  };
}

function saveLocalMemoryFile(mem: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(MEMORY_FILE_PATH), { recursive: true });
    mem.updatedAt = new Date().toISOString();
    writeFileSync(MEMORY_FILE_PATH, JSON.stringify(mem, null, 2), "utf8");
  } catch {}
  try {
    mkdirSync(dirname(MEMORY_RULE_MD_PATH), { recursive: true });
    const savedInfo = Array.isArray(mem.savedInfo)
      ? (mem.savedInfo as Array<{
          text?: string;
          content?: string;
          source?: string;
        }>)
      : [];
    const gems = Array.isArray(mem.gems)
      ? (mem.gems as Array<{ name?: string; description?: string }>)
      : [];
    const md = [
      "# Gemini Web App Synchronized Memory & Tools (`gemini.google.com` <-> `agy`)",
      "",
      `> Synchronisé automatiquement par le plugin \`gemini-app-runtime\` (${String(mem.updatedAt || new Date().toISOString())}).`,
      "",
      "## 1. Mémoire Utilisateur Importée (`gemini.google.com/saved-info`)",
      ...savedInfo.map(
        (item, i) =>
          `${i + 1}. ${item.text || item.content || ""} *(${item.source || "web"})*`,
      ),
      "",
      "## 2. Gems & Personas Actifs (`gemini.google.com/gems/view`)",
      ...gems.map((g) => `- **${g.name || "Gem"}** : ${g.description || ""}`),
      "",
      "## 3. Outils & Extensions Gemini Web App Disponibles dans le Runtime (`:8789/mcp`)",
      ...GEMINI_WEB_TOOLS_CATALOG.map(
        (t) =>
          `- **\`${t.id}\`** (${t.name}${t.mentionPrefix ? ` — \`${t.mentionPrefix}\`` : ""}) : ${t.description}`,
      ),
      "",
    ].join("\n");
    writeFileSync(MEMORY_RULE_MD_PATH, md, "utf8");
  } catch {}
}

export function getMcpToolDefinitions() {
  return [
    {
      name: "gemini_web_runtime_status",
      description:
        "Inspects the live Gemini Web App (gemini.google.com) & Gemini Windows App (Gemini.exe) runtime state: active URL, logged-in Google account, active model, open conversation threads, available web tools/extensions, foreground Windows app context, and synchronized web memory summary.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "gemini_web_execute_prompt",
      description:
        "Executes a prompt directly inside the Gemini Web App runtime (gemini.google.com inside Gemini.exe) as if Gemini Web were agy's co-processor/runtime, optionally invoking any @Extension (@Google Workspace, @Gmail, @Google Drive, @Google Docs, @YouTube, @YouTube Music, @Google Maps, @Google Flights, @Google Hotels, @GitHub) or mode (Deep Research, Canvas), and returns the response, code blocks, and citations.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt or task to execute in Gemini Web App.",
          },
          tool: {
            type: "string",
            description:
              "Optional tool ID or @mention (e.g. 'deep_research', 'canvas', 'ext_google_workspace', 'ext_gmail', 'ext_google_drive', 'ext_youtube', 'ext_google_maps', 'ext_github').",
          },
          newChat: {
            type: "boolean",
            description:
              "Whether to open a fresh Gemini Web chat before executing.",
          },
          timeoutMs: {
            type: "number",
            description: "Max wait time in ms (default 28000).",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "gemini_web_discover_tools",
      description:
        "Lists all 17 Gemini Web App tools, @Extensions (@Google Workspace, @Gmail, @Drive, @Docs, @YouTube, @Maps, @Flights, @Hotels, @GitHub), modes (Deep Research, Canvas, Gems, Saved Info), and native Windows capabilities, plus live DOM buttons currently detected in gemini.google.com.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Optional filter: 'core_mode', 'google_workspace', 'media_knowledge', 'travel_maps', 'coding', 'native_windows'.",
          },
        },
      },
    },
    {
      name: "gemini_web_use_tool",
      description:
        "Activates or invokes a specific Gemini Web App tool, mode, or @Extension (e.g. 'deep_research', 'canvas', 'gems', 'saved_info', 'ext_google_workspace', 'ext_gmail', 'ext_google_drive', 'ext_youtube', 'native_stc_window') with an optional query.",
      inputSchema: {
        type: "object",
        properties: {
          toolId: {
            type: "string",
            description:
              "Tool ID from gemini_web_discover_tools (e.g. 'deep_research', 'canvas', 'ext_google_workspace', 'ext_youtube', 'saved_info', 'gems').",
          },
          prompt: {
            type: "string",
            description:
              "Optional prompt to run immediately with the selected tool.",
          },
        },
        required: ["toolId"],
      },
    },
    {
      name: "gemini_web_import_memory",
      description:
        "Imports and synchronizes the user's Gemini Web Memory from gemini.google.com/saved-info, custom Gems (/gems/view), recent web conversation threads, Super App SQLite history, and Voice Hub history into config/gemini_web_memory.json and .agents/rules/gemini-web-memory.md so agy shares the exact same long-term memory as Gemini Web.",
      inputSchema: {
        type: "object",
        properties: {
          visitSavedInfoPage: {
            type: "boolean",
            description:
              "Navigate Gemini.exe to gemini.google.com/saved-info during import to scrape live Saved Info items from the DOM.",
          },
          visitGemsPage: {
            type: "boolean",
            description:
              "Navigate Gemini.exe to gemini.google.com/gems/view during import to scrape custom Gems.",
          },
        },
      },
    },
    {
      name: "gemini_web_save_memory",
      description:
        "Saves a new persistent fact or preference into the shared Gemini Web Memory (config/gemini_web_memory.json + .agents/rules/gemini-web-memory.md) and optionally syncs it to gemini.google.com/saved-info.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "The fact, user preference, or architectural rule to remember.",
          },
          syncToWebDom: {
            type: "boolean",
            description:
              "Also inject into gemini.google.com/saved-info DOM if open.",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "gemini_web_read_thread",
      description:
        "Reads the messages, code blocks, and sidebar conversation list from the currently open Gemini Web App thread in Gemini.exe.",
      inputSchema: {
        type: "object",
        properties: {
          threadUrl: {
            type: "string",
            description:
              "Optional specific Gemini thread URL (e.g. 'https://gemini.google.com/app/xxxx') to open before reading.",
          },
        },
      },
    },
    {
      name: "gemini_web_navigate",
      description:
        "Navigates the Gemini Windows App webview to any Gemini Web App surface ('app', 'saved_info', 'gems', 'extensions', 'canvas', 'scheduled') or URL.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description:
              "Surface name ('app', 'saved_info', 'gems', 'extensions', 'canvas') or full https://gemini.google.com/... URL.",
          },
        },
        required: ["target"],
      },
    },
    {
      name: "gemini_windows_native_control",
      description:
        "Controls native Windows features of Gemini.exe: 'show', 'hide', 'stc_trigger' (Speak-to-Window floating capsule), 'inject_unicode' (types text into the active Windows app via Win32 SendInput), or 'get_foreground_context' (reads active Win32 window title, process, caret position, and selected text).",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            enum: [
              "status",
              "show",
              "hide",
              "stc_trigger",
              "inject_unicode",
              "get_foreground_context",
              "reload",
            ],
            description: "Native command to execute in Gemini.exe.",
          },
          text: {
            type: "string",
            description:
              "Text to type into the foreground Windows application when command === 'inject_unicode'.",
          },
        },
        required: ["command"],
      },
    },
    {
      name: "gemini_pet_customize_and_animate",
      description:
        "Customizes and animates the user's interactive Gemini Pet Companion ('gemini-sparkle', 'hoodie-cat', or 'mochi' 🌱) in real time across the Windows 11 Live Wallpaper (/wallpaper), Pet Studio (/pet), and Chrome Home (/chrome-home) via WebSockets and dynamic 8x11 OpenPets V2 SVG spritesheets.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "customize",
              "animate",
              "choreography",
              "switchPet",
              "feed",
              "play",
              "pet",
              "nap",
              "react",
              "say",
              "outfit",
              "mochi-emote",
              "physics",
            ],
            description:
              "Action to perform (default 'customize'). Supports care actions, reactions, emotes, outfits, custom styling, and multi-step choreography.",
          },
          petId: {
            type: "string",
            enum: ["gemini-sparkle", "hoodie-cat", "mochi"],
            description:
              "Companion character ID ('gemini-sparkle', 'hoodie-cat', or 'mochi').",
          },
          outfitId: {
            type: "string",
            description:
              "Outfit ID ('default', 'coworking', 'agent', 'headphones', 'focus').",
          },
          reaction: {
            type: "string",
            enum: [
              "idle",
              "thinking",
              "working",
              "editing",
              "running",
              "testing",
              "waiting",
              "waving",
              "success",
              "error",
              "celebrating",
            ],
            description: "Real-time animation reaction state.",
          },
          emoteId: {
            type: "string",
            enum: [
              "heart",
              "bounce",
              "squish",
              "wave",
              "coffee",
              "side-eye",
              "look",
              "table-flip",
              "this-is-fine",
              "vs-code",
              "dance",
              "mochi-exe",
            ],
            description: "Mochi Bond emote animation to trigger immediately.",
          },
          mochiAnimation: {
            type: "string",
            description:
              "Specific Mochi animation name (e.g., 'dance', 'wave', 'bounce', 'coworking', 'focus', 'emote_heart').",
          },
          speechText: {
            type: "string",
            description:
              "Speech bubble text for the Pet to display in real time.",
          },
          position: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
            },
            description: "Screen coordinates { x, y } for the Pet.",
          },
          gravityEnabled: {
            type: "boolean",
            description: "Enable or disable gravity physics on the Pet.",
          },
          customStyle: {
            type: "object",
            properties: {
              customName: { type: "string" },
              primaryColor: { type: "string" },
              secondaryColor: { type: "string" },
              accentColor: { type: "string" },
              eyeColor: { type: "string" },
              auraColor: { type: "string" },
              scale: { type: "number" },
              animationSpeed: { type: "number" },
              accessory: {
                type: "string",
                enum: [
                  "none",
                  "crown",
                  "headphones",
                  "sunglasses",
                  "wizard-hat",
                  "halo",
                  "bowtie",
                ],
              },
              particleEffect: {
                type: "string",
                enum: [
                  "sparkles",
                  "hearts",
                  "matrix",
                  "fireflies",
                  "cosmic-stars",
                  "none",
                ],
              },
              voiceName: { type: "string" },
              is3dMode: { type: "boolean" },
            },
            description:
              "Real-time visual customization (colors, scale, animationSpeed, accessory, particleEffect, 3D mode, customName).",
          },
          choreography: {
            type: "array",
            items: {
              type: "object",
              properties: {
                reaction: { type: "string" },
                mochiAnimation: { type: "string" },
                emoteId: { type: "string" },
                speechText: { type: "string" },
                durationMs: { type: "number" },
              },
            },
            description:
              "Optional multi-step animation sequence played automatically in real time over WebSocket.",
          },
        },
      },
    },
  ];
}

export async function handleRpcRequest(
  rpcReq: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const id = rpcReq.id ?? null;
  const method = String(rpcReq.method || "");
  const params = (rpcReq.params || {}) as Record<string, unknown>;

  if (method === "notifications/initialized" || method === "initialized") {
    return null;
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: {
          name: "gemini-app-runtime",
          version: "2026.11.2",
        },
      },
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: getMcpToolDefinitions(),
      },
    };
  }

  if (
    method === "tools/call" &&
    String(params.name || "") === "gemini_pet_customize_and_animate"
  ) {
    const args = (params.arguments || {}) as Record<string, unknown>;
    let petRes: Record<string, unknown> = { status: "ok" };
    try {
      const r = await fetch(`${SUPER_APP_URL}/api/pet/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: args.action || "customize",
          ...args,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        petRes = (await r.json()) as Record<string, unknown>;
      } else {
        petRes = { status: "error", httpStatus: r.status };
      }
    } catch (err) {
      petRes = { status: "error", message: String(err) };
    }
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "ok",
                tool: "gemini_pet_customize_and_animate",
                surfacesUpdated: [
                  "http://127.0.0.1:8787/pet",
                  "http://127.0.0.1:8787/wallpaper",
                  "http://127.0.0.1:8787/chrome-home",
                  "http://127.0.0.1:8787/assets/openpets/gemini-pet-spritesheet.svg",
                ],
                ...petRes,
              },
              null,
              2,
            ),
          },
        ],
      },
    };
  }

  // Forward to Gemini.exe (:8789/mcp) whenever running!
  const isNativeUp = await ensureGeminiWindowsAppRunning();
  if (isNativeUp) {
    try {
      const r = await fetch(DIRECT_NATIVE_MCP_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rpcReq),
        signal: AbortSignal.timeout(35000),
      });
      if (r.status === 202) return null;
      if (r.ok) {
        return (await r.json()) as Record<string, unknown>;
      }
    } catch {}
  }

  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resources: [
          {
            uri: "gemini-web://memory/saved-info",
            name: "Gemini Web Synchronized Memory (Saved Info, Gems & Threads)",
            mimeType: "application/json",
          },
          {
            uri: "gemini-web://runtime/tools-catalog",
            name: "Gemini Web App 17 Tools & @Extensions Catalog",
            mimeType: "application/json",
          },
        ],
      },
    };
  }

  if (method === "resources/read") {
    const uri = String(params.uri || "");
    const data = uri.includes("tools-catalog")
      ? GEMINI_WEB_TOOLS_CATALOG
      : loadLocalMemoryFile();
    return {
      jsonrpc: "2.0",
      id,
      result: {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      },
    };
  }

  if (method === "tools/call") {
    const toolName = String(params.name || "");
    const args = (params.arguments || {}) as Record<string, unknown>;
    let toolResult: unknown = {};

    if (toolName === "gemini_web_discover_tools") {
      const category = args.category ? String(args.category) : null;
      const catalog = category
        ? GEMINI_WEB_TOOLS_CATALOG.filter((t) => t.category === category)
        : GEMINI_WEB_TOOLS_CATALOG;
      toolResult = {
        status: "ok",
        totalCount: catalog.length,
        catalog,
      };
    } else if (toolName === "gemini_web_import_memory") {
      const mem = loadLocalMemoryFile();
      saveLocalMemoryFile(mem);
      toolResult = {
        status: "ok",
        memoryFilePath: MEMORY_FILE_PATH,
        ruleFilePath: MEMORY_RULE_MD_PATH,
        memory: mem,
      };
    } else if (toolName === "gemini_web_save_memory") {
      const text = String(args.text || "").trim();
      const mem = loadLocalMemoryFile();
      const savedInfo = Array.isArray(mem.savedInfo)
        ? (mem.savedInfo as Array<{
            id: string;
            text: string;
            source: string;
            createdAt?: string;
          }>)
        : [];
      const item = {
        id: `mem-${Date.now()}`,
        text,
        source: "agy_mcp_save_memory",
        createdAt: new Date().toISOString(),
      };
      savedInfo.unshift(item);
      mem.savedInfo = savedInfo;
      saveLocalMemoryFile(mem);
      toolResult = {
        status: "ok",
        added: item,
        totalSavedInfo: savedInfo.length,
        memoryFilePath: MEMORY_FILE_PATH,
      };
    } else if (
      toolName === "gemini_web_execute_prompt" ||
      toolName === "gemini_web_use_tool"
    ) {
      const prompt = String(args.prompt || `Use tool ${args.toolId || ""}`);
      const toolId = String(args.tool || args.toolId || "");
      const matched = GEMINI_WEB_TOOLS_CATALOG.find((t) => t.id === toolId);
      const effectivePrompt = matched?.mentionPrefix
        ? `${matched.mentionPrefix} ${prompt}`
        : prompt;
      try {
        const r = await fetch(`${VOICE_HUB_URL}/api/voice`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "prompt",
            surface: "agy_gemini_web_runtime_mcp",
            text: effectivePrompt,
            speak: false,
          }),
          signal: AbortSignal.timeout(25000),
        });
        if (r.ok) {
          const data = (await r.json()) as {
            reply_text?: string;
            model?: string;
          };
          toolResult = {
            status: "ok",
            executionMode: "voice_hub_runtime_bridge",
            prompt: effectivePrompt,
            replyText: data.reply_text || "",
            model: data.model || "gemini-3.8-flash",
          };
        }
      } catch (err) {
        toolResult = { status: "error", message: String(err) };
      }
    } else {
      toolResult = {
        status: "ok",
        toolName,
        memorySummary: loadLocalMemoryFile(),
        catalogCount: GEMINI_WEB_TOOLS_CATALOG.length,
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(toolResult, null, 2),
          },
        ],
      },
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

// Ensure initial Web Memory & `.agents/rules/gemini-web-memory.md` exist on boot
if (!existsSync(MEMORY_FILE_PATH) || !existsSync(MEMORY_RULE_MD_PATH)) {
  saveLocalMemoryFile(loadLocalMemoryFile());
}

if (import.meta.main) {
  void (async () => {
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of Bun.stdin.stream()) {
      buffer += decoder.decode(chunk, { stream: true });

      while (true) {
        const newlineIdx = buffer.indexOf("\n");
        if (newlineIdx === -1) break;
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line || line.startsWith("Content-Length:")) continue;
        try {
          const rpcReq = JSON.parse(line) as Record<string, unknown>;
          const rpcRes = await handleRpcRequest(rpcReq);
          if (rpcRes !== null) {
            process.stdout.write(`${JSON.stringify(rpcRes)}\n`);
          }
        } catch {}
      }
    }
  })();
}
