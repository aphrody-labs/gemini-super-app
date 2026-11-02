# Privacy Policy — Gemini Live Voice & Pet (`gemini-super-app`)

**Effective Date**: November 2, 2026  
**Repository**: `https://github.com/aphrody-labs/gemini-super-app`

## 1. Overview

**Gemini Live Voice & Pet** (and its companion package **Gemini Dark Theme**) is a local-first Chromium Manifest V3 extension that connects your browser to your own local Gemini Live Voice Hub (`http://127.0.0.1:8765` and `http://127.0.0.1:8787`).

## 2. Data We Access and How It Is Used

- **Microphone Audio & Voice Transcripts**: Captured only when you explicitly activate Live Voice mode or Push-to-Talk (`F5` / `Alt+V`). Audio PCM streams and transcripts are sent exclusively to your local loopback server (`http://127.0.0.1:8765` / `http://127.0.0.1:8787`) on your own computer.
- **Browser Storage (`chrome.storage.local` & `chrome.storage.session`)**: Used strictly on your device to store your UI preferences (theme, 2D/3D companion pet mode, active voice state, and transitional capture locks).
- **Session Cookies (`cookies` permission on `google.com`)**: Synchronized exclusively to your own local encrypted vault (`http://127.0.0.1:8787/api/gemini/cookies/sync`) on the same computer to maintain local desktop session continuity.

## 3. Zero Third-Party Data Sharing or Selling

- We do **not** collect, transmit, rent, or sell any personal data, browsing history, audio recordings, or cookies to any third-party server or analytics service.
- We do **not** use remote code, external tracking scripts, or advertising networks.

## 4. Contact

For questions or support regarding this Privacy Policy, please open an issue at `https://github.com/aphrody-labs/gemini-super-app/issues`.
