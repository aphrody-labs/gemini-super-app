// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {
  css,
  CrLitElement,
  html,
  nothing,
} from "chrome://resources/lit/v3_0/lit.rollup.js";
import { loadTimeData } from "chrome://resources/js/load_time_data.js";
import { mojo } from "chrome://resources/mojo/mojo/public/js/bindings.js";
const CLASS_NAME = "focus-outline-visible";
const docsToManager = new Map();
class FocusOutlineManager {
  focusByKeyboard_ = true;
  classList_;
  constructor(doc) {
    this.classList_ = doc.documentElement.classList;
    doc.addEventListener("keydown", (e) => this.onEvent_(true, e), true);
    doc.addEventListener("mousedown", (e) => this.onEvent_(false, e), true);
    this.updateVisibility();
  }
  onEvent_(focusByKeyboard, e) {
    if (this.focusByKeyboard_ === focusByKeyboard) {
      return;
    }
    if (e instanceof KeyboardEvent && e.repeat) {
      return;
    }
    this.focusByKeyboard_ = focusByKeyboard;
    this.updateVisibility();
  }
  updateVisibility() {
    this.visible = this.focusByKeyboard_;
  }
  set visible(visible) {
    this.classList_.toggle(CLASS_NAME, visible);
  }
  get visible() {
    return this.classList_.contains(CLASS_NAME);
  }
  static forDocument(doc) {
    let manager = docsToManager.get(doc);
    if (!manager) {
      manager = new FocusOutlineManager(doc);
      docsToManager.set(doc, manager);
    }
    return manager;
  }
}
const isMac = /Mac/.test(navigator.platform);
function assert(value, message) {
  if (value) {
    return;
  }
  throw new Error("Assertion failed" + "");
}
class EventTracker {
  listeners_ = [];
  add(target, eventType, listener, capture = false) {
    const h = {
      target: target,
      eventType: eventType,
      listener: listener,
      capture: capture,
    };
    this.listeners_.push(h);
    target.addEventListener(eventType, listener, capture);
  }
  remove(target, eventType) {
    this.listeners_ = this.listeners_.filter((listener) => {
      if (
        listener.target === target &&
        (!eventType || listener.eventType === eventType)
      ) {
        EventTracker.removeEventListener(listener);
        return false;
      }
      return true;
    });
  }
  removeAll() {
    this.listeners_.forEach((listener) =>
      EventTracker.removeEventListener(listener),
    );
    this.listeners_ = [];
  }
  static removeEventListener(entry) {
    entry.target.removeEventListener(
      entry.eventType,
      entry.listener,
      entry.capture,
    );
  }
}
let instance$5 = null;
function getCss$5() {
  return (
    instance$5 ||
    (instance$5 = [
      ...[],
      css`
        :host {
          bottom: 0;
          display: block;
          left: 0;
          overflow: hidden;
          pointer-events: none;
          position: absolute;
          right: 0;
          top: 0;
          transform: translate3d(0, 0, 0);
        }
        .ripple {
          background-color: currentcolor;
          left: 0;
          opacity: var(--paper-ripple-opacity, 0.25);
          pointer-events: none;
          position: absolute;
          will-change: height, transform, width;
        }
        .ripple,
        :host(.circle) {
          border-radius: 50%;
        }
      `,
    ])
  );
}
const MAX_RADIUS_PX = 300;
const MIN_DURATION_MS = 800;
function distance(x1, y1, x2, y2) {
  const xDelta = x1 - x2;
  const yDelta = y1 - y2;
  return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
}
class CrRippleElement extends CrLitElement {
  static get is() {
    return "cr-ripple";
  }
  static get styles() {
    return getCss$5();
  }
  static get properties() {
    return {
      holdDown: { type: Boolean },
      recenters: { type: Boolean },
      noink: { type: Boolean },
    };
  }
  #holdDown_accessor_storage = false;
  get holdDown() {
    return this.#holdDown_accessor_storage;
  }
  set holdDown(value) {
    this.#holdDown_accessor_storage = value;
  }
  #recenters_accessor_storage = false;
  get recenters() {
    return this.#recenters_accessor_storage;
  }
  set recenters(value) {
    this.#recenters_accessor_storage = value;
  }
  #noink_accessor_storage = false;
  get noink() {
    return this.#noink_accessor_storage;
  }
  set noink(value) {
    this.#noink_accessor_storage = value;
  }
  ripples_ = [];
  eventTracker_ = new EventTracker();
  connectedCallback() {
    super.connectedCallback();
    assert(this.parentNode);
    const keyEventTarget =
      this.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ? this.parentNode.host
        : this.parentElement;
    this.eventTracker_.add(keyEventTarget, "pointerdown", (e) =>
      this.uiDownAction(e),
    );
    this.eventTracker_.add(keyEventTarget, "pointerup", () =>
      this.uiUpAction(),
    );
    this.eventTracker_.add(keyEventTarget, "pointerout", () =>
      this.uiUpAction(),
    );
    this.eventTracker_.add(keyEventTarget, "keydown", (e) => {
      if (e.defaultPrevented) {
        return;
      }
      if (e.key === "Enter") {
        this.onEnterKeydown_();
        return;
      }
      if (e.key === " ") {
        this.onSpaceKeydown_();
      }
    });
    this.eventTracker_.add(keyEventTarget, "keyup", (e) => {
      if (e.defaultPrevented) {
        return;
      }
      if (e.key === " ") {
        this.onSpaceKeyup_();
      }
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.eventTracker_.removeAll();
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("holdDown")) {
      this.holdDownChanged_(this.holdDown, changedProperties.get("holdDown"));
    }
  }
  uiDownAction(e) {
    if (e !== undefined && e.button !== 0) {
      return;
    }
    if (!this.noink) {
      this.downAction_(e);
    }
  }
  downAction_(e) {
    if (this.ripples_.length && this.holdDown) {
      return;
    }
    this.showRipple_(e);
  }
  clear() {
    this.hideRipple_();
    this.holdDown = false;
  }
  showAndHoldDown() {
    this.ripples_.forEach((ripple) => {
      ripple.remove();
    });
    this.ripples_ = [];
    this.holdDown = true;
  }
  showRipple_(e) {
    const rect = this.getBoundingClientRect();
    const roundedCenterX = function () {
      return Math.round(rect.width / 2);
    };
    const roundedCenterY = function () {
      return Math.round(rect.height / 2);
    };
    let x = 0;
    let y = 0;
    const centered = !e;
    if (centered) {
      x = roundedCenterX();
      y = roundedCenterY();
    } else {
      x = Math.round(e.clientX - rect.left);
      y = Math.round(e.clientY - rect.top);
    }
    const corners = [
      { x: 0, y: 0 },
      { x: rect.width, y: 0 },
      { x: 0, y: rect.height },
      { x: rect.width, y: rect.height },
    ];
    const cornerDistances = corners.map(function (corner) {
      return Math.round(distance(x, y, corner.x, corner.y));
    });
    const radius = Math.min(
      MAX_RADIUS_PX,
      Math.max.apply(Math, cornerDistances),
    );
    const startTranslate = `${x - radius}px, ${y - radius}px`;
    let endTranslate = startTranslate;
    if (this.recenters && !centered) {
      endTranslate = `${roundedCenterX() - radius}px, ${roundedCenterY() - radius}px`;
    }
    const ripple = document.createElement("div");
    ripple.classList.add("ripple");
    ripple.style.height = ripple.style.width = 2 * radius + "px";
    this.ripples_.push(ripple);
    this.shadowRoot.appendChild(ripple);
    ripple.animate(
      {
        transform: [
          `translate(${startTranslate}) scale(0)`,
          `translate(${endTranslate}) scale(1)`,
        ],
      },
      {
        duration: Math.max(MIN_DURATION_MS, Math.log(radius) * radius) || 0,
        easing: "cubic-bezier(.2, .9, .1, .9)",
        fill: "forwards",
      },
    );
  }
  uiUpAction() {
    if (!this.noink) {
      this.upAction_();
    }
  }
  upAction_() {
    if (!this.holdDown) {
      this.hideRipple_();
    }
  }
  hideRipple_() {
    if (this.ripples_.length === 0) {
      return;
    }
    this.ripples_.forEach(function (ripple) {
      const opacity = ripple.computedStyleMap().get("opacity") ?? null;
      if (opacity === null) {
        ripple.remove();
        return;
      }
      const animation = ripple.animate(
        { opacity: [opacity.value, 0] },
        { duration: 150, fill: "forwards" },
      );
      animation.finished.then(() => {
        ripple.remove();
      });
    });
    this.ripples_ = [];
  }
  onEnterKeydown_() {
    this.uiDownAction();
    window.setTimeout(() => {
      this.uiUpAction();
    }, 1);
  }
  onSpaceKeydown_() {
    this.uiDownAction();
  }
  onSpaceKeyup_() {
    this.uiUpAction();
  }
  holdDownChanged_(newHoldDown, oldHoldDown) {
    if (oldHoldDown === undefined) {
      return;
    }
    if (newHoldDown) {
      this.downAction_();
    } else {
      this.upAction_();
    }
  }
}
customElements.define(CrRippleElement.is, CrRippleElement);
const CrRippleMixin = (superClass) => {
  class CrRippleMixin extends superClass {
    static get properties() {
      return { noink: { type: Boolean } };
    }
    #noink_accessor_storage = false;
    get noink() {
      return this.#noink_accessor_storage;
    }
    set noink(value) {
      this.#noink_accessor_storage = value;
    }
    rippleContainer = null;
    ripple_ = null;
    updated(changedProperties) {
      super.updated(changedProperties);
      if (changedProperties.has("noink") && this.hasRipple()) {
        assert(this.ripple_);
        this.ripple_.noink = this.noink;
      }
    }
    ensureRippleOnPointerdown() {
      this.addEventListener("pointerdown", () => this.ensureRipple(), {
        capture: true,
      });
    }
    ensureRipple() {
      if (this.hasRipple()) {
        return;
      }
      this.ripple_ = this.createRipple();
      this.ripple_.noink = this.noink;
      const rippleContainer = this.rippleContainer || this.shadowRoot;
      assert(rippleContainer);
      rippleContainer.appendChild(this.ripple_);
    }
    getRipple() {
      this.ensureRipple();
      assert(this.ripple_);
      return this.ripple_;
    }
    hasRipple() {
      return Boolean(this.ripple_);
    }
    createRipple() {
      const ripple = document.createElement("cr-ripple");
      ripple.id = "ink";
      return ripple;
    }
  }
  return CrRippleMixin;
};
let instance$4 = null;
function getCss$4() {
  return (
    instance$4 ||
    (instance$4 = [
      ...[],
      css`
        [hidden],
        :host([hidden]) {
          display: none !important;
        }
      `,
    ])
  );
}
const sheet = new CSSStyleSheet();
sheet.replaceSync(
  `html{--google-blue-50-rgb:232,240,254;--google-blue-50:rgb(var(--google-blue-50-rgb));--google-blue-100-rgb:210,227,252;--google-blue-100:rgb(var(--google-blue-100-rgb));--google-blue-200-rgb:174,203,250;--google-blue-200:rgb(var(--google-blue-200-rgb));--google-blue-300-rgb:138,180,248;--google-blue-300:rgb(var(--google-blue-300-rgb));--google-blue-400-rgb:102,157,246;--google-blue-400:rgb(var(--google-blue-400-rgb));--google-blue-500-rgb:66,133,244;--google-blue-500:rgb(var(--google-blue-500-rgb));--google-blue-600-rgb:26,115,232;--google-blue-600:rgb(var(--google-blue-600-rgb));--google-blue-700-rgb:25,103,210;--google-blue-700:rgb(var(--google-blue-700-rgb));--google-blue-800-rgb:24,90,188;--google-blue-800:rgb(var(--google-blue-800-rgb));--google-blue-900-rgb:23,78,166;--google-blue-900:rgb(var(--google-blue-900-rgb));--google-green-50-rgb:230,244,234;--google-green-50:rgb(var(--google-green-50-rgb));--google-green-200-rgb:168,218,181;--google-green-200:rgb(var(--google-green-200-rgb));--google-green-300-rgb:129,201,149;--google-green-300:rgb(var(--google-green-300-rgb));--google-green-400-rgb:91,185,116;--google-green-400:rgb(var(--google-green-400-rgb));--google-green-500-rgb:52,168,83;--google-green-500:rgb(var(--google-green-500-rgb));--google-green-600-rgb:30,142,62;--google-green-600:rgb(var(--google-green-600-rgb));--google-green-700-rgb:24,128,56;--google-green-700:rgb(var(--google-green-700-rgb));--google-green-800-rgb:19,115,51;--google-green-800:rgb(var(--google-green-800-rgb));--google-green-900-rgb:13,101,45;--google-green-900:rgb(var(--google-green-900-rgb));--google-grey-50-rgb:248,249,250;--google-grey-50:rgb(var(--google-grey-50-rgb));--google-grey-100-rgb:241,243,244;--google-grey-100:rgb(var(--google-grey-100-rgb));--google-grey-200-rgb:232,234,237;--google-grey-200:rgb(var(--google-grey-200-rgb));--google-grey-300-rgb:218,220,224;--google-grey-300:rgb(var(--google-grey-300-rgb));--google-grey-400-rgb:189,193,198;--google-grey-400:rgb(var(--google-grey-400-rgb));--google-grey-500-rgb:154,160,166;--google-grey-500:rgb(var(--google-grey-500-rgb));--google-grey-600-rgb:128,134,139;--google-grey-600:rgb(var(--google-grey-600-rgb));--google-grey-700-rgb:95,99,104;--google-grey-700:rgb(var(--google-grey-700-rgb));--google-grey-800-rgb:60,64,67;--google-grey-800:rgb(var(--google-grey-800-rgb));--google-grey-900-rgb:32,33,36;--google-grey-900:rgb(var(--google-grey-900-rgb));--google-grey-900-white-4-percent:#292a2d;--google-purple-200-rgb:215,174,251;--google-purple-200:rgb(var(--google-purple-200-rgb));--google-purple-900-rgb:104,29,168;--google-purple-900:rgb(var(--google-purple-900-rgb));--google-red-100-rgb:244,199,195;--google-red-100:rgb(var(--google-red-100-rgb));--google-red-300-rgb:242,139,130;--google-red-300:rgb(var(--google-red-300-rgb));--google-red-500-rgb:234,67,53;--google-red-500:rgb(var(--google-red-500-rgb));--google-red-600-rgb:217,48,37;--google-red-600:rgb(var(--google-red-600-rgb));--google-red-700-rgb:197,57,41;--google-red-700:rgb(var(--google-red-700-rgb));--google-yellow-50-rgb:254,247,224;--google-yellow-50:rgb(var(--google-yellow-50-rgb));--google-yellow-100-rgb:254,239,195;--google-yellow-100:rgb(var(--google-yellow-100-rgb));--google-yellow-200-rgb:253,226,147;--google-yellow-200:rgb(var(--google-yellow-200-rgb));--google-yellow-300-rgb:253,214,51;--google-yellow-300:rgb(var(--google-yellow-300-rgb));--google-yellow-400-rgb:252,201,52;--google-yellow-400:rgb(var(--google-yellow-400-rgb));--google-yellow-500-rgb:251,188,4;--google-yellow-500:rgb(var(--google-yellow-500-rgb));--google-yellow-700-rgb:240,147,0;--google-yellow-700:rgb(var(--google-yellow-700-rgb));--cr-card-background-color:white;--cr-shadow-key-color_:color-mix(in srgb,var(--cr-shadow-color) 30%,transparent);--cr-shadow-ambient-color_:color-mix(in srgb,var(--cr-shadow-color) 15%,transparent);--cr-elevation-1:var(--cr-shadow-key-color_) 0 1px 2px 0,var(--cr-shadow-ambient-color_) 0 1px 3px 1px;--cr-elevation-2:var(--cr-shadow-key-color_) 0 1px 2px 0,var(--cr-shadow-ambient-color_) 0 2px 6px 2px;--cr-elevation-3:var(--cr-shadow-key-color_) 0 1px 3px 0,var(--cr-shadow-ambient-color_) 0 4px 8px 3px;--cr-elevation-4:var(--cr-shadow-key-color_) 0 2px 3px 0,var(--cr-shadow-ambient-color_) 0 6px 10px 4px;--cr-elevation-5:var(--cr-shadow-key-color_) 0 4px 4px 0,var(--cr-shadow-ambient-color_) 0 8px 12px 6px;--cr-card-shadow:var(--cr-elevation-2);--cr-focused-item-color:var(--google-grey-300);--cr-form-field-label-color:var(--google-grey-700);--cr-hairline-rgb:0,0,0;--cr-iph-anchor-highlight-color:rgba(var(--google-blue-600-rgb),0.1);--cr-menu-background-color:white;--cr-menu-background-focus-color:var(--google-grey-400);--cr-menu-shadow:var(--cr-elevation-2);--cr-separator-color:rgba(0,0,0,.06);--cr-title-text-color:rgb(90,90,90);--cr-scrollable-border-color:var(--google-grey-300);--cr-button-edge-spacing:12px;--cr-controlled-by-spacing:24px;--cr-default-input-max-width:264px;--cr-icon-ripple-size:36px;--cr-icon-ripple-padding:8px;--cr-icon-size:20px;--cr-icon-button-margin-start:16px;--cr-icon-ripple-margin:calc(var(--cr-icon-ripple-padding) * -1);--cr-section-min-height:48px;--cr-section-two-line-min-height:64px;--cr-section-padding:20px;--cr-section-vertical-padding:12px;--cr-section-indent-width:40px;--cr-section-indent-padding:calc(var(--cr-section-padding) + var(--cr-section-indent-width));--cr-section-vertical-margin:21px;--cr-centered-card-max-width:680px;--cr-centered-card-width-percentage:0.96;--cr-hairline:1px solid rgba(var(--cr-hairline-rgb),.14);--cr-separator-height:1px;--cr-separator-line:var(--cr-separator-height) solid var(--cr-separator-color);--cr-toolbar-overlay-animation-duration:150ms;--cr-toolbar-height:56px;--cr-card-border-radius:8px;--cr-disabled-opacity:.38;--cr-form-field-bottom-spacing:16px;--cr-form-field-label-font-size:.625rem;--cr-form-field-label-height:1em;--cr-form-field-label-line-height:1;--cr-fallback-color-outline:rgb(116,119,117);--cr-fallback-color-primary:rgb(11,87,208);--cr-fallback-color-on-primary:rgb(255,255,255);--cr-fallback-color-primary-container:rgb(211,227,253);--cr-fallback-color-on-primary-container:rgb(4,30,73);--cr-fallback-color-secondary-container:rgb(194,231,255);--cr-fallback-color-on-secondary-container:rgb(0,29,53);--cr-fallback-color-neutral-container:rgb(242,242,242);--cr-fallback-color-neutral-outline:rgb(199,199,199);--cr-fallback-color-surface:rgb(255,255,255);--cr-fallback-color-surface1:rgb(248,250,253);--cr-fallback-color-surface2:rgb(243,246,252);--cr-fallback-color-surface3:rgb(239,243,250);--cr-fallback-color-surface4:rgb(237,242,250);--cr-fallback-color-surface5:rgb(234,240,249);--cr-fallback-color-on-surface-rgb:31,31,31;--cr-fallback-color-on-surface:rgb(var(--cr-fallback-color-on-surface-rgb));--cr-fallback-color-surface-variant:rgb(225,227,225);--cr-fallback-color-on-surface-variant:rgb(68,71,70);--cr-fallback-color-on-surface-subtle:rgb(71,71,71);--cr-fallback-color-inverse-primary:rgb(168,199,250);--cr-fallback-color-inverse-surface:rgb(48,48,48);--cr-fallback-color-inverse-on-surface:rgb(242,242,242);--cr-fallback-color-tonal-container:rgb(211,227,253);--cr-fallback-color-on-tonal-container:rgb(4,30,73);--cr-fallback-color-tonal-outline:rgb(168,199,250);--cr-fallback-color-error:rgb(179,38,30);--cr-fallback-color-divider:rgb(211,227,253);--cr-fallback-color-state-hover-on-prominent_:rgba(253,252,251,.1);--cr-fallback-color-state-on-subtle-rgb_:31,31,31;--cr-fallback-color-state-hover-on-subtle_:rgba(var(--cr-fallback-color-state-on-subtle-rgb_),.06);--cr-fallback-color-state-ripple-neutral-on-subtle_:rgba(var(--cr-fallback-color-state-on-subtle-rgb_),.08);--cr-fallback-color-state-ripple-primary-rgb_:124,172,248;--cr-fallback-color-state-ripple-primary_:rgba(var(--cr-fallback-color-state-ripple-primary-rgb_),0.32);--cr-fallback-color-base-container:rgb(236,239,247);--cr-fallback-color-disabled-background:rgba(var(--cr-fallback-color-on-surface-rgb),.12);--cr-fallback-color-disabled-foreground:rgba(var(--cr-fallback-color-on-surface-rgb),var(--cr-disabled-opacity));--cr-hover-background-color:var(--color-sys-state-hover,rgba(var(--cr-fallback-color-on-surface-rgb),.08));--cr-hover-on-prominent-background-color:var(--color-sys-state-hover-on-prominent,var(--cr-fallback-color-state-hover-on-prominent_));--cr-hover-on-subtle-background-color:var(--color-sys-state-hover-on-subtle,var(--cr-fallback-color-state-hover-on-subtle_));--cr-active-background-color:var(--color-sys-state-pressed,rgba(var(--cr-fallback-color-on-surface-rgb),.12));--cr-active-on-primary-background-color:var(--color-sys-state-ripple-primary,var(--cr-fallback-color-state-ripple-primary_));--cr-active-neutral-on-subtle-background-color:var(--color-sys-state-ripple-neutral-on-subtle,var(--cr-fallback-color-state-ripple-neutral-on-subtle_));--cr-focus-outline-color:var(--color-sys-state-focus-ring,var(--cr-fallback-color-primary));--cr-focus-outline-inverse-color:var(--color-sys-state-focus-ring-inverse,var(--cr-fallback-color-inverse-primary));--cr-primary-text-color:var(--color-primary-foreground,var(--cr-fallback-color-on-surface));--cr-secondary-text-color:var(--color-secondary-foreground,var(--cr-fallback-color-on-surface-variant));--cr-link-color:var(--color-link-foreground-default,var(--cr-fallback-color-primary));--cr-button-height:36px;--cr-shadow-color:var(--color-sys-shadow,rgb(0,0,0));--cr-checked-color:var(--color-checkbox-foreground-checked,var(--cr-fallback-color-primary))}html[webui-refresh-2026]{--cr-card-background-color:var(--color-webui-card-background)}@media (prefers-color-scheme:dark){html{--cr-fallback-color-outline:rgb(142,145,143);--cr-fallback-color-primary:rgb(168,199,250);--cr-fallback-color-on-primary:rgb(6,46,111);--cr-fallback-color-primary-container:rgb(8,66,160);--cr-fallback-color-on-primary-container:rgb(211,227,253);--cr-fallback-color-secondary-container:rgb(0,74,119);--cr-fallback-color-on-secondary-container:rgb(194,231,255);--cr-fallback-color-neutral-container:rgb(40,40,40);--cr-fallback-color-neutral-outline:rgb(117,117,117);--cr-fallback-color-surface:rgb(31,31,31);--cr-fallback-color-surface1:rgb(39,40,42);--cr-fallback-color-surface2:rgb(45,47,49);--cr-fallback-color-surface3:rgb(51,52,56);--cr-fallback-color-surface4:rgb(52,54,58);--cr-fallback-color-surface5:rgb(56,58,62);--cr-fallback-color-on-surface-rgb:227,227,227;--cr-fallback-color-surface-variant:rgb(68,71,70);--cr-fallback-color-on-surface-variant:rgb(196,199,197);--cr-fallback-color-on-surface-subtle:rgb(199,199,199);--cr-fallback-color-inverse-primary:rgb(11,87,208);--cr-fallback-color-inverse-surface:rgb(227,227,227);--cr-fallback-color-inverse-on-surface:rgb(31,31,31);--cr-fallback-color-tonal-container:rgb(0,74,119);--cr-fallback-color-on-tonal-container:rgb(194,231,255);--cr-fallback-color-tonal-outline:rgb(4,125,183);--cr-fallback-color-error:rgb(242,184,181);--cr-fallback-color-divider:rgb(94,94,94);--cr-fallback-color-state-hover-on-prominent_:rgba(31,31,31,.06);--cr-fallback-color-state-on-subtle-rgb_:253,252,251;--cr-fallback-color-state-hover-on-subtle_:rgba(var(--cr-fallback-color-state-on-subtle-rgb_),.10);--cr-fallback-color-state-ripple-neutral-on-subtle_:rgba(var(--cr-fallback-color-state-on-subtle-rgb_),.16);--cr-fallback-color-state-ripple-primary-rgb_:76,141,246;--cr-fallback-color-base-container:rgba(40,40,40,1);--cr-card-background-color:var(--google-grey-900-white-4-percent);--cr-focused-item-color:var(--google-grey-800);--cr-form-field-label-color:var(--dark-secondary-color);--cr-hairline-rgb:255,255,255;--cr-iph-anchor-highlight-color:rgba(var(--google-grey-100-rgb),0.1);--cr-menu-background-color:var(--google-grey-900);--cr-menu-background-focus-color:var(--google-grey-700);--cr-menu-background-sheen:rgba(255,255,255,.06);--cr-menu-shadow:rgba(0,0,0,.3) 0 1px 2px 0,rgba(0,0,0,.15) 0 3px 6px 2px;--cr-separator-color:rgba(255,255,255,.1);--cr-title-text-color:var(--cr-primary-text-color);--cr-scrollable-border-color:var(--google-grey-700)}}@media (forced-colors:active){html{--cr-focus-outline-hcm:2px solid transparent;--cr-border-hcm:2px solid transparent;--cr-fallback-color-disabled-background:Canvas;--cr-fallback-color-disabled-foreground:GrayText}}@media (prefers-reduced-motion:reduce){html{--cr-animations-disabled:1}}`,
);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
let instance$3 = null;
function getCss$3() {
  return (
    instance$3 ||
    (instance$3 = [
      ...[getCss$4()],
      css`
        :host {
          --cr-button-background-color: transparent;
          --cr-button-border-color: var(
            --color-button-border,
            var(--cr-fallback-color-tonal-outline)
          );
          --cr-button-text-color: var(
            --color-button-foreground,
            var(--cr-fallback-color-primary)
          );
          --cr-button-ripple-opacity: 1;
          --cr-button-ripple-color: var(--cr-active-background-color);
          --cr-button-disabled-background-color: transparent;
          --cr-button-disabled-border-color: var(
            --color-button-border-disabled,
            var(--cr-fallback-color-disabled-background)
          );
          --cr-button-disabled-text-color: var(
            --color-button-foreground-disabled,
            var(--cr-fallback-color-disabled-foreground)
          );
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          min-width: 5.14em;
          height: var(--cr-button-height);
          padding: 8px 16px;
          outline-width: 0;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          border: var(
            --cr-button-border,
            1px solid var(--cr-button-border-color)
          );
          border-radius: 100px;
          background: var(--cr-button-background-color);
          color: var(--cr-button-text-color);
          font-weight: 500;
          line-height: 20px;
          isolation: isolate;
        }
        :host(.action-button) {
          --cr-button-background-color: var(
            --color-button-background-prominent,
            var(--cr-fallback-color-primary)
          );
          --cr-button-text-color: var(
            --color-button-foreground-prominent,
            var(--cr-fallback-color-on-primary)
          );
          --cr-button-ripple-color: var(
            --cr-active-on-primary-background-color
          );
          --cr-button-border: none;
          --cr-button-disabled-background-color: var(
            --color-button-background-prominent-disabled,
            var(--cr-fallback-color-disabled-background)
          );
          --cr-button-disabled-text-color: var(
            --color-button-foreground-disabled,
            var(--cr-fallback-color-disabled-foreground)
          );
          --cr-button-disabled-border: none;
        }
        :host(.tonal-button),
        :host(.floating-button) {
          --cr-button-background-color: var(
            --color-button-background-tonal,
            var(--cr-fallback-color-secondary-container)
          );
          --cr-button-text-color: var(
            --color-button-foreground-tonal,
            var(--cr-fallback-color-on-tonal-container)
          );
          --cr-button-border: none;
          --cr-button-disabled-background-color: var(
            --color-button-background-tonal-disabled,
            var(--cr-fallback-color-disabled-background)
          );
          --cr-button-disabled-text-color: var(
            --color-button-foreground-disabled,
            var(--cr-fallback-color-disabled-foreground)
          );
          --cr-button-disabled-border: none;
        }
        @media (forced-colors: active) {
          @container style(--color-button-foreground) {
            :host {
              forced-color-adjust: none;
            }
          }
        }
        :host(.floating-button) {
          border-radius: 8px;
          height: 40px;
          transition: box-shadow 80ms linear;
        }
        :host(.floating-button:hover) {
          box-shadow: var(--cr-elevation-3);
        }
        :host([has-prefix-icon_]),
        :host([has-suffix-icon_]) {
          --iron-icon-height: 20px;
          --iron-icon-width: 20px;
          --icon-block-padding-large: 16px;
          --icon-block-padding-small: 12px;
          gap: 8px;
          padding-block-end: 8px;
          padding-block-start: 8px;
        }
        :host([has-prefix-icon_]) {
          padding-inline-end: var(--icon-block-padding-large);
          padding-inline-start: var(--icon-block-padding-small);
        }
        :host([has-suffix-icon_]) {
          padding-inline-end: var(--icon-block-padding-small);
          padding-inline-start: var(--icon-block-padding-large);
        }
        :host-context(.focus-outline-visible):host(:focus) {
          box-shadow: none;
          outline: 2px solid var(--cr-focus-outline-color);
          outline-offset: 2px;
        }
        #background {
          border-radius: inherit;
          inset: 0;
          pointer-events: none;
          position: absolute;
          z-index: 0;
        }
        #content {
          display: inline;
        }
        #hoverBackground {
          content: "";
          display: none;
          inset: 0;
          pointer-events: none;
          position: absolute;
          z-index: 1;
        }
        :host(:hover) #hoverBackground {
          background: var(--cr-hover-background-color);
          display: block;
        }
        :host(.action-button:hover) #hoverBackground {
          background: var(--cr-hover-on-prominent-background-color);
        }
        :host([disabled]) {
          background: var(--cr-button-disabled-background-color);
          border: var(
            --cr-button-disabled-border,
            1px solid var(--cr-button-disabled-border-color)
          );
          color: var(--cr-button-disabled-text-color);
          cursor: auto;
          pointer-events: none;
        }
        :host(.cancel-button) {
          margin-inline-end: 8px;
        }
        :host(.action-button),
        :host(.cancel-button) {
          line-height: 154%;
        }
        #ink {
          color: var(--cr-button-ripple-color);
          --paper-ripple-opacity: var(--cr-button-ripple-opacity);
        }
        #hoverBackground,
        cr-ripple {
          z-index: 1;
        }
        #content,
        ::slotted(*) {
          z-index: 2;
        }
      `,
    ])
  );
}
function getHtml$3() {
  return html` <div id="background"></div>
    <slot
      id="prefixIcon"
      name="prefix-icon"
      @slotchange="${this.onPrefixIconSlotchange_}"
    >
    </slot>
    <span id="content">
      <slot></slot>
    </span>
    <slot
      id="suffixIcon"
      name="suffix-icon"
      @slotchange="${this.onSuffixIconSlotchange_}"
    >
    </slot>
    <div id="hoverBackground" part="hoverBackground"></div>`;
}
const CrButtonElementBase = CrRippleMixin(CrLitElement);
class CrButtonElement extends CrButtonElementBase {
  static get is() {
    return "cr-button";
  }
  static get styles() {
    return getCss$3();
  }
  render() {
    return getHtml$3.bind(this)();
  }
  static get properties() {
    return {
      disabled: { type: Boolean, reflect: true },
      hasPrefixIcon_: { type: Boolean, reflect: true },
      hasSuffixIcon_: { type: Boolean, reflect: true },
    };
  }
  #disabled_accessor_storage = false;
  get disabled() {
    return this.#disabled_accessor_storage;
  }
  set disabled(value) {
    this.#disabled_accessor_storage = value;
  }
  #hasPrefixIcon__accessor_storage = false;
  get hasPrefixIcon_() {
    return this.#hasPrefixIcon__accessor_storage;
  }
  set hasPrefixIcon_(value) {
    this.#hasPrefixIcon__accessor_storage = value;
  }
  #hasSuffixIcon__accessor_storage = false;
  get hasSuffixIcon_() {
    return this.#hasSuffixIcon__accessor_storage;
  }
  set hasSuffixIcon_(value) {
    this.#hasSuffixIcon__accessor_storage = value;
  }
  spaceKeyDown_ = false;
  timeoutIds_ = new Set();
  constructor() {
    super();
    this.addEventListener("blur", this.onBlur_.bind(this));
    this.addEventListener("click", this.onClick_.bind(this));
    this.addEventListener("keydown", this.onKeyDown_.bind(this));
    this.addEventListener("keyup", this.onKeyUp_.bind(this));
    this.ensureRippleOnPointerdown();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.timeoutIds_.forEach(clearTimeout);
    this.timeoutIds_.clear();
  }
  firstUpdated() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "button");
    }
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
    FocusOutlineManager.forDocument(document);
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("disabled")) {
      this.setAttribute("aria-disabled", this.disabled ? "true" : "false");
      this.disabledChanged_(this.disabled, changedProperties.get("disabled"));
    }
  }
  setTimeout_(fn, delay) {
    if (!this.isConnected) {
      return;
    }
    const id = setTimeout(() => {
      this.timeoutIds_.delete(id);
      fn();
    }, delay);
    this.timeoutIds_.add(id);
  }
  disabledChanged_(newValue, oldValue) {
    if (!newValue && oldValue === undefined) {
      return;
    }
    if (this.disabled) {
      this.blur();
    }
    this.setAttribute("tabindex", String(this.disabled ? -1 : 0));
  }
  onBlur_() {
    this.spaceKeyDown_ = false;
    this.setTimeout_(() => this.getRipple().uiUpAction(), 100);
  }
  onClick_(e) {
    if (this.disabled) {
      e.stopImmediatePropagation();
    }
  }
  onPrefixIconSlotchange_() {
    this.hasPrefixIcon_ = this.$.prefixIcon.assignedElements().length > 0;
  }
  onSuffixIconSlotchange_() {
    this.hasSuffixIcon_ = this.$.suffixIcon.assignedElements().length > 0;
  }
  onKeyDown_(e) {
    if (e.key !== " " && (e.key !== "Enter" || (isMac && e.ctrlKey))) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) {
      return;
    }
    this.getRipple().uiDownAction();
    if (e.key === "Enter") {
      this.click();
      this.setTimeout_(() => this.getRipple().uiUpAction(), 100);
    } else if (e.key === " ") {
      this.spaceKeyDown_ = true;
    }
  }
  onKeyUp_(e) {
    if (e.key !== " " && (e.key !== "Enter" || (isMac && e.ctrlKey))) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (this.spaceKeyDown_ && e.key === " ") {
      this.spaceKeyDown_ = false;
      this.click();
      this.getRipple().uiUpAction();
    }
  }
}
customElements.define(CrButtonElement.is, CrButtonElement);
let instance$2 = null;
function getCss$2() {
  return (
    instance$2 ||
    (instance$2 = [
      ...[],
      css`
        :host {
          -webkit-tap-highlight-color: transparent;
          align-items: center;
          cursor: pointer;
          display: flex;
          outline: none;
          user-select: none;
          --cr-checkbox-border-size: 2px;
          --cr-checkbox-size: 16px;
          --cr-checkbox-ripple-size: 32px;
          --cr-checkbox-ripple-offset: 50%;
          --cr-checkbox-checked-box-color: var(--cr-checked-color);
          --cr-checkbox-ripple-checked-color: var(--cr-active-background-color);
          --cr-checkbox-ripple-opacity: 1;
          --cr-checkbox-mark-color: var(
            --color-checkbox-check,
            var(--cr-fallback-color-on-primary)
          );
          --cr-checkbox-ripple-unchecked-color: var(
            --cr-active-background-color
          );
          --cr-checkbox-unchecked-box-color: var(
            --color-checkbox-foreground-unchecked,
            var(--cr-fallback-color-outline)
          );
          --cr-checkbox-checked-ripple-opacity: 0.2;
          --cr-checkbox-unchecked-ripple-opacity: 0.15;
        }
        @media (prefers-color-scheme: dark) {
          :host {
            --cr-checkbox-checked-ripple-opacity: 0.4;
            --cr-checkbox-unchecked-ripple-opacity: 0.4;
          }
        }
        :host([disabled]) {
          cursor: initial;
          opacity: 1;
          pointer-events: none;
          --cr-checkbox-checked-box-color: var(
            --color-checkbox-container-disabled,
            var(--cr-fallback-color-disabled-background)
          );
          --cr-checkbox-unchecked-box-color: var(
            --color-checkbox-outline-disabled,
            var(--cr-fallback-color-disabled-background)
          );
          --cr-checkbox-mark-color: var(
            --color-checkbox-check-disabled,
            var(--cr-fallback-color-disabled-foreground)
          );
        }
        #checkbox {
          background: none;
          border: var(--cr-checkbox-border-size) solid
            var(--cr-checkbox-unchecked-box-color);
          border-radius: 2px;
          box-sizing: border-box;
          cursor: pointer;
          display: block;
          flex-shrink: 0;
          height: var(--cr-checkbox-size);
          isolation: isolate;
          margin: 0;
          outline: none;
          padding: 0;
          position: relative;
          transform: none;
          width: var(--cr-checkbox-size);
        }
        :host([disabled][checked]) #checkbox {
          border-color: transparent;
        }
        #hover-layer {
          display: none;
        }
        #checkbox:hover #hover-layer {
          background-color: var(--cr-hover-background-color);
          border-radius: 50%;
          display: block;
          height: 32px;
          left: 50%;
          overflow: hidden;
          pointer-events: none;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
        }
        @media (forced-colors: active) {
          :host(:focus) #checkbox {
            outline: var(--cr-focus-outline-hcm);
          }
        }
        #checkbox:focus-visible {
          outline: var(
            --cr-checkbox-focus-outline,
            2px solid var(--cr-focus-outline-color)
          );
          outline-offset: 2px;
        }
        #checkmark {
          display: block;
          forced-color-adjust: auto;
          position: relative;
          transform: scale(0);
          z-index: 1;
        }
        #checkmark path {
          fill: var(--cr-checkbox-mark-color);
        }
        :host([checked]) #checkmark {
          transform: scale(1);
          transition: transform 140ms ease-out;
        }
        :host([checked]) #checkbox {
          background: var(
            --cr-checkbox-checked-box-background-color,
            var(--cr-checkbox-checked-box-color)
          );
          border-color: var(--cr-checkbox-checked-box-color);
        }
        #ink {
          --paper-ripple-opacity: var(
            --cr-checkbox-ripple-opacity,
            var(--cr-checkbox-unchecked-ripple-opacity)
          );
          color: var(--cr-checkbox-ripple-unchecked-color);
          height: var(--cr-checkbox-ripple-size);
          left: var(--cr-checkbox-ripple-offset);
          outline: var(--cr-checkbox-ripple-ring, none);
          pointer-events: none;
          top: var(--cr-checkbox-ripple-offset);
          transform: translate(-50%, -50%);
          transition: color linear 80ms;
          width: var(--cr-checkbox-ripple-size);
        }
        :host([checked]) #ink {
          --paper-ripple-opacity: var(
            --cr-checkbox-ripple-opacity,
            var(--cr-checkbox-checked-ripple-opacity)
          );
          color: var(--cr-checkbox-ripple-checked-color);
        }
        :host-context([dir="rtl"]) #ink {
          left: auto;
          right: var(--cr-checkbox-ripple-offset);
          transform: translate(50%, -50%);
        }
        #labelContainer {
          color: var(--cr-checkbox-label-color, var(--cr-primary-text-color));
          padding-inline-start: var(--cr-checkbox-label-padding-start, 20px);
          white-space: normal;
        }
        :host(.label-first) #labelContainer {
          order: -1;
          padding-inline-end: var(--cr-checkbox-label-padding-end, 20px);
          padding-inline-start: 0;
        }
        :host(.no-label) #labelContainer {
          display: none;
        }
        #ariaDescription {
          height: 0;
          overflow: hidden;
          width: 0;
        }
      `,
    ])
  );
}
function getHtml$2() {
  return html` <div
      id="checkbox"
      tabindex="${this.tabIndex}"
      role="checkbox"
      @keydown="${this.onKeydown_}"
      @keyup="${this.onKeyup_}"
      aria-disabled="${this.getAriaDisabled_()}"
      aria-checked="${this.getAriaChecked_()}"
      aria-label="${this.ariaLabelOverride || nothing}"
      aria-labelledby="${this.ariaLabelOverride ? nothing : "labelContainer"}"
      aria-describedby="ariaDescription"
    >
      <!-- Inline SVG paints faster than loading it from a separate file. -->
      <svg
        id="checkmark"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="m10.192 2.121-6.01 6.01-2.121-2.12L1 7.07l2.121 2.121.707.707.354.354 7.071-7.071-1.06-1.06Z"
        ></path>
      </svg>
      <div id="hover-layer"></div>
    </div>
    <div id="labelContainer" part="label-container">
      <slot></slot>
    </div>
    <div id="ariaDescription" aria-hidden="true">${this.ariaDescription}</div>`;
}
const CrCheckboxElementBase = CrRippleMixin(CrLitElement);
class CrCheckboxElement extends CrCheckboxElementBase {
  static get is() {
    return "cr-checkbox";
  }
  static get styles() {
    return getCss$2();
  }
  render() {
    return getHtml$2.bind(this)();
  }
  static get properties() {
    return {
      checked: { type: Boolean, reflect: true, notify: true },
      disabled: { type: Boolean, reflect: true },
      ariaDescription: { type: String },
      ariaLabelOverride: { type: String },
      tabIndex: { type: Number },
    };
  }
  #checked_accessor_storage = false;
  get checked() {
    return this.#checked_accessor_storage;
  }
  set checked(value) {
    this.#checked_accessor_storage = value;
  }
  #disabled_accessor_storage = false;
  get disabled() {
    return this.#disabled_accessor_storage;
  }
  set disabled(value) {
    this.#disabled_accessor_storage = value;
  }
  #ariaDescription_accessor_storage = null;
  get ariaDescription() {
    return this.#ariaDescription_accessor_storage;
  }
  set ariaDescription(value) {
    this.#ariaDescription_accessor_storage = value;
  }
  #ariaLabelOverride_accessor_storage;
  get ariaLabelOverride() {
    return this.#ariaLabelOverride_accessor_storage;
  }
  set ariaLabelOverride(value) {
    this.#ariaLabelOverride_accessor_storage = value;
  }
  #tabIndex_accessor_storage = 0;
  get tabIndex() {
    return this.#tabIndex_accessor_storage;
  }
  set tabIndex(value) {
    this.#tabIndex_accessor_storage = value;
  }
  willUpdate(changedProperties) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("disabled")) {
      const previousTabIndex = changedProperties.get("disabled");
      if (previousTabIndex !== undefined || this.disabled) {
        this.tabIndex = this.disabled ? -1 : 0;
      }
    }
  }
  firstUpdated() {
    this.addEventListener("click", this.onClick_.bind(this));
    this.addEventListener("pointerup", this.hideRipple_.bind(this));
    this.$.labelContainer.addEventListener(
      "pointerdown",
      this.showRipple_.bind(this),
    );
    this.$.labelContainer.addEventListener(
      "pointerleave",
      this.hideRipple_.bind(this),
    );
    this.$.checkbox.addEventListener("click", this.onCheckboxClick_.bind(this));
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("tabIndex")) {
      this.removeAttribute("tabindex");
    }
  }
  focus() {
    this.$.checkbox.focus();
  }
  getFocusableElement() {
    return this.$.checkbox;
  }
  getAriaDisabled_() {
    return this.disabled ? "true" : "false";
  }
  getAriaChecked_() {
    return this.checked ? "true" : "false";
  }
  showRipple_() {
    if (this.noink) {
      return;
    }
    this.getRipple().showAndHoldDown();
  }
  hideRipple_() {
    this.getRipple().clear();
  }
  onCheckboxClick_(e) {
    e.stopPropagation();
    e.preventDefault();
    this.click();
  }
  async onClick_(e) {
    if (this.disabled || e.target.tagName === "A") {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    this.checked = !this.checked;
    await this.updateComplete;
    this.fire("change", this.checked);
  }
  onKeydown_(e) {
    if (e.key !== " " && (e.key !== "Enter" || (isMac && e.ctrlKey))) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) {
      return;
    }
    if (e.key === "Enter") {
      this.click();
    }
  }
  onKeyup_(e) {
    if (e.key === " " || (e.key === "Enter" && !(isMac && e.ctrlKey))) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === " ") {
      this.click();
    }
  }
  createRipple() {
    this.rippleContainer = this.$.checkbox;
    const ripple = super.createRipple();
    ripple.setAttribute("recenters", "");
    ripple.classList.add("circle");
    return ripple;
  }
}
customElements.define(CrCheckboxElement.is, CrCheckboxElement);
let instance$1 = null;
function getCss$1() {
  return (
    instance$1 ||
    (instance$1 = [
      ...[getCss$4()],
      css`
        :host {
          cursor: pointer;
          display: flex;
          flex-direction: row;
          font-size: var(--cr-tabs-font-size, 14px);
          font-weight: 500;
          height: var(--cr-tabs-height, 48px);
          user-select: none;
        }
        :host-context([webui-refresh-2026]) {
          &:host {
            --cr-tabs-selected-color: var(
              --color-tab-nav-item-selected,
              var(--google-blue-600)
            );
          }
          @media (prefers-color-scheme: dark) {
            &:host {
              --cr-tabs-selected-color: var(
                --color-tab-nav-item-selected,
                var(--google-blue-300)
              );
            }
          }
        }
        .tab {
          align-items: center;
          color: var(--cr-secondary-text-color);
          display: flex;
          flex: var(--cr-tabs-flex, auto);
          height: 100%;
          justify-content: center;
          opacity: 1;
          outline: none;
          padding: 0 var(--cr-tabs-tab-inline-padding, 0);
          position: relative;
          transition: opacity 100ms cubic-bezier(0.4, 0, 1, 1);
        }
        :host-context(.focus-outline-visible) .tab:focus {
          outline: var(--cr-tabs-focus-outline, auto);
          outline-offset: var(--cr-tabs-focus-outline-offset, 0);
        }
        .selected {
          color: var(--cr-tabs-selected-color, var(--google-blue-600));
          opacity: 1;
        }
        @media (prefers-color-scheme: dark) {
          .selected {
            color: var(--cr-tabs-selected-color, var(--google-blue-300));
          }
        }
        .tab-icon {
          -webkit-mask-position: center;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-size: var(--cr-tabs-icon-size, var(--cr-icon-size));
          background-color: var(--cr-secondary-text-color);
          display: none;
          height: var(--cr-tabs-icon-size, var(--cr-icon-size));
          margin-inline-end: var(
            --cr-tabs-icon-margin-end,
            var(--cr-icon-size)
          );
          width: var(--cr-tabs-icon-size, var(--cr-icon-size));
        }
        .selected .tab-icon {
          background-color: var(
            --cr-tabs-selected-color,
            var(--google-blue-600)
          );
        }
        @media (prefers-color-scheme: dark) {
          .selected .tab-icon {
            background-color: var(
              --cr-tabs-selected-color,
              var(--google-blue-300)
            );
          }
        }
        .tab-indicator,
        .tab-indicator-background {
          bottom: 0;
          height: var(--cr-tabs-selection-bar-width, 2px);
          left: var(--cr-tabs-tab-inline-padding, 0);
          position: absolute;
          right: var(--cr-tabs-tab-inline-padding, 0);
        }
        .tab-indicator {
          border-top-left-radius: var(
            --cr-tabs-selection-bar-radius,
            var(--cr-tabs-selection-bar-width, 2px)
          );
          border-top-right-radius: var(
            --cr-tabs-selection-bar-radius,
            var(--cr-tabs-selection-bar-width, 2px)
          );
          opacity: 0;
          transform-origin: left center;
          transition: transform;
        }
        .selected .tab-indicator {
          background: var(--cr-tabs-selected-color, var(--google-blue-600));
          opacity: 1;
        }
        .tab-indicator.expand {
          transition-duration: 150ms;
          transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
        }
        .tab-indicator.contract {
          transition-duration: 180ms;
          transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }
        .tab-indicator-background {
          background: var(--cr-tabs-unselected-color, var(--google-blue-600));
          opacity: var(--cr-tabs-selection-bar-unselected-opacity, 0);
          z-index: -1;
        }
        @media (prefers-color-scheme: dark) {
          .tab-indicator-background {
            background: var(--cr-tabs-unselected-color, var(--google-blue-300));
          }
          .selected .tab-indicator {
            background: var(--cr-tabs-selected-color, var(--google-blue-300));
          }
        }
        @media (forced-colors: active) {
          .tab-indicator-background {
            background: SelectedItem;
          }
          .selected .tab-indicator {
            background: SelectedItem;
          }
        }
      `,
    ])
  );
}
function getHtml$1() {
  return html` ${this.tabNames.map(
    (item, index) => html`
      <div
        role="tab"
        class="tab ${this.getSelectedClass_(index)}"
        aria-selected="${this.getAriaSelected_(index)}"
        tabindex="${this.getTabindex_(index)}"
        data-index="${index}"
        @click="${this.onTabClick_}"
      >
        <div class="tab-icon" .style="${this.getIconStyle_(index)}"></div>
        ${item}
        <div class="tab-indicator-background"></div>
        <div class="tab-indicator"></div>
      </div>
    `,
  )}`;
}
const NONE_SELECTED = -1;
class CrTabsElement extends CrLitElement {
  static get is() {
    return "cr-tabs";
  }
  static get styles() {
    return getCss$1();
  }
  render() {
    return getHtml$1.bind(this)();
  }
  static get properties() {
    return {
      tabIcons: { type: Array },
      tabNames: { type: Array },
      selected: { type: Number, notify: true },
    };
  }
  #tabIcons_accessor_storage = [];
  get tabIcons() {
    return this.#tabIcons_accessor_storage;
  }
  set tabIcons(value) {
    this.#tabIcons_accessor_storage = value;
  }
  #tabNames_accessor_storage = [];
  get tabNames() {
    return this.#tabNames_accessor_storage;
  }
  set tabNames(value) {
    this.#tabNames_accessor_storage = value;
  }
  #selected_accessor_storage = NONE_SELECTED;
  get selected() {
    return this.#selected_accessor_storage;
  }
  set selected(value) {
    this.#selected_accessor_storage = value;
  }
  isRtl_ = false;
  connectedCallback() {
    super.connectedCallback();
    this.isRtl_ = this.matches(":host-context([dir=rtl]) cr-tabs");
  }
  firstUpdated() {
    this.setAttribute("role", "tablist");
    this.addEventListener("keydown", this.onKeyDown_.bind(this));
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("selected")) {
      this.onSelectedChanged_(this.selected, changedProperties.get("selected"));
    }
  }
  getAriaSelected_(index) {
    return index === this.selected ? "true" : "false";
  }
  getIconStyle_(index) {
    const icon = this.tabIcons[index];
    return icon ? `-webkit-mask-image: url(${icon}); display: block;` : "";
  }
  getTabindex_(index) {
    return index === this.selected ? "0" : "-1";
  }
  getSelectedClass_(index) {
    return index === this.selected ? "selected" : "";
  }
  onSelectedChanged_(newSelected, oldSelected) {
    if (
      newSelected === NONE_SELECTED ||
      oldSelected === NONE_SELECTED ||
      oldSelected === undefined
    ) {
      return;
    }
    const tabs = this.shadowRoot.querySelectorAll(".tab");
    if (tabs.length <= oldSelected) {
      return;
    }
    const oldTabRect = tabs[oldSelected].getBoundingClientRect();
    const newTabRect = tabs[newSelected].getBoundingClientRect();
    const newIndicator = tabs[newSelected].querySelector(".tab-indicator");
    newIndicator.classList.remove("expand", "contract");
    this.updateIndicator_(
      newIndicator,
      newTabRect,
      oldTabRect.left,
      oldTabRect.width,
    );
    newIndicator.getBoundingClientRect();
    newIndicator.classList.add("expand");
    newIndicator.addEventListener(
      "transitionend",
      (e) => this.onIndicatorTransitionEnd_(e),
      { once: true },
    );
    const leftmostEdge = Math.min(oldTabRect.left, newTabRect.left);
    const fullWidth =
      newTabRect.left > oldTabRect.left
        ? newTabRect.right - oldTabRect.left
        : oldTabRect.right - newTabRect.left;
    this.updateIndicator_(newIndicator, newTabRect, leftmostEdge, fullWidth);
  }
  async onKeyDown_(e) {
    const count = this.tabNames.length;
    let newSelection;
    if (e.key === "Home") {
      newSelection = 0;
    } else if (e.key === "End") {
      newSelection = count - 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const delta =
        e.key === "ArrowLeft" ? (this.isRtl_ ? 1 : -1) : this.isRtl_ ? -1 : 1;
      newSelection = (count + this.selected + delta) % count;
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.selected = newSelection;
    await this.updateComplete;
    this.shadowRoot.querySelector(".tab.selected").focus();
  }
  onIndicatorTransitionEnd_(event) {
    const indicator = event.target;
    indicator.classList.replace("expand", "contract");
    indicator.style.transform = `translateX(0) scaleX(1)`;
  }
  onTabClick_(e) {
    const target = e.currentTarget;
    this.selected = Number(target.dataset["index"]);
  }
  updateIndicator_(indicator, originRect, newLeft, newWidth) {
    const leftDiff = (100 * (newLeft - originRect.left)) / originRect.width;
    const widthRatio = newWidth / originRect.width;
    const transform = `translateX(${leftDiff}%) scaleX(${widthRatio})`;
    indicator.style.transform = transform;
  }
}
customElements.define(CrTabsElement.is, CrTabsElement);
const FeatureModeSpec = { $: mojo.internal.Enum() };
var FeatureMode;
(function (FeatureMode) {
  FeatureMode[(FeatureMode["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FeatureMode[(FeatureMode["MAX_VALUE"] = 7)] = "MAX_VALUE";
  FeatureMode[(FeatureMode["kUnspecified"] = 0)] = "kUnspecified";
  FeatureMode[(FeatureMode["kImageGeneration"] = 1)] = "kImageGeneration";
  FeatureMode[(FeatureMode["kActuation"] = 2)] = "kActuation";
  FeatureMode[(FeatureMode["kExperimentalTriggering"] = 3)] =
    "kExperimentalTriggering";
  FeatureMode[(FeatureMode["kUniversalCart"] = 4)] = "kUniversalCart";
  FeatureMode[(FeatureMode["kPromotionPage"] = 5)] = "kPromotionPage";
  FeatureMode[(FeatureMode["kPasswordChange"] = 6)] = "kPasswordChange";
  FeatureMode[(FeatureMode["kWebContinuity"] = 7)] = "kWebContinuity";
})(FeatureMode || (FeatureMode = {}));
({ $: mojo.internal.Enum() });
var PanelStateKind;
(function (PanelStateKind) {
  PanelStateKind[(PanelStateKind["MIN_VALUE"] = 0)] = "MIN_VALUE";
  PanelStateKind[(PanelStateKind["MAX_VALUE"] = 2)] = "MAX_VALUE";
  PanelStateKind[(PanelStateKind["kHidden"] = 0)] = "kHidden";
  PanelStateKind[(PanelStateKind["kDetached"] = 1)] = "kDetached";
  PanelStateKind[(PanelStateKind["kAttached"] = 2)] = "kAttached";
})(PanelStateKind || (PanelStateKind = {}));
const PlatformSpec = { $: mojo.internal.Enum() };
var Platform;
(function (Platform) {
  Platform[(Platform["MIN_VALUE"] = 0)] = "MIN_VALUE";
  Platform[(Platform["MAX_VALUE"] = 5)] = "MAX_VALUE";
  Platform[(Platform["kUnknown"] = 0)] = "kUnknown";
  Platform[(Platform["kMacOS"] = 1)] = "kMacOS";
  Platform[(Platform["kWindows"] = 2)] = "kWindows";
  Platform[(Platform["kLinux"] = 3)] = "kLinux";
  Platform[(Platform["kChromeOS"] = 4)] = "kChromeOS";
  Platform[(Platform["kAndroid"] = 5)] = "kAndroid";
})(Platform || (Platform = {}));
const FormFactorSpec = { $: mojo.internal.Enum() };
var FormFactor;
(function (FormFactor) {
  FormFactor[(FormFactor["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FormFactor[(FormFactor["MAX_VALUE"] = 3)] = "MAX_VALUE";
  FormFactor[(FormFactor["kUnknown"] = 0)] = "kUnknown";
  FormFactor[(FormFactor["kDesktop"] = 1)] = "kDesktop";
  FormFactor[(FormFactor["kPhone"] = 2)] = "kPhone";
  FormFactor[(FormFactor["kTablet"] = 3)] = "kTablet";
})(FormFactor || (FormFactor = {}));
const FreOverrideSpec = { $: mojo.internal.Enum() };
var FreOverride;
(function (FreOverride) {
  FreOverride[(FreOverride["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FreOverride[(FreOverride["MAX_VALUE"] = 3)] = "MAX_VALUE";
  FreOverride[(FreOverride["kUnspecified"] = 0)] = "kUnspecified";
  FreOverride[(FreOverride["kTrustFirstText"] = 1)] = "kTrustFirstText";
  FreOverride[(FreOverride["kTrustFirstClick"] = 2)] = "kTrustFirstClick";
  FreOverride[(FreOverride["kTrustFirstInline"] = 3)] = "kTrustFirstInline";
})(FreOverride || (FreOverride = {}));
const InvocationSourceSpec = { $: mojo.internal.Enum() };
var InvocationSource;
(function (InvocationSource) {
  InvocationSource[(InvocationSource["MIN_VALUE"] = 0)] = "MIN_VALUE";
  InvocationSource[(InvocationSource["MAX_VALUE"] = 44)] = "MAX_VALUE";
  InvocationSource[(InvocationSource["kOsButton"] = 0)] = "kOsButton";
  InvocationSource[(InvocationSource["kOsButtonMenu"] = 1)] = "kOsButtonMenu";
  InvocationSource[(InvocationSource["kOsHotkey"] = 2)] = "kOsHotkey";
  InvocationSource[(InvocationSource["kTopChromeButton"] = 3)] =
    "kTopChromeButton";
  InvocationSource[(InvocationSource["kFre"] = 4)] = "kFre";
  InvocationSource[(InvocationSource["kProfilePicker"] = 5)] = "kProfilePicker";
  InvocationSource[(InvocationSource["kNudge"] = 6)] = "kNudge";
  InvocationSource[(InvocationSource["kThreeDotsMenu"] = 7)] = "kThreeDotsMenu";
  InvocationSource[(InvocationSource["kUnsupported"] = 8)] = "kUnsupported";
  InvocationSource[(InvocationSource["kWhatsNew"] = 9)] = "kWhatsNew";
  InvocationSource[(InvocationSource["kAfterSignIn"] = 10)] = "kAfterSignIn";
  InvocationSource[(InvocationSource["kSharedTab"] = 11)] = "kSharedTab";
  InvocationSource[(InvocationSource["kActorTaskIcon"] = 12)] =
    "kActorTaskIcon";
  InvocationSource[(InvocationSource["kSharedImage"] = 13)] = "kSharedImage";
  InvocationSource[(InvocationSource["kHandoffButton"] = 14)] =
    "kHandoffButton";
  InvocationSource[(InvocationSource["kSkills"] = 15)] = "kSkills";
  InvocationSource[(InvocationSource["kAutoOpenedByContextualCue"] = 16)] =
    "kAutoOpenedByContextualCue";
  InvocationSource[(InvocationSource["kPdfSummarizeButton"] = 17)] =
    "kPdfSummarizeButton";
  InvocationSource[(InvocationSource["kNavigationCapture"] = 18)] =
    "kNavigationCapture";
  InvocationSource[(InvocationSource["kAutoOpenedForPdf"] = 19)] =
    "kAutoOpenedForPdf";
  InvocationSource[(InvocationSource["kCaptureRegionHotkey"] = 20)] =
    "kCaptureRegionHotkey";
  InvocationSource[(InvocationSource["kIph"] = 21)] = "kIph";
  InvocationSource[(InvocationSource["kAnchoredContextualCue"] = 22)] =
    "kAnchoredContextualCue";
  InvocationSource[(InvocationSource["kWebContentsContextMenu"] = 23)] =
    "kWebContentsContextMenu";
  InvocationSource[(InvocationSource["kTextSelectionNudge"] = 24)] =
    "kTextSelectionNudge";
  InvocationSource[(InvocationSource["kTextSelectionWidget"] = 25)] =
    "kTextSelectionWidget";
  InvocationSource[(InvocationSource["kZeroStateAutoSummarize"] = 26)] =
    "kZeroStateAutoSummarize";
  InvocationSource[(InvocationSource["kUniversalCart"] = 27)] =
    "kUniversalCart";
  InvocationSource[(InvocationSource["kExperimentalTriggering"] = 28)] =
    "kExperimentalTriggering";
  InvocationSource[(InvocationSource["kPasswordChange"] = 29)] =
    "kPasswordChange";
  InvocationSource[(InvocationSource["kAutofill"] = 30)] = "kAutofill";
  InvocationSource[(InvocationSource["kToolbarButton"] = 31)] =
    "kToolbarButton";
  InvocationSource[(InvocationSource["kIndigoPageAction"] = 32)] =
    "kIndigoPageAction";
  InvocationSource[(InvocationSource["kWebDragDrop"] = 33)] = "kWebDragDrop";
  InvocationSource[(InvocationSource["kPromotionPage"] = 34)] =
    "kPromotionPage";
  InvocationSource[(InvocationSource["kDaisyChainOnNewTab"] = 35)] =
    "kDaisyChainOnNewTab";
  InvocationSource[(InvocationSource["kDaisyChainOnFollowLink"] = 36)] =
    "kDaisyChainOnFollowLink";
  InvocationSource[(InvocationSource["kConversationSwitch"] = 37)] =
    "kConversationSwitch";
  InvocationSource[(InvocationSource["kDetachAttachButton"] = 38)] =
    "kDetachAttachButton";
  InvocationSource[(InvocationSource["kTabRestore"] = 39)] = "kTabRestore";
  InvocationSource[(InvocationSource["kReshowInactive"] = 40)] =
    "kReshowInactive";
  InvocationSource[(InvocationSource["kTabContextMenu"] = 41)] =
    "kTabContextMenu";
  InvocationSource[(InvocationSource["kWebContinuity"] = 42)] =
    "kWebContinuity";
  InvocationSource[(InvocationSource["kHistoryPageChatLinkout"] = 43)] =
    "kHistoryPageChatLinkout";
  InvocationSource[(InvocationSource["kContextHubTopics"] = 44)] =
    "kContextHubTopics";
})(InvocationSource || (InvocationSource = {}));
const ActuationTargetSpec = { $: mojo.internal.Enum() };
var ActuationTarget;
(function (ActuationTarget) {
  ActuationTarget[(ActuationTarget["MIN_VALUE"] = 0)] = "MIN_VALUE";
  ActuationTarget[(ActuationTarget["MAX_VALUE"] = 4)] = "MAX_VALUE";
  ActuationTarget[(ActuationTarget["kUnknown"] = 0)] = "kUnknown";
  ActuationTarget[(ActuationTarget["kAgentDecides"] = 1)] = "kAgentDecides";
  ActuationTarget[(ActuationTarget["kCurrentTab"] = 2)] = "kCurrentTab";
  ActuationTarget[(ActuationTarget["kNewTab"] = 3)] = "kNewTab";
  ActuationTarget[(ActuationTarget["kTargetSurface"] = 4)] = "kTargetSurface";
})(ActuationTarget || (ActuationTarget = {}));
class MojoHandlerProxyFactory {
  handlerRemoteCtor_;
  bindFn_;
  instance_ = null;
  constructor(handlerRemoteCtor_, bindFn_) {
    this.handlerRemoteCtor_ = handlerRemoteCtor_;
    this.bindFn_ = bindFn_;
  }
  getInstance() {
    if (!this.instance_) {
      const handler = new this.handlerRemoteCtor_();
      this.bindFn_(handler.$.bindNewPipeAndPassReceiver());
      this.instance_ = { handler: handler };
    }
    return this.instance_;
  }
  setInstance(proxy) {
    this.instance_ = proxy;
  }
}
class JSTimeDataView {
  decoder_;
  version_;
  fieldSpecs_;
  constructor(decoder, version, fieldSpecs) {
    this.decoder_ = decoder;
    this.version_ = version;
    this.fieldSpecs_ = fieldSpecs;
  }
  get msec() {
    const field = this.fieldSpecs_[0];
    return mojo.internal.decodeStructField(this.decoder_, field, this.version_);
  }
}
class JsTimeConverter {
  msec(date) {
    return date.valueOf();
  }
  convert(view) {
    return new Date(view.msec);
  }
}
const TimeSpec = { $: {} };
const JSTimeSpec = { $: {} };
const TimeDeltaSpec = { $: {} };
const TimeTicksSpec = { $: {} };
mojo.internal.Struct(
  TimeSpec.$,
  "Time",
  [
    mojo.internal.StructField(
      "internalValue",
      0,
      0,
      mojo.internal.Int64,
      BigInt(0),
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
const converterForJSTime = new JsTimeConverter();
mojo.internal.TypemappedStruct(
  JSTimeSpec.$,
  "JSTime",
  JSTimeDataView,
  converterForJSTime,
  [
    mojo.internal.StructField(
      "msec",
      0,
      0,
      mojo.internal.Double,
      0,
      false,
      0,
      undefined,
      (value) => converterForJSTime.msec(value),
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  TimeDeltaSpec.$,
  "TimeDelta",
  [
    mojo.internal.StructField(
      "microseconds",
      0,
      0,
      mojo.internal.Int64,
      BigInt(0),
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  TimeTicksSpec.$,
  "TimeTicks",
  [
    mojo.internal.StructField(
      "internalValue",
      0,
      0,
      mojo.internal.Int64,
      BigInt(0),
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
class UrlDataView {
  decoder_;
  version_;
  fieldSpecs_;
  constructor(decoder, version, fieldSpecs) {
    this.decoder_ = decoder;
    this.version_ = version;
    this.fieldSpecs_ = fieldSpecs;
  }
  get url() {
    const field = this.fieldSpecs_[0];
    return mojo.internal.decodeStructField(this.decoder_, field, this.version_);
  }
}
class UrlConverter {
  url(url) {
    return url;
  }
  convert(view) {
    return view.url;
  }
}
const UrlSpec = { $: {} };
const converterForUrl = new UrlConverter();
mojo.internal.TypemappedStruct(
  UrlSpec.$,
  "Url",
  UrlDataView,
  converterForUrl,
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      (value) => converterForUrl.url(value),
    ),
  ],
  [[0, 16]],
);
const GlicExperimentalTriggeringStateSpec = { $: mojo.internal.Enum() };
var GlicExperimentalTriggeringState;
(function (GlicExperimentalTriggeringState) {
  GlicExperimentalTriggeringState[
    (GlicExperimentalTriggeringState["MIN_VALUE"] = 0)
  ] = "MIN_VALUE";
  GlicExperimentalTriggeringState[
    (GlicExperimentalTriggeringState["MAX_VALUE"] = 2)
  ] = "MAX_VALUE";
  GlicExperimentalTriggeringState[
    (GlicExperimentalTriggeringState["kUnavailable"] = 0)
  ] = "kUnavailable";
  GlicExperimentalTriggeringState[
    (GlicExperimentalTriggeringState["kNeedsOptIn"] = 1)
  ] = "kNeedsOptIn";
  GlicExperimentalTriggeringState[
    (GlicExperimentalTriggeringState["kReady"] = 2)
  ] = "kReady";
})(GlicExperimentalTriggeringState || (GlicExperimentalTriggeringState = {}));
const ActuationEligibilitySpec = { $: mojo.internal.Enum() };
var ActuationEligibility;
(function (ActuationEligibility) {
  ActuationEligibility[(ActuationEligibility["MIN_VALUE"] = 0)] = "MIN_VALUE";
  ActuationEligibility[(ActuationEligibility["MAX_VALUE"] = 5)] = "MAX_VALUE";
  ActuationEligibility[(ActuationEligibility["kEligible"] = 0)] = "kEligible";
  ActuationEligibility[
    (ActuationEligibility["kMissingAccountCapability"] = 1)
  ] = "kMissingAccountCapability";
  ActuationEligibility[(ActuationEligibility["kMissingChromeBenefits"] = 2)] =
    "kMissingChromeBenefits";
  ActuationEligibility[(ActuationEligibility["kDisabledByPolicy"] = 3)] =
    "kDisabledByPolicy";
  ActuationEligibility[
    (ActuationEligibility["kEnterpriseWithoutManagement"] = 4)
  ] = "kEnterpriseWithoutManagement";
  ActuationEligibility[(ActuationEligibility["kPlatformUnsupported"] = 5)] =
    "kPlatformUnsupported";
})(ActuationEligibility || (ActuationEligibility = {}));
const FreCompletionWaitModeSpec = { $: mojo.internal.Enum() };
var FreCompletionWaitMode;
(function (FreCompletionWaitMode) {
  FreCompletionWaitMode[(FreCompletionWaitMode["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FreCompletionWaitMode[(FreCompletionWaitMode["MAX_VALUE"] = 2)] = "MAX_VALUE";
  FreCompletionWaitMode[(FreCompletionWaitMode["kDefault"] = 0)] = "kDefault";
  FreCompletionWaitMode[(FreCompletionWaitMode["kNever"] = 1)] = "kNever";
  FreCompletionWaitMode[(FreCompletionWaitMode["kAlways"] = 2)] = "kAlways";
})(FreCompletionWaitMode || (FreCompletionWaitMode = {}));
class InternalsPageHandlerPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.InternalsPageHandler",
      scope,
    );
  }
}
class InternalsPageHandlerRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      InternalsPageHandlerPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  getInternalsDataPayload() {
    return this.proxy.sendMessage(
      442398424,
      InternalsPageHandler_GetInternalsDataPayload_ParamsSpec.$,
      InternalsPageHandler_GetInternalsDataPayload_ResponseParamsSpec.$,
      [],
      false,
    );
  }
  setGuestUrlPresets(autopush, staging, preprod, prod) {
    this.proxy.sendMessage(
      1825407266,
      InternalsPageHandler_SetGuestUrlPresets_ParamsSpec.$,
      null,
      [autopush, staging, preprod, prod],
      false,
    );
  }
  triggerInvokeFromInternalsAction(options) {
    return this.proxy.sendMessage(
      1321197687,
      InternalsPageHandler_TriggerInvokeFromInternalsAction_ParamsSpec.$,
      InternalsPageHandler_TriggerInvokeFromInternalsAction_ResponseParamsSpec.$,
      [options],
      false,
    );
  }
  getOpenTabs() {
    return this.proxy.sendMessage(
      609770941,
      InternalsPageHandler_GetOpenTabs_ParamsSpec.$,
      InternalsPageHandler_GetOpenTabs_ResponseParamsSpec.$,
      [],
      false,
    );
  }
  setWebContinuityOriginatingHostUrlPreset(webContinuityOriginatingHostUrl) {
    this.proxy.sendMessage(
      462374391,
      InternalsPageHandler_SetWebContinuityOriginatingHostUrlPreset_ParamsSpec.$,
      null,
      [webContinuityOriginatingHostUrl],
      false,
    );
  }
  setShowErrorAllowed(allowed) {
    this.proxy.sendMessage(
      1372777222,
      InternalsPageHandler_SetShowErrorAllowed_ParamsSpec.$,
      null,
      [allowed],
      false,
    );
  }
  showExperimentalOptIn() {
    this.proxy.sendMessage(
      656341604,
      InternalsPageHandler_ShowExperimentalOptIn_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  revokeExperimentalTriggeringConsent() {
    this.proxy.sendMessage(
      2087196874,
      InternalsPageHandler_RevokeExperimentalTriggeringConsent_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  revokeGlicConsent() {
    this.proxy.sendMessage(
      660127513,
      InternalsPageHandler_RevokeGlicConsent_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  revokeActuationConsent() {
    this.proxy.sendMessage(
      1716584486,
      InternalsPageHandler_RevokeActuationConsent_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
}
class InternalsPageHandlerFactoryPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.InternalsPageHandlerFactory",
      scope,
    );
  }
}
class InternalsPageHandlerFactoryRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      InternalsPageHandlerFactoryPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  createInternalsPageHandler(receiver) {
    this.proxy.sendMessage(
      878746371,
      InternalsPageHandlerFactory_CreateInternalsPageHandler_ParamsSpec.$,
      null,
      [receiver],
      false,
    );
  }
}
class InternalsPageHandlerFactory {
  static get $interfaceName() {
    return "glic.mojom.InternalsPageHandlerFactory";
  }
  static getRemote() {
    let remote = new InternalsPageHandlerFactoryRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
const GeminiEnterpriseSettingsInfoSpec = { $: {} };
const ProfileEnablementSpec = { $: {} };
const ConfigInfoSpec = { $: {} };
const TieredRolloutInfoSpec = { $: {} };
const InternalsDataPayloadSpec = { $: {} };
const InternalsDebugInfoSpec = { $: {} };
const ScreenshotTestKeyConfigurationSpec = { $: {} };
const DefaultConversationSpec = { $: {} };
const NewConversationSpec = { $: {} };
const DefaultSurfaceMojoSpec = { $: {} };
const NewTabMojoSpec = { $: {} };
const UniversalCartPayloadMojoSpec = { $: {} };
const TriggerInvokeFromInternalsOptionsSpec = { $: {} };
const InternalsPageHandler_GetInternalsDataPayload_ParamsSpec = { $: {} };
const InternalsPageHandler_GetInternalsDataPayload_ResponseParamsSpec = {
  $: {},
};
const InternalsPageHandler_SetGuestUrlPresets_ParamsSpec = { $: {} };
const InternalsPageHandler_TriggerInvokeFromInternalsAction_ParamsSpec = {
  $: {},
};
const InternalsPageHandler_TriggerInvokeFromInternalsAction_ResponseParamsSpec =
  { $: {} };
const InternalsPageHandler_GetOpenTabs_ParamsSpec = { $: {} };
const InternalsPageHandler_GetOpenTabs_ResponseParamsSpec = { $: {} };
const InternalsPageHandler_SetWebContinuityOriginatingHostUrlPreset_ParamsSpec =
  { $: {} };
const InternalsPageHandler_SetShowErrorAllowed_ParamsSpec = { $: {} };
const InternalsPageHandler_ShowExperimentalOptIn_ParamsSpec = { $: {} };
const InternalsPageHandler_RevokeExperimentalTriggeringConsent_ParamsSpec = {
  $: {},
};
const InternalsPageHandler_RevokeGlicConsent_ParamsSpec = { $: {} };
const InternalsPageHandler_RevokeActuationConsent_ParamsSpec = { $: {} };
const InternalsPageHandlerFactory_CreateInternalsPageHandler_ParamsSpec = {
  $: {},
};
const InvokeConversationSelectionSpec = { $: {} };
const InvokeTargetSurfaceSpec = { $: {} };
const TriggerInvokePayloadSpec = { $: {} };
mojo.internal.Struct(
  GeminiEnterpriseSettingsInfoSpec.$,
  "GeminiEnterpriseSettingsInfo",
  [
    mojo.internal.StructField(
      "projectId",
      0,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "appId",
      8,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "location",
      16,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 32]],
);
mojo.internal.Struct(
  ProfileEnablementSpec.$,
  "ProfileEnablement",
  [
    mojo.internal.StructField(
      "featureEnabled",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isRegularProfile",
      0,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isRolledOut",
      0,
      2,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "primaryAccountIsCapable",
      0,
      3,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "primaryAccountIsFullySignedIn",
      0,
      4,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "allowedByChromePolicy",
      0,
      5,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "allowedByRemoteAdmin",
      0,
      6,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "allowedByRemoteOther",
      0,
      7,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "freIsConsented",
      1,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "allowedByCountryFilter",
      1,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "allowedByLocaleFilter",
      1,
      2,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "actuationIsConsented",
      1,
      3,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "liveAllowed",
      1,
      4,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "shareImageAllowed",
      1,
      5,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "geminiEnterpriseSettings",
      8,
      0,
      GeminiEnterpriseSettingsInfoSpec.$,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "actuationEligibility",
      4,
      0,
      ActuationEligibilitySpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicApiActuationEligibility",
      16,
      0,
      ActuationEligibilitySpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicExperimentalTriggeringState",
      20,
      0,
      GlicExperimentalTriggeringStateSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 32]],
);
mojo.internal.Struct(
  ConfigInfoSpec.$,
  "ConfigInfo",
  [
    mojo.internal.StructField(
      "guestUrl",
      0,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "autopushGuestUrl",
      8,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "stagingGuestUrl",
      16,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "preprodGuestUrl",
      24,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "prodGuestUrl",
      32,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "webContinuityOriginatingHostUrl",
      40,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 56]],
);
mojo.internal.Struct(
  TieredRolloutInfoSpec.$,
  "TieredRolloutInfo",
  [
    mojo.internal.StructField(
      "ai_subscription_tier_$flag",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      {
        isPrimary: true,
        linkedValueFieldName: "ai_subscription_tier_$value",
        originalFieldName: "aiSubscriptionTier",
      },
      undefined,
    ),
    mojo.internal.StructField(
      "ai_subscription_tier_$value",
      4,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      { isPrimary: false, originalFieldName: "aiSubscriptionTier" },
      undefined,
    ),
    mojo.internal.StructField(
      "isEligibleForTieredRolloutV1",
      0,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isEligibleForTieredRolloutV2",
      0,
      2,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isEligibleForBenefitBasedRollout",
      0,
      3,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isEligibleOverall",
      0,
      4,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicRolloutEligibilityPref",
      0,
      5,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "tieredRolloutV2EligibleTiers",
      8,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "subscriptionBenefits",
      16,
      0,
      mojo.internal.Array(mojo.internal.String, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "eligibleBenefits",
      24,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "actorEligibleBenefits",
      32,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "preferenceSyncStatus",
      40,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 56]],
);
mojo.internal.Struct(
  InternalsDataPayloadSpec.$,
  "InternalsDataPayload",
  [
    mojo.internal.StructField(
      "enablement",
      0,
      0,
      ProfileEnablementSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "config",
      8,
      0,
      ConfigInfoSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "showErrorAllowed",
      16,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "experimentalTriggeringEnabled",
      16,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "debugInfo",
      24,
      0,
      InternalsDebugInfoSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "tieredRolloutInfo",
      32,
      0,
      TieredRolloutInfoSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 48]],
);
mojo.internal.Struct(
  InternalsDebugInfoSpec.$,
  "InternalsDebugInfo",
  [
    mojo.internal.StructField(
      "glicActorFeatureEnabled",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicRolloutFeatureEnabled",
      0,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicTieredRolloutFeatureEnabled",
      0,
      2,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicTieredRolloutV2FeatureEnabled",
      0,
      3,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "glicSubscriptionBenefitsEligibilityFeatureEnabled",
      0,
      4,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "platform",
      4,
      0,
      PlatformSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "formFactor",
      8,
      0,
      FormFactorSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "booleanSettings",
      16,
      0,
      mojo.internal.Map(mojo.internal.String, mojo.internal.Bool, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "hotkey",
      24,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "locale",
      32,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "permanentCountryCode",
      40,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "sessionCountryCode",
      48,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "systemRequirementMet",
      0,
      5,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "osVersionSupported",
      0,
      6,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "anchorEntrypointOverrideActive",
      0,
      7,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "primaryAccountNeedsSignedIn",
      1,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "dogfoodStatus",
      56,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 72]],
);
mojo.internal.Struct(
  ScreenshotTestKeyConfigurationSpec.$,
  "ScreenshotTestKeyConfiguration",
  [
    mojo.internal.StructField(
      "publicKey",
      0,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "authSecret",
      8,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  DefaultConversationSpec.$,
  "DefaultConversation",
  [],
  [[0, 8]],
);
mojo.internal.Struct(NewConversationSpec.$, "NewConversation", [], [[0, 8]]);
mojo.internal.Struct(
  DefaultSurfaceMojoSpec.$,
  "DefaultSurfaceMojo",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  NewTabMojoSpec.$,
  "NewTabMojo",
  [
    mojo.internal.StructField(
      "openInForeground",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  UniversalCartPayloadMojoSpec.$,
  "UniversalCartPayloadMojo",
  [
    mojo.internal.StructField(
      "serializedMetadata",
      0,
      0,
      mojo.internal.Array(mojo.internal.Uint8, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  TriggerInvokeFromInternalsOptionsSpec.$,
  "TriggerInvokeFromInternalsOptions",
  [
    mojo.internal.StructField(
      "invocationSource",
      0,
      0,
      InvocationSourceSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "prompts",
      8,
      0,
      mojo.internal.Array(mojo.internal.String, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "conversation",
      16,
      0,
      InvokeConversationSelectionSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "feature_mode_$flag",
      4,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      {
        isPrimary: true,
        linkedValueFieldName: "feature_mode_$value",
        originalFieldName: "featureMode",
      },
      undefined,
    ),
    mojo.internal.StructField(
      "feature_mode_$value",
      32,
      0,
      FeatureModeSpec.$,
      0,
      false,
      0,
      { isPrimary: false, originalFieldName: "featureMode" },
      undefined,
    ),
    mojo.internal.StructField(
      "disableZss",
      4,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "zssAdditionalContent",
      40,
      0,
      mojo.internal.String,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "skillId",
      48,
      0,
      mojo.internal.String,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "errorMessage",
      56,
      0,
      mojo.internal.String,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "timeout",
      64,
      0,
      TimeDeltaSpec.$,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "autoSubmit",
      4,
      2,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "freOverride",
      36,
      0,
      FreOverrideSpec.$,
      FreOverride.kUnspecified,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "waitForPanelOpen",
      4,
      3,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "focus_on_show_$flag",
      4,
      4,
      mojo.internal.Bool,
      false,
      false,
      0,
      {
        isPrimary: true,
        linkedValueFieldName: "focus_on_show_$value",
        originalFieldName: "focusOnShow",
      },
      undefined,
    ),
    mojo.internal.StructField(
      "focus_on_show_$value",
      4,
      5,
      mojo.internal.Bool,
      false,
      false,
      0,
      { isPrimary: false, originalFieldName: "focusOnShow" },
      undefined,
    ),
    mojo.internal.StructField(
      "freCompletionWaitMode",
      72,
      0,
      FreCompletionWaitModeSpec.$,
      FreCompletionWaitMode.kDefault,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "show_panel_$flag",
      4,
      6,
      mojo.internal.Bool,
      false,
      false,
      0,
      {
        isPrimary: true,
        linkedValueFieldName: "show_panel_$value",
        originalFieldName: "showPanel",
      },
      undefined,
    ),
    mojo.internal.StructField(
      "show_panel_$value",
      4,
      7,
      mojo.internal.Bool,
      false,
      false,
      0,
      { isPrimary: false, originalFieldName: "showPanel" },
      undefined,
    ),
    mojo.internal.StructField(
      "surface",
      80,
      0,
      InvokeTargetSurfaceSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "specific_tab_index_$flag",
      5,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      {
        isPrimary: true,
        linkedValueFieldName: "specific_tab_index_$value",
        originalFieldName: "specificTabIndex",
      },
      undefined,
    ),
    mojo.internal.StructField(
      "specific_tab_index_$value",
      76,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      { isPrimary: false, originalFieldName: "specificTabIndex" },
      undefined,
    ),
    mojo.internal.StructField(
      "specificTabsToShareIndices",
      96,
      0,
      mojo.internal.Array(mojo.internal.Int32, false),
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "actuationTarget",
      104,
      0,
      ActuationTargetSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "payload",
      112,
      0,
      TriggerInvokePayloadSpec.$,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "takeScreenshot",
      5,
      1,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "keyConfig",
      128,
      0,
      ScreenshotTestKeyConfigurationSpec.$,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "supersedeIfInProgress",
      5,
      2,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 144]],
);
mojo.internal.Struct(
  InternalsPageHandler_GetInternalsDataPayload_ParamsSpec.$,
  "InternalsPageHandler_GetInternalsDataPayload_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  InternalsPageHandler_GetInternalsDataPayload_ResponseParamsSpec.$,
  "InternalsPageHandler_GetInternalsDataPayload_ResponseParams",
  [
    mojo.internal.StructField(
      "internalsData",
      0,
      0,
      InternalsDataPayloadSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  InternalsPageHandler_SetGuestUrlPresets_ParamsSpec.$,
  "InternalsPageHandler_SetGuestUrlPresets_Params",
  [
    mojo.internal.StructField(
      "autopush",
      0,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "staging",
      8,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "preprod",
      16,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "prod",
      24,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 40]],
);
mojo.internal.Struct(
  InternalsPageHandler_TriggerInvokeFromInternalsAction_ParamsSpec.$,
  "InternalsPageHandler_TriggerInvokeFromInternalsAction_Params",
  [
    mojo.internal.StructField(
      "options",
      0,
      0,
      TriggerInvokeFromInternalsOptionsSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  InternalsPageHandler_TriggerInvokeFromInternalsAction_ResponseParamsSpec.$,
  "InternalsPageHandler_TriggerInvokeFromInternalsAction_ResponseParams",
  [
    mojo.internal.StructField(
      "success",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "errorMessage",
      8,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  InternalsPageHandler_GetOpenTabs_ParamsSpec.$,
  "InternalsPageHandler_GetOpenTabs_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  InternalsPageHandler_GetOpenTabs_ResponseParamsSpec.$,
  "InternalsPageHandler_GetOpenTabs_ResponseParams",
  [
    mojo.internal.StructField(
      "tabTitles",
      0,
      0,
      mojo.internal.Array(mojo.internal.String, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  InternalsPageHandler_SetWebContinuityOriginatingHostUrlPreset_ParamsSpec.$,
  "InternalsPageHandler_SetWebContinuityOriginatingHostUrlPreset_Params",
  [
    mojo.internal.StructField(
      "webContinuityOriginatingHostUrl",
      0,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  InternalsPageHandler_SetShowErrorAllowed_ParamsSpec.$,
  "InternalsPageHandler_SetShowErrorAllowed_Params",
  [
    mojo.internal.StructField(
      "allowed",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  InternalsPageHandler_ShowExperimentalOptIn_ParamsSpec.$,
  "InternalsPageHandler_ShowExperimentalOptIn_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  InternalsPageHandler_RevokeExperimentalTriggeringConsent_ParamsSpec.$,
  "InternalsPageHandler_RevokeExperimentalTriggeringConsent_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  InternalsPageHandler_RevokeGlicConsent_ParamsSpec.$,
  "InternalsPageHandler_RevokeGlicConsent_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  InternalsPageHandler_RevokeActuationConsent_ParamsSpec.$,
  "InternalsPageHandler_RevokeActuationConsent_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  InternalsPageHandlerFactory_CreateInternalsPageHandler_ParamsSpec.$,
  "InternalsPageHandlerFactory_CreateInternalsPageHandler_Params",
  [
    mojo.internal.StructField(
      "receiver",
      0,
      0,
      mojo.internal.InterfaceRequest(InternalsPageHandlerPendingReceiver),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Union(
  InvokeConversationSelectionSpec.$,
  "InvokeConversationSelection",
  {
    defaultConversation: { ordinal: 0, type: DefaultConversationSpec.$ },
    newConversation: { ordinal: 1, type: NewConversationSpec.$ },
    conversationId: { ordinal: 2, type: mojo.internal.String },
  },
);
var InvokeConversationSelectionFieldTags;
(function (InvokeConversationSelectionFieldTags) {
  InvokeConversationSelectionFieldTags[
    (InvokeConversationSelectionFieldTags["DEFAULT_CONVERSATION"] = 0)
  ] = "DEFAULT_CONVERSATION";
  InvokeConversationSelectionFieldTags[
    (InvokeConversationSelectionFieldTags["NEW_CONVERSATION"] = 1)
  ] = "NEW_CONVERSATION";
  InvokeConversationSelectionFieldTags[
    (InvokeConversationSelectionFieldTags["CONVERSATION_ID"] = 2)
  ] = "CONVERSATION_ID";
})(
  InvokeConversationSelectionFieldTags ||
    (InvokeConversationSelectionFieldTags = {}),
);
mojo.internal.Union(InvokeTargetSurfaceSpec.$, "InvokeTargetSurface", {
  defaultSurface: { ordinal: 0, type: DefaultSurfaceMojoSpec.$ },
  newTab: { ordinal: 1, type: NewTabMojoSpec.$ },
});
var InvokeTargetSurfaceFieldTags;
(function (InvokeTargetSurfaceFieldTags) {
  InvokeTargetSurfaceFieldTags[
    (InvokeTargetSurfaceFieldTags["DEFAULT_SURFACE"] = 0)
  ] = "DEFAULT_SURFACE";
  InvokeTargetSurfaceFieldTags[(InvokeTargetSurfaceFieldTags["NEW_TAB"] = 1)] =
    "NEW_TAB";
})(InvokeTargetSurfaceFieldTags || (InvokeTargetSurfaceFieldTags = {}));
mojo.internal.Union(TriggerInvokePayloadSpec.$, "TriggerInvokePayload", {
  universalCart: { ordinal: 0, type: UniversalCartPayloadMojoSpec.$ },
});
var TriggerInvokePayloadFieldTags;
(function (TriggerInvokePayloadFieldTags) {
  TriggerInvokePayloadFieldTags[
    (TriggerInvokePayloadFieldTags["UNIVERSAL_CART"] = 0)
  ] = "UNIVERSAL_CART";
})(TriggerInvokePayloadFieldTags || (TriggerInvokePayloadFieldTags = {}));
const browserProxyFactory = new MojoHandlerProxyFactory(
  InternalsPageHandlerRemote,
  (receiver) =>
    InternalsPageHandlerFactory.getRemote().createInternalsPageHandler(
      receiver,
    ),
);
let instance = null;
function getCss() {
  return (
    instance ||
    (instance = [
      ...[],
      css`
        :host {
          --badge-success-bg: var(--google-green-50, #e6f4ea);
          --badge-success-border: var(--google-green-300, #a8dab5);
          --badge-success-color: var(--google-green-800, #137333);
          --badge-error-bg: var(--google-red-50, #fce8e6);
          --badge-error-border: var(--google-red-300, #fad2cf);
          --badge-error-color: var(--google-red-800, #c5221f);
          --badge-neutral-bg: var(--google-grey-100, #f1f3f4);
          --badge-neutral-border: var(--google-grey-300, #dadce0);
          --badge-neutral-color: var(--google-grey-800, #3c4043);
          color: var(--cr-fallback-color-on-surface);
          display: block;
          margin: 0 auto;
          max-width: 1100px;
          padding: 16px;
        }
        @media (prefers-color-scheme: dark) {
          :host {
            --badge-success-bg: rgba(129, 201, 149, 0.15);
            --badge-success-border: var(--google-green-700, #1e8e3e);
            --badge-success-color: var(--google-green-300, #81c995);
            --badge-error-bg: rgba(242, 139, 130, 0.15);
            --badge-error-border: var(--google-red-700, #d93025);
            --badge-error-color: var(--google-red-300, #f28b82);
            --badge-neutral-bg: rgba(255, 255, 255, 0.08);
            --badge-neutral-border: var(--google-grey-700, #5f6368);
            --badge-neutral-color: var(--google-grey-300, #dadce0);
          }
        }
        .header-bar {
          align-items: center;
          border-bottom: 1px solid
            var(--cr-fallback-color-divider, var(--cr-fallback-color-outline));
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        cr-tabs {
          --cr-tabs-flex: none;
          --cr-tabs-font-size: 14px;
          --cr-tabs-height: 44px;
          --cr-tabs-tab-inline-padding: 0;
          gap: 24px;
          margin-bottom: -1px;
        }
        .action-bar {
          align-items: center;
          display: flex;
          gap: 8px;
        }
        .status-banner {
          background-color: var(--cr-fallback-color-surface);
          border: 1px solid var(--cr-fallback-color-outline);
          border-radius: var(--cr-card-border-radius);
          margin-bottom: 20px;
          padding: 16px 20px;
        }
        .status-banner.status-ok {
          background-color: var(--badge-success-bg);
          border-color: var(--badge-success-border);
        }
        .status-banner.status-blocked {
          background-color: var(--badge-error-bg);
          border-color: var(--badge-error-border);
        }
        .status-banner-header {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: space-between;
        }
        .status-banner-title {
          align-items: center;
          display: flex;
          font-size: 18px;
          font-weight: 500;
          gap: 8px;
        }
        .status-banner-reason {
          font-size: 13px;
          margin-top: 6px;
          opacity: 0.9;
        }
        .status-banner-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .card {
          background-color: var(--cr-fallback-color-surface);
          border: 1px solid var(--cr-fallback-color-outline);
          border-radius: var(--cr-card-border-radius);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          margin-bottom: 20px;
          overflow: hidden;
        }
        .card-header {
          align-items: center;
          background-color: var(--cr-fallback-color-surface-variant);
          border-bottom: 1px solid
            var(--cr-fallback-color-divider, var(--cr-fallback-color-outline));
          color: var(--cr-fallback-color-on-surface);
          display: flex;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          text-transform: uppercase;
        }
        table {
          border-collapse: collapse;
          font-size: 13px;
          width: 100%;
        }
        th {
          background-color: var(--cr-fallback-color-surface-variant);
          border-bottom: 1px solid
            var(--cr-fallback-color-divider, var(--cr-fallback-color-outline));
          color: var(
            --cr-fallback-color-on-surface-variant,
            var(--cr-fallback-color-on-surface)
          );
          font-weight: 500;
          padding: 8px 16px;
          text-align: left;
        }
        td {
          border-bottom: 1px solid
            var(--cr-fallback-color-divider, rgba(0, 0, 0, 0.08));
          color: var(--cr-fallback-color-on-surface);
          padding: 8px 16px;
          vertical-align: middle;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:nth-child(even) td {
          background-color: rgba(var(--cr-fallback-color-on-surface-rgb), 0.02);
        }
        tr:hover td {
          background-color: rgba(var(--cr-fallback-color-on-surface-rgb), 0.05);
        }
        .status-col,
        .status-cell-left {
          white-space: nowrap;
          width: 130px;
        }
        td.property-name {
          word-break: break-word;
        }
        .badge {
          align-items: center;
          border: 1px solid transparent;
          border-radius: 12px;
          display: inline-flex;
          font-size: 11px;
          font-weight: 600;
          gap: 4px;
          letter-spacing: 0.4px;
          line-height: 14px;
          padding: 3px 8px;
          text-transform: uppercase;
        }
        .badge-success {
          background-color: var(--badge-success-bg);
          border-color: var(--badge-success-border);
          color: var(--badge-success-color);
        }
        .badge-error {
          background-color: var(--badge-error-bg);
          border-color: var(--badge-error-border);
          color: var(--badge-error-color);
        }
        .badge-neutral {
          background-color: var(--badge-neutral-bg);
          border-color: var(--badge-neutral-border);
          color: var(--badge-neutral-color);
        }
        .warning-banner {
          align-items: center;
          background-color: rgba(var(--cr-fallback-color-on-surface-rgb), 0.04);
          border-left: 4px solid var(--google-yellow-700, #f29900);
          border-radius: 4px;
          color: var(--cr-fallback-color-on-surface);
          display: flex;
          font-size: 12px;
          font-weight: 500;
          gap: 8px;
          margin: 12px 16px;
          padding: 10px 12px;
        }
        .presets-container,
        .web-continuity-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 600px;
          padding: 16px;
        }
        .log-container {
          background-color: var(--cr-fallback-color-surface-variant);
          border: 1px solid var(--cr-fallback-color-divider, #ccc);
          color: var(--cr-fallback-color-on-surface);
          font-family: monospace;
          margin-top: 10px;
          max-height: 200px;
          overflow-y: auto;
          padding: 8px;
        }
        cr-button {
          width: fit-content;
        }
        cr-button:not(.action-button):not(.tonal-button) {
          --cr-button-border-color: var(--cr-fallback-color-outline);
          --cr-button-text-color: var(--cr-fallback-color-on-surface);
        }
        .hiddenElement {
          visibility: hidden;
        }
      `,
    ])
  );
}
function getHtml() {
  return html`<!--_html_template_start_-->
  <div>
    <div class="header-bar">
      <cr-tabs id="tabs" .tabNames="${this.tabNames_}"
          .selected="${this.selectedTabIndex_}"
          @selected-changed="${this.onSelectedTabIndexSelectedChanged_}">
      </cr-tabs>
      <div class="action-bar">
        <cr-button id="copyDiagnosticsButton" class="action-button" @click="${this.onCopyDiagnosticsClick_}">
          ${this.copyButtonText_}
        </cr-button>
        <cr-button id="refreshButton" class="tonal-button" @click="${this.onRefreshClick_}">
          Refresh
        </cr-button>
      </div>
    </div>
    <div id="general-contents" class="tab-contents"
        ?hidden="${this.selectedTabIndex_ !== 0}">

      ${
        this.data_?.enablement
          ? html`
              <div
                class="status-banner ${this.computeOverallStatus_().enabled ? "status-ok" : "status-blocked"}"
              >
                <div class="status-banner-header">
                  <div class="status-banner-title">
                    <span
                      class="badge ${this.computeOverallStatus_().enabled ? "badge-success" : "badge-error"}"
                    >
                      ${this.computeOverallStatus_().enabled ? "Eligible & Enabled" : "Blocked / Ineligible"}
                    </span>
                    <span>Glic Status</span>
                  </div>
                  <div class="status-banner-chips">
                    ${
                      this.data_?.debugInfo
                        ? html`
                            <span class="badge badge-neutral"
                              >${this.getPlatformString_(this.data_.debugInfo.platform)}</span
                            >
                            <span class="badge badge-neutral"
                              >${this.getFormFactorString_(this.data_.debugInfo.formFactor)}</span
                            >
                          `
                        : ""
                    }
                    ${
                      this.data_?.tieredRolloutInfo
                        ? html`
                            <span class="badge badge-neutral"
                              >Tier:
                              ${this.data_.tieredRolloutInfo.aiSubscriptionTier ?? "N/A"}</span
                            >
                            ${
                              this.data_.tieredRolloutInfo.subscriptionBenefits
                                .length > 0
                                ? html`
                                    <span class="badge badge-neutral"
                                      >Benefits:
                                      ${this.data_.tieredRolloutInfo.subscriptionBenefits.join(", ")}</span
                                    >
                                  `
                                : ""
                            }
                          `
                        : ""
                    }
                  </div>
                </div>
                ${
                  !this.computeOverallStatus_().enabled &&
                  this.computeOverallStatus_().reason
                    ? html`
                        <div class="status-banner-reason">
                          <strong>Blocking reason:</strong>
                          ${this.computeOverallStatus_().reason}
                        </div>
                      `
                    : ""
                }
              </div>
            `
          : ""
      }

      <div class="card">
        <div class="card-header">Enablement State</div>
        ${
          this.data_?.enablement
            ? html` <table>
                <thead>
                  <tr>
                    <th class="status-col">Status</th>
                    <th>Property</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.getTableData_().map(
                    (item) => html`
                      <tr>
                        <td class="status-cell-left">
                          <span
                            class="badge ${item.value ? "badge-success" : "badge-error"}"
                          >
                            ${item.value ? "Passed" : "Blocked"}
                          </span>
                        </td>
                        <td class="property-name">${item.label}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>`
            : html`<div style="padding: 16px;">Loading...</div>`
        }
      </div>

      <div class="card">
        <div class="card-header">Sub-features & Actuation</div>
        ${
          this.data_?.enablement
            ? html` <table>
                <thead>
                  <tr>
                    <th class="status-col">State</th>
                    <th>Feature</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.enablement.liveAllowed ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.enablement.liveAllowed ? "Allowed" : "Disallowed"}
                      </span>
                    </td>
                    <td class="property-name">Account is eligible for Live</td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.enablement.shareImageAllowed ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.enablement.shareImageAllowed ? "Allowed" : "Disallowed"}
                      </span>
                    </td>
                    <td class="property-name">
                      Account is eligible for 'Create Image with Gemini'
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left" style="vertical-align: top;">
                      <span class="badge badge-neutral">
                        ${this.data_.enablement.geminiEnterpriseSettings ? "Configured" : "None"}
                      </span>
                    </td>
                    <td class="property-name">
                      <div>Gemini Enterprise Settings</div>
                      ${
                        this.data_.enablement.geminiEnterpriseSettings
                          ? html`
                              <div
                                style="font-size: 12px; color: var(--cr-secondary-text-color); margin-top: 4px;"
                              >
                                Project ID:
                                <code
                                  >${this.data_.enablement.geminiEnterpriseSettings.projectId}</code
                                >
                                | App ID:
                                <code
                                  >${this.data_.enablement.geminiEnterpriseSettings.appId}</code
                                >
                                | Location:
                                <code
                                  >${this.data_.enablement.geminiEnterpriseSettings.location}</code
                                >
                              </div>
                            `
                          : ""
                      }
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.isActuationEligible_() ? "badge-success" : "badge-error"}"
                      >
                        ${this.getActuationEligibilityString_(this.data_.enablement.actuationEligibility)}
                      </span>
                    </td>
                    <td class="property-name">Actuation Eligibility</td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.isGlicApiActuationEligible_() ? "badge-success" : "badge-error"}"
                      >
                        ${this.getActuationEligibilityString_(this.data_.enablement.glicApiActuationEligibility)}
                      </span>
                    </td>
                    <td class="property-name">
                      Glic API Actuation Eligibility
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span class="badge badge-neutral">
                        ${this.getExperimentalTriggeringStateString_(this.data_.enablement.glicExperimentalTriggeringState)}
                      </span>
                    </td>
                    <td class="property-name">Experimental Triggering State</td>
                  </tr>
                </tbody>
              </table>`
            : html`<div style="padding: 16px;">Loading...</div>`
        }
      </div>

      <div class="card">
        <div class="card-header">Rollout / User Tier & Benefits</div>
        ${
          this.data_?.tieredRolloutInfo
            ? html` <table>
                <thead>
                  <tr>
                    <th class="status-col">State / Value</th>
                    <th>Property</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.tieredRolloutInfo.isEligibleOverall ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.tieredRolloutInfo.isEligibleOverall ? "Eligible" : "Ineligible"}
                      </span>
                    </td>
                    <td class="property-name">Is Eligible Overall (C++)</td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.tieredRolloutInfo.isEligibleForTieredRolloutV1 ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.tieredRolloutInfo.isEligibleForTieredRolloutV1 ? "Eligible" : "Ineligible"}
                      </span>
                    </td>
                    <td class="property-name">
                      Is Eligible for Tiered Rollout V1 (C++)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.tieredRolloutInfo.isEligibleForTieredRolloutV2 ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.tieredRolloutInfo.isEligibleForTieredRolloutV2 ? "Eligible" : "Ineligible"}
                      </span>
                    </td>
                    <td class="property-name">
                      Is Eligible for Tiered Rollout V2 (C++)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.tieredRolloutInfo.isEligibleForBenefitBasedRollout ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.tieredRolloutInfo.isEligibleForBenefitBasedRollout ? "Eligible" : "Ineligible"}
                      </span>
                    </td>
                    <td class="property-name">
                      Is Eligible for Benefit-Based Rollout (C++)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.tieredRolloutInfo.glicRolloutEligibilityPref ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.tieredRolloutInfo.glicRolloutEligibilityPref ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td class="property-name">
                      Rollout Eligibility Pref (kGlicRolloutEligibility)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      ${this.data_.tieredRolloutInfo.aiSubscriptionTier === null ? html`<span class="badge badge-neutral">N/A</span>` : html`<span class="badge badge-neutral">Tier ${this.data_.tieredRolloutInfo.aiSubscriptionTier}</span>`}
                    </td>
                    <td class="property-name">AI Subscription Tier</td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span class="badge badge-neutral"
                        >${this.data_.tieredRolloutInfo.preferenceSyncStatus}</span
                      >
                    </td>
                    <td class="property-name">
                      Preference Sync Status (Server Fetch)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <code
                        >${this.data_.tieredRolloutInfo.tieredRolloutV2EligibleTiers || "None"}</code
                      >
                    </td>
                    <td class="property-name">
                      Eligible Tiers for V2 Rollout (Param)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <span
                        class="badge ${this.data_.debugInfo?.glicSubscriptionBenefitsEligibilityFeatureEnabled ? "badge-success" : "badge-error"}"
                      >
                        ${this.data_.debugInfo?.glicSubscriptionBenefitsEligibilityFeatureEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td class="property-name">
                      Subscription Benefits Eligibility Flag
                      (kGlicSubscriptionBenefitsEligibility)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <code
                        >${this.data_.tieredRolloutInfo.subscriptionBenefits.join(", ") || "None"}</code
                      >
                    </td>
                    <td class="property-name">
                      Subscription Benefits (sync.subscription_benefits)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <code
                        >${this.data_.tieredRolloutInfo.eligibleBenefits || "None"}</code
                      >
                    </td>
                    <td class="property-name">
                      Eligible Benefits for Glic (Param)
                    </td>
                  </tr>
                  <tr>
                    <td class="status-cell-left">
                      <code
                        >${this.data_.tieredRolloutInfo.actorEligibleBenefits || "None"}</code
                      >
                    </td>
                    <td class="property-name">
                      Eligible Benefits for Autobrowse (Param)
                    </td>
                  </tr>
                </tbody>
              </table>`
            : html`<div style="padding: 16px;">Loading...</div>`
        }
      </div>

      <div class="card">
        <div class="card-header">Configuration</div>
        ${
          this.data_?.config
            ? html` <table>
                <thead>
                  <tr>
                    <th style="width: 130px;">Name</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight: 500;">Guest URL</td>
                    <td><code>${this.data_.config.guestUrl}</code></td>
                  </tr>
                </tbody>
              </table>`
            : html`<div style="padding: 16px;">Loading...</div>`
        }
      </div>

      <div class="card">
        <div class="card-header">Glic UI / Client Debug Information</div>
        <div class="warning-banner">
          <span>⚠️</span>
          <span>These settings are not dynamically observed. Click Refresh to get the latest settings.</span>
        </div>
        ${
          this.data_?.debugInfo
            ? html` <table>
                <thead>
                  <tr>
                    <th class="status-col">Value</th>
                    <th>Setting / Flag</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.getDebugSettingsData_().map(
                    (item) => html`
                      <tr>
                        <td class="status-cell-left">
                          ${typeof item.value === "boolean" ? html`<span class="badge ${item.value ? "badge-success" : "badge-error"}">${item.value ? "Enabled" : "Disabled"}</span>` : html`<span class="badge badge-neutral">${item.value}</span>`}
                        </td>
                        <td class="property-name">${item.label}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>`
            : html`<div style="padding: 16px;">Loading...</div>`
        }
      </div>
    </div>

      <!-- ================= DEBUG CONTROLS TAB ================= -->
      <div id="debug-controls-contents" class="tab-contents"
          ?hidden="${this.selectedTabIndex_ !== 1}">
        <h2>Debug Controls</h2>
        <div class="presets-container">
          <h3>Panel</h3>
          <div style="display: flex; gap: 16px; align-items: center;">
            <label>
              <input type="checkbox"
                  .checked="${!!this.data_?.showErrorAllowed}"
                  @change="${this.onShowErrorAllowedChange}">
              Allow Showing Errors
            </label>
          </div>
          <h3>Invoke</h3>
          <label for="invokePromptInput">Prompt</label>
          <input id="invokePromptInput" .value="${this.invokePrompt_}"
              @input="${this.onInvokePromptInput_}">
          </input>
          <label for="invokeTimeoutInput">Timeout Override (ms)</label>
          <input id="invokeTimeoutInput" type="number"
              .value="${this.invokeTimeoutMs_}"
              @input="${this.onInvokeTimeoutMsInput_}">
          </input>
          <div style="display: flex; flex-wrap: wrap; gap: 16px;
             align-items: center;">
            <label style="flex: 1 1 calc(50% - 8px);">
              <input type="checkbox" .checked="${this.invokeAutoSubmit_}"
                  @change="${this.onInvokeAutoSubmitChange_}">
              Auto Submit
            </label>
            <label style="flex: 1 1 calc(50% - 8px);">
              <input type="checkbox" .checked="${this.invokeWaitForPanelOpen_}"
                  @change="${this.onInvokeWaitForPanelOpenChange_}">
              Wait for Panel Open
            </label>
            <label style="flex: 1 1 calc(50% - 8px);">
              <input type="checkbox" .checked="${this.invokeFocusOnShow_}"
                  @change="${this.onInvokeFocusOnShowChange_}">
              Focus Panel on Show
            </label>
            <label style="flex: 1 1 calc(50% - 8px);">
              <input type="checkbox"
                  .checked="${this.invokeTakeScreenshot_}"
                  @change="${this.onInvokeTakeScreenshotChange_}">
              Test Take Screenshot
            </label>
            <label style="flex: 1 1 calc(50% - 8px);">
              <input type="checkbox"
                  .checked="${this.invokeSupersedeIfInProgress_}"
                  @change="${this.onInvokeSupersedeIfInProgressChange_}">
              Supersede if In Progress
            </label>
          </div>
          ${
            this.invokeTakeScreenshot_
              ? html`
            <div style="display: flex; flex-direction: column; gap: 8px;
               margin: 8px 0;">
              <label for="invokePublicKeyInput">
                Public Key (Base64 - optional)</label>
              <input id="invokePublicKeyInput" type="text"
                  .value="${this.invokePublicKey_}"
                  @input="${this.onInvokePublicKeyInput_}">
              </input>
              <label for="invokeAuthSecretInput">Auth Secret (optional)</label>
              <input id="invokeAuthSecretInput" type="text"
                  .value="${this.invokeAuthSecret_}"
                  @input="${this.onInvokeAuthSecretInput_}">
              </input>
            </div>
          `
              : html``
          }
          <div style="display: flex; gap: 16px; align-items: center;">
            ${
              this.invokeAutoSubmit_
                ? html`
                    <label style="flex: 1;">
                      <input
                        type="checkbox"
                        .checked="${this.invokeShowPanel_}"
                        @change="${this.onInvokeShowPanelChange_}"
                      />
                      Show Panel
                    </label>
                  `
                : html``
            }
          </div>
          <label for="invokeInvocationSourceSelect">Invocation Source</label>
          <select id="invokeInvocationSourceSelect"
              .value="${this.invokeInvocationSource_.toString()}"
              @change="${this.onInvokeInvocationSourceChange_}">
            ${this.getInvocationSourceOptions_().map(
              (option) => html`
                <option
                  value="${option.value}"
                  ?selected="${option.value === this.invokeInvocationSource_}"
                >
                  ${option.name}
                </option>
              `,
            )}
          </select>
          ${
            this.invokeInvocationSource_ === InvocationSource.kUniversalCart
              ? html`
            <div class="payload-container" style="
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 8px;">
              <h4>Universal Cart Payload</h4>
              <label for="payloadUniversalCartMetadataInput">
                Serialized Metadata
              </label>
              <input id="payloadUniversalCartMetadataInput"
                  .value="${this.invokePayloadUniversalCartMetadata_}"
                  @input="${this.onPayloadUniversalCartMetadataInput_}">
              </input>
            </div>
          `
              : html``
          }
          <label for="invokeFreOverrideSelect">FRE Override</label>
          <select id="invokeFreOverrideSelect"
              .value="${this.invokeFreOverride_.toString()}"
              @change="${this.onInvokeFreOverrideChange_}">
            <option value="0">Unspecified</option>
            <option value="1">TrustFirstText</option>
            <option value="2">TrustFirstClick</option>
            <option value="3">TrustFirstInline</option>
          </select>
          <label for="invokeFreCompletionWaitModeSelect">
            Wait for FRE Completion Mode
          </label>
          <select id="invokeFreCompletionWaitModeSelect"
              .value="${this.invokeFreCompletionWaitMode_.toString()}"
              @change="${this.onInvokeFreCompletionWaitModeChange_}">
            ${this.freCompletionWaitModeEnumValues_.map(
              (item) => html`
                <option
                  value="${item.value}"
                  ?selected="${item.value === this.invokeFreCompletionWaitMode_}"
                >
                  ${item.name}
                </option>
              `,
            )}
          </select>
          <label for="invokeFeatureModeSelect">Feature Mode</label>
          <select id="invokeFeatureModeSelect"
              .value="${this.invokeFeatureMode_.toString()}"
              @change="${this.onInvokeFeatureModeChange_}">
            ${this.featureModeEnumValues_.map(
              (item) => html`
                <option
                  value="${item.value}"
                  ?selected="${item.value === this.invokeFeatureMode_}"
                >
                  ${item.name}
                </option>
              `,
            )}
          </select>
          <label for="invokeActuationTargetSelect">Actuation Target</label>
          <select id="invokeActuationTargetSelect"
              .value="${this.invokeActuationTarget_.toString()}"
              @change="${this.onInvokeActuationTargetChange_}">
            ${this.actuationTargetEnumValues_.map(
              (item) => html`
                <option
                  value="${item.value}"
                  ?selected="${item.value === this.invokeActuationTarget_}"
                >
                  ${item.name}
                </option>
              `,
            )}
          </select>

          <div style="display: flex; gap: 16px; align-items: center;">
            <label>
              <input type="checkbox" .checked="${this.invokeZssOverride_}"
                  @change="${this.onInvokeZssOverrideChange_}">
              ZSS Override
            </label>
          </div>
          ${
            this.invokeZssOverride_
              ? html`
            <label for="invokeZssAdditionalContentInput">
              ZSS Additional Content
            </label>
            <input id="invokeZssAdditionalContentInput"
                .value="${this.invokeZssAdditionalContent_}"
                @input="${this.onInvokeZssAdditionalContentInput_}">
            </input>
          `
              : html``
          }

          <div style="display: flex; gap: 8px; align-items: center;">
            <label for="invokeSurfaceTypeSelect">Target Surface</label>
            <select id="invokeSurfaceTypeSelect"
                .value="${this.invokeSurfaceType_}"
                @change="${this.onInvokeSurfaceTypeChange_}">
              <option value="default">Default</option>
              <option value="specificTab">Specific Tab</option>
              <option value="newTab">New Tab</option>
            </select>
            ${
              this.invokeSurfaceType_ === "default"
                ? html` <span style="color: gray;">(Uses this window)</span> `
                : html``
            }
            ${
              this.invokeSurfaceType_ === "specificTab"
                ? html`
                    <select
                      id="invokeSpecificTabIndexSelect"
                      .value="${this.invokeSpecificTabIndex_.toString()}"
                      @change="${this.onInvokeSpecificTabIndexChange_}"
                    >
                      ${this.availableTabs_.map(
                        (tabTitle, index) => html`
                          <option value="${index}">
                            ${index}: ${tabTitle}
                          </option>
                        `,
                      )}
                    </select>
                    <cr-button @click="${this.onRefreshTabsClick_}">
                      Refresh
                    </cr-button>
                  `
                : html``
            }
            ${
              this.invokeSurfaceType_ === "newTab"
                ? html`
                    <label
                      style="display: flex; align-items: center; gap: 4px;"
                    >
                      <input
                        type="checkbox"
                        .checked="${this.invokeOpenInForeground_}"
                        @change="${this.onInvokeOpenInForegroundChange}"
                      />
                      Open in Foreground
                    </label>
                  `
                : html``
            }
          </div>

          <div style="display: flex; gap: 8px; align-items: flex-start;
                      margin-top: 8px;">
            ${
              this.invokeSpecificTabsToShareIndices_.length === 0
                ? html`
                    <cr-button @click="${this.onAddTabsToShareIndexClick_}">
                      Add Tabs to Share
                    </cr-button>
                  `
                : html`
                    <label style="margin-top: 4px;">Tabs to Share</label>
                    <div
                      style="display: flex; flex-direction: column; gap: 4px;"
                    >
                      ${this.invokeSpecificTabsToShareIndices_.map(
                        (selectedIndex, indexInArray) => html`
                          <div style="display: flex; gap: 4px;">
                            <select
                              .value="${selectedIndex.toString()}"
                              data-index="${indexInArray}"
                              @change="${this.onInvokeSpecificTabsToShareIndexChange_}"
                            >
                              ${this.availableTabs_.map(
                                (tabTitle, tabIndex) => html`
                                  <option value="${tabIndex}">
                                    ${tabIndex}: ${tabTitle}
                                  </option>
                                `,
                              )}
                            </select>
                            <cr-button
                              data-index="${indexInArray}"
                              @click="${this.onRemoveTabsToShareIndexClick_}"
                            >
                              x
                            </cr-button>
                          </div>
                        `,
                      )}
                      <cr-button
                        @click="${this.onAddTabsToShareIndexClick_}"
                        style="align-self: flex-start;"
                      >
                        +
                      </cr-button>
                    </div>
                    <cr-button @click="${this.onRefreshTabsClick_}">
                      Refresh Tabs
                    </cr-button>
                  `
            }
          </div>

          <div style="display: flex; gap: 8px; align-items: center;
                      margin-top: 8px;">
            <label for="invokeConversationTypeSelect">
              Target Conversation
            </label>
            <select id="invokeConversationTypeSelect"
                .value="${this.invokeConversationType_}"
                @change="${this.onInvokeConversationTypeChange_}">
              <option value="default">Default</option>
              <option value="new">New Conversation</option>
              <option value="conversationId">Specific Conversation ID</option>
            </select>
            ${
              this.invokeConversationType_ === "conversationId"
                ? html`
              <label for="invokeConversationIdInput"
                     style="margin-left: 8px;">ID:</label>
              <input id="invokeConversationIdInput"
                  .value="${this.invokeConversationId_}"
                  @input="${this.onInvokeConversationIdInput_}">
              </input>
            `
                : html``
            }
          </div>

          <cr-button @click="${this.onTriggerInvokeClick_}">
            Trigger Invoke
          </cr-button>

          <div class="log-container"
              style="margin-top: 10px; padding: 5px; border: 1px solid #ccc;
                     max-height: 200px; overflow-y: auto;
                     font-family: monospace;">
            ${this.invokeLogs_.map((log) => html`<pre style="margin: 0;">${log}</pre>`)}
          </div>
          ${
            this.data_?.experimentalTriggeringEnabled
              ? html`
                  <h3>Consents</h3>
                  <div
                    style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;"
                  >
                    <cr-checkbox
                      ?checked="${this.data_?.enablement?.freIsConsented}"
                      ?disabled="${!this.data_?.enablement?.freIsConsented}"
                      @change="${this.onGlicConsentChange_}"
                    >
                      Glic Consent
                    </cr-checkbox>
                    <cr-checkbox
                      ?checked="${this.data_?.enablement?.actuationIsConsented}"
                      ?disabled="${!this.data_?.enablement?.actuationIsConsented}"
                      @change="${this.onActuationConsentChange_}"
                    >
                      Actuation Consent
                    </cr-checkbox>
                    <cr-checkbox
                      ?checked="${this.isExperimentalOptInConsentMet_()}"
                      ?disabled="${!this.isExperimentalOptInConsentMet_()}"
                      @change="${this.onExperimentalConsentChange_}"
                    >
                      Experimental Triggering Consent
                    </cr-checkbox>
                    <cr-button
                      ?disabled="${this.isAllConsentMet_()}"
                      @click="${this.onExperimentalOptInClick_}"
                    >
                      Show Experimental Opt-In
                    </cr-button>
                  </div>
                `
              : html``
          }
        </div>
        <h2>Guest URL Presets</h2>
        ${
          this.data_?.config
            ? html`
          <div class="presets-container">
            <label for="autopushInput">Autopush</label>
            <input id="autopushInput"
                .value="${this.data_.config.autopushGuestUrl}"
                @change="${this.onAutopushInputChange}">
            </input>
            <label for="stagingInput">Staging</label>
            <input
                id="stagingInput" .value="${this.data_.config.stagingGuestUrl}"
                @change="${this.onStagingInputChange}">
            </input>
            <label for="preprodInput">Preprod</label>
            <input
                id="preprodInput" .value="${this.data_.config.preprodGuestUrl}"
                @change="${this.onPreprodInputChange}">
            </input>
            <label for="prodInput">Prod</label>
            <input id="prodInput" .value="${this.data_.config.prodGuestUrl}"
                @change="${this.onProdInputChange}">
            </input>
            <div id="inputErrorMsg" class="hiddenElement">
                Invalid URL submitted: presets not updated
            </div>
            <cr-button @click="${this.onSavePresetsClick_}">Save</cr-button>
          </div>`
            : html`<h3 id="loadingMsg">Loading...</h3>`
        }
        <h2>Web Continuity URL Preset</h2>
        ${
          this.data_?.config
            ? html`
          <div class="web-continuity-container">
            <label for="webContinuityInput">Web Continuity</label>
            <input id="webContinuityInput"
                .value="${this.data_.config.webContinuityOriginatingHostUrl}"
                @change="${this.onWebContinuityInputChange}">
            </input>
            <div id="webContinuityInputErrorMsg" class="hiddenElement">
                Invalid URL submitted: presets not updated
            </div>
            <cr-button @click="${this.onSaveWebContinuityPresetClick_}">
                Save
            </cr-button>
          </div>`
            : html`<h3 id="loadingMsg">Loading...</h3>`
        }
      </div>
  </div>
<!--_html_template_end_-->`;
}
function getEnumEntries(enumObj) {
  return Object.entries(enumObj)
    .filter(
      ([key]) =>
        isNaN(Number(key)) && key !== "MIN_VALUE" && key !== "MAX_VALUE",
    )
    .map(([name, value]) => ({ name: name, value: Number(value) }));
}
class GlicInternalsAppElement extends CrLitElement {
  static get is() {
    return "glic-internals-app";
  }
  static get styles() {
    return getCss();
  }
  render() {
    return getHtml.bind(this)();
  }
  static get properties() {
    return {
      data_: { type: Object },
      invokePrompt_: { type: String },
      invokeAutoSubmit_: { type: Boolean },
      invokeFreOverride_: { type: Number },
      invokeFeatureMode_: { type: Number },
      invokeInvocationSource_: { type: Number },
      invokeWaitForPanelOpen_: { type: Boolean },
      invokeFocusOnShow_: { type: Boolean },
      invokeTimeoutMs_: { type: String },
      invokeLogs_: { type: Array },
      invokeSurfaceType_: { type: String },
      invokeZssOverride_: { type: Boolean },
      invokeZssAdditionalContent_: { type: String },
      invokeOpenInForeground_: { type: Boolean },
      invokeActuationTarget_: { type: Number },
      actuationTargetEnumValues_: { type: Array },
      invokeShowPanel_: { type: Boolean },
      invokePayloadUniversalCartMetadata_: { type: String },
      invokeFreCompletionWaitMode_: { type: Number },
      freCompletionWaitModeEnumValues_: { type: Array },
      invokeTakeScreenshot_: { type: Boolean },
      invokeSupersedeIfInProgress_: { type: Boolean },
      invokePublicKey_: { type: String },
      invokeAuthSecret_: { type: String },
      selectedTabIndex_: { type: Number },
      invokeConversationType_: { type: String },
      invokeConversationId_: { type: String },
      invokeSpecificTabIndex_: { type: Number },
      invokeSpecificTabsToShareIndices_: { type: Array },
      availableTabs_: { type: Array },
      tabNames_: { type: Array },
      featureModeEnumValues_: { type: Array },
      copyButtonText_: { type: String },
    };
  }
  #copyButtonText__accessor_storage = "Copy Diagnostics";
  get copyButtonText_() {
    return this.#copyButtonText__accessor_storage;
  }
  set copyButtonText_(value) {
    this.#copyButtonText__accessor_storage = value;
  }
  copyResetTimeoutId_ = null;
  #data__accessor_storage;
  get data_() {
    return this.#data__accessor_storage;
  }
  set data_(value) {
    this.#data__accessor_storage = value;
  }
  #invokePrompt__accessor_storage = "";
  get invokePrompt_() {
    return this.#invokePrompt__accessor_storage;
  }
  set invokePrompt_(value) {
    this.#invokePrompt__accessor_storage = value;
  }
  #invokeAutoSubmit__accessor_storage = true;
  get invokeAutoSubmit_() {
    return this.#invokeAutoSubmit__accessor_storage;
  }
  set invokeAutoSubmit_(value) {
    this.#invokeAutoSubmit__accessor_storage = value;
  }
  #invokeFreOverride__accessor_storage = FreOverride.kUnspecified;
  get invokeFreOverride_() {
    return this.#invokeFreOverride__accessor_storage;
  }
  set invokeFreOverride_(value) {
    this.#invokeFreOverride__accessor_storage = value;
  }
  #invokeFeatureMode__accessor_storage = FeatureMode.kUnspecified;
  get invokeFeatureMode_() {
    return this.#invokeFeatureMode__accessor_storage;
  }
  set invokeFeatureMode_(value) {
    this.#invokeFeatureMode__accessor_storage = value;
  }
  #invokeInvocationSource__accessor_storage = InvocationSource.kOsButton;
  get invokeInvocationSource_() {
    return this.#invokeInvocationSource__accessor_storage;
  }
  set invokeInvocationSource_(value) {
    this.#invokeInvocationSource__accessor_storage = value;
  }
  #invokeWaitForPanelOpen__accessor_storage = false;
  get invokeWaitForPanelOpen_() {
    return this.#invokeWaitForPanelOpen__accessor_storage;
  }
  set invokeWaitForPanelOpen_(value) {
    this.#invokeWaitForPanelOpen__accessor_storage = value;
  }
  #invokeFocusOnShow__accessor_storage = true;
  get invokeFocusOnShow_() {
    return this.#invokeFocusOnShow__accessor_storage;
  }
  set invokeFocusOnShow_(value) {
    this.#invokeFocusOnShow__accessor_storage = value;
  }
  #invokeTimeoutMs__accessor_storage = "";
  get invokeTimeoutMs_() {
    return this.#invokeTimeoutMs__accessor_storage;
  }
  set invokeTimeoutMs_(value) {
    this.#invokeTimeoutMs__accessor_storage = value;
  }
  #invokeLogs__accessor_storage = [];
  get invokeLogs_() {
    return this.#invokeLogs__accessor_storage;
  }
  set invokeLogs_(value) {
    this.#invokeLogs__accessor_storage = value;
  }
  #invokeSurfaceType__accessor_storage = "default";
  get invokeSurfaceType_() {
    return this.#invokeSurfaceType__accessor_storage;
  }
  set invokeSurfaceType_(value) {
    this.#invokeSurfaceType__accessor_storage = value;
  }
  #invokeZssOverride__accessor_storage = false;
  get invokeZssOverride_() {
    return this.#invokeZssOverride__accessor_storage;
  }
  set invokeZssOverride_(value) {
    this.#invokeZssOverride__accessor_storage = value;
  }
  #invokeZssAdditionalContent__accessor_storage = "";
  get invokeZssAdditionalContent_() {
    return this.#invokeZssAdditionalContent__accessor_storage;
  }
  set invokeZssAdditionalContent_(value) {
    this.#invokeZssAdditionalContent__accessor_storage = value;
  }
  #invokeOpenInForeground__accessor_storage = true;
  get invokeOpenInForeground_() {
    return this.#invokeOpenInForeground__accessor_storage;
  }
  set invokeOpenInForeground_(value) {
    this.#invokeOpenInForeground__accessor_storage = value;
  }
  #invokeActuationTarget__accessor_storage = ActuationTarget.kAgentDecides;
  get invokeActuationTarget_() {
    return this.#invokeActuationTarget__accessor_storage;
  }
  set invokeActuationTarget_(value) {
    this.#invokeActuationTarget__accessor_storage = value;
  }
  #invokeShowPanel__accessor_storage = true;
  get invokeShowPanel_() {
    return this.#invokeShowPanel__accessor_storage;
  }
  set invokeShowPanel_(value) {
    this.#invokeShowPanel__accessor_storage = value;
  }
  #invokePayloadUniversalCartMetadata__accessor_storage = "";
  get invokePayloadUniversalCartMetadata_() {
    return this.#invokePayloadUniversalCartMetadata__accessor_storage;
  }
  set invokePayloadUniversalCartMetadata_(value) {
    this.#invokePayloadUniversalCartMetadata__accessor_storage = value;
  }
  #invokeFreCompletionWaitMode__accessor_storage =
    FreCompletionWaitMode.kDefault;
  get invokeFreCompletionWaitMode_() {
    return this.#invokeFreCompletionWaitMode__accessor_storage;
  }
  set invokeFreCompletionWaitMode_(value) {
    this.#invokeFreCompletionWaitMode__accessor_storage = value;
  }
  #invokeTakeScreenshot__accessor_storage = false;
  get invokeTakeScreenshot_() {
    return this.#invokeTakeScreenshot__accessor_storage;
  }
  set invokeTakeScreenshot_(value) {
    this.#invokeTakeScreenshot__accessor_storage = value;
  }
  #invokeSupersedeIfInProgress__accessor_storage = false;
  get invokeSupersedeIfInProgress_() {
    return this.#invokeSupersedeIfInProgress__accessor_storage;
  }
  set invokeSupersedeIfInProgress_(value) {
    this.#invokeSupersedeIfInProgress__accessor_storage = value;
  }
  #invokePublicKey__accessor_storage =
    "BFlvj1VrkwP8pxa1zSiJZzZ7yeMEO1DOPS" +
    "bNw6XV8NK3Xo++7ql9NTcxNaciYM2eQ/G1ebnwrtRrHyMXEDhN5ck=";
  get invokePublicKey_() {
    return this.#invokePublicKey__accessor_storage;
  }
  set invokePublicKey_(value) {
    this.#invokePublicKey__accessor_storage = value;
  }
  #invokeAuthSecret__accessor_storage = "aaaaaaaaaaaaaaaa";
  get invokeAuthSecret_() {
    return this.#invokeAuthSecret__accessor_storage;
  }
  set invokeAuthSecret_(value) {
    this.#invokeAuthSecret__accessor_storage = value;
  }
  #invokeConversationType__accessor_storage = "default";
  get invokeConversationType_() {
    return this.#invokeConversationType__accessor_storage;
  }
  set invokeConversationType_(value) {
    this.#invokeConversationType__accessor_storage = value;
  }
  #invokeConversationId__accessor_storage = "";
  get invokeConversationId_() {
    return this.#invokeConversationId__accessor_storage;
  }
  set invokeConversationId_(value) {
    this.#invokeConversationId__accessor_storage = value;
  }
  #invokeSpecificTabIndex__accessor_storage = 0;
  get invokeSpecificTabIndex_() {
    return this.#invokeSpecificTabIndex__accessor_storage;
  }
  set invokeSpecificTabIndex_(value) {
    this.#invokeSpecificTabIndex__accessor_storage = value;
  }
  #invokeSpecificTabsToShareIndices__accessor_storage = [];
  get invokeSpecificTabsToShareIndices_() {
    return this.#invokeSpecificTabsToShareIndices__accessor_storage;
  }
  set invokeSpecificTabsToShareIndices_(value) {
    this.#invokeSpecificTabsToShareIndices__accessor_storage = value;
  }
  #availableTabs__accessor_storage = [];
  get availableTabs_() {
    return this.#availableTabs__accessor_storage;
  }
  set availableTabs_(value) {
    this.#availableTabs__accessor_storage = value;
  }
  #selectedTabIndex__accessor_storage = 0;
  get selectedTabIndex_() {
    return this.#selectedTabIndex__accessor_storage;
  }
  set selectedTabIndex_(value) {
    this.#selectedTabIndex__accessor_storage = value;
  }
  #tabNames__accessor_storage = ["General", "Debug Controls"];
  get tabNames_() {
    return this.#tabNames__accessor_storage;
  }
  set tabNames_(value) {
    this.#tabNames__accessor_storage = value;
  }
  #featureModeEnumValues__accessor_storage = getEnumEntries(FeatureMode);
  get featureModeEnumValues_() {
    return this.#featureModeEnumValues__accessor_storage;
  }
  set featureModeEnumValues_(value) {
    this.#featureModeEnumValues__accessor_storage = value;
  }
  #actuationTargetEnumValues__accessor_storage =
    getEnumEntries(ActuationTarget);
  get actuationTargetEnumValues_() {
    return this.#actuationTargetEnumValues__accessor_storage;
  }
  set actuationTargetEnumValues_(value) {
    this.#actuationTargetEnumValues__accessor_storage = value;
  }
  #freCompletionWaitModeEnumValues__accessor_storage = getEnumEntries(
    FreCompletionWaitMode,
  );
  get freCompletionWaitModeEnumValues_() {
    return this.#freCompletionWaitModeEnumValues__accessor_storage;
  }
  set freCompletionWaitModeEnumValues_(value) {
    this.#freCompletionWaitModeEnumValues__accessor_storage = value;
  }
  browserProxy_ = browserProxyFactory.getInstance();
  connectedCallback() {
    super.connectedCallback();
    this.fetchInternalsData_();
    this.refreshOpenTabs_();
  }
  fetchInternalsData_() {
    this.browserProxy_.handler
      .getInternalsDataPayload()
      .then(({ internalsData: internalsData }) => {
        this.data_ = internalsData;
      });
  }
  onShowErrorAllowedChange(e) {
    const allowed = e.target.checked;
    this.data_.showErrorAllowed = allowed;
    this.browserProxy_.handler.setShowErrorAllowed(allowed);
  }
  onExperimentalOptInClick_() {
    this.browserProxy_.handler.showExperimentalOptIn();
  }
  isAllConsentMet_() {
    if (!this.data_?.enablement) {
      return false;
    }
    return (
      this.data_.enablement.glicExperimentalTriggeringState ===
        GlicExperimentalTriggeringState.kReady &&
      this.data_.enablement.freIsConsented &&
      this.data_.enablement.actuationIsConsented
    );
  }
  onGlicConsentChange_(e) {
    if (!e.target.checked) {
      this.browserProxy_.handler.revokeGlicConsent();
      this.fetchInternalsData_();
    }
  }
  onActuationConsentChange_(e) {
    if (!e.target.checked) {
      this.browserProxy_.handler.revokeActuationConsent();
      this.fetchInternalsData_();
    }
  }
  onExperimentalConsentChange_(e) {
    if (!e.target.checked) {
      this.browserProxy_.handler.revokeExperimentalTriggeringConsent();
      this.fetchInternalsData_();
    }
  }
  onAutopushInputChange(e) {
    this.data_.config.autopushGuestUrl = e.target.value;
  }
  onStagingInputChange(e) {
    this.data_.config.stagingGuestUrl = e.target.value;
  }
  onPreprodInputChange(e) {
    this.data_.config.preprodGuestUrl = e.target.value;
  }
  onProdInputChange(e) {
    this.data_.config.prodGuestUrl = e.target.value;
  }
  onSavePresetsClick_() {
    const errorMsg = this.shadowRoot.querySelector("#inputErrorMsg");
    try {
      new URL(this.data_.config.autopushGuestUrl);
      new URL(this.data_.config.stagingGuestUrl);
      new URL(this.data_.config.preprodGuestUrl);
      new URL(this.data_.config.prodGuestUrl);
    } catch {
      console.error("Invalid URL: no-op");
      errorMsg.classList.remove("hiddenElement");
      return;
    }
    errorMsg.classList.add("hiddenElement");
    this.browserProxy_.handler.setGuestUrlPresets(
      this.data_.config.autopushGuestUrl,
      this.data_.config.stagingGuestUrl,
      this.data_.config.preprodGuestUrl,
      this.data_.config.prodGuestUrl,
    );
  }
  onWebContinuityInputChange(e) {
    this.data_.config.webContinuityOriginatingHostUrl = e.target.value;
  }
  onSaveWebContinuityPresetClick_() {
    const errorMsg = this.shadowRoot.querySelector(
      "#webContinuityInputErrorMsg",
    );
    const url = this.data_.config.webContinuityOriginatingHostUrl;
    if (url && URL.parse(url) === null) {
      console.error("Invalid URL: no-op");
      errorMsg.classList.remove("hiddenElement");
      return;
    }
    errorMsg.classList.add("hiddenElement");
    this.browserProxy_.handler.setWebContinuityOriginatingHostUrlPreset(url);
  }
  getActuationEligibilityString_(eligibility) {
    switch (eligibility) {
      case ActuationEligibility.kEligible:
        return "Eligible";
      case ActuationEligibility.kMissingAccountCapability:
        return "Missing account capability";
      case ActuationEligibility.kMissingChromeBenefits:
        return "Missing Chrome benefits";
      case ActuationEligibility.kDisabledByPolicy:
        return "Disabled by policy";
      case ActuationEligibility.kPlatformUnsupported:
        return "Platform unsupported";
      case ActuationEligibility.kEnterpriseWithoutManagement:
        return "Enterprise account without management. Default pref disabled.";
      default:
        return "unknown";
    }
  }
  getExperimentalTriggeringStateString_(state) {
    return GlicExperimentalTriggeringState[state] || "Unknown";
  }
  isActuationEligible_() {
    return (
      this.data_?.enablement?.actuationEligibility ===
      ActuationEligibility.kEligible
    );
  }
  isGlicApiActuationEligible_() {
    return (
      this.data_?.enablement?.glicApiActuationEligibility ===
      ActuationEligibility.kEligible
    );
  }
  computeOverallStatus_() {
    if (!this.data_ || !this.data_.enablement) {
      return { enabled: false, reason: "Loading or unavailable" };
    }
    const e = this.data_.enablement;
    if (!e.featureEnabled) {
      return { enabled: false, reason: "Disabled by Chrome feature flag" };
    }
    if (!e.isRegularProfile) {
      return {
        enabled: false,
        reason: "Not a regular user profile (e.g. Incognito or Guest)",
      };
    }
    if (!e.allowedByCountryFilter) {
      return { enabled: false, reason: "Blocked by country filter" };
    }
    if (!e.allowedByLocaleFilter) {
      return { enabled: false, reason: "Blocked by UI locale filter" };
    }
    if (!e.allowedByChromePolicy) {
      return { enabled: false, reason: "Disabled by enterprise Chrome policy" };
    }
    if (!e.allowedByRemoteAdmin) {
      return { enabled: false, reason: "Disabled by server-side admin policy" };
    }
    if (!e.allowedByRemoteOther) {
      return {
        enabled: false,
        reason: "Disabled by server-side configuration",
      };
    }
    if (!e.isRolledOut) {
      return { enabled: false, reason: "Profile not in rollout group" };
    }
    if (!e.primaryAccountIsCapable) {
      return {
        enabled: false,
        reason: "Primary account lacks Gemini capabilities",
      };
    }
    if (!e.primaryAccountIsFullySignedIn) {
      return { enabled: false, reason: "Primary account not fully signed in" };
    }
    if (!e.freIsConsented) {
      return {
        enabled: false,
        reason: "First Run Experience (FRE) consent not completed",
      };
    }
    return { enabled: true };
  }
  onRefreshClick_() {
    this.fetchInternalsData_();
    this.refreshOpenTabs_();
  }
  getChromeVersion_() {
    if (loadTimeData.isInitialized()) {
      try {
        const browserVersion = loadTimeData.getString("browserVersion");
        if (browserVersion) {
          return browserVersion;
        }
      } catch {}
      try {
        const version = loadTimeData.getString("version");
        if (version) {
          const modifier = loadTimeData.getString("version_modifier");
          const arch = loadTimeData.getString("version_processor_variation");
          return [version, modifier, arch].filter(Boolean).join(" ");
        }
      } catch {}
    }
    const match = navigator.userAgent.match(/Chrome\/([0-9.]+)/);
    return match?.[1] ?? "Unknown";
  }
  getDiagnosticsMarkdown_() {
    if (!this.data_) {
      return "# Glic Internals Diagnostics\n\nNo diagnostics data available.";
    }
    const lines = [];
    const overall = this.computeOverallStatus_();
    lines.push("# Glic Internals Diagnostics");
    lines.push("");
    lines.push(`- **Timestamp:** ${new Date().toISOString()}`);
    lines.push(`- **Chrome Version:** ${this.getChromeVersion_()}`);
    if (loadTimeData.isInitialized()) {
      try {
        const revision = loadTimeData.getString("cl");
        if (revision) {
          lines.push(`- **Revision:** ${revision}`);
        }
      } catch {}
    }
    lines.push(
      `- **Overall Status:** ${overall.enabled ? "Eligible & Enabled" : "Blocked / Ineligible"}`,
    );
    if (!overall.enabled && overall.reason) {
      lines.push(`- **Blocking Reason:** ${overall.reason}`);
    }
    if (this.data_.debugInfo) {
      lines.push(
        `- **Platform:** ${this.getPlatformString_(this.data_.debugInfo.platform)}`,
      );
      lines.push(
        `- **Form Factor:** ${this.getFormFactorString_(this.data_.debugInfo.formFactor)}`,
      );
    }
    lines.push(`- **User Agent:** ${navigator.userAgent}`);
    lines.push("");
    const generalContents = this.shadowRoot?.querySelector("#general-contents");
    if (generalContents) {
      const cards = generalContents.querySelectorAll(".card");
      for (const card of cards) {
        const headerEl = card.querySelector(".card-header");
        const headerText = headerEl?.textContent?.trim();
        const table = card.querySelector("table");
        if (!table) {
          continue;
        }
        const tableMd = this.tableToMarkdown_(table);
        if (!tableMd) {
          continue;
        }
        if (headerText) {
          lines.push(`## ${headerText}`);
          lines.push("");
        }
        lines.push(tableMd);
        lines.push("");
      }
    }
    return lines.join("\n");
  }
  cleanTableCellText_(text) {
    return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
  }
  tableToMarkdown_(table) {
    const headerCells = Array.from(table.querySelectorAll("thead th"));
    if (headerCells.length === 0) {
      return "";
    }
    const headers = headerCells.map((th) =>
      this.cleanTableCellText_(th.textContent ?? ""),
    );
    const lines = [
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => ":---").join(" | ")} |`,
    ];
    const rowElements = Array.from(table.querySelectorAll("tbody tr"));
    for (const row of rowElements) {
      const cells = Array.from(row.querySelectorAll("td")).map((td) =>
        this.cleanTableCellText_(td.textContent ?? ""),
      );
      if (cells.length === 0) {
        continue;
      }
      while (cells.length < headers.length) {
        cells.push("");
      }
      lines.push(`| ${cells.join(" | ")} |`);
    }
    return lines.join("\n");
  }
  async onCopyDiagnosticsClick_() {
    await this.updateComplete;
    const text = this.getDiagnosticsMarkdown_();
    try {
      await navigator.clipboard.writeText(text);
      if (this.copyResetTimeoutId_ !== null) {
        window.clearTimeout(this.copyResetTimeoutId_);
      }
      this.copyButtonText_ = "Copied!";
      this.copyResetTimeoutId_ = window.setTimeout(() => {
        this.copyButtonText_ = "Copy Diagnostics";
        this.copyResetTimeoutId_ = null;
      }, 2e3);
    } catch (err) {
      console.error("Failed to copy diagnostics to clipboard:", err);
    }
  }
  isExperimentalOptInConsentMet_() {
    return (
      this.data_?.enablement?.glicExperimentalTriggeringState ===
      GlicExperimentalTriggeringState.kReady
    );
  }
  getTableData_() {
    if (!this.data_ || !this.data_.enablement) {
      return [];
    }
    return [
      {
        label: "Enabled by Chrome Flags",
        value: this.data_.enablement.featureEnabled,
      },
      {
        label: "Regular profile",
        value: this.data_.enablement.isRegularProfile,
      },
      {
        label: "Pref or flag based rollout (flag or pref) applies",
        value: this.data_.enablement.isRolledOut,
      },
      {
        label: "Account exists and has the Gemini in Chrome capability",
        value: this.data_.enablement.primaryAccountIsCapable,
      },
      {
        label: "Account exists and is fully signed-in",
        value: this.data_.enablement.primaryAccountIsFullySignedIn,
      },
      {
        label:
          "Chrome Enterprise policy allows this feature (or doesn't apply)",
        value: this.data_.enablement.allowedByChromePolicy,
      },
      {
        label: "Server side admin allows this feature",
        value: this.data_.enablement.allowedByRemoteAdmin,
      },
      {
        label: "Server side allows this feature (Not admin policy)",
        value: this.data_.enablement.allowedByRemoteOther,
      },
      {
        label: "User did pass the FRE",
        value: this.data_.enablement.freIsConsented,
      },
      {
        label: "User accepted actuation consent",
        value: this.data_.enablement.actuationIsConsented,
      },
      {
        label: "Passed country filter",
        value: this.data_.enablement.allowedByCountryFilter,
      },
      {
        label: "Passed locale filter",
        value: this.data_.enablement.allowedByLocaleFilter,
      },
    ];
  }
  getInvocationSourceOptions_() {
    return getEnumEntries(InvocationSource);
  }
  onInvokePromptInput_(e) {
    this.invokePrompt_ = e.target.value;
  }
  onInvokeAutoSubmitChange_(e) {
    this.invokeAutoSubmit_ = e.target.checked;
  }
  onInvokeFreOverrideChange_(e) {
    this.invokeFreOverride_ = Number(e.target.value);
  }
  onInvokeFeatureModeChange_(e) {
    this.invokeFeatureMode_ = Number(e.target.value);
  }
  onInvokeInvocationSourceChange_(e) {
    this.invokeInvocationSource_ = Number(e.target.value);
  }
  onInvokeWaitForPanelOpenChange_(e) {
    this.invokeWaitForPanelOpen_ = e.target.checked;
  }
  onInvokeFocusOnShowChange_(e) {
    this.invokeFocusOnShow_ = e.target.checked;
  }
  onInvokeTimeoutMsInput_(e) {
    this.invokeTimeoutMs_ = e.target.value;
  }
  onInvokeConversationTypeChange_(e) {
    this.invokeConversationType_ = e.target.value;
  }
  onInvokeConversationIdInput_(e) {
    this.invokeConversationId_ = e.target.value;
  }
  onPayloadUniversalCartMetadataInput_(e) {
    this.invokePayloadUniversalCartMetadata_ = e.target.value;
  }
  async onInvokeSurfaceTypeChange_(e) {
    this.invokeSurfaceType_ = e.target.value;
    if (this.invokeSurfaceType_ === "specificTab") {
      await this.refreshOpenTabs_();
    }
  }
  async refreshOpenTabs_() {
    const { tabTitles: tabTitles } =
      await this.browserProxy_.handler.getOpenTabs();
    this.availableTabs_ = tabTitles;
    this.invokeSpecificTabIndex_ = 0;
  }
  onRefreshTabsClick_() {
    this.refreshOpenTabs_();
  }
  onInvokeSpecificTabIndexChange_(e) {
    this.invokeSpecificTabIndex_ = Number(e.target.value);
  }
  onInvokeSpecificTabsToShareIndexChange_(e) {
    const select = e.target;
    const indexInArray = Number(select.dataset["index"]);
    const newIndices = [...this.invokeSpecificTabsToShareIndices_];
    newIndices[indexInArray] = Number(select.value);
    this.invokeSpecificTabsToShareIndices_ = newIndices;
  }
  onRemoveTabsToShareIndexClick_(e) {
    const button = e.target;
    const indexToRemove = Number(button.dataset["index"]);
    this.invokeSpecificTabsToShareIndices_ =
      this.invokeSpecificTabsToShareIndices_.filter(
        (_, index) => index !== indexToRemove,
      );
  }
  onAddTabsToShareIndexClick_() {
    this.invokeSpecificTabsToShareIndices_ = [
      ...this.invokeSpecificTabsToShareIndices_,
      0,
    ];
  }
  onInvokeZssOverrideChange_(e) {
    this.invokeZssOverride_ = e.target.checked;
  }
  onInvokeZssAdditionalContentInput_(e) {
    this.invokeZssAdditionalContent_ = e.target.value;
  }
  onInvokeOpenInForegroundChange(e) {
    this.invokeOpenInForeground_ = e.target.checked;
  }
  onInvokeActuationTargetChange_(e) {
    this.invokeActuationTarget_ = Number(e.target.value);
  }
  onInvokeShowPanelChange_(e) {
    this.invokeShowPanel_ = e.target.checked;
  }
  onInvokeFreCompletionWaitModeChange_(e) {
    this.invokeFreCompletionWaitMode_ = Number(e.target.value);
  }
  onInvokeTakeScreenshotChange_(e) {
    this.invokeTakeScreenshot_ = e.target.checked;
  }
  onInvokeSupersedeIfInProgressChange_(e) {
    this.invokeSupersedeIfInProgress_ = e.target.checked;
  }
  onInvokePublicKeyInput_(e) {
    this.invokePublicKey_ = e.target.value;
  }
  onInvokeAuthSecretInput_(e) {
    this.invokeAuthSecret_ = e.target.value;
  }
  onTriggerInvokeClick_() {
    let surface;
    if (this.invokeSurfaceType_ === "newTab") {
      surface = { newTab: { openInForeground: this.invokeOpenInForeground_ } };
    } else {
      surface = { defaultSurface: {} };
    }
    let payload = null;
    if (this.invokeInvocationSource_ === InvocationSource.kUniversalCart) {
      const bytes = this.invokePayloadUniversalCartMetadata_
        ? Array.from(atob(this.invokePayloadUniversalCartMetadata_), (c) =>
            c.charCodeAt(0),
          )
        : [];
      payload = { universalCart: { serializedMetadata: bytes } };
    }
    let conversationSelection = { defaultConversation: {} };
    if (this.invokeConversationType_ === "new") {
      conversationSelection = { newConversation: {} };
    } else if (this.invokeConversationType_ === "conversationId") {
      conversationSelection = { conversationId: this.invokeConversationId_ };
    }
    const options = {
      invocationSource: this.invokeInvocationSource_,
      prompts: this.invokePrompt_ ? [this.invokePrompt_] : [],
      conversation: conversationSelection,
      featureMode: this.invokeFeatureMode_,
      disableZss: false,
      zssAdditionalContent: this.invokeZssOverride_
        ? this.invokeZssAdditionalContent_ || null
        : null,
      skillId: null,
      errorMessage: null,
      timeout: this.invokeTimeoutMs_
        ? { microseconds: BigInt(Number(this.invokeTimeoutMs_) * 1e3) }
        : null,
      autoSubmit: this.invokeAutoSubmit_,
      freOverride: this.invokeFreOverride_,
      waitForPanelOpen: this.invokeWaitForPanelOpen_,
      focusOnShow: this.invokeFocusOnShow_,
      freCompletionWaitMode: this.invokeFreCompletionWaitMode_,
      surface: surface,
      specificTabIndex:
        this.invokeSurfaceType_ === "specificTab"
          ? this.invokeSpecificTabIndex_
          : null,
      specificTabsToShareIndices:
        this.invokeSpecificTabsToShareIndices_.length > 0
          ? this.invokeSpecificTabsToShareIndices_
          : null,
      actuationTarget: this.invokeActuationTarget_,
      showPanel: this.invokeAutoSubmit_ ? this.invokeShowPanel_ : null,
      payload: payload,
      takeScreenshot: this.invokeTakeScreenshot_,
      supersedeIfInProgress: this.invokeSupersedeIfInProgress_,
      keyConfig:
        this.invokePublicKey_ || this.invokeAuthSecret_
          ? {
              publicKey: this.invokePublicKey_,
              authSecret: this.invokeAuthSecret_,
            }
          : null,
    };
    const invocationSourceMap = InvocationSource;
    const featureModeMap = FeatureMode;
    const freOverrideMap = FreOverride;
    const freCompletionWaitModeMap = FreCompletionWaitMode;
    const actuationTargetMap = ActuationTarget;
    const optionsString = JSON.stringify(
      options,
      (key, value) => {
        if (typeof value === "bigint") {
          value = value.toString();
        }
        if (value === null || value === undefined) {
          return undefined;
        }
        if (Array.isArray(value) && value.length === 0) {
          return undefined;
        }
        if (key === "conversation") {
          if (
            value.defaultConversation &&
            Object.keys(value.defaultConversation).length === 0
          ) {
            return undefined;
          }
        }
        if (key === "surface") {
          if (
            value.defaultSurface &&
            Object.keys(value.defaultSurface).length === 0
          ) {
            return undefined;
          }
        }
        if (key === "freOverride" && value === FreOverride.kUnspecified) {
          return undefined;
        }
        if (key === "featureMode" && value === FeatureMode.kUnspecified) {
          return undefined;
        }
        if (
          key === "actuationTarget" &&
          value === ActuationTarget.kAgentDecides
        ) {
          return undefined;
        }
        if (key === "disableZss" && value === false) {
          return undefined;
        }
        if (key === "waitForPanelOpen" && value === false) {
          return undefined;
        }
        if (key === "focusOnShow" && value === true) {
          return undefined;
        }
        if (key === "invocationSource") {
          return `${value} (${invocationSourceMap[value]})`;
        }
        if (key === "featureMode") {
          return `${value} (${featureModeMap[value]})`;
        }
        if (key === "freOverride") {
          return `${value} (${freOverrideMap[value]})`;
        }
        if (key === "freCompletionWaitMode") {
          return `${value} (${freCompletionWaitModeMap[value]})`;
        }
        if (key === "actuationTarget") {
          return `${value} (${actuationTargetMap[value]})`;
        }
        return value;
      },
      2,
    );
    this.invokeLogs_ = [
      `[${new Date().toLocaleTimeString()}] TRIGGERING INVOKE with options:\n${optionsString}`,
    ];
    console.info(this.invokeLogs_[0]);
    this.browserProxy_.handler
      .triggerInvokeFromInternalsAction(options)
      .then(({ success: success, errorMessage: errorMessage }) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${success ? "SUCCESS" : "ERROR: " + errorMessage}`;
        this.invokeLogs_ = [...this.invokeLogs_, logEntry];
        console.info(logEntry);
      });
  }
  getPlatformString_(platform) {
    switch (platform) {
      case Platform.kMacOS:
        return "macOS";
      case Platform.kWindows:
        return "Windows";
      case Platform.kLinux:
        return "Linux";
      case Platform.kChromeOS:
        return "ChromeOS";
      case Platform.kAndroid:
        return "Android";
      default:
        return "Unknown";
    }
  }
  getFormFactorString_(formFactor) {
    switch (formFactor) {
      case FormFactor.kDesktop:
        return "Desktop";
      case FormFactor.kPhone:
        return "Phone";
      case FormFactor.kTablet:
        return "Tablet";
      default:
        return "Unknown";
    }
  }
  getDebugSettingsData_() {
    if (!this.data_ || !this.data_.debugInfo) {
      return [];
    }
    const debugInfo = this.data_.debugInfo;
    const settings = [
      {
        label: "GlicActor Feature Flag",
        value: debugInfo.glicActorFeatureEnabled,
      },
      {
        label: "GlicRollout Feature Flag",
        value: debugInfo.glicRolloutFeatureEnabled,
      },
      {
        label: "GlicTieredRollout Feature Flag",
        value: debugInfo.glicTieredRolloutFeatureEnabled,
      },
      {
        label: "GlicTieredRolloutV2 Feature Flag",
        value: debugInfo.glicTieredRolloutV2FeatureEnabled,
      },
      {
        label: "GlicSubscriptionBenefitsEligibility Feature Flag",
        value: debugInfo.glicSubscriptionBenefitsEligibilityFeatureEnabled,
      },
      { label: "Platform", value: this.getPlatformString_(debugInfo.platform) },
      {
        label: "Form Factor",
        value: this.getFormFactorString_(debugInfo.formFactor),
      },
      { label: "Launcher Hotkey", value: debugInfo.hotkey || "None" },
      { label: "Locale", value: debugInfo.locale || "None" },
      {
        label: "Permanent Country Code",
        value: debugInfo.permanentCountryCode || "None",
      },
      {
        label: "Session Country Code",
        value: debugInfo.sessionCountryCode || "None",
      },
      {
        label: "System Requirement Met",
        value: debugInfo.systemRequirementMet,
      },
      { label: "OS Version Supported", value: debugInfo.osVersionSupported },
      {
        label: "Anchor Entrypoint Override Active",
        value: debugInfo.anchorEntrypointOverrideActive,
      },
      {
        label: "Primary Account Needs Signed In",
        value: debugInfo.primaryAccountNeedsSignedIn,
      },
      { label: "Dogfood Client Status", value: debugInfo.dogfoodStatus },
    ];
    if (debugInfo.booleanSettings) {
      for (const [key, val] of Object.entries(debugInfo.booleanSettings)) {
        settings.push({ label: key, value: val });
      }
    }
    return settings;
  }
  onSelectedTabIndexSelectedChanged_(e) {
    this.selectedTabIndex_ = e.detail.value;
  }
}
customElements.define(GlicInternalsAppElement.is, GlicInternalsAppElement);
