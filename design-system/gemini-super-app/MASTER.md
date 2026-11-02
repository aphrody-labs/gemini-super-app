# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Gemini Super App
**Generated:** 2026-11-01 23:00:12
**Category:** AI/Chatbot Platform
**Design Dials:** Variance 7/10 (Balanced / Modern) | Motion 7/10 (Standard) | Density 8/10 (Dense / Dashboard)

---

## Global Rules

### Brand

- **Brand:** Material 3 (Aphrody) — M3 baseline dark (tonal spot, seed #6750A4) (`m3-baseline-dark`)
- **Package:** `@aphrody/m3-theme`
- **Selector:** `.dark (also :root under @media (prefers-color-scheme: dark))`
- **Color scheme:** dark
- **Radius:** `12px (--md-sys-shape-corner-medium, packages/m3-tokens/src/m3-tokens.css)`
- **Source:** `packages/m3-theme/tokens.css` (tokens extracted verbatim; use the CSS custom properties, not raw hex)

### Color Palette

| Role             | Hex       | CSS Variable               |
| ---------------- | --------- | -------------------------- |
| Primary          | `#CFBDFE` | `--color-primary`          |
| On Primary       | `#36275D` | `--color-on-primary`       |
| Secondary        | `#4A4458` | `--color-secondary`        |
| On Secondary     | `#E8DEF8` | `--color-on-secondary`     |
| Accent/CTA       | `#633B48` | `--color-accent`           |
| On Accent/CTA    | `#FFD9E3` | `--color-on-accent`        |
| Background       | `#141218` | `--color-background`       |
| Foreground       | `#E6E0E9` | `--color-foreground`       |
| Card             | `#1D1B20` | `--color-card`             |
| Card Foreground  | `#E6E0E9` | `--color-card-foreground`  |
| Muted            | `#49454E` | `--color-muted`            |
| Muted Foreground | `#CAC4CF` | `--color-muted-foreground` |
| Border           | `#49454E` | `--color-border`           |
| Destructive      | `#FFB4AB` | `--color-destructive`      |
| On Destructive   | `#690005` | `--color-on-destructive`   |
| Ring             | `#CFBDFE` | `--color-ring`             |

**Color Notes:** The dark palette re-declares only --md-sys-color-*; the shadcn aliases follow. Fonts as m3-baseline-light. Every text pair reaches 4.5:1 and the ring 3:1 against the background (computed from the hex values). Hex = Bun.color(original value, "hex") after resolving var() (oklch lightness written as a percentage for Bun.color). Original CSS: --primary: var(--md-sys-color-primary) = #cfbdfe; --primary-foreground: var(--md-sys-color-on-primary) = #36275d; --secondary: var(--md-sys-color-secondary-container) = #4a4458; --secondary-foreground: var(--md-sys-color-on-secondary-container) = #e8def8; --accent: var(--md-sys-color-tertiary-container) = #633b48; --accent-foreground: var(--md-sys-color-on-tertiary-container) = #ffd9e3; --background: var(--md-sys-color-surface) = #141218; --foreground: var(--md-sys-color-on-surface) = #e6e0e9; --card: var(--md-sys-color-surface-container-low) = #1d1b20; --card-foreground: var(--md-sys-color-on-surface) = #e6e0e9; --muted: var(--md-sys-color-surface-variant) = #49454e; --muted-foreground: var(--md-sys-color-on-surface-variant) = #cac4cf; --border: var(--md-sys-color-outline-variant) = #49454e; --destructive: var(--md-sys-color-error) = #ffb4ab; --destructive-foreground: var(--md-sys-color-on-error) = #690005; --ring: var(--md-sys-color-primary) = #cfbdfe.

### Typography

- **Heading Font:** Google Sans Flex
- **Body Font:** Google Sans Flex
- **Mono Font:** Google Sans Code
- **Mood:** material 3, m3, material you, baseline, purple, dark, default seed, shadcn bridge

### Spacing Variables

_Density: 8/10 — Dense / Dashboard_

| Token         | Value              | Usage                     |
| ------------- | ------------------ | ------------------------- |
| `--space-xs`  | `2px` / `0.125rem` | Tight gaps                |
| `--space-sm`  | `4px` / `0.25rem`  | Icon gaps, inline spacing |
| `--space-md`  | `8px` / `0.5rem`   | Standard padding          |
| `--space-lg`  | `12px` / `0.75rem` | Section padding           |
| `--space-xl`  | `16px` / `1rem`    | Large gaps                |
| `--space-2xl` | `24px` / `1.5rem`  | Section margins           |
| `--space-3xl` | `32px` / `2rem`    | Hero padding              |

### Shadow Depths

| Level         | Value                          | Usage                       |
| ------------- | ------------------------------ | --------------------------- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)`   | Subtle lift                 |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)`    | Cards, buttons              |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)`  | Modals, dropdowns           |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #633b48;
  color: #ffd9e3;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #cfbdfe;
  border: 2px solid #cfbdfe;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

/* Keyboard focus, including Windows High Contrast (forced colors) */
.btn-primary:focus-visible,
.btn-secondary:focus-visible {
  outline: 2px solid #cfbdfe;
  outline-offset: 2px;
}

@media (forced-colors: active) {
  :focus-visible {
    outline-color: CanvasText;
  }
}
```

### Cards

```css
.card {
  background: #141218;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #cfbdfe;
  outline: none;
  box-shadow: 0 0 0 3px #cfbdfe20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

### Motion and Color Scheme

```css
:root {
  color-scheme: dark;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Style Guidelines

**Style:** AI-Native UI

**Keywords:** Chatbot, conversational, voice, assistant, agentic, ambient, minimal chrome, streaming text, AI interactions

**Best For:** AI products, chatbots, voice assistants, copilots, AI-powered tools, conversational interfaces

**Key Effects:** Typing indicators (3-dot pulse), streaming text animations, pulse animations, context cards, smooth reveals

### Page Pattern

**Pattern Name:** Product Demo + Features

- **Conversion Strategy:** Use an interactive demo only when it explains value better than static media. Provide captions, transcript, visible play/pause controls, and a non-video fallback; do not autoplay under reduced motion. Pause media when offscreen or hidden and keep the final product state available as static content.
- **CTA Placement:** Video center + CTA right/bottom
- **Section Order:** Hero > Product video/mockup (center) > Feature breakdown per section > Comparison (optional) > CTA

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from(".grid-item", {
  opacity: 0,
  scale: 0.92,
  y: 16,
  duration: 0.4,
  stagger: { each: 0.06, from: "start", grid: "auto" },
  ease: "back.out(1.4)",
});
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger; Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Heavy chrome
- ❌ Slow response feedback

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Material Symbols, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y, including forced-colors mode
- ❌ **Lazy-loaded LCP image** — The LCP image gets `fetchPriority="high"` and `loading="eager"`

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide/Material Symbols)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] Focus visible in `forced-colors: active` (`outline-color: CanvasText`)
- [ ] `prefers-reduced-motion` respected
- [ ] `color-scheme` declared for light/dark
- [ ] LCP image uses `fetchPriority="high"` and `loading="eager"`
- [ ] Features limited to Baseline widely available (or progressively enhanced)
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
