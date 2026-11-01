# Gemini Live Voice, Audio, Music & Google Super App — Unified Monorepo (Novembre 2026)

Dépôt officiel GitHub (`aphrody-labs`) : **`https://github.com/aphrody-labs/gemini-super-app`**

Monorepo polyglotte unifié (**Rust Edition 2024 + Bun v1.4.5 + Tauri v3 Alpha `3.0.0-alpha.5` + Python `uv` + Flutter**) consolidant les **9 sous-modules Git (`vendor/*`)** en une **Grande Super Application Gemini (`apps/gemini_super_app`)** dédiée à la voix temps réel (`gemini-3.8-live`, `gemini-3.8-live-extended-thinking`), au raisonnement profond (`gemini-4-argon`), au clonage vocal (`gemini-3.8-flash-tts`, Voicebox), à la génération musicale (AudioCraft, Lyria, ACE-Step 1.5), au streaming lossless (Polaris, YouTube Music) et au traitement audio-vidéo natif (Bun-Video / Mediabunny).

---

## 📁 Architecture Consolidée du Monorepo

```text
├── apps/
│   ├── gemini_super_app/         # ONE BIG GEMINI SUPER APP (Bun.serve Fullstack + Tauri v3.0.0-alpha.5 + SQLite WAL)
│   ├── gemini_voice_app/         # Application Flutter (Desktop Windows, Web, Mobile — AnimatedGeminiSvgOrb)
│   ├── gemini_voice_extension/   # Extension Chrome Manifest V3 (gemini.google.com, aistudio, music.youtube.com)
│   └── gemini_windows_patcher/   # Injection ASAR & Speak-to-Window pour Gemini.exe
├── crates/                       # Workspace Rust Cargo Unifié (16 Crates — Édition 2024)
│   ├── voice_dsp/                # Analyse spectrale FFT 32 bandes & RMS PCM16 temps réel
│   ├── mic_bridge/               # Pont TCP PCM16 16 kHz (ANTIGRAVITY_MIC=127.0.0.1:24713)
│   ├── flowcat-core/             # Client Rust natif GeminiLive BidiGenerateContent, SIP UA, RTP/SDP, VAD
│   ├── flowcat-services/         # Connecteurs STT/TTS/LLM (Google gRPC, Vertex, Whisper, Cartesia, ElevenLabs)
│   ├── flowcat-transports/       # Transports temps réel WebRTC (str0m + Opus) & WebSocket
│   ├── flowcat-telephony/        # Sérialiseurs téléphonie & détection DTMF Goertzel / RFC 2833
│   ├── flowcat-agent/            # Moteur d'agent conversationnel déclaratif (AgentBrain)
│   ├── flowcat-server/           # Serveur HTTP/WS/WebRTC Axum 0.8 pour agents vocaux Gemini Live
│   ├── flowcat-cli/              # Outil CLI de test audio local & boucle WebSocket
│   ├── bun-video-native/         # Moteur natif Rust RGBA/PNG/FFV1 & probing média (depuis vendor/bun-video)
│   ├── polaris-audio/            # Indexation musicale Symphonia (FLAC, MP3, Opus, Vorbis, WAV, MP4)
│   ├── voicebox-audio/           # Capture/lecture audio, rééchantillonnage, mixage WAV & profils Voicebox
│   ├── lu-voice-engine/          # Superviseur Rust uv pour Voice Loop, Whisper STT, Piper TTS & ACE-Step 1.5
│   ├── jan-agent-audio/          # Capacités matérielles ADK & functionDeclarations Gemini Live
│   ├── awesome-rust-audio/       # Parseur & registre indexé #audio-and-music et #google-gemini
│   └── gemini-super-tauri/       # Hôte natif Tauri v3 Alpha (tauri = "3.0.0-alpha.5") fédérant les 16 crates
├── packages/                     # Workspaces Bun v1.4.5 Unifiés (9 Packages — 100% APIs Natives Bun)
│   ├── voice_core/               # Constantes audio (16/24 kHz, FFT 32) & modèles Gemini 3.8 / 4 Argon
│   ├── voice_protocol/           # Trames WebSocket temps réel & commandes du Hub
│   ├── google_ai_suite/          # Suite Google AI 2026 & OAuth/ADC projet GCP aphrody
│   ├── mediabunny/               # Conteneurs WAV/FLAC/Opus & pipeline FFmpeg via Bun.spawn / Bun.file
│   ├── bun_media/                # Analyse temporelle PCM16, détection BPM & pont bun-video-native
│   ├── ytm_client/               # Client compagnon YouTube Music Desktop & intros DJ Gemini 3.8 Flash TTS
│   ├── jan_adk/                  # Agent Development Kit JSON-RPC 2.0 propulsé par Bun.JSONL.parse()
│   ├── voicebox_sdk/             # SDK Studio multi-pistes, clonage vocal & Tauri v3 Alpha (@tauri-apps/api)
│   └── audiocraft_bridge/        # Pont AudioCraft (MusicGen, AudioGen, EnCodec) via uv run + synthèse WAV
├── vendor/                       # 9 Sous-Modules Git Clonés (.gitmodules)
│   ├── voicebox/                 # https://github.com/aphrody-dev/voicebox
│   ├── locally-uncensored/       # https://github.com/aphrody-dev/locally-uncensored
│   ├── jan/                      # https://github.com/aphrody-dev/jan
│   ├── ytmdesktop/               # https://github.com/ytmdesktop/ytmdesktop
│   ├── awesome-rust/             # https://github.com/rust-unofficial/awesome-rust#audio-and-music
│   ├── flowcat/                  # https://github.com/aphrody-labs/flowcat
│   ├── polaris/                  # https://github.com/aphrody-labs/polaris
│   ├── audiocraft/               # https://github.com/aphrody-dev/audiocraft
│   └── bun-video/                # https://github.com/aphrody-labs/bun-video/tree/main
├── backend/                      # Serveurs Python gérés par uv (voice_bridge_server.py, super_app_hub.py)
├── scripts/                      # Script de consolidation (consolidate_monorepo.ts) & CLI aphrody
├── CONSOLIDATION_PLAN.md         # Plan d'architecture et matrices de migration Novembre 2026
└── CONSOLIDATION_REPORT.json     # Rapport généré automatiquement par bun run consolidate
```

---

## 🧪 Tests Réels sur l'API Google Gemini (`gemini-3.8-live`, `gemini-4-argon`, `gemini-3.8-flash-tts`)

Les 3 stacks (Rust, Bun v1.4.5, Python `uv`) exécutent des tests d'intégration réels contre les serveurs Google Gemini :
- **Bun (`apps/gemini_super_app/src/super_app.test.ts`)** :
  - `POST /api/gemini/reason` $\rightarrow$ appel réel à `gemini-4-argon` (`ARGON_LIVE_OK`).
  - `POST /api/gemini/tts` $\rightarrow$ synthèse vocale réelle `gemini-3.8-flash-tts` avec la voix HD `Aoede` (`audio/wav`).
  - `POST /api/gemini/live-turn` $\rightarrow$ session WebSocket bidirectionnelle réelle `gemini-3.8-live` avec réception de chunks audio PCM 24 kHz (`turnDone: true`).
- **Rust (`crates/gemini-super-tauri/src/lib.rs`)** :
  - `test_real_rust_flowcat_gemini_live_connect` $\rightarrow$ handshake WebSocket `BidiGenerateContent` réel via `flowcat_core::GeminiLive` sur `models/gemini-3.8-live`.
- **Python `uv` (`tests/test_super_app_hub.py`)** :
  - `test_real_gemini_api_python_uv` $\rightarrow$ génération réelle `gemini-3.8-flash` (`PYTHON_GEMINI_38_OK`) + synthèse audio réelle `gemini-3.8-flash-tts` (`Aoede`) via `google-genai`.

---

## 🛠️ Commandes Unifiées (Bun v1.4.5, Cargo, `uv`)

```bash
# 1. Exécuter le script de consolidation du monorepo
bun run consolidate

# 2. Démarrer la Grande Super Application Gemini (Port 8787)
bun run super-app

# 3. Qualité & Tests Bun v1.4.5 (inclut les appels Gemini réels)
bun run fmt:check
bun run lint
bun check
bun test

# 4. Compilation & Tests Rust Workspace (16 Crates + test GeminiLive WSS réel)
cargo check --workspace
cargo test -p gemini-super-tauri

# 5. Qualité & Tests Python via uv (inclut les appels Gemini réels)
uv tool run ruff check backend/super_app_hub.py tests/test_super_app_hub.py
uv run pytest tests/test_super_app_hub.py
```
