// Manifest V3 Service Worker — zero global mutable state; persists all state in chrome.storage
// Uses chrome.alarms for periodic health sync and state-machine locking in chrome.storage.session.

const BRIDGE_HTTP = "http://127.0.0.1:8765";
const ALARM_HEALTH_SYNC = "gemini-live-health-sync";
const ALARM_BADGE_RESET = "gemini-live-badge-reset";

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    bridgeUrl: BRIDGE_HTTP,
    wsUrl: "ws://127.0.0.1:8765/ws/voice",
    isLiveActive: false,
    autoSubmitPrompt: false,
    voiceName: "Aoede",
    liveModel: "gemini-3.8-live",
  });
  await chrome.storage.session.set({
    captureLockState: "idle",
  });

  // Register context menu items with user feedback using async/await
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: "speak-selection-gemini-live",
    title: "Envoyer la sélection à Gemini Live /voice",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "open-gemini-voice-sidepanel",
    title: "Ouvrir le Side Panel Gemini Live Voice",
    contexts: ["page", "action"],
  });

  await chrome.alarms.create(ALARM_HEALTH_SYNC, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_BADGE_RESET) {
    const { isLiveActive = false } =
      await chrome.storage.local.get("isLiveActive");
    await chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
    await chrome.action.setBadgeText({ text: isLiveActive ? "LIVE" : "" });
    return;
  }
  if (alarm.name !== ALARM_HEALTH_SYNC) return;
  try {
    const { bridgeUrl = BRIDGE_HTTP } =
      await chrome.storage.local.get("bridgeUrl");
    const resp = await fetch(`${bridgeUrl}/api/status`);
    const data = await resp.json();
    const active = Boolean(data.is_live_active);
    await chrome.storage.local.set({ isLiveActive: active });
    await chrome.action.setBadgeText({ text: active ? "LIVE" : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
  } catch {
    await chrome.action.setBadgeText({ text: "" });
  }

  // Auto-sync live Google/Gemini session cookies to the Super App durable vault
  try {
    if (chrome.cookies && chrome.cookies.getAll) {
      const allCookies = await chrome.cookies.getAll({ domain: "google.com" });
      const cookieMap = {};
      const now = Date.now();
      for (const c of allCookies) {
        if (
          c.name.startsWith("__Secure-") ||
          c.name === "SAPISID" ||
          c.name === "APISID" ||
          c.name === "HSID" ||
          c.name === "SSID" ||
          c.name === "SID" ||
          c.name === "SIDCC" ||
          c.name === "NID" ||
          c.name === "COMPASS"
        ) {
          cookieMap[c.name] = {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || "/",
            expiresUtc: Math.round((c.expirationDate || 0) * 1000),
            updatedAtMs: now,
          };
        }
      }
      if (Object.keys(cookieMap).length > 0) {
        await fetch("http://127.0.0.1:8787/api/gemini/cookies/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookies: cookieMap }),
        });
      }
    }
  } catch {}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-gemini-voice-sidepanel" && tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    await flashBadgeConfirmation("OPEN");
    return;
  }

  if (info.menuItemId === "speak-selection-gemini-live" && info.selectionText) {
    const { bridgeUrl = BRIDGE_HTTP } =
      await chrome.storage.local.get("bridgeUrl");
    try {
      await fetch(`${bridgeUrl}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "voice_to_voice",
          text: info.selectionText.trim(),
          auto_reply: true,
          surface: "gemini_web",
        }),
      });
      await flashBadgeConfirmation("SENT");
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: "SHOW_TOAST",
            text: "Sélection envoyée à Gemini Live Voice",
            message: "Sélection envoyée à Gemini Live Voice",
          });
        } catch {}
      }
    } catch {
      await flashBadgeConfirmation("ERR", "#D96570");
    }
  }
});

async function flashBadgeConfirmation(text, color = "#34A853") {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  await chrome.alarms.create(ALARM_BADGE_RESET, {
    when: Date.now() + 1600,
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      const { bridgeUrl = BRIDGE_HTTP } =
        await chrome.storage.local.get("bridgeUrl");

      if (message.type === "GET_STATUS") {
        const response = await fetch(`${bridgeUrl}/api/status`);
        const data = await response.json();
        const active = Boolean(data.is_live_active);
        await chrome.storage.local.set({ isLiveActive: active });
        await chrome.action.setBadgeText({ text: active ? "LIVE" : "" });
        await chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
        sendResponse({ ok: true, data });
        return;
      }

      if (message.type === "VOICE_ACTION") {
        const action = message.payload?.action || "";
        // Guard concurrent PTT capture transitions using chrome.storage.session state lock
        if (action === "ptt_start" || action === "ptt_stop") {
          const { captureLockState = "idle" } =
            await chrome.storage.session.get("captureLockState");
          if (
            captureLockState === "starting" ||
            captureLockState === "stopping"
          ) {
            sendResponse({ ok: false, error: "Transition lock active" });
            return;
          }
          await chrome.storage.session.set({
            captureLockState: action === "ptt_start" ? "starting" : "stopping",
          });
        }

        try {
          const response = await fetch(`${bridgeUrl}/api/voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...message.payload,
              surface: message.payload?.surface || "gemini_web",
            }),
          });
          const data = await response.json();

          if (action === "ptt_start") {
            await chrome.storage.session.set({ captureLockState: "recording" });
            await chrome.action.setBadgeText({ text: "REC" });
            await chrome.action.setBadgeBackgroundColor({ color: "#D96570" });
          } else if (action === "ptt_stop") {
            await chrome.storage.session.set({ captureLockState: "idle" });
            const { isLiveActive = false } =
              await chrome.storage.local.get("isLiveActive");
            await chrome.action.setBadgeText({
              text: isLiveActive ? "LIVE" : "",
            });
            await chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
          }

          if (typeof data.is_live_active === "boolean") {
            await chrome.storage.local.set({
              isLiveActive: data.is_live_active,
            });
            await chrome.action.setBadgeText({
              text: data.is_live_active ? "LIVE" : "",
            });
            await chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
          }
          sendResponse({ ok: true, data });
        } catch (innerErr) {
          await chrome.storage.session.set({ captureLockState: "idle" });
          throw innerErr;
        }
        return;
      }

      if (message.type === "PC_FS_ACTION") {
        const response = await fetch("http://127.0.0.1:8787/api/pc/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload || {}),
        });
        const data = await response.json();
        sendResponse({ ok: Boolean(data.ok), data });
        return;
      }

      if (message.type === "PC_EXEC_ACTION") {
        const response = await fetch("http://127.0.0.1:8787/api/pc/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload || {}),
        });
        const data = await response.json();
        sendResponse({ ok: Boolean(data.ok), data });
        return;
      }

      if (message.type === "AGY_SESSION_ACTION") {
        const response = await fetch(
          "http://127.0.0.1:8787/api/antigravity/session",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message.payload || {}),
          },
        );
        const data = await response.json();
        sendResponse({ ok: Boolean(data.ok), data });
        return;
      }

      if (message.type === "AGY_TOOLS_ACTION") {
        const response = await fetch(
          "http://127.0.0.1:8787/api/antigravity/tools",
          {
            method: message.payload ? "POST" : "GET",
            headers: { "Content-Type": "application/json" },
            ...(message.payload
              ? { body: JSON.stringify(message.payload) }
              : {}),
          },
        );
        const data = await response.json();
        sendResponse({ ok: Boolean(data.ok), data });
        return;
      }

      if (message.type === "PROMPT_API_QUERY") {
        if (typeof globalThis.LanguageModel !== "undefined") {
          const availability = await globalThis.LanguageModel.availability();
          const params = await globalThis.LanguageModel.params();
          if (message.prompt && availability === "available") {
            const session = await globalThis.LanguageModel.create();
            const reply = await session.prompt(String(message.prompt));
            session.destroy?.();
            sendResponse({ ok: true, availability, params, reply });
            return;
          }
          sendResponse({ ok: true, availability, params });
          return;
        }
        sendResponse({ ok: false, availability: "unavailable" });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
  })();
  return true;
});
