from __future__ import annotations

import json
from pathlib import Path

from backend.super_app_hub import (
    GEMINI_DEEP_REASONING_MODEL,
    GEMINI_LIVE_MODEL,
    GEMINI_TTS_MODEL,
    build_super_app_manifest,
    load_durable_cookie_vault,
    main,
    synthesize_harmonic_wav_bytes,
    verify_real_gemini_python,
)


def test_super_app_manifest_verifies_all_9_submodules() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    manifest = build_super_app_manifest(repo_root)
    assert manifest.python_manager == "uv"
    assert manifest.tauri_version == "3.0.0-alpha.5"
    assert manifest.live_model == GEMINI_LIVE_MODEL
    assert manifest.deep_reasoning_model == GEMINI_DEEP_REASONING_MODEL
    assert manifest.tts_model == GEMINI_TTS_MODEL
    assert len(manifest.submodules) == 9
    for sub in manifest.submodules:
        assert sub.exists, f"Expected submodule {sub.path} to exist on disk"


def test_synthesize_harmonic_wav_bytes_and_cli(capsys) -> None:
    wav = synthesize_harmonic_wav_bytes(
        "Gemini 3.8 Live harmony", duration_sec=0.25, sample_rate_hz=16000
    )
    assert wav[:4] == b"RIFF"
    assert len(wav) == 44 + (4000 * 2)

    rc = main(["--mode", "audiocraft", "--prompt", "Ambient aurora", "--duration", "0.25"])
    assert rc == 0
    captured = capsys.readouterr().out.strip()
    data = json.loads(captured)
    assert data["status"] == "ok"
    assert data["wav_byte_length"] == 44 + (4000 * 2)


def test_real_gemini_api_python_uv() -> None:
    res = verify_real_gemini_python()
    assert res["live_verified"] is True
    assert "PYTHON_GEMINI_38_OK" in res["text_reply"]
    assert res["tts_model"] == GEMINI_TTS_MODEL
    assert res["tts_audio_bytes"] > 1000

    cookie_vault = load_durable_cookie_vault()
    assert cookie_vault["loaded"] is True
    assert cookie_vault["has_valid_1psid"] is True
    assert cookie_vault["has_valid_1psidts"] is True
    assert cookie_vault["cookie_count"] >= 15
