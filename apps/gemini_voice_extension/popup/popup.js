const statusEl = document.getElementById("hub-status");
const toggleBtn = document.getElementById("toggle-live-btn");
const liveSwitch = document.getElementById("live-switch");
const sidePanelBtn = document.getElementById("open-sidepanel-btn");
const telemetryCard = document.getElementById("telemetry-card");
const openInfoBtn = document.getElementById("open-info-dialog-btn");
const infoDialog = document.getElementById("voice-info-dialog");

// Optional switch polyfill check when 'switch' in HTMLInputElement.prototype is false
if (
  typeof HTMLInputElement !== "undefined" &&
  !("switch" in HTMLInputElement.prototype)
) {
  liveSwitch?.setAttribute("role", "switch");
}

// Probe discrete display transition support (handles Firefox bug 1882408)
let supportsDisplayTransition;
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

async function setCardVisibility(el, visible) {
  if (!el) return;
  if (visible) {
    el.removeAttribute("data-closing");
    el.hidden = false;
    return;
  }
  if (canTransitionDisplay()) {
    el.hidden = true;
  } else {
    el.setAttribute("data-closing", "");
  }
  const animations = el.getAnimations();
  if (animations.length > 0) {
    await Promise.race([
      Promise.allSettled(animations.map((a) => a.finished)),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }
  if (el.hasAttribute("data-closing")) {
    el.removeAttribute("data-closing");
    el.hidden = true;
  }
}

// Light-dismiss dialog fallback for browsers without closedBy support
if (infoDialog && !("closedBy" in HTMLDialogElement.prototype)) {
  infoDialog.addEventListener("click", (event) => {
    if (event.target !== infoDialog) return;
    const rect = infoDialog.getBoundingClientRect();
    const isDialogContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (isDialogContent) return;
    infoDialog.close();
  });
}

openInfoBtn?.addEventListener("click", () => {
  infoDialog?.showModal();
});

async function refreshStatus() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    if (res?.ok && res.data) {
      const active = Boolean(res.data.is_live_active);
      statusEl.textContent = `${res.data.state} • ${res.data.config?.live_model || "gemini-3.8-live"}`;
      toggleBtn.textContent = active
        ? "Désactiver /voice Live"
        : "Activer /voice Live";
      if (liveSwitch) liveSwitch.checked = active;
      await setCardVisibility(telemetryCard, true);
    } else {
      statusEl.textContent = "Bridge hors-ligne (127.0.0.1:8765)";
    }
  } catch {
    statusEl.textContent = "Erreur de connexion";
  }
}

async function setLiveMode(enabled) {
  await chrome.runtime.sendMessage({
    type: "VOICE_ACTION",
    payload: {
      action: "toggle_live",
      enabled,
      surface: "gemini_web",
    },
  });
  await refreshStatus();
}

toggleBtn?.addEventListener("click", async () => {
  const nextState = !(liveSwitch?.checked ?? false);
  await setLiveMode(nextState);
});

liveSwitch?.addEventListener("change", async () => {
  await setLiveMode(liveSwitch.checked);
});

sidePanelBtn?.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

refreshStatus();
