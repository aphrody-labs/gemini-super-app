# Chrome Web Store Listing — Gemini Live Voice & Pet

**Last Updated**: 2026-11-02  
**Current Version**: `1.2.0` (`manifest_version: 3`)  
**Packages**:

- `dist/chrome-web-store/gemini-live-voice-extension-v1.2.0.zip` (`apps/gemini_voice_extension`)
- `dist/chrome-web-store/gemini-dark-theme-v1.2.0.zip` (`apps/gemini_chrome_theme`)

---

## Store Listing

### Name

Gemini Live Voice & Pet

### Summary (75 / 132 characters max)

Minimalist Google Gemini Voice-to-Voice & 2D/3D Companion Pet for Chromium.

### Description

Gemini Live Voice & Pet brings natural, simultaneous voice-to-voice conversations and an interactive 2D/3D companion pet directly to your browser new tab, side panel, and Google Gemini workspace.

Speak naturally at any moment—even while Gemini is replying—and hear expressive spoken answers with zero waiting or text clutter.

Key Features:

- **Simultaneous Voice-to-Voice Conversations**: Talk hands-free in real time and chime in while your assistant is speaking without losing your train of thought, or say "stop" at any time to pause playback.
- **Minimalist New Tab Voice Stage & Companion Pet**: Open a new tab to access a clean, distraction-free voice orb alongside an interactive 2D/3D companion pet that reacts to your voice and cursor.
- **Instant Push-to-Talk Dictation (`F5` / `Alt+V`)**: Dictate prompts directly into Google Gemini, Google AI Studio, and Antigravity with a single shortcut.
- **Persistent Side Panel**: Keep your voice orb and companion pet docked next to any webpage so you can converse while browsing or working across tabs.
- **Right-Click Selection to Voice**: Highlight any text on a webpage and send it straight to your active voice conversation from the context menu with visual confirmation.
- **Local Workspace & Session Continuity (`Alt+A`)**: Browse your local project files and keep your conversation summary synchronized with your local companion hub on your own computer.
- **Automatic Light & Dark Theme**: Adapts smoothly to your system appearance and includes a matching Material 3 Dark Theme package (`Gemini Dark Theme`).

### Category

Productivity

### Language

Français (`fr`) / English (`en`)

---

## Graphics & Assets

| Asset                  | Dimensions                              | Format | Required         | Status                                                                 |
| :--------------------- | :-------------------------------------- | :----- | :--------------- | :--------------------------------------------------------------------- |
| **Extension Icons**    | `16x16`, `32x32`, `48x48`, `128x128` px | PNG    | Yes              | ✅ Ready (`apps/gemini_voice_extension/icons/icon-{16,32,48,128}.png`) |
| **Store Icon**         | `128 x 128` px                          | PNG    | Yes              | ✅ Ready (`apps/gemini_voice_extension/icons/icon-128.png`)            |
| **Screenshots** (1–5)  | `1280 x 800` px                         | PNG    | Yes (at least 1) | ✅ Ready (`dist/chrome-web-store/assets/screenshot-1280x800.png`)      |
| **Small Promo Tile**   | `440 x 280` px                          | PNG    | Recommended      | ✅ Ready (`dist/chrome-web-store/assets/small-promo-440x280.png`)      |
| **Marquee Promo Tile** | `1400 x 560` px                         | PNG    | Optional         | ✅ Ready (`dist/chrome-web-store/assets/marquee-promo-1400x560.png`)   |

---

## Permissions Justification

Every permission and host permission declared in `apps/gemini_voice_extension/manifest.json` has a single, plain-English user-facing reason:

| Permission / Override                                  | Plain-English Justification for Chrome Web Store Review                                                                                                                                                     |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                              | Saves your preferred voice state, companion pet mode (2D/3D), theme preference, and local hub address in the browser so your settings persist across sessions.                                              |
| `tabs`                                                 | Identifies your active browser tab and window so that clicking the Side Panel button, triggering keyboard shortcuts, or using the right-click context menu targets the window you are currently viewing.    |
| `sidePanel`                                            | Opens the Gemini Live Voice & Pet companion panel alongside your active webpage when you click the Side Panel button in the popup or select it from the context menu.                                       |
| `contextMenus`                                         | Adds the right-click menu options to send highlighted page text to your active voice session or open the companion side panel, followed by a confirmation badge and on-page toast.                          |
| `alarms`                                               | Schedules lightweight periodic status checks with your local voice hub and resets temporary confirmation badges without keeping the background service worker awake continuously.                           |
| `cookies`                                              | Synchronizes your active Google Gemini session cookies exclusively with your own local desktop companion vault on `127.0.0.1:8787` so your local desktop assistant stays signed in without repeated logins. |
| `chrome_url_overrides.newtab`                          | Replaces the blank new tab page with the minimalist Gemini Voice-to-Voice orb and interactive 2D/3D companion pet stage.                                                                                    |
| `host_permissions`: `https://*.google.com/*`           | Reads active Google session cookies strictly for local loopback synchronization (`127.0.0.1:8787`) on the user's own machine.                                                                               |
| `host_permissions`: `https://gemini.google.com/*`      | Displays the floating Gemini voice capsule, push-to-talk button, and local workspace drawer inside the Google Gemini web app.                                                                               |
| `host_permissions`: `https://aistudio.google.com/*`    | Displays the floating Gemini voice capsule and push-to-talk controls inside Google AI Studio.                                                                                                               |
| `host_permissions`: `https://antigravity.google.com/*` | Displays the floating Gemini voice capsule and push-to-talk controls inside the Antigravity web workspace.                                                                                                  |
| `host_permissions`: `https://music.youtube.com/*`      | Allows the local companion hub to coordinate voice ducking and playback controls when YouTube Music is open.                                                                                                |
| `host_permissions`: `http://127.0.0.1:8765/*`          | Connects the extension to the user's local Gemini Live Voice Bridge running on localhost port `8765` for real-time audio streaming and speech synthesis.                                                    |
| `host_permissions`: `http://127.0.0.1:8787/*`          | Connects the extension to the user's local Gemini Super App server on localhost port `8787` for companion pet state, local file browsing, and session auto-compaction.                                      |
| `host_permissions`: `http://127.0.0.1:8788/*`          | Connects the extension to the user's local auxiliary audio/media bridge on localhost port `8788`.                                                                                                           |

---

## Remote Code

**Does this extension use remote code?**  
`No`

All HTML, CSS, SVG, and JavaScript files are packaged directly inside the extension archive. The extension enforces `"extension_pages": "script-src 'self'; object-src 'self';"` with zero inline scripts and zero `eval()`.

---

## Privacy & Data Usage Disclosures

### Single Purpose Description

Provides real-time voice-to-voice conversation, push-to-talk dictation, and an interactive 2D/3D companion pet across the browser new tab, side panel, and Google Gemini workspaces connected to the user's local desktop hub.

### Data Collection & Transmission

- **External Third-Party Servers**: `No` — No user data, audio, transcripts, or cookies are ever transmitted to external third-party servers or analytics providers.
- **Local Loopback Only (`127.0.0.1`)**: Audio frames, voice prompts, and session state are exchanged strictly between the browser and the user's own local loopback services (`http://127.0.0.1:8765`, `http://127.0.0.1:8787`, `http://127.0.0.1:8788`) or stored in `chrome.storage`.
- **Privacy Policy Document**: Available in [`PRIVACY.md`](./PRIVACY.md) and hosted at `https://github.com/aphrody-labs/gemini-super-app/blob/main/PRIVACY.md`.

### Data Use Certification

- [x] I certify that my data use disclosures are accurate and complete
- [x] I certify that I do not sell or transfer user data to third parties outside of the approved use cases
- [x] I certify that I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I certify that I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Additional Store Fields

| Field                  | Value                                                                   |
| :--------------------- | :---------------------------------------------------------------------- |
| **Homepage URL**       | `https://github.com/aphrody-labs/gemini-super-app`                      |
| **Support URL**        | `https://github.com/aphrody-labs/gemini-super-app/issues`               |
| **Privacy Policy URL** | `https://github.com/aphrody-labs/gemini-super-app/blob/main/PRIVACY.md` |
| **Mature Content**     | No                                                                      |
| **Visibility**         | Public / Unlisted                                                       |
| **Regions**            | All regions                                                             |

> **Note on OAuth / Extension ID**: If `chrome.identity` OAuth is enabled in a future build, pack the extension to extract its public `"key"` for `manifest.json` during development, and after publishing to the Chrome Web Store, update the Google Cloud OAuth client (`aphrody`) with the store-assigned extension ID.

---

## Version History

| Version   | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                         |
| :-------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.2.0** | 2026-11-02 | Added true simultaneous full-duplex voice-to-voice (`240ms` VAD + instant final speech dispatch), real-time clock/date & local tools integration (`/api/antigravity/tools`), minimalist zero-text New Tab & Popup with 2D/3D companion pet, PC workspace drawer (`Alt+A`) with batched DOM rendering, Chrome Prompt API (`LanguageModel`) support, and pixel-verified `16/32/48/128` PNG icons. |
| **1.1.0** | 2026-11-01 | Added persistent Side Panel, `light-dark()` theme adaptation, right-click context menu integration with toast feedback, and `chrome.alarms` heartbeat.                                                                                                                                                                                                                                          |
| **1.0.0** | 2026-11-01 | Initial release with animated Gemini SVG orb, full-duplex `/voice` and `Record` controls.                                                                                                                                                                                                                                                                                                       |
