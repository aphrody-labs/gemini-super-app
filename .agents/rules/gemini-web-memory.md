# Gemini Web App Synchronized Memory & Tools (`gemini.google.com` <-> `agy`)

> Synchronisé automatiquement par le plugin `gemini-app-runtime` (2026-11-02T03:42:50.598Z).

## 1. Mémoire Utilisateur Importée (`gemini.google.com/saved-info`)
1. Plugin gemini-app-runtime actif nativement dans Gemini.exe (:8789/mcp) et agy CLI. *(agy_mcp_save_memory)*
2. Plugin gemini-app-runtime actif nativement dans Gemini.exe (:8789/mcp) et agy CLI. *(agy_mcp_save_memory)*
3. Plugin gemini-app-runtime actif nativement dans Gemini.exe (:8789/mcp) et agy CLI. *(agy_mcp_save_memory)*
4. Monorepo unifié Gemini Super App & Voice Hub (Rust Édition 2024, Bun v1.4.5, Tauri v3 Alpha, Python uv, Flutter) sur C:\Users\aphro\google. *(system_seed)*
5. Projet GCP actif: aphrody (468000409790, us-central1) avec modèles gemini-3.8-live, gemini-4-argon, gemini-3.8-flash et gemini-3.8-flash-tts (voix Aoede). *(system_seed)*
6. Toujours utiliser Bun (bun run, bun fmt, bun check, bun test, Bun.serve, bun:sqlite) et uv pour Python. *(system_seed)*

## 2. Gems & Personas Actifs (`gemini.google.com/gems/view`)
- **Coding Partner** : Expert en architecture logicielle, Rust, Bun, TypeScript, Python et débogage fullstack.
- **Deep Research Analyst** : Synthétise des recherches multi-sources web et Google Workspace avec citations vérifiées.
- **Gemini Live Voice & Mochi Companion** : Assistant vocal temps réel connecté à Gemini.exe, Chrome /chrome-home et agy CLI.

## 3. Outils & Extensions Gemini Web App Disponibles dans le Runtime (`:8789/mcp`)
- **`deep_research`** (Deep Research (Gemini 3.8 / 4 Argon)) : Agentic multi-step web research that plans sub-queries, browses dozens of sources, and synthesizes a comprehensive cited report.
- **`canvas`** (Gemini Canvas (Interactive Document & Code Workspace)) : Side-by-side interactive editor and live preview for documents, fullstack web apps, React/HTML prototypes, and iterative code refinement.
- **`gems`** (Gems (Custom Gemini Experts & System Personas)) : Custom system instructions, knowledge files, and specialized personas created or premade in Gemini Web App.
- **`saved_info`** (Gemini Saved Info (Web Memory / Infos enregistrées)) : Persistent long-term user memory stored in Google Account across Gemini Web, Mobile, and Windows App.
- **`ext_google_workspace`** (@Google Workspace (Gmail, Drive, Docs, Calendar, Keep, Tasks) — `@Google Workspace`) : Queries and acts across personal Google Workspace data: searching emails, summarizing Drive PDFs/Docs, managing Calendar events, Keep notes, and Tasks.
- **`ext_gmail`** (@Gmail — `@Gmail`) : Finds, reads, summarizes, and drafts replies to emails in the user's Gmail inbox.
- **`ext_google_drive`** (@Google Drive — `@Google Drive`) : Searches folders, reads PDFs/Sheets/Slides/Docs, and extracts facts from Google Drive.
- **`ext_google_docs`** (@Google Docs — `@Google Docs`) : Reads, summarizes, and drafts structured Google Docs documents.
- **`ext_youtube`** (@YouTube — `@YouTube`) : Searches YouTube videos, fetches transcripts, extracts key timestamps, and answers questions about video content.
- **`ext_youtube_music`** (@YouTube Music — `@YouTube Music`) : Finds songs, artists, albums, and playlists and triggers playback on YouTube Music.
- **`ext_google_maps`** (@Google Maps — `@Google Maps`) : Provides real-time place details, ratings, directions, distances, and neighborhood comparisons.
- **`ext_google_flights`** (@Google Flights — `@Google Flights`) : Queries real-time flight schedules, fares, airlines, and layover options.
- **`ext_google_hotels`** (@Google Hotels — `@Google Hotels`) : Searches hotels, nightly rates, amenities, and location proximity.
- **`ext_github`** (@GitHub / Code Repository Import — `@GitHub`) : Attaches GitHub repositories or local folders into Gemini's 1M-2M token context window for codebase Q&A and refactoring.
- **`native_live_voice`** (Gemini Live Full-Duplex Voice (Aoede HD + Whisper + Silero VAD)) : Bidirectional zero-latency voice conversation bridged between Gemini.exe, Voice Hub (:8765), and Antigravity TCP Mic (:24713).
- **`native_stc_window`** (Speak-to-Window Capsule & Win32 Unicode Injection (Alt+Shift+D)) : Native Gemini.exe floating capsule (stc_pill.html) and Win32 C++ addon (gemini_native.node) that reads foreground window/caret/selection and injects Unicode text into any Windows app.
- **`native_window_capture`** (Desktop & Window Visual Capture (desktopCapturer)) : Captures any open Windows application window or screen region and attaches it directly into the Gemini Web multimodal composer.
