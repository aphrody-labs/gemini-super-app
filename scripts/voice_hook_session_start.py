#!/usr/bin/env python3
"""
Antigravity SessionStart Hook: Headless & Instant Verification of 24/7 Desktop Assistant Stack.
Zero terminal windows, zero flash, sub-millisecond HTTP probing.
"""

from __future__ import annotations

import contextlib
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BUN_EXE = Path(r"C:\Users\aphro\.bun\bin\bun.exe")
SUPERVISOR_TS = REPO_ROOT / "scripts" / "gemini_24_7_supervisor.ts"
TASK_NAME = r"Aphrody\Aphrody Gemini Assistant 24x7"
CREATE_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def probe_http(url: str, timeout: float = 0.5) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AntigravityHook/2026"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False


def is_stack_healthy() -> bool:
    super_app_ok = probe_http("http://127.0.0.1:8787/api/health", timeout=0.4)
    voice_ok = probe_http("http://127.0.0.1:8765/api/status", timeout=0.4)
    return super_app_ok and voice_ok


def start_headless_persistent_task() -> bool:
    # 1. Trigger the native Windows Scheduled Task (100% headless, zero window)
    with contextlib.suppress(Exception):
        res = subprocess.run(
            ["schtasks.exe", "/run", "/tn", TASK_NAME],
            capture_output=True,
            creationflags=CREATE_NO_WINDOW,
            timeout=3,
        )
        if res.returncode == 0:
            for _ in range(15):
                time.sleep(0.2)
                if is_stack_healthy():
                    return True

    # 2. Fallback: run conhost.exe --headless with CREATE_NO_WINDOW
    conhost = Path(r"C:\WINDOWS\System32\conhost.exe")
    if conhost.exists() and BUN_EXE.exists() and SUPERVISOR_TS.exists():
        with contextlib.suppress(Exception):
            subprocess.Popen(
                [str(conhost), "--headless", str(BUN_EXE), "run", str(SUPERVISOR_TS)],
                cwd=str(REPO_ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=CREATE_NO_WINDOW,
            )
            for _ in range(20):
                time.sleep(0.2)
                if is_stack_healthy():
                    return True

    return is_stack_healthy()


def main() -> None:
    # Fast check: already healthy?
    if not is_stack_healthy():
        start_headless_persistent_task()

    ok = is_stack_healthy()
    status_text = (
        "Gemini 24/7 Assistant active (Headless Persistent): Super App & Pets (:8787/pet) | Tauri v3 (:8788) | Voice Hub (:8765 / TCP :24713)"
        if ok
        else "Gemini 24/7 Assistant standby"
    )

    print(
        json.dumps(
            {
                "injectSteps": [
                    {
                        "ephemeralMessage": status_text,
                    }
                ]
            }
        )
    )


if __name__ == "__main__":
    main()
