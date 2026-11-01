(function () {
  "use strict";
  var v,
    aa =
      typeof Object.create == "function"
        ? Object.create
        : function (a) {
            function b() {}
            b.prototype = a;
            return new b();
          },
    ba =
      typeof Object.defineProperties == "function"
        ? Object.defineProperty
        : function (a, b, c) {
            if (a == Array.prototype || a == Object.prototype) return a;
            a[b] = c.value;
            return a;
          };
  function ca(a) {
    a = [
      "object" == typeof globalThis && globalThis,
      a,
      "object" == typeof window && window,
      "object" == typeof self && self,
      "object" == typeof global && global,
    ];
    for (var b = 0; b < a.length; ++b) {
      var c = a[b];
      if (c && c.Math == Math) return c;
    }
    throw Error("Cannot find global object");
  }
  var da = ca(this);
  function w(a, b) {
    if (b)
      a: {
        var c = da;
        a = a.split(".");
        for (var d = 0; d < a.length - 1; d++) {
          var e = a[d];
          if (!(e in c)) break a;
          c = c[e];
        }
        a = a[a.length - 1];
        d = c[a];
        b = b(d);
        b != d &&
          b != null &&
          ba(c, a, { configurable: !0, writable: !0, value: b });
      }
  }
  var ea;
  if (typeof Object.setPrototypeOf == "function") ea = Object.setPrototypeOf;
  else {
    var ha;
    a: {
      var ia = { a: !0 },
        ja = {};
      try {
        ja.__proto__ = ia;
        ha = ja.a;
        break a;
      } catch (a) {}
      ha = !1;
    }
    ea = ha
      ? function (a, b) {
          a.__proto__ = b;
          if (a.__proto__ !== b) throw new TypeError(a + " is not extensible");
          return a;
        }
      : null;
  }
  var ka = ea;
  function y(a, b) {
    a.prototype = aa(b.prototype);
    a.prototype.constructor = a;
    if (ka) ka(a, b);
    else
      for (var c in b)
        if (c != "prototype")
          if (Object.defineProperties) {
            var d = Object.getOwnPropertyDescriptor(b, c);
            d && Object.defineProperty(a, c, d);
          } else a[c] = b[c];
    a.ia = b.prototype;
  }
  function la(a) {
    var b = 0;
    return function () {
      return b < a.length ? { done: !1, value: a[b++] } : { done: !0 };
    };
  }
  function A(a) {
    var b =
      typeof Symbol != "undefined" && Symbol.iterator && a[Symbol.iterator];
    if (b) return b.call(a);
    if (typeof a.length == "number") return { next: la(a) };
    throw Error(String(a) + " is not an iterable or ArrayLike");
  }
  function C(a) {
    if (!(a instanceof Array)) {
      a = A(a);
      for (var b, c = []; !(b = a.next()).done;) c.push(b.value);
      a = c;
    }
    return a;
  }
  function ma(a) {
    return na(a, a);
  }
  function na(a, b) {
    a.raw = b;
    Object.freeze && (Object.freeze(a), Object.freeze(b));
    return a;
  }
  function oa(a, b) {
    var c;
    b && !b.done && (c = a["return"]) && c.call(a);
  }
  function D(a, b) {
    return Object.prototype.hasOwnProperty.call(a, b);
  }
  var pa =
    typeof Object.assign == "function"
      ? Object.assign
      : function (a, b) {
          if (a == null) throw new TypeError("No nullish arg");
          a = Object(a);
          for (var c = 1; c < arguments.length; c++) {
            var d = arguments[c];
            if (d) for (var e in d) D(d, e) && (a[e] = d[e]);
          }
          return a;
        };
  w("Object.assign", function (a) {
    return a || pa;
  });
  function qa(a) {
    if (!(a instanceof Object))
      throw new TypeError("Iterator result " + a + " is not an object");
  }
  function E() {
    this.H = !1;
    this.l = null;
    this.i = void 0;
    this.h = 1;
    this.o = this.u = 0;
    this.K = this.j = null;
  }
  function ra(a) {
    if (a.H) throw new TypeError("Generator is already running");
    a.H = !0;
  }
  E.prototype.J = function (a) {
    this.i = a;
  };
  function sa(a, b) {
    a.j = { exception: b, xa: !0 };
    a.h = a.u || a.o;
  }
  E.prototype.getNextAddressJsc = function () {
    return this.h;
  };
  E.prototype.getYieldResultJsc = function () {
    return this.i;
  };
  E.prototype.return = function (a) {
    this.j = { return: a };
    this.h = this.o;
  };
  E.prototype["return"] = E.prototype.return;
  E.prototype.na = function (a) {
    this.j = { A: a };
    this.o < a ? ((this.h = a), (this.j = null)) : (this.h = this.o);
  };
  E.prototype.jumpThroughFinallyBlocks = E.prototype.na;
  E.prototype.yield = function (a, b) {
    this.h = b;
    return { value: a };
  };
  E.prototype.yield = E.prototype.yield;
  E.prototype.Aa = function (a, b) {
    a = A(a);
    var c = a.next();
    qa(c);
    if (c.done) ((this.i = c.value), (this.h = b));
    else return ((this.l = a), this.yield(c.value, b));
  };
  E.prototype.yieldAll = E.prototype.Aa;
  E.prototype.A = function (a) {
    this.h = a;
  };
  E.prototype.jumpTo = E.prototype.A;
  E.prototype.P = function () {
    this.h = 0;
  };
  E.prototype.jumpToEnd = E.prototype.P;
  E.prototype.v = function (a, b) {
    this.u = a;
    b != void 0 && (this.o = b);
  };
  E.prototype.setCatchFinallyBlocks = E.prototype.v;
  E.prototype.W = function (a) {
    this.u = 0;
    this.o = a || 0;
  };
  E.prototype.setFinallyBlock = E.prototype.W;
  E.prototype.R = function (a, b) {
    this.h = a;
    this.u = b || 0;
  };
  E.prototype.leaveTryBlock = E.prototype.R;
  E.prototype.F = function (a) {
    this.u = a || 0;
    a = this.j.exception;
    this.j = null;
    return a;
  };
  E.prototype.enterCatchBlock = E.prototype.F;
  E.prototype.B = function (a, b, c) {
    c ? (this.K[c] = this.j) : (this.K = [this.j]);
    this.u = a || 0;
    this.o = b || 0;
    this.j = null;
  };
  E.prototype.enterFinallyBlock = E.prototype.B;
  E.prototype.G = function (a, b) {
    b = this.K.splice(b || 0)[0];
    (b = this.j = this.j || b)
      ? b.xa
        ? (this.h = this.u || this.o)
        : b.A != void 0 && this.o < b.A
          ? ((this.h = b.A), (this.j = null))
          : (this.h = this.o)
      : (this.h = a);
  };
  E.prototype.leaveFinallyBlock = E.prototype.G;
  E.prototype.ja = function (a) {
    return new ua(a);
  };
  E.prototype.forIn = E.prototype.ja;
  function ua(a) {
    this.j = a;
    this.h = [];
    for (var b in a) this.h.push(b);
    this.h.reverse();
  }
  ua.prototype.i = function () {
    for (; this.h.length > 0;) {
      var a = this.h.pop();
      if (a in this.j) return a;
    }
    return null;
  };
  ua.prototype.getNext = ua.prototype.i;
  function va(a) {
    this.h = new E();
    this.i = a;
  }
  function wa(a, b) {
    ra(a.h);
    var c = a.h.l;
    if (c)
      return xa(
        a,
        "return" in c
          ? c["return"]
          : function (d) {
              return { value: d, done: !0 };
            },
        b,
        a.h.return,
      );
    a.h.return(b);
    return ya(a);
  }
  function xa(a, b, c, d) {
    try {
      var e = b.call(a.h.l, c);
      qa(e);
      if (!e.done) return ((a.h.H = !1), e);
      var f = e.value;
    } catch (g) {
      return ((a.h.l = null), sa(a.h, g), ya(a));
    }
    a.h.l = null;
    d.call(a.h, f);
    return ya(a);
  }
  function ya(a) {
    for (; a.h.h;)
      try {
        var b = a.i(a.h);
        if (b) return ((a.h.H = !1), { value: b.value, done: !1 });
      } catch (c) {
        ((a.h.i = void 0), sa(a.h, c));
      }
    a.h.H = !1;
    if (a.h.j) {
      b = a.h.j;
      a.h.j = null;
      if (b.xa) throw b.exception;
      return { value: b.return, done: !0 };
    }
    return { value: void 0, done: !0 };
  }
  function za(a) {
    this.next = function (b) {
      ra(a.h);
      a.h.l ? (b = xa(a, a.h.l.next, b, a.h.J)) : (a.h.J(b), (b = ya(a)));
      return b;
    };
    this.throw = function (b) {
      ra(a.h);
      if (a.h.l) {
        var c = a.h.l["throw"];
        if (c) var d = xa(a, c, b, a.h.J);
        else {
          b = a.h.l;
          a.h.l = null;
          try {
            (b["return"] && ((d = b["return"]()), qa(d)),
              sa(
                a.h,
                new TypeError(
                  "The iterator does not provide a 'throw' method.",
                ),
              ));
          } catch (e) {
            sa(a.h, e);
          }
          d = ya(a);
        }
      } else (sa(a.h, b), (d = ya(a)));
      return d;
    };
    this.return = function (b) {
      return wa(a, b);
    };
    this[Symbol.iterator] = function () {
      return this;
    };
  }
  function Aa(a) {
    function b(d) {
      return a.next(d);
    }
    function c(d) {
      return a.throw(d);
    }
    return new Promise(function (d, e) {
      function f(g) {
        g.done ? d(g.value) : Promise.resolve(g.value).then(b, c).then(f, e);
      }
      f(a.next());
    });
  }
  function G(a) {
    return Aa(new za(new va(a)));
  }
  function Ba() {
    for (var a = Number(this), b = [], c = a; c < arguments.length; c++)
      b[c - a] = arguments[c];
    return b;
  }
  w("globalThis", function (a) {
    return a || da;
  });
  w("Symbol", function (a) {
    function b(f) {
      if (this instanceof b) throw new TypeError("Symbol is not a constructor");
      return new c(d + (f || "") + "_" + e++, f);
    }
    function c(f, g) {
      this.h = f;
      ba(this, "description", { configurable: !0, writable: !0, value: g });
    }
    if (a) return a;
    c.prototype.toString = function () {
      return this.h;
    };
    var d = "jscomp_symbol_" + ((Math.random() * 1e9) >>> 0) + "_",
      e = 0;
    return b;
  });
  w("Symbol.iterator", function (a) {
    if (a) return a;
    a = Symbol("Symbol.iterator");
    ba(Array.prototype, a, {
      configurable: !0,
      writable: !0,
      value: function () {
        return Ca(la(this));
      },
    });
    return a;
  });
  function Ca(a) {
    var b =
        (typeof Iterator != "undefined" &&
        Iterator.prototype &&
        !Iterator.prototype.next
          ? Iterator.prototype
          : null) || Object.prototype,
      c = aa(b);
    c.next = a;
    b[Symbol.iterator] ||
      (c[Symbol.iterator] = function () {
        return this;
      });
    return c;
  }
  w("Promise", function (a) {
    function b(g) {
      this.h = 0;
      this.j = void 0;
      this.i = [];
      this.F = !1;
      var h = this.l();
      try {
        g(h.resolve, h.reject);
      } catch (k) {
        h.reject(k);
      }
    }
    function c() {
      this.h = null;
    }
    function d(g) {
      return g instanceof b
        ? g
        : new b(function (h) {
            h(g);
          });
    }
    if (a) return a;
    c.prototype.i = function (g) {
      if (this.h == null) {
        this.h = [];
        var h = this;
        this.j(function () {
          h.o();
        });
      }
      this.h.push(g);
    };
    var e = da.setTimeout;
    c.prototype.j = function (g) {
      e(g, 0);
    };
    c.prototype.o = function () {
      for (; this.h && this.h.length;) {
        var g = this.h;
        this.h = [];
        for (var h = 0; h < g.length; ++h) {
          var k = g[h];
          g[h] = null;
          try {
            k();
          } catch (l) {
            this.l(l);
          }
        }
      }
      this.h = null;
    };
    c.prototype.l = function (g) {
      this.j(function () {
        throw g;
      });
    };
    b.prototype.l = function () {
      function g(l) {
        return function (p) {
          k || ((k = !0), l.call(h, p));
        };
      }
      var h = this,
        k = !1;
      return { resolve: g(this.J), reject: g(this.o) };
    };
    b.prototype.J = function (g) {
      if (g === this)
        this.o(new TypeError("A Promise cannot resolve to itself"));
      else if (g instanceof b) this.P(g);
      else {
        a: switch (typeof g) {
          case "object":
            var h = g != null;
            break a;
          case "function":
            h = !0;
            break a;
          default:
            h = !1;
        }
        h ? this.H(g) : this.u(g);
      }
    };
    b.prototype.H = function (g) {
      var h = void 0;
      try {
        h = g.then;
      } catch (k) {
        this.o(k);
        return;
      }
      typeof h == "function" ? this.R(h, g) : this.u(g);
    };
    b.prototype.o = function (g) {
      this.v(2, g);
    };
    b.prototype.u = function (g) {
      this.v(1, g);
    };
    b.prototype.v = function (g, h) {
      if (this.h != 0)
        throw Error(
          "Cannot settle(" +
            g +
            ", " +
            h +
            "): Promise already settled in state" +
            this.h,
        );
      this.h = g;
      this.j = h;
      this.h === 2 && this.K();
      this.B();
    };
    b.prototype.K = function () {
      var g = this;
      e(function () {
        if (g.G()) {
          var h = da.console;
          typeof h !== "undefined" && h.error(g.j);
        }
      }, 1);
    };
    b.prototype.G = function () {
      if (this.F) return !1;
      var g = da.CustomEvent,
        h = da.Event,
        k = da.dispatchEvent;
      if (typeof k === "undefined") return !0;
      typeof g === "function"
        ? (g = new g("unhandledrejection", { cancelable: !0 }))
        : typeof h === "function"
          ? (g = new h("unhandledrejection", { cancelable: !0 }))
          : ((g = da.document.createEvent("CustomEvent")),
            g.initCustomEvent("unhandledrejection", !1, !0, g));
      g.promise = this;
      g.reason = this.j;
      return k(g);
    };
    b.prototype.B = function () {
      if (this.i != null) {
        for (var g = 0; g < this.i.length; ++g) f.i(this.i[g]);
        this.i = null;
      }
    };
    var f = new c();
    b.prototype.P = function (g) {
      var h = this.l();
      g.la(h.resolve, h.reject);
    };
    b.prototype.R = function (g, h) {
      var k = this.l();
      try {
        g.call(h, k.resolve, k.reject);
      } catch (l) {
        k.reject(l);
      }
    };
    b.prototype.then = function (g, h) {
      function k(m, n) {
        return typeof m == "function"
          ? function (q) {
              try {
                l(m(q));
              } catch (t) {
                p(t);
              }
            }
          : n;
      }
      var l,
        p,
        r = new b(function (m, n) {
          l = m;
          p = n;
        });
      this.la(k(g, l), k(h, p));
      return r;
    };
    b.prototype.catch = function (g) {
      return this.then(void 0, g);
    };
    b.prototype.la = function (g, h) {
      function k() {
        switch (l.h) {
          case 1:
            g(l.j);
            break;
          case 2:
            h(l.j);
            break;
          default:
            throw Error("Unexpected state: " + l.h);
        }
      }
      var l = this;
      this.i == null ? f.i(k) : this.i.push(k);
      this.F = !0;
    };
    b.resolve = d;
    b.reject = function (g) {
      return new b(function (h, k) {
        k(g);
      });
    };
    b.race = function (g) {
      return new b(function (h, k) {
        for (var l = A(g), p = l.next(); !p.done; p = l.next())
          d(p.value).la(h, k);
      });
    };
    b.all = function (g) {
      var h = A(g),
        k = h.next();
      return k.done
        ? d([])
        : new b(function (l, p) {
            function r(q) {
              return function (t) {
                m[q] = t;
                n--;
                n == 0 && l(m);
              };
            }
            var m = [],
              n = 0;
            do
              (m.push(void 0),
                n++,
                d(k.value).la(r(m.length - 1), p),
                (k = h.next()));
            while (!k.done);
          });
    };
    return b;
  });
  w("Symbol.dispose", function (a) {
    return a ? a : Symbol("Symbol.dispose");
  });
  w("WeakMap", function (a) {
    function b(k) {
      this.h = (h += Math.random() + 1).toString();
      if (k) {
        k = A(k);
        for (var l; !(l = k.next()).done;)
          ((l = l.value), this.set(l[0], l[1]));
      }
    }
    function c() {}
    function d(k) {
      var l = typeof k;
      return (l === "object" && k !== null) || l === "function";
    }
    function e(k) {
      if (!D(k, g)) {
        var l = new c();
        ba(k, g, { value: l });
      }
    }
    function f(k) {
      var l = Object[k];
      l &&
        (Object[k] = function (p) {
          if (p instanceof c) return p;
          Object.isExtensible(p) && e(p);
          return l(p);
        });
    }
    if (
      (function () {
        if (!a || !Object.seal) return !1;
        try {
          var k = Object.seal({}),
            l = Object.seal({}),
            p = new a([
              [k, 2],
              [l, 3],
            ]);
          if (p.get(k) != 2 || p.get(l) != 3) return !1;
          p.delete(k);
          p.set(l, 4);
          return !p.has(k) && p.get(l) == 4;
        } catch (r) {
          return !1;
        }
      })()
    )
      return a;
    var g = "$jscomp_hidden_" + Math.random();
    f("freeze");
    f("preventExtensions");
    f("seal");
    var h = 0;
    b.prototype.set = function (k, l) {
      if (!d(k)) throw Error("Invalid WeakMap key");
      e(k);
      if (!D(k, g)) throw Error("WeakMap key fail: " + k);
      k[g][this.h] = l;
      return this;
    };
    b.prototype.get = function (k) {
      return d(k) && D(k, g) ? k[g][this.h] : void 0;
    };
    b.prototype.has = function (k) {
      return d(k) && D(k, g) && D(k[g], this.h);
    };
    b.prototype.delete = function (k) {
      return d(k) && D(k, g) && D(k[g], this.h) ? delete k[g][this.h] : !1;
    };
    return b;
  });
  w("Map", function (a) {
    function b() {
      var h = {};
      return (h.M = h.next = h.head = h);
    }
    function c(h, k) {
      var l = h[1];
      return Ca(function () {
        if (l) {
          for (; l.head != h[1];) l = l.M;
          for (; l.next != l.head;)
            return ((l = l.next), { done: !1, value: k(l) });
          l = null;
        }
        return { done: !0, value: void 0 };
      });
    }
    function d(h, k) {
      var l = k && typeof k;
      l == "object" || l == "function"
        ? f.has(k)
          ? (l = f.get(k))
          : ((l = "" + ++g), f.set(k, l))
        : (l = "p_" + k);
      var p = h[0][l];
      if (p && D(h[0], l))
        for (h = 0; h < p.length; h++) {
          var r = p[h];
          if ((k !== k && r.key !== r.key) || k === r.key)
            return { id: l, list: p, index: h, entry: r };
        }
      return { id: l, list: p, index: -1, entry: void 0 };
    }
    function e(h) {
      this[0] = {};
      this[1] = b();
      this.size = 0;
      if (h) {
        h = A(h);
        for (var k; !(k = h.next()).done;)
          ((k = k.value), this.set(k[0], k[1]));
      }
    }
    if (
      (function () {
        if (
          !a ||
          typeof a != "function" ||
          !a.prototype.entries ||
          typeof Object.seal != "function"
        )
          return !1;
        try {
          var h = Object.seal({ x: 4 }),
            k = new a(A([[h, "s"]]));
          if (
            k.get(h) != "s" ||
            k.size != 1 ||
            k.get({ x: 4 }) ||
            k.set({ x: 4 }, "t") != k ||
            k.size != 2
          )
            return !1;
          var l = k.entries(),
            p = l.next();
          if (p.done || p.value[0] != h || p.value[1] != "s") return !1;
          p = l.next();
          return !(
            p.done ||
            p.value[0].x != 4 ||
            p.value[1] != "t" ||
            !l.next().done
          );
        } catch (r) {
          return !1;
        }
      })()
    )
      return a;
    var f = new WeakMap();
    e.prototype.set = function (h, k) {
      h = h === 0 ? 0 : h;
      var l = d(this, h);
      l.list || (l.list = this[0][l.id] = []);
      l.entry
        ? (l.entry.value = k)
        : ((l.entry = {
            next: this[1],
            M: this[1].M,
            head: this[1],
            key: h,
            value: k,
          }),
          l.list.push(l.entry),
          (this[1].M.next = l.entry),
          (this[1].M = l.entry),
          this.size++);
      return this;
    };
    e.prototype.delete = function (h) {
      h = d(this, h);
      return h.entry && h.list
        ? (h.list.splice(h.index, 1),
          h.list.length || delete this[0][h.id],
          (h.entry.M.next = h.entry.next),
          (h.entry.next.M = h.entry.M),
          (h.entry.head = null),
          this.size--,
          !0)
        : !1;
    };
    e.prototype.clear = function () {
      this[0] = {};
      this[1] = this[1].M = b();
      this.size = 0;
    };
    e.prototype.has = function (h) {
      return !!d(this, h).entry;
    };
    e.prototype.get = function (h) {
      return (h = d(this, h).entry) && h.value;
    };
    e.prototype.entries = function () {
      return c(this, function (h) {
        return [h.key, h.value];
      });
    };
    e.prototype.keys = function () {
      return c(this, function (h) {
        return h.key;
      });
    };
    e.prototype.values = function () {
      return c(this, function (h) {
        return h.value;
      });
    };
    e.prototype.forEach = function (h, k) {
      for (var l = this.entries(), p; !(p = l.next()).done;)
        ((p = p.value), h.call(k, p[1], p[0], this));
    };
    e.prototype[Symbol.iterator] = e.prototype.entries;
    var g = 0;
    return e;
  });
  w("Set", function (a) {
    function b(c) {
      this.h = new Map();
      if (c) {
        c = A(c);
        for (var d; !(d = c.next()).done;) this.add(d.value);
      }
      this.size = this.h.size;
    }
    if (
      (function () {
        if (
          !a ||
          typeof a != "function" ||
          !a.prototype.entries ||
          typeof Object.seal != "function"
        )
          return !1;
        try {
          var c = Object.seal({ x: 4 }),
            d = new a(A([c]));
          if (
            !d.has(c) ||
            d.size != 1 ||
            d.add(c) != d ||
            d.size != 1 ||
            d.add({ x: 4 }) != d ||
            d.size != 2
          )
            return !1;
          var e = d.entries(),
            f = e.next();
          if (f.done || f.value[0] != c || f.value[1] != c) return !1;
          f = e.next();
          return f.done ||
            f.value[0] == c ||
            f.value[0].x != 4 ||
            f.value[1] != f.value[0]
            ? !1
            : e.next().done;
        } catch (g) {
          return !1;
        }
      })()
    )
      return a;
    b.prototype.add = function (c) {
      c = c === 0 ? 0 : c;
      this.h.set(c, c);
      this.size = this.h.size;
      return this;
    };
    b.prototype.delete = function (c) {
      c = this.h.delete(c);
      this.size = this.h.size;
      return c;
    };
    b.prototype.clear = function () {
      this.h.clear();
      this.size = 0;
    };
    b.prototype.has = function (c) {
      return this.h.has(c);
    };
    b.prototype.entries = function () {
      return this.h.entries();
    };
    b.prototype.values = function () {
      return this.h.values();
    };
    b.prototype.keys = b.prototype.values;
    b.prototype[Symbol.iterator] = b.prototype.values;
    b.prototype.forEach = function (c, d) {
      var e = this;
      this.h.forEach(function (f) {
        return c.call(d, f, f, e);
      });
    };
    return b;
  });
  w("Object.values", function (a) {
    return a
      ? a
      : function (b) {
          var c = [],
            d;
          for (d in b) D(b, d) && c.push(b[d]);
          return c;
        };
  });
  w("Object.is", function (a) {
    return a
      ? a
      : function (b, c) {
          return b === c ? b !== 0 || 1 / b === 1 / c : b !== b && c !== c;
        };
  });
  w("Array.from", function (a) {
    return a
      ? a
      : function (b, c, d) {
          c =
            c != null
              ? c
              : function (h) {
                  return h;
                };
          var e = [],
            f =
              typeof Symbol != "undefined" &&
              Symbol.iterator &&
              b[Symbol.iterator];
          if (typeof f == "function") {
            b = f.call(b);
            for (var g = 0; !(f = b.next()).done;)
              e.push(c.call(d, f.value, g++));
          } else
            for (f = b.length, g = 0; g < f; g++) e.push(c.call(d, b[g], g));
          return e;
        };
  });
  w("Number.isFinite", function (a) {
    return a
      ? a
      : function (b) {
          return typeof b !== "number"
            ? !1
            : !isNaN(b) && b !== Infinity && b !== -Infinity;
        };
  });
  w("Number.MAX_SAFE_INTEGER", function () {
    return 9007199254740991;
  });
  w("Number.MIN_SAFE_INTEGER", function () {
    return -9007199254740991;
  });
  w("Number.isInteger", function (a) {
    return a
      ? a
      : function (b) {
          return Number.isFinite(b) ? b === Math.floor(b) : !1;
        };
  });
  w("Number.isSafeInteger", function (a) {
    return a
      ? a
      : function (b) {
          return Number.isInteger(b) && Math.abs(b) <= Number.MAX_SAFE_INTEGER;
        };
  });
  function Da(a, b) {
    a instanceof String && (a += "");
    var c = 0,
      d = !1;
    return Ca(function () {
      if (!d && c < a.length) {
        var e = c++;
        return { value: b(e, a[e]), done: !1 };
      }
      d = !0;
      return { done: !0, value: void 0 };
    });
  }
  w("Math.trunc", function (a) {
    return a
      ? a
      : function (b) {
          b = Number(b);
          if (isNaN(b) || b === Infinity || b === -Infinity || b === 0)
            return b;
          var c = Math.floor(Math.abs(b));
          return b < 0 ? -c : c;
        };
  });
  w("Number.isNaN", function (a) {
    return a
      ? a
      : function (b) {
          return typeof b === "number" && isNaN(b);
        };
  });
  w("Array.prototype.keys", function (a) {
    return a
      ? a
      : function () {
          return Da(this, function (b) {
            return b;
          });
        };
  });
  w("Array.prototype.values", function (a) {
    return a
      ? a
      : function () {
          return Da(this, function (b, c) {
            return c;
          });
        };
  });
  w("Promise.prototype.finally", function (a) {
    return a
      ? a
      : function (b) {
          return this.then(
            function (c) {
              return Promise.resolve(b()).then(function () {
                return c;
              });
            },
            function (c) {
              return Promise.resolve(b()).then(function () {
                throw c;
              });
            },
          );
        };
  }); /*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
  var H = this || self;
  function Ea(a, b) {
    a: {
      var c = ["CLOSURE_FLAGS"];
      for (var d = H, e = 0; e < c.length; e++)
        if (((d = d[c[e]]), d == null)) {
          c = null;
          break a;
        }
      c = d;
    }
    a = c && c[a];
    return a != null ? a : b;
  }
  function Fa(a) {
    var b = typeof a;
    return (b == "object" && a != null) || b == "function";
  }
  function Ga(a, b, c) {
    return a.call.apply(a.bind, arguments);
  }
  function Ha(a, b, c) {
    if (!a) throw Error();
    if (arguments.length > 2) {
      var d = Array.prototype.slice.call(arguments, 2);
      return function () {
        var e = Array.prototype.slice.call(arguments);
        Array.prototype.unshift.apply(e, d);
        return a.apply(b, e);
      };
    }
    return function () {
      return a.apply(b, arguments);
    };
  }
  function Ia(a, b, c) {
    Ia =
      Function.prototype.bind &&
      Function.prototype.bind.toString().indexOf("native code") != -1
        ? Ga
        : Ha;
    return Ia.apply(null, arguments);
  }
  function Ja(a, b) {
    var c = Array.prototype.slice.call(arguments, 1);
    return function () {
      var d = c.slice();
      d.push.apply(d, arguments);
      return a.apply(this, d);
    };
  }
  function Ka(a, b) {
    a = a.split(".");
    for (var c = globalThis || H, d; a.length && (d = a.shift());)
      a.length || b === void 0
        ? c[d] && c[d] !== Object.prototype[d]
          ? (c = c[d])
          : (c = c[d] = {})
        : (c[d] = b);
  }
  function La(a) {
    return a;
  }
  function Ma(a, b) {
    function c() {}
    c.prototype = b.prototype;
    a.ia = b.prototype;
    a.prototype = new c();
    a.prototype.constructor = a;
    a.base = function (d, e, f) {
      for (
        var g = Array(arguments.length - 2), h = 2;
        h < arguments.length;
        h++
      )
        g[h - 2] = arguments[h];
      return b.prototype[e].apply(d, g);
    };
  }
  function Na(a) {
    return { Fa: 3, Ea: a };
  }
  function Oa() {
    var a = Pa;
    this.h = a;
    a.sa(
      "/client_streamz/gemini_windows/client_launched_count",
      Na("channel"),
      Na("app_version"),
    );
  }
  Oa.prototype.ea = function (a, b) {
    this.h.ra("/client_streamz/gemini_windows/client_launched_count", a, b);
  };
  Oa.prototype.Y = function () {
    return this.h.Y("/client_streamz/gemini_windows/client_launched_count");
  };
  function Qa() {
    var a = Pa;
    this.h = a;
    a.sa(
      "/client_streamz/gemini_windows/client_crashed_count",
      Na("channel"),
      Na("app_version"),
      Na("process_type"),
      Na("reason"),
    );
  }
  Qa.prototype.ea = function (a, b, c, d) {
    this.h.ra(
      "/client_streamz/gemini_windows/client_crashed_count",
      a,
      b,
      c,
      d,
    );
  };
  Qa.prototype.Y = function () {
    return this.h.Y("/client_streamz/gemini_windows/client_crashed_count");
  };
  function Ra(a) {
    H.setTimeout(function () {
      throw a;
    }, 0);
  }
  var Sa = String.prototype.trim
    ? function (a) {
        return a.trim();
      }
    : function (a) {
        return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1];
      };
  var Ta = Ea(610401301, !1),
    Ua = Ea(748402147, !0);
  function Va() {
    var a = H.navigator;
    return a && (a = a.userAgent) ? a : "";
  }
  var J,
    Wa = H.navigator;
  J = Wa ? Wa.userAgentData || null : null;
  function Xa(a) {
    if (!Ta || !J) return !1;
    for (var b = 0; b < J.brands.length; b++) {
      var c = J.brands[b].brand;
      if (c && c.indexOf(a) != -1) return !0;
    }
    return !1;
  }
  function K(a) {
    return Va().indexOf(a) != -1;
  }
  function Ya() {
    return Ta ? !!J && J.brands.length > 0 : !1;
  }
  function Za() {
    return Ya() ? !1 : K("Opera");
  }
  function $a() {
    return K("Firefox") || K("FxiOS");
  }
  function ab() {
    return Ya()
      ? Xa("Chromium")
      : ((K("Chrome") || K("CriOS")) && !(Ya() ? 0 : K("Edge"))) || K("Silk");
  }
  function bb() {
    return Ta ? !!J && !!J.platform : !1;
  }
  function cb() {
    return K("iPhone") && !K("iPod") && !K("iPad");
  }
  function db() {
    cb() || K("iPad") || K("iPod");
  }
  var eb = Array.prototype.indexOf
      ? function (a, b) {
          return Array.prototype.indexOf.call(a, b, void 0);
        }
      : function (a, b) {
          if (typeof a === "string")
            return typeof b !== "string" || b.length != 1
              ? -1
              : a.indexOf(b, 0);
          for (var c = 0; c < a.length; c++) if (c in a && a[c] === b) return c;
          return -1;
        },
    fb = Array.prototype.forEach
      ? function (a, b) {
          Array.prototype.forEach.call(a, b, void 0);
        }
      : function (a, b) {
          for (
            var c = a.length,
              d = typeof a === "string" ? a.split("") : a,
              e = 0;
            e < c;
            e++
          )
            e in d && b.call(void 0, d[e], e, a);
        };
  function gb(a) {
    gb[" "](a);
    return a;
  }
  gb[" "] = function () {};
  Za();
  Ya() || K("Trident") || K("MSIE");
  K("Edge");
  !K("Gecko") ||
    (Va().toLowerCase().indexOf("webkit") != -1 && !K("Edge")) ||
    K("Trident") ||
    K("MSIE") ||
    K("Edge");
  Va().toLowerCase().indexOf("webkit") != -1 && !K("Edge") && K("Mobile");
  bb() || K("Macintosh");
  bb() || K("Windows");
  (bb() ? J.platform === "Linux" : K("Linux")) || bb() || K("CrOS");
  bb() || K("Android");
  cb();
  K("iPad");
  K("iPod");
  db();
  Va().toLowerCase().indexOf("kaios");
  $a();
  cb() || K("iPod");
  K("iPad");
  !K("Android") || ab() || $a() || Za() || K("Silk");
  ab();
  !K("Safari") ||
    ab() ||
    (Ya() ? 0 : K("Coast")) ||
    Za() ||
    (Ya() ? 0 : K("Edge")) ||
    (Ya() ? Xa("Microsoft Edge") : K("Edg/")) ||
    (Ya() ? Xa("Opera") : K("OPR")) ||
    $a() ||
    K("Silk") ||
    K("Android") ||
    db();
  function hb(a, b) {
    a.__closure__error__context__984382 ||
      (a.__closure__error__context__984382 = {});
    a.__closure__error__context__984382.severity = b;
  }
  var ib = void 0;
  function jb(a) {
    a = Error(a);
    hb(a, "warning");
    return a;
  }
  function kb(a, b) {
    if (a != null) {
      var c;
      var d = (c = ib) != null ? c : (ib = {});
      c = d[a] || 0;
      c >= b || ((d[a] = c + 1), (a = Error()), hb(a, "incident"), Ra(a));
    }
  }
  function lb() {
    return typeof BigInt === "function";
  }
  var mb = typeof Symbol === "function" && typeof Symbol() === "symbol";
  function L(a, b, c) {
    return typeof Symbol === "function" && typeof Symbol() === "symbol"
      ? (c === void 0 ? 0 : c) && Symbol.for && a
        ? Symbol.for(a)
        : a != null
          ? Symbol(a)
          : Symbol()
      : b;
  }
  var nb = L("jas", void 0, !0),
    ob = L(void 0, "1oa"),
    pb = L(void 0, Symbol()),
    qb = L(void 0, "0ub"),
    rb = L(void 0, "0ubs"),
    sb = L(void 0, "0actk"),
    tb = L("m_m", "Sa", !0),
    ub = L(void 0, "vps"),
    vb = L();
  var wb = { Ha: { value: 0, configurable: !0, writable: !0, enumerable: !1 } },
    xb = Object.defineProperties,
    M = mb ? nb : "Ha",
    zb,
    Ab = [];
  N(Ab, 7);
  zb = Object.freeze(Ab);
  function Bb(a, b) {
    mb || M in a || xb(a, wb);
    a[M] |= b;
  }
  function N(a, b) {
    mb || M in a || xb(a, wb);
    a[M] = b;
  }
  var Cb = {};
  function P(a, b) {
    return b === void 0
      ? a.h !== Db && !!(2 & (a.m[M] | 0))
      : !!(2 & b) && a.h !== Db;
  }
  var Db = {};
  Object.freeze({});
  var Eb = {};
  function Fb(a) {
    a.Qa = !0;
    return a;
  }
  var Gb = Fb(function (a) {
      return typeof a === "number";
    }),
    Hb = Fb(function (a) {
      return typeof a === "string";
    }),
    Ib = Fb(function (a) {
      return typeof a === "boolean";
    });
  var Jb = typeof H.BigInt === "function" && typeof H.BigInt(0) === "bigint";
  function Q(a) {
    var b = a;
    if (Hb(b)) {
      if (!/^\s*(?:-?[1-9]\d*|0)?\s*$/.test(b)) throw Error(String(b));
    } else if (Gb(b) && !Number.isSafeInteger(b)) throw Error(String(b));
    return Jb
      ? BigInt(a)
      : (a = Ib(a) ? (a ? "1" : "0") : Hb(a) ? a.trim() || "0" : String(a));
  }
  var Pb = Fb(function (a) {
      return Jb ? a >= Kb && a <= Lb : a[0] === "-" ? Mb(a, Nb) : Mb(a, Ob);
    }),
    Nb = Number.MIN_SAFE_INTEGER.toString(),
    Kb = Jb ? BigInt(Number.MIN_SAFE_INTEGER) : void 0,
    Ob = Number.MAX_SAFE_INTEGER.toString(),
    Lb = Jb ? BigInt(Number.MAX_SAFE_INTEGER) : void 0;
  function Mb(a, b) {
    if (a.length > b.length) return !1;
    if (a.length < b.length || a === b) return !0;
    for (var c = 0; c < a.length; c++) {
      var d = a[c],
        e = b[c];
      if (d > e) return !1;
      if (d < e) return !0;
    }
  }
  var R = 0,
    S = 0;
  function Qb(a) {
    var b = a >>> 0;
    R = b;
    S = ((a - b) / 4294967296) >>> 0;
  }
  function Rb(a) {
    if (a < 0) {
      Qb(-a);
      var b = A(Sb(R, S));
      a = b.next().value;
      b = b.next().value;
      R = a >>> 0;
      S = b >>> 0;
    } else Qb(a);
  }
  function Tb(a, b) {
    b >>>= 0;
    a >>>= 0;
    if (b <= 2097151) var c = "" + (4294967296 * b + a);
    else
      lb()
        ? (c = "" + ((BigInt(b) << BigInt(32)) | BigInt(a)))
        : ((c = ((a >>> 24) | (b << 8)) & 16777215),
          (b = (b >> 16) & 65535),
          (a = (a & 16777215) + c * 6777216 + b * 6710656),
          (c += b * 8147497),
          (b *= 2),
          a >= 1e7 && ((c += (a / 1e7) >>> 0), (a %= 1e7)),
          c >= 1e7 && ((b += (c / 1e7) >>> 0), (c %= 1e7)),
          (c = b + Ub(c) + Ub(a)));
    return c;
  }
  function Ub(a) {
    a = String(a);
    return "0000000".slice(a.length) + a;
  }
  function Vb() {
    var a = R,
      b = S;
    b & 2147483648
      ? lb()
        ? (a = "" + ((BigInt(b | 0) << BigInt(32)) | BigInt(a >>> 0)))
        : ((b = A(Sb(a, b))),
          (a = b.next().value),
          (b = b.next().value),
          (a = "-" + Tb(a, b)))
      : (a = Tb(a, b));
    return a;
  }
  function Sb(a, b) {
    b = ~b;
    a ? (a = ~a + 1) : (b += 1);
    return [a, b];
  }
  function Wb(a) {
    return Array.prototype.slice.call(a);
  }
  var Xb = typeof BigInt === "function" ? BigInt.asIntN : void 0,
    Yb = Number.isSafeInteger,
    Zb = Number.isFinite,
    $b = Math.trunc;
  function ac(a) {
    if (a != null && typeof a !== "boolean") {
      var b = Error;
      var c = typeof a;
      c = c != "object" ? c : a ? (Array.isArray(a) ? "array" : c) : "null";
      throw b("Expected boolean but got " + c + ": " + a);
    }
    return a;
  }
  var bc = /^-?([1-9][0-9]*|0)(\.[0-9]+)?$/;
  function cc(a) {
    switch (typeof a) {
      case "bigint":
        return !0;
      case "number":
        return Zb(a);
      case "string":
        return bc.test(a);
      default:
        return !1;
    }
  }
  function dc(a) {
    if (a != null) {
      if (typeof a !== "number") throw jb("int32");
      if (!Zb(a)) throw jb("int32");
      a |= 0;
    }
    return a;
  }
  function ec(a) {
    if (a == null) return a;
    if (typeof a === "string" && a) a = +a;
    else if (typeof a !== "number") return;
    return Zb(a) ? a | 0 : void 0;
  }
  function fc(a) {
    var b = void 0;
    b != null || (b = 1024);
    if (!cc(a)) throw jb("int64");
    var c = typeof a;
    switch (b) {
      case 512:
        switch (c) {
          case "string":
            return hc(a);
          case "bigint":
            return String(Xb(64, a));
          default:
            return ic(a);
        }
      case 1024:
        switch (c) {
          case "string":
            return jc(a);
          case "bigint":
            return Q(Xb(64, a));
          default:
            return Q(Yb(a) ? a : ic(a));
        }
      case 0:
        switch (c) {
          case "string":
            return hc(a);
          case "bigint":
            return Q(Xb(64, a));
          default:
            return kc(a);
        }
      default:
        throw Error("Unknown format requested type for int64");
    }
  }
  function lc(a) {
    return a == null ? a : fc(a);
  }
  function mc(a) {
    var b = a.length;
    if (
      a[0] === "-"
        ? b < 20 || (b === 20 && a <= "-9223372036854775808")
        : b < 19 || (b === 19 && a <= "9223372036854775807")
    )
      return a;
    if (a.length < 16) Rb(Number(a));
    else if (lb())
      ((a = BigInt(a)),
        (R = Number(a & BigInt(4294967295)) >>> 0),
        (S = Number((a >> BigInt(32)) & BigInt(4294967295))));
    else {
      b = +(a[0] === "-");
      S = R = 0;
      for (
        var c = a.length, d = b, e = ((c - b) % 6) + b;
        e <= c;
        d = e, e += 6
      )
        ((d = Number(a.slice(d, e))),
          (S *= 1e6),
          (R = R * 1e6 + d),
          R >= 4294967296 &&
            ((S += Math.trunc(R / 4294967296)), (S >>>= 0), (R >>>= 0)));
      b &&
        ((b = A(Sb(R, S))),
        (a = b.next().value),
        (b = b.next().value),
        (R = a),
        (S = b));
    }
    return Vb();
  }
  function kc(a) {
    a = $b(a);
    if (!Yb(a)) {
      Rb(a);
      var b = R,
        c = S;
      if ((a = c & 2147483648))
        ((b = (~b + 1) >>> 0), (c = ~c >>> 0), b == 0 && (c = (c + 1) >>> 0));
      var d = c * 4294967296 + (b >>> 0);
      b = Number.isSafeInteger(d) ? d : Tb(b, c);
      a = typeof b === "number" ? (a ? -b : b) : a ? "-" + b : b;
    }
    return a;
  }
  function ic(a) {
    a = $b(a);
    Yb(a) ? (a = String(a)) : (Rb(a), (a = Vb()));
    return a;
  }
  function hc(a) {
    var b = $b(Number(a));
    if (Yb(b)) return String(b);
    b = a.indexOf(".");
    b !== -1 && (a = a.substring(0, b));
    return mc(a);
  }
  function jc(a) {
    var b = $b(Number(a));
    if (Yb(b)) return Q(b);
    b = a.indexOf(".");
    b !== -1 && (a = a.substring(0, b));
    return lb() ? Q(Xb(64, BigInt(a))) : Q(mc(a));
  }
  function nc(a) {
    var b = typeof a;
    if (a == null) return a;
    if (b === "bigint") return Q(Xb(64, a));
    if (cc(a)) return b === "string" ? jc(a) : Q(Yb(a) ? a : ic(a));
  }
  function oc(a) {
    if (a != null && typeof a !== "string") throw Error();
    return a;
  }
  function pc(a, b, c) {
    if (a != null && a[tb] === Cb) return a;
    if (Array.isArray(a)) {
      var d = a[M] | 0;
      c = d | (c & 32) | (c & 2);
      c !== d && N(a, c);
      return new b(a);
    }
  }
  var qc = {};
  function rc(a) {
    return a;
  }
  var sc = { Ta: !0 };
  function tc(a, b) {
    b < 100 || kb(rb, 1);
  }
  function uc(a, b, c, d) {
    var e = d !== void 0;
    d = !!d;
    var f = La(pb),
      g;
    !e && mb && f && (g = a[f]) && g.Pa(tc);
    f = [];
    var h = a.length;
    g = 4294967295;
    var k = !1,
      l = !!(b & 64),
      p = l ? (b & 128 ? 0 : -1) : void 0;
    if (!(b & 1)) {
      var r = h && a[h - 1];
      r != null && typeof r === "object" && r.constructor === Object
        ? (h--, (g = h))
        : (r = void 0);
      if (l && !(b & 128) && !e) {
        k = !0;
        var m;
        g = ((m = vc) != null ? m : rc)(g - p, p, a, r, void 0) + p;
      }
    }
    b = void 0;
    for (e = 0; e < h; e++)
      if (((m = a[e]), m != null && (m = c(m, d)) != null))
        if (l && e >= g) {
          var n = e - p,
            q = void 0;
          ((q = b) != null ? q : (b = {}))[n] = m;
        } else f[e] = m;
    if (r)
      for (var t in r)
        ((a = r[t]),
          a != null &&
            (a = c(a, d)) != null &&
            ((h = +t),
            (e = void 0),
            l && !Number.isNaN(h) && (e = h + p) < g
              ? (f[e] = a)
              : ((h = void 0), (((h = b) != null ? h : (b = {}))[t] = a))));
    b && (k ? f.push(b) : (f[g] = b));
    return f;
  }
  function wc(a) {
    switch (typeof a) {
      case "number":
        return Number.isFinite(a) ? a : "" + a;
      case "bigint":
        return Pb(a) ? Number(a) : "" + a;
      case "boolean":
        return a ? 1 : 0;
      case "object":
        if (Array.isArray(a)) {
          var b = a[M] | 0;
          return a.length === 0 && b & 1 ? void 0 : uc(a, b, wc);
        }
        if (a != null && a[tb] === Cb) return xc(a);
        return;
    }
    return a;
  }
  var vc;
  function yc(a, b) {
    if (b) {
      vc = b == null || b === rc || b[ub] !== qc ? rc : b;
      try {
        return xc(a);
      } finally {
        vc = void 0;
      }
    }
    return xc(a);
  }
  function xc(a) {
    a = a.m;
    return uc(a, a[M] | 0, wc);
  }
  function T(a, b, c, d) {
    d = d === void 0 ? 0 : d;
    if (a == null) {
      var e = 32;
      c ? ((a = [c]), (e |= 128)) : (a = []);
      b && (e = (e & -16760833) | ((b & 1023) << 14));
    } else {
      if (!Array.isArray(a)) throw Error("narr");
      e = a[M] | 0;
      if (Ua && 1 & e) throw Error("rfarr");
      2048 & e && !(2 & e) && zc();
      if (e & 256) throw Error("farr");
      if (e & 64) return ((e | d) !== e && N(a, e | d), a);
      if (c && ((e |= 128), c !== a[0])) throw Error("mid");
      a: {
        c = a;
        e |= 64;
        var f = c.length;
        if (f) {
          var g = f - 1,
            h = c[g];
          if (h != null && typeof h === "object" && h.constructor === Object) {
            b = e & 128 ? 0 : -1;
            g -= b;
            if (g >= 1024) throw Error("pvtlmt");
            for (var k in h)
              ((f = +k), f < g && ((c[f + b] = h[k]), delete h[k]));
            e = (e & -16760833) | ((g & 1023) << 14);
            break a;
          }
        }
        if (b) {
          k = Math.max(b, f - (e & 128 ? 0 : -1));
          if (k > 1024) throw Error("spvt");
          e = (e & -16760833) | ((k & 1023) << 14);
        }
      }
    }
    N(a, e | 64 | d);
    return a;
  }
  function zc() {
    if (Ua) throw Error("carr");
    kb(sb, 5);
  }
  function Ac(a, b) {
    if (typeof a !== "object") return a;
    if (Array.isArray(a)) {
      var c = a[M] | 0;
      a.length === 0 && c & 1
        ? (a = void 0)
        : c & 2 ||
          (!b || 4096 & c || 16 & c
            ? (a = Bc(a, c, !1, b && !(c & 16)))
            : (Bb(a, 34), c & 4 && Object.freeze(a)));
      return a;
    }
    if (a != null && a[tb] === Cb)
      return (
        (b = a.m),
        (c = b[M] | 0),
        P(a, c) ? a : Cc(a, b, c) ? Dc(a, b) : Bc(b, c)
      );
  }
  function Dc(a, b, c) {
    a = new a.constructor(b);
    c && (a.h = Db);
    a.i = Db;
    return a;
  }
  function Gc(a) {
    var b = a.m,
      c = b[M] | 0;
    return Cc(a, b, c) ? Dc(a, b, !0) : new a.constructor(Bc(b, c, !1));
  }
  function Bc(a, b, c, d) {
    d != null || (d = !!(34 & b));
    a = uc(a, b, Ac, d);
    d = 32;
    c && (d |= 2);
    b = (b & 16769217) | d;
    N(a, b);
    return a;
  }
  function Hc(a) {
    var b = a.m,
      c = b[M] | 0;
    return P(a, c)
      ? Cc(a, b, c)
        ? Dc(a, b, !0)
        : new a.constructor(Bc(b, c, !1))
      : a;
  }
  function Ic(a) {
    if (a.h !== Db) return !1;
    var b = a.m;
    b = Bc(b, b[M] | 0);
    Bb(b, 2048);
    a.m = b;
    a.h = void 0;
    a.i = void 0;
    return !0;
  }
  function Jc(a) {
    if (!Ic(a) && P(a, a.m[M] | 0)) throw Error();
  }
  function Kc(a, b) {
    b === void 0 && (b = a[M] | 0);
    b & 32 && !(b & 4096) && N(a, b | 4096);
  }
  function Cc(a, b, c) {
    return c & 2
      ? !0
      : c & 32 && !(c & 4096)
        ? (N(b, c | 2), (a.h = Db), !0)
        : !1;
  }
  var Lc = Q(0);
  function Mc(a, b, c, d) {
    a = Nc(a.m, b, c, d);
    if (a !== null) return a;
  }
  function Nc(a, b, c, d) {
    if (b === -1) return null;
    var e = b + (c ? 0 : -1),
      f = a.length - 1;
    if (!(f < 1 + (c ? 0 : -1))) {
      if (e >= f) {
        var g = a[f];
        if (g != null && typeof g === "object" && g.constructor === Object) {
          c = g[b];
          var h = !0;
        } else if (e === f) c = g;
        else return;
      } else c = a[e];
      if (d && c != null) {
        d = d(c);
        if (d == null) return d;
        if (!Object.is(d, c)) return (h ? (g[b] = d) : (a[e] = d), d);
      }
      return c;
    }
  }
  function U(a, b, c) {
    Jc(a);
    var d = a.m;
    V(d, d[M] | 0, b, c);
    return a;
  }
  function V(a, b, c, d, e) {
    var f = c + (e ? 0 : -1),
      g = a.length - 1;
    if (g >= 1 + (e ? 0 : -1) && f >= g) {
      var h = a[g];
      if (h != null && typeof h === "object" && h.constructor === Object)
        return ((h[c] = d), b);
    }
    if (f <= g) return ((a[f] = d), b);
    if (d !== void 0) {
      var k;
      g = (((k = b) != null ? k : (b = a[M] | 0)) >> 14) & 1023 || 536870912;
      c >= g
        ? d != null && ((f = {}), (a[g + (e ? 0 : -1)] = ((f[c] = d), f)))
        : (a[f] = d);
    }
    return b;
  }
  function Oc(a) {
    return (!!(2 & a) && !!(4 & a)) || !!(256 & a);
  }
  function Pc(a, b) {
    Jc(a);
    var c = a.m;
    Qc(c, c[M] | 0, b, 0);
    return a;
  }
  function Rc(a, b, c, d) {
    Jc(a);
    a = a.m;
    var e = a[M] | 0;
    if (d == null) {
      var f = Sc(a);
      if (Tc(f, a, e, c) === b) f.set(c, 0);
      else return;
    } else e = Qc(a, e, c, b);
    V(a, e, b, d);
  }
  function Sc(a) {
    if (mb) {
      var b;
      return (b = a[ob]) != null ? b : (a[ob] = new Map());
    }
    if (ob in a) return a[ob];
    b = new Map();
    Object.defineProperty(a, ob, { value: b });
    return b;
  }
  function Qc(a, b, c, d) {
    var e = Sc(a),
      f = Tc(e, a, b, c);
    f !== d && (f && (b = V(a, b, f)), e.set(c, d));
    return b;
  }
  function Tc(a, b, c, d) {
    var e = a.get(d);
    if (e != null) return e;
    for (var f = (e = 0); f < d.length; f++) {
      var g = d[f];
      Nc(b, g) != null && (e !== 0 && (c = V(b, c, e)), (e = g));
    }
    a.set(d, e);
    return e;
  }
  function Uc(a, b, c, d, e) {
    var f = !1;
    d = Nc(a, d, e, function (g) {
      var h = pc(g, c, b);
      f = h !== g && h != null;
      return h;
    });
    if (d != null) return (f && !P(d) && Kc(a, b), d);
  }
  function Vc(a, b, c, d) {
    var e = a.m,
      f = e[M] | 0;
    b = Uc(e, f, b, c, d);
    if (b == null) return b;
    f = e[M] | 0;
    if (!P(a, f)) {
      var g = Hc(b);
      g !== b &&
        (Ic(a) && ((e = a.m), (f = e[M] | 0)),
        (b = g),
        (f = V(e, f, c, b, d)),
        Kc(e, f));
    }
    return b;
  }
  function Wc(a, b, c) {
    c == null && (c = void 0);
    U(a, b, c);
    c && !P(c) && Kc(a.m);
    return a;
  }
  function Xc(a, b, c) {
    Jc(a);
    var d = a.m,
      e = d[M] | 0;
    if (c == null) return (V(d, e, b), a);
    for (
      var f = c === zb ? 7 : c[M] | 0,
        g = f,
        h = Oc(f),
        k = h || Object.isFrozen(c),
        l = !0,
        p = !0,
        r = 0;
      r < c.length;
      r++
    ) {
      var m = c[r];
      h || ((m = P(m)), l && (l = !m), p && (p = m));
    }
    h || ((f = l ? 13 : 5), (f = p ? f & -4097 : f | 4096));
    (k && f === g) || ((c = Wb(c)), (g = 0), (f = Yc(f, e)));
    f !== g && N(c, f);
    e = V(d, e, b, c);
    2 & f || !(4096 & f || 16 & f) || Kc(d, e);
    return a;
  }
  function Yc(a, b) {
    return (a = (2 & b ? a | 2 : a & -3) & -273);
  }
  function Zc(a, b, c) {
    c = c === void 0 ? Lc : c;
    a = Mc(a, b, void 0, nc);
    return a != null ? a : c;
  }
  function $c(a) {
    var b = b === void 0 ? 0 : b;
    a = Mc(a, 1);
    a = a == null ? a : Zb(a) ? a | 0 : void 0;
    return a != null ? a : b;
  }
  function X(a, b, c) {
    return U(a, b, oc(c));
  }
  function ad(a, b, c) {
    if (c != null) {
      if (!Zb(c)) throw jb("enum");
      c |= 0;
    }
    return U(a, b, c);
  }
  function Y(a, b, c) {
    this.m = T(a, b, c, 2048);
  }
  Y.prototype.toJSON = function () {
    return yc(this);
  };
  Y.prototype.serialize = function (a) {
    return JSON.stringify(yc(this, a));
  };
  Y.prototype[tb] = Cb;
  Y.prototype.toString = function () {
    return this.m.toString();
  };
  function bd() {
    var a = cd;
    this.ctor = dd;
    this.h = Vc;
    this.defaultValue = void 0;
    this.i = a.Ra != null ? Eb : void 0;
  }
  bd.prototype.register = function () {
    gb(this);
  };
  function ed(a) {
    return function (b) {
      if (b == null || b == "") b = new a();
      else {
        b = JSON.parse(b);
        if (!Array.isArray(b)) throw Error("dnarr");
        Bb(b, 32);
        b = new a(b);
      }
      return b;
    };
  }
  var fd = (
    typeof require === "function"
      ? require
      : function () {
          return {};
        }
  )("fs");
  var gd = (
    typeof require === "function"
      ? require
      : function () {
          return {};
        }
  )("path");
  function hd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(hd, Y);
  hd.prototype.ma = function () {
    return $c(this);
  };
  function id(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(id, Y);
  function jd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(jd, Y);
  function kd(a) {
    Xc(ld, 1, a);
  }
  var md = ed(jd);
  function nd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(nd, Y);
  function od(a, b) {
    var c = void 0,
      d = void 0,
      e = void 0;
    c = c === void 0 ? 1e3 : c;
    d = d === void 0 ? 6048e5 : d;
    e = e === void 0 ? fetch : e;
    this.ha = a;
    this.ya = c;
    this.Da = d;
    this.va = e;
    this.Z = b;
    this.ba = null;
    this.ua = Promise.resolve();
  }
  od.prototype.send = function (a, b, c) {
    var d = this,
      e,
      f,
      g,
      h,
      k,
      l,
      p,
      r,
      m,
      n,
      q,
      t,
      u,
      F,
      x,
      B,
      z,
      O,
      W,
      fa,
      ta;
    return G(function (I) {
      switch (I.h) {
        case 1:
          return (
            (f =
              (e =
                typeof AbortController !== "undefined" && a.timeoutMillis > 0
                  ? new AbortController()
                  : void 0) && a.timeoutMillis > 0
                ? setTimeout(function () {
                    e.abort();
                  }, a.timeoutMillis)
                : void 0),
            I.v(2, 3),
            (g = Object.assign(
              {},
              {
                method: a.requestType,
                headers: Object.assign({}, a.requestHeaders),
              },
              a.body && { body: a.body },
              a.withCredentials && { credentials: "include" },
              { signal: e ? e.signal : null },
            )),
            I.yield(d.va(a.url, g), 5)
          );
        case 5:
          h = I.i;
          if (h.status === 200) return I.yield(h.text(), 10);
          if (!pd(h.status)) {
            (l = (k = d).Z) == null ||
              l.call(
                k,
                "Clearcut batch rejected with non-retryable status; dropping",
                h.status,
              );
            (p = c) == null || p(h.status, !1);
            I.A(3);
            break;
          }
          (m = (r = d).Z) == null ||
            m.call(
              r,
              "Clearcut batch failed; saved to offline queue",
              h.status,
            );
          return I.yield(d.save(a), 9);
        case 9:
          (n = c) == null || n(h.status, !1);
          I.A(3);
          break;
        case 10:
          ((q = I.i),
            (u = (t = d).Z) == null ||
              u.call(t, "Clearcut batch sent (status 200)"),
            (F = b) == null || F(q),
            qd(d));
        case 3:
          I.B();
          f !== void 0 && clearTimeout(f);
          I.G(0);
          break;
        case 2:
          return (
            (x = I.F()),
            (O = (z = ((B = x) == null ? void 0 : B.name) === "AbortError")
              ? 408
              : 0),
            (fa = (W = d).Z) == null ||
              fa.call(
                W,
                z
                  ? "Clearcut batch request timed out; saved to offline queue"
                  : "Clearcut batch network error; saved to offline queue",
              ),
            I.yield(d.save(a), 11)
          );
        case 11:
          ((ta = c) == null || ta(O, !1), I.A(3));
      }
    });
  };
  od.prototype.ma = function () {
    return 4;
  };
  od.prototype.save = function (a, b) {
    b = b === void 0 ? Date.now() : b;
    var c = this;
    return G(function (d) {
      return d.yield(
        rd(c, function () {
          var e, f, g, h;
          return G(function (k) {
            switch (k.h) {
              case 1:
                return k.yield(sd(c, b), 2);
              case 2:
                e = k.i;
                if (!(c.ya <= 0)) {
                  k.A(3);
                  break;
                }
                return k.yield(td(c, []), 4);
              case 4:
                return k.return();
              case 3:
                for (; e.length > 0 && e.length >= c.ya;) e.shift();
                h = (f = a.body instanceof Uint8Array)
                  ? Buffer.from(a.body).toString("base64")
                  : String((g = a.body) != null ? g : "");
                e.push({
                  id: b + "-" + Math.random().toString(36).slice(2, 11),
                  url: a.url,
                  requestType: a.requestType,
                  body: h,
                  isBase64ByteArray: f,
                  bodyType: a.bodyType,
                  requestHeaders: Object.assign({}, a.requestHeaders),
                  withCredentials: a.withCredentials,
                  timeoutMillis: a.timeoutMillis,
                  expiresAt: b + c.Da,
                });
                return k.yield(td(c, e), 0);
            }
          });
        }),
        0,
      );
    });
  };
  function qd(a) {
    return G(function (b) {
      if (a.ba) return b.return(a.ba);
      a.ba = ud(a).finally(function () {
        a.ba = null;
      });
      return b.return(a.ba);
    });
  }
  function ud(a) {
    var b, c, d, e, f, g, h, k, l, p, r;
    return G(function (m) {
      switch (m.h) {
        case 1:
          return m.yield(
            rd(a, function () {
              return sd(a);
            }),
            2,
          );
        case 2:
          b = m.i;
          if (b.length === 0) return m.return();
          c = new Set();
          d = A(b);
          e = d.next();
          m.W(3);
        case 5:
          if (e.done) {
            m.A(3);
            break;
          }
          f = e.value;
          g = vd(f);
          return m.yield(wd(a, g), 8);
        case 8:
          h = m.i;
          if (h === "retryable_error") {
            m.A(3);
            break;
          }
          h === "sent"
            ? ((l = k = void 0),
              (l = (k = a).Z) == null ||
                l.call(k, "Replayed offline Clearcut batch (status 200)"))
            : ((r = p = void 0),
              (r = (p = a).Z) == null ||
                r.call(
                  p,
                  "Dropped non-retryable offline Clearcut batch (client error)",
                ));
          c.add(xd(f));
          e = d.next();
          m.A(5);
          break;
        case 3:
          m.B();
          oa(d, e);
          m.G(4);
          break;
        case 4:
          if (c.size > 0)
            return m.yield(
              rd(a, function () {
                var n, q;
                return G(function (t) {
                  if (t.h == 1) return t.yield(sd(a), 2);
                  n = t.i;
                  q = n.filter(function (u) {
                    return !c.has(xd(u));
                  });
                  return t.yield(td(a, q), 0);
                });
              }),
              0,
            );
          m.A(0);
      }
    });
  }
  od.prototype.clear = function () {
    var a = this;
    return G(function (b) {
      return b.yield(
        rd(a, function () {
          return G(function (c) {
            if (c.h == 1) return (c.v(2), c.yield(fd.promises.unlink(a.ha), 4));
            if (c.h != 2) return c.R(0);
            c.F();
            c.P();
          });
        }),
        0,
      );
    });
  };
  function pd(a) {
    return a === 408 || a === 429 || a >= 500;
  }
  function wd(a, b) {
    var c, d, e, f;
    return G(function (g) {
      switch (g.h) {
        case 1:
          return (
            (d =
              (c =
                typeof AbortController !== "undefined" && b.timeoutMillis > 0
                  ? new AbortController()
                  : void 0) && b.timeoutMillis > 0
                ? setTimeout(function () {
                    c.abort();
                  }, b.timeoutMillis)
                : void 0),
            g.v(2, 3),
            (e = Object.assign(
              {},
              {
                method: b.requestType,
                headers: Object.assign({}, b.requestHeaders),
              },
              b.body && { body: b.body },
              b.withCredentials && { credentials: "include" },
              { signal: c ? c.signal : null },
            )),
            g.yield(a.va(b.url, e), 5)
          );
        case 5:
          return (
            (f = g.i),
            f.status === 200
              ? g.return("sent")
              : g.return(pd(f.status) ? "retryable_error" : "drop")
          );
        case 3:
          g.B();
          d !== void 0 && clearTimeout(d);
          g.G(0);
          break;
        case 2:
          return (g.F(), g.return("retryable_error"));
      }
    });
  }
  function vd(a) {
    var b = a.isBase64ByteArray
      ? new Uint8Array(Buffer.from(a.body, "base64"))
      : a.body;
    return {
      url: a.url,
      requestType: a.requestType,
      body: b,
      bodyType: a.bodyType,
      requestHeaders: a.requestHeaders,
      withCredentials: a.withCredentials,
      timeoutMillis: a.timeoutMillis,
    };
  }
  function xd(a) {
    var b;
    return (b = a.id) != null ? b : a.expiresAt + ":" + a.body;
  }
  function rd(a, b) {
    var c, d;
    return G(function (e) {
      switch (e.h) {
        case 1:
          return (
            (c = a.ua),
            (a.ua = new Promise(function (f) {
              d = f;
            })),
            e.yield(c, 2)
          );
        case 2:
          return (e.W(3), e.yield(b(), 5));
        case 5:
          return e.return(e.i);
        case 3:
          (e.B(), d(), e.G(0));
      }
    });
  }
  function sd(a, b) {
    b = b === void 0 ? Date.now() : b;
    var c, d;
    return G(function (e) {
      if (e.h == 1)
        return (e.v(2), e.yield(fd.promises.readFile(a.ha, "utf8"), 4));
      if (e.h != 2)
        return (
          (c = e.i),
          (d = JSON.parse(c.replace(/^\uFEFF/, ""))),
          Array.isArray(d)
            ? e.return(
                d.filter(function (f) {
                  return (
                    f &&
                    typeof f.url === "string" &&
                    typeof f.expiresAt === "number" &&
                    f.expiresAt > b
                  );
                }),
              )
            : e.return([])
        );
      e.F();
      return e.return([]);
    });
  }
  function td(a, b) {
    var c, d;
    return G(function (e) {
      switch (e.h) {
        case 1:
          return (
            e.v(2),
            (c = gd.dirname(a.ha)),
            e.yield(fd.promises.mkdir(c, { recursive: !0 }), 4)
          );
        case 4:
          return (
            (d = a.ha + ".tmp"),
            e.yield(fd.promises.writeFile(d, JSON.stringify(b), "utf8"), 5)
          );
        case 5:
          return e.yield(fd.promises.rename(d, a.ha), 6);
        case 6:
          e.R(0);
          break;
        case 2:
          (e.F(), e.P());
      }
    });
  }
  function yd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(yd, Y);
  yd.prototype.clearValue = function () {
    return Pc(this, zd);
  };
  var zd = [1, 2, 3];
  function Ad(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(Ad, Y);
  Ad.prototype.clearValue = function () {
    return Pc(this, Bd);
  };
  var Bd = [1, 2, 3];
  function Cd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(Cd, Y);
  function Dd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(Dd, Y);
  function Ed(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(Ed, Y);
  function Fd(a) {
    if (!a) return "";
    if (/^about:(?:blank|srcdoc)$/.test(a)) return window.origin || "";
    a.indexOf("blob:") === 0 && (a = a.substring(5));
    a = a.split("#")[0].split("?")[0];
    a = a.toLowerCase();
    a.indexOf("//") == 0 && (a = window.location.protocol + a);
    /^[\w\-]*:\/\//.test(a) || (a = window.location.href);
    var b = a.substring(a.indexOf("://") + 3),
      c = b.indexOf("/");
    c != -1 && (b = b.substring(0, c));
    c = a.substring(0, a.indexOf("://"));
    if (!c) throw Error("URI is missing protocol: " + a);
    if (
      c !== "http" &&
      c !== "https" &&
      c !== "chrome-extension" &&
      c !== "moz-extension" &&
      c !== "file" &&
      c !== "android-app" &&
      c !== "chrome-search" &&
      c !== "chrome-untrusted" &&
      c !== "chrome" &&
      c !== "app" &&
      c !== "devtools"
    )
      throw Error("Invalid URI scheme in origin: " + c);
    a = "";
    var d = b.indexOf(":");
    if (d != -1) {
      var e = b.substring(d + 1);
      b = b.substring(0, d);
      if ((c === "http" && e !== "80") || (c === "https" && e !== "443"))
        a = ":" + e;
    }
    return c + "://" + b + a;
  }
  function Gd() {
    function a() {
      e[0] = 1732584193;
      e[1] = 4023233417;
      e[2] = 2562383102;
      e[3] = 271733878;
      e[4] = 3285377520;
      p = l = 0;
    }
    function b(r) {
      for (var m = g, n = 0; n < 64; n += 4)
        m[n / 4] = (r[n] << 24) | (r[n + 1] << 16) | (r[n + 2] << 8) | r[n + 3];
      for (n = 16; n < 80; n++)
        ((r = m[n - 3] ^ m[n - 8] ^ m[n - 14] ^ m[n - 16]),
          (m[n] = ((r << 1) | (r >>> 31)) & 4294967295));
      r = e[0];
      var q = e[1],
        t = e[2],
        u = e[3],
        F = e[4];
      for (n = 0; n < 80; n++) {
        if (n < 40)
          if (n < 20) {
            var x = u ^ (q & (t ^ u));
            var B = 1518500249;
          } else ((x = q ^ t ^ u), (B = 1859775393));
        else
          n < 60
            ? ((x = (q & t) | (u & (q | t))), (B = 2400959708))
            : ((x = q ^ t ^ u), (B = 3395469782));
        x =
          ((((r << 5) | (r >>> 27)) & 4294967295) + x + F + B + m[n]) &
          4294967295;
        F = u;
        u = t;
        t = ((q << 30) | (q >>> 2)) & 4294967295;
        q = r;
        r = x;
      }
      e[0] = (e[0] + r) & 4294967295;
      e[1] = (e[1] + q) & 4294967295;
      e[2] = (e[2] + t) & 4294967295;
      e[3] = (e[3] + u) & 4294967295;
      e[4] = (e[4] + F) & 4294967295;
    }
    function c(r, m) {
      if (typeof r === "string") {
        r = unescape(encodeURIComponent(r));
        for (var n = [], q = 0, t = r.length; q < t; ++q)
          n.push(r.charCodeAt(q));
        r = n;
      }
      m || (m = r.length);
      n = 0;
      if (l == 0)
        for (; n + 64 < m;) (b(r.slice(n, n + 64)), (n += 64), (p += 64));
      for (; n < m;)
        if (((f[l++] = r[n++]), p++, l == 64))
          for (l = 0, b(f); n + 64 < m;)
            (b(r.slice(n, n + 64)), (n += 64), (p += 64));
    }
    function d() {
      var r = [],
        m = p * 8;
      l < 56 ? c(h, 56 - l) : c(h, 64 - (l - 56));
      for (var n = 63; n >= 56; n--) ((f[n] = m & 255), (m >>>= 8));
      b(f);
      for (n = m = 0; n < 5; n++)
        for (var q = 24; q >= 0; q -= 8) r[m++] = (e[n] >> q) & 255;
      return r;
    }
    for (var e = [], f = [], g = [], h = [128], k = 1; k < 64; ++k) h[k] = 0;
    var l, p;
    a();
    return {
      reset: a,
      update: c,
      digest: d,
      Ca: function () {
        for (var r = d(), m = "", n = 0; n < r.length; n++)
          m +=
            "0123456789ABCDEF".charAt(Math.floor(r[n] / 16)) +
            "0123456789ABCDEF".charAt(r[n] % 16);
        return m;
      },
    };
  }
  function Hd(a, b, c) {
    var d = String(H.location.href);
    return d && a && b ? [b, Id(Fd(d), a, c || null)].join(" ") : null;
  }
  function Id(a, b, c) {
    var d = [],
      e = [];
    if ((Array.isArray(c) ? 2 : 1) == 1)
      return (
        (e = [b, a]),
        fb(d, function (h) {
          e.push(h);
        }),
        Jd(e.join(" "))
      );
    var f = [],
      g = [];
    fb(c, function (h) {
      g.push(h.key);
      f.push(h.value);
    });
    c = Math.floor(new Date().getTime() / 1e3);
    e = f.length == 0 ? [c, b, a] : [f.join(":"), c, b, a];
    fb(d, function (h) {
      e.push(h);
    });
    a = Jd(e.join(" "));
    a = [c, a];
    g.length == 0 || a.push(g.join(""));
    return a.join("_");
  }
  function Jd(a) {
    var b = Gd();
    b.update(a);
    return b.Ca().toLowerCase();
  } /*

 Copyright Google LLC
 SPDX-License-Identifier: Apache-2.0
*/
  var Kd = ma([""]),
    Ld = na(["\x00"], ["\\0"]),
    Md = na(["\n"], ["\\n"]),
    Nd = na(["\x00"], ["\\u0000"]);
  function Od(a) {
    return a.toString().indexOf("`") === -1;
  }
  Od(function (a) {
    return a(Kd);
  }) ||
    Od(function (a) {
      return a(Ld);
    }) ||
    Od(function (a) {
      return a(Md);
    }) ||
    Od(function (a) {
      return a(Nd);
    });
  function Pd() {
    this.h = document || { cookie: "" };
  }
  Pd.prototype.set = function (a, b, c) {
    var d = !1;
    if (typeof c === "object") {
      var e = c.sameSite;
      d = c.secure || !1;
      var f = c.domain || void 0;
      var g = c.path || void 0;
      var h = c.Ia;
    }
    if (/[;=\s]/.test(a)) throw Error('Invalid cookie name "' + a + '"');
    if (/[;\r\n]/.test(b)) throw Error('Invalid cookie value "' + b + '"');
    h === void 0 && (h = -1);
    c = f ? ";domain=" + f : "";
    g = g ? ";path=" + g : "";
    d = d ? ";secure" : "";
    h =
      h < 0
        ? ""
        : h == 0
          ? ";expires=" + new Date(1970, 1, 1).toUTCString()
          : ";expires=" + new Date(Date.now() + h * 1e3).toUTCString();
    this.h.cookie =
      a + "=" + b + c + g + h + d + (e != null ? ";samesite=" + e : "");
  };
  Pd.prototype.get = function (a, b) {
    for (
      var c = a + "=", d = (this.h.cookie || "").split(";"), e = 0, f;
      e < d.length;
      e++
    ) {
      f = Sa(d[e]);
      if (f.lastIndexOf(c, 0) == 0) return f.slice(c.length);
      if (f == a) return "";
    }
    return b;
  };
  Pd.prototype.remove = function (a, b, c) {
    var d = this.get(a) !== void 0;
    this.set(a, "", { Ia: 0, path: b, domain: c });
    return d;
  };
  Pd.prototype.clear = function () {
    for (
      var a = (this.h.cookie || "").split(";"), b = [], c = [], d, e, f = 0;
      f < a.length;
      f++
    )
      ((e = Sa(a[f])),
        (d = e.indexOf("=")),
        d == -1
          ? (b.push(""), c.push(e))
          : (b.push(e.substring(0, d)), c.push(e.substring(d + 1))));
    for (a = b.length - 1; a >= 0; a--) this.remove(b[a]);
  };
  function Qd(a, b, c, d) {
    (a = H[a]) || typeof document === "undefined" || (a = new Pd().get(b));
    return a ? Hd(a, c, d) : null;
  }
  function Rd(a) {
    var b,
      c = Fd((b = H) == null ? void 0 : b.location.href);
    b = [];
    var d;
    (d =
      H.__SAPISID ||
      H.__APISID ||
      H.__3PSAPISID ||
      H.__1PSAPISID ||
      H.__OVERRIDE_SID)
      ? (d = !0)
      : (typeof document !== "undefined" &&
          ((d = new Pd()),
          (d =
            d.get("SAPISID") ||
            d.get("APISID") ||
            d.get("__Secure-3PAPISID") ||
            d.get("__Secure-1PAPISID"))),
        (d = !!d));
    d &&
      ((d = (c =
        c.indexOf("https:") == 0 ||
        c.indexOf("chrome-extension:") == 0 ||
        c.indexOf("chrome-untrusted://new-tab-page") == 0 ||
        c.indexOf("moz-extension:") == 0)
        ? H.__SAPISID
        : H.__APISID),
      d ||
        typeof document === "undefined" ||
        ((d = new Pd()),
        (d = d.get(c ? "SAPISID" : "APISID") || d.get("__Secure-3PAPISID"))),
      (d = d ? Hd(d, c ? "SAPISIDHASH" : "APISIDHASH", a) : null) && b.push(d),
      c &&
        ((c = Qd("__1PSAPISID", "__Secure-1PAPISID", "SAPISID1PHASH", a)) &&
          b.push(c),
        (a = Qd("__3PSAPISID", "__Secure-3PAPISID", "SAPISID3PHASH", a)) &&
          b.push(a)));
    return b.length == 0 ? null : b.join(" ");
  }
  function Sd(a, b) {
    this.i = a;
    this.callback = b;
    this.enabled = !1;
    this.j = function () {
      return Date.now();
    };
    this.l = this.j();
  }
  Sd.prototype.setInterval = function (a) {
    this.i = a;
    this.h && this.enabled ? (Td(this), this.start()) : this.h && Td(this);
  };
  Sd.prototype.start = function () {
    var a = this;
    this.enabled = !0;
    this.h ||
      ((this.h = setTimeout(function () {
        Ud(a);
      }, this.i)),
      (this.l = this.j()));
  };
  function Td(a) {
    a.enabled = !1;
    a.h && (clearTimeout(a.h), (a.h = void 0));
  }
  function Ud(a) {
    if (a.enabled) {
      var b = Math.max(a.j() - a.l, 0);
      b < a.i * 0.8
        ? (a.h = setTimeout(function () {
            Ud(a);
          }, a.i - b))
        : (a.h && (clearTimeout(a.h), (a.h = void 0)),
          a.callback(),
          a.enabled && (Td(a), a.start()));
    } else a.h = void 0;
  }
  function Vd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(Vd, Y);
  function Xd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(Xd, Y);
  var Yd =
    "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(
      " ",
    );
  function Zd(a, b) {
    for (var c, d, e = 1; e < arguments.length; e++) {
      d = arguments[e];
      for (c in d) a[c] = d[c];
      for (var f = 0; f < Yd.length; f++)
        ((c = Yd[f]),
          Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]));
    }
  }
  "ARTICLE SECTION NAV ASIDE H1 H2 H3 H4 H5 H6 HEADER FOOTER ADDRESS P HR PRE BLOCKQUOTE OL UL LH LI DL DT DD FIGURE FIGCAPTION MAIN DIV EM STRONG SMALL S CITE Q DFN ABBR RUBY RB RT RTC RP DATA TIME CODE VAR SAMP KBD SUB SUP I B U MARK BDI BDO SPAN BR WBR NOBR INS DEL PICTURE PARAM TRACK MAP TABLE CAPTION COLGROUP COL TBODY THEAD TFOOT TR TD TH SELECT DATALIST OPTGROUP OPTION OUTPUT PROGRESS METER FIELDSET LEGEND DETAILS SUMMARY MENU DIALOG SLOT CANVAS FONT CENTER ACRONYM BASEFONT BIG DIR HGROUP STRIKE TT"
    .split(" ")
    .concat(["BUTTON", "INPUT"]);
  var $d = [
      "platform",
      "platformVersion",
      "architecture",
      "model",
      "uaFullVersion",
    ],
    ld = new jd(),
    ae = null;
  function be(a, b) {
    b = b === void 0 ? $d : b;
    if (!ae) {
      var c;
      a = (c = a.navigator) == null ? void 0 : c.userAgentData;
      if (
        !a ||
        typeof a.getHighEntropyValues !== "function" ||
        (a.brands && typeof a.brands.map !== "function")
      )
        return Promise.reject(Error("UACH unavailable"));
      kd(
        (a.brands || []).map(function (e) {
          var f = new id();
          f = X(f, 1, e.brand);
          return X(f, 2, e.version);
        }),
      );
      typeof a.mobile === "boolean" && U(ld, 2, ac(a.mobile));
      ae = a.getHighEntropyValues(b);
    }
    var d = new Set(b);
    return ae
      .then(function (e) {
        var f = Gc(ld);
        d.has("platform") && X(f, 3, e.platform);
        d.has("platformVersion") && X(f, 4, e.platformVersion);
        d.has("architecture") && X(f, 5, e.architecture);
        d.has("model") && X(f, 6, e.model);
        d.has("uaFullVersion") && X(f, 7, e.uaFullVersion);
        return f.serialize();
      })
      .catch(function () {
        return ld.serialize();
      });
  }
  function ce(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(ce, Y);
  function de(a) {
    return ad(a, 1, 1);
  }
  function ee(a) {
    this.m = T(a, 4, void 0, 2048);
  }
  y(ee, Y);
  function fe(a) {
    this.m = T(a, 37, void 0, 2048);
  }
  y(fe, Y);
  function ge(a) {
    this.m = T(a, 19, void 0, 2048);
  }
  y(ge, Y);
  ge.prototype.ga = function (a) {
    return ad(this, 2, a);
  };
  function he(a, b) {
    this.S = b = b === void 0 ? !1 : b;
    this.i = this.locale = null;
    this.l = 0;
    this.j = !1;
    this.h = new ge();
    Number.isInteger(a) && this.h.ga(a);
    b || (this.locale = document.documentElement.getAttribute("lang"));
    ie(this, new ce());
  }
  he.prototype.ga = function (a) {
    this.h.ga(a);
    return this;
  };
  function ie(a, b) {
    Wc(a.h, 1, b);
    $c(b) || de(b);
    if (!a.S) {
      b = je(a);
      var c = c === void 0 ? "" : c;
      var d = Mc(b, 5);
      d = d == null || typeof d === "string" ? d : void 0;
      (d != null ? d : c) || X(b, 5, a.locale);
    }
    a.i && ((c = je(a)), Vc(c, jd, 9) || Wc(c, 9, a.i));
  }
  function ke(a, b) {
    a.l = b;
  }
  function le(a) {
    var b = b === void 0 ? $d : b;
    var c = a.S ? void 0 : window;
    c
      ? be(c, b)
          .then(function (d) {
            a.i = md(d != null ? d : "[]");
            d = je(a);
            Wc(d, 9, a.i);
            return !0;
          })
          .catch(function () {
            return !1;
          })
      : Promise.resolve(!1);
  }
  function je(a) {
    var b = Vc(a.h, ce, 1);
    b || ((b = new ce()), ie(a, b));
    a = b;
    b = Vc(a, nd, 11);
    b || ((b = new nd()), Wc(a, 11, b));
    return b;
  }
  function me(a, b, c, d, e) {
    var f = 0,
      g = 0;
    c = c === void 0 ? 0 : c;
    d = d === void 0 ? 0 : d;
    e = e === void 0 ? null : e;
    f = f === void 0 ? 0 : f;
    g = g === void 0 ? 0 : g;
    if (!a.S) {
      var h = je(a);
      var k = new hd();
      k = ad(k, 1, a.l);
      k = U(k, 2, ac(a.j));
      d = U(k, 3, dc(d > 0 ? d : void 0));
      d = U(d, 4, dc(f > 0 ? f : void 0));
      d = U(d, 5, dc(g > 0 ? g : void 0));
      f = d.m;
      g = f[M] | 0;
      d = P(d, g)
        ? d
        : Cc(d, f, g)
          ? Dc(d, f)
          : new d.constructor(Bc(f, g, !0));
      Wc(h, 10, d);
    }
    a = Gc(a.h);
    h = Date.now().toString();
    a = U(a, 4, lc(h));
    b = b.slice();
    b = Xc(a, 3, b);
    e &&
      ((a = new Vd()),
      (e = U(a, 13, dc(e))),
      (a = new Xd()),
      (e = Wc(a, 2, e)),
      (a = new ee()),
      (e = Wc(a, 1, e)),
      (e = ad(e, 2, 9)),
      Wc(b, 18, e));
    c && U(b, 14, lc(c));
    return b;
  }
  function ne(a) {
    a && typeof a.dispose == "function" && a.dispose();
  }
  function Z() {
    this.F = this.F;
    this.o = this.o;
  }
  Z.prototype.F = !1;
  Z.prototype.dispose = function () {
    this.F || ((this.F = !0), this.T());
  };
  Z.prototype[Symbol.dispose] = function () {
    this.dispose();
  };
  function oe(a, b) {
    a.F ? b() : (a.o || (a.o = []), a.o.push(b));
  }
  Z.prototype.T = function () {
    if (this.o) for (; this.o.length;) this.o.shift()();
  };
  var pe = (function () {
    if (!H.addEventListener || !Object.defineProperty) return !1;
    var a = !1,
      b = Object.defineProperty({}, "passive", {
        get: function () {
          a = !0;
        },
      });
    try {
      var c = function () {};
      H.addEventListener("test", c, b);
      H.removeEventListener("test", c, b);
    } catch (d) {}
    return a;
  })();
  function qe(a) {
    this.i = this.h = this.j = a;
  }
  qe.prototype.reset = function () {
    this.i = this.h = this.j;
  };
  function cd(a) {
    this.m = T(a, 8, void 0, 2048);
  }
  y(cd, Y);
  var re = ed(cd);
  function dd(a) {
    this.m = T(a, void 0, void 0, 2048);
  }
  y(dd, Y);
  var se;
  se = new bd();
  function te(a) {
    Z.call(this);
    var b = this;
    this.B = "";
    this.i = [];
    this.W = "";
    this.ja = this.K = -1;
    this.G = null;
    this.J = this.u = 0;
    this.H = null;
    this.na = 1;
    this.timeoutMillis = 0;
    this.U = a.U;
    this.X = a.X || function () {};
    this.j = new he(a.U, a.S);
    this.D = a.D || null;
    this.aa = a.aa || null;
    this.bufferSize = 1e3;
    this.v = a.Oa || null;
    this.V = a.V || null;
    this.da = a.da || !1;
    this.withCredentials = !a.oa;
    this.S = a.S || !1;
    this.R =
      typeof URLSearchParams !== "undefined" &&
      !!new URL(ue()).searchParams &&
      !!new URL(ue()).searchParams.set;
    var c = de(new ce());
    ie(this.j, c);
    this.l = new qe(1e4);
    a = ve(this, a.ta);
    this.h = new Sd(this.l.h, a);
    this.P = new Sd(6e5, a);
    this.da || this.P.start();
    if (!this.S) {
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
          we(b);
          var f;
          (f = b.H) == null || f.flush();
        }
      });
      var d, e;
      (d = window) == null ||
        (e = d.addEventListener) == null ||
        e.call(d, "pagehide", function () {
          we(b);
          var f;
          (f = b.H) == null || f.flush();
        });
    }
  }
  y(te, Z);
  function ve(a, b) {
    function c() {
      a.flush();
    }
    return a.R
      ? b
        ? function () {
            b().then(c);
          }
        : c
      : function () {};
  }
  te.prototype.T = function () {
    we(this);
    Td(this.h);
    Td(this.P);
    Z.prototype.T.call(this);
  };
  function xe(a, b, c) {
    var d;
    (d = a.H) == null || d.ea(b, c);
  }
  te.prototype.log = function (a) {
    xe(this, 2, 1);
    if (this.R) {
      a = Gc(a);
      var b = this.na++;
      a = U(a, 21, lc(b));
      this.B && X(a, 26, this.B);
      b = a;
      var c = Mc(b, 1);
      var d = d === void 0 ? !1 : d;
      var e = typeof c;
      d =
        c == null
          ? c
          : e === "bigint"
            ? String(Xb(64, c))
            : cc(c)
              ? e === "string"
                ? hc(c)
                : d
                  ? ic(c)
                  : kc(c)
              : void 0;
      d == null &&
        ((d = Date.now()),
        (d = Number.isFinite(d) ? d.toString() : "0"),
        U(b, 1, lc(d)));
      d = Mc(b, 15, void 0, nc);
      if (d == null) var f = d;
      else
        typeof d === "bigint"
          ? Pb(d)
            ? (f = Number(d))
            : ((f = Xb(64, d)), (f = Pb(f) ? Number(f) : String(f)))
          : cc(d)
            ? typeof d === "number"
              ? (f = kc(d))
              : (f = hc(d))
            : (f = void 0);
      f == null && U(b, 15, lc(new Date().getTimezoneOffset() * 60));
      xe(this, 1, 1);
      b = this.i.length - this.bufferSize + 1;
      b > 0 && (this.i.splice(0, b), (this.u += b), xe(this, 3, b));
      this.i.push(a);
      this.da || this.h.enabled || this.h.start();
    }
  };
  te.prototype.flush = function (a, b) {
    var c = this;
    if (this.i.length === 0) a && a();
    else {
      var d = Date.now();
      if (this.ja > d && this.K < d) b && b("throttled");
      else {
        this.D &&
          (typeof this.D.ma === "function"
            ? ke(this.j, this.D.ma())
            : (this.j.l = 0));
        var e = this.i.length,
          f = me(this.j, this.i, this.u, this.J, this.aa),
          g = this.X();
        if (g && this.W === g) b && b("stale-auth-token");
        else {
          this.i = [];
          this.h.enabled && Td(this.h);
          this.u = 0;
          d = f.serialize();
          var h;
          this.G &&
            (d.length < this.G.Ja
              ? 0
              : typeof CompressionStream !== "undefined") &&
            (h = ye(d));
          var k = ze(this, d, g),
            l = function (m) {
              c.l.reset();
              c.h.setInterval(c.l.h);
              if (m) {
                var n = null;
                try {
                  var q = JSON.stringify(JSON.parse(m.replace(")]}'\n", "")));
                  n = re(q);
                } catch (x) {}
                if (n) {
                  m = Number(Zc(n, 1, Q("-1")));
                  m > 0 && ((c.K = Date.now()), (c.ja = c.K + m));
                  m = La(pb);
                  var t;
                  mb &&
                    m &&
                    ((t = n.m[m]) == null ? void 0 : t[175237375]) != null &&
                    kb(qb, 3);
                  a: {
                    var u = u === void 0 ? !1 : u;
                    if (La(vb) && La(pb) && void 0 === vb) {
                      t = n.m;
                      m = t[pb];
                      if (!m) break a;
                      if ((m = m.Ua))
                        try {
                          m(t, 175237375, sc);
                          break a;
                        } catch (x) {
                          Ra(x);
                        }
                    }
                    u &&
                      ((u = n.m),
                      (t = La(pb)) &&
                        t in u &&
                        (u = u[t]) &&
                        delete u[175237375]);
                  }
                  u = se.ctor
                    ? se.h(n, se.ctor, 175237375, se.i)
                    : se.h(n, 175237375, null, se.i);
                  if ((n = u === null ? void 0 : u)) {
                    u = -1;
                    u = u === void 0 ? 0 : u;
                    var F;
                    n = (F = ec(Mc(n, 1))) != null ? F : u;
                    n !== -1 &&
                      ((c.l = new qe(n < 1 ? 1 : n)), c.h.setInterval(c.l.h));
                  }
                }
              }
              a && a();
              c.J = 0;
            },
            p = function (m, n) {
              var q = f.m,
                t = q;
              q = q[M] | 0;
              var u = !P(f, q);
              u && Ic(f) && ((t = f.m), (q = t[M] | 0));
              var F = Nc(t, 3);
              var x = Array.isArray(F) ? F : zb;
              var B = x === zb ? 7 : x[M] | 0;
              F = B;
              2 & q && (F |= 2);
              var z = F | 1;
              if ((F = !(4 & z))) {
                var O = x,
                  W = q,
                  fa = !!(2 & z);
                fa && (W |= 2);
                for (
                  var ta = !fa, I = !0, yb = 0, Ec = 0;
                  yb < O.length;
                  yb++
                ) {
                  var Fc = pc(O[yb], fe, W);
                  if (Fc instanceof fe) {
                    if (!fa) {
                      var Wd = P(Fc);
                      ta && (ta = !Wd);
                      I && (I = Wd);
                    }
                    O[Ec++] = Fc;
                  }
                }
                Ec < yb && (O.length = Ec);
                z |= 4;
                z = I ? z & -4097 : z | 4096;
                z = ta ? z | 8 : z & -9;
              }
              z !== B && (N(x, z), 2 & z && Object.freeze(x));
              if (
                u &&
                !(8 & z || (!x.length && (2 & z || (!(16 & z) && 32 & q))))
              ) {
                Oc(z) && ((x = Wb(x)), (z = Yc(z, q)), (q = V(t, q, 3, x)));
                u = x;
                B = z;
                for (O = 0; O < u.length; O++)
                  ((z = u[O]), (W = Hc(z)), z !== W && (u[O] = W));
                B |= 8;
                z = B = u.length ? B | 4096 : B & -4097;
                N(x, z);
              }
              B = u = z;
              Oc(u) ||
                (2 & u || (!(16 & u) && 32 & q)
                  ? ((u |=
                      !x.length ||
                      (F && !(4096 & u)) ||
                      (32 & q && !(4096 & u || 16 & u))
                        ? 2
                        : 256),
                    u !== B && N(x, u),
                    Object.freeze(x))
                  : ((u |= 16), u !== B && N(x, u)));
              2 & u || !(4096 & u || 16 & u) || Kc(t, q);
              t = Number(Zc(f, 14));
              q = c.l;
              q.i = Math.min(3e5, q.i * 2);
              q.h = Math.min(
                3e5,
                q.i + Math.round(0.1 * (Math.random() - 0.5) * 2 * q.i),
              );
              c.h.setInterval(c.l.h);
              m === 401 && g && (c.W = g);
              t && (c.u += t);
              n === void 0 &&
                (n = (500 <= m && m < 600) || m === 401 || m === 0);
              n && ((c.i = x.concat(c.i)), c.da || c.h.enabled || c.h.start());
              xe(c, 7, 1);
              b && b("net-send-failed", m);
              ++c.J;
            },
            r = function () {
              c.D && c.D.send(k, l, p);
            };
          h
            ? h.then(
                function (m) {
                  xe(c, 5, e);
                  k.requestHeaders["Content-Encoding"] = "gzip";
                  k.requestHeaders["Content-Type"] = "application/binary";
                  k.body = m;
                  k.bodyType = 2;
                  r();
                },
                function () {
                  xe(c, 6, e);
                  r();
                },
              )
            : r();
        }
      }
    }
  };
  function ze(a, b, c) {
    c = c === void 0 ? null : c;
    var d = d === void 0 ? a.withCredentials : d;
    var e = {};
    a.v || (a.v = ue());
    try {
      var f = new URL(a.v).toString();
    } catch (g) {
      f = new URL(a.v, window.location.origin).toString();
    }
    f = new URL(f);
    c && (e.Authorization = c);
    a.V && ((e["X-Goog-AuthUser"] = a.V), f.searchParams.set("authuser", a.V));
    return {
      url: f.toString(),
      body: b,
      bodyType: 1,
      requestHeaders: e,
      requestType: "POST",
      withCredentials: d,
      timeoutMillis: a.timeoutMillis,
    };
  }
  function we(a) {
    a.j.j = !0;
    a.flush();
    a.j.j = !1;
  }
  function ue() {
    return "https://play.google.com/log?format=json&hasfast=true";
  }
  function Ae() {
    this.Ja = 1024;
  }
  function ye(a) {
    var b, c, d, e;
    return G(function (f) {
      switch (f.h) {
        case 1:
          return (
            (b = new CompressionStream("gzip")),
            (c = new Response(b.readable).arrayBuffer()),
            (d = b.writable.getWriter()),
            f.yield(d.write(new TextEncoder().encode(a)), 2)
          );
        case 2:
          return f.yield(d.close(), 3);
        case 3:
          return ((e = Uint8Array), f.yield(c, 4));
        case 4:
          return f.return(new e(f.i));
      }
    });
  }
  function Be() {
    this.Ba = typeof AbortController !== "undefined";
  }
  Be.prototype.send = function (a, b, c) {
    var d = this,
      e,
      f,
      g,
      h,
      k,
      l,
      p,
      r,
      m,
      n;
    return G(function (q) {
      switch (q.h) {
        case 1:
          return (
            (f =
              (e = d.Ba ? new AbortController() : void 0) && a.timeoutMillis > 0
                ? setTimeout(function () {
                    e.abort();
                  }, a.timeoutMillis)
                : void 0),
            q.v(2, 3),
            (g = Object.assign(
              {},
              {
                method: a.requestType,
                headers: Object.assign({}, a.requestHeaders),
              },
              a.body && { body: a.body },
              a.withCredentials && { credentials: "include" },
              { signal: a.timeoutMillis && e ? e.signal : null },
            )),
            q.yield(fetch(a.url, g), 5)
          );
        case 5:
          h = q.i;
          if (h.status !== 200) {
            (k = c) == null || k(h.status);
            q.A(3);
            break;
          }
          if ((l = b) == null) {
            q.A(7);
            break;
          }
          return q.yield(h.text(), 8);
        case 8:
          l(q.i);
        case 7:
        case 3:
          q.B();
          clearTimeout(f);
          q.G(0);
          break;
        case 2:
          p = q.F();
          switch ((r = p) == null ? void 0 : r.name) {
            case "AbortError":
              (m = c) == null || m(408);
              break;
            default:
              (n = c) == null || n(400);
          }
          q.A(3);
      }
    });
  };
  Be.prototype.ma = function () {
    return 4;
  };
  function Ce(a, b) {
    b = b === void 0 ? "0" : b;
    Z.call(this);
    this.U = a;
    this.V = b;
    this.l = "https://play.google.com/log?format=json&hasfast=true";
    this.i = null;
    this.j = !1;
    this.D = null;
    this.h = "";
    this.aa = null;
    this.u = !0;
    this.bufferSize = void 0;
  }
  y(Ce, Z);
  function De(a, b) {
    a.D = b;
    return a;
  }
  function Ee(a) {
    var b = new Ce(3091, "0");
    b.j = !0;
    b = b.oa();
    b.u = !1;
    b.X = a;
    return b;
  }
  Ce.prototype.oa = function () {
    this.v = !0;
    return this;
  };
  function Fe(a) {
    a.D || (a.D = new Be());
    var b = new te({
      U: a.U,
      X: a.X ? a.X : Rd,
      V: a.V,
      Oa: a.l,
      S: a.j,
      da: !1,
      oa: a.v,
      ta: a.ta,
      D: a.D,
    });
    oe(a, Ja(ne, b));
    if (a.i) {
      var c = a.i,
        d = je(b.j);
      X(d, 7, c);
    }
    b.G = new Ae();
    a.h && (b.B = a.h);
    a.aa && (b.aa = a.aa);
    a.u && le(b.j);
    a.bufferSize && (b.bufferSize = a.bufferSize);
    a.D.ga && a.D.ga(a.U);
    a.D.Ma && a.D.Ma(b);
    return b;
  }
  function Ge(a, b, c, d, e, f, g) {
    a = a === void 0 ? -1 : a;
    b = b === void 0 ? "" : b;
    c = c === void 0 ? "" : c;
    d = d === void 0 ? !1 : d;
    e = e === void 0 ? "" : e;
    Z.call(this);
    this.U = a;
    f
      ? (b = f)
      : ((a = new Ce(a, "0")),
        (a.h = b),
        oe(this, Ja(ne, a)),
        c !== "" && (a.l = c),
        d && (a.j = !0),
        e && (a.i = e),
        g && De(a, g),
        (b = Fe(a)));
    this.h = b;
  }
  y(Ge, Z);
  Ge.prototype.flush = function (a) {
    var b = a || [];
    if (b.length) {
      a = new Ed();
      for (var c = [], d = 0; d < b.length; d++) {
        var e = b[d],
          f = new Dd();
        f = X(f, 1, e.j);
        var g = He(e);
        var h;
        Jc(f);
        var k = f.m;
        var l = k[M] | 0;
        if (g == null) V(k, l, 3);
        else {
          var p = g === zb ? 7 : g[M] | 0,
            r = p,
            m = (h = Oc(p)) || Object.isFrozen(g);
          h || (p = 0);
          m || ((g = Wb(g)), (r = 0), (p = Yc(p, l)), (m = !1));
          p |= 5;
          h = 4 & p ? (512 & p ? 512 : 1024 & p ? 1024 : 0) : void 0;
          p |= h != null ? h : 1024;
          for (var n = 0; n < g.length; n++) {
            h = g[n];
            if (typeof h !== "string") throw Error();
            var q = h;
            Object.is(h, q) ||
              (m && ((g = Wb(g)), (r = 0), (p = Yc(p, l)), (m = !1)),
              (g[n] = q));
          }
          p !== r && (m && ((g = Wb(g)), (p = Yc(p, l))), N(g, p));
          V(k, l, 3, g);
        }
        g = [];
        k = [];
        l = A(e.h.keys());
        p = l.next();
        try {
          for (; !p.done; p = l.next()) k.push(p.value.split(","));
        } finally {
          oa(l, p);
        }
        l = k;
        for (p = 0; p < l.length; p++) {
          k = l[p];
          r = e.o;
          m = e.wa.apply(e, C(k)) || [];
          h = [];
          for (n = 0; n < m.length; n++) {
            var t = (q = m[n]) && q.h;
            q = new Ad();
            switch (r) {
              case 3:
                t = Number(t);
                Number.isFinite(t) && Rc(q, 1, Bd, lc(t));
                break;
              case 2:
                t = Number(t);
                if (t != null && typeof t !== "number")
                  throw Error(
                    "Value of float/double field must be a number, found " +
                      typeof t +
                      ": " +
                      t,
                  );
                Rc(q, 2, Bd, t);
            }
            h.push(q);
          }
          r = h;
          for (m = 0; m < r.length; m++) {
            h = r[m];
            n = new Cd();
            h = Wc(n, 2, h);
            n = k;
            q = [];
            t = Ie(e);
            for (var u = 0; u < t.length; u++) {
              var F = t[u];
              var x = n[u],
                B = new yd();
              switch (F) {
                case 3:
                  Rc(B, 1, zd, oc(String(x)));
                  break;
                case 2:
                  F = Number(x);
                  Number.isFinite(F) && Rc(B, 2, zd, dc(F));
                  break;
                case 1:
                  Rc(B, 3, zd, ac(x === "true"));
              }
              q.push(B);
            }
            Xc(h, 1, q);
            g.push(h);
          }
        }
        Xc(f, 4, g);
        c.push(f);
        e.clear();
      }
      Xc(a, 1, c);
      b = this.h;
      if (a instanceof fe) b.log(a);
      else
        try {
          var z = new fe(),
            O = a.serialize();
          var W = X(z, 8, O);
          b.log(W);
        } catch (fa) {
          xe(b, 4, 1);
        }
      this.h.flush();
    }
  };
  function Je(a) {
    this.h = a;
  }
  function Ke(a, b, c) {
    this.j = a;
    this.o = b;
    this.i = c || [];
    this.h = new Map();
  }
  function Ie(a) {
    return a.i.map(function (b) {
      return b.Fa;
    });
  }
  function He(a) {
    return a.i.map(function (b) {
      return b.Ea;
    });
  }
  v = Ke.prototype;
  v.La = function (a) {
    var b = this.qa.apply(this, C(Ba.apply(1, arguments)));
    this.h.set(b, [new Je(a)]);
  };
  v.wa = function () {
    var a = this.qa.apply(this, C(Ba.apply(0, arguments)));
    return this.h.has(a) ? this.h.get(a) : void 0;
  };
  v.Ga = function () {
    var a = this.wa.apply(this, C(Ba.apply(0, arguments)));
    return a && a.length ? a[0] : void 0;
  };
  v.clear = function () {
    this.h.clear();
  };
  v.qa = function () {
    var a = Ba.apply(0, arguments);
    return a ? a.join(",") : "key";
  };
  function Le(a, b) {
    Ke.call(this, a, 3, b);
  }
  y(Le, Ke);
  Le.prototype.l = function (a) {
    var b = Ba.apply(1, arguments),
      c = 0,
      d = this.Ga.apply(this, C(b));
    d && (c = d.h);
    this.La.apply(this, [c + a].concat(C(b)));
  };
  function Me(a, b) {
    this.type = a;
    this.h = this.target = b;
    this.defaultPrevented = !1;
  }
  Me.prototype.i = function () {
    this.defaultPrevented = !0;
  };
  function Ne(a, b) {
    Me.call(this, a ? a.type : "");
    this.relatedTarget = this.h = this.target = null;
    this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0;
    this.key = "";
    this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
    this.state = null;
    this.pointerId = 0;
    this.pointerType = "";
    this.j = null;
    a && this.init(a, b);
  }
  Ma(Ne, Me);
  Ne.prototype.init = function (a, b) {
    var c = (this.type = a.type),
      d =
        a.changedTouches && a.changedTouches.length
          ? a.changedTouches[0]
          : null;
    this.target = a.target || a.srcElement;
    this.h = b;
    b = a.relatedTarget;
    b ||
      (c == "mouseover"
        ? (b = a.fromElement)
        : c == "mouseout" && (b = a.toElement));
    this.relatedTarget = b;
    d
      ? ((this.clientX = d.clientX !== void 0 ? d.clientX : d.pageX),
        (this.clientY = d.clientY !== void 0 ? d.clientY : d.pageY),
        (this.screenX = d.screenX || 0),
        (this.screenY = d.screenY || 0))
      : ((this.clientX = a.clientX !== void 0 ? a.clientX : a.pageX),
        (this.clientY = a.clientY !== void 0 ? a.clientY : a.pageY),
        (this.screenX = a.screenX || 0),
        (this.screenY = a.screenY || 0));
    this.button = a.button;
    this.key = a.key || "";
    this.ctrlKey = a.ctrlKey;
    this.altKey = a.altKey;
    this.shiftKey = a.shiftKey;
    this.metaKey = a.metaKey;
    this.pointerId = a.pointerId || 0;
    this.pointerType = a.pointerType;
    this.state = a.state;
    this.j = a;
    a.defaultPrevented && Ne.ia.i.call(this);
  };
  Ne.prototype.i = function () {
    Ne.ia.i.call(this);
    var a = this.j;
    a.preventDefault ? a.preventDefault() : (a.returnValue = !1);
  };
  var Oe = "closure_listenable_" + ((Math.random() * 1e6) | 0);
  var Pe = 0;
  function Qe(a, b, c, d, e) {
    this.listener = a;
    this.proxy = null;
    this.src = b;
    this.type = c;
    this.capture = !!d;
    this.handler = e;
    this.key = ++Pe;
    this.fa = this.ka = !1;
  }
  function Re(a) {
    a.fa = !0;
    a.listener = null;
    a.proxy = null;
    a.src = null;
    a.handler = null;
  }
  function Se(a) {
    this.src = a;
    this.listeners = {};
    this.h = 0;
  }
  Se.prototype.add = function (a, b, c, d, e) {
    var f = a.toString();
    a = this.listeners[f];
    a || ((a = this.listeners[f] = []), this.h++);
    var g = Te(a, b, d, e);
    g > -1
      ? ((b = a[g]), c || (b.ka = !1))
      : ((b = new Qe(b, this.src, f, !!d, e)), (b.ka = c), a.push(b));
    return b;
  };
  Se.prototype.remove = function (a, b, c, d) {
    a = a.toString();
    if (!(a in this.listeners)) return !1;
    var e = this.listeners[a];
    b = Te(e, b, c, d);
    return b > -1
      ? (Re(e[b]),
        Array.prototype.splice.call(e, b, 1),
        e.length == 0 && (delete this.listeners[a], this.h--),
        !0)
      : !1;
  };
  function Ue(a, b) {
    var c = b.type;
    if (c in a.listeners) {
      var d = a.listeners[c],
        e = eb(d, b),
        f;
      (f = e >= 0) && Array.prototype.splice.call(d, e, 1);
      f &&
        (Re(b), a.listeners[c].length == 0 && (delete a.listeners[c], a.h--));
    }
  }
  function Te(a, b, c, d) {
    for (var e = 0; e < a.length; ++e) {
      var f = a[e];
      if (!f.fa && f.listener == b && f.capture == !!c && f.handler == d)
        return e;
    }
    return -1;
  }
  var Ve = "closure_lm_" + ((Math.random() * 1e6) | 0),
    We = {},
    Xe = 0;
  function Ye(a, b, c, d, e) {
    if (d && d.once) Ze(a, b, c, d, e);
    else if (Array.isArray(b))
      for (var f = 0; f < b.length; f++) Ye(a, b[f], c, d, e);
    else
      ((c = $e(c)),
        a && a[Oe]
          ? a.listen(b, c, Fa(d) ? !!d.capture : !!d, e)
          : af(a, b, c, !1, d, e));
  }
  function af(a, b, c, d, e, f) {
    if (!b) throw Error("Invalid event type");
    var g = Fa(e) ? !!e.capture : !!e,
      h = bf(a);
    h || (a[Ve] = h = new Se(a));
    c = h.add(b, c, d, g, f);
    if (!c.proxy) {
      d = cf();
      c.proxy = d;
      d.src = a;
      d.listener = c;
      if (a.addEventListener)
        (pe || (e = g),
          e === void 0 && (e = !1),
          a.addEventListener(b.toString(), d, e));
      else if (a.attachEvent) a.attachEvent(df(b.toString()), d);
      else if (a.addListener && a.removeListener) a.addListener(d);
      else throw Error("addEventListener and attachEvent are unavailable.");
      Xe++;
    }
  }
  function cf() {
    function a(c) {
      return b.call(a.src, a.listener, c);
    }
    var b = ef;
    return a;
  }
  function Ze(a, b, c, d, e) {
    if (Array.isArray(b))
      for (var f = 0; f < b.length; f++) Ze(a, b[f], c, d, e);
    else
      ((c = $e(c)),
        a && a[Oe]
          ? a.h.add(String(b), c, !0, Fa(d) ? !!d.capture : !!d, e)
          : af(a, b, c, !0, d, e));
  }
  function ff(a, b, c, d, e) {
    if (Array.isArray(b))
      for (var f = 0; f < b.length; f++) ff(a, b[f], c, d, e);
    else
      ((d = Fa(d) ? !!d.capture : !!d), (c = $e(c)), a && a[Oe])
        ? a.h.remove(String(b), c, d, e)
        : a &&
          (a = bf(a)) &&
          ((b = a.listeners[b.toString()]),
          (a = -1),
          b && (a = Te(b, c, d, e)),
          (c = a > -1 ? b[a] : null) && gf(c));
  }
  function gf(a) {
    if (typeof a !== "number" && a && !a.fa) {
      var b = a.src;
      if (b && b[Oe]) Ue(b.h, a);
      else {
        var c = a.type,
          d = a.proxy;
        b.removeEventListener
          ? b.removeEventListener(c, d, a.capture)
          : b.detachEvent
            ? b.detachEvent(df(c), d)
            : b.addListener && b.removeListener && b.removeListener(d);
        Xe--;
        (c = bf(b))
          ? (Ue(c, a), c.h == 0 && ((c.src = null), (b[Ve] = null)))
          : Re(a);
      }
    }
  }
  function df(a) {
    return a in We ? We[a] : (We[a] = "on" + a);
  }
  function ef(a, b) {
    if (a.fa) a = !0;
    else {
      b = new Ne(b, this);
      var c = a.listener,
        d = a.handler || a.src;
      a.ka && gf(a);
      a = c.call(d, b);
    }
    return a;
  }
  function bf(a) {
    a = a[Ve];
    return a instanceof Se ? a : null;
  }
  var hf = "__closure_events_fn_" + ((Math.random() * 1e9) >>> 0);
  function $e(a) {
    if (typeof a === "function") return a;
    a[hf] ||
      (a[hf] = function (b) {
        return a.handleEvent(b);
      });
    return a[hf];
  }
  function jf() {
    Z.call(this);
    this.h = new Se(this);
    this.B = this;
    this.l = null;
  }
  Ma(jf, Z);
  jf.prototype[Oe] = !0;
  v = jf.prototype;
  v.addEventListener = function (a, b, c, d) {
    Ye(this, a, b, c, d);
  };
  v.removeEventListener = function (a, b, c, d) {
    ff(this, a, b, c, d);
  };
  v.T = function () {
    jf.ia.T.call(this);
    this.removeAllListeners();
    this.l = null;
  };
  v.listen = function (a, b, c, d) {
    return this.h.add(String(a), b, !1, c, d);
  };
  v.removeAllListeners = function (a) {
    if (this.h) {
      var b = this.h;
      a = a && a.toString();
      var c = 0,
        d;
      for (d in b.listeners)
        if (!a || d == a) {
          for (var e = b.listeners[d], f = 0; f < e.length; f++)
            (++c, Re(e[f]));
          delete b.listeners[d];
          b.h--;
        }
      b = c;
    } else b = 0;
    return b;
  };
  function kf(a, b, c, d) {
    b = a.h.listeners[String(b)];
    if (!b) return !0;
    b = b.concat();
    for (var e = !0, f = 0; f < b.length; ++f) {
      var g = b[f];
      if (g && !g.fa && g.capture == c) {
        var h = g.listener,
          k = g.handler || g.src;
        g.ka && Ue(a.h, g);
        e = h.call(k, d) !== !1 && e;
      }
    }
    return e && !d.defaultPrevented;
  }
  function lf(a, b) {
    jf.call(this);
    this.j = a || 1;
    this.i = b || mf;
    this.u = Ia(this.Na, this);
    this.v = Date.now();
  }
  Ma(lf, jf);
  lf.prototype.enabled = !1;
  var mf = H;
  v = lf.prototype;
  v.I = null;
  v.setInterval = function (a) {
    this.j = a;
    this.I && this.enabled ? (nf(this), this.start()) : this.I && nf(this);
  };
  v.Na = function () {
    if (this.enabled) {
      var a = Date.now() - this.v;
      if (a > 0 && a < this.j * 0.8)
        this.I = this.i.setTimeout(this.u, this.j - a);
      else {
        this.I && (this.i.clearTimeout(this.I), (this.I = null));
        var b;
        if ((a = this.l)) for (b = []; a; a = a.l) b.push(a);
        a = this.B;
        var c = "tick",
          d = c.type || c;
        if (typeof c === "string") c = new Me(c, a);
        else if (c instanceof Me) c.target = c.target || a;
        else {
          var e = c;
          c = new Me(d, a);
          Zd(c, e);
        }
        e = !0;
        var f;
        if (b)
          for (f = b.length - 1; f >= 0; f--) {
            var g = (c.h = b[f]);
            e = kf(g, d, !0, c) && e;
          }
        g = c.h = a;
        e = kf(g, d, !0, c) && e;
        e = kf(g, d, !1, c) && e;
        if (b)
          for (f = 0; f < b.length; f++)
            ((g = c.h = b[f]), (e = kf(g, d, !1, c) && e));
        this.enabled && (nf(this), this.start());
      }
    }
  };
  v.start = function () {
    this.enabled = !0;
    this.I ||
      ((this.I = this.i.setTimeout(this.u, this.j)), (this.v = Date.now()));
  };
  function nf(a) {
    a.enabled = !1;
    a.I && (a.i.clearTimeout(a.I), (a.I = null));
  }
  v.T = function () {
    lf.ia.T.call(this);
    nf(this);
    delete this.i;
  };
  function of(a) {
    Z.call(this);
    this.B = a;
    this.j = 0;
    this.l = 100;
    this.u = !1;
    this.i = new Map();
    this.v = new Set();
    this.h = new lf(3e4);
    this.h.listen("tick", this.pa, !1, this);
    oe(this, Ja(ne, this.h));
  }
  y(of, Z);
  function pf() {
    var a = Pa;
    a.u = !0;
    a.l = 1;
  }
  v = of.prototype;
  v.pa = function () {
    var a = this.i.values();
    a = [].concat(C(a)).filter(function (b) {
      return b.h.size;
    });
    a.length && this.B.flush(a, this.u);
    qf(a);
    this.j = 0;
    this.h.enabled && nf(this.h);
  };
  v.sa = function (a) {
    var b = Ba.apply(1, arguments);
    this.i.has(a) || this.i.set(a, new Le(a, b));
  };
  v.Y = function (a) {
    return this.v.has(a) ? void 0 : this.i.get(a);
  };
  v.ra = function (a) {
    this.za.apply(this, [a, 1].concat(C(Ba.apply(1, arguments))));
  };
  v.za = function (a, b) {
    var c = Ba.apply(2, arguments),
      d = this.Y(a);
    d &&
      d instanceof Le &&
      (d.l.apply(d, [b].concat(C(c))),
      this.h.enabled || this.h.start(),
      this.j++,
      this.j >= this.l && this.pa());
  };
  v.record = function (a) {
    this.Y(a);
  };
  function qf(a) {
    for (var b = 0; b < a.length; b++) a[b].clear();
  }
  mf = H = globalThis;
  var rf,
    sf,
    Pa,
    tf,
    uf,
    vf = [];
  Ka("geminiWindowsStreamz.init", function (a, b) {
    if (!Pa) {
      rf = new od(a, b);
      qd(rf);
      a = Fe(
        De(
          Ee(function () {
            return null;
          }),
          rf,
        ),
      );
      sf = new Ge(3091, "", "", !1, "", a);
      Pa = new of(sf);
      pf();
      tf = new Oa();
      uf = new Qa();
      a = A(vf);
      b = a.next();
      try {
        for (; !b.done; b = a.next()) {
          var c = b.value;
          uf.ea(c.channel, c.appVersion, c.Ka, c.reason);
        }
      } finally {
        oa(a, b);
      }
      vf = [];
    }
  });
  Ka("geminiWindowsStreamz.logClientLaunchedCount", function (a, b) {
    tf && tf.ea(a, b);
  });
  Ka("geminiWindowsStreamz.logClientCrashedCount", function (a, b, c, d) {
    uf
      ? uf.ea(a, b, c, d)
      : vf.length < 32 &&
        vf.push({ channel: a, appVersion: b, Ka: c, reason: d });
  });
  Ka("geminiWindowsStreamz.flush", function () {
    var a;
    return G(function (b) {
      (a = Pa) == null || a.pa();
      return rf ? b.yield(qd(rf), 0) : b.A(0);
    });
  });
}).call(this);
