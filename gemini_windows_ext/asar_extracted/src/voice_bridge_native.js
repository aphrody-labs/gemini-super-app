// Native Voice-to-Voice & Piloting Engine for Google Gemini Windows App (app-1.17.0)
// Connects C:\Users\aphro\AppData\Local\Google\Gemini\Gemini.exe to:
// - Gemini Live Voice Hub (http://127.0.0.1:8765 & ws://127.0.0.1:8765/ws/voice)
// - ANTIGRAVITY_MIC TCP Stream (127.0.0.1:24713)
// - Native gemini_native.node Win32 C++ Addon (injectUnicodeText, getForegroundAppInfo, getCaretPosition)
// - Native Speak-to-Window Floating Capsule (stc_pill.html) & Native Top Bar (top_bar.html)

const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const electron = require("electron");
const runtimeEngine = require("./gemini_web_runtime_engine.js");

const HUB_HOST = "127.0.0.1";
const HUB_PORT = 8765;
const SUPER_APP_PORT = 8787;
const TAURI_V3_PORT = 8788;
const DIRECT_NATIVE_PORT = 8789;
const MIC_TCP_PORT = 24713;

let mainHooks = null;
let topBarWc = null;
let micTcpSocket = null;
let directControlServer = null;
let stcMode = "voice_to_voice"; // 'voice_to_voice' | 'dictate_to_window'
let hubEnsureAttempted = false;
let latestSyncedTurn = null;

function httpPostJson(urlPath, payload, timeoutMs = 12000) {
  return new Promise((resolve) => {
    try {
      const bodyStr = JSON.stringify(payload || {});
      const req = http.request(
        {
          hostname: HUB_HOST,
          port: HUB_PORT,
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
              const txt = Buffer.concat(chunks).toString("utf8");
              resolve(JSON.parse(txt));
            } catch {
              resolve({ status: "parse_error" });
            }
          });
        },
      );
      req.on("error", (err) => {
        ensureVoiceHubBackendRunning();
        resolve({ status: "error", message: String(err) });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({ status: "timeout" });
      });
      req.write(bodyStr);
      req.end();
    } catch (err) {
      resolve({ status: "error", message: String(err) });
    }
  });
}

function httpGetJson(urlPath, timeoutMs = 3000) {
  return new Promise((resolve) => {
    try {
      const req = http.get(
        {
          hostname: HUB_HOST,
          port: HUB_PORT,
          path: urlPath,
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
    } catch {
      resolve(null);
    }
  });
}

function ensureVoiceHubBackendRunning() {
  if (hubEnsureAttempted) return;
  hubEnsureAttempted = true;
  setTimeout(() => {
    hubEnsureAttempted = false;
  }, 15000);

  httpGetJson("/api/status", 1200).then((status) => {
    if (status && status.status === "ok") return;

    try {
      const cp = require("child_process");
      cp.execFile(
        "schtasks.exe",
        ["/run", "/tn", "Aphrody\\Aphrody Gemini Assistant 24x7"],
        { windowsHide: true },
        (err) => {
          if (!err) return;

          const bunExe = "C:\\Users\\aphro\\.bun\\bin\\bun.exe";
          const supervisorScript =
            "C:\\Users\\aphro\\google\\scripts\\gemini_24_7_supervisor.ts";
          const conhost = "C:\\WINDOWS\\System32\\conhost.exe";

          if (
            fs.existsSync(conhost) &&
            fs.existsSync(bunExe) &&
            fs.existsSync(supervisorScript)
          ) {
            try {
              const child = cp.spawn(
                conhost,
                ["--headless", bunExe, "run", supervisorScript],
                {
                  cwd: "C:\\Users\\aphro\\google",
                  detached: true,
                  stdio: "ignore",
                  windowsHide: true,
                },
              );
              child.unref();
              return;
            } catch {}
          }

          const pywExe =
            "C:\\Users\\aphro\\google\\.venv\\Scripts\\pythonw.exe";
          const serverScript =
            "C:\\Users\\aphro\\google\\backend\\voice_bridge_server.py";
          if (fs.existsSync(pywExe) && fs.existsSync(serverScript)) {
            try {
              const child = cp.spawn(pywExe, [serverScript], {
                cwd: "C:\\Users\\aphro\\google",
                detached: true,
                stdio: "ignore",
                windowsHide: true,
              });
              child.unref();
            } catch {}
          }
        },
      );
    } catch {}
  });
}

function forwardPcmToAntigravityMic(pcmBuffer) {
  if (!pcmBuffer || pcmBuffer.length === 0) return;
  if (!micTcpSocket || micTcpSocket.destroyed) {
    micTcpSocket = new net.Socket();
    micTcpSocket.on("error", () => {
      try {
        micTcpSocket.destroy();
      } catch {}
      micTcpSocket = null;
    });
    try {
      micTcpSocket.connect(MIC_TCP_PORT, HUB_HOST, () => {
        if (micTcpSocket && !micTcpSocket.destroyed) {
          micTcpSocket.write(pcmBuffer);
        }
      });
    } catch {}
    return;
  }
  try {
    micTcpSocket.write(pcmBuffer);
  } catch {}
}

/**
 * Real Full-Duplex Speech & Voice-to-Voice Session Class (`Hs` replacement in `src/main.js`).
 * Streams 16kHz PCM16 microphone audio from `stc_pill.html` to Whisper large-v3-turbo + Gemini 3.8 Live.
 */
class RealGeminiVoiceSession {
  constructor() {
    this.latestTranscript = "";
    this.latestReply = "";
    this.latestAudioBase64 = "";
    this.latestMimeType = "audio/mpeg";
    this.listeners = new Map();
    this.pcmChunks = [];
    this.speechContext = {};
    this.onPartialCallback = null;
    this.onErrorCallback = null;
    this.processingPromise = null;
    this.cancelled = false;
  }

  async startSession(onPartial, onError) {
    this.latestTranscript = "";
    this.latestReply = "";
    this.pcmChunks = [];
    this.cancelled = false;
    this.onPartialCallback = onPartial;
    this.onErrorCallback = onError;
    ensureVoiceHubBackendRunning();
    if (typeof onPartial === "function") {
      onPartial({ transcript: "", isFinal: false });
    }
  }

  sendAudioData(chunk) {
    if (this.cancelled || !chunk || chunk.length === 0) return;
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.pcmChunks.push(buf);
    forwardPcmToAntigravityMic(buf);
  }

  sendSpeechContext(ctx) {
    this.speechContext = ctx || {};
  }

  async _transcribeAndRespond() {
    if (this.processingPromise) return this.processingPromise;
    this.processingPromise = (async () => {
      if (this.cancelled || this.pcmChunks.length === 0) {
        return "";
      }
      const fullPcm = Buffer.concat(this.pcmChunks);
      this.pcmChunks = [];
      if (fullPcm.length < 3200) {
        return "";
      }

      const autoReply = stcMode === "voice_to_voice";
      const res = await httpPostJson("/api/voice", {
        action: autoReply ? "voice_to_voice" : "stt_pcm16",
        surface: "gemini_windows_stc",
        pcm16_base64: fullPcm.toString("base64"),
        auto_reply: autoReply,
        context: this.speechContext,
      });

      if (res && res.transcript) {
        this.latestTranscript = res.transcript.trim();
        this.latestReply = (res.reply_text || "").trim();
        this.latestAudioBase64 = res.audio_base64 || "";
        this.latestMimeType = res.mime_type || "audio/mpeg";

        if (typeof this.onPartialCallback === "function") {
          this.onPartialCallback({
            transcript: this.latestTranscript,
            reply: this.latestReply,
            isFinal: true,
          });
        }

        // Send synthesized voice audio & reply to the floating STC capsule so it speaks back!
        const stcWin = mainHooks?.getStcWindow?.();
        if (stcWin && !stcWin.isDestroyed()) {
          stcWin.webContents.send("stc:update", {
            status: autoReply && this.latestAudioBase64 ? "speaking" : "done",
            text: this.latestTranscript,
            replyText: this.latestReply,
            audioBase64: this.latestAudioBase64,
            mimeType: this.latestMimeType,
          });
        }
      }

      // Also inject into main Gemini web view if visible
      if (this.latestTranscript) {
        broadcastToRenderers({
          type: "transcript",
          turn: {
            role: "user",
            text: this.latestTranscript,
            surface: "gemini_windows_stc",
          },
          is_final: true,
        });
      }
      if (this.latestReply) {
        broadcastToRenderers({
          type: "model_response",
          turn: {
            role: "model",
            text: this.latestReply,
            surface: "gemini_windows_stc",
          },
        });
      }

      this.emit("finalResult", this.latestTranscript);
      return this.latestTranscript;
    })();
    return this.processingPromise;
  }

  finishAudioStream() {
    this._transcribeAndRespond().catch(() => {
      this.emit("finalResult", this.latestTranscript || "");
    });
  }

  stopRecognition() {
    if (!this.processingPromise && this.pcmChunks.length > 0) {
      this.finishAudioStream();
    }
  }

  cancelRecognition() {
    this.cancelled = true;
    this.pcmChunks = [];
  }

  getLatestTranscript() {
    if (!this.processingPromise && this.pcmChunks.length > 0) {
      this.finishAudioStream();
    }
    return this.latestTranscript;
  }

  on(event, listener) {
    const arr = this.listeners.get(event) || [];
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    wrapper.originalListener = listener;
    this.on(event, wrapper);
  }

  off(event, listener) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.findIndex(
      (fn) => fn === listener || fn.originalListener === listener,
    );
    if (idx !== -1) arr.splice(idx, 1);
  }

  emit(event, ...args) {
    const arr = this.listeners.get(event);
    if (arr) {
      for (const fn of [...arr]) fn(...args);
    }
  }
}

function broadcastToRenderers(eventPayload) {
  try {
    const mainWc = mainHooks?.getMainWebContents?.();
    if (mainWc && !mainWc.isDestroyed()) {
      mainWc.send("gemini-voice:hub-event", eventPayload);
    }
  } catch {}
  try {
    if (topBarWc && !topBarWc.isDestroyed()) {
      topBarWc.send("gemini-voice:hub-event", eventPayload);
    }
  } catch {}
  try {
    const stcWin = mainHooks?.getStcWindow?.();
    if (stcWin && !stcWin.isDestroyed()) {
      stcWin.webContents.send("gemini-voice:hub-event", eventPayload);
    }
  } catch {}
}

function injectVoiceExtensionIntoMainView(webContents) {
  if (!webContents || webContents.isDestroyed()) return;
  try {
    const scriptPath = path.join(__dirname, "gemini_voice_content.js");
    if (fs.existsSync(scriptPath)) {
      const code = fs.readFileSync(scriptPath, "utf8");
      webContents.executeJavaScript(code).catch(() => {});
    }
  } catch {}
}

function getNativeStateSnapshot() {
  let mainWinVisible = false;
  let stcWinVisible = false;
  let fgApp = null;
  let caret = null;
  let selectedText = "";
  try {
    const mw = mainHooks?.getMainWindow?.();
    if (mw && !mw.isDestroyed()) mainWinVisible = Boolean(mw.isVisible());
  } catch {}
  try {
    const sw = mainHooks?.getStcWindow?.();
    if (sw && !sw.isDestroyed()) stcWinVisible = Boolean(sw.isVisible());
  } catch {}
  try {
    const addon = mainHooks?.getNativeAddon?.();
    if (addon) {
      fgApp = addon.getForegroundAppInfo?.() || null;
      caret = addon.getCaretPosition?.() || null;
      selectedText = addon.getSelectedText?.() || "";
    }
  } catch {}
  return {
    status: "ok",
    app: "gemini-windows-native",
    version: "1.17.0",
    pid: process.pid,
    directUrl: `http://${HUB_HOST}:${DIRECT_NATIVE_PORT}`,
    mainWindowVisible: mainWinVisible,
    stcWindowVisible: stcWinVisible,
    stcMode,
    foregroundApp: fgApp,
    caret,
    selectedText,
    latestSyncedTurn,
    antigravityMicAddr: `${HUB_HOST}:${MIC_TCP_PORT}`,
    updatedAt: Date.now(),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function startDirectNativeControlServer() {
  if (directControlServer) return;
  try {
    directControlServer = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const urlPath = (req.url || "/").split("?")[0];

      if (req.method === "GET" && (urlPath === "/api/status" || urlPath === "/")) {
        sendJson(res, 200, {
          ...getNativeStateSnapshot(),
          mcpEndpoint: `http://${HUB_HOST}:${DIRECT_NATIVE_PORT}/mcp`,
          runtimePlugin: "gemini-app-runtime",
          webToolsCount: runtimeEngine.GEMINI_WEB_TOOLS_CATALOG.length,
        });
        return;
      }

      if (req.method === "GET" && urlPath === "/mcp") {
        sendJson(res, 200, {
          status: "ok",
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "gemini-app-runtime",
            version: "2026.11.2",
            description: "Native Gemini Web App & Windows Desktop Runtime MCP Server inside Gemini.exe",
          },
          tools: runtimeEngine.getMcpToolDefinitions(),
        });
        return;
      }

      if (req.method === "POST" && urlPath === "/mcp") {
        try {
          const rpcReq = await readJsonBody(req);
          const rpcRes = await runtimeEngine.handleMcpJsonRpc(
            rpcReq,
            mainHooks,
            getNativeStateSnapshot,
            executeLocalPilotCommand,
          );
          if (rpcRes === null) {
            res.writeHead(202);
            res.end();
            return;
          }
          sendJson(res, 200, rpcRes);
        } catch (err) {
          sendJson(res, 400, {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: String(err) },
          });
        }
        return;
      }

      if (req.method === "GET" && urlPath === "/api/runtime/status") {
        const status = await runtimeEngine.getRuntimeStatus(mainHooks, getNativeStateSnapshot);
        sendJson(res, 200, status);
        return;
      }

      if (req.method === "GET" && urlPath === "/api/runtime/tools") {
        const domState = await runtimeEngine.inspectGeminiWebDom(mainHooks);
        sendJson(res, 200, {
          status: "ok",
          catalog: runtimeEngine.GEMINI_WEB_TOOLS_CATALOG,
          domTools: domState.domTools || [],
          activeModel: domState.activeModel || "Gemini 3.8",
          currentUrl: domState.url || "https://gemini.google.com/app",
        });
        return;
      }

      if (req.method === "GET" && urlPath === "/api/runtime/memory") {
        sendJson(res, 200, {
          status: "ok",
          memory: runtimeEngine.loadLocalWebMemory(),
          memoryFilePath: runtimeEngine.MEMORY_FILE_PATH,
          ruleFilePath: runtimeEngine.MEMORY_RULE_MD_PATH,
        });
        return;
      }

      if (req.method === "POST" && urlPath === "/api/runtime/execute") {
        try {
          const body = await readJsonBody(req);
          const out = await runtimeEngine.executeRuntimePrompt(mainHooks, body);
          sendJson(res, 200, out);
        } catch (err) {
          sendJson(res, 400, { status: "error", message: String(err) });
        }
        return;
      }

      if (req.method === "POST" && urlPath === "/api/runtime/tool") {
        try {
          const body = await readJsonBody(req);
          const out = await runtimeEngine.invokeGeminiWebTool(mainHooks, body);
          sendJson(res, 200, out);
        } catch (err) {
          sendJson(res, 400, { status: "error", message: String(err) });
        }
        return;
      }

      if (req.method === "POST" && urlPath === "/api/runtime/memory/import") {
        try {
          const body = await readJsonBody(req);
          const out = await runtimeEngine.importGeminiWebMemory(mainHooks, body);
          sendJson(res, 200, out);
        } catch (err) {
          sendJson(res, 400, { status: "error", message: String(err) });
        }
        return;
      }

      if (req.method === "POST" && urlPath === "/api/runtime/memory/save") {
        try {
          const body = await readJsonBody(req);
          const out = await runtimeEngine.saveGeminiWebMemoryItem(mainHooks, body);
          sendJson(res, 200, out);
        } catch (err) {
          sendJson(res, 400, { status: "error", message: String(err) });
        }
        return;
      }

      if (req.method === "POST" && urlPath === "/api/runtime/navigate") {
        try {
          const body = await readJsonBody(req);
          const out = await runtimeEngine.navigateGeminiWeb(mainHooks, body);
          sendJson(res, 200, out);
        } catch (err) {
          sendJson(res, 400, { status: "error", message: String(err) });
        }
        return;
      }

      if (req.method === "POST" && (urlPath === "/api/pilot" || urlPath === "/api/voice")) {
        try {
          const body = await readJsonBody(req);
          const out = await executeLocalPilotCommand(body);
          sendJson(res, 200, { ...out, state: getNativeStateSnapshot() });
        } catch (err) {
          sendJson(res, 400, { status: "error", message: String(err) });
        }
        return;
      }

      sendJson(res, 404, { status: "not_found", path: urlPath });
    });
    directControlServer.on("error", () => {});
    directControlServer.listen(DIRECT_NATIVE_PORT, HUB_HOST);
  } catch {}
}

function startStatusPollingAndPilotLoop() {
  let lastHistoryId = null;
  let tick = 0;

  setInterval(async () => {
    tick++;
    const status = await httpGetJson("/api/status", 1500);
    if (!status || status.status !== "ok") return;

    if (Array.isArray(status.pending_pilot_commands) && status.pending_pilot_commands.length > 0) {
      for (const cmdObj of status.pending_pilot_commands) {
        await executeLocalPilotCommand(cmdObj);
      }
    }

    if (tick % 3 === 0) {
      httpPostJson(
        "/api/voice",
        {
          action: "gemini_windows_status",
          state: getNativeStateSnapshot(),
        },
        1500,
      ).catch(() => {});
    }

    broadcastToRenderers({
      type: "telemetry",
      state: status.state || "IDLE",
      is_live_active: Boolean(status.is_live_active),
      is_recording_ptt: Boolean(status.is_recording_ptt),
      input_rms: status.state === "LISTENING" ? 0.25 : 0.06,
      output_rms: status.state === "SPEAKING" ? 0.55 : 0.06,
    });

    if (Array.isArray(status.history) && status.history.length > 0) {
      const latest = status.history[status.history.length - 1];
      if (latest && latest.id && latest.id !== lastHistoryId) {
        lastHistoryId = latest.id;
        broadcastToRenderers({
          type: latest.role === "user" ? "transcript" : "model_response",
          turn: latest,
          is_final: true,
        });
      }
    }
  }, 600);
}

function initVoiceBridgeNative(hooks) {
  mainHooks = hooks || {};
  ensureVoiceHubBackendRunning();

  // Enable Speak-to-Window in user settings.json if not already enabled
  try {
    const userData = electron.app.getPath("userData");
    const settingsPath = path.join(userData, "settings.json");
    if (fs.existsSync(settingsPath)) {
      const cfg = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      if (!cfg.speakToWindowEnabled) {
        cfg.speakToWindowEnabled = true;
        cfg.stcShortcut = cfg.stcShortcut || "Alt+Shift+D";
        fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2), "utf8");
      }
    }
  } catch {}

  // Register IPC handlers for CSP-free communication from preload.js, top_bar, and stc_pill
  electron.ipcMain.handle("gemini-voice:action", async (_event, payload) => {
    const action = payload?.action || "";
    if (action === "pilot_local") {
      return executeLocalPilotCommand(payload);
    }
    return await httpPostJson("/api/voice", payload);
  });

  electron.ipcMain.handle("gemini-voice:get-status", async () => {
    return (await httpGetJson("/api/status")) || { status: "offline" };
  });

  electron.ipcMain.on("gemini-voice:pcm-chunk", (_event, arrayBuf) => {
    try {
      const buf = Buffer.isBuffer(arrayBuf) ? arrayBuf : Buffer.from(arrayBuf);
      forwardPcmToAntigravityMic(buf);
    } catch {}
  });

  electron.ipcMain.handle("gemini-voice:stc-trigger", async () => {
    try {
      if (typeof mainHooks.triggerStc === "function") {
        await mainHooks.triggerStc();
        return { status: "ok" };
      }
    } catch (err) {
      return { status: "error", message: String(err) };
    }
    return { status: "unavailable" };
  });

  electron.ipcMain.handle("gemini-voice:set-stc-mode", async (_event, mode) => {
    stcMode =
      mode === "dictate_to_window" ? "dictate_to_window" : "voice_to_voice";
    return { status: "ok", stcMode };
  });

  electron.ipcMain.handle(
    "gemini-voice:inject-unicode",
    async (_event, text) => {
      try {
        const nativeAddon = mainHooks.getNativeAddon?.();
        if (
          nativeAddon &&
          typeof nativeAddon.injectUnicodeText === "function"
        ) {
          const count = nativeAddon.injectUnicodeText(String(text || ""));
          return { status: "ok", injectedCount: count };
        }
      } catch (err) {
        return { status: "error", message: String(err) };
      }
      return { status: "unavailable" };
    },
  );

  electron.ipcMain.handle("gemini-voice:get-foreground-context", async () => {
    try {
      const nativeAddon = mainHooks.getNativeAddon?.();
      if (!nativeAddon) return { status: "unavailable" };
      return {
        status: "ok",
        foregroundApp: nativeAddon.getForegroundAppInfo?.() || null,
        caret: nativeAddon.getCaretPosition?.() || null,
        selectedText: nativeAddon.getSelectedText?.() || "",
      };
    } catch (err) {
      return { status: "error", message: String(err) };
    }
  });

  electron.ipcMain.on("gemini-voice:open-hub", () => {
    try {
      electron.shell.openExternal(`http://${HUB_HOST}:${SUPER_APP_PORT}/`);
    } catch {}
  });

  electron.ipcMain.on("gemini-voice:open-pet", () => {
    try {
      electron.shell.openExternal(`http://${HUB_HOST}:${SUPER_APP_PORT}/pet`);
    } catch {}
  });

  electron.ipcMain.on("gemini-voice:open-tauri", () => {
    try {
      electron.shell.openExternal(
        `http://${HUB_HOST}:${SUPER_APP_PORT}/windows-tauri`,
      );
    } catch {}
  });

  startDirectNativeControlServer();
  startStatusPollingAndPilotLoop();
}

async function executeLocalPilotCommand(payload) {
  const cmd = payload?.command || "";
  try {
    if (cmd === "status") {
      return { status: "ok", command: cmd, nativeState: getNativeStateSnapshot() };
    }
    if (cmd === "show") {
      mainHooks?.showMainWindow?.();
      return { status: "ok", command: cmd };
    }
    if (cmd === "hide") {
      mainHooks?.hideMainWindow?.();
      return { status: "ok", command: cmd };
    }
    if (cmd === "stc_trigger" || cmd === "start_dictation") {
      await mainHooks?.triggerStc?.();
      return { status: "ok", command: cmd };
    }
    if (cmd === "reload") {
      mainHooks?.reloadMainWindow?.(true);
      return { status: "ok", command: cmd };
    }
    if (cmd === "inject_unicode" && payload.text) {
      const addon = mainHooks?.getNativeAddon?.();
      if (addon && typeof addon.injectUnicodeText === "function") {
        const injectedCount = addon.injectUnicodeText(String(payload.text));
        return { status: "ok", command: cmd, injectedCount };
      }
      return { status: "unavailable", command: cmd };
    }
    if (cmd === "get_foreground_context") {
      return { status: "ok", command: cmd, context: getNativeStateSnapshot() };
    }
    if (cmd === "voice_turn_sync") {
      latestSyncedTurn = {
        transcript: payload.transcript || payload.prompt || "",
        replyText: payload.reply_text || payload.text || "",
        surface: payload.surface || "voice_hub",
        timestamp: Date.now(),
      };
      if (latestSyncedTurn.transcript) {
        broadcastToRenderers({
          type: "transcript",
          turn: {
            role: "user",
            text: latestSyncedTurn.transcript,
            surface: latestSyncedTurn.surface,
          },
          is_final: true,
        });
      }
      if (latestSyncedTurn.replyText) {
        broadcastToRenderers({
          type: "model_response",
          turn: {
            role: "model",
            text: latestSyncedTurn.replyText,
            surface: latestSyncedTurn.surface,
          },
        });
      }
      const stcWin = mainHooks?.getStcWindow?.();
      if (stcWin && !stcWin.isDestroyed() && latestSyncedTurn.replyText) {
        stcWin.webContents.send("stc:update", {
          status: payload.audio_base64 ? "speaking" : "done",
          text: latestSyncedTurn.transcript,
          replyText: latestSyncedTurn.replyText,
          audioBase64: payload.audio_base64 || "",
          mimeType: payload.mime_type || "audio/mpeg",
        });
      }
      return { status: "ok", command: cmd, synced: latestSyncedTurn };
    }
    if (cmd === "send_prompt" && payload.prompt) {
      broadcastToRenderers({
        type: "pilot_gemini_windows",
        command: "send_prompt",
        prompt: payload.prompt,
      });
      if (payload.waitForReply) {
        return await runtimeEngine.executeRuntimePrompt(mainHooks, payload);
      }
      return { status: "ok", command: cmd };
    }
    if (cmd === "runtime_execute") {
      return await runtimeEngine.executeRuntimePrompt(mainHooks, payload);
    }
    if (cmd === "runtime_import_memory") {
      return await runtimeEngine.importGeminiWebMemory(mainHooks, payload);
    }
    if (cmd === "runtime_save_memory") {
      return await runtimeEngine.saveGeminiWebMemoryItem(mainHooks, payload);
    }
    if (cmd === "runtime_discover_tools") {
      const domState = await runtimeEngine.inspectGeminiWebDom(mainHooks);
      return {
        status: "ok",
        command: cmd,
        catalog: runtimeEngine.GEMINI_WEB_TOOLS_CATALOG,
        domTools: domState.domTools || [],
      };
    }
    if (cmd === "runtime_navigate") {
      return await runtimeEngine.navigateGeminiWeb(mainHooks, payload);
    }
    if (cmd === "runtime_status") {
      return await runtimeEngine.getRuntimeStatus(mainHooks, getNativeStateSnapshot);
    }
  } catch (err) {
    return { status: "error", message: String(err) };
  }
  return { status: "unknown_command", command: cmd };
}

function attachToMainWebContents(webContents) {
  if (!webContents) return;
  webContents.on("dom-ready", () => {
    injectVoiceExtensionIntoMainView(webContents);
  });
  webContents.on("did-finish-load", () => {
    injectVoiceExtensionIntoMainView(webContents);
  });
}

function attachToTopBarWebContents(webContents) {
  topBarWc = webContents;
}

module.exports = {
  RealGeminiVoiceSession,
  initVoiceBridgeNative,
  attachToMainWebContents,
  attachToTopBarWebContents,
  broadcastToRenderers,
  executeLocalPilotCommand,
};
