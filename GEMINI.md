# Gemini Live Voice Hub — Antigravity Multi-Surface Architecture

Ce workspace contient l'intégration vocale temps réel de bout en bout connectant :
1. **Application Flutter (`gemini_voice_app/`)** — Desktop Windows, Web & Mobile avec **SVG officiel Gemini animé en permanence** (`AnimatedGeminiSvgOrb`), spectre radial FFT 32 bandes et mode Mini-Orbe d'arrière-plan.
2. **Antigravity CLI (`agy`)** — Commandes `/voice`, `/record`, raccourci `F5`, flux audio TCP `ANTIGRAVITY_MIC=127.0.0.1:24713` (`32 kB/s` PCM 16 kHz mono) et pont `agentapi` (`agy.exe agentapi`).
3. **Antigravity Desktop App (`Antigravity.exe`)** — Sidecar persistant `gemini-live-voice` (`~/.gemini/config/sidecars/gemini-live-voice/sidecar.json`), hook `SessionStart` (`.agents/hooks.json`), skill `/voice-live` (`.agents/skills/voice-live/SKILL.md`), et pont `language_server.exe agentapi`.
4. **Gemini Web App & Antigravity Web (`extensions/gemini_voice_extension/`)** — Extension Chrome Manifest V3 injectant l'orbe SVG officiel Gemini animé et rendant les boutons `/voice` & `Record` interactifs sur `gemini.google.com`, `aistudio.google.com` et `antigravity.google.com`.
5. **Gemini Windows App (`C:\Users\aphro\AppData\Local\Google\Gemini\app-1.17.0\Gemini.exe`)** — Exécutable natif patché dans `resources/app.asar` (`voice_bridge_native.js`, `top_bar.html`, `stc_pill.html`, `preload.js`) synchronisé en temps réel avec le Voice Hub.

## Modèles & Moteurs Audio Configurés

- **Speech-to-Speech Temps Réel** : `gemini-3.8-live` & `gemini-3.8-live-extended-thinking` (WebSocket bidirectionnel, VAD Hybride `audio_stream_end`, dialogue affectif, audio proactif, barge-in poli).
- **Raisonnement Profond** : `gemini-4-argon` via l'API `client.interactions.create` et `agy` CLI.
- **Synthèse Vocale Contrôlable (TTS)** : `gemini-3.8-flash-tts` & `gemini-3.8-flash-lite-tts` (`speech_metadata.style` + balises vocales inline `<short pause>`, `<breath>`, voix HD `Aoede`, `Puck`, `Kore`, `Zephyr`, `Fenrir`, `Charon`) + fallback neuronal `edge-tts` (`fr-FR-VivienneMultilingualNeural`).
- **Speech-to-Text Local Ultra-Rapide (STT)** : `faster-whisper` (`large-v3-turbo` / `base` int8) avec filtre VAD Silero (`min_silence_duration_ms=250`) et `gemini-3.5-transcribe-live`.

---

## RÈGLES GLOBALES OBLIGATOIRES — BUN (v1.4.4+ / v1.4.5)

Sources officielles de référence :
- **Release Bun v1.4.4+** : https://bun.com/blog/bun-v1.4.4
- **Documentation officielle Bun** : https://github.com/oven-sh/bun/tree/main/docs
- **Guides officiels Bun** : https://bun.com/guides

### 1. Utiliser Bun par défaut à la place de Node.js, npm, pnpm, yarn, Vite et Prettier
- **Exécution JS/TS/JSX/TSX** : Utiliser `bun <file>` ou `bun run <file>` au lieu de `node <file>` ou `ts-node <file>`.
- **Placement des flags Bun** : Toujours placer les flags de Bun immédiatement après `bun` (ex. `bun --watch run index.ts`), jamais après le nom du script.
- **Formatage de code (`bun fmt` — nouveauté Bun v1.4.4)** : Utiliser le formateur natif ultra-rapide **`bun fmt`** (compatible Prettier / `oxfmt`) au lieu de `prettier` ou `oxfmt`.
- **Vérification de types (`bun check` — optimisé 7.8x dans Bun v1.4.4)** : Utiliser **`bun check`** au lieu de `tsc --noEmit`.
- **Tests (`bun test`)** : Utiliser **`bun test`** (et `bun test --watch`) au lieu de `jest` ou `vitest`.
- **Gestionnaire de paquets (`bun install`)** : Utiliser `bun install` (`bun install --frozen-lockfile` en CI), `bun pm fetch`, `bun publish --recursive`, et `trustedDependencies` au lieu de `npm`, `yarn` ou `pnpm`.
- **Exécution de scripts & binaires** : Utiliser `bun run <script>` et `bunx <package> <command>` au lieu de `npm run` / `npx`.
- **Bundler (`bun build`)** : Utiliser `bun build <file.html|file.ts|file.css>` (ou `Bun.build()`) au lieu de `webpack`, `esbuild` ou `vite`.
- **Variables d'environnement** : Bun charge automatiquement `.env`. Ne jamais installer ni utiliser `dotenv`.

### 2. Utiliser les APIs Natives de Bun (`oven-sh/bun/docs` & `bun.com/guides`)
- **HTTP, Routes Fullstack & WebSockets** : Utiliser `Bun.serve()` (`routes`, `websocket` avec `ws.pause()` / `ws.resume()`, HTML imports, HMR) au lieu d'`express` ou `fastify`.
- **SQL & SQLite** : Utiliser `Bun.SQL` (`import { sql, SQL } from "bun"`, `query.cancel()`, `COPY` streams) et `bun:sqlite` (`import { Database } from "bun:sqlite"`, UDFs, update hooks) au lieu de `better-sqlite3`, `pg` ou `postgres.js`.
- **Redis** : Utiliser `Bun.redis` au lieu de `ioredis`.
- **Fichiers, Glob & Shell** : Utiliser `Bun.file()`, `Bun.write()`, `Bun.Glob` (avec `extglob` & `brace ranges`), et `Bun.$` (`import { $ } from "bun"`) au lieu de `node:fs`, `glob` et `execa`.


---

## PROJET GCP `aphrody`, SUITE GOOGLE AI 2026, UI/UX PRO MAX & EXÉCUTION PROACTIVE

- **Projet GCP Actif** : `aphrody` (`468000409790`, `us-central1`) avec impersonation `aphrody-bot@aphrody.iam.gserviceaccount.com` & `bun-google-automation@aphrody.iam.gserviceaccount.com`.
- **OAuth 2.0 Clients (`aphrody`)** : `468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com` (principal) et `468000409790-qf5cjq6vdj2v0rsdgnj5deb5kt6l9k9t.apps.googleusercontent.com` (automation).
- **CLI Unifié Google AI** : `bun run aphrody <status|token|oauth-url|search|research|tts|stt|ml|embed|youtube|lyria|flow>` (`scripts/aphrody_cli.ts` & `packages/google_ai_suite/src/index.ts`).
- **Data Agent Kit (DAK)** : Configuré sur `aphrody` (`us-central1`) avec les 11 services GCP Data/Analytics activés.
- **UI/UX Pro Max (`uipro`)** : Installé globalement (`ui-ux-pro-max-cli@2.15.0`) et initialisé pour Antigravity dans `.agents/skills/` (`ui-ux-pro-max`, `design-system`, `ui-styling`, `design`, `brand`, `banner-design`, `slides`).
- **Accord d'Exécution Proactive** : Exécution autonome de bout en bout enregistrée pour les workflows de développement, d'IA et de déploiement sur `aphrody` (dans le respect des garde-fous de sécurité contre la perte de données irréversible).
