(() => {
  const waveformEl = document.getElementById("waveform");
  const thinkingEl = document.getElementById("thinking");
  const cancelBtn = document.getElementById("cancelBtn");
  const sendBtn = document.getElementById("sendBtn");
  const gemModeBtn = document.getElementById("gemModeBtn");
  const gemSvgEl = document.getElementById("stc-gemini-svg");
  const subtitleEl = document.getElementById("stcSubtitle");
  const waveBars = Array.from(document.querySelectorAll(".wave-bar"));
  const barWeights = [0.21, 0.21, 0.5, 0.57, 1.0, 0.57, 0.5, 0.21, 0.21];

  let latestTranscript = "";
  let isSubmitting = false;
  let micAudioCtx = null;
  let micAnalyser = null;
  let micStream = null;
  let isInitInFlight = false;
  let isMicReady = false;
  let hasSpoken = false;
  let silenceTimer = null;
  let animFrameId = null;
  let svgAngle = 0;
  let currentLevel = 0.08;
  let stcMode = "voice_to_voice";

  // Continuous 60fps Official Gemini SVG animation
  function animateGeminiSvg() {
    svgAngle = (svgAngle + (isSubmitting ? 3.8 : 2.1)) % 360;
    const scale = 1.0 + Math.min(0.38, currentLevel * 0.45);
    if (gemSvgEl) {
      gemSvgEl.style.transform = `rotate(${svgAngle.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    }
    requestAnimationFrame(animateGeminiSvg);
  }
  requestAnimationFrame(animateGeminiSvg);

  gemModeBtn?.addEventListener("click", async () => {
    stcMode =
      stcMode === "voice_to_voice" ? "dictate_to_window" : "voice_to_voice";
    await window.stcBridge?.setStcMode?.(stcMode);
    if (subtitleEl) {
      subtitleEl.textContent =
        stcMode === "voice_to_voice"
          ? "Mode: Voice-to-Voice Live"
          : "Mode: Dictée vers fenêtre active";
    }
  });

  window.stcBridge?.onLocalizedStrings((strings) => {
    if (strings.cancel) cancelBtn.setAttribute("aria-label", strings.cancel);
    if (strings.cancelTip) cancelBtn.title = strings.cancelTip;
    if (strings.send) sendBtn.setAttribute("aria-label", strings.send);
    if (strings.sendTip) sendBtn.title = strings.sendTip;
  });

  async function playResponseAudio(base64Audio, mimeType = "audio/mpeg") {
    if (!base64Audio) return;
    try {
      const bin = atob(base64Audio);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const audioBuf = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}
  }

  async function initMicrophoneAudio() {
    if (isMicReady || isInitInFlight) return;
    isInitInFlight = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        isInitInFlight = false;
        return;
      }
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
      window.stcBridge?.log("initMicrophoneAudio: Got micStream (16kHz mono)");
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        isInitInFlight = false;
        return;
      }
      micAudioCtx = new AudioCtx({ sampleRate: 16000 });
      if (micAudioCtx.state === "suspended") await micAudioCtx.resume();

      micAnalyser = micAudioCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.4;
      const source = micAudioCtx.createMediaStreamSource(micStream);
      source.connect(micAnalyser);

      const scriptNode = micAudioCtx.createScriptProcessor(4096, 1, 1);
      let chunkCount = 0;
      scriptNode.onaudioprocess = (ev) => {
        const input = ev.inputBuffer.getChannelData(0);
        ev.outputBuffer.getChannelData(0).fill(0);
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 32768 : s * 32767;
        }
        chunkCount++;
        if (chunkCount % 10 === 1) {
          window.stcBridge?.log(
            `onaudioprocess: chunk #${chunkCount} pcm16_bytes=${pcm16.byteLength}`,
          );
        }
        window.stcBridge?.sendAudioData(pcm16.buffer);
      };
      source.connect(scriptNode);
      scriptNode.connect(micAudioCtx.destination);
      window._micSource = source;
      window._micScriptNode = scriptNode;
      window._micAudioContext = micAudioCtx;
      isMicReady = true;
      isInitInFlight = false;

      const timeData = new Uint8Array(micAnalyser.fftSize);
      const updateWaveform = () => {
        if (!isSubmitting && micAnalyser) {
          micAnalyser.getByteTimeDomainData(timeData);
          let sumSq = 0;
          for (let i = 0; i < timeData.length; i++) {
            const norm = (timeData[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / timeData.length);
          const scaled = Math.min(1, rms * 5);
          currentLevel = scaled;
          if (rms > 0.04) {
            hasSpoken = true;
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              silenceTimer = null;
            }
          } else if (hasSpoken && !isSubmitting && !silenceTimer) {
            silenceTimer = setTimeout(() => {
              if (hasSpoken && !isSubmitting) acceptSession();
            }, 1150);
          }
          const minHeights = [4, 4, 8, 9, 16, 9, 8, 4, 4];
          waveBars.forEach((bar, idx) => {
            const maxH = 28 * barWeights[idx];
            const h = Math.max(
              minHeights[idx],
              Math.min(28, minHeights[idx] + (maxH - minHeights[idx]) * scaled),
            );
            bar.style.height = `${h.toFixed(1)}px`;
          });
        }
        animFrameId = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (err) {
      window.stcBridge?.log(`initMicrophoneAudio ERROR: ${String(err)}`);
      isInitInFlight = false;
      isMicReady = false;
    }
  }

  function stopMicCapture() {
    try {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      hasSpoken = false;
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
      if (micAudioCtx && micAudioCtx.state !== "closed") {
        micAudioCtx.close().catch(() => {});
        micAudioCtx = null;
      }
      micAnalyser = null;
    } catch {}
    isMicReady = false;
    isInitInFlight = false;
  }

  function acceptSession() {
    if (isSubmitting) return;
    isSubmitting = true;
    waveformEl.style.display = "none";
    thinkingEl.style.display = "flex";
    if (subtitleEl) subtitleEl.textContent = "Whisper STT + Gemini Live...";
    stopMicCapture();
    window.stcBridge?.accept(latestTranscript);
  }

  function cancelSession() {
    if (silenceTimer) clearTimeout(silenceTimer);
    stopMicCapture();
    window.stcBridge?.cancel();
  }

  window.stcBridge?.onUpdate((update) => {
    if (update.text) {
      latestTranscript = update.text.trim();
      if (subtitleEl) {
        subtitleEl.textContent = update.replyText
          ? `Gemini: ${update.replyText}`
          : `« ${latestTranscript} »`;
      }
    }
    if (update.audioBase64) {
      playResponseAudio(update.audioBase64, update.mimeType || "audio/mpeg");
    }
    if (update.status === "thinking") {
      isSubmitting = true;
      waveformEl.style.display = "none";
      thinkingEl.style.display = "flex";
    } else if (update.status === "listening" || update.status === "streaming") {
      isSubmitting = false;
      waveformEl.style.display = "flex";
      thinkingEl.style.display = "none";
      if (subtitleEl && !update.text) {
        subtitleEl.textContent =
          stcMode === "voice_to_voice"
            ? "Gemini Live • Parlez maintenant"
            : "Dictée • Parlez maintenant";
      }
      if (micAudioCtx && micAudioCtx.state === "suspended") {
        micAudioCtx.resume().catch(() => {});
      }
      if (!micStream || !micAudioCtx || micAudioCtx.state === "closed") {
        initMicrophoneAudio();
      }
    } else if (
      ["idle", "hide", "dismiss", "reset", "done", "error"].includes(
        update.status,
      )
    ) {
      isSubmitting = false;
      stopMicCapture();
    }
  });

  cancelBtn.addEventListener("click", cancelSession);
  sendBtn.addEventListener("click", acceptSession);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancelSession();
    else if (e.key === "Enter") acceptSession();
  });
})();
