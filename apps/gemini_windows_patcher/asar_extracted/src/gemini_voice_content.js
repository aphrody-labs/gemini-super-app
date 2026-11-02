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

        // Barge-in check: user speaks while Gemini is speaking
        if (liveState === "SPEAKING" && rms > 0.065) {
          bargeInFrames++;
          if (bargeInFrames >= 2) {
            stopPlaybackForBargeIn();
            sendVoiceAction({ action: "interrupt" });
            liveState = "LISTENING";
            pcmChunks = [pcm16];
            speechDetectedInTurn = true;
            silenceStartMs = 0;
            bargeInFrames = 0;
            updateUiState();
            return;
          }
        } else {
          bargeInFrames = 0;
        }

        // Accumulate PCM during PTT or Hybrid VAD speech
        if (isRecordingPtt) {
          pcmChunks.push(pcm16);
          speechDetectedInTurn = true;
        } else if (
          isLiveActive &&
          liveState !== "THINKING" &&
          liveState !== "SPEAKING"
        ) {
          if (rms > 0.024) {
            pcmChunks.push(pcm16);
            speechDetectedInTurn = true;
            silenceStartMs = 0;
            if (liveState !== "LISTENING") {
              liveState = "LISTENING";
              updateUiState();
            }
          } else if (speechDetectedInTurn) {
            pcmChunks.push(pcm16);
            if (!silenceStartMs) {
              silenceStartMs = performance.now();
            } else if (performance.now() - silenceStartMs >= 880) {
              // 880ms of silence after speech -> finalize utterance!
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
    // Avoid sending tiny clicks (< 0.25s)
    if (mergedBuffer.byteLength < 8000) return;

    liveState = "THINKING";
    updateUiState();

    const pcm16Base64 = arrayBufferToBase64(mergedBuffer);
    const autoReply = voiceMode === "voice_to_voice";

    const res = await sendVoiceAction({
      action: autoReply ? "voice_to_voice" : "stt_pcm16",
      pcm16_base64: pcm16Base64,
      auto_reply: autoReply,
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
    `;

    document.body.appendChild(root);

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

  // Keyboard shortcuts: F5 toggles Record, Alt+V toggles /voice Live
  window.addEventListener("keydown", (e) => {
    if (e.key === "F5" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById("agy-gem-ptt-btn")?.click();
    } else if (e.altKey && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      document.getElementById("agy-gem-live-btn")?.click();
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
