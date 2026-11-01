# Gemini Live Voice Hub — Modern Polyglot Monorepo

Architecture de monorepo moderne fédérant l'ensemble de l'écosystème vocal temps réel **Gemini Live 3.8 & Antigravity**.

---

## 📁 Structure du Monorepo

```
├── apps/
│   ├── gemini_voice_app/         # Application Flutter (Desktop Windows, Web, Mobile)
│   ├── gemini_voice_extension/   # Extension Chrome Manifest V3 (gemini.google.com, aistudio)
│   └── gemini_windows_patcher/   # Outil d'injection ASAR & Speak-to-Window pour Gemini.exe
├── packages/
│   ├── voice_core/               # Types TypeScript & constantes audio (Bun workspace)
│   └── voice_protocol/           # Protocoles JSON/WebSocket pour clients temps réel (Bun workspace)
├── crates/
│   ├── voice_dsp/                # Traitement du signal audio, RMS & FFT 32 bandes (Rust Cargo)
│   └── mic_bridge/               # Pont TCP haute performance pour micro ANTIGRAVITY_MIC (Rust Cargo)
├── backend/                      # Serveur Python Voice Hub (Whisper large-v3-turbo, Gemini Live, Edge-TTS)
├── tests/                        # Tests d'intégration multi-surfaces Pytest
├── scripts/                      # Outils CLI & scripts d'automatisation Antigravity
├── deploy/gcloud/                # Manifestes Google Cloud Run & Cloud Build
├── Cargo.toml                    # Workspace Rust Cargo unifié
├── package.json & bunfig.toml    # Workspace Bun 1.4.5 unifié
└── pyproject.toml                # Configuration UV & linter Ruff
```

---

## 🛠️ Outillage & Commandes

### 1. Bun Workspaces (v1.4.5)
- Installation : `bun install`
- Tests unitaires : `bun test`
- Formatage ultra-rapide : `bun fmt` / `bun fmt --check`
- Vérification TypeScript : `bun check`

### 2. Rust Cargo Crates
- Compilation : `cargo check --workspace`
- Tests : `cargo test --workspace`

### 3. Python (uv & ruff)
- Linting : `uv tool run ruff check backend tests scripts`
- Formatage : `uv tool run ruff format backend tests scripts`
- Tests : `uv run pytest`

### 4. Flutter
- Analyse : `dart analyze --fatal-infos` (dans `apps/gemini_voice_app`)
- Tests widgets : `flutter test` (dans `apps/gemini_voice_app`)

### 5. Google Cloud Deployment
- Déploiement Cloud Run : `gcloud run services replace deploy/gcloud/service.yaml --project=aphrody --region=europe-west1`
