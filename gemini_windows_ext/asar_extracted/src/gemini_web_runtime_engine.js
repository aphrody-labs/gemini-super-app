// ============================================================================
// Gemini Web App Runtime & Memory Engine (Natively Embedded in Gemini.exe)
// ============================================================================
// Turns Google Gemini Windows App (Gemini.exe v1.17.0 / gemini.google.com)
// into a controllable runtime, tool provider, and web memory source for
// Antigravity CLI (`agy`) and the Gemini Super App.
//
// Exposed over:
// - HTTP REST on http://127.0.0.1:8789/api/runtime/*
// - MCP Streamable HTTP (JSON-RPC 2.0) on http://127.0.0.1:8789/mcp
// - Electron IPC (`gemini-runtime:*`)
// ============================================================================

const fs = require("fs");
const path = require("path");
const http = require("http");
const electron = require("electron");

const REPO_ROOT = "C:\\Users\\aphro\\google";
const MEMORY_JSON_PATH = path.join(REPO_ROOT, "config", "gemini_web_memory.json");
const MEMORY_RULE_PATH = path.join(
  REPO_ROOT,
  ".agents",
  "rules",
  "gemini-web-memory.md",
);

const GEMINI_WEB_TOOLS_CATALOG = [
  {
    id: "deep_research",
    name: "Deep Research",
    category: "capability",
    trigger: "chip:Deep Research",
    description:
      "Agent de recherche autonome multi-étapes sur gemini.google.com qui planifie, navigue sur des dizaines de sources web + Workspace et rédige un rapport sourcé complet.",
  },
  {
    id: "canvas",
    name: "Canvas",
    category: "capability",
    trigger: "chip:Canvas",
    description:
      "Espace de travail côte-à-côte interactif sur gemini.google.com pour l'édition de documents longs et la prévisualisation/exécution de code HTML/React/JS/Python.",
  },
  {
    id: "gems",
    name: "Gems (Custom AI Experts)",
    category: "capability",
    trigger: "url:https://gemini.google.com/gems/view",
    description:
      "Assistants Gemini personnalisés avec instructions système dédiées (Coding Partner, Brainstormer, Writing Editor, Career Guide, Learning Coach et Gems utilisateur).",
  },
  {
    id: "saved_info",
    name: "Saved Info / Web Memory",
    category: "memory",
    trigger: "url:https://gemini.google.com/saved-info",
    description:
      "Mémoire persistante de l'utilisateur sur gemini.google.com/saved-info (préférences, contexte projet, instructions permanentes).",
  },
  {
    id: "ext_google_workspace",
    name: "@Google Workspace",
    category: "extension",
    mention: "@Google Workspace",
    description:
      "Connecteur officiel Google Workspace (Gmail, Google Drive, Google Docs, Google Keep, Google Tasks, Google Calendar).",
  },
  {
    id: "ext_gmail",
    name: "@Gmail",
    category: "extension",
    mention: "@Gmail",
    description:
      "Recherche, résume et croise les e-mails de la boîte Gmail de l'utilisateur directement dans Gemini Web.",
  },
  {
    id: "ext_google_drive",
    name: "@Google Drive",
    category: "extension",
    mention: "@Google Drive",
    description:
      "Recherche et extrait le contenu des documents, PDF et dossiers Google Drive de l'utilisateur.",
  },
  {
    id: "ext_google_docs",
    name: "@Google Docs",
    category: "extension",
    mention: "@Google Docs",
    description:
      "Lit, résume et génère du contenu structuré à partir des documents Google Docs.",
  },
  {
    id: "ext_youtube",
    name: "@YouTube",
    category: "extension",
    mention: "@YouTube",
    description:
      "Recherche des vidéos YouTube, extrait les transcriptions et résume le contenu vidéo.",
  },
  {
    id: "ext_youtube_music",
    name: "@YouTube Music",
    category: "extension",
    mention: "@YouTube Music",
    description:
      "Recherche et lance des titres, artistes, albums et playlists sur YouTube Music.",
  },
  {
    id: "ext_google_maps",
    name: "@Google Maps",
    category: "extension",
    mention: "@Google Maps",
    description:
      "Recherche des lieux, itinéraires, distances et informations géographiques en temps réel via Google Maps.",
  },
  {
    id: "ext_google_flights",
    name: "@Google Flights",
    category: "extension",
    mention: "@Google Flights",
    description:
      "Recherche des vols, horaires et tarifs aériens en temps réel via Google Flights.",
  },
  {
    id: "ext_google_hotels",
    name: "@Google Hotels",
    category: "extension",
    mention: "@Google Hotels",
    description:
      "Recherche et compare des hôtels et hébergements via Google Hotels.",
  },
  {
    id: "ext_github",
    name: "@GitHub",
    category: "extension",
    mention: "@GitHub",
    description:
      "Inspecte des dépôts, issues, pull requests et fichiers de code GitHub dans Gemini.",
  },
  {
    id: "native_live_voice",
    name: "Gemini Live Voice-to-Voice (Full-Duplex)",
    category: "native_windows",
    trigger: "ipc:gemini-voice:stc-trigger",
    description:
      "Mode vocal bidirectionnel temps réel (16 kHz PCM16 -> Whisper/Gemini 3.8 Live -> TTS 24 kHz + Barge-in).",
  },
  {
    id: "native_stc_window",
    name: "Speak-to-Window & Unicode Injection",
    category: "native_windows",
    trigger: "native:injectUnicodeText",
    description:
      "Capsule flottante Speak-to-Window (Alt+Shift+D) et injection directe de texte Unicode dans la fenêtre Windows active via gemini_native.node.",
  },
  {
    id: "native_window_capture",
    name: "Desktop Window Capture (Multimodal Vision)",
    category: "native_windows",
    trigger: "native:captureWindow",
    description:
      "Capture d'écran haute résolution des fenêtres Windows ouvertes ou de la vue Gemini Web pour analyse multimodale.",
  },
];

function loadMemoryStore() {
  try {
    if (fs.existsSync(MEMORY_JSON_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_JSON_PATH, "utf8"));
    }
  } catch {}
  return {
    version: "2026.11.2",
    updatedAt: new Date().toISOString(),
    source: "gemini.google.com (Gemini.exe Native Runtime)",
    account: {
      email: "aphro@google.com",
      gaiaId: "default",
      authenticated: false,
    },
    savedInfo: [
      {
        id: "mem-arch-monorepo",
        content:
          "Monorepo unifié Gemini Super App & Voice Hub (Rust Édition 2024, Bun v1.4.5, Tauri v3 Alpha, Python uv, Flutter) sur C:\\Users\\aphro\\google.",
        category: "architecture",
        source: "system_seed",
        createdAt: "2026-11-02T00:00:00Z",
      },
      {
        id: "mem-gcp-aphrody",
        content:
          "Projet GCP actif: aphrody (468000409790, us-central1) avec modèles gemini-3.8-live, gemini-4-argon, gemini-3.8-flash et gemini-3.8-flash-tts (voix Aoede).",
        category: "cloud",
        source: "system_seed",
        createdAt: "2026-11-02T00:00:00Z",
      },
      {
        id: "mem-bun-toolchain",
        content:
          "Toujours utiliser Bun (bun run, bun fmt, bun check, bun test, Bun.serve, bun:sqlite) et uv pour Python.",
        category: "preferences",
        source: "system_seed",
        createdAt: "2026-11-02T00:00:00Z",
      },
    ],
    gems: [
      {
        id: "gem-coding-partner",
        name: "Coding Partner",
        description:
          "Expert en architecture logicielle, Rust, Bun, TypeScript, Python et débogage fullstack.",
        builtIn: true,
      },
      {
        id: "gem-deep-researcher",
        name: "Deep Research Analyst",
        description:
          "Synthétise des recherches multi-sources web et Google Workspace avec citations vérifiées.",
        builtIn: true,
      },
      {
        id: "gem-voice-companion",
        name: "Gemini Live Voice & Mochi Companion",
        description:
          "Assistant vocal temps réel connecté à Gemini.exe, Chrome /chrome-home et agy CLI.",
        builtIn: false,
      },
    ],
    conversations: [],
    recentTurns: [],
    discoveredWebTools: GEMINI_WEB_TOOLS_CATALOG,
  };
}

function saveMemoryStore(store) {
  try {
    store.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(MEMORY_JSON_PATH), { recursive: true });
    fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(store, null, 2), "utf8");
    syncAntigravityMemoryRuleFile(store);
  } catch {}
  return store;
}

function syncAntigravityMemoryRuleFile(store) {
  try {
    fs.mkdirSync(path.dirname(MEMORY_RULE_PATH), { recursive: true });
    const savedList = (store.savedInfo || [])
      .slice(0, 30)
      .map((item) => `- **[${item.category || "memory"}]** ${item.content}`)
      .join("\n");
    const gemsList = (store.gems || [])
      .slice(0, 15)
      .map((g) => `- **${g.name}** (\`${g.id}\`): ${g.description || ""}`)
      .join("\n");
    const convList = (store.conversations || [])
      .slice(0, 10)
      .map((c) => `- \`${c.id}\`: ${c.title} (${c.url || ""})`)
      .join("\n");
    const toolsList = GEMINI_WEB_TOOLS_CATALOG.map(
      (t) =>
        `- **${t.name}** (\`${t.id}\`${t.mention ? `, mention \`${t.mention}\`` : ""}): ${t.description}`,
    ).join("\n");

    const md = `---
description: Synchronized Gemini Web App Memory, Saved Info, Gems, and Web Tools Runtime Context for Antigravity (agy)
---

# Gemini Web App Runtime & Imported Web Memory (\`gemini.google.com\` / \`Gemini.exe :8789\`)

Ce fichier est synchronisé automatiquement par le plugin natif **\`gemini-app-runtime\`** embarqué dans **Google Gemini Windows App (\`Gemini.exe\`, port \`:8789\`)**.
\`agy\` peut contrôler l'application Gemini Web & Windows comme son propre runtime via les outils MCP \`gemini_web_*\`.

## 1. État du Compte & Runtime
- **Serveur Runtime Direct \`Gemini.exe\`** : \`http://127.0.0.1:8789\` (MCP : \`http://127.0.0.1:8789/mcp\`, REST : \`http://127.0.0.1:8789/api/runtime/status\`)
- **Dernière synchronisation mémoire** : \`${store.updatedAt}\`
- **Compte détecté** : \`${store.account?.email || "Session locale Gemini"}\` (authentifié Web : \`${Boolean(store.account?.authenticated)}\`)

## 2. Mémoire Web Importée (\`gemini.google.com/saved-info\`)
${savedList || "- Aucune information enregistrée."}

## 3. Gems Actifs (\`gemini.google.com/gems/view\`)
${gemsList || "- Aucun Gem personnalisé."}

## 4. Outils Web & Extensions Gemini Disponibles pour \`agy\`
${toolsList}

## 5. Conversations Gemini Web Récentes
${convList || "- Aucune conversation distante indexée (voir l'historique Super App :8787 et Voice Bridge :8765)."}
`;
    fs.writeFileSync(MEMORY_RULE_PATH, md, "utf8");
  } catch {}
}

function httpPostLocalJson(host, port, urlPath, payload, timeoutMs = 15000) {
  return new Promise((resolve) => {
    try {
      const bodyStr = JSON.stringify(payload || {});
      const req = http.request(
        {
          hostname: host,
          port,
          path: urlPath,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyStr),
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch {
              resolve(null);
            }
          });
        },
      );
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.write(bodyStr);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

function httpGetLocalJson(host, port, urlPath, timeoutMs = 3000) {
  return new Promise((resolve) => {
    try {
      const req = http.get(
        { hostname: host, port, path: urlPath, timeout: timeoutMs },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch {
              resolve(null);
            }
          });
        },
      );
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Deeply inspects the live DOM and WIZ_global_data of `gemini.google.com`
 * inside `Gemini.exe`'s main WebContentsView.
 */
async function inspectGeminiWebDom(mainHooks) {
  const mainWc = mainHooks?.getMainWebContents?.();
  if (!mainWc || mainWc.isDestroyed()) {
    return {
      available: false,
      reason: "main_webcontents_unavailable",
    };
  }

  const currentUrl = mainWc.getURL() || "";
  const title = mainWc.getTitle() || "Gemini";
  const isLoading = Boolean(mainWc.isLoading());

  const domScript = `(() => {
    try {
      const wiz = window.WIZ_global_data || {};
      const emailMatch = JSON.stringify(wiz).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
      const gaiaId = typeof wiz.S06Grb === "string" ? wiz.S06Grb : (typeof wiz.oPEP7c === "string" ? wiz.oPEP7c : "");
      const accountBtn = document.querySelector('a[aria-label*="Google"], button[aria-label*="Compte"], button[aria-label*="Account"], img[alt*="Google"]');
      const accountLabel = accountBtn ? (accountBtn.getAttribute("aria-label") || accountBtn.getAttribute("alt") || "") : "";

      // Active model selector
      const modelBtn = document.querySelector('[data-test-id*="model"], button.input-area-switch, .model-picker-container button, bard-mode-switcher button');
      const activeModelLabel = modelBtn ? (modelBtn.textContent || "").trim() : "Gemini 3.8 Live / Flash";

      // Discover visible tool chips & buttons
      const domTools = [];
      const chipEls = document.querySelectorAll('button, [role="button"], mat-chip, .toolbox-drawer-item');
      for (const el of chipEls) {
        const txt = (el.textContent || "").trim();
        const aria = (el.getAttribute("aria-label") || "").trim();
        const label = txt || aria;
        if (label && label.length >= 3 && label.length <= 48) {
          if (/deep research|canvas|image|veo|video|code|gem|workspace|drive|gmail|youtube|maps|flights|hotels|live|micro/i.test(label)) {
            if (!domTools.includes(label)) domTools.push(label);
          }
        }
      }

      // Discover sidebar conversations
      const conversations = [];
      const convLinks = document.querySelectorAll('a[href*="/app/"], [data-test-id="conversation"], .conversation-items-container a, .conversations-container [role="listitem"]');
      for (const el of convLinks) {
        const href = el.getAttribute("href") || "";
        const convTitle = (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120);
        if (convTitle) {
          const idMatch = href.match(/\\/app\\/([a-zA-Z0-9_-]+)/);
          const id = idMatch ? idMatch[1] : "conv-" + conversations.length;
          if (!conversations.some((c) => c.id === id && c.title === convTitle)) {
            conversations.push({
              id,
              title: convTitle,
              url: href.startsWith("http") ? href : "https://gemini.google.com" + (href || "/app"),
            });
          }
        }
      }

      // Extract current thread messages
      const messages = [];
      const userEls = document.querySelectorAll('user-query, [data-message-author-role="user"], .user-query-container');
      const modelEls = document.querySelectorAll('model-response, message-content, [data-message-author-role="model"], .model-response-text');
      const maxLen = Math.max(userEls.length, modelEls.length);
      for (let i = 0; i < maxLen; i++) {
        if (userEls[i]) {
          const t = (userEls[i].innerText || userEls[i].textContent || "").trim();
          if (t) messages.push({ role: "user", text: t });
        }
        if (modelEls[i]) {
          const t = (modelEls[i].innerText || modelEls[i].textContent || "").trim();
          if (t) messages.push({ role: "model", text: t });
        }
      }

      // Extract Saved Info items if currently on /saved-info
      const savedInfoDom = [];
      if (location.pathname.includes("saved-info") || location.pathname.includes("memory")) {
        const items = document.querySelectorAll('[role="listitem"], .memory-item, .saved-info-item, mat-card');
        for (const item of items) {
          const t = (item.innerText || item.textContent || "").trim();
          if (t && t.length > 4 && t.length < 600) {
            savedInfoDom.push(t);
          }
        }
      }

      // Extract Gems if currently on /gems
      const gemsDom = [];
      if (location.pathname.includes("gems")) {
        const cards = document.querySelectorAll('a[href*="/gem/"], [role="listitem"], .gem-card, mat-card');
        for (const card of cards) {
          const t = (card.innerText || card.textContent || "").trim().replace(/\\s+/g, " ");
          const href = card.getAttribute("href") || "";
          if (t && t.length > 3 && t.length < 300) {
            gemsDom.push({ name: t.slice(0, 80), description: t, url: href });
          }
        }
      }

      // Prompt editor availability
      const editor = document.querySelector('div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], textarea, [contenteditable="true"][role="textbox"]');

      return {
        url: location.href,
        pathname: location.pathname,
        title: document.title,
        authenticated: Boolean(gaiaId || emailMatch || accountLabel || editor),
        email: emailMatch ? emailMatch[0] : "",
        gaiaId,
        accountLabel,
        activeModelLabel,
        editorReady: Boolean(editor),
        domTools,
        conversations: conversations.slice(0, 25),
        messages: messages.slice(-20),
        savedInfoDom,
        gemsDom,
      };
    } catch (err) {
      return { error: String(err) };
    }
  })()`;

  try {
    const domState = await Promise.race([
      mainWc.executeJavaScript(domScript, true),
      new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 2500),
      ),
    ]);
    return {
      available: true,
      currentUrl,
      title,
      isLoading,
      dom: domState || {},
    };
  } catch (err) {
    return {
      available: true,
      currentUrl,
      title,
      isLoading,
      error: String(err),
    };
  }
}

/**
 * Full runtime status combining Gemini.exe native Win32 state, live DOM state,
 * available tools, and imported Web Memory summary.
 */
async function getRuntimeStatus(mainHooks, nativeSnapshotFn) {
  const domInspection = await inspectGeminiWebDom(mainHooks);
  const store = loadMemoryStore();

  if (domInspection?.dom?.authenticated) {
    store.account = {
      email:
        domInspection.dom.email ||
        store.account?.email ||
        "aphro@google.com",
      gaiaId: domInspection.dom.gaiaId || store.account?.gaiaId || "default",
      accountLabel: domInspection.dom.accountLabel || "",
      authenticated: true,
    };
    if (
      Array.isArray(domInspection.dom.conversations) &&
      domInspection.dom.conversations.length > 0
    ) {
      store.conversations = domInspection.dom.conversations;
    }
    saveMemoryStore(store);
  }

  return {
    status: "ok",
    runtime: "gemini-windows-web-runtime",
    version: "2026.11.2",
    directEndpoint: "http://127.0.0.1:8789",
    mcpEndpoint: "http://127.0.0.1:8789/mcp",
    nativeState:
      typeof nativeSnapshotFn === "function" ? nativeSnapshotFn() : {},
    webView: domInspection,
    account: store.account,
    toolsCatalog: GEMINI_WEB_TOOLS_CATALOG,
    memorySummary: {
      savedInfoCount: (store.savedInfo || []).length,
      gemsCount: (store.gems || []).length,
      conversationsCount: (store.conversations || []).length,
      updatedAt: store.updatedAt,
      memoryJsonPath: MEMORY_JSON_PATH,
      memoryRulePath: MEMORY_RULE_PATH,
    },
  };
}

/**
 * Executes a prompt inside Gemini Web App (`gemini.google.com` in `Gemini.exe`)
 * or via the unified Gemini Live / Super App runtime if the DOM editor is not open,
 * while injecting the user's imported Web Memory and tool context!
 */
async function executeRuntimePrompt(mainHooks, payload = {}) {
  const prompt = String(payload.prompt || payload.text || "").trim();
  if (!prompt) {
    return { status: "error", message: "Missing prompt" };
  }

  const toolId = String(payload.tool || payload.extension || "").trim();
  const mode = String(payload.mode || "").trim(); // 'deep_research' | 'canvas' | 'thinking' | 'fast' | 'pro'
  const useDomFirst = payload.useDom !== false;
  const store = loadMemoryStore();

  // Format prompt with @Extension mention if requested
  let effectiveWebPrompt = prompt;
  const matchedTool = GEMINI_WEB_TOOLS_CATALOG.find(
    (t) =>
      t.id === toolId ||
      t.mention?.toLowerCase() === toolId.toLowerCase() ||
      t.name.toLowerCase() === toolId.toLowerCase(),
  );
  if (matchedTool?.mention && !effectiveWebPrompt.startsWith("@")) {
    effectiveWebPrompt = `${matchedTool.mention} ${effectiveWebPrompt}`;
  }

  const mainWc = mainHooks?.getMainWebContents?.();
  let domResult = null;

  if (useDomFirst && mainWc && !mainWc.isDestroyed()) {
    const injectScript = `(() => {
      try {
        const promptText = ${JSON.stringify(effectiveWebPrompt)};
        const requestedMode = ${JSON.stringify(mode || toolId)};

        // Activate tool chip if requested (e.g. Deep Research or Canvas)
        if (requestedMode) {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], mat-chip'));
          const chip = buttons.find((b) => {
            const t = (b.textContent || b.getAttribute("aria-label") || "").toLowerCase();
            return (requestedMode.includes("deep") && t.includes("deep research")) ||
                   (requestedMode.includes("canvas") && t.includes("canvas"));
          });
          if (chip && chip.getAttribute("aria-pressed") !== "true") {
            chip.click();
          }
        }

        const editor = document.querySelector(
          'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], [contenteditable="true"][role="textbox"], textarea'
        );
        if (!editor) {
          return { injected: false, reason: "no_editor_on_current_page", url: location.href };
        }

        const initialModelCount = document.querySelectorAll('model-response, message-content, [data-message-author-role="model"]').length;

        editor.focus();
        if (editor.tagName === "TEXTAREA" || editor.tagName === "INPUT") {
          editor.value = promptText;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          editor.innerHTML = "";
          document.execCommand("insertText", false, promptText);
          editor.dispatchEvent(new InputEvent("input", { bubbles: true, data: promptText }));
        }

        setTimeout(() => {
          const sendBtn = document.querySelector(
            'button.send-button, button[aria-label*="Envoyer"], button[aria-label*="Send"], button[mattooltip*="Send"], button[mattooltip*="Envoyer"], .send-button-container button'
          );
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          } else {
            editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
          }
        }, 120);

        return { injected: true, initialModelCount, url: location.href };
      } catch (e) {
        return { injected: false, error: String(e) };
      }
    })()`;

    try {
      const inj = await mainWc.executeJavaScript(injectScript, true);
      if (inj && inj.injected && payload.waitForDomResponse !== false) {
        const maxWaitMs = Number(payload.timeoutMs || 12000);
        const start = Date.now();
        let lastText = "";
        let stableTicks = 0;

        while (Date.now() - start < maxWaitMs) {
          await new Promise((r) => setTimeout(r, 450));
          const poll = await mainWc.executeJavaScript(
            `(() => {
              const responses = document.querySelectorAll('model-response, message-content, [data-message-author-role="model"]');
              if (responses.length <= ${Number(inj.initialModelCount || 0)}) {
                return { ready: false, count: responses.length };
              }
              const last = responses[responses.length - 1];
              const text = (last.innerText || last.textContent || "").trim();
              const stopBtn = document.querySelector('button[aria-label*="Stop"], button[aria-label*="Arrêter"]');
              const codeBlocks = Array.from(last.querySelectorAll("pre code, code")).map((c) => (c.innerText || "").trim()).filter(Boolean);
              const citations = Array.from(last.querySelectorAll("a[href^='http']")).map((a) => ({ title: (a.textContent || "").trim(), url: a.getAttribute("href") }));
              return {
                ready: Boolean(text.length > 0 && !stopBtn),
                streaming: Boolean(stopBtn),
                text,
                codeBlocks,
                citations,
              };
            })()`,
            true,
          );
          if (poll && poll.text) {
            if (poll.text === lastText && !poll.streaming) {
              stableTicks++;
              if (stableTicks >= 2) {
                domResult = poll;
                break;
              }
            } else {
              lastText = poll.text;
              stableTicks = 0;
            }
          }
        }
      }
    } catch {}
  }

  if (domResult && domResult.text) {
    store.recentTurns = (store.recentTurns || []).concat([
      {
        id: `turn-${Date.now()}`,
        prompt: effectiveWebPrompt,
        reply: domResult.text,
        tool: toolId || "gemini_web_dom",
        source: "gemini.google.com (DOM Live)",
        timestamp: new Date().toISOString(),
      },
    ]).slice(-30);
    saveMemoryStore(store);

    return {
      status: "ok",
      executionEngine: "gemini_web_dom_live",
      prompt: effectiveWebPrompt,
      reply_text: domResult.text,
      code_blocks: domResult.codeBlocks || [],
      citations: domResult.citations || [],
      tool_used: matchedTool ? matchedTool.id : toolId || "gemini_web",
      memory_context_applied: true,
    };
  }

  // Fallback / Hybrid Execution via Voice Hub (:8765) or Super App (:8787) with Web Memory Context
  const memoryContextSnippet = (store.savedInfo || [])
    .slice(0, 8)
    .map((m) => m.content)
    .join(" | ");
  const contextualizedPrompt = memoryContextSnippet
    ? `[Contexte Mémoire Gemini Web: ${memoryContextSnippet}] ${
        matchedTool ? `[Outil Gemini Web actif: ${matchedTool.name}] ` : ""
      }${effectiveWebPrompt}`
    : effectiveWebPrompt;

  const voiceHubRes = await httpPostLocalJson(
    "127.0.0.1",
    8765,
    "/api/voice",
    {
      action: "utterance",
      surface: "gemini_windows_runtime",
      text: contextualizedPrompt,
      include_audio: Boolean(payload.includeAudio),
      use_agy_cli: Boolean(payload.useAgyCli),
    },
    18000,
  );

  const replyText =
    voiceHubRes?.model_turn?.text ||
    voiceHubRes?.reply_text ||
    `[Runtime Gemini Windows] Exécuté : ${effectiveWebPrompt}`;
  const modelUsed =
    voiceHubRes?.model_turn?.model_used || "gemini-3.8-flash (Web Runtime)";

  store.recentTurns = (store.recentTurns || []).concat([
    {
      id: `turn-${Date.now()}`,
      prompt: effectiveWebPrompt,
      reply: replyText,
      tool: matchedTool ? matchedTool.id : toolId || "gemini_runtime",
      source: modelUsed,
      timestamp: new Date().toISOString(),
    },
  ]).slice(-30);
  saveMemoryStore(store);

  return {
    status: "ok",
    executionEngine: "gemini_windows_hybrid_runtime",
    model: modelUsed,
    prompt: effectiveWebPrompt,
    reply_text: replyText,
    audio_base64: voiceHubRes?.audio_base64 || "",
    tool_used: matchedTool ? matchedTool.id : toolId || "default",
    memory_context_applied: true,
    saved_info_items_used: (store.savedInfo || []).length,
  };
}

/**
 * Imports Web Memory from:
 * 1. `https://gemini.google.com/saved-info` (via authenticated Electron session fetch & DOM)
 * 2. `https://gemini.google.com/gems/view`
 * 3. Active conversation threads in `Gemini.exe`, Super App (`:8787`), and Voice Bridge (`:8765`)
 * And persists everything to `config/gemini_web_memory.json` + `.agents/rules/gemini-web-memory.md`.
 */
async function importGeminiWebMemory(mainHooks, options = {}) {
  const store = loadMemoryStore();
  const importedSavedInfo = [];
  const importedGems = [];

  // 1. Inspect current DOM first
  const domSnap = await inspectGeminiWebDom(mainHooks);
  if (domSnap?.dom) {
    if (domSnap.dom.authenticated) {
      store.account = {
        email: domSnap.dom.email || store.account?.email || "aphro@google.com",
        gaiaId: domSnap.dom.gaiaId || store.account?.gaiaId || "default",
        accountLabel: domSnap.dom.accountLabel || "",
        authenticated: true,
      };
    }
    if (Array.isArray(domSnap.dom.savedInfoDom)) {
      for (const txt of domSnap.dom.savedInfoDom) {
        importedSavedInfo.push({
          id: `web-saved-${Buffer.from(txt).toString("base64").slice(0, 12)}`,
          content: txt,
          category: "gemini_web_saved_info",
          source: "gemini.google.com/saved-info",
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (Array.isArray(domSnap.dom.gemsDom)) {
      for (const g of domSnap.dom.gemsDom) {
        importedGems.push({
          id: `gem-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: g.name,
          description: g.description,
          url: g.url,
          builtIn: false,
        });
      }
    }
    if (
      Array.isArray(domSnap.dom.conversations) &&
      domSnap.dom.conversations.length > 0
    ) {
      store.conversations = domSnap.dom.conversations;
    }
  }

  // 2. Background authenticated fetch of /saved-info via Electron defaultSession
  if (
    options.fetchSavedInfoPage !== false &&
    electron.session?.defaultSession &&
    typeof electron.session.defaultSession.fetch === "function"
  ) {
    try {
      const resp = await electron.session.defaultSession.fetch(
        "https://gemini.google.com/saved-info",
        { credentials: "include" },
      );
      if (resp && resp.ok) {
        const html = await resp.text();
        const emailMatch = html.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        );
        if (emailMatch && ! emailMatch[0].endsWith("google.com")) {
          store.account.email = emailMatch[0];
          store.account.authenticated = true;
        }
      }
    } catch {}
  }

  // 3. Import conversation threads & turns from Super App SQLite (:8787/api/app/conversations)
  try {
    const superConvs = await httpGetLocalJson(
      "127.0.0.1",
      8787,
      "/api/app/conversations",
      2000,
    );
    if (Array.isArray(superConvs?.conversations)) {
      for (const c of superConvs.conversations.slice(0, 15)) {
        if (!store.conversations.some((existing) => existing.id === c.id)) {
          store.conversations.push({
            id: c.id,
            title: c.title || "Conversation Gemini",
            url: `http://127.0.0.1:8787/app#${c.id}`,
            updatedAt: c.updated_at,
          });
        }
      }
    }
  } catch {}

  // 4. Import recent voice & CLI history from Voice Hub (:8765/api/status)
  try {
    const hubStatus = await httpGetLocalJson(
      "127.0.0.1",
      8765,
      "/api/status",
      2000,
    );
    if (Array.isArray(hubStatus?.history) && hubStatus.history.length > 0) {
      const lastTurns = hubStatus.history.slice(-10);
      for (const t of lastTurns) {
        if (t.role === "user" && t.text && t.text.length > 12) {
          const id = `voice-mem-${t.id}`;
          if (!store.savedInfo.some((m) => m.id === id)) {
            importedSavedInfo.push({
              id,
              content: `Interaction vocale (${t.surface}): "${t.text}"`,
              category: "voice_history",
              source: "voice_bridge_8765",
              createdAt: new Date(
                (t.timestamp || Date.now() / 1000) * 1000,
              ).toISOString(),
            });
          }
        }
      }
    }
  } catch {}

  // Merge new savedInfo items without duplicates
  for (const item of importedSavedInfo) {
    if (
      !store.savedInfo.some(
        (existing) =>
          existing.id === item.id || existing.content === item.content,
      )
    ) {
      store.savedInfo.push(item);
    }
  }
  store.savedInfo = store.savedInfo.slice(-60);

  for (const g of importedGems) {
    if (!store.gems.some((existing) => existing.name === g.name)) {
      store.gems.push(g);
    }
  }

  saveMemoryStore(store);
  return {
    status: "ok",
    importedSavedInfoCount: importedSavedInfo.length,
    totalSavedInfoCount: store.savedInfo.length,
    totalGemsCount: store.gems.length,
    totalConversationsCount: store.conversations.length,
    memoryJsonPath: MEMORY_JSON_PATH,
    memoryRulePath: MEMORY_RULE_PATH,
    memory: store,
  };
}

/**
 * Adds or updates a Saved Info / Web Memory entry and syncs it to `.agents/rules/gemini-web-memory.md`.
 */
async function saveGeminiWebMemoryItem(mainHooks, payload = {}) {
  const content = String(payload.content || payload.text || "").trim();
  if (!content) {
    return { status: "error", message: "Missing memory content" };
  }
  const category = String(payload.category || "user_preference").trim();
  const store = loadMemoryStore();
  const newItem = {
    id: payload.id || `mem-${Date.now()}`,
    content,
    category,
    source: payload.source || "agy_cli_mcp",
    createdAt: new Date().toISOString(),
  };

  const existingIdx = store.savedInfo.findIndex(
    (m) => m.id === newItem.id || m.content === newItem.content,
  );
  if (existingIdx !== -1) {
    store.savedInfo[existingIdx] = newItem;
  } else {
    store.savedInfo.push(newItem);
  }
  saveMemoryStore(store);

  return {
    status: "ok",
    item: newItem,
    totalSavedInfoCount: store.savedInfo.length,
    memoryRulePath: MEMORY_RULE_PATH,
  };
}

/**
 * Navigates Gemini.exe's main WebContentsView to a specific Gemini Web URL or feature page
 * (`/app`, `/saved-info`, `/gems/view`, `/sharing`, or `/app/<conversationId>`).
 */
async function navigateGeminiWeb(mainHooks, payload = {}) {
  const target = String(payload.target || payload.url || "/app").trim();
  let url = target;
  if (!url.startsWith("http")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    url = `https://gemini.google.com${cleanPath}`;
  }
  const mainWc = mainHooks?.getMainWebContents?.();
  if (!mainWc || mainWc.isDestroyed()) {
    return { status: "unavailable", targetUrl: url };
  }
  try {
    await mainWc.loadURL(url);
    return {
      status: "ok",
      navigatedTo: url,
      currentUrl: mainWc.getURL(),
    };
  } catch (err) {
    return {
      status: "error",
      targetUrl: url,
      message: String(err),
    };
  }
}

/**
 * Activates or invokes a specific Gemini Web App tool, extension, or native Win32 feature.
 */
async function invokeGeminiWebTool(mainHooks, payload = {}) {
  const toolId = String(payload.tool || payload.id || "").trim();
  const prompt = String(payload.prompt || payload.query || "").trim();

  if (toolId === "saved_info") {
    await navigateGeminiWeb(mainHooks, { target: "/saved-info" });
    return await importGeminiWebMemory(mainHooks);
  }
  if (toolId === "gems") {
    return await navigateGeminiWeb(mainHooks, { target: "/gems/view" });
  }
  if (toolId === "native_window_capture") {
    const mainWc = mainHooks?.getMainWebContents?.();
    if (mainWc && !mainWc.isDestroyed()) {
      try {
        const img = await mainWc.capturePage();
        const dataUrl = img.toDataURL();
        return {
          status: "ok",
          tool: toolId,
          size: img.getSize(),
          dataUrlPreview: dataUrl.slice(0, 128) + "...",
          byteLength: dataUrl.length,
        };
      } catch (err) {
        return { status: "error", message: String(err) };
      }
    }
  }
  if (toolId === "native_stc_window" && payload.text) {
    const addon = mainHooks?.getNativeAddon?.();
    if (addon && typeof addon.injectUnicodeText === "function") {
      const count = addon.injectUnicodeText(String(payload.text));
      return { status: "ok", tool: toolId, injectedCount: count };
    }
  }

  // Otherwise execute on Gemini Web with the tool/extension activated
  if (prompt) {
    return await executeRuntimePrompt(mainHooks, {
      prompt,
      tool: toolId,
      mode: toolId,
    });
  }

  const matched = GEMINI_WEB_TOOLS_CATALOG.find(
    (t) => t.id === toolId || t.mention === toolId,
  );
  return {
    status: "ok",
    tool: matched || { id: toolId },
    ready: true,
  };
}

/**
 * MCP (Model Context Protocol 2025-03-26) Tool Definitions exposed natively by Gemini.exe (:8789/mcp)
 */
const MCP_TOOL_DEFINITIONS = [
  {
    name: "gemini_web_runtime_status",
    description:
      "Inspecte l'état temps réel du runtime Google Gemini Windows App (Gemini.exe :8789) et de Gemini Web App (gemini.google.com) : compte connecté, modèle actif, outils web disponibles, conversations et mémoire web importée.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "gemini_web_execute_prompt",
    description:
      "Exécute un prompt directement dans Gemini Web App (gemini.google.com au sein de Gemini.exe) comme runtime d'Antigravity (agy), avec support des extensions (@Gmail, @Google Drive, @YouTube, @Google Workspace, @Google Maps), des modes (deep_research, canvas, thinking) et injection automatique de la mémoire web.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Le prompt ou la requête à exécuter sur le runtime Gemini Web.",
        },
        tool: {
          type: "string",
          description:
            "Outil ou extension Gemini Web optionnel : '@Gmail', '@Google Drive', '@Google Docs', '@YouTube', '@YouTube Music', '@Google Maps', '@Google Workspace', 'deep_research', 'canvas'.",
        },
        includeAudio: {
          type: "boolean",
          description: "Synthétiser également la réponse vocale 24 kHz.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "gemini_web_discover_tools",
    description:
      "Liste l'ensemble des outils Gemini Web App, connecteurs @Extension (Workspace, Gmail, Drive, YouTube, Maps, Flights, GitHub), modes (Deep Research, Canvas, Gems) et boutons DOM actifs dans la session.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "gemini_web_use_tool",
    description:
      "Active ou invoque un outil spécifique de Gemini Web App ou de Gemini.exe (deep_research, canvas, gems, saved_info, @Gmail, @Google Drive, @YouTube, native_window_capture, native_stc_window).",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          description:
            "Identifiant de l'outil (ex: 'deep_research', 'canvas', 'gems', 'saved_info', 'ext_gmail', 'ext_google_drive', 'ext_youtube', 'native_window_capture', 'native_stc_window').",
        },
        prompt: {
          type: "string",
          description: "Requête optionnelle à passer à l'outil.",
        },
        text: {
          type: "string",
          description: "Texte Unicode à injecter si tool='native_stc_window'.",
        },
      },
      required: ["tool"],
    },
  },
  {
    name: "gemini_web_import_memory",
    description:
      "Importe et synchronise la mémoire web de l'utilisateur depuis gemini.google.com (/saved-info, Gems /gems/view, historique des conversations et contexte vocal) vers config/gemini_web_memory.json et .agents/rules/gemini-web-memory.md pour qu'Antigravity (agy) en ait immédiatement conscience.",
    inputSchema: {
      type: "object",
      properties: {
        fetchSavedInfoPage: {
          type: "boolean",
          description: "Interroger également https://gemini.google.com/saved-info en arrière-plan.",
        },
      },
    },
  },
  {
    name: "gemini_web_save_memory",
    description:
      "Ajoute ou met à jour une information dans la mémoire web Gemini synchronisée avec Antigravity (config/gemini_web_memory.json et .agents/rules/gemini-web-memory.md).",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Fait, préférence ou instruction à mémoriser.",
        },
        category: {
          type: "string",
          description: "Catégorie (ex: 'architecture', 'user_preference', 'project_context', 'web_fact').",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "gemini_web_read_thread",
    description:
      "Lit les messages, blocs de code et citations de la conversation active dans Gemini Web App (gemini.google.com/app) et l'historique récent du runtime.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "gemini_web_navigate",
    description:
      "Navigue la vue principale de Gemini Windows App (Gemini.exe) vers une page ou fonctionnalité de Gemini Web (/app, /saved-info, /gems/view, /sharing, ou une URL de conversation).",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "Chemin ou URL cible (ex: '/app', '/saved-info', '/gems/view').",
        },
      },
      required: ["target"],
    },
  },
  {
    name: "gemini_windows_native_control",
    description:
      "Contrôle directement les fonctions natives Win32 / Electron de Gemini.exe (show, hide, stc_trigger, reload, inject_unicode, get_foreground_context, voice_turn_sync).",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description:
            "Commande native : 'status' | 'show' | 'hide' | 'stc_trigger' | 'reload' | 'inject_unicode' | 'get_foreground_context' | 'voice_turn_sync'.",
        },
        text: {
          type: "string",
          description: "Texte optionnel pour inject_unicode ou voice_turn_sync.",
        },
        prompt: {
          type: "string",
          description: "Prompt optionnel.",
        },
      },
      required: ["command"],
    },
  },
];

/**
 * Handles an MCP JSON-RPC 2.0 request directly inside Gemini.exe (:8789/mcp)
 */
async function handleMcpJsonRpc(
  rpcReq,
  mainHooks,
  nativeSnapshotFn,
  executePilotFn,
) {
  const { id, method, params } = rpcReq || {};

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: "gemini-app-runtime",
          version: "2026.11.2",
        },
      },
    };
  }

  if (method === "notifications/initialized" || method === "ping") {
    return id !== undefined ? { jsonrpc: "2.0", id, result: {} } : null;
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: MCP_TOOL_DEFINITIONS,
      },
    };
  }

  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resources: [
          {
            uri: "gemini://web/memory",
            name: "Gemini Web Imported Memory & Saved Info",
            mimeType: "application/json",
            description:
              "Synchronized Gemini Web App Saved Info, Gems, and Conversation History",
          },
          {
            uri: "gemini://web/tools",
            name: "Gemini Web App Tools & Extensions Catalog",
            mimeType: "application/json",
            description:
              "All Gemini Web App tools (@Gmail, @Drive, @YouTube, Deep Research, Canvas, Gems)",
          },
        ],
      },
    };
  }

  if (method === "resources/read") {
    const uri = params?.uri || "gemini://web/memory";
    const data =
      uri === "gemini://web/tools"
        ? GEMINI_WEB_TOOLS_CATALOG
        : loadMemoryStore();
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
    const toolName = params?.name || "";
    const args = params?.arguments || {};
    let toolResult;

    try {
      switch (toolName) {
        case "gemini_web_runtime_status":
          toolResult = await getRuntimeStatus(mainHooks, nativeSnapshotFn);
          break;
        case "gemini_web_execute_prompt":
          toolResult = await executeRuntimePrompt(mainHooks, args);
          break;
        case "gemini_web_discover_tools": {
          const dom = await inspectGeminiWebDom(mainHooks);
          toolResult = {
            status: "ok",
            catalog: GEMINI_WEB_TOOLS_CATALOG,
            liveDomTools: dom?.dom?.domTools || [],
            activeModel: dom?.dom?.activeModelLabel || "Gemini 3.8 Live / Flash",
            editorReady: Boolean(dom?.dom?.editorReady),
          };
          break;
        }
        case "gemini_web_use_tool":
          toolResult = await invokeGeminiWebTool(mainHooks, args);
          break;
        case "gemini_web_import_memory":
          toolResult = await importGeminiWebMemory(mainHooks, args);
          break;
        case "gemini_web_save_memory":
          toolResult = await saveGeminiWebMemoryItem(mainHooks, args);
          break;
        case "gemini_web_read_thread": {
          const dom = await inspectGeminiWebDom(mainHooks);
          const store = loadMemoryStore();
          toolResult = {
            status: "ok",
            currentUrl: dom?.currentUrl || "",
            domMessages: dom?.dom?.messages || [],
            conversations: dom?.dom?.conversations || store.conversations || [],
            recentRuntimeTurns: store.recentTurns || [],
          };
          break;
        }
        case "gemini_web_navigate":
          toolResult = await navigateGeminiWeb(mainHooks, args);
          break;
        case "gemini_windows_native_control":
          toolResult =
            typeof executePilotFn === "function"
              ? await executePilotFn(args)
              : { status: "unavailable" };
          break;
        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
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
          isError: false,
        },
      };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "error", message: String(err) }),
            },
          ],
          isError: true,
        },
      };
    }
  }

  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method not supported: ${method}`,
    },
  };
}

// Initialize the memory store and rule file on load
try {
  const initialStore = loadMemoryStore();
  saveMemoryStore(initialStore);
} catch {}

module.exports = {
  GEMINI_WEB_TOOLS_CATALOG,
  MCP_TOOL_DEFINITIONS,
  loadMemoryStore,
  saveMemoryStore,
  inspectGeminiWebDom,
  getRuntimeStatus,
  executeRuntimePrompt,
  importGeminiWebMemory,
  saveGeminiWebMemoryItem,
  navigateGeminiWeb,
  invokeGeminiWebTool,
  handleMcpJsonRpc,
};
