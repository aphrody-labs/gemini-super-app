// Manifest V3 Service Worker — persists all state in chrome.storage (no global state)

const BRIDGE_HTTP = 'http://127.0.0.1:8765';

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    bridgeUrl: BRIDGE_HTTP,
    wsUrl: 'ws://127.0.0.1:8765/ws/voice',
    isLiveActive: false,
    voiceName: 'Aoede',
    liveModel: 'gemini-3.8-live',
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'GET_STATUS') {
        const response = await fetch(`${BRIDGE_HTTP}/api/status`);
        const data = await response.json();
        await chrome.storage.local.set({ isLiveActive: Boolean(data.is_live_active) });
        await chrome.action.setBadgeText({ text: data.is_live_active ? 'LIVE' : '' });
        await chrome.action.setBadgeBackgroundColor({ color: '#4285F4' });
        sendResponse({ ok: true, data });
        return;
      }

      if (message.type === 'VOICE_ACTION') {
        const response = await fetch(`${BRIDGE_HTTP}/api/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...message.payload,
            surface: message.payload?.surface || 'gemini_web',
          }),
        });
        const data = await response.json();
        if (typeof data.is_live_active === 'boolean') {
          await chrome.storage.local.set({ isLiveActive: data.is_live_active });
          await chrome.action.setBadgeText({ text: data.is_live_active ? 'LIVE' : '' });
          await chrome.action.setBadgeBackgroundColor({ color: '#4285F4' });
        }
        sendResponse({ ok: true, data });
        return;
      }

      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
  })();
  return true;
});
