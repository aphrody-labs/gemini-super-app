const orbEl = document.getElementById("side-orb");
const stateEl = document.getElementById("side-state");
const liveBtn = document.getElementById("side-live-btn");
const liveSwitch = document.getElementById("side-live-switch");
const logEl = document.getElementById("transcript-log");

if (
  typeof HTMLInputElement !== "undefined" &&
  !("switch" in HTMLInputElement.prototype)
) {
  liveSwitch?.setAttribute("role", "switch");
}

let deg = 0;
function tick() {
  deg = (deg + 1.5) % 360;
  if (orbEl) {
    orbEl.style.transform = `rotate(${deg}deg)`;
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
        if (data.type === "telemetry") {
          stateEl.textContent = `${data.state} • ${data.config?.voice_name || "Aoede"}`;
          if (liveSwitch && typeof data.is_live_active === "boolean") {
            liveSwitch.checked = data.is_live_active;
          }
        } else if (
          data.type === "transcript" ||
          data.type === "model_response"
        ) {
          const turn = data.turn;
          if (turn) {
            requestAnimationFrame(() => {
              const div = document.createElement("div");
              div.style.marginBottom = "8px";
              div.textContent = `${turn.role === "user" ? "Vous" : "Gemini"}: ${turn.text}`;
              logEl.appendChild(div);
              logEl.scrollTop = logEl.scrollHeight;
            });
          }
        }
      } catch (err) {
        console.debug(err);
      }
    });
    ws.addEventListener("close", () => setTimeout(connectSidePanelWs, 3000));
  } catch {
    setTimeout(connectSidePanelWs, 3000);
  }
}
connectSidePanelWs();

liveBtn?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({
    type: "VOICE_ACTION",
    payload: { action: "toggle_live", surface: "gemini_web" },
  });
});

liveSwitch?.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({
    type: "VOICE_ACTION",
    payload: {
      action: "toggle_live",
      enabled: liveSwitch.checked,
      surface: "gemini_web",
    },
  });
});
