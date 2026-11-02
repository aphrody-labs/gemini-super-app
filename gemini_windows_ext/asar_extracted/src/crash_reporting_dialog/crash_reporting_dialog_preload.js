var c = Object.defineProperty;
var m = Object.getOwnPropertyDescriptor;
var g = Object.getOwnPropertyNames;
var b = Object.prototype.hasOwnProperty;
var x = (t, o) => {
    for (var s in o) c(t, s, { get: o[s], enumerable: !0 });
  },
  C = (t, o, s, i) => {
    if ((o && typeof o == "object") || typeof o == "function")
      for (let n of g(o))
        !b.call(t, n) &&
          n !== s &&
          c(t, n, {
            get: () => o[n],
            enumerable: !(i = m(o, n)) || i.enumerable,
          });
    return t;
  };
var y = (t) => C(c({}, "__esModule", { value: !0 }), t);
var E = {};
x(E, { crashReportingApi: () => d, initCrashReportingDialogDom: () => f });
module.exports = y(E);
var l = require("electron"),
  d = {
    getContent: async () => l.ipcRenderer.invoke("crash-reporting:get-content"),
    confirm: async (t) => l.ipcRenderer.invoke("crash-reporting:confirm", t),
    openExternal: async (t) =>
      l.ipcRenderer.invoke("crash-reporting:open-external", t),
  };
function f() {
  if (typeof document > "u") return;
  let t = document.getElementById("toast-title"),
    o = document.getElementById("toast-desc"),
    s = document.getElementById("toast-subnote"),
    i = document.getElementById("btn-decline"),
    n = document.getElementById("btn-allow"),
    r = document.getElementById("btn-close");
  async function u() {
    try {
      let e = await d.getContent();
      e &&
        (e.title && t && (t.textContent = e.title),
        e.description && o && (o.textContent = e.description),
        e.subnote && s && (s.textContent = e.subnote),
        e.declineButtonText && i && (i.textContent = e.declineButtonText),
        e.allowButtonText && n && (n.textContent = e.allowButtonText),
        e.closeButtonAriaLabel &&
          r &&
          r.setAttribute("aria-label", e.closeButtonAriaLabel));
    } catch (e) {
      console.warn("Failed to load localized content:", e);
    }
  }
  async function a(e) {
    (n && (n.disabled = !0), i && (i.disabled = !0), r && (r.disabled = !0));
    try {
      await d.confirm(e);
    } catch (p) {
      (console.error("Failed to confirm crash reporting preference:", p),
        n && (n.disabled = !1),
        i && (i.disabled = !1),
        r && (r.disabled = !1));
    }
  }
  (n &&
    n.addEventListener("click", () => {
      a(!0);
    }),
    i &&
      i.addEventListener("click", () => {
        a(!1);
      }),
    r &&
      r.addEventListener("click", () => {
        a(!1);
      }),
    typeof window < "u" &&
      window.addEventListener("keydown", (e) => {
        e.key === "Escape" && a(!1);
      }),
    u());
}
if (typeof l.contextBridge < "u" && l.contextBridge.exposeInMainWorld)
  try {
    l.contextBridge.exposeInMainWorld("crashReportingApi", d);
  } catch {}
typeof window < "u" &&
  window.addEventListener("DOMContentLoaded", () => {
    f();
  });
0 && (module.exports = { crashReportingApi, initCrashReportingDialogDom });
