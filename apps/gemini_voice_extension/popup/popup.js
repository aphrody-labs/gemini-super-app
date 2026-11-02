/**
 * @fileoverview Minimalist Popup Controller (Zero Text, Voice-to-Voice + 2D/3D Pet).
 */

const toggleBtn = document.getElementById("toggle-live-btn");
const micDockBtn = document.getElementById("mic-dock-btn");
const petDimBtn = document.getElementById("pet-dim-btn");
const sidePanelBtn = document.getElementById("open-sidepanel-btn");
const popOrb = document.getElementById("pop-orb");
const petCanvas = document.getElementById("popPetCanvas");
const petCtx = petCanvas ? petCanvas.getContext("2d") : null;

let isActive = false;
let is3d = true;
let phase = 0;

function tick() {
  phase += isActive ? 0.08 : 0.03;
  if (popOrb) {
    const scale = 1 + (isActive ? 0.16 : 0.04) * Math.sin(phase * 2);
    popOrb.style.transform = `rotate(${((phase * 22) % 360).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  }

  if (petCtx && petCanvas) {
    petCtx.clearRect(0, 0, 84, 84);
    const bob = Math.sin(phase * 1.6) * (isActive ? 5 : 2.5);
    petCtx.save();
    petCtx.translate(42, 44 + bob);

    const layers = is3d ? 6 : 0;
    for (let z = -layers; z <= 0; z++) {
      petCtx.fillStyle = z === 0 ? "#f4f7f5" : "#cfd8d3";
      petCtx.beginPath();
      petCtx.roundRect(-22 + z * 0.8, -18 + z * 0.5, 44, 38, 18);
      petCtx.fill();
    }
    petCtx.fillStyle = "#81c995";
    petCtx.beginPath();
    petCtx.ellipse(-4, -22, 7, 4, -0.4, 0, Math.PI * 2);
    petCtx.ellipse(5, -22, 7, 4, 0.4, 0, Math.PI * 2);
    petCtx.fill();

    petCtx.fillStyle = "#1f1f1f";
    petCtx.beginPath();
    petCtx.arc(-8, -3, 2.6, 0, Math.PI * 2);
    petCtx.arc(8, -3, 2.6, 0, Math.PI * 2);
    petCtx.fill();
    petCtx.restore();
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

async function refreshStatus() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    if (res?.ok && res.data) {
      isActive = Boolean(res.data.is_live_active);
      toggleBtn?.setAttribute("aria-pressed", String(isActive));
      micDockBtn?.setAttribute("aria-pressed", String(isActive));
    }
  } catch {}
}

async function toggleLive() {
  isActive = !isActive;
  toggleBtn?.setAttribute("aria-pressed", String(isActive));
  micDockBtn?.setAttribute("aria-pressed", String(isActive));
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

toggleBtn?.addEventListener("click", toggleLive);
micDockBtn?.addEventListener("click", toggleLive);

petDimBtn?.addEventListener("click", () => {
  is3d = !is3d;
  petDimBtn.setAttribute("aria-pressed", String(is3d));
});

sidePanelBtn?.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (chrome.sidePanel?.open && tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("sidepanel/sidepanel.html"),
      });
    }
  } catch {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("sidepanel/sidepanel.html"),
    });
  }
});

refreshStatus();
