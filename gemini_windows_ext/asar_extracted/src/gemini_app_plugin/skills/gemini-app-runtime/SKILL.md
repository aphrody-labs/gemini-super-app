---
name: gemini-app-runtime
description: Controls the Gemini Web App (gemini.google.com) and patched Google Gemini Windows App (Gemini.exe :8789) as a native execution runtime for Antigravity (agy). Use when executing prompts in Gemini Web, invoking Gemini Web tools and @Extensions (Deep Research, Canvas, Gems, @Google Workspace, @Gmail, @Google Drive, @Google Docs, @YouTube, @YouTube Music, @Google Maps, @Google Flights, @Google Hotels, @GitHub), importing or saving Gemini Web Memory (gemini.google.com/saved-info), or controlling native Gemini Windows features (Speak-to-Window capsule, Win32 Unicode injection, foreground window context).
---

# Gemini Web & Windows Native Runtime Skill (`gemini-app-runtime`)

This skill gives Antigravity (`agy`) full control over **Google Gemini Web App (`https://gemini.google.com/app`)** running inside the patched **Google Gemini Windows App (`Gemini.exe` v1.17.0 on `:8789`)**, treating Gemini Web as an interactive execution runtime, tool ecosystem, and shared long-term memory store.

---

## 1. Architecture & Endpoints

| Surface / Layer | Endpoint / File | Role |
| :--- | :--- | :--- |
| **Patched `Gemini.exe` Direct Runtime & HTTP MCP** | `http://127.0.0.1:8789/mcp` & `/api/runtime/*` | Runs inside `Gemini.exe` (`resources/app.asar/src/gemini_web_runtime_engine.js`). Direct access to `V.webContents` (`gemini.google.com`), `WIZ_global_data`, and `gemini_native.node` Win32 C++ addon. |
| **Stdio + HTTP Bridge MCP Server** | `packages/gemini_app_plugin/mcp_server.ts` | Registered in `agy` as `gemini-app-runtime`. Auto-starts `Gemini.exe` if needed and exposes 9 eager MCP tools. |
| **Gemini Super App Proxy** | `http://127.0.0.1:8787/mcp` & `/api/runtime/*` | Fullstack Bun.serve() proxy and SQLite WAL persistence. |
| **Synchronized Web Memory Store** | `config/gemini_web_memory.json` & `.agents/rules/gemini-web-memory.md` | Stores imported `/saved-info` items, custom `/gems/view` personas, web threads, and voice history. |

---

## 2. Eager MCP Tools Reference (9 Tools)

### A. Runtime Inspection & Prompt Execution
1. **`gemini_web_runtime_status`**
   - Returns live `gemini.google.com` DOM telemetry (`url`, `title`, `account`, `activeModel`, `domTools`, `threads`, `messages`), native Win32 state (`foregroundApp`, `caret`, `selectedText`), and Web Memory counts.
2. **`gemini_web_execute_prompt`**
   - Arguments: `{ prompt: string, tool?: string, newChat?: boolean, timeoutMs?: number }`
   - Injects `prompt` (and optional `@Extension` prefix or mode chip) directly into the `rich-textarea .ql-editor` composer in `gemini.google.com`, clicks Send, waits for the streaming response to settle, and returns `{ replyText, codeBlocks, citations }` (with seamless fallback to Voice Hub `:8765` enriched with Web Memory).
3. **`gemini_web_read_thread`**
   - Arguments: `{ threadUrl?: string }`
   - Reads all user/model messages, code blocks, and sidebar conversation links from the active or specified `gemini.google.com/app/<id>` thread.
4. **`gemini_web_navigate`**
   - Arguments: `{ target: "app" | "saved_info" | "gems" | "extensions" | "canvas" | "scheduled" | string }`
   - Navigates `Gemini.exe`'s main `WebContentsView` to the requested Gemini Web surface.

### B. Web Tools & `@Extensions` Consciousness (17 Capabilities)
5. **`gemini_web_discover_tools`**
   - Arguments: `{ category?: "core_mode" | "google_workspace" | "media_knowledge" | "travel_maps" | "coding" | "native_windows" }`
   - Returns the full catalog of 17 Gemini Web capabilities plus live DOM tool buttons currently visible in `gemini.google.com`.
6. **`gemini_web_use_tool`**
   - Arguments: `{ toolId: string, prompt?: string }`
   - Supported `toolId` values:
     - `deep_research` — Multi-step autonomous research & cited report generation
     - `canvas` — Interactive document & live React/HTML/code preview (`/canvas`)
     - `gems` — Custom Gemini experts & personas (`/gems/view`)
     - `saved_info` — Persistent user facts & preferences (`/saved-info`)
     - `ext_google_workspace` — `@Google Workspace` (Gmail, Drive, Docs, Calendar, Keep, Tasks)
     - `ext_gmail` — `@Gmail` inbox search, summarization & drafting
     - `ext_google_drive` — `@Google Drive` file search & PDF/Doc analysis
     - `ext_google_docs` — `@Google Docs` reading & drafting
     - `ext_youtube` — `@YouTube` video search & transcript Q&A
     - `ext_youtube_music` — `@YouTube Music` discovery & playback
     - `ext_google_maps` — `@Google Maps` places, routes & local reviews
     - `ext_google_flights` — `@Google Flights` live schedules & fares
     - `ext_google_hotels` — `@Google Hotels` rates & amenities
     - `ext_github` — `@GitHub` repository import & codebase Q&A
     - `native_live_voice` — Full-duplex Gemini Live voice (`Aoede` HD + Whisper + Silero VAD)
     - `native_stc_window` — Speak-to-Window floating capsule (`Alt+Shift+D`) & Win32 Unicode injection
     - `native_window_capture` — Desktop/window visual screenshot capture

### C. Web Memory Import & Persistence (`gemini.google.com/saved-info`)
7. **`gemini_web_import_memory`**
   - Arguments: `{ visitSavedInfoPage?: boolean, visitGemsPage?: boolean }`
   - Scrapes live Saved Info from `https://gemini.google.com/saved-info`, custom Gems from `https://gemini.google.com/gems/view`, recent sidebar threads, Super App SQLite conversations, and Voice Hub turns.
   - Writes `config/gemini_web_memory.json` and regenerates `.agents/rules/gemini-web-memory.md` so `agy` automatically loads the user's web memory in every session.
8. **`gemini_web_save_memory`**
   - Arguments: `{ text: string, syncToWebDom?: boolean }`
   - Saves a new persistent fact into `config/gemini_web_memory.json`, updates `.agents/rules/gemini-web-memory.md`, and optionally adds it to `gemini.google.com/saved-info`.

### D. Native Windows Desktop Control (`Gemini.exe` + `gemini_native.node`)
9. **`gemini_windows_native_control`**
   - Arguments: `{ command: "status" | "show" | "hide" | "stc_trigger" | "inject_unicode" | "get_foreground_context" | "reload", text?: string }`
   - Controls the native Electron + Win32 shell of `Gemini.exe`, including typing Unicode text into the currently focused Windows app via `injectUnicodeText`.

---

## 3. CLI & HTTP Quick Commands

```powershell
# Check live Gemini Web Runtime status directly from Gemini.exe (:8789)
Invoke-RestMethod http://127.0.0.1:8789/api/runtime/status

# Discover all 17 Gemini Web tools & live DOM buttons
Invoke-RestMethod http://127.0.0.1:8789/api/runtime/tools

# Import Web Memory (/saved-info + /gems/view + threads) into config/gemini_web_memory.json
Invoke-RestMethod -Method POST http://127.0.0.1:8789/api/runtime/memory/import -ContentType "application/json" -Body '{"visitSavedInfoPage":false}'

# Execute a prompt in the Gemini Web Runtime with an @Extension
Invoke-RestMethod -Method POST http://127.0.0.1:8789/api/runtime/execute -ContentType "application/json" -Body '{"prompt":"Synthétise l architecture du monorepo","tool":"deep_research"}'
```
