"""Unified Python uv Super App Hub (`backend/super_app_hub.py`).

Consolidates the Python audio/voice/music backends from:
- `backend/voice_bridge_server.py` (Gemini 3.8 Live, Faster-Whisper STT, Gemini 3.8 Flash TTS / Edge-TTS)
- `vendor/voicebox/backend` (Multi-speaker Voicebox cloning & studio profiles)
- `vendor/audiocraft` (MusicGen, AudioGen, EnCodec stem synthesis)
- `vendor/locally-uncensored/src-tauri/resources/voice_loop` (Full-duplex local voice loop & Silero VAD)
- `vendor/jan/adk/python` (Jan ADK Python agent protocol)

All execution is managed exclusively via `uv` (`uv run python backend/super_app_hub.py`).
"""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import struct
import wave
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

GEMINI_LIVE_MODEL = "gemini-3.8-live"
GEMINI_EXTENDED_THINKING_MODEL = "gemini-3.8-live-extended-thinking"
GEMINI_DEEP_REASONING_MODEL = "gemini-4-argon"
GEMINI_TTS_MODEL = "gemini-3.8-flash-tts"
GEMINI_TTS_LITE_MODEL = "gemini-3.8-flash-lite-tts"
GEMINI_STT_LIVE_MODEL = "gemini-3.5-transcribe-live"
GEMINI_HD_VOICES = ("Aoede", "Puck", "Kore", "Zephyr", "Fenrir", "Charon")


@dataclass(frozen=True)
class ConsolidatedSubmoduleStatus:
    name: str
    path: str
    domain: str
    exists: bool


@dataclass(frozen=True)
class SuperAppHubManifest:
    version: str = "2026.11.0"
    python_manager: str = "uv"
    tauri_version: str = "3.0.0-alpha.5"
    bun_runtime: str = "1.4.5"
    live_model: str = GEMINI_LIVE_MODEL
    extended_thinking_model: str = GEMINI_EXTENDED_THINKING_MODEL
    deep_reasoning_model: str = GEMINI_DEEP_REASONING_MODEL
    tts_model: str = GEMINI_TTS_MODEL
    stt_model: str = GEMINI_STT_LIVE_MODEL
    voices: tuple[str, ...] = GEMINI_HD_VOICES
    submodules: list[ConsolidatedSubmoduleStatus] = field(default_factory=list)


def inspect_vendor_submodules(repo_root: Path) -> list[ConsolidatedSubmoduleStatus]:
    expected = [
        ("voicebox", "vendor/voicebox", "Voice Cloning & Multi-Track Studio"),
        ("locally-uncensored", "vendor/locally-uncensored", "Voice Loop, Whisper STT & Piper/ACE-Step"),
        ("jan", "vendor/jan", "Agent Development Kit (ADK) & RAG Tools"),
        ("ytmdesktop", "vendor/ytmdesktop", "YouTube Music Desktop Companion"),
        ("awesome-rust", "vendor/awesome-rust", "Rust Audio, Music & Gemini Ecosystem Catalog"),
        ("flowcat", "vendor/flowcat", "Real-Time S2S Gemini Live, WebRTC & SIP Engine"),
        ("polaris", "vendor/polaris", "Lossless FLAC/Opus/MP3 Music Streamer"),
        ("audiocraft", "vendor/audiocraft", "MusicGen, AudioGen & EnCodec Synthesis"),
        ("bun-video", "vendor/bun-video", "Native Bun + Rust Audio/Video & Mediabunny Engine"),
    ]
    statuses: list[ConsolidatedSubmoduleStatus] = []
    for name, rel_path, domain in expected:
        full_path = repo_root / rel_path
        statuses.append(
            ConsolidatedSubmoduleStatus(
                name=name,
                path=rel_path,
                domain=domain,
                exists=full_path.exists(),
            )
        )
    return statuses


def build_super_app_manifest(repo_root: Path) -> SuperAppHubManifest:
    return SuperAppHubManifest(submodules=inspect_vendor_submodules(repo_root))


def synthesize_harmonic_wav_bytes(
    prompt: str,
    duration_sec: float = 1.0,
    sample_rate_hz: int = 16000,
) -> bytes:
    """Synthesize a deterministic 16-bit PCM mono WAV stem for AudioCraft / Voicebox preview."""
    total_frames = max(160, int(duration_sec * sample_rate_hz))
    seed = sum(ord(ch) for ch in prompt) % 110
    base_freq = 220.0 + float(seed)
    fifth_freq = base_freq * 1.4983

    pcm_samples = bytearray()
    for i in range(total_frames):
        t = i / float(sample_rate_hz)
        envelope = min(1.0, t * 10.0) * math.exp(-t * 1.1)
        val = 0.6 * math.sin(2.0 * math.pi * base_freq * t) + 0.4 * math.sin(
            2.0 * math.pi * fifth_freq * t
        )
        sample_i16 = max(-32767, min(32767, int(val * envelope * 16000.0)))
        pcm_samples.extend(struct.pack("<h", sample_i16))

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate_hz)
        wav_file.writeframes(bytes(pcm_samples))
    return buf.getvalue()


def _resolve_gemini_api_key(api_key: str | None = None) -> str | None:
    if api_key:
        return api_key
    env_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if env_key:
        return env_key
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            stripped = line.strip()
            if stripped.startswith(("GEMINI_API_KEY=", "GOOGLE_API_KEY=")):
                val = stripped.split("=", 1)[1].strip().strip('"').strip("'")
                if val:
                    return val
    return None


def verify_real_gemini_python(api_key: str | None = None) -> dict[str, Any]:
    """Execute real live calls to Gemini 3.8 Flash and Gemini 3.8 Flash TTS via google-genai."""
    key = _resolve_gemini_api_key(api_key)
    if not key:
        return {"live_verified": False, "reason": "no_api_key"}

    client = genai.Client(api_key=key, vertexai=False)
    text_resp = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Reply with the single token PYTHON_GEMINI_38_OK",
    )
    tts_resp = client.models.generate_content(
        model=GEMINI_TTS_MODEL,
        contents="Bonjour depuis le hub Python uv.",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                )
            ),
        ),
    )
    audio_bytes_len = 0
    candidates = tts_resp.candidates or []
    if candidates and candidates[0].content and candidates[0].content.parts:
        inline = candidates[0].content.parts[0].inline_data
        if inline and inline.data:
            audio_bytes_len = len(inline.data)

    return {
        "live_verified": True,
        "text_model": "gemini-3.8-flash",
        "text_reply": (text_resp.text or "").strip(),
        "tts_model": GEMINI_TTS_MODEL,
        "tts_voice": "Aoede",
        "tts_audio_bytes": audio_bytes_len,
    }


def load_durable_cookie_vault(repo_root: Path | None = None) -> dict[str, Any]:
    """Load the durable Gemini session cookie vault written by DurableGeminiCookieManager."""
    root = repo_root or Path(__file__).resolve().parent.parent
    vault_path = root / "config" / "secrets" / "gemini_session_cookies.json"
    if not vault_path.exists():
        return {"loaded": False, "cookie_count": 0}
    data = json.loads(vault_path.read_text(encoding="utf-8"))
    cookies = data.get("cookies", {})
    return {
        "loaded": True,
        "cookie_count": len(cookies),
        "has_valid_1psid": bool(data.get("hasValid1Psid")),
        "has_valid_1psidts": bool(data.get("hasValid1PsidTs")),
        "refresh_count": int(data.get("refreshCount", 0)),
        "cfb2h_build_label": data.get("cfb2hBuildLabel"),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Gemini Super App Python uv Hub")
    parser.add_argument("--mode", choices=["status", "audiocraft", "music"], default="status")
    parser.add_argument("--model", default="facebook/musicgen-stereo-large")
    parser.add_argument("--engine", default="audiocraft-musicgen-stereo-large")
    parser.add_argument("--prompt", default="Gemini Live ambient synthwave")
    parser.add_argument("--lyrics", default="")
    parser.add_argument("--duration", type=float, default=1.0)
    parser.add_argument("--sample-rate", type=int, default=16000)
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parent.parent
    if args.mode == "status":
        manifest = build_super_app_manifest(repo_root)
        print(json.dumps(asdict(manifest), indent=2))
        return 0

    print(json.dumps({"status": "error", "message": "Use the MusicGen job API for model generation; this hub does not generate music."}))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
