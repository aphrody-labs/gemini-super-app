const orbEl = document.getElementById('side-orb');
const stateEl = document.getElementById('side-state');
const liveBtn = document.getElementById('side-live-btn');
const logEl = document.getElementById('transcript-log');

let deg = 0;
function tick() {
  deg = (deg + 1.5) % 360;
  if (orbEl) {
    orbEl.style.transform = `rotate(${deg}deg)`;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

const ws = new WebSocket('ws://127.0.0.1:8765/ws/voice');
ws.addEventListener('message', (ev) => {
  try {
    const data = JSON.parse(ev.data);
    if (data.type === 'telemetry') {
      stateEl.textContent = `${data.state} • ${data.config?.voice_name || 'Aoede'}`;
    } else if (data.type === 'transcript' || data.type === 'model_response') {
      const turn = data.turn;
      if (turn) {
        const div = document.createElement('div');
        div.style.marginBottom = '8px';
        div.textContent = `${turn.role === 'user' ? 'Vous' : 'Gemini'}: ${turn.text}`;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
      }
    }
  } catch (err) {
    console.debug(err);
  }
});

liveBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({
    type: 'VOICE_ACTION',
    payload: { action: 'toggle_live', surface: 'gemini_web' },
  });
});
