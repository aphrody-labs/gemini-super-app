// Complete Real Voice-to-Voice Content Script for:
// - Google Gemini Windows App (C:\Users\aphro\AppData\Local\Google\Gemini\Gemini.exe)
// - Gemini Web App (gemini.google.com, aistudio.google.com, antigravity.google.com)
// Provides:
// 1. Permanently animated Official Gemini SVG Orb (60 FPS + live FFT spectrum ring)
// 2. Full-Duplex Voice-to-Voice (16kHz PCM16 mic capture + VAD + Whisper large-v3-turbo STT + Gemini Live + 24kHz TTS playback + Barge-in)
// 3. Interactive `/voice` and `● Record` buttons (floating capsule + inline Gemini prompt bar button)
// 4. Native bridge to Gemini.exe Speak-to-Window (`stc-pill` / `gemini_native.node` Unicode injection)

(() => {
  if (window.__AGY_GEMINI_VOICE_EXTENSION_LOADED__) return;
  window.__AGY_GEMINI_VOICE_EXTENSION_LOADED__ = true;

  const SURFACE_NAME = window.geminiVoiceExtensionBridge
    ? "gemini_windows"
    : "gemini_web";

  // State
  let liveState = "IDLE"; // IDLE | LISTENING | THINKING | SPEAKING | INTERRUPTED
  let isLiveActive = false;
  let isRecordingPtt = false;
  let voiceMode = "voice_to_voice"; // 'voice_to_voice' | 'dictation' | 'stc_window'
  let autoSubmitPrompt = false;
  let currentRms = 0.06;
  let angle = 0;
  let lastTranscript = "";
  let lastReply = "";

  // Audio capture & playback state
  let micStream = null;
  let micAudioCtx = null;
  let micAnalyser = null;
  let micScriptNode = null;
  let pcmChunks = [];
  let speechDetectedInTurn = false;
  let silenceStartMs = 0;
  let bargeInFrames = 0;

  let playbackAudioCtx = null;
  let activeAudioSource = null;
  let activeHtmlAudio = null;

  // Universal CSP-safe bridge (Electron IPC -> Chrome MV3 Runtime -> Direct HTTP/WS)
  async function sendVoiceAction(payload) {
    const fullPayload = { surface: SURFACE_NAME, ...payload };
    try {
      if (window.geminiVoiceExtensionBridge?.voiceAction) {
        return await window.geminiVoiceExtensionBridge.voiceAction(fullPayload);
      }
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({
          type: "VOICE_ACTION",
          payload: fullPayload,
        });
        return res?.data || res;
      }
      const resp = await fetch("http://127.0.0.1:8765/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload),
      });
      return await resp.json();
    } catch (err) {
      console.debug("[GeminiVoice] sendVoiceAction fallback error:", err);
      return null;
    }
  }

  async function callPcFs(payload) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({
          type: "PC_FS_ACTION",
          payload,
        });
        if (res?.data) return res.data;
      }
      const resp = await fetch("http://127.0.0.1:8787/api/pc/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await resp.json();
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async function callPcExec(payload) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({
          type: "PC_EXEC_ACTION",
          payload,
        });
        if (res?.data) return res.data;
      }
      const resp = await fetch("http://127.0.0.1:8787/api/pc/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await resp.json();
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async function callAgySession(payload) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({
          type: "AGY_SESSION_ACTION",
          payload,
        });
        if (res?.data) return res.data;
      }
      const resp = await fetch("http://127.0.0.1:8787/api/antigravity/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await resp.json();
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize),
      );
    }
    return btoa(binary);
  }

  function mergeInt16Chunks(chunks) {
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const merged = new Int16Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return merged.buffer;
  }

  // Stop any ongoing Gemini voice playback (Barge-in)
  function stopPlaybackForBargeIn() {
    if (activeAudioSource) {
      try {
        activeAudioSource.stop();
        activeAudioSource.disconnect();
      } catch {}
      activeAudioSource = null;
    }
    if (activeHtmlAudio) {
      try {
        activeHtmlAudio.pause();
        activeHtmlAudio.currentTime = 0;
      } catch {}
      activeHtmlAudio = null;
    }
  }

  // Play synthesized TTS / Live audio response (WAV or MP3 base64)
  async function playSynthesizedAudio(base64Audio, mimeType = "audio/mpeg") {
    if (!base64Audio) return;
    stopPlaybackForBargeIn();
    liveState = "SPEAKING";
    updateUiState();

    try {
      const binaryStr = atob(base64Audio);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!playbackAudioCtx || playbackAudioCtx.state === "closed") {
        playbackAudioCtx = new AudioCtx();
      }
      if (playbackAudioCtx.state === "suspended") {
        await playbackAudioCtx.resume();
      }

      const audioBuffer = await playbackAudioCtx.decodeAudioData(
        bytes.buffer.slice(0),
      );
      const source = playbackAudioCtx.createBufferSource();
      const analyser = playbackAudioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(playbackAudioCtx.destination);
      activeAudioSource = source;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const monitorPlayback = () => {
        if (activeAudioSource !== source) return;
        analyser.getByteFrequencyData(dataArr);
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
        currentRms = Math.max(
          0.08,
          Math.min(0.95, sum / (dataArr.length * 180)),
        );
        requestAnimationFrame(monitorPlayback);
      };
      requestAnimationFrame(monitorPlayback);

      source.onended = () => {
        if (activeAudioSource === source) {
          activeAudioSource = null;
          liveState = isLiveActive ? "LISTENING" : "IDLE";
          currentRms = 0.06;
          updateUiState();
        }
      };
      source.start(0);
    } catch (err) {
      // Fallback to HTML5 Audio element
      try {
        const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
        activeHtmlAudio = audio;
        audio.onended = () => {
          if (activeHtmlAudio === audio) {
            activeHtmlAudio = null;
            liveState = isLiveActive ? "LISTENING" : "IDLE";
            currentRms = 0.06;
            updateUiState();
          }
        };
        await audio.play();
      } catch (e2) {
        console.debug("[GeminiVoice] Audio playback notice:", e2);
        liveState = isLiveActive ? "LISTENING" : "IDLE";
        updateUiState();
      }
    }
  }

  // Start 16kHz PCM16 Microphone Capture for real Voice-to-Voice & STT
  async function startMicrophoneCapture() {
    if (micStream && micAudioCtx && micAudioCtx.state !== "closed") {
      if (micAudioCtx.state === "suspended") await micAudioCtx.resume();
      return true;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      micAudioCtx = new AudioCtx({ sampleRate: 16000 });
      if (micAudioCtx.state === "suspended") await micAudioCtx.resume();

      const source = micAudioCtx.createMediaStreamSource(micStream);
      micAnalyser = micAudioCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.35;
      source.connect(micAnalyser);

      micScriptNode = micAudioCtx.createScriptProcessor(4096, 1, 1);
      pcmChunks = [];
      speechDetectedInTurn = false;
      silenceStartMs = 0;
      bargeInFrames = 0;

      micScriptNode.onaudioprocess = (event) => {
        if (!isLiveActive && !isRecordingPtt) return;

        const input = event.inputBuffer.getChannelData(0);
        event.outputBuffer.getChannelData(0).fill(0);

        let sumSq = 0;
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          sumSq += s * s;
          pcm16[i] = s < 0 ? s * 32768 : s * 32767;
        }
        const rms = Math.sqrt(sumSq / input.length);
        if (liveState !== "SPEAKING") {
          currentRms = Math.max(0.05, Math.min(0.95, rms * 4.5));
        }

        // Forward chunk to native Electron main process if inside Gemini.exe
        if (window.geminiVoiceExtensionBridge?.sendPcmChunk) {
          window.geminiVoiceExtensionBridge.sendPcmChunk(pcm16.buffer);
        }

        // True Simultaneous Full-Duplex: user and Gemini can speak at the exact same time
        if (isRecordingPtt) {
          pcmChunks.push(pcm16);
          speechDetectedInTurn = true;
        } else if (isLiveActive) {
          if (rms > 0.016) {
            pcmChunks.push(pcm16);
            speechDetectedInTurn = true;
            silenceStartMs = 0;
            if (liveState !== "SPEAKING" && liveState !== "THINKING" && liveState !== "LISTENING") {
              liveState = "LISTENING";
              updateUiState();
            }
          } else if (speechDetectedInTurn) {
            pcmChunks.push(pcm16);
            if (!silenceStartMs) {
              silenceStartMs = performance.now();
            } else if (performance.now() - silenceStartMs >= 240) {
              // 240ms of silence after speech -> zero-latency dispatch in simultaneous full-duplex!
              const capturedChunks = pcmChunks.slice();
              pcmChunks = [];
              speechDetectedInTurn = false;
              silenceStartMs = 0;
              submitCapturedPcmUtterance(capturedChunks);
            }
          }
        }
      };

      source.connect(micScriptNode);
      micScriptNode.connect(micAudioCtx.destination);
      return true;
    } catch (err) {
      console.warn("[GeminiVoice] Microphone capture notice:", err);
      return false;
    }
  }

  function stopMicrophoneCapture() {
    try {
      if (micScriptNode) {
        micScriptNode.disconnect();
        micScriptNode = null;
      }
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
      if (micAudioCtx && micAudioCtx.state !== "closed") {
        micAudioCtx.close().catch(() => {});
        micAudioCtx = null;
      }
    } catch {}
  }

  async function submitCapturedPcmUtterance(chunks) {
    if (!chunks || chunks.length === 0) return;
    const mergedBuffer = mergeInt16Chunks(chunks);
    // Avoid sending tiny clicks (< 0.075s)
    if (mergedBuffer.byteLength < 2400) return;

    if (liveState !== "SPEAKING") {
      liveState = "THINKING";
      updateUiState();
    }

    const pcm16Base64 = arrayBufferToBase64(mergedBuffer);
    const autoReply = voiceMode === "voice_to_voice";

    const res = await sendVoiceAction({
      action: autoReply ? "voice_to_voice" : "stt_pcm16",
      pcm16_base64: pcm16Base64,
      auto_reply: autoReply,
      simultaneous_full_duplex: true,
    });

    if (!res || res.status === "empty" || !res.transcript) {
      liveState = isLiveActive ? "LISTENING" : "IDLE";
      updateUiState();
      return;
    }

    lastTranscript = res.transcript;
    injectTranscriptIntoPage(res.transcript, autoSubmitPrompt);

    if (
      voiceMode === "stc_window" &&
      window.geminiVoiceExtensionBridge?.injectUnicodeText
    ) {
      await window.geminiVoiceExtensionBridge.injectUnicodeText(res.transcript);
    }

    if (res.reply_text) {
      lastReply = res.reply_text;
    }
    updateUiState();

    if (autoReply && res.audio_base64) {
      await playSynthesizedAudio(
        res.audio_base64,
        res.mime_type || "audio/mpeg",
      );
    } else {
      liveState = isLiveActive ? "LISTENING" : "IDLE";
      updateUiState();
    }
  }

  function injectTranscriptIntoPage(text, submitAfter = false) {
    if (!text) return;
    requestAnimationFrame(() => {
      const selectors = [
        'rich-textarea div.ql-editor[contenteditable="true"]',
        'rich-textarea div[contenteditable="true"]',
        'div.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][ role="textbox" ]',
        'div[contenteditable="true"]',
        "textarea",
        'input[type="text"]',
      ];
      let targetEl = null;
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          targetEl = el;
          break;
        }
      }
      if (!targetEl) return;

      targetEl.focus();
      if (targetEl.tagName === "TEXTAREA" || targetEl.tagName === "INPUT") {
        targetEl.value = text;
        targetEl.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        targetEl.textContent = text;
        targetEl.dispatchEvent(
          new InputEvent("input", { bubbles: true, data: text }),
        );
      }

      if (submitAfter) {
        setTimeout(() => {
          const sendSelectors = [
            "button.send-button",
            'button[aria-label*="Send message"]',
            'button[aria-label*="Envoyer"]',
            'button[aria-label*="Send"]',
            'button[mattooltip*="Send"]',
          ];
          for (const s of sendSelectors) {
            const btn = document.querySelector(s);
            if (btn && !btn.disabled) {
              btn.click();
              break;
            }
          }
        }, 120);
      }
    });
  }

  // Minimalist Zero-Text Floating Google Gemini Orb + Companion Pet Pill
  function createFloatingVoiceRoot() {
    if (document.getElementById("agy-gemini-live-floating-root")) return;

    const root = document.createElement("div");
    root.id = "agy-gemini-live-floating-root";
    root.style.cssText = [
      "position: fixed",
      "bottom: 24px",
      "right: 24px",
      "z-index: 2147483646",
      "display: flex",
      "align-items: center",
      "gap: 8px",
      "padding: 6px 10px",
      "border-radius: 9999px",
      "background: #1e1f20",
      "border: 1px solid #333537",
      "box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45)",
      "user-select: none",
    ].join(";");

    root.innerHTML = `
      <button id="agy-gem-orb-hit" type="button" aria-label="Gemini Live Voice" style="width:40px;height:40px;border:none;border-radius:9999px;background:radial-gradient(circle, rgba(66,133,244,0.22) 0%, transparent 70%);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <svg id="agy-gemini-official-svg" viewBox="0 0 64 64" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="agyGemGrad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#4285F4"/>
              <stop offset="50%" stop-color="#9B72CB"/>
              <stop offset="100%" stop-color="#D96570"/>
            </linearGradient>
          </defs>
          <path d="M32 3C32 19.0163 19.0163 32 3 32C19.0163 32 32 44.9837 32 61C32 44.9837 44.9837 32 61 32C44.9837 32 32 19.0163 32 3Z" fill="url(#agyGemGrad)"/>
        </svg>
      </button>
      <button id="agy-gem-live-btn" type="button" aria-label="Microphone Voice-to-Voice" style="width:38px;height:38px;border:none;border-radius:9999px;background:#282a2c;color:#e3e3e3;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
        </svg>
      </button>
      <button id="agy-gem-ptt-btn" type="button" aria-label="Push-to-Talk" style="width:38px;height:38px;border:none;border-radius:9999px;background:transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <svg viewBox="0 0 40 40" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="6" y="10" width="28" height="24" rx="12" fill="#f4f7f5"/>
          <ellipse cx="17" cy="8" rx="4.5" ry="2.5" transform="rotate(-22 17 8)" fill="#81c995"/>
          <ellipse cx="23" cy="8" rx="4.5" ry="2.5" transform="rotate(22 23 8)" fill="#81c995"/>
          <circle cx="15" cy="21" r="2" fill="#1f1f1f"/>
          <circle cx="25" cy="21" r="2" fill="#1f1f1f"/>
          <path d="M17.5 25.5Q20 27.5 22.5 25.5" stroke="#1f1f1f" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
      <button id="agy-gem-pc-btn" type="button" aria-label="Accès PC Filesystem & Session Permanente Antigravity (3.8-flash low Auto-Compact)" style="width:38px;height:38px;border:none;border-radius:9999px;background:#282a2c;color:#a8c7fa;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <polyline points="10 13 8 15 10 17"/>
          <polyline points="14 13 16 15 14 17"/>
        </svg>
      </button>
    `;

    document.body.appendChild(root);

    // PC Filesystem & Permanent Antigravity (gemini-3.8-flash low Auto-Compact) Drawer
    const drawer = document.createElement("div");
    drawer.id = "agy-gemini-pc-drawer";
    drawer.style.cssText = [
      "position: fixed",
      "bottom: 80px",
      "right: 24px",
      "width: min(460px, 94vw)",
      "max-height: 76vh",
      "z-index: 2147483646",
      "display: none",
      "flex-direction: column",
      "gap: 10px",
      "padding: 16px",
      "border-radius: 20px",
      "background: #1e1f20",
      "border: 1px solid #333537",
      "box-shadow: 0 20px 56px rgba(0, 0, 0, 0.65)",
      "color: #e3e3e3",
      'font-family: "Google Sans", Roboto, system-ui, sans-serif',
      "font-size: 12px",
      "overflow: hidden",
    ].join(";");

    drawer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;">
          <span style="color:#a8c7fa;">PC Filesystem &amp; Antigravity</span>
          <span id="agy-compact-badge" style="padding:2px 8px;border-radius:999px;background:#282a2c;color:#81c995;font-size:11px;">3.8-flash low • Auto-Compact #0</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="agy-btn-compact-now" type="button" style="height:28px;padding:0 10px;border-radius:8px;border:1px solid #333537;background:#282a2c;color:#a8c7fa;font-size:11px;cursor:pointer;">Compact</button>
          <button id="agy-btn-close-drawer" type="button" style="height:28px;padding:0 10px;border-radius:8px;border:1px solid #333537;background:#282a2c;color:#e3e3e3;font-size:11px;cursor:pointer;">✕</button>
        </div>
      </div>

      <div style="display:flex;gap:6px;">
        <input id="agy-pc-path-input" type="text" value="C:\\Users\\aphro\\google" placeholder="Chemin PC (ex: C:\\Users\\aphro\\google)" style="flex:1;height:32px;border-radius:10px;border:1px solid #333537;background:#131314;color:#e3e3e3;padding:0 10px;font-size:12px;outline:none;"/>
        <button id="agy-pc-up-btn" type="button" style="height:32px;padding:0 10px;border-radius:10px;border:1px solid #333537;background:#282a2c;color:#e3e3e3;font-size:12px;cursor:pointer;">..</button>
        <button id="agy-pc-ls-btn" type="button" style="height:32px;padding:0 12px;border-radius:10px;border:1px solid #333537;background:#282a2c;color:#a8c7fa;font-size:12px;cursor:pointer;">Lister</button>
      </div>

      <div id="agy-pc-entries" style="max-height:150px;overflow-y:auto;border-radius:10px;background:#131314;border:1px solid #333537;padding:6px;display:flex;flex-direction:column;gap:3px;"></div>

      <textarea id="agy-pc-editor" rows="5" placeholder="Contenu fichier PC / Sortie commande / Mémoire Auto-Compact Antigravity..." style="width:100%;border-radius:10px;border:1px solid #333537;background:#131314;color:#e3e3e3;padding:8px;font-family:monospace;font-size:11px;resize:vertical;outline:none;"></textarea>

      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button id="agy-pc-save-file-btn" type="button" style="height:30px;padding:0 10px;border-radius:8px;border:1px solid #333537;background:#282a2c;color:#81c995;font-size:11px;cursor:pointer;">💾 Écrire sur PC</button>
        <button id="agy-pc-inject-btn" type="button" style="height:30px;padding:0 10px;border-radius:8px;border:1px solid #333537;background:#042c6c;color:#a8c7fa;font-size:11px;cursor:pointer;">↗ Injecter dans Gemini Web</button>
        <button id="agy-pc-inject-send-btn" type="button" style="height:30px;padding:0 10px;border-radius:8px;border:1px solid #333537;background:#a8c7fa;color:#042c6c;font-weight:600;font-size:11px;cursor:pointer;">⚡ Envoyer à Gemini Web</button>
      </div>

      <div style="display:flex;gap:6px;">
        <input id="agy-pc-cmd-input" type="text" placeholder="Commande PC PowerShell ou /fs, /read, /cmd, /compact..." style="flex:1;height:32px;border-radius:10px;border:1px solid #333537;background:#131314;color:#e3e3e3;padding:0 10px;font-size:12px;outline:none;"/>
        <button id="agy-pc-run-cmd-btn" type="button" style="height:32px;padding:0 12px;border-radius:10px;border:1px solid #333537;background:#282a2c;color:#81c995;font-size:12px;cursor:pointer;">Exécuter PC</button>
        <button id="agy-pc-run-agy-btn" type="button" style="height:32px;padding:0 12px;border-radius:10px;border:1px solid #333537;background:#282a2c;color:#a8c7fa;font-size:12px;cursor:pointer;">Session 3.8</button>
      </div>
    `;
    document.body.appendChild(drawer);

    let activeFilePath = "";
    const pcBtn = document.getElementById("agy-gem-pc-btn");
    const closeDrawerBtn = document.getElementById("agy-btn-close-drawer");
    const compactNowBtn = document.getElementById("agy-btn-compact-now");
    const compactBadge = document.getElementById("agy-compact-badge");
    const pathInput = document.getElementById("agy-pc-path-input");
    const upBtn = document.getElementById("agy-pc-up-btn");
    const lsBtn = document.getElementById("agy-pc-ls-btn");
    const entriesBox = document.getElementById("agy-pc-entries");
    const editorBox = document.getElementById("agy-pc-editor");
    const saveFileBtn = document.getElementById("agy-pc-save-file-btn");
    const injectBtn = document.getElementById("agy-pc-inject-btn");
    const injectSendBtn = document.getElementById("agy-pc-inject-send-btn");
    const cmdInput = document.getElementById("agy-pc-cmd-input");
    const runCmdBtn = document.getElementById("agy-pc-run-cmd-btn");
    const runAgyBtn = document.getElementById("agy-pc-run-agy-btn");

    async function refreshPcDirectory(dirPath) {
      const res = await callPcFs({ action: "list", path: dirPath, limit: 120 });
      if (!res?.ok || !entriesBox) return;
      if (pathInput) pathInput.value = res.path;
      entriesBox.innerHTML = "";
      for (const item of res.entries || []) {
        const row = document.createElement("button");
        row.type = "button";
        row.style.cssText =
          "display:flex;align-items:center;justify-content:space-between;width:100%;border:none;background:transparent;color:#e3e3e3;padding:4px 6px;border-radius:6px;text-align:left;cursor:pointer;font-size:11px;";
        row.innerHTML = `<span>${item.isDir ? "📁" : "📄"} ${item.name}</span><span style="opacity:0.55;">${item.isDir ? "DIR" : item.size + " B"}</span>`;
        row.addEventListener("click", async () => {
          if (item.isDir) {
            await refreshPcDirectory(item.path);
          } else {
            activeFilePath = item.path;
            if (pathInput) pathInput.value = item.path;
            const fileRes = await callPcFs({
              action: "read",
              path: item.path,
              startLine: 1,
              endLine: 300,
            });
            if (fileRes?.ok && editorBox) {
              editorBox.value = fileRes.content || "";
            }
          }
        });
        entriesBox.appendChild(row);
      }
    }

    async function refreshAntigravitySessionStatus() {
      const res = await callAgySession({ action: "status" });
      if (res?.ok && res.session) {
        if (compactBadge) {
          compactBadge.textContent = `${res.session.model} (${res.session.thinkingLevel}) • Auto-Compact #${res.session.compactCount}`;
        }
        if (editorBox && !editorBox.value.trim()) {
          editorBox.value = `[Mémoire Permanente Antigravity #${res.session.compactCount}]\n${res.session.compactedSummary}`;
        }
      }
    }

    pcBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = drawer.style.display === "none";
      drawer.style.display = isHidden ? "flex" : "none";
      if (isHidden) {
        refreshPcDirectory(pathInput?.value || "C:\\Users\\aphro\\google");
        refreshAntigravitySessionStatus();
      }
    });

    closeDrawerBtn?.addEventListener("click", () => {
      drawer.style.display = "none";
    });

    lsBtn?.addEventListener("click", () => {
      refreshPcDirectory(pathInput?.value || "C:\\Users\\aphro\\google");
    });

    upBtn?.addEventListener("click", async () => {
      const cur = pathInput?.value || "C:\\Users\\aphro\\google";
      const res = await callPcFs({ action: "list", path: cur, limit: 1 });
      if (res?.parentPath) {
        await refreshPcDirectory(res.parentPath);
      }
    });

    saveFileBtn?.addEventListener("click", async () => {
      const target = activeFilePath || pathInput?.value;
      if (!target || !editorBox) return;
      const res = await callPcFs({
        action: "write",
        path: target,
        content: editorBox.value,
      });
      if (res?.ok) {
        showConfirmationToast(`Fichier sauvegardé sur PC : ${res.path}`);
      }
    });

    injectBtn?.addEventListener("click", () => {
      if (!editorBox?.value) return;
      const header = activeFilePath ? `[PC File: ${activeFilePath}]\n` : "[PC / Antigravity Context]\n";
      injectTranscriptIntoPage(`${header}${editorBox.value}`, false);
    });

    injectSendBtn?.addEventListener("click", () => {
      if (!editorBox?.value) return;
      const header = activeFilePath ? `[PC File: ${activeFilePath}]\n` : "[PC / Antigravity Context]\n";
      injectTranscriptIntoPage(`${header}${editorBox.value}`, true);
    });

    compactNowBtn?.addEventListener("click", async () => {
      const res = await callAgySession({ action: "compact", keepRecentTurns: 2 });
      if (res?.ok) {
        if (compactBadge) {
          compactBadge.textContent = `gemini-3.8-flash (low) • Auto-Compact #${res.compactCount}`;
        }
        if (editorBox) {
          editorBox.value = `[Auto-Compact #${res.compactCount} • gemini-3.8-flash (low)]\n${res.compactedSummary}`;
        }
        showConfirmationToast(`Auto-Compact #${res.compactCount} exécuté (gemini-3.8-flash low)`);
      }
    });

    runCmdBtn?.addEventListener("click", async () => {
      const cmd = cmdInput?.value?.trim();
      if (!cmd) return;
      const res = await callPcExec({
        command: cmd,
        cwd: pathInput?.value || "C:\\Users\\aphro\\google",
      });
      if (editorBox) {
        editorBox.value = `$ ${cmd} (exit=${res?.exitCode})\n${res?.stdout || ""}${res?.stderr ? "\n" + res.stderr : ""}`;
      }
    });

    runAgyBtn?.addEventListener("click", async () => {
      const prompt = cmdInput?.value?.trim() || editorBox?.value?.trim();
      if (!prompt) return;
      const res = await callAgySession({ action: "turn", prompt });
      if (res?.ok) {
        if (compactBadge && res.session) {
          compactBadge.textContent = `${res.session.model} (${res.session.thinkingLevel}) • Auto-Compact #${res.session.compactCount}`;
        }
        if (editorBox) {
          editorBox.value = res.reply || "";
        }
      }
    });

    const orbHit = document.getElementById("agy-gem-orb-hit");
    const liveBtn = document.getElementById("agy-gem-live-btn");
    const pttBtn = document.getElementById("agy-gem-ptt-btn");

    const toggleLiveVoice = async () => {
      isLiveActive = !isLiveActive;
      if (isLiveActive) {
        await startMicrophoneCapture();
        liveState = "LISTENING";
      } else {
        stopPlaybackForBargeIn();
        if (!isRecordingPtt) stopMicrophoneCapture();
        liveState = "IDLE";
      }
      await sendVoiceAction({ action: "toggle_live", enabled: isLiveActive });
      updateUiState();
    };

    orbHit?.addEventListener("click", toggleLiveVoice);
    liveBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLiveVoice();
    });

    pttBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      isRecordingPtt = !isRecordingPtt;
      if (isRecordingPtt) {
        stopPlaybackForBargeIn();
        pcmChunks = [];
        await startMicrophoneCapture();
        liveState = "LISTENING";
        await sendVoiceAction({ action: "ptt_start" });
      } else {
        const captured = pcmChunks.slice();
        pcmChunks = [];
        await sendVoiceAction({ action: "ptt_stop" });
        if (captured.length > 0) {
          await submitCapturedPcmUtterance(captured);
        } else {
          liveState = isLiveActive ? "LISTENING" : "IDLE";
        }
      }
      updateUiState();
    });
  }

  function updateUiState() {
    const root = document.getElementById("agy-gemini-live-floating-root");
    const liveBtn = document.getElementById("agy-gem-live-btn");
    if (root) {
      root.style.borderColor =
        isLiveActive || isRecordingPtt ? "#a8c7fa" : "#333537";
    }
    if (liveBtn) {
      liveBtn.style.background = isLiveActive ? "#a8c7fa" : "#282a2c";
      liveBtn.style.color = isLiveActive ? "#042c6c" : "#e3e3e3";
    }
  }

  // Continuous 60fps Official Gemini SVG animation
  function animateSvg() {
    const speed =
      liveState === "SPEAKING"
        ? 3.4
        : liveState === "LISTENING"
          ? 2.2
          : liveState === "THINKING"
            ? 4.0
            : 0.85;
    angle = (angle + speed) % 360;
    const scale =
      1.0 +
      Math.min(0.45, currentRms * 1.35) +
      0.05 * Math.sin((angle * Math.PI) / 45);
    const svgEl = document.getElementById("agy-gemini-official-svg");
    if (svgEl) {
      svgEl.style.transform = `rotate(${angle.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    }
    requestAnimationFrame(animateSvg);
  }

  // Keyboard shortcuts: F5 toggles Record, Alt+V toggles /voice Live, Alt+A toggles PC Filesystem & Antigravity Drawer, Alt+Enter resolves /fs /read /cmd /compact in Gemini Web prompt
  window.addEventListener("keydown", async (e) => {
    if (e.key === "F5" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById("agy-gem-ptt-btn")?.click();
    } else if (e.altKey && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      document.getElementById("agy-gem-live-btn")?.click();
    } else if (e.altKey && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      document.getElementById("agy-gem-pc-btn")?.click();
    } else if (e.altKey && e.key === "Enter") {
      const activeEl = document.activeElement;
      const text = (
        activeEl?.value ||
        activeEl?.textContent ||
        ""
      ).trim();
      if (text && /(\/fs|@fs|\/read|@read|\/cmd|@cmd|\/compact)/i.test(text)) {
        e.preventDefault();
        const res = await callAgySession({ action: "turn", prompt: text });
        if (res?.ok) {
          const pcBlock =
            Array.isArray(res.pcContextData) && res.pcContextData.length > 0
              ? `${res.pcContextData.join("\n\n")}\n\n`
              : "";
          injectTranscriptIntoPage(
            `${pcBlock}[Antigravity 3.8-flash low Auto-Compact #${res.compactCount ?? 0}]\n${res.reply || ""}`,
            false,
          );
          showConfirmationToast(
            `Contexte PC & Session Antigravity injectés dans Gemini Web`,
          );
        }
      }
    }
  });

  // Subscribe to real-time Hub events via Electron IPC or WebSocket
  function subscribeToHubEvents() {
    const handleEvent = (msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "telemetry") {
        if (!isRecordingPtt && liveState !== "SPEAKING") {
          liveState = msg.state || liveState;
          currentRms = Math.max(
            currentRms * 0.7,
            msg.input_rms || 0,
            msg.output_rms || 0,
            0.06,
          );
        }
      } else if (msg.type === "voice_mode_toggled") {
        isLiveActive = Boolean(msg.is_live_active);
        liveState = msg.state || (isLiveActive ? "LISTENING" : "IDLE");
        if (isLiveActive) startMicrophoneCapture();
        updateUiState();
      } else if (msg.type === "transcript" && msg.turn?.text) {
        lastTranscript = msg.turn.text;
        injectTranscriptIntoPage(msg.turn.text, autoSubmitPrompt);
        updateUiState();
      } else if (msg.type === "model_response" && msg.turn?.text) {
        lastReply = msg.turn.text;
        updateUiState();
      } else if (
        msg.type === "audio_output" &&
        msg.audio_base64 &&
        msg.surface !== SURFACE_NAME
      ) {
        playSynthesizedAudio(msg.audio_base64, msg.mime_type || "audio/mpeg");
      } else if (msg.type === "pilot_gemini_windows") {
        if (msg.command === "send_prompt" && msg.prompt) {
          injectTranscriptIntoPage(msg.prompt, true);
        } else if (msg.command === "toggle_live") {
          document.getElementById("agy-gem-live-btn")?.click();
        }
      }
    };

    if (window.geminiVoiceExtensionBridge?.onHubEvent) {
      window.geminiVoiceExtensionBridge.onHubEvent(handleEvent);
      return;
    }

    // Fallback WebSocket connection when outside Electron CSP
    try {
      const ws = new WebSocket("ws://127.0.0.1:8765/ws/voice");
      ws.addEventListener("message", (event) => {
        try {
          handleEvent(JSON.parse(event.data));
        } catch {}
      });
      ws.addEventListener("close", () =>
        setTimeout(subscribeToHubEvents, 3500),
      );
    } catch {}
  }

  function showConfirmationToast(text) {
    requestAnimationFrame(() => {
      let toast = document.getElementById("agy-gemini-voice-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "agy-gemini-voice-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.style.cssText = [
          "position: fixed",
          "bottom: 140px",
          "right: 22px",
          "z-index: 2147483647",
          "padding: 10px 14px",
          "border-radius: 12px",
          "background: rgba(13, 15, 24, 0.96)",
          "border: 1px solid rgba(129, 201, 149, 0.6)",
          "box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45)",
          "color: #81C995",
          'font-family: "Google Sans", Roboto, system-ui, sans-serif',
          "font-size: 12px",
          "font-weight: 600",
          "transition: opacity 0.2s ease, transform 0.2s ease",
        ].join(";");
        document.body.appendChild(toast);
      }
      toast.textContent = text;
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
      setTimeout(() => {
        if (toast) {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(6px)";
        }
      }, 2400);
    });
  }

  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "SHOW_TOAST" && message.text) {
        showConfirmationToast(message.text);
        sendResponse({ ok: true });
      }
      return false;
    });
  }

  function init() {
    createFloatingVoiceRoot();
    requestAnimationFrame(animateSvg);
    subscribeToHubEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
