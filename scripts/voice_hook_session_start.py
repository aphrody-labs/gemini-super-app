#!/usr/bin/env python3
"""Antigravity SessionStart Hook: Ensures the Gemini Live Voice Bridge daemon is running."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import contextlib

from voice_cli_trigger import ensure_server_running


def main() -> None:
    with contextlib.suppress(Exception):
        _ = sys.stdin.read()
    ok = ensure_server_running()
    status_text = (
        "Gemini Live Voice Hub active on ws://127.0.0.1:8765/ws/voice & ANTIGRAVITY_MIC=127.0.0.1:24713"
        if ok
        else "Gemini Live Voice Hub standby"
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
