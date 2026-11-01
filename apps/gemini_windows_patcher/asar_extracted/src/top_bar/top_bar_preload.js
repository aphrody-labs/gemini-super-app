var d = Object.defineProperty;
var l = Object.getOwnPropertyDescriptor;
var v = Object.getOwnPropertyNames;
var p = Object.prototype.hasOwnProperty;
var E = (e, t) => {
    for (var n in t) d(e, n, { get: t[n], enumerable: !0 });
  },
  L = (e, t, n, o) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let r of v(t))
        !p.call(e, r) &&
          r !== n &&
          d(e, r, {
            get: () => t[r],
            enumerable: !(o = l(t, r)) || o.enumerable,
          });
    return e;
  };
var m = (e) => L(d({}, "__esModule", { value: !0 }), e);
var f = {};
E(f, {
  CHANNEL_MENU_CLOSED: () => c,
  CHANNEL_OPEN_MENU: () => s,
  CHANNEL_SET_LABEL: () => a,
  initTopBarPreload: () => u,
});
module.exports = m(f);
var i = require("electron"),
  s = "topbar:open-menu",
  c = "topbar:menu-closed",
  a = "topbar:set-label";
function u() {
  if (typeof document > "u") return;
  let e = document.getElementById("btn-menu");
  if (e) {
    let t = () => {
      (e.blur(), e.classList.add("no-hover"));
    };
    (e.addEventListener("click", () => {
      let n = e.getBoundingClientRect();
      t();
      let r = document.documentElement?.dir === "rtl" ? n.right : n.left;
      i.ipcRenderer.send(s, { x: Math.round(r), y: Math.round(n.bottom) });
    }),
      e.addEventListener("pointerenter", () => {
        e.classList.remove("no-hover");
      }),
      e.addEventListener("pointerleave", () => {
        e.classList.remove("no-hover");
      }),
      e.addEventListener("pointermove", () => {
        e.classList.remove("no-hover");
      }),
      i.ipcRenderer.on(c, () => {
        t();
      }),
      i.ipcRenderer.on(a, (n, o) => {
        o && ((e.title = o), e.setAttribute("aria-label", o));
      }),
      typeof window < "u" &&
        window.addEventListener("blur", () => {
          t();
        }));
  }
  let liveBtn = document.getElementById("btn-voice-live"),
    liveLabel = document.getElementById("btn-voice-live-label"),
    stcBtn = document.getElementById("btn-voice-stc"),
    hubBtn = document.getElementById("btn-voice-hub"),
    isLive = !1;
  liveBtn &&
    liveBtn.addEventListener("click", async () => {
      isLive = !isLive;
      let res = await i.ipcRenderer.invoke("gemini-voice:action", {
        action: "toggle_live",
        enabled: isLive,
        surface: "gemini_windows_topbar",
      });
      (res &&
        typeof res.is_live_active == "boolean" &&
        (isLive = res.is_live_active),
        liveBtn.classList.toggle("active", isLive),
        liveLabel &&
          (liveLabel.textContent = isLive ? "/voice ON" : "/voice Live"));
    });
  stcBtn &&
    stcBtn.addEventListener("click", () => {
      i.ipcRenderer.invoke("gemini-voice:stc-trigger");
    });
  hubBtn &&
    hubBtn.addEventListener("click", () => {
      i.ipcRenderer.send("gemini-voice:open-hub");
    });
  i.ipcRenderer.on("gemini-voice:hub-event", (_ev, msg) => {
    if (!msg) return;
    if (msg.type === "telemetry" || msg.type === "voice_mode_toggled") {
      isLive = Boolean(msg.is_live_active);
      liveBtn && liveBtn.classList.toggle("active", isLive);
      liveLabel &&
        (liveLabel.textContent = isLive
          ? `/voice (${msg.state || "LIVE"})`
          : "/voice Live");
    }
  });
}
typeof window < "u" &&
  window.addEventListener("DOMContentLoaded", () => {
    u();
  });
0 &&
  (module.exports = {
    CHANNEL_MENU_CLOSED,
    CHANNEL_OPEN_MENU,
    CHANNEL_SET_LABEL,
    initTopBarPreload,
  });
