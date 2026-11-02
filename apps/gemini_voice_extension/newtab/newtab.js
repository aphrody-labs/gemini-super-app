/**
 * @fileoverview Minimalist Google Gemini Voice-to-Voice + 2D/3D Pet Controller.
 * Zero visible text, full-duplex 16kHz PCM microphone capture + VAD + 24kHz TTS
 * playback + interactive 2D/3D companion pet with physics & particle effects.
 */

const VOICE_BRIDGE_URL = "http://127.0.0.1:8765";
const SUPER_APP_URL = "http://127.0.0.1:8787";
const PET_IDS = ["mochi", "gemini-sparkle", "hoodie-cat"];

let isLiveActive = false;
let liveState = "IDLE"; // IDLE | LISTENING | THINKING | SPEAKING
let audioRms = 0.05;
let is3dPet = true;
let petCharacterIndex = 0; // 0: Mochi, 1: Gemini Sparkle, 2: Hoodie Cat
let petBounce = 0;
let cursorX = 0;
let cursorY = 0;

// Anti-race-condition locks against 25Hz WebSocket telemetry
let lastLocalToggleMs = 0;
let isSubmittingUtterance = false;
let lastPlayedTurnId = "";
let lastPlayedAudioSig = "";

// Audio capture & playback state
let micStream = null;
let micAudioCtx = null;
let micProcessor = null;
let pcmChunks = [];
let speechDetected = false;
let silenceStartMs = 0;
let playbackAudioCtx = null;
let activeSource = null;
let browserRecognition = null;
let latestBrowserTranscript = "";

// Interactive Pet Drag & Particle state
let isDraggingPet = false;
let petDragMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let petOffsetX = 0;
let petOffsetY = 0;
const petParticles = [];

// 1. Color Scheme Sync (Modern Web Guidance `dark-mode-toggle`)
function applyStoredColorScheme() {
  const meta = document.querySelector('meta[name="color-scheme"]');
  let stored = null;
  try {
    stored = localStorage.getItem("color-scheme");
  } catch {}
  if (meta) {
    meta.setAttribute("content", stored ?? "light dark");
  }
  const isLight =
    stored === "light" ||
    (!stored && window.matchMedia?.("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("light", isLight);
  document.documentElement.classList.toggle("dark", !isLight);
}
applyStoredColorScheme();

window.addEventListener("storage", (e) => {
  if (e.key === "color-scheme") applyStoredColorScheme();
});

window.addEventListener("pointermove", (e) => {
  cursorX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
  cursorY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
});

function spawnPetParticles(count = 6) {
  const colors = ["#4285F4", "#9B72CB", "#D96570", "#81c995", "#a8c7fa"];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.2 + Math.random() * 1.8;
    petParticles.push({
      x: (Math.random() - 0.5) * 24,
      y: -18 + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.1,
      size: 3.5 + Math.random() * 3,
      alpha: 1,
      color: colors[i % colors.length],
    });
  }
}

// 2. Google Gemini Pixel-Perfect Live Orb & Fluid Aura Renderer (60 FPS)
const orbCanvas = document.getElementById("orbSpectrumCanvas");
const orbCtx = orbCanvas ? orbCanvas.getContext("2d") : null;
const orbSvg = document.getElementById("AnimatedGeminiSvgOrb");
let orbPhase = 0;

function renderGeminiOrb() {
  if (orbCtx && orbCanvas) {
    const w = orbCanvas.width;
    const h = orbCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    orbCtx.clearRect(0, 0, w, h);

    const speed =
      liveState === "SPEAKING"
        ? 0.095
        : liveState === "LISTENING"
          ? 0.055
          : liveState === "THINKING"
            ? 0.125
            : 0.022;
    orbPhase += speed;

    // Soft organic Google Gemini radial aura
    const auraRadius = 56 + audioRms * 52 + Math.sin(orbPhase) * 6;
    const auraGrad = orbCtx.createRadialGradient(
      cx,
      cy,
      12,
      cx,
      cy,
      auraRadius,
    );
    if (isLiveActive || liveState === "SPEAKING" || liveState === "THINKING") {
      auraGrad.addColorStop(0, "rgba(66, 133, 244, 0.38)");
      auraGrad.addColorStop(0.5, "rgba(155, 114, 203, 0.24)");
      auraGrad.addColorStop(1, "rgba(217, 101, 112, 0)");
    } else {
      auraGrad.addColorStop(0, "rgba(168, 199, 250, 0.16)");
      auraGrad.addColorStop(1, "rgba(168, 199, 250, 0)");
    }
    orbCtx.fillStyle = auraGrad;
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
    orbCtx.fill();

    // 32-band harmonic ring
    const bands = 32;
    const baseR = 54;
    const activeVisual =
      isLiveActive || liveState === "SPEAKING" || liveState === "THINKING";
    for (let i = 0; i < bands; i++) {
      const angle = (i / bands) * Math.PI * 2 + orbPhase * 0.25;
      const wave =
        Math.sin(orbPhase * 2 + i * 0.4) * 0.5 +
        Math.cos(orbPhase * 1.4 - i * 0.3) * 0.5;
      const len = activeVisual
        ? 4 + Math.abs(wave) * (14 + audioRms * 44)
        : 2 + Math.abs(wave) * 4;

      const x1 = cx + Math.cos(angle) * baseR;
      const y1 = cy + Math.sin(angle) * baseR;
      const x2 = cx + Math.cos(angle) * (baseR + len);
      const y2 = cy + Math.sin(angle) * (baseR + len);

      orbCtx.strokeStyle =
        i % 3 === 0 ? "#4285F4" : i % 3 === 1 ? "#9B72CB" : "#D96570";
      orbCtx.lineWidth = 2.5;
      orbCtx.lineCap = "round";
      orbCtx.beginPath();
      orbCtx.moveTo(x1, y1);
      orbCtx.lineTo(x2, y2);
      orbCtx.stroke();
    }
  }

  if (orbSvg) {
    const scale = 1 + audioRms * 0.35 + Math.sin(orbPhase) * 0.04;
    const rot = (orbPhase * 18) % 360;
    orbSvg.style.transform = `rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  }

  requestAnimationFrame(renderGeminiOrb);
}
requestAnimationFrame(renderGeminiOrb);

// 3. Interactive 2D / 3D Companion Pet Renderer (Mochi / Gemini Sparkle / Hoodie Cat)
const petCanvas = document.getElementById("petCanvas");
const petCtx = petCanvas ? petCanvas.getContext("2d") : null;
const petInteractBtn = document.getElementById("petInteractBtn");
let petPhase = 0;

function drawStarSparklePath(ctx, ox, oy, radius) {
  ctx.beginPath();
  ctx.moveTo(ox, -radius + oy);
  ctx.quadraticCurveTo(
    radius * 0.18 + ox,
    -radius * 0.18 + oy,
    radius + ox,
    oy,
  );
  ctx.quadraticCurveTo(radius * 0.18 + ox, radius * 0.18 + oy, ox, radius + oy);
  ctx.quadraticCurveTo(
    -radius * 0.18 + ox,
    radius * 0.18 + oy,
    -radius + ox,
    oy,
  );
  ctx.quadraticCurveTo(
    -radius * 0.18 + ox,
    -radius * 0.18 + oy,
    ox,
    -radius + oy,
  );
  ctx.closePath();
}

function renderCompanionPet() {
  if (
    !isDraggingPet &&
    (Math.abs(petOffsetX) > 0.2 || Math.abs(petOffsetY) > 0.2)
  ) {
    petOffsetX *= 0.92;
    petOffsetY *= 0.92;
    if (petInteractBtn) {
      petInteractBtn.style.transform = `translate(${petOffsetX.toFixed(1)}px, ${petOffsetY.toFixed(1)}px)`;
    }
  }

  if (petCtx && petCanvas) {
    const w = petCanvas.width;
    const h = petCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    petCtx.clearRect(0, 0, w, h);

    const activeMotion = isLiveActive || liveState === "SPEAKING";
    petPhase += activeMotion ? 0.08 : 0.035;
    if (petBounce > 0.01) petBounce *= 0.9;

    const bobY =
      Math.sin(petPhase * 1.5) * (activeMotion ? 6 + audioRms * 14 : 3.5) -
      petBounce * 18;
    const tiltX = cursorX * 0.35 + Math.sin(petPhase * 0.7) * 0.12;
    const tiltY = cursorY * 0.25;

    // Ground shadow
    petCtx.fillStyle = "rgba(0, 0, 0, 0.28)";
    petCtx.beginPath();
    petCtx.ellipse(
      cx,
      cy + 52,
      Math.max(16, 34 - Math.abs(bobY) * 0.3),
      9,
      0,
      0,
      Math.PI * 2,
    );
    petCtx.fill();

    petCtx.save();
    petCtx.translate(cx + tiltX * 10, cy + bobY);

    if (is3dPet) {
      // 3D Volumetric Extruded Voxel / Shaded Companion
      const layers = 10;
      for (let z = -layers; z <= 0; z++) {
        const isFront = z === 0;
        const depthOffset = z * 1.6;
        const ox = depthOffset * tiltX;
        const oy = depthOffset * tiltY;

        if (petCharacterIndex === 0) {
          // 3D Mochi Sprout Companion
          petCtx.fillStyle = isFront ? "#f4f7f5" : "#cfd8d3";
          petCtx.beginPath();
          petCtx.roundRect(-36 + ox, -30 + oy, 72, 64, 30);
          petCtx.fill();

          petCtx.fillStyle = isFront ? "#81c995" : "#5bb974";
          petCtx.beginPath();
          petCtx.ellipse(ox - 6, -38 + oy, 11, 6, -0.4, 0, Math.PI * 2);
          petCtx.ellipse(ox + 7, -38 + oy, 11, 6, 0.4, 0, Math.PI * 2);
          petCtx.fill();
        } else if (petCharacterIndex === 1) {
          // 3D Gemini Sparkle Crystal Companion
          const grad = petCtx.createLinearGradient(-38, -38, 38, 38);
          grad.addColorStop(0, isFront ? "#4285F4" : "#1b56b5");
          grad.addColorStop(0.5, isFront ? "#9B72CB" : "#674394");
          grad.addColorStop(1, isFront ? "#D96570" : "#963c45");
          petCtx.fillStyle = grad;
          drawStarSparklePath(petCtx, ox, oy, 44);
          petCtx.fill();
        } else {
          // 3D Hoodie Cat Companion
          petCtx.fillStyle = isFront ? "#a8c7fa" : "#6892d6";
          petCtx.beginPath();
          petCtx.roundRect(-34 + ox, -26 + oy, 68, 60, 24);
          petCtx.fill();
          petCtx.beginPath();
          petCtx.moveTo(-28 + ox, -22 + oy);
          petCtx.lineTo(-18 + ox, -42 + oy);
          petCtx.lineTo(-6 + ox, -24 + oy);
          petCtx.moveTo(28 + ox, -22 + oy);
          petCtx.lineTo(18 + ox, -42 + oy);
          petCtx.lineTo(6 + ox, -24 + oy);
          petCtx.fill();
        }
      }
    } else {
      // Crisp 2D Vector Sprite Companion (distinct silhouettes for all 3 characters)
      petCtx.strokeStyle = "#131314";
      petCtx.lineWidth = 3;

      if (petCharacterIndex === 0) {
        // 2D Mochi
        petCtx.fillStyle = "#f4f7f5";
        petCtx.beginPath();
        petCtx.roundRect(-36, -30, 72, 64, 28);
        petCtx.fill();
        petCtx.stroke();

        petCtx.fillStyle = "#81c995";
        petCtx.beginPath();
        petCtx.ellipse(-6, -38, 11, 6, -0.4, 0, Math.PI * 2);
        petCtx.ellipse(7, -38, 11, 6, 0.4, 0, Math.PI * 2);
        petCtx.fill();
        petCtx.stroke();
      } else if (petCharacterIndex === 1) {
        // 2D Gemini Sparkle Star
        const grad = petCtx.createLinearGradient(-38, -38, 38, 38);
        grad.addColorStop(0, "#4285F4");
        grad.addColorStop(0.5, "#9B72CB");
        grad.addColorStop(1, "#D96570");
        petCtx.fillStyle = grad;
        drawStarSparklePath(petCtx, 0, 0, 44);
        petCtx.fill();
        petCtx.stroke();
      } else {
        // 2D Hoodie Cat
        petCtx.fillStyle = "#a8c7fa";
        petCtx.beginPath();
        petCtx.moveTo(-28, -22);
        petCtx.lineTo(-18, -42);
        petCtx.lineTo(-6, -24);
        petCtx.moveTo(28, -22);
        petCtx.lineTo(18, -42);
        petCtx.lineTo(6, -24);
        petCtx.fill();
        petCtx.stroke();

        petCtx.beginPath();
        petCtx.roundRect(-34, -26, 68, 60, 24);
        petCtx.fill();
        petCtx.stroke();
      }
    }

    // Expressive eyes + voice-reactive mouth on the front face
    const eyeX = cursorX * 5;
    const eyeY = cursorY * 4;
    const blink = Math.sin(petPhase * 0.9) > 0.97;
    petCtx.fillStyle = petCharacterIndex === 1 ? "#ffffff" : "#1f1f1f";

    if (blink) {
      petCtx.fillRect(-18 + eyeX, -6 + eyeY, 8, 2);
      petCtx.fillRect(10 + eyeX, -6 + eyeY, 8, 2);
    } else {
      petCtx.beginPath();
      petCtx.arc(-14 + eyeX, -5 + eyeY, 4.2, 0, Math.PI * 2);
      petCtx.arc(14 + eyeX, -5 + eyeY, 4.2, 0, Math.PI * 2);
      petCtx.fill();
    }

    // Rosy cheeks
    petCtx.fillStyle = "rgba(242, 139, 130, 0.55)";
    petCtx.beginPath();
    petCtx.ellipse(-22 + eyeX, 3 + eyeY, 5, 3, 0, 0, Math.PI * 2);
    petCtx.ellipse(22 + eyeX, 3 + eyeY, 5, 3, 0, 0, Math.PI * 2);
    petCtx.fill();

    // Mouth reacts to live voice speaking/listening
    petCtx.strokeStyle = petCharacterIndex === 1 ? "#ffffff" : "#1f1f1f";
    petCtx.lineWidth = 2.4;
    petCtx.lineCap = "round";
    petCtx.beginPath();
    if (liveState === "SPEAKING" || audioRms > 0.14) {
      const mouthOpen = Math.min(10, 2 + audioRms * 18);
      petCtx.ellipse(eyeX, 6 + eyeY, 5, mouthOpen, 0, 0, Math.PI * 2);
      petCtx.stroke();
    } else {
      petCtx.arc(eyeX, 4 + eyeY, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      petCtx.stroke();
    }

    // Floating sparkle/heart particles
    for (let i = petParticles.length - 1; i >= 0; i--) {
      const p = petParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.024;
      if (p.alpha <= 0) {
        petParticles.splice(i, 1);
        continue;
      }
      petCtx.save();
      petCtx.globalAlpha = Math.max(0, p.alpha);
      petCtx.fillStyle = p.color;
      drawStarSparklePath(petCtx, p.x, p.y, p.size * 2);
      petCtx.fill();
      petCtx.restore();
    }

    petCtx.restore();
  }

  requestAnimationFrame(renderCompanionPet);
}
requestAnimationFrame(renderCompanionPet);

// 4. Web Audio API Chimes & Full-Duplex Voice-to-Voice Pipeline
function ensurePlaybackAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!playbackAudioCtx || playbackAudioCtx.state === "closed") {
    playbackAudioCtx = new AudioCtx();
  }
  if (playbackAudioCtx.state === "suspended") {
    playbackAudioCtx.resume().catch(() => {});
  }
  return playbackAudioCtx;
}

function playActivationChime(turningOn) {
  try {
    const ctx = ensurePlaybackAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = turningOn ? [523.25, 659.25, 783.99] : [659.25, 493.88];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.055 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.24);
    });
  } catch {}
}

function playPetChirp() {
  try {
    const ctx = ensurePlaybackAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  } catch {}
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function downsampleFloat32ToInt16Pcm16k(float32Input, inputSampleRate) {
  const targetRate = 16000;
  if (!inputSampleRate || inputSampleRate === targetRate) {
    const out = new Int16Array(float32Input.length);
    for (let i = 0; i < float32Input.length; i++) {
      const v = Math.max(-1, Math.min(1, float32Input[i]));
      out[i] = v < 0 ? v * 32768 : v * 32767;
    }
    return out;
  }
  const ratio = inputSampleRate / targetRate;
  const outLength = Math.max(1, Math.round(float32Input.length / ratio));
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(float32Input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += float32Input[j];
      count++;
    }
    const sample =
      count > 0
        ? sum / count
        : float32Input[Math.min(start, float32Input.length - 1)];
    const v = Math.max(-1, Math.min(1, sample));
    out[i] = v < 0 ? v * 32768 : v * 32767;
  }
  return out;
}

function mergeInt16Chunks(chunks) {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Int16Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out.buffer;
}

function wrapRawPcmInWavIfNeeded(bytes, sampleRate = 24000) {
  if (bytes.length >= 4) {
    const h0 = bytes[0];
    const h1 = bytes[1];
    const h2 = bytes[2];
    const h3 = bytes[3];
    // RIFF (WAV), ID3 / 0xFF (MP3), OggS (Ogg)
    if (
      (h0 === 0x52 && h1 === 0x49 && h2 === 0x46 && h3 === 0x46) ||
      (h0 === 0x49 && h1 === 0x44 && h2 === 0x33) ||
      h0 === 0xff ||
      (h0 === 0x4f && h1 === 0x67 && h2 === 0x67 && h3 === 0x53)
    ) {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    }
  }
  const wav = new ArrayBuffer(44 + bytes.byteLength);
  const view = new DataView(wav);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + bytes.byteLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, bytes.byteLength, true);
  new Uint8Array(wav, 44).set(bytes);
  return wav;
}

function stopPlayback() {
  if (activeSource) {
    try {
      activeSource.stop();
      activeSource.disconnect();
    } catch {}
    activeSource = null;
  }
}

async function playAudioBase64(base64Audio, turnId = "") {
  if (!base64Audio || base64Audio.length < 32) return;
  const sig = `${turnId}:${base64Audio.length}:${base64Audio.slice(0, 48)}`;
  if ((turnId && turnId === lastPlayedTurnId) || sig === lastPlayedAudioSig) {
    return;
  }
  if (turnId) lastPlayedTurnId = turnId;
  lastPlayedAudioSig = sig;

  stopPlayback();
  liveState = "SPEAKING";
  petBounce = 1;
  spawnPetParticles(8);

  try {
    const bin = atob(base64Audio);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const ctx = ensurePlaybackAudioContext();
    if (!ctx) {
      liveState = isLiveActive ? "LISTENING" : "IDLE";
      return;
    }

    const containerBuf = wrapRawPcmInWavIfNeeded(bytes, 24000);
    const buf = await ctx.decodeAudioData(containerBuf);
    const source = ctx.createBufferSource();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    source.buffer = buf;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    activeSource = source;

    const freq = new Uint8Array(analyser.frequencyBinCount);
    const pump = () => {
      if (activeSource !== source) return;
      analyser.getByteFrequencyData(freq);
      let s = 0;
      for (let i = 0; i < freq.length; i++) s += freq[i];
      audioRms = Math.max(0.08, Math.min(0.95, s / (freq.length * 170)));
      requestAnimationFrame(pump);
    };
    requestAnimationFrame(pump);

    source.onended = () => {
      if (activeSource === source) {
        activeSource = null;
        liveState = isLiveActive ? "LISTENING" : "IDLE";
        audioRms = 0.05;
      }
    };
    source.start(0);
  } catch {
    liveState = isLiveActive ? "LISTENING" : "IDLE";
    audioRms = 0.05;
  }
}

async function postVoiceApi(payload) {
  for (const baseUrl of [VOICE_BRIDGE_URL, SUPER_APP_URL]) {
    try {
      const res = await fetch(`${baseUrl}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  return null;
}

async function submitUtterance(chunks, textHint = "") {
  if (isSubmittingUtterance) return;
  const merged = mergeInt16Chunks(chunks);
  const cleanHint = (textHint || latestBrowserTranscript || "").trim();
  latestBrowserTranscript = "";

  if (merged.byteLength < 3200 && !cleanHint) {
    liveState = isLiveActive ? "LISTENING" : "IDLE";
    return;
  }

  isSubmittingUtterance = true;
  liveState = "THINKING";
  try {
    const data = await postVoiceApi({
      action: "voice_to_voice",
      pcm16_base64: merged.byteLength > 0 ? arrayBufferToBase64(merged) : "",
      text: cleanHint,
      auto_reply: true,
      surface: "gemini_minimal_voice",
    });
    const turnId = data?.model_turn?.id || "";
    if (data?.audio_base64) {
      await playAudioBase64(data.audio_base64, turnId);
    } else {
      liveState = isLiveActive ? "LISTENING" : "IDLE";
    }
  } catch {
    liveState = isLiveActive ? "LISTENING" : "IDLE";
  } finally {
    isSubmittingUtterance = false;
  }
}

function startBrowserSpeechRecognitionAssist() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec || browserRecognition) return;
  try {
    const rec = new SpeechRec();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let transcript = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        transcript += ev.results[i][0].transcript;
      }
      if (transcript.trim()) {
        latestBrowserTranscript = transcript.trim();
      }
    };
    rec.onend = () => {
      browserRecognition = null;
      if (isLiveActive) startBrowserSpeechRecognitionAssist();
    };
    rec.onerror = () => {};
    rec.start();
    browserRecognition = rec;
  } catch {}
}

function stopBrowserSpeechRecognitionAssist() {
  if (browserRecognition) {
    try {
      browserRecognition.onend = null;
      browserRecognition.stop();
    } catch {}
    browserRecognition = null;
  }
}

async function startMic() {
  startBrowserSpeechRecognitionAssist();
  if (micStream && micAudioCtx && micAudioCtx.state !== "closed") {
    if (micAudioCtx.state === "suspended") await micAudioCtx.resume();
    return;
  }
  try {
    let preferredDeviceId;
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      const bestMic =
        mics.find((d) => /xbox|casque|asus|realtek/i.test(d.label)) || mics[0];
      if (bestMic?.deviceId) preferredDeviceId = bestMic.deviceId;
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(preferredDeviceId
          ? { deviceId: { ideal: preferredDeviceId } }
          : {}),
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
    const actualSampleRate = micAudioCtx.sampleRate || 16000;
    const src = micAudioCtx.createMediaStreamSource(micStream);
    micProcessor = micAudioCtx.createScriptProcessor(4096, 1, 1);
    pcmChunks = [];
    speechDetected = false;
    silenceStartMs = 0;

    micProcessor.onaudioprocess = (e) => {
      if (!isLiveActive) return;
      const input = e.inputBuffer.getChannelData(0);
      e.outputBuffer.getChannelData(0).fill(0);

      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        const v = Math.max(-1, Math.min(1, input[i]));
        sum += v * v;
      }
      const rms = Math.sqrt(sum / input.length);
      const pcm16 = downsampleFloat32ToInt16Pcm16k(input, actualSampleRate);

      if (liveState !== "SPEAKING") {
        audioRms = Math.max(0.05, Math.min(0.95, rms * 5.4));
      }

      // Barge-in when user talks while Gemini speaks
      if (liveState === "SPEAKING" && rms > 0.065) {
        stopPlayback();
        liveState = "LISTENING";
        pcmChunks = [pcm16];
        speechDetected = true;
        silenceStartMs = 0;
        return;
      }

      if (
        liveState !== "THINKING" &&
        liveState !== "SPEAKING" &&
        !isSubmittingUtterance
      ) {
        if (rms > 0.012) {
          pcmChunks.push(pcm16);
          speechDetected = true;
          silenceStartMs = 0;
          liveState = "LISTENING";
        } else if (speechDetected) {
          pcmChunks.push(pcm16);
          if (!silenceStartMs) {
            silenceStartMs = performance.now();
          } else if (performance.now() - silenceStartMs >= 650) {
            const turn = pcmChunks.slice();
            pcmChunks = [];
            speechDetected = false;
            silenceStartMs = 0;
            submitUtterance(turn, latestBrowserTranscript);
          }
        }
      }
    };

    src.connect(micProcessor);
    micProcessor.connect(micAudioCtx.destination);
  } catch {}
}

function stopMic(flushPendingTurn = true) {
  stopBrowserSpeechRecognitionAssist();
  if (
    flushPendingTurn &&
    (speechDetected || pcmChunks.length > 2 || latestBrowserTranscript)
  ) {
    const pendingTurn = pcmChunks.slice();
    const pendingHint = latestBrowserTranscript;
    pcmChunks = [];
    speechDetected = false;
    silenceStartMs = 0;
    submitUtterance(pendingTurn, pendingHint);
  } else {
    stopPlayback();
  }
  try {
    micProcessor?.disconnect();
    micProcessor = null;
    micStream?.getTracks().forEach((t) => t.stop());
    micStream = null;
    micAudioCtx?.close();
    micAudioCtx = null;
  } catch {}
  audioRms = 0.05;
}

// 5. Minimalist Icon Button Controls & Interactive Companion Pet
const orbBtn = document.getElementById("orbVoiceTrigger");
const micBtn = document.getElementById("micLiveBtn");
const petVoiceBtn = document.getElementById("petVoiceBtn");
const petDimBtn = document.getElementById("petDimensionBtn");
const petCharBtn = document.getElementById("petCharacterBtn");
const themeBtn = document.getElementById("themeBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const micDeviceSelect = document.getElementById("micDeviceSelect");
const speakerDeviceSelect = document.getElementById("speakerDeviceSelect");
const testSpeakerBtn = document.getElementById("testSpeakerBtn");
const voiceNameSelect = document.getElementById("voiceNameSelect");
const vadModeSelect = document.getElementById("vadModeSelect");
const webAutoSyncToggle = document.getElementById("webAutoSyncToggle");
const agyBridgeToggle = document.getElementById("agyBridgeToggle");
const bargeInToggle = document.getElementById("bargeInToggle");
const ytmDuckingToggle = document.getElementById("ytmDuckingToggle");
const micRmsBar = document.getElementById("micRmsBar");
const micRmsLabel = document.getElementById("micRmsLabel");

async function loadHardwareAndSurfaceSettings() {
  for (const baseUrl of [VOICE_BRIDGE_URL, SUPER_APP_URL]) {
    try {
      const res = await fetch(`${baseUrl}/api/audio/hardware`);
      if (!res.ok) continue;
      const data = await res.json();
      const hw = data.hardware_audio || data.hardware || {};
      const settings = data.settings || hw.settings || {};

      if (
        micDeviceSelect &&
        Array.isArray(hw.input_devices) &&
        hw.input_devices.length > 0
      ) {
        micDeviceSelect.innerHTML = "";
        for (const dev of hw.input_devices) {
          const opt = document.createElement("option");
          opt.value = String(dev.index);
          opt.textContent = `[${dev.index}] ${dev.name} (${dev.hostapi})`;
          if (
            dev.index === hw.selected_input_index ||
            dev.index === hw.default_input_index
          ) {
            opt.selected = true;
          }
          micDeviceSelect.appendChild(opt);
        }
      }
      if (
        speakerDeviceSelect &&
        Array.isArray(hw.output_devices) &&
        hw.output_devices.length > 0
      ) {
        speakerDeviceSelect.innerHTML = "";
        for (const dev of hw.output_devices) {
          const opt = document.createElement("option");
          opt.value = String(dev.index);
          opt.textContent = `[${dev.index}] ${dev.name} (${dev.hostapi})`;
          if (
            dev.index === hw.selected_output_index ||
            dev.index === hw.default_output_index
          ) {
            opt.selected = true;
          }
          speakerDeviceSelect.appendChild(opt);
        }
      }

      const audioCfg = settings.audio || {};
      const ttsCfg = audioCfg.tts || {};
      if (voiceNameSelect && ttsCfg.voice_name) {
        voiceNameSelect.value = ttsCfg.voice_name;
      }
      if (vadModeSelect && audioCfg.vad_mode) {
        vadModeSelect.value = audioCfg.vad_mode;
      }
      if (bargeInToggle && typeof audioCfg.barge_in_enabled === "boolean") {
        bargeInToggle.checked = audioCfg.barge_in_enabled;
      }
      if (
        ytmDuckingToggle &&
        typeof audioCfg.youtube_music_ducking === "boolean"
      ) {
        ytmDuckingToggle.checked = audioCfg.youtube_music_ducking;
      }
      if (webAutoSyncToggle && settings.gemini_web_app) {
        webAutoSyncToggle.checked =
          settings.gemini_web_app.auto_sync_prompt_input !== false;
      }
      if (agyBridgeToggle && settings.antigravity) {
        agyBridgeToggle.checked =
          settings.antigravity.agentapi_bridge !== false;
      }
      return;
    } catch {}
  }
}

async function saveHardwareAndSurfaceSettings(extra = {}) {
  const payload = {
    input_device_index: micDeviceSelect ? Number(micDeviceSelect.value) : 1,
    output_device_index: speakerDeviceSelect
      ? Number(speakerDeviceSelect.value)
      : 5,
    voice_name: voiceNameSelect ? voiceNameSelect.value : "Aoede",
    vad_mode: vadModeSelect ? vadModeSelect.value : "hybrid_auto",
    barge_in_enabled: bargeInToggle ? bargeInToggle.checked : true,
    youtube_music_ducking: ytmDuckingToggle ? ytmDuckingToggle.checked : true,
    gemini_web_app: {
      enabled: true,
      auto_sync_prompt_input: webAutoSyncToggle
        ? webAutoSyncToggle.checked
        : true,
      inject_minimal_orb_pill: true,
      companion_pet_mode: is3dPet ? "3d" : "2d",
    },
    antigravity: {
      cli_enabled: true,
      agentapi_bridge: agyBridgeToggle ? agyBridgeToggle.checked : true,
      mic_tcp_port: 24713,
    },
    ...extra,
  };
  for (const baseUrl of [VOICE_BRIDGE_URL, SUPER_APP_URL]) {
    try {
      await fetch(`${baseUrl}/api/audio/hardware`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
  }
}

settingsBtn?.addEventListener("click", () => {
  loadHardwareAndSurfaceSettings();
  if (settingsDialog && typeof settingsDialog.showModal === "function") {
    settingsDialog.showModal();
  }
});

closeSettingsBtn?.addEventListener("click", () => {
  saveHardwareAndSurfaceSettings();
  settingsDialog?.close();
});

micDeviceSelect?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
speakerDeviceSelect?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
voiceNameSelect?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
vadModeSelect?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
webAutoSyncToggle?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
agyBridgeToggle?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
bargeInToggle?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);
ytmDuckingToggle?.addEventListener("change", () =>
  saveHardwareAndSurfaceSettings(),
);

testSpeakerBtn?.addEventListener("click", () => {
  playActivationChime(true);
  saveHardwareAndSurfaceSettings({ test_speaker: true });
});

setInterval(() => {
  if (micRmsBar) {
    const pct = Math.min(100, Math.max(6, Math.round(audioRms * 100)));
    micRmsBar.style.width = `${pct}%`;
  }
  if (micRmsLabel) {
    micRmsLabel.textContent = isLiveActive
      ? "En écoute (16 kHz)"
      : "Prêt (16 kHz)";
  }
}, 120);

async function toggleVoiceSession() {
  const targetActive = !isLiveActive;
  isLiveActive = targetActive;
  lastLocalToggleMs = performance.now();
  petBounce = 1;
  spawnPetParticles(6);

  orbBtn?.setAttribute("aria-pressed", String(targetActive));
  micBtn?.setAttribute("aria-pressed", String(targetActive));
  playActivationChime(targetActive);

  // Notify Voice Bridge immediately without waiting for getUserMedia
  postVoiceApi({
    action: "toggle_live",
    enabled: targetActive,
    browser_mic: true,
    surface: "gemini_minimal_voice",
  });

  if (targetActive) {
    liveState = "LISTENING";
    await startMic();
  } else {
    liveState = "IDLE";
    stopMic(true);
  }
}

async function triggerCompanionPetVoiceGreeting() {
  if (isSubmittingUtterance) return;
  ensurePlaybackAudioContext();
  playPetChirp();
  petBounce = 1.3;
  spawnPetParticles(10);
  petVoiceBtn?.setAttribute("aria-pressed", "true");
  liveState = "THINKING";

  try {
    const res = await fetch(`${SUPER_APP_URL}/api/pet/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt:
          "Coucou ! Dis bonjour à ton humain en une phrase joyeuse et naturelle.",
        voice: petCharacterIndex === 0 ? "Puck" : "Aoede",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.wav_base64) {
        await playAudioBase64(data.wav_base64, `pet-${Date.now()}`);
      } else {
        liveState = isLiveActive ? "LISTENING" : "IDLE";
      }
    } else {
      liveState = isLiveActive ? "LISTENING" : "IDLE";
    }
  } catch {
    liveState = isLiveActive ? "LISTENING" : "IDLE";
  } finally {
    petVoiceBtn?.setAttribute("aria-pressed", "false");
  }
}

orbBtn?.addEventListener("click", toggleVoiceSession);
micBtn?.addEventListener("click", toggleVoiceSession);
petVoiceBtn?.addEventListener("click", triggerCompanionPetVoiceGreeting);

petDimBtn?.addEventListener("click", () => {
  is3dPet = !is3dPet;
  petBounce = 1;
  spawnPetParticles(5);
  playPetChirp();
  petDimBtn.setAttribute("aria-pressed", String(is3dPet));
});

petCharBtn?.addEventListener("click", () => {
  petCharacterIndex = (petCharacterIndex + 1) % 3;
  petBounce = 1.15;
  spawnPetParticles(7);
  playPetChirp();
  fetch(`${SUPER_APP_URL}/api/pet/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "switchPet",
      petId: PET_IDS[petCharacterIndex],
    }),
  }).catch(() => {});
});

// Companion Pet Drag-and-Drop + Click-to-Pet + Double-Click-to-Speak
petInteractBtn?.addEventListener("pointerdown", (e) => {
  isDraggingPet = true;
  petDragMoved = false;
  dragStartX = e.clientX - petOffsetX;
  dragStartY = e.clientY - petOffsetY;
  try {
    petInteractBtn.setPointerCapture(e.pointerId);
  } catch {}
});

petInteractBtn?.addEventListener("pointermove", (e) => {
  if (!isDraggingPet) return;
  const nx = e.clientX - dragStartX;
  const ny = e.clientY - dragStartY;
  if (Math.hypot(nx - petOffsetX, ny - petOffsetY) > 4) {
    petDragMoved = true;
  }
  petOffsetX = Math.max(-220, Math.min(220, nx));
  petOffsetY = Math.max(-160, Math.min(160, ny));
  petInteractBtn.style.transform = `translate(${petOffsetX.toFixed(1)}px, ${petOffsetY.toFixed(1)}px)`;
});

petInteractBtn?.addEventListener("pointerup", (e) => {
  if (!isDraggingPet) return;
  isDraggingPet = false;
  try {
    petInteractBtn.releasePointerCapture(e.pointerId);
  } catch {}
});

petInteractBtn?.addEventListener("click", () => {
  if (petDragMoved) return;
  petBounce = 1.25;
  spawnPetParticles(8);
  playPetChirp();
  fetch(`${SUPER_APP_URL}/api/pet/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "pet" }),
  }).catch(() => {});
});

petInteractBtn?.addEventListener("dblclick", () => {
  triggerCompanionPetVoiceGreeting();
});

themeBtn?.addEventListener("click", () => {
  const isCurrentlyDark = document.documentElement.classList.contains("dark");
  const target = isCurrentlyDark ? "light" : "dark";
  const sys = window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
  try {
    if (target === sys) localStorage.removeItem("color-scheme");
    else localStorage.setItem("color-scheme", target);
  } catch {}
  applyStoredColorScheme();
});

// Load initial persisted pet character state from Super App SQLite
fetch(`${SUPER_APP_URL}/api/pet/state`)
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    const activeId = data?.pet?.activePetId;
    const idx = PET_IDS.indexOf(activeId);
    if (idx !== -1) petCharacterIndex = idx;
  })
  .catch(() => {});

// 6. Real-Time Hardware Microphone Telemetry & Audio Bridge (ws://127.0.0.1:8765/ws/voice)
function connectHardwareVoiceBridgeWs() {
  try {
    const ws = new WebSocket("ws://127.0.0.1:8765/ws/voice");
    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "welcome" || msg.type === "voice_mode_toggled") {
          if (
            typeof msg.is_live_active === "boolean" &&
            performance.now() - lastLocalToggleMs > 1500
          ) {
            isLiveActive = msg.is_live_active;
            orbBtn?.setAttribute("aria-pressed", String(isLiveActive));
            micBtn?.setAttribute("aria-pressed", String(isLiveActive));
          }
          if (msg.state && !activeSource && !isSubmittingUtterance) {
            liveState = msg.state;
          }
        } else if (msg.type === "telemetry") {
          const hwRms = Math.max(msg.input_rms || 0, msg.output_rms || 0);
          if (hwRms > 0.01 && liveState !== "SPEAKING" && !speechDetected) {
            audioRms = Math.max(audioRms * 0.65, Math.min(0.95, hwRms * 4.2));
          }
          // Only sync remote state when no local toggle, speech, or submission is active
          if (
            typeof msg.is_live_active === "boolean" &&
            performance.now() - lastLocalToggleMs > 3500 &&
            !micStream &&
            !isSubmittingUtterance
          ) {
            isLiveActive = msg.is_live_active;
            orbBtn?.setAttribute("aria-pressed", String(isLiveActive));
            micBtn?.setAttribute("aria-pressed", String(isLiveActive));
          }
          if (
            msg.state &&
            liveState !== "SPEAKING" &&
            !activeSource &&
            !isSubmittingUtterance &&
            !speechDetected &&
            performance.now() - lastLocalToggleMs > 3500
          ) {
            liveState = msg.state;
          }
        } else if (msg.type === "audio_output" && msg.audio_base64) {
          playAudioBase64(msg.audio_base64, msg.turn_id || "");
        } else if (msg.type === "interrupted") {
          stopPlayback();
          liveState = isLiveActive ? "LISTENING" : "IDLE";
        }
      } catch {}
    });
    ws.addEventListener("close", () =>
      setTimeout(connectHardwareVoiceBridgeWs, 2500),
    );
  } catch {
    setTimeout(connectHardwareVoiceBridgeWs, 2500);
  }
}
connectHardwareVoiceBridgeWs();
