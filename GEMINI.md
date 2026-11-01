# Gemini Live Voice Hub & Super App — Antigravity Multi-Surface Architecture (Novembre 2026)

Dépôt officiel GitHub : **`https://github.com/aphrody-labs/gemini-super-app`**

Ce monorepo unifié (**Rust Édition 2024 + Bun v1.4.5 + Tauri v3 Alpha `3.0.0-alpha.5` + Python `uv` + Flutter**) connecte en temps réel :
1. **The One Big Gemini Super App (`apps/gemini_super_app/`)** — Serveur fullstack `Bun.serve()`, SQLite WAL (`bun:sqlite`), shell natif Tauri v3 Alpha (`crates/gemini-super-tauri`), compagnon interactif **Gemini Pet** (`crates/openpets-core`, `packages/openpets_gemini`, `/pet`) et interface unifiée avec **Orbe SVG officiel Gemini animé en permanence** (`AnimatedGeminiSvgOrb`), fédérant les **10 sous-modules `vendor/*`**, **17 crates Rust (`crates/*`)** et **10 packages Bun (`packages/*`)**.
2. **Application Flutter (`apps/gemini_voice_app/`)** — Desktop Windows, Web & Mobile avec **SVG officiel Gemini animé en permanence** (`AnimatedGeminiSvgOrb`), spectre radial FFT 32 bandes et mode Mini-Orbe d'arrière-plan.
3. **Antigravity CLI (`agy`)** — Commandes `/voice`, `/record`, raccourci `F5`, flux audio TCP `ANTIGRAVITY_MIC=127.0.0.1:24713` (`32 kB/s` PCM 16 kHz mono) et pont `agentapi` (`agy.exe agentapi`).
4. **Antigravity Desktop App (`Antigravity.exe`)** — Sidecar persistant `gemini-live-voice` (`~/.gemini/config/sidecars/gemini-live-voice/sidecar.json`), hook `SessionStart` (`.agents/hooks.json`), skill `/voice-live` (`.agents/skills/voice-live/SKILL.md`), et pont `language_server.exe agentapi`.
5. **Gemini Web App, AI Studio & YouTube Music (`apps/gemini_voice_extension/`)** — Extension Chrome Manifest V3 injectant l'orbe SVG officiel Gemini animé et rendant les boutons `/voice` & `Record` interactifs sur `gemini.google.com`, `aistudio.google.com`, `antigravity.google.com` et `music.youtube.com`.
6. **Gemini Windows App (`apps/gemini_windows_patcher/`)** — Exécutable natif patché dans `resources/app.asar` (`voice_bridge_native.js`, `top_bar.html`, `stc_pill.html`, `preload.js`) synchronisé en temps réel avec le Voice Hub.

## Modèles & Moteurs Audio Configurés (Vérifiés en Direct sur l'API Google Gemini)

- **Speech-to-Speech Temps Réel** : `gemini-3.8-live` & `gemini-3.8-live-extended-thinking` (WebSocket bidirectionnel `BidiGenerateContent`, VAD Hybride `audio_stream_end`, dialogue affectif, audio proactif, barge-in poli, client natif Rust `flowcat_core::GeminiLive` et SDK Bun `@google/genai`).
- **Raisonnement Profond & Rapide** : `gemini-4-argon` & `gemini-3.8-flash` via `@google/genai`, `google-genai` (`uv`) et `agy` CLI.
- **Synthèse Vocale Contrôlable (TTS) & Clonage Vocal** : `gemini-3.8-flash-tts` & `gemini-3.8-flash-lite-tts` (voix HD `Aoede`, `Puck`, `Kore`, `Zephyr`, `Fenrir`, `Charon`), studio multi-pistes **Voicebox** (`crates/voicebox-audio`, `packages/voicebox_sdk`), **Piper ONNX** (`crates/lu-voice-engine`) et fallback neuronal `edge-tts`.
- **Speech-to-Text Local & Cloud (STT)** : `faster-whisper` (`large-v3-turbo` / `base` int8) avec filtre VAD Silero (`min_silence_duration_ms=250`) et `gemini-3.5-transcribe-live`.
- **Musique, Streaming & Audio-Vidéo** : **AudioCraft** (`MusicGen`, `AudioGen`, `EnCodec` via `packages/audiocraft_bridge` & `uv`), **Google Lyria** (`lyria-3.5`, `models/lyria-realtime-exp`), **Polaris** (`crates/polaris-audio` Symphonia FLAC/Opus/MP3/WAV), **YouTube Music Desktop** (`packages/ytm_client`) et **Bun-Video / Mediabunny** (`crates/bun-video-native`, `packages/bun_media`, `packages/mediabunny`).

---

## RÈGLES GLOBALES OBLIGATOIRES — BUN (v1.4.4+ / v1.4.5)

Sources officielles de référence :
- **Release Bun v1.4.4+** : https://bun.com/blog/bun-v1.4.4
- **Documentation officielle Bun** : https://github.com/oven-sh/bun/tree/main/docs
- **Guides officiels Bun** : https://bun.com/guides

### 1. Utiliser Bun par défaut à la place de Node.js, npm, pnpm, yarn, Vite et Prettier
- **Exécution JS/TS/JSX/TSX** : Utiliser `bun <file>` ou `bun run <file>` au lieu de `node <file>` ou `ts-node <file>`.
- **Placement des flags Bun** : Toujours placer les flags de Bun immédiatement après `bun` (ex. `bun --watch run index.ts`), jamais après le nom du script.
- **Formatage de code (`bun fmt`)** : Utiliser le formateur natif ultra-rapide **`bun fmt`** (`bun run fmt` / `bun run fmt:check`) au lieu de `prettier`.
- **Vérification de types (`bun check`)** : Utiliser **`bun check`** au lieu de `tsc --noEmit`.
- **Linting (`bun lint`)** : Utiliser **`bun lint`** (`bun run lint`) au lieu d'`eslint`.
- **Tests (`bun test`)** : Utiliser **`bun test`** au lieu de `jest` ou `vitest`.
- **Gestionnaire de paquets (`bun install`)** : Utiliser `bun install`, `bun add`, `bun remove`, `bun pm` au lieu de `npm`, `yarn` ou `pnpm`.
- **Variables d'environnement** : Bun charge automatiquement `.env`. Ne jamais installer ni utiliser `dotenv`.

### 2. Utiliser les APIs Natives de Bun (`oven-sh/bun/docs` & `bun.com/guides`)
- **HTTP, Routes Fullstack & WebSockets** : Utiliser `Bun.serve()` (`routes`, `websocket`, HTML imports) au lieu d'`express` ou `fastify`.
- **SQL & SQLite** : Utiliser `Bun.SQL` (`import { sql, SQL } from "bun"`) et `bun:sqlite` (`import { Database } from "bun:sqlite"`, mode WAL) au lieu de `better-sqlite3`, `pg` ou `postgres.js`.
- **Fichiers, JSONL, Glob & Shell** : Utiliser `Bun.file()`, `Bun.write()`, `Bun.JSONL.parse()`, `Bun.Glob`, `Bun.spawn()` et `Bun.$` au lieu de `node:fs`, `readline`, `glob` et `execa`.

---

## PROJET GCP `aphrody`, SUITE GOOGLE AI 2026, UI/UX PRO MAX & EXÉCUTION PROACTIVE

- **Projet GCP Actif** : `aphrody` (`468000409790`, `us-central1`) avec impersonation `aphrody-bot@aphrody.iam.gserviceaccount.com` & `bun-google-automation@aphrody.iam.gserviceaccount.com`.
- **OAuth 2.0 Clients (`aphrody`)** : `468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com` (principal) et `468000409790-qf5cjq6vdj2v0rsdgnj5deb5kt6l9k9t.apps.googleusercontent.com` (automation).
- **CLI Unifié & Consolidation** : `bun run consolidate` (`scripts/consolidate_monorepo.ts`), `bun run super-app` (`apps/gemini_super_app/src/server.ts`), et `bun run aphrody` (`scripts/aphrody_cli.ts`).
- **Data Agent Kit (DAK)** : Configuré sur `aphrody` (`us-central1`) avec les 11 services GCP Data/Analytics activés.
- **UI/UX Pro Max (`uipro`)** : Installé globalement (`ui-ux-pro-max-cli@2.15.0`) et initialisé pour Antigravity dans `.agents/skills/`.
- **Accord d'Exécution Proactive** : Exécution autonome de bout en bout enregistrée pour les workflows de développement, d'IA et de déploiement sur `aphrody` et `aphrody-labs` (dans le respect des garde-fous de sécurité contre la perte de données irréversible).
