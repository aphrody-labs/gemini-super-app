var u = Object.defineProperty;
var v = Object.getOwnPropertyDescriptor;
var y = Object.getOwnPropertyNames;
var I = Object.prototype.hasOwnProperty;
var p = (e, i) => {
    for (var n in i) u(e, n, { get: i[n], enumerable: !0 });
  },
  L = (e, i, n, r) => {
    if ((i && typeof i == "object") || typeof i == "function")
      for (let o of y(i))
        !I.call(e, o) &&
          o !== n &&
          u(e, o, {
            get: () => i[o],
            enumerable: !(r = v(i, o)) || r.enumerable,
          });
    return e;
  };
var P = (e) => L(u({}, "__esModule", { value: !0 }), e);
var B = {};
p(B, { initSignInDialogDom: () => g, signInAPI: () => a });
module.exports = P(B);
var s = require("electron"),
  a = {
    getContent: () => s.ipcRenderer.invoke("sign-in:get-content"),
    signIn: () => s.ipcRenderer.invoke("sign-in:sign-in"),
    createAccount: () => s.ipcRenderer.invoke("sign-in:create-account"),
    logOut: () => s.ipcRenderer.invoke("sign-in:log-out"),
    notifyReady: () => {
      s.ipcRenderer.send("sign-in:ready");
    },
  };
function b(e) {
  return typeof e != "string" || !e
    ? !1
    : e.startsWith("data:image/") || e.startsWith("app://bundle/");
}
function g() {
  if (typeof document > "u") return;
  let e = document.getElementById("dialog-title"),
    i = document.getElementById("user-profile-card"),
    n = document.getElementById("user-avatar"),
    r = document.getElementById("user-name"),
    o = document.getElementById("user-email"),
    d = document.getElementById("btn-sign-in"),
    c = document.getElementById("btn-create-account"),
    l = document.getElementById("btn-log-out");
  function m(t) {
    t && (t.name || t.email || t.profilePictureDataUri)
      ? (i?.classList.add("visible"),
        r && (r.textContent = t.name || ""),
        o && (o.textContent = t.email || ""),
        n &&
          (b(t.profilePictureDataUri)
            ? ((n.src = t.profilePictureDataUri), n.classList.add("visible"))
            : (n.removeAttribute("src"), n.classList.remove("visible"))),
        c?.classList.add("hidden"),
        l?.classList.remove("hidden"),
        l?.focus())
      : (i?.classList.remove("visible"),
        r && (r.textContent = ""),
        o && (o.textContent = ""),
        n && (n.removeAttribute("src"), n.classList.remove("visible")),
        c?.classList.remove("hidden"),
        l?.classList.add("hidden"),
        d?.focus());
  }
  (n?.addEventListener("error", () => {
    n.classList.remove("visible");
  }),
    d?.addEventListener("click", () => {
      a.signIn();
    }),
    c?.addEventListener("click", () => {
      a.createAccount();
    }),
    l?.addEventListener("click", () => {
      a.logOut();
    }));
  async function f() {
    try {
      let t = await a.getContent();
      t &&
        (t.title &&
          (e && (e.textContent = t.title), (document.title = t.title)),
        t.signInButton && d && (d.textContent = t.signInButton),
        t.createAccountButton && c && (c.textContent = t.createAccountButton),
        t.logOutButton && l && (l.textContent = t.logOutButton),
        m(t.user));
    } catch {}
    typeof requestAnimationFrame == "function"
      ? requestAnimationFrame(() => {
          a.notifyReady();
        })
      : a.notifyReady();
  }
  f();
}
if (typeof s.contextBridge < "u" && s.contextBridge.exposeInMainWorld)
  try {
    s.contextBridge.exposeInMainWorld("signInAPI", a);
  } catch {}
typeof window < "u" &&
  window.addEventListener("DOMContentLoaded", () => {
    g();
  });
0 && (module.exports = { initSignInDialogDom, signInAPI });
