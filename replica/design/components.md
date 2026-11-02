# Component Specifications: Google Gemini Clone (`gemini.google.com/app`)

Detailed specifications for all primary and compound components. Every component adheres to strict design token mapping, full keyboard navigation, screen-reader semantics, and responsive breakpoints.

---

### 1. PromptDockCapsule (Floating Omni Input Dock)

```text
PromptDockCapsule
  variants  docked-bottom, expanded-multimodal
  states    empty, typing, file-attached, voice-recording, disabled
  tokens    bg: surface, border: border, radius: pill, shadow: dock, text: text
  tokens(focus) ring: 2px accent, border: border-input
  layout    min-height: 56px, max-height: 200px, max-width: 820px, margin: 0 auto
  children  [+ AttachmentMenuButton], [AutoGrowTextarea], [VoiceMicButton], [SendArrowButton]
  a11y      role="search", textarea aria-label="Enter a prompt here", SendButton disabled when empty
  used on   S01, S02
```

---

### 2. Button

```text
Button
  variants  primary, secondary, tonal, ghost, danger, icon-circle
  sizes     sm (32px), md (40px), lg (48px)
  states    default, hover, active, focus-visible (2px solid var(--accent)), disabled, loading
  tokens    primary: bg accent, text on-accent, radius pill, font sm/500
            secondary: bg surface, text text, border border, radius pill
            ghost: bg transparent, text text-muted, hover: bg surface
            icon-circle: width: 40px, height: 40px, radius pill, bg surface
  a11y      real <button type="button">, aria-label on icon-only buttons, loading retains accessible name
  used on   S01, S02, S03, S04, S05
```

---

### 3. ModelSelector (Model Picker Dropdown)

```text
ModelSelector
  variants  minimal-pill, drawer-header
  states    collapsed, expanded, hovered, focused
  tokens    bg: transparent, hover: bg surface, text: text, radius: pill, font: lg/500
  children  [ModelNameText ("Gemini 3.8 Flash" / "Gemini 4 Argon")], [CaretIcon]
  menu      dialog / popover with listbox semantics (role="listbox", options with role="option")
  a11y      aria-haspopup="listbox", aria-expanded, ArrowDown/ArrowUp keyboard traversal
  used on   S01, S02
```

---

### 4. SuggestionChip (Prompt Starter)

```text
SuggestionChip
  variants  standard-card, compact-pill
  states    default, hover, active, focus-visible
  tokens    bg: surface, border: border, hover: bg surface-elevated, text: text, radius: md
  tokens(text) title: text base/500, subtitle: text-muted sm/400
  dimensions min-height: 120px, max-width: 200px (4-column grid on desktop, carousel on mobile)
  a11y      <button>, role="button", aria-label="Prompt suggestion: {title}"
  used on   S01
```

---

### 5. ChatBubble (User Message)

```text
ChatBubble
  variants  user-pill
  states    default, hover (reveals edit button)
  tokens    bg: surface, text: text, radius: lg, padding: 12px 18px
  alignment right-aligned on desktop, max-width: 70%
  actions   [EditButton (ghost icon sm)]
  a11y      role="region", aria-label="You said:"
  used on   S02
```

---

### 6. AssistantMessageBlock (AI Markdown Response)

```text
AssistantMessageBlock
  variants  streaming, complete, error
  tokens    bg: transparent, text: text, font: base/400, code-block: bg surface-elevated
  tokens(typing) cursor: 2px solid var(--accent), animation: pulse 800ms infinite
  actions   [CopyButton], [RegenerateButton], [ShareButton], [ThumbsUpButton], [ThumbsDownButton]
  children  Markdown container (prose), CitationAccordion, CodeSandbox preview
  a11y      aria-live="polite" during streaming, role="article", aria-label="Gemini response"
  used on   S02
```

---

### 7. SidebarNavigation (History & Drawer)

```text
SidebarNavigation
  variants  rail-collapsed (68px), drawer-expanded (280px)
  states    collapsed, expanding, expanded, mobile-overlay
  tokens    bg: surface, border-right: border, text: text-muted
  children  [NewChatButton ("+ New chat", bg: surface-elevated, radius: pill)],
            [RecentChatsSection (grouped: Today, Yesterday, Previous 7 days)],
            [FooterControls (Help, Activity, Settings)]
  a11y      role="navigation", aria-label="Main sidebar", keyboard trap on mobile drawer
  used on   S01, S02, S03
```

---

### 8. VoiceOrb (Reactive Live Visualizer)

```text
VoiceOrb
  variants  mini-orb (24px header), full-duplex (220px modal)
  states    idle, listening (radial pulse), thinking (color flow), speaking (32-band FFT audio wave)
  tokens    gradient: linear-gradient(135deg, var(--spark-gradient-1), var(--spark-gradient-3))
  animation SVG displacement filter + requestAnimationFrame radial FFT wave
  a11y      role="status", aria-live="assertive", aria-label="Live voice mode active"
  used on   S04, S05
```

---

### 9. CitationAccordion (Web Grounding Sources)

```text
CitationAccordion
  variants  collapsed-pill, expanded-drawer
  states    default, hover, active
  tokens    bg: surface, border: border, text: text-muted sm/400, link: accent sm/500
  a11y      <details> / <summary> or Accordion primitive with aria-expanded
  used on   S02
```
