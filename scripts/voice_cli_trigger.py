#!/usr/bin/env python3
"""
CLI & Hook Helper for Gemini Live Voice Hub (`/voice`, `/record`, `/voice-live`).
Allows `agy` CLI, Antigravity App hooks/skills, and scripts to:
- Ensure the background `voice_bridge_server.py` daemon is running
- Toggle full-duplex Gemini Live mode (`--toggle-live on|off`)
- Trigger Push-to-Talk recording (`--ptt start|stop`)
- Send spoken utterances or agent responses (`--say "..."`)
- Launch the Flutter Windows Desktop / Web Gemini Voice Hub UI (`--launch-ui`)
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:8765"
ROOT_DIR = Path(r"C:\Users\aphro\google")
PYTHON_EXE = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
SERVER_SCRIPT = ROOT_DIR / "backend" / "voice_bridge_server.py"
FLUTTER_WINDOWS_EXE = (
    ROOT_DIR
    / "gemini_voice_app"
    / "build"
    / "windows"
    / "x64"
    / "runner"
    / "Release"
    / "gemini_voice_app.exe"
)


def is_server_running() -> bool:
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/status", timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def ensure_server_running() -> bool:
    if is_server_running():
        return True
    creationflags = 0x08000000 if sys.platform == "win32" else 0  # CREATE_NO_WINDOW
    subprocess.Popen(
        [str(PYTHON_EXE), str(SERVER_SCRIPT)],
        cwd=str(ROOT_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=creationflags,
    )
    for _ in range(25):
        time.sleep(0.2)
        if is_server_running():
            return True
    return False


def post_voice_action(payload: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE_URL}/api/voice",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10.0) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Gemini Live Voice Hub CLI Trigger")
    parser.add_argument("--ensure-running", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--toggle-live", choices=["on", "off", "toggle"])
    parser.add_argument("--ptt", choices=["start", "stop"])
    parser.add_argument("--say", type=str, help="Send utterance to Gemini Live Hub")
    parser.add_argument("--surface", type=str, default="agy_cli")
    parser.add_argument("--launch-ui", action="store_true")
    args = parser.parse_args()

    if args.ensure_running or args.toggle_live or args.ptt or args.say or args.status:
        ok = ensure_server_running()
        if not ok:
            print(json.dumps({"status": "error", "message": "Voice server failed to start"}))
            return 1

    if args.toggle_live:
        payload: dict = {"action": "toggle_live", "surface": args.surface}
        if args.toggle_live == "on":
            payload["enabled"] = True
        elif args.toggle_live == "off":
            payload["enabled"] = False
        print(json.dumps(post_voice_action(payload), indent=2))

    if args.ptt:
        action = "ptt_start" if args.ptt == "start" else "ptt_stop"
        print(json.dumps(post_voice_action({"action": action, "surface": args.surface}), indent=2))

    if args.say:
        print(
            json.dumps(
                post_voice_action(
                    {"action": "utterance", "text": args.say, "surface": args.surface}
                ),
                indent=2,
            )
        )

    if args.launch_ui:
        if FLUTTER_WINDOWS_EXE.exists():
            subprocess.Popen([str(FLUTTER_WINDOWS_EXE)], cwd=str(FLUTTER_WINDOWS_EXE.parent))
            print(json.dumps({"status": "launched_windows_exe", "exe": str(FLUTTER_WINDOWS_EXE)}))
        else:
            # Launch standalone desktop app window pointing to the built Flutter Web UI served by the Voice Hub
            edge_paths = [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            ]
            launched = False
            for ep in edge_paths:
                if Path(ep).exists():
                    subprocess.Popen([ep, f"--app={BASE_URL}/", "--window-size=1180,760"])
                    launched = True
                    break
            print(
                json.dumps(
                    {
                        "status": "launched_app_window" if launched else "ready_at_url",
                        "url": f"{BASE_URL}/",
                    }
                )
            )

    if args.status:
        with urllib.request.urlopen(f"{BASE_URL}/api/status", timeout=3.0) as resp:
            print(resp.read().decode("utf-8"))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
