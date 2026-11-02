/**
 * @fileoverview Minimalist Side Panel Controller (Zero Text, Voice-to-Voice + 2D/3D Pet).
 */

const orbEl = document.getElementById("side-orb");
const orbBtn = document.getElementById("side-orb-btn");
const liveBtn = document.getElementById("side-live-btn");
const dimBtn = document.getElementById("side-pet-dim-btn");
const petCanvas = document.getElementById("sidePetCanvas");
const petCtx = petCanvas ? petCanvas.getContext("2d") : null;

let isActive = false;
let is3d = true;
let phase = 0;

function tick() {
  phase += isActive ? 0.08 : 0.03;
  if (orbEl) {
    const scale = 1 + (isActive ? 0.18 : 0.05) * Math.sin(phase * 2);
    orbEl.style.transform = `rotate(${((phase * 20) % 360).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  }

  if (petCtx && petCanvas) {
    petCtx.clearRect(0, 0, 120, 120);
    const bob = Math.sin(phase * 1.5) * (isActive ? 6 : 3);
    petCtx.save();
    petCtx.translate(60, 62 + bob);

    const layers = is3d ? 8 : 0;
    for (let z = -layers; z <= 0; z++) {
      petCtx.fillStyle = z === 0 ? "#f4f7f5" : "#cfd8d3";
      petCtx.beginPath();
      petCtx.roundRect(-28 + z * 1.1, -24 + z * 0.7, 56, 48, 22);
      petCtx.fill();
    }
    petCtx.fillStyle = "#81c995";
    petCtx.beginPath();
    petCtx.ellipse(-5, -29, 9, 5, -0.4, 0, Math.PI * 2);
    petCtx.ellipse(6, -29, 9, 5, 0.4, 0, Math.PI * 2);
    petCtx.fill();

    petCtx.fillStyle = "#1f1f1f";
    petCtx.beginPath();
    petCtx.arc(-10, -4, 3.2, 0, Math.PI * 2);
    petCtx.arc(10, -4, 3.2, 0, Math.PI * 2);
    petCtx.fill();
    petCtx.restore();
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function connectSidePanelWs() {
  try {
    const ws = new WebSocket("ws://127.0.0.1:8765/ws/voice");
    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (typeof data.is_live_active === "boolean") {
          isActive = data.is_live_active;
          orbBtn?.setAttribute("aria-pressed", String(isActive));
          liveBtn?.setAttribute("aria-pressed", String(isActive));
        }
      } catch {}
    });
    ws.addEventListener("close", () => setTimeout(connectSidePanelWs, 3000));
  } catch {
    setTimeout(connectSidePanelWs, 3000);
  }
}
connectSidePanelWs();

async function toggleLive() {
  isActive = !isActive;
  orbBtn?.setAttribute("aria-pressed", String(isActive));
  liveBtn?.setAttribute("aria-pressed", String(isActive));
  try {
    await chrome.runtime.sendMessage({
      type: "VOICE_ACTION",
      payload: {
        action: "toggle_live",
        enabled: isActive,
        surface: "gemini_web",
      },
    });
  } catch {}
}

orbBtn?.addEventListener("click", toggleLive);
liveBtn?.addEventListener("click", toggleLive);
dimBtn?.addEventListener("click", () => {
  is3d = !is3d;
  dimBtn.setAttribute("aria-pressed", String(is3d));
});
