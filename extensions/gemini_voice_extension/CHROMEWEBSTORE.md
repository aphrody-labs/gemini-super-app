# Chrome Web Store Listing — Antigravity Gemini Live Voice Hub

---

## Store Listing

### Name

Antigravity Gemini Live Voice Hub

### Summary

Talk naturally with Gemini in real time using hands-free voice conversations, instant push-to-talk dictation, and an animated voice studio.

### Description

Antigravity Gemini Live Voice Hub brings fluid, hands-free voice conversations and instant speech dictation directly to Google Gemini, Google AI Studio, and Antigravity.

Instead of typing long prompts or manually copying transcripts between tools, speak naturally and hear expressive spoken replies in real time—even when you interrupt mid-sentence to refine your question.

Key Features:

- Hands-Free Full-Duplex Voice Mode: Start a continuous `/voice` conversation where you can speak naturally and interrupt at any moment for a smooth, human-like dialogue.
- Instant Push-to-Talk Recording: Press F5 or click the Record button to dictate complex prompts directly into the chat input box with optional one-step sending.
- Animated Gemini Voice Orb: Keep track of whether your assistant is listening, thinking, or speaking through a responsive floating voice capsule with live audio spectrum feedback.
- Dedicated Voice Studio Side Panel: Open a persistent side panel alongside your tabs to review live conversation transcripts, switch voice modes, and trigger quick voice actions without cluttering the page.
- Right-Click Selection to Voice: Highlight any text on a supported page and send it straight to your active voice session from the context menu.
- Light & Dark Theme Adaptation: Automatically matches your system appearance and respects reduced-motion accessibility preferences.

### Category

Productivity

### Language

Français (fr) / English (en)

---

## Graphics & Assets

| Asset                  | Dimensions                    | Format      | Required         | Status                                |
| ---------------------- | ----------------------------- | ----------- | ---------------- | ------------------------------------- |
| **Store Icon**         | 128 x 128 px                  | PNG         | Yes              | ✅ Ready (`icons/icon-128.png`)       |
| **Screenshots** (1–5)  | 1280 x 800 px or 640 x 400 px | PNG or JPEG | Yes (at least 1) | ⬜ Manual — capture before publishing |
| **Small Promo Tile**   | 440 x 280 px                  | PNG or JPEG | No (recommended) | ⬜ Manual — create if desired         |
| **Marquee Promo Tile** | 1400 x 560 px                 | PNG or JPEG | No               | ⬜ Manual — create if desired         |
| **Promo Video**        | YouTube URL                   | —           | No               | ⬜ Optional                           |

---

## Permissions Justification

| Permission                                             | Justification                                                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                              | Saves your preferred voice mode (Voice-to-Voice, Dictation, or Speak-to-Window), auto-submit toggle, and active session status locally in the browser so your settings persist across browser restarts. |
| `tabs`                                                 | Identifies the active Google Gemini, AI Studio, or Antigravity tab so that voice toggles, keyboard shortcuts, and context-menu actions are delivered to the tab you are currently using.                |
| `sidePanel`                                            | Displays the persistent Gemini Live Voice Studio side panel alongside your active tab so you can view live transcripts and voice controls without covering page content.                                |
| `contextMenus`                                         | Adds the "Envoyer la sélection à Gemini Live /voice" right-click menu item when text is selected, allowing you to send highlighted text directly to your voice session.                                 |
| `alarms`                                               | Runs a lightweight periodic heartbeat check for the local voice hub connection when the background service worker is woken by Chrome, avoiding persistent background timers.                            |
| `host_permissions`: `https://gemini.google.com/*`      | Injects the interactive `/voice` and `Record` controls and floating Gemini voice orb into the Google Gemini web interface.                                                                              |
| `host_permissions`: `https://aistudio.google.com/*`    | Injects the interactive `/voice` and `Record` controls and floating Gemini voice orb into Google AI Studio.                                                                                             |
| `host_permissions`: `https://antigravity.google.com/*` | Injects the interactive `/voice` and `Record` controls and floating Gemini voice orb into the Antigravity web workspace.                                                                                |
| `host_permissions`: `http://127.0.0.1:8765/*`          | Connects the browser extension to the user's local Antigravity Gemini Live Voice Hub daemon running on localhost port 8765 for low-latency audio streaming and transcription.                           |

---

## Remote Code

**Does this extension use remote code?**
`No`

All JavaScript, CSS, SVG, and HTML assets are bundled directly inside the extension package. No external scripts, `eval()`, or remote code execution are used.

---

## Data Usage Disclosures

### Single Purpose Description

Provides real-time voice-to-voice conversation, speech dictation, and an interactive voice control panel for Google Gemini, Google AI Studio, and Antigravity connected to the user's local voice hub.

### Data Collection

**Does this extension collect or transmit user data to external third-party servers?**
`No`

Audio chunks, transcripts, and voice commands are exchanged strictly between the browser tab and the user's local Antigravity Voice Hub service (`http://127.0.0.1:8765`) or stored locally in `chrome.storage`.

### Data Use Certification

- [x] I certify that my data use disclosures are accurate and complete
- [x] I certify that I do not sell or transfer user data to third parties outside of the approved use cases
- [x] I certify that I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I certify that I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Privacy Policy

Not required — this extension does not collect, store, or transmit personal data to external remote servers; all preferences are stored locally via `chrome.storage` and audio/text interactions are routed exclusively to the user's local loopback service (`127.0.0.1:8765`).

---

## Additional Fields

| Field              | Value             |
| ------------------ | ----------------- |
| **Homepage URL**   | —                 |
| **Support URL**    | —                 |
| **Official URL**   | —                 |
| **Mature Content** | No                |
| **Visibility**     | Unlisted / Public |
| **Regions**        | All regions       |

---

## Version History

| Version | Date       | Changes                                                                                                                                                                                                                                 |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.0   | 2026-11-01 | Added persistent Side Panel studio, native `<input type="checkbox" switch>` controls, `light-dark()` theme support, light-dismiss info dialog, right-click context menu integration with toast feedback, and `chrome.alarms` heartbeat. |
| 1.0.0   | 2026-11-01 | Initial release with animated Gemini SVG orb, full-duplex `/voice` and `Record` controls.                                                                                                                                               |
