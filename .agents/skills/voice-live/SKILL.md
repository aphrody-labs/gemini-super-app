---
name: voice-live
description: Interactive full-duplex Gemini Live Voice Mode (/voice-live, /record) bridging Antigravity CLI (agy), Antigravity App, Gemini Web App, Gemini Windows App, and the Flutter Gemini Voice Hub with a permanently animated official Gemini SVG.
---

# Gemini Live Interactive Voice Mode (`/voice-live` & `/record`)

When the user invokes `/voice-live` (or asks to activate interactive voice mode, `/voice`, or `/record` across Antigravity CLI, Antigravity App, Gemini Web, or Gemini Windows):

1. **Ensure the Gemini Live Voice Bridge Server is running** on `http://127.0.0.1:8765` (`ws://127.0.0.1:8765/ws/voice`) and `ANTIGRAVITY_MIC` TCP server on `127.0.0.1:24713`:
   ```powershell
   C:\Users\aphro\google\.venv\Scripts\python.exe C:\Users\aphro\google\scripts\voice_cli_trigger.py --ensure-running --toggle-live on
   ```
2. **Launch or focus the Flutter Gemini Voice App** (Windows Desktop executable or Web UI) with the permanently animated official Gemini SVG:
   ```powershell
   C:\Users\aphro\google\.venv\Scripts\python.exe C:\Users\aphro\google\scripts\voice_cli_trigger.py --launch-ui
   ```
3. **Send spoken responses or trigger Push-to-Talk (`/record`)**:
   ```powershell
   C:\Users\aphro\google\.venv\Scripts\python.exe C:\Users\aphro\google\scripts\voice_cli_trigger.py --say "Salut ! Le mode vocal Gemini Live est actif."
   ```
