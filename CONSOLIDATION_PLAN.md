# Plan de Consolidation Monorepo — Gemini Live Voice, Audio & Google Super App (Novembre 2026)

Ce document décrit l'architecture complète et le plan d'exécution pour consolider les **9 sous-modules Git (`vendor/*`)** ainsi que les composants existants du workspace en un monorepo unifié **Rust (`crates/`) + Bun v1.4.5 (`packages/`) + Python `uv` (`backend/`) + Applications (`apps/`)**, centré sur **la Voix, l'Audio, la Musique et l'Écosystème Google Gemini (`gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-4-argon`, `gemini-3.8-flash-tts`)** au sein d'une **Grande Super Application Gemini (`apps/gemini_super_app`)**.

---

## 1. Inventaire des 9 Sous-Modules Git (`vendor/`)

| Sous-Module | URL d'Origine | Rôle Audio / Voix / Écosystème Gemini | Destination Consolidée |
| :--- | :--- | :--- | :--- |
| `vendor/voicebox` | `https://github.com/aphrody-dev/voicebox` | Studio de clonage vocal multi-pistes, capture `cpal`, lecture multi-périphériques `symphonia`/`hound`, SSE speak monitor, Qwen3-TTS / Kokoro / Gemini TTS | `crates/voicebox-audio`, `packages/voicebox_sdk`, `apps/gemini_super_app` |
| `vendor/locally-uncensored` | `https://github.com/aphrody-dev/locally-uncensored` | Boucle vocale locale (`voice_loop`), superviseur Whisper STT, synthèse vocale Piper ONNX, génération musicale ACE-Step 1.5 | `crates/lu-voice-engine`, `backend/super_app_hub.py`, `apps/gemini_super_app` |
| `vendor/jan` | `https://github.com/aphrody-dev/jan` | Agent Development Kit (ADK TypeScript & Python), détection matérielle/GPU, plugins RAG/Vector-DB et orchestration d'agents vocaux | `crates/jan-agent-audio`, `packages/jan_adk`, `apps/gemini_super_app` |
| `vendor/ytmdesktop` | `https://github.com/ytmdesktop/ytmdesktop` | Client compagnon YouTube Music Desktop, télémétrie de lecture en temps réel, contrôle média WebSocket et intégration Google Music | `packages/ytm_client`, `apps/gemini_super_app` |
| `vendor/awesome-rust` | `https://github.com/rust-unofficial/awesome-rust#audio-and-music` | Catalogue de référence Rust `#audio-and-music` et `#google-gemini` avec parseur et vérificateur de crates audio | `crates/awesome-rust-audio`, `apps/gemini_super_app` |
| `vendor/flowcat` | `https://github.com/aphrody-labs/flowcat` | Runtime temps réel S2S (`GeminiLiveClient`), WebRTC (`str0m` + Opus), SIP/RTP/SDP, VAD, Google STT/TTS gRPC, graphe d'agent `AgentBrain` | `crates/flowcat-core`, `crates/flowcat-services`, `crates/flowcat-transports`, `crates/flowcat-telephony`, `crates/flowcat-agent`, `crates/flowcat-server`, `crates/flowcat-cli` |
| `vendor/polaris` | `https://github.com/aphrody-labs/polaris` | Indexation et streaming musical haute fidélité (FLAC, MP3, Opus, MP4, Vorbis, WAV) propulsé par `symphonia` | `crates/polaris-audio`, `apps/gemini_super_app` |
| `vendor/audiocraft` | `https://github.com/aphrody-dev/audiocraft` | Génération musicale et sonore profonde (MusicGen, AudioGen, EnCodec, JASCO) orchestrée via `uv` et couplée à Gemini Lyria / Live | `packages/audiocraft_bridge`, `backend/super_app_hub.py`, `apps/gemini_super_app` |
| `vendor/bun-video` | `https://github.com/aphrody-labs/bun-video/tree/main` | Moteur natif Rust + Bun de décodage/encodage audio-vidéo (RGBA, FFV1, PCM, HLS/DASH, Mediabunny) sans dépendances Node.js | `crates/bun-video-native`, `packages/bun_media`, `packages/mediabunny`, `apps/gemini_super_app` |

---

## 2. Consolidation Rust vers `crates/` (Cargo Workspace Édition 2024)

Tous les crates Rust résident dans le dossier racine `crates/` et partagent un `Cargo.toml` workspace unifié :

1. **`crates/voice_dsp`** : Analyseur spectral FFT 32 bandes, calcul RMS PCM 16-bit 16 kHz / 24 kHz et détection d'activité vocale (VAD) temps réel pour l'orbe SVG Gemini.
2. **`crates/mic_bridge`** : Serveur et client TCP PCM16 (`ANTIGRAVITY_MIC=127.0.0.1:24713`, `32 kB/s`) reliant `agy`, `Antigravity.exe` et `Gemini.exe`.
3. **`crates/flowcat-core`** : Cœur S2S temps réel incluant `GeminiLiveClient` (`gemini-3.8-live`), codecs audio (`G.711`, rééchantillonnage `rubato`), SIP UA, RTP/SDP, VAD et pipeline `FrameProcessor`.
4. **`crates/flowcat-services`** : Connecteurs IA et vocaux (Google Gemini LLM/Vertex, Google Cloud STT/TTS gRPC, Whisper local, Cartesia, ElevenLabs, OpenTelemetry).
5. **`crates/flowcat-transports`** : Transports temps réel WebRTC (`str0m` + Opus), WebSocket bidirectionnel et E/S audio locales (`cpal`).
6. **`crates/flowcat-telephony`** : Sérialiseurs WebSocket téléphonie et détection DTMF Goertzel / RFC 2833.
7. **`crates/flowcat-agent`** : Moteur d'agent conversationnel déclaratif (`AgentBrain`) avec transitions d'états et appels d'outils.
8. **`crates/flowcat-server`** : Serveur HTTP / WebSocket / WebRTC `axum` 0.8 pour agents vocaux Gemini Live.
9. **`crates/flowcat-cli`** : Outil CLI de test audio local et boucle WebSocket Gemini Live.
10. **`crates/bun-video-native`** : Moteur natif Rust de traitement flux audio/vidéo (RGBA, PNG, FFV1, extraction PCM, probing FFprobe) interfacé avec Bun.
11. **`crates/polaris-audio`** : Moteur d'indexation de bibliothèque musicale, extraction de métadonnées audio (`symphonia`) et décodage sans perte (FLAC/Opus/MP3/WAV).
12. **`crates/voicebox-audio`** : Capture audio multi-plateforme (`cpal`), lecture multi-périphériques, mixage de pistes vocales WAV et moniteur d'état SSE pour le clonage vocal.
13. **`crates/lu-voice-engine`** : Superviseur Rust pour la boucle vocale locale (`uv run`), serveur Whisper STT, synthèse Piper ONNX et génération musicale ACE-Step.
14. **`crates/jan-agent-audio`** : Utilitaires d'agents locaux/cloud, inspection matérielle audio/GPU et registre d'outils MCP/RAG pour Gemini Live.
15. **`crates/awesome-rust-audio`** : Parseur et registre indexé des crates Rust `#audio-and-music` et `#google-gemini` issu de `vendor/awesome-rust`.
16. **`crates/gemini-super-tauri`** : Hôte natif **Tauri v3 Alpha (`tauri = "3.0.0-alpha.5"`)** fédérant tous les crates audio/voix pour la **Gemini Super App**.

---

## 3. Consolidation Bun & TypeScript vers `packages/` (Bun v1.4.5 Native APIs)

Tous les packages TypeScript résident dans `packages/` et utilisent exclusivement les APIs natives de **Bun v1.4.5** (`Bun.serve`, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.$`, `bun:sqlite`, `Bun.Glob`) :

1. **`packages/voice_core` (`@gemini-live/voice-core`)** : Constantes audio (16 kHz / 24 kHz, FFT 32 bandes), identifiants des modèles Google (`gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-4-argon`, `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.5-transcribe-live`) et configuration des surfaces.
2. **`packages/voice_protocol` (`@gemini-live/voice-protocol`)** : Schémas et constructeurs de trames WebSocket bidirectionnelles Gemini Live Hub.
3. **`packages/mediabunny` (`@gemini-live/mediabunny`)** : Pipeline de lecture/écriture/conversion multimédia consolidé depuis `vendor/bun-video/mediabunny`, migré de `node-av`/`node:fs` vers `Bun.file`, `Bun.write` et `Bun.spawn`.
4. **`packages/bun_media` (`@gemini-live/bun-media`)** : SDK média haut niveau consolidé depuis `vendor/bun-video/src` (probing, extraction PCM 16 kHz pour Gemini Live, génération de spectres, téléchargement audio YouTube via `Bun.spawn`).
5. **`packages/ytm_client` (`@gemini-live/ytm-client`)** : Client compagnon YouTube Music Desktop consolidé depuis `vendor/ytmdesktop`, migré d'Electron/Node vers `Bun.serve` et WebSocket natif avec DJ vocal Gemini Live.
6. **`packages/jan_adk` (`@gemini-live/jan-adk`)** : Agent Development Kit consolidé depuis `vendor/jan/packages/adk` et `vendor/jan/core`, utilisant `Bun.spawn` et `Bun.JSONL` pour piloter les agents et outils vocaux Gemini.
7. **`packages/voicebox_sdk` (`@gemini-live/voicebox-sdk`)** : SDK TypeScript consolidé depuis `vendor/voicebox/app` & `web` (gestion des profils de clonage vocal, timeline multi-pistes, synthèse `gemini-3.8-flash-tts` et IPC Tauri v3 alpha).
8. **`packages/audiocraft_bridge` (`@gemini-live/audiocraft-bridge`)** : Pont TypeScript/Bun pilotant AudioCraft (`MusicGen`, `AudioGen`, `EnCodec`) via `uv run` ainsi que la génération musicale Google Lyria / Gemini Live.

---

## 4. Consolidation des Applications vers `apps/` et "One Big Gemini Super App"

Toutes les applications finales sont regroupées dans `apps/` :

1. **`apps/gemini_super_app` (`@gemini-live/super-app`)** — **La Grande Super Application Gemini** :
   - **Serveur Fullstack Bun v1.4.5 (`src/server.ts`)** : `Bun.serve()` unifiant le Hub WebSocket Gemini Live 3.8, l'API REST de tous les moteurs consolidés (`flowcat`, `voicebox`, `audiocraft`, `polaris`, `ytm`, `bun-media`, `jan-adk`, `awesome-rust-audio`) et l'interface Web réactive.
   - **Interface Unifiée (`src/index.html` & `src/app.ts`)** :
     - **Orbe SVG Officiel Gemini Animé en Permanence** avec spectre radial FFT 32 bandes (`voice_dsp`).
     - **Studio Gemini Live 3.8 & Extended Thinking (`gemini-4-argon`)** : Dialogue affectif, barge-in poli, VAD hybride `audio_stream_end`.
     - **Flowcat WebRTC / SIP Agent Studio** : Orchestration d'agents vocaux temps réel et téléphonie SIP.
     - **Voicebox Voice Cloning & Multi-Track Studio** : Clonage vocal, synthèse `gemini-3.8-flash-tts` (`Aoede`, `Puck`, `Kore`, `Zephyr`, `Fenrir`, `Charon`) et éditeur temporel.
     - **AudioCraft & ACE-Step Music Lab** : Génération Text-to-Music (`MusicGen`), effets sonores (`AudioGen`) et compression neuronale (`EnCodec`).
     - **Polaris & YouTube Music Hub** : Streaming musical local FLAC/MP3 (`polaris-audio`) + contrôle en direct de YouTube Music (`ytm_client`).
     - **Bun-Video & Mediabunny Audio/Video Engine** : Extraction audio, transcodage et analyse spectrale.
     - **Jan ADK & Awesome-Rust Audio Explorer** : Agents MCP/RAG et explorateur interactif des crates audio Rust.
   - **Configuration Tauri v3 Alpha (`tauri.conf.json`)** : Intégration native avec `crates/gemini-super-tauri` (`tauri = "3.0.0-alpha.5"`).
2. **`apps/gemini_voice_app`** : Application Flutter multi-plateforme (Windows Desktop, Web, Mobile) connectée au Hub de la Super App.
3. **`apps/gemini_voice_extension`** : Extension Chrome Manifest V3 injectant l'orbe SVG Gemini sur `gemini.google.com`, `aistudio.google.com`, `antigravity.google.com` et `music.youtube.com`.
4. **`apps/gemini_windows_patcher`** : Patcher natif ASAR et pont Speak-to-Window pour `Gemini.exe`.

---

## 5. Matrices de Migration Technologique (Novembre 2026)

### A. Tauri v2 $\rightarrow$ Tauri v3 Alpha
| Composant | Ancienne Version (Tauri v2) | Version Consolidée (Novembre 2026 — Tauri v3 Alpha) |
| :--- | :--- | :--- |
| Crate `tauri` | `2.8.x` / `2.9.x` | `3.0.0-alpha.5` |
| Crate `tauri-build` | `2.4.x` / `2.5.x` | `3.0.0-alpha.4` |
| Crate `tauri-plugin` | `2.4.x` / `2.5.x` | `3.0.0-alpha.4` |
| Crates `tauri-plugin-shell`, `fs`, `process`, `http`, `log`, `os`, `store`, `opener`, `updater`, `deep-link`, `single-instance`, `global-shortcut` | `2.x` | `3.0.0-alpha.3` |
| Crate `tauri-plugin-dialog` | `2.x` | `3.0.0-alpha.4` |
| NPM `@tauri-apps/api` | `^2.8.0` | `^3.0.0-alpha.3` |
| NPM `@tauri-apps/cli` | `^2.8.0` | `^3.0.0-alpha.5` |
| NPM `@tauri-apps/plugin-dialog` | `^2.4.0` | `^3.0.0-alpha.4` |
| NPM `@tauri-apps/plugin-*` (`shell`, `fs`, `http`, `log`, `os`, `process`, `store`, `opener`, `updater`, `deep-link`) | `^2.x` | `^3.0.0-alpha.3` |

### B. Node-API / Node.js $\rightarrow$ APIs Natives Bun v1.4.5
| Usage Historique (Node.js / npm) | Remplacement Natif Bun v1.4.5 |
| :--- | :--- |
| `node:fs` / `fs/promises` (`readFile`, `writeFile`, `existsSync`) | `Bun.file(path).text()`, `.json()`, `.bytes()`, `.exists()`, `await Bun.write(dest, data)` |
| `node:child_process` (`spawn`, `execFile`) / `execa` | `Bun.spawn()` / `Bun.spawnSync()` / `Bun.$` (`import { $ } from "bun"`) |
| `express` / `fastify` / `ws` | `Bun.serve({ routes, fetch, websocket })` |
| `better-sqlite3` / `sqlite3` | `import { Database } from "bun:sqlite"` (mode WAL) |
| `node-av` (bindings C++ FFmpeg Node-API) | `crates/bun-video-native` + `Bun.spawn(["ffmpeg", ...])` + `Bun.file()` |
| `glob` / `fast-glob` / `rimraf` | `new Bun.Glob(pattern)` / `Bun.$` |
| `dotenv` | Chargement automatique `.env` intégré à Bun |
| `tsc --noEmit`, `prettier`, `eslint`, `vitest`/`jest` | `bun check`, `bun fmt`, `bun lint`, `bun test` |

### C. Python `pip` / `venv` / `conda` $\rightarrow$ `uv` (v0.13.6+)
- **Manifeste unique** : `pyproject.toml` à la racine géré par `uv` (`uv sync`, `uv run`, `uv lock`).
- **Exécution unifiée** : Toutes les commandes Python (serveur `voice_bridge_server.py`, moteur `audiocraft`, boucle vocale `locally-uncensored`, backend `voicebox`, tests `pytest` et lint `ruff`) passent exclusivement par `uv run` / `uv tool run`.

### D. Versions des Dépendances Novembre 2026
- **Rust (`Cargo.toml`)** : `edition = "2024"`, `tokio = "1.54.1"`, `serde = "1.0.229"`, `serde_json = "1.0.154"`, `anyhow = "1.0.104"`, `thiserror = "2.0.21"`, `axum = "0.8.9"`, `tokio-tungstenite = "0.30.0"`, `cpal = "0.18.2"`, `symphonia = "0.6.1"`, `hound = "3.5.1"`, `tracing = "0.1.44"`, `tracing-subscriber = "0.3.23"`, `clap = "4.6.7"`, `base64 = "0.23.1"`.
- **Bun / TypeScript (`package.json`)** : `bun@1.4.5`, `@google/genai@^2.32.0`, `google-auth-library@^11.3.2`, `typescript@^7.0.2`, `@types/node@^26.6.6`, `@types/chrome@^0.3.7`, `react@^19.3.1`, `react-dom@^19.3.1`, `tailwindcss@^4.3.3`, `zod@^4.6.7`, `zustand@^5.0.16`, `lucide-react@^1.66.0`, `wavesurfer.js@^8.0.4`, `hono@^4.13.16`.
- **Python (`pyproject.toml` via `uv`)** : `google-genai>=2.34.0`, `google-api-python-client>=2.201.0`, `google-auth>=2.62.0`, `aiohttp>=3.14.5`, `faster-whisper>=1.2.1`, `edge-tts>=7.3.1`, `numpy>=2.5.4`, `sounddevice>=0.5.6`, `websockets>=17.4`, `pydantic>=2.14.2`, `av>=19.0.2`, `onnxruntime>=1.31.1`, `huggingface-hub>=2.4.0`, `tokenizers>=0.23.3`, `pytest>=9.2.0`, `pytest-asyncio>=1.4.1`, `ruff>=0.9.0`.

---

## 6. Script d'Exécution Automatisé (`scripts/consolidate_monorepo.ts`)

Le script `bun run scripts/consolidate_monorepo.ts` exécute de manière idempotente :
1. La vérification des 9 sous-modules dans `vendor/`.
2. La synchronisation et l'adaptation des crates Rust dans `crates/*` (incluant `flowcat-*` et `bun-video-native`) et la mise à jour des dépendances workspace Novembre 2026 + Tauri v3 Alpha.
3. La génération et la vérification des packages Bun dans `packages/*` sans aucun appel Node-API déprécié.
4. La mise à jour des manifestes Tauri v3 Alpha et `uv` dans les sous-projets et à la racine.
5. La génération d'un rapport de consolidation JSON et Markdown vérifiable par les tests automatisés.
