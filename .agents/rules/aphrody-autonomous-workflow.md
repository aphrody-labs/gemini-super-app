# Règle Permanente — Projet GCP `aphrody`, Suite Google AI 2026, UI/UX Pro Max & Exécution Proactive

## 1. Préférence d'Exécution Proactive (Accord Utilisateur Enregistré)
- L'utilisateur a accordé son autorisation explicite pour exécuter de bout en bout les tâches d'ingénierie, de build, de test, de formatage (`bun fmt`, `ruff`), de synchronisation d'identifiants `aphrody` (`bun run setup:aphrody`) et d'utilisation des APIs Google Cloud / Google AI du projet `aphrody` sans interrompre le flux pour des confirmations intermédiaires non destructrices.
- Les garde-fous de sécurité critiques (interdiction de suppression irréversible de données sans confirmation et respect strict des contrôles d'accès/sandbox) restent toujours actifs.

## 2. Architecture Google Cloud `aphrody` (`468000409790`)
- **Projet par défaut** : `aphrody` (`projectNumber: 468000409790`, région `us-central1`).
- **Service Accounts (via Impersonation ADC/IAM)** :
  - Principal : `aphrody-bot@aphrody.iam.gserviceaccount.com`
  - Automation Bun : `bun-google-automation@aphrody.iam.gserviceaccount.com`
  - Firebase : `firebase-adminsdk-fbsvc@aphrody.iam.gserviceaccount.com`
- **OAuth 2.0 Clients (Secret Manager `aphrody`)** :
  - Principal (`GOOGLE_CLIENT_ID`) : `468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com`
  - Automation (`AUTO_GOOGLE_CLIENT_ID`) : `468000409790-qf5cjq6vdj2v0rsdgnj5deb5kt6l9k9t.apps.googleusercontent.com`
  - Redirect URI local : `http://127.0.0.1:8765/oauth2callback`
- **APIs Activées sur `aphrody`** : `generativelanguage.googleapis.com`, `youtube.googleapis.com`, `speech.googleapis.com`, `texttospeech.googleapis.com`, `aiplatform.googleapis.com`, `secretmanager.googleapis.com`, `discoveryengine.googleapis.com`, `customsearch.googleapis.com`, `translate.googleapis.com`, `videointelligence.googleapis.com`, `vision.googleapis.com`.
- **Data Agent Kit (DAK)** : Configuré sur `aphrody` (`us-central1`) avec les 11 services (`BigQuery`, `Knowledge Catalog`, `AlloyDB`, `Cloud SQL`, `Spanner`, `Bigtable`, `Firestore`, `Cloud Storage`, `Apache Spark`, `Apache Airflow`, `Dataflow`).

## 3. Suite Google AI 2026 (`@gemini-live/google-ai-suite` & `bun run aphrody`)
- **Search & Deep Research** : `gemini-3.8-flash` (`google_search`, `url_context`, `google_maps`) & `deep-research-preview-04-2026` / `deep-research-max-preview-04-2026`.
- **Voice & STS (Speech-to-Speech)** : `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.5-live-translate-preview`.
- **TTS, Voice Design & Replication** : `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` (`speech_metadata.style`, voix `Aoede`, `Kore`, `Puck`) + `edge-tts`.
- **STT (Speech-to-Text)** : `gemini-3.5-transcribe`, `gemini-3.5-transcribe-live` (Hybrid VAD `audioStreamEnd`) & `faster-whisper` (`large-v3-turbo`).
- **ML, Reasoning, Embeddings & Agents** : `gemini-4-argon`, `gemini-embedding-2` (3072 dims multimodal), `gemini-nano-banana-2.1`, `antigravity-preview-09-2026`.
- **YouTube** : YouTube Data API v3 (`achillea-youtube` / OAuth) + compréhension vidéo multimodale directe d'URL YouTube via `gemini-3.8-flash`.
- **Lyria Music** : `lyria-3.5`, `lyria-3-clip-preview` & `models/lyria-realtime-exp` (48 kHz PCM16 stéréo).
- **Flow Video** : `gemini-omni-1.1-flash` (`<FIRST_FRAME>`, `<LAST_FRAME>`, extensions 40s, `360p`–`4k`).

## 4. UI/UX Pro Max (`uipro`)
- CLI global installé via `bun add -g ui-ux-pro-max-cli` (`uipro` v2.15.0) et initialisé avec `uipro init --ai antigravity` dans `.agents/skills/` (`ui-ux-pro-max`, `design-system`, `ui-styling`, `design`, `brand`, `banner-design`, `slides`).
