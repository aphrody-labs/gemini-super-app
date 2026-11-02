var e = require("electron");
window.addEventListener("DOMContentLoaded", () => {
  let t = document.getElementById("input"),
    d = document.getElementById("count"),
    s = document.getElementById("prev"),
    a = document.getElementById("next"),
    r = document.getElementById("close");
  if (!t || !d || !s || !a || !r) return;
  let i = !1,
    c;
  (t.addEventListener("input", () => {
    clearTimeout(c);
    let n = t.value;
    if (!n) {
      ((d.textContent = ""),
        (s.disabled = !0),
        (a.disabled = !0),
        (i = !1),
        e.ipcRenderer.send("findbar:clear"));
      return;
    }
    c = setTimeout(() => {
      e.ipcRenderer.send("findbar:search", n);
    }, 100);
  }),
    t.addEventListener("keydown", (n) => {
      n.key === "Enter"
        ? (n.preventDefault(),
          n.shiftKey
            ? e.ipcRenderer.send("findbar:prev")
            : e.ipcRenderer.send("findbar:next"))
        : n.key === "Escape" &&
          (n.preventDefault(), e.ipcRenderer.send("findbar:close"));
    }),
    s.addEventListener("click", () => e.ipcRenderer.send("findbar:prev")),
    a.addEventListener("click", () => e.ipcRenderer.send("findbar:next")),
    r.addEventListener("click", () => e.ipcRenderer.send("findbar:close")),
    e.ipcRenderer.on("findbar:result", (n, l) => {
      ((i = l.matches > 0),
        (s.disabled = !i),
        (a.disabled = !i),
        t.value
          ? (d.textContent = `${l.activeMatchOrdinal}/${l.matches}`)
          : (d.textContent = ""));
    }),
    e.ipcRenderer.on("findbar:focus", () => {
      (t.focus(),
        t.select(),
        t.value && e.ipcRenderer.send("findbar:search", t.value));
    }));
});
