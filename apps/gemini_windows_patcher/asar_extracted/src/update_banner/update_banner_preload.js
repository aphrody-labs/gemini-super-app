var o = Object.defineProperty;
var c = Object.getOwnPropertyDescriptor;
var f = Object.getOwnPropertyNames;
var m = Object.prototype.hasOwnProperty;
var u = (e, t) => {
    for (var r in t) o(e, r, { get: t[r], enumerable: !0 });
  },
  b = (e, t, r, i) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let n of f(t))
        !m.call(e, n) &&
          n !== r &&
          o(e, n, {
            get: () => t[n],
            enumerable: !(i = c(t, n)) || i.enumerable,
          });
    return e;
  };
var p = (e) => b(o({}, "__esModule", { value: !0 }), e);
var L = {};
u(L, { initUpdateBannerPreload: () => l });
module.exports = p(L);
var d = require("electron");
function l() {
  if (typeof document > "u") return;
  let e = document.getElementById("btn-restart");
  e &&
    e.addEventListener("click", () => {
      d.ipcRenderer.send("update-banner:relaunch");
    });
  let t = document.getElementById("btn-dismiss");
  (t &&
    t.addEventListener("click", () => {
      d.ipcRenderer.send("update-banner:dismiss");
    }),
    d.ipcRenderer.on("update-banner:show", (r, i) => {
      let n = document.getElementById("pill-text"),
        a = document.getElementById("btn-restart");
      if (i && typeof i == "object") {
        let s = i;
        (n && s.title && (n.textContent = s.title),
          a && s.restartLabel && (a.textContent = s.restartLabel),
          t && s.dismissLabel && (t.title = s.dismissLabel));
      } else n && (n.textContent = typeof i == "string" && i ? i : "");
    }));
}
typeof window < "u" &&
  window.addEventListener("DOMContentLoaded", () => {
    l();
  });
0 && (module.exports = { initUpdateBannerPreload });
