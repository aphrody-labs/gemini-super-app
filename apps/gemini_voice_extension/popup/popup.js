const statusEl = document.getElementById('hub-status');
const toggleBtn = document.getElementById('toggle-live-btn');
const sidePanelBtn = document.getElementById('open-sidepanel-btn');

async function refreshStatus() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (res?.ok && res.data) {
      const active = Boolean(res.data.is_live_active);
      statusEl.textContent = `${res.data.state} • ${res.data.config?.live_model || 'gemini-3.8-live'}`;
      toggleBtn.textContent = active ? 'Désactiver /voice Live' : 'Activer /voice Live';
    } else {
      statusEl.textContent = 'Bridge hors-ligne (127.0.0.1:8765)';
    }
  } catch (err) {
    statusEl.textContent = 'Erreur de connexion';
  }
}

toggleBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({
    type: 'VOICE_ACTION',
    payload: { action: 'toggle_live', surface: 'gemini_web' },
  });
  await refreshStatus();
});

sidePanelBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

refreshStatus();
