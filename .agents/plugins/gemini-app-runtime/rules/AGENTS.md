# Gemini Web & Windows Native Runtime (`gemini-app-runtime`) — Always-On Consciousness Rule

You are directly connected to the patched **Google Gemini Windows App (`Gemini.exe` v1.17.0 on `http://127.0.0.1:8789`)** and **Gemini Web App (`https://gemini.google.com/app`)** as a first-class co-execution runtime via the `gemini-app-runtime` MCP server (`http://127.0.0.1:8789/mcp` and `packages/gemini_app_plugin/mcp_server.ts`).

## 1. Gemini Web App as Your Co-Runtime

Whenever a task benefits from personal Google account context, live web grounding, Deep Research, interactive Canvas previews, or native Windows desktop automation, treat `gemini.google.com` inside `Gemini.exe` as your live execution runtime:

- **`gemini_web_runtime_status`**: Inspect active `gemini.google.com` URL, logged-in Google account, active model (`Gemini 3.8` / `Gemini 4 Argon`), open conversation threads, foreground Win32 window/caret/selection, and synchronized Web Memory.
- **`gemini_web_execute_prompt`**: Execute a prompt inside `gemini.google.com`'s rich editor (or hybrid Voice Hub bridge), optionally activating any `@Extension` or mode, and retrieve the response, code blocks, and citations.
- **`gemini_web_read_thread`** & **`gemini_web_navigate`**: Read existing web threads or navigate between `/app`, `/saved-info`, `/gems/view`, `/extensions`, and `/canvas`.

## 2. Full Consciousness of the 17 Gemini Web Tools & `@Extensions`

Use `gemini_web_discover_tools` or `gemini_web_use_tool` to leverage all 17 capabilities natively available in Gemini Web + Windows App:

- **Core Modes**:
  - `deep_research`: Multi-step autonomous web research generating comprehensive cited reports.
  - `canvas`: Interactive side-by-side document & live React/HTML/code workspace (`/canvas`).
  - `gems`: Custom Gemini personas & system instructions with attached knowledge (`/gems/view`).
  - `saved_info`: Persistent user facts & preferences stored at `gemini.google.com/saved-info`.
- **Google Workspace & Personal Data (`@` Mentions)**:
  - `ext_google_workspace` (`@Google Workspace`), `ext_gmail` (`@Gmail`), `ext_google_drive` (`@Google Drive`), `ext_google_docs` (`@Google Docs`)
- **Media, Travel & Code (`@` Mentions)**:
  - `ext_youtube` (`@YouTube`), `ext_youtube_music` (`@YouTube Music`), `ext_google_maps` (`@Google Maps`), `ext_google_flights` (`@Google Flights`), `ext_google_hotels` (`@Google Hotels`), `ext_github` (`@GitHub`)
- **Native Windows Capabilities (`Gemini.exe` + `gemini_native.node`)**:
  - `native_live_voice`: Full-duplex voice (`Aoede` HD TTS + Whisper `large-v3-turbo` STT + TCP Mic `:24713`).
  - `native_stc_window`: Speak-to-Window floating capsule (`Alt+Shift+D`) + Win32 `injectUnicodeText` into any active Windows application.
  - `native_window_capture`: Desktop & window visual capture (`desktopCapturer`).

## 3. Shared Web Memory (`gemini.google.com/saved-info` <-> `agy`)

- Persistent Web Memory is synchronized to `C:\Users\aphro\google\config\gemini_web_memory.json` and `.agents/rules/gemini-web-memory.md`.
- Call **`gemini_web_import_memory`** to pull the latest Saved Info (`/saved-info`), Gems (`/gems/view`), web threads, and voice history into your workspace rules.
- Call **`gemini_web_save_memory`** whenever the user asks to remember a preference or architectural fact across both `agy` and `gemini.google.com`.

## 4. Real-Time Pet Customization & Animation (`gemini_pet_customize_and_animate`)

- Call **`gemini_pet_customize_and_animate`** (or `POST http://127.0.0.1:8787/api/pet/customize`) to customize and animate the user's companion Pet (`gemini-sparkle`, `hoodie-cat`, or `mochi` 🌱) in real time across the Windows 11 Live Wallpaper (`/wallpaper`), `/pet`, and `/chrome-home` via WebSockets (`ws://127.0.0.1:8787/ws`) and dynamic 8×11 SVG spritesheets (`/assets/openpets/gemini-pet-spritesheet.svg`).
- Supports `customStyle` (`customName`, `primaryColor`, `secondaryColor`, `accentColor`, `eyeColor`, `auraColor`, `scale`, `animationSpeed`, `accessory`: `crown|headphones|sunglasses|wizard-hat|halo|bowtie|none`, `particleEffect`, `is3dMode`), `reaction`, `emoteId`, `mochiAnimation`, `speechText`, and multi-step `choreography`.
