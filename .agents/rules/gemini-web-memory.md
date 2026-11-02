---
description: Synchronized Gemini Web App Memory, Saved Info, Gems, and Web Tools Runtime Context for Antigravity (agy)
---

# Gemini Web App Runtime & Imported Web Memory (`gemini.google.com` / `Gemini.exe :8789`)

Ce fichier est synchronisé automatiquement par le plugin natif **`gemini-app-runtime`** embarqué dans **Google Gemini Windows App (`Gemini.exe`, port `:8789`)**.
`agy` peut contrôler l'application Gemini Web & Windows comme son propre runtime via les outils MCP `gemini_web_*`.

## 1. État du Compte & Runtime
- **Serveur Runtime Direct `Gemini.exe`** : `http://127.0.0.1:8789` (MCP : `http://127.0.0.1:8789/mcp`, REST : `http://127.0.0.1:8789/api/runtime/status`)
- **Dernière synchronisation mémoire** : `2026-11-02T03:28:41.703Z`
- **Compte détecté** : `aphro@google.com` (authentifié Web : `false`)

## 2. Mémoire Web Importée (`gemini.google.com/saved-info`)
- **[memory]** undefined
- **[memory]** undefined
- **[architecture]** Monorepo unifié Gemini Super App & Voice Hub (Rust Édition 2024, Bun v1.4.5, Tauri v3 Alpha, Python uv, Flutter) sur C:\Users\aphro\google.
- **[cloud]** Projet GCP actif: aphrody (468000409790, us-central1) avec modèles gemini-3.8-live, gemini-4-argon, gemini-3.8-flash et gemini-3.8-flash-tts (voix Aoede).
- **[preferences]** Toujours utiliser Bun (bun run, bun fmt, bun check, bun test, Bun.serve, bun:sqlite) et uv pour Python.

## 3. Gems Actifs (`gemini.google.com/gems/view`)
- **Coding Partner** (`gem-coding-partner`): Expert en architecture logicielle, Rust, Bun, TypeScript, Python et débogage fullstack.
- **Deep Research Analyst** (`gem-deep-researcher`): Synthétise des recherches multi-sources web et Google Workspace avec citations vérifiées.
- **Gemini Live Voice & Mochi Companion** (`gem-voice-companion`): Assistant vocal temps réel connecté à Gemini.exe, Chrome /chrome-home et agy CLI.

## 4. Outils Web & Extensions Gemini Disponibles pour `agy`
- **Deep Research** (`deep_research`): Agent de recherche autonome multi-étapes sur gemini.google.com qui planifie, navigue sur des dizaines de sources web + Workspace et rédige un rapport sourcé complet.
- **Canvas** (`canvas`): Espace de travail côte-à-côte interactif sur gemini.google.com pour l'édition de documents longs et la prévisualisation/exécution de code HTML/React/JS/Python.
- **Gems (Custom AI Experts)** (`gems`): Assistants Gemini personnalisés avec instructions système dédiées (Coding Partner, Brainstormer, Writing Editor, Career Guide, Learning Coach et Gems utilisateur).
- **Saved Info / Web Memory** (`saved_info`): Mémoire persistante de l'utilisateur sur gemini.google.com/saved-info (préférences, contexte projet, instructions permanentes).
- **@Google Workspace** (`ext_google_workspace`, mention `@Google Workspace`): Connecteur officiel Google Workspace (Gmail, Google Drive, Google Docs, Google Keep, Google Tasks, Google Calendar).
- **@Gmail** (`ext_gmail`, mention `@Gmail`): Recherche, résume et croise les e-mails de la boîte Gmail de l'utilisateur directement dans Gemini Web.
- **@Google Drive** (`ext_google_drive`, mention `@Google Drive`): Recherche et extrait le contenu des documents, PDF et dossiers Google Drive de l'utilisateur.
- **@Google Docs** (`ext_google_docs`, mention `@Google Docs`): Lit, résume et génère du contenu structuré à partir des documents Google Docs.
- **@YouTube** (`ext_youtube`, mention `@YouTube`): Recherche des vidéos YouTube, extrait les transcriptions et résume le contenu vidéo.
- **@YouTube Music** (`ext_youtube_music`, mention `@YouTube Music`): Recherche et lance des titres, artistes, albums et playlists sur YouTube Music.
- **@Google Maps** (`ext_google_maps`, mention `@Google Maps`): Recherche des lieux, itinéraires, distances et informations géographiques en temps réel via Google Maps.
- **@Google Flights** (`ext_google_flights`, mention `@Google Flights`): Recherche des vols, horaires et tarifs aériens en temps réel via Google Flights.
- **@Google Hotels** (`ext_google_hotels`, mention `@Google Hotels`): Recherche et compare des hôtels et hébergements via Google Hotels.
- **@GitHub** (`ext_github`, mention `@GitHub`): Inspecte des dépôts, issues, pull requests et fichiers de code GitHub dans Gemini.
- **Gemini Live Voice-to-Voice (Full-Duplex)** (`native_live_voice`): Mode vocal bidirectionnel temps réel (16 kHz PCM16 -> Whisper/Gemini 3.8 Live -> TTS 24 kHz + Barge-in).
- **Speak-to-Window & Unicode Injection** (`native_stc_window`): Capsule flottante Speak-to-Window (Alt+Shift+D) et injection directe de texte Unicode dans la fenêtre Windows active via gemini_native.node.
- **Desktop Window Capture (Multimodal Vision)** (`native_window_capture`): Capture d'écran haute résolution des fenêtres Windows ouvertes ou de la vue Gemini Web pour analyse multimodale.

## 5. Conversations Gemini Web Récentes
- Aucune conversation distante indexée (voir l'historique Super App :8787 et Voice Bridge :8765).
