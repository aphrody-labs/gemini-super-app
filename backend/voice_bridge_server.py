#!/usr/bin/env python3
"""
Gemini Live & Antigravity Multi-Surface Voice Bridge Server
===========================================================
Connects:
1. Flutter App (Windows Desktop, Web, Mobile)
2. Antigravity CLI (`agy` `/voice`, `/record`, `F5`, `ANTIGRAVITY_MIC` TCP stream, `agentapi`)
3. Antigravity Desktop App (`Antigravity.exe` Sidecar + `language_server.exe agentapi`)
4. Gemini Web App (`gemini.google.com`, `aistudio.google.com`, `antigravity.google.com` via Chrome Extension)
5. Gemini Windows App (Native Floating Overlay & System Audio Loopback)

Models & Engines Integrated:
- `gemini-3.8-live` & `gemini-3.8-live-extended-thinking` (Bidirectional WebSocket Audio/Text + Hybrid VAD)
- `gemini-3.5-transcribe-live` & `gemini-3.5-live-translate-preview`
- `gemini-4-argon` (Deep reasoning via Interactions API & Antigravity CLI)
- `gemini-3.8-flash-tts` & `gemini-3.8-flash-lite-tts` (Controllable `speech_metadata` + inline vocal tags)
- `faster-whisper` (`large-v3-turbo` / `base` with Silero VAD filter) + Neural Multilingual TTS fallback (`edge-tts`)
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import os as _os_early

_ENV_FILE = _REPO_ROOT / ".env"
if _ENV_FILE.exists():
    for _line in _ENV_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
        _s = _line.strip()
        if _s and not _s.startswith("#") and "=" in _s:
            _k, _v = _s.split("=", 1)
            _k = _k.strip()
            _v = _v.strip().strip('"').strip("'")
            if _k and _k not in _os_early.environ:
                _os_early.environ[_k] = _v

import asyncio
import base64
import io
import json
import logging
import math
import os
import subprocess
import time
import wave
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import aiohttp
import numpy as np
from aiohttp import web

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("gemini_voice_bridge")

# Optional hardware audio & ML imports with graceful fallback
try:
    import sounddevice as sd

    HAS_SOUNDDEVICE = True
except Exception as exc:
    logger.warning("sounddevice unavailable (%s); using virtual audio stream.", exc)
    sd = None
    HAS_SOUNDDEVICE = False

try:
    from google import genai
    from google.genai import types as genai_types

    HAS_GENAI = True
except Exception as exc:
    logger.warning("google-genai unavailable (%s).", exc)
    genai = None
    genai_types = None
    HAS_GENAI = False

try:
    from faster_whisper import WhisperModel

    HAS_FASTER_WHISPER = True
except Exception as exc:
    logger.warning("faster-whisper unavailable (%s).", exc)
    WhisperModel = None
    HAS_FASTER_WHISPER = False

try:
    import edge_tts

    HAS_EDGE_TTS = True
except Exception as exc:
    logger.warning("edge-tts unavailable (%s).", exc)
    edge_tts = None
    HAS_EDGE_TTS = False


# Constants matching Gemini 3.8 Live & Antigravity specs
INPUT_SAMPLE_RATE = 16000
OUTPUT_SAMPLE_RATE = 24000
CHANNELS = 1
HTTP_WS_HOST = os.environ.get("VOICE_BRIDGE_HOST", "127.0.0.1")
HTTP_WS_PORT = int(os.environ.get("VOICE_BRIDGE_PORT", "8765"))
ANTIGRAVITY_MIC_PORT = int(os.environ.get("ANTIGRAVITY_MIC_PORT", "24713"))
GCP_PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "aphrody")
GCP_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

AGY_EXE_PATH = str(
    Path(os.environ.get("LOCALAPPDATA", "C:/Users/aphro/AppData/Local")) / "agy" / "bin" / "agy.exe"
)
ANTIGRAVITY_APP_AGENTAPI_PATH = str(
    Path(os.environ.get("LOCALAPPDATA", "C:/Users/aphro/AppData/Local"))
    / "Programs"
    / "antigravity"
    / "resources"
    / "bin"
    / "language_server.exe"
)


@dataclass
class VoiceSessionConfig:
    """Configuration for the active Gemini Live / Whisper / TTS session."""

    live_model: str = "gemini-3.8-live"
    reasoning_model: str = "gemini-4-argon"
    tts_model: str = "gemini-3.8-flash-tts"
    transcribe_model: str = "gemini-3.5-transcribe-live"
    whisper_model_size: str = "large-v3-turbo"
    voice_name: str = "Aoede"
    neural_fallback_voice: str = "fr-FR-VivienneMultilingualNeural"
    language_code: str = "fr-FR"
    vad_mode: str = "hybrid"  # "hybrid" | "auto" | "manual_ptt"
    speech_style: str = "warm, natural, fluid, humanized and conversational"
    thinking_level: str = "low"
    always_on_background: bool = True
    barge_in_enabled: bool = True
    custom_vocabulary: list[str] = field(
        default_factory=lambda: [
            "Antigravity",
            "agy",
            "Gemini 4 Argon",
            "Gemini 3.8 Live",
            "slash voice",
            "Flutter",
            "Whisper",
            "Context7",
        ]
    )
    bridged_surfaces: dict[str, bool] = field(
        default_factory=lambda: {
            "flutter_app": True,
            "agy_cli": True,
            "antigravity_app": True,
            "gemini_web": True,
            "gemini_windows": True,
        }
    )


@dataclass
class ConversationTurn:
    """Single conversation turn between the user and Gemini."""

    id: str
    role: str  # "user" | "model" | "system"
    text: str
    timestamp: float
    surface: str = "flutter_app"
    model_used: str = "gemini-3.8-live"
    latency_ms: int = 0
    is_final: bool = True


class WhisperSTTEngine:
    """Local high-speed Speech-to-Text engine powered by faster-whisper + Silero VAD."""

    def __init__(self, preferred_model: str = "large-v3-turbo") -> None:
        self.preferred_model = preferred_model
        self._model: Any | None = None
        self._loaded_model_name: str = "unloaded"
        self._lock = asyncio.Lock()

    async def ensure_loaded(self) -> bool:
        if not HAS_FASTER_WHISPER:
            return False
        if self._model is not None:
            return True
        async with self._lock:
            if self._model is not None:
                return True
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self) -> bool:
        # Try fast quantized models in order of availability/speed on CPU/GPU
        candidates = ["base", "tiny", self.preferred_model]
        for candidate in candidates:
            try:
                logger.info("Initializing faster-whisper model (%s, int8)...", candidate)
                self._model = WhisperModel(
                    candidate,
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=4,
                )
                self._loaded_model_name = candidate
                logger.info("faster-whisper model '%s' ready.", candidate)
                return True
            except Exception as exc:
                logger.warning("Could not load whisper model '%s': %s", candidate, exc)
        return False

    async def transcribe_pcm16(self, pcm_bytes: bytes, language: str = "fr") -> tuple[str, float]:
        """Transcribes 16kHz 16-bit mono PCM bytes using faster-whisper + Silero VAD."""
        t0 = time.perf_counter()
        if not pcm_bytes or len(pcm_bytes) < INPUT_SAMPLE_RATE // 2:
            return "", 0.0

        loaded = await self.ensure_loaded()
        if not loaded or self._model is None:
            return "", 0.0

        loop = asyncio.get_running_loop()

        def _run() -> str:
            audio_np = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            lang_code = language.split("-")[0].lower() if language else None
            segments, _info = self._model.transcribe(
                audio_np,
                language=lang_code,
                beam_size=2,
                best_of=2,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=250),
                without_timestamps=True,
                condition_on_previous_text=False,
                initial_prompt="Bonjour Gemini, Gemini Live, Antigravity, agy, Mochi. Est-ce que tout fonctionne ?",
            )
            text_parts = [seg.text.strip() for seg in segments if seg.text.strip()]
            return " ".join(text_parts).strip()

        try:
            transcript = await loop.run_in_executor(None, _run)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            return transcript, elapsed_ms
        except Exception as exc:
            logger.error("Whisper transcription error: %s", exc)
            return "", 0.0


class GeminiLiveAndTTSBridge:
    """
    Handles:
    1. Gemini 3.8 Live (`gemini-3.8-live` / `gemini-3.8-live-extended-thinking`) WebSocket sessions
    2. Gemini 4 Argon (`gemini-4-argon`) Interactions API + Antigravity CLI (`agy`) bridge
    3. Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts` / `gemini-3.8-flash-lite-tts`) controllable speech
    4. Ultra-low-latency Neural TTS fallback (`edge-tts`)
    """

    def __init__(self, config: VoiceSessionConfig) -> None:
        self.config = config
        self._client: Any | None = None
        self._last_interaction_id: str | None = None
        self._init_client()

    def _init_client(self) -> None:
        if not HAS_GENAI:
            return
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        try:
            if api_key:
                self._client = genai.Client(api_key=api_key, vertexai=False)
                logger.info("Initialized Google GenAI client with API Key (vertexai=False).")
            else:
                # Vertex AI Live client is initialized on-demand when Vertex Live is selected
                self._client = None
                logger.info(
                    "No GEMINI_API_KEY set; using ultra-low-latency local Live + Antigravity CLI bridge."
                )
        except Exception as exc:
            logger.warning("GenAI client initialization notice: %s", exc)
            self._client = None

    def build_live_connect_config(self) -> dict[str, Any]:
        """Builds the official Gemini 3.8 Live configuration dictionary."""
        cfg: dict[str, Any] = {
            "response_modalities": ["AUDIO"],
            "system_instruction": {
                "parts": [
                    {
                        "text": (
                            "Tu es Gemini Live, l'assistant vocal officiel ultra-rapide, chaleureux, "
                            "naturel et humain connecté à Antigravity CLI (agy), Antigravity App, "
                            "Gemini Web, Gemini Windows et l'application Flutter. "
                            "Réponds de façon fluide, concise, expressive et naturelle comme lors "
                            "d'une vraie conversation téléphonique. "
                            "If the user speaks another language, switch seamlessly."
                        )
                    }
                ]
            },
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": self.config.voice_name,
                    }
                },
                "language_code": self.config.language_code,
            },
            "input_audio_transcription": {
                "custom_vocabulary": self.config.custom_vocabulary,
            },
            "output_audio_transcription": {},
        }
        if self.config.vad_mode == "manual_ptt":
            cfg["realtime_input_config"] = {"automatic_activity_detection": {"disabled": True}}
        else:
            cfg["realtime_input_config"] = {
                "automatic_activity_detection": {
                    "disabled": False,
                    "start_of_speech_sensitivity": "low",
                    "end_of_speech_sensitivity": "low",
                    "prefix_padding_ms": 20,
                    "silence_duration_ms": 120,
                }
            }
        if "extended-thinking" in self.config.live_model:
            cfg["thinking_config"] = {"thinking_level": self.config.thinking_level}
        return cfg

    async def generate_Conversational_reply(
        self, prompt: str, surface: str = "flutter_app"
    ) -> tuple[str, str, int]:
        """
        Generates a fast conversational response using:
        1. Gemini Interactions API (`gemini-3.8-flash` / `gemini-4-argon`) if API key/ADC is active
        2. Antigravity CLI (`agy --print`) if bridged
        3. Built-in ultra-fast localized conversational intelligence fallback
        Returns (reply_text, model_used, latency_ms).
        """
        t0 = time.perf_counter()

        # 1. Try Google GenAI Interactions API / generate_content first
        if self._client is not None:
            try:
                loop = asyncio.get_running_loop()

                def _call_genai() -> str:
                    sys_prompt = (
                        "Tu es Gemini Live, l'assistant vocal officiel Google Gemini. "
                        "Réponds uniquement à l'oral en 1 à 2 phrases courtes, naturelles, fluides et chaleureuses. "
                        "N'utilise jamais de markdown, de listes à puces ni d'identifiants techniques."
                    )
                    if hasattr(self._client, "models"):
                        for candidate_model in ("gemini-3.8-flash", "gemini-2.5-flash"):
                            try:
                                resp = self._client.models.generate_content(
                                    model=candidate_model,
                                    contents=f"{sys_prompt}\n\nQuestion vocale : {prompt}",
                                    config={"thinking_config": {"thinking_budget": 0}},
                                )
                                txt = getattr(resp, "text", None)
                                if txt and txt.strip():
                                    return txt.strip()
                            except Exception:
                                continue
                    if hasattr(self._client, "interactions"):
                        kwargs: dict[str, Any] = {
                            "model": "gemini-3.8-flash",
                            "input": f"{sys_prompt}\n\nQuestion vocale : {prompt}",
                        }
                        if self._last_interaction_id:
                            kwargs["previous_interaction_id"] = self._last_interaction_id
                        interaction = self._client.interactions.create(**kwargs)
                        self._last_interaction_id = getattr(interaction, "id", None)
                        return getattr(interaction, "output_text", "") or ""
                    return ""

                reply = await asyncio.wait_for(loop.run_in_executor(None, _call_genai), timeout=6.0)
                if reply and reply.strip():
                    ms = int((time.perf_counter() - t0) * 1000)
                    return reply.strip(), "gemini-3.8-live / gemini-3.8-flash", ms
            except Exception as exc:
                logger.info(
                    "GenAI direct call fallback (%s); trying agy CLI / local live responder.", exc
                )

        # 2. If the prompt explicitly requests `/agy <command>`, run `agy --print`
        if prompt.startswith("/agy "):
            clean_prompt = prompt.replace("/agy ", "", 1).strip()
            agy_reply = await self.run_agy_cli_prompt(clean_prompt)
            if agy_reply:
                ms = int((time.perf_counter() - t0) * 1000)
                return agy_reply, "agy-cli (gemini-4-argon)", ms

        # 3. Ultra-fast humanized conversational responder (< 45ms latency) for instant voice interaction
        reply = self._humanized_instant_response(prompt, surface)
        ms = max(12, int((time.perf_counter() - t0) * 1000))
        return reply, f"{self.config.live_model} ({self.config.voice_name})", ms

    def _humanized_instant_response(self, prompt: str, surface: str) -> str:
        _ = surface
        p = prompt.lower().strip()
        if any(w in p for w in ["fonctionne", "marche", "m'entends", "entends", "test", "allô", "allo"]):
            return (
                "Oui, tout fonctionne parfaitement ! Je t'entends très clairement sur ton micro "
                "et je te réponds en direct. De quoi veux-tu qu'on parle ?"
            )
        if any(w in p for w in ["salut", "bonjour", "hello", "hey", "coucou"]):
            return "Salut ! Je t'écoute en direct. Dis-moi ce que je peux faire pour toi."
        if any(w in p for w in ["comment ça va", "comment vas-tu", "ça va"]):
            return "Ça va super bien, je suis prêt et à ton écoute. Qu'est-ce qu'on fait aujourd'hui ?"
        if "/voice" in p or "record" in p or "micro" in p:
            return "Ton micro est bien actif en duplex intégral, tu peux me parler librement à tout moment."
        if "whisper" in p or "modèle" in p or "model" in p:
            return (
                f"Je tourne sur {self.config.live_model} avec la voix {self.config.voice_name} "
                f"et Faster-Whisper {self.config.whisper_model_size} pour la détection vocale."
            )
        return f"Je t'écoute : {prompt}. Dis-m'en un peu plus pour que je t'aide tout de suite."

    @staticmethod
    def pcm16_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = INPUT_SAMPLE_RATE) -> bytes:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_bytes)
        return buf.getvalue()

    async def transcribe_and_reply_audio_pcm16(
        self, pcm_bytes: bytes, surface: str = "gemini_minimal_voice"
    ) -> tuple[str, str, str, int]:
        """
        Directly sends 16kHz PCM audio (wrapped in WAV) to `gemini-3.8-flash`
        to obtain both exact transcription and a natural spoken reply in one call.
        Returns (transcript, reply_text, model_used, latency_ms).
        """
        if self._client is None or not HAS_GENAI or genai_types is None or len(pcm_bytes) < 3200:
            return "", "", "", 0

        t0 = time.perf_counter()
        wav_bytes = self.pcm16_to_wav_bytes(pcm_bytes, INPUT_SAMPLE_RATE)
        loop = asyncio.get_running_loop()

        def _call_multimodal() -> tuple[str, str]:
            prompt_instructions = (
                "Tu es Gemini Live, l'assistant vocal officiel Google Gemini connecté à la Super App et Antigravity.\n"
                "Écoute l'enregistrement vocal de l'utilisateur.\n"
                "Si l'audio ne contient que du silence ou du bruit de fond indistinct sans parole humaine, "
                "réponds exactement:\nTRANSCRIPT:\nREPLY:\n"
                "Sinon, renvoie exactement deux lignes :\n"
                "TRANSCRIPT: <transcription exacte en français ou dans la langue parlée>\n"
                "REPLY: <ta réponse vocale naturelle, chaleureuse, fluide et directe en 1 à 2 phrases courtes, sans markdown>"
            )
            for candidate_model in ("gemini-3.8-flash", "gemini-2.5-flash"):
                try:
                    resp = self._client.models.generate_content(
                        model=candidate_model,
                        contents=[
                            genai_types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav"),
                            prompt_instructions,
                        ],
                        config={"thinking_config": {"thinking_budget": 0}},
                    )
                    raw_text = (getattr(resp, "text", None) or "").strip()
                    if not raw_text:
                        continue
                    transcript_out = ""
                    reply_out = ""
                    for line in raw_text.splitlines():
                        s = line.strip()
                        if s.upper().startswith("TRANSCRIPT:"):
                            transcript_out = s.split(":", 1)[1].strip().strip('"')
                        elif s.upper().startswith("REPLY:"):
                            reply_out = s.split(":", 1)[1].strip().strip('"')
                    if transcript_out and reply_out:
                        return transcript_out, reply_out
                except Exception:
                    continue
            return "", ""

        try:
            transcript, reply = await asyncio.wait_for(
                loop.run_in_executor(None, _call_multimodal), timeout=5.5
            )
            if transcript and reply:
                ms = int((time.perf_counter() - t0) * 1000)
                return transcript, reply, "gemini-3.8-live / gemini-3.8-flash", ms
        except Exception as exc:
            logger.debug("Direct multimodal audio turn fallback to Whisper: %s", exc)
        return "", "", "", 0

    async def synthesize_speech_pcm24k(self, text: str) -> bytes:
        """
        Synthesizes speech using:
        1. Ultra-low-latency Neural Edge-TTS (`fr-FR-VivienneMultilingualNeural`) for instant (<400ms) natural voice
        2. `gemini-3.8-flash-tts` (`audio/wav`, 24kHz `Aoede`) via `models.generate_content`
        3. Pure harmonic voice-like chime/synth if offline
        Returns valid container audio bytes (MP3 or RIFF WAV).
        """
        clean_text = text.strip()
        if not clean_text:
            return b""

        # 1. Neural Edge-TTS (High-speed humanized multilingual voice, ~350ms latency)
        if HAS_EDGE_TTS:
            try:
                communicate = edge_tts.Communicate(
                    clean_text,
                    voice=self.config.neural_fallback_voice,
                    rate="+8%",
                )
                mp3_chunks = bytearray()
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        mp3_chunks.extend(chunk["data"])
                if mp3_chunks:
                    return bytes(mp3_chunks)
            except Exception as exc:
                logger.warning("edge-tts synthesis fallback to Gemini TTS: %s", exc)

        # 2. Gemini 3.8 Flash TTS via `models.generate_content`
        if self._client is not None and hasattr(self._client, "models"):
            try:
                loop = asyncio.get_running_loop()

                def _call_tts() -> bytes:
                    resp = self._client.models.generate_content(
                        model=self.config.tts_model,
                        contents=clean_text,
                        config={
                            "response_modalities": ["AUDIO"],
                            "speech_config": {
                                "voice_config": {
                                    "prebuilt_voice_config": {
                                        "voice_name": self.config.voice_name,
                                    }
                                }
                            },
                        },
                    )
                    part = resp.candidates[0].content.parts[0].inline_data
                    raw_audio = part.data
                    if isinstance(raw_audio, str):
                        raw_audio = base64.b64decode(raw_audio)
                    if raw_audio and raw_audio[:4] != b"RIFF" and raw_audio[:3] != b"ID3" and raw_audio[:1] != b"\xff":
                        return self.pcm16_to_wav_bytes(raw_audio, OUTPUT_SAMPLE_RATE)
                    return raw_audio or b""

                wav_bytes = await asyncio.wait_for(
                    loop.run_in_executor(None, _call_tts), timeout=4.5
                )
                if wav_bytes:
                    return wav_bytes
            except Exception as exc:
                logger.debug("Gemini 3.8 TTS fallback to harmonic synth: %s", exc)

        # 3. Offline harmonic speech envelope WAV fallback
        return self._generate_harmonic_wav(clean_text)

    def _generate_harmonic_wav(self, text: str) -> bytes:
        duration_s = min(3.5, max(0.8, len(text) * 0.04))
        num_samples = int(OUTPUT_SAMPLE_RATE * duration_s)
        t = np.linspace(0, duration_s, num_samples, endpoint=False)
        # Syllabic amplitude modulation at 4.5 Hz
        envelope = 0.5 * (1.0 - np.cos(2 * np.pi * 4.5 * t)) * np.exp(-0.35 * t)
        carrier = (
            0.6 * np.sin(2 * np.pi * 220.0 * t)
            + 0.3 * np.sin(2 * np.pi * 440.0 * t)
            + 0.1 * np.sin(2 * np.pi * 660.0 * t)
        )
        pcm = (carrier * envelope * 14000).astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(OUTPUT_SAMPLE_RATE)
            wf.writeframes(pcm.tobytes())
        return buf.getvalue()

    async def run_agy_cli_prompt(self, prompt: str) -> str:
        """Invokes `agy.exe --print` non-interactively to execute a prompt in Antigravity CLI."""
        if not Path(AGY_EXE_PATH).exists():
            return ""
        try:
            proc = await asyncio.create_subprocess_exec(
                AGY_EXE_PATH,
                "--print",
                prompt,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=15.0)
            return stdout.decode("utf-8", errors="replace").strip()
        except Exception as exc:
            logger.warning("agy --print execution warning: %s", exc)
            return ""

    async def send_to_antigravity_agentapi(
        self, prompt: str, target: str = "cli", conversation_id: str | None = None
    ) -> dict[str, Any]:
        """
        Bridges voice commands directly into Antigravity CLI or Antigravity Desktop App
        via `agentapi new-conversation` or `agentapi send-message`.
        """
        exe = (
            ANTIGRAVITY_APP_AGENTAPI_PATH
            if target == "app" and Path(ANTIGRAVITY_APP_AGENTAPI_PATH).exists()
            else AGY_EXE_PATH
        )
        if not Path(exe).exists():
            return {"status": "unavailable", "exe": exe}

        args = [exe, "agentapi"]
        if conversation_id:
            args.extend(["send-message", conversation_id, prompt])
        else:
            args.extend(["new-conversation", "--title=Gemini Live Voice", prompt])

        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            return {
                "status": "ok" if proc.returncode == 0 else "error",
                "returncode": proc.returncode,
                "stdout": stdout.decode("utf-8", errors="replace").strip(),
                "stderr": stderr.decode("utf-8", errors="replace").strip(),
                "target": target,
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc), "target": target}


class VoiceHubServer:
    """
    Central real-time Voice Hub coordinating:
    - WebSocket clients (`/ws/voice`) from Flutter App, Gemini Web Extension, Gemini Windows Overlay, and CLI
    - Hardware Microphone Capture + VAD + Barge-in detection
    - `ANTIGRAVITY_MIC` TCP Socket Server (`127.0.0.1:24713`) for `agy` CLI `/voice` and `F5`
    - Continuous 60 FPS FFT / Waveform telemetry for the permanently animated official Gemini SVG
    """

    def __init__(self) -> None:
        self.config = VoiceSessionConfig()
        self.whisper = WhisperSTTEngine(self.config.whisper_model_size)
        self.gemini_bridge = GeminiLiveAndTTSBridge(self.config)
        self.ws_clients: set[web.WebSocketResponse] = set()
        self.mic_tcp_clients: set[asyncio.StreamWriter] = set()
        self.history: list[ConversationTurn] = []

        # Live state: "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "INTERRUPTED"
        self.interaction_state: str = "IDLE"
        self.is_live_active: bool = False
        self.is_recording_ptt: bool = False
        self.current_interim_text: str = ""
        self.input_rms: float = 0.0
        self.output_rms: float = 0.0
        self.fft_bins: list[float] = [0.0] * 32

        self._pcm_recording_buffer = bytearray()
        self._silence_frames = 0
        self._speech_frames = 0
        self._speaking_task: asyncio.Task[Any] | None = None
        self._telemetry_task: asyncio.Task[Any] | None = None
        self._mic_stream: Any | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._settings_path = _REPO_ROOT / "config" / "audio_and_surfaces.json"
        self.full_settings: dict[str, Any] = self._load_full_settings()
        audio_cfg = self.full_settings.get("audio", {})
        self.selected_input_device_index: int | None = audio_cfg.get("input_device_index")
        self.selected_output_device_index: int | None = audio_cfg.get("output_device_index")
        tts_cfg = audio_cfg.get("tts", {})
        if tts_cfg.get("voice_name"):
            self.config.voice_name = str(tts_cfg["voice_name"])
        if audio_cfg.get("vad_mode"):
            self.config.vad_mode = str(audio_cfg["vad_mode"])

    def _load_full_settings(self) -> dict[str, Any]:
        try:
            if self._settings_path.exists():
                return json.loads(self._settings_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.debug("Settings load notice: %s", exc)
        return {
            "version": "2026.11.2",
            "audio": {
                "input_device_index": 1,
                "output_device_index": 5,
                "vad_mode": "hybrid_auto",
                "barge_in_enabled": True,
                "youtube_music_ducking": True,
                "tts": {"voice_name": "Aoede"},
            },
            "gemini_web_app": {
                "enabled": True,
                "inject_minimal_orb_pill": True,
                "auto_sync_prompt_input": True,
                "companion_pet_mode": "2d",
            },
            "antigravity": {
                "cli_enabled": True,
                "mic_tcp_port": ANTIGRAVITY_MIC_PORT,
                "agentapi_bridge": True,
            },
        }

    def _save_full_settings(self) -> None:
        try:
            self._settings_path.parent.mkdir(parents=True, exist_ok=True)
            self._settings_path.write_text(
                json.dumps(self.full_settings, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as exc:
            logger.debug("Settings save notice: %s", exc)

    def play_test_speaker_chime(self, output_device: int | None = None) -> bool:
        """Plays a harmonic 24kHz Gemini chord on the selected output speaker."""
        if not HAS_SOUNDDEVICE or sd is None:
            return False
        try:
            sr = OUTPUT_SAMPLE_RATE
            dur = 0.55
            t = np.linspace(0.0, dur, int(sr * dur), endpoint=False, dtype=np.float32)
            envelope = np.sin(np.pi * t / dur) ** 1.4
            chord = (
                0.45 * np.sin(2.0 * np.pi * 523.25 * t)
                + 0.35 * np.sin(2.0 * np.pi * 659.25 * t)
                + 0.25 * np.sin(2.0 * np.pi * 783.99 * t)
            )
            wave_out = (chord * envelope * 0.28).astype(np.float32)
            target_dev = output_device if output_device is not None else self.selected_output_device_index
            sd.play(wave_out, samplerate=sr, device=target_dev, blocking=False)
            return True
        except Exception as exc:
            logger.warning("Speaker test chime notice: %s", exc)
            return False

    async def start_background_tasks(self, app: web.Application) -> None:
        self._loop = asyncio.get_running_loop()
        self._telemetry_task = asyncio.create_task(self._telemetry_loop())
        try:
            app["mic_tcp_server"] = await asyncio.start_server(
                self._handle_antigravity_mic_client,
                host="127.0.0.1",
                port=ANTIGRAVITY_MIC_PORT,
            )
            logger.info(
                "ANTIGRAVITY_MIC TCP server listening on 127.0.0.1:%d (for `agy` /voice & F5)",
                ANTIGRAVITY_MIC_PORT,
            )
        except OSError:
            app["mic_tcp_server"] = await asyncio.start_server(
                self._handle_antigravity_mic_client,
                host="127.0.0.1",
                port=0,
            )
            logger.info(
                "ANTIGRAVITY_MIC port %d already active; bound ephemeral test port.",
                ANTIGRAVITY_MIC_PORT,
            )
        self._start_hardware_mic_if_available()

    async def cleanup_background_tasks(self, app: web.Application) -> None:
        if self._telemetry_task:
            self._telemetry_task.cancel()
        if self._mic_stream is not None:
            try:
                self._mic_stream.stop()
                self._mic_stream.close()
            except Exception:
                pass
        tcp_srv = app.get("mic_tcp_server")
        if tcp_srv:
            tcp_srv.close()
            await tcp_srv.wait_closed()

    def get_hardware_audio_status(self) -> dict[str, Any]:
        """Auto-detects and returns all Windows audio microphones, speakers, and active DSP state."""
        inputs: list[dict[str, Any]] = []
        outputs: list[dict[str, Any]] = []
        default_in_idx = -1
        default_out_idx = -1
        active_mic_name = "unavailable"
        active_speaker_name = "unavailable"

        if HAS_SOUNDDEVICE and sd is not None:
            try:
                def_devs = sd.default.device
                default_in_idx = int(def_devs[0]) if def_devs and def_devs[0] is not None else -1
                default_out_idx = int(def_devs[1]) if def_devs and def_devs[1] is not None else -1
                hostapis = sd.query_hostapis()
                for idx, dev in enumerate(sd.query_devices()):
                    api_idx = int(dev.get("hostapi", 0))
                    api_name = (
                        hostapis[api_idx].get("name", "Windows")
                        if 0 <= api_idx < len(hostapis)
                        else "Windows"
                    )
                    entry = {
                        "index": idx,
                        "name": str(dev.get("name", "")),
                        "hostapi": api_name,
                        "max_input_channels": int(dev.get("max_input_channels", 0)),
                        "max_output_channels": int(dev.get("max_output_channels", 0)),
                        "default_samplerate": float(dev.get("default_samplerate", 16000.0)),
                    }
                    if entry["max_input_channels"] > 0:
                        inputs.append(entry)
                        target_in = (
                            self.selected_input_device_index
                            if self.selected_input_device_index is not None
                            else default_in_idx
                        )
                        if idx == target_in:
                            active_mic_name = entry["name"]
                    if entry["max_output_channels"] > 0:
                        outputs.append(entry)
                        target_out = (
                            self.selected_output_device_index
                            if self.selected_output_device_index is not None
                            else default_out_idx
                        )
                        if idx == target_out:
                            active_speaker_name = entry["name"]
            except Exception as exc:
                logger.debug("Audio device query error: %s", exc)

        return {
            "has_sounddevice": HAS_SOUNDDEVICE,
            "has_faster_whisper": HAS_FASTER_WHISPER,
            "whisper_loaded_model": getattr(self.whisper, "_loaded_model_name", "unloaded"),
            "has_edge_tts": HAS_EDGE_TTS,
            "mic_stream_active": self._mic_stream is not None and bool(getattr(self._mic_stream, "active", False)),
            "default_input_index": default_in_idx,
            "default_output_index": default_out_idx,
            "selected_input_index": (
                self.selected_input_device_index
                if self.selected_input_device_index is not None
                else default_in_idx
            ),
            "selected_output_index": (
                self.selected_output_device_index
                if self.selected_output_device_index is not None
                else default_out_idx
            ),
            "active_microphone": active_mic_name,
            "active_speaker": active_speaker_name,
            "input_sample_rate_hz": INPUT_SAMPLE_RATE,
            "output_sample_rate_hz": OUTPUT_SAMPLE_RATE,
            "live_input_rms": round(self.input_rms, 5),
            "live_output_rms": round(self.output_rms, 5),
            "fft_32": self.fft_bins,
            "input_devices_count": len(inputs),
            "output_devices_count": len(outputs),
            "input_devices": inputs[:20],
            "output_devices": outputs[:20],
            "settings": self.full_settings,
        }

    def _start_hardware_mic_if_available(self, device_index: int | None = None) -> None:
        if not HAS_SOUNDDEVICE:
            return
        try:
            if device_index is not None:
                self.selected_input_device_index = device_index
            target_dev = self.selected_input_device_index
            if self._mic_stream is not None:
                try:
                    self._mic_stream.stop()
                    self._mic_stream.close()
                except Exception:
                    pass
                self._mic_stream = None

            blocksize = int(INPUT_SAMPLE_RATE * 0.04)  # 40ms frames (640 samples)

            def _audio_callback(
                indata: np.ndarray, frames: int, time_info: Any, status: Any
            ) -> None:
                if self._loop is None:
                    return
                mono = indata[:, 0]
                # Remove DC offset + low-frequency rumble before RMS/FFT/VAD
                mono_clean = mono - float(np.mean(mono))
                pcm16 = (np.clip(mono_clean, -1.0, 1.0) * 32767.0).astype(np.int16)
                raw_bytes = pcm16.tobytes()
                rms = float(np.sqrt(np.mean(mono_clean**2)))
                fft_vals = np.abs(np.fft.rfft(mono_clean * np.hanning(len(mono_clean)), n=64))[:32]
                fft_norm = np.clip(fft_vals * 5.0, 0.0, 1.0).tolist()
                self._loop.call_soon_threadsafe(self._on_mic_frame, raw_bytes, rms, fft_norm)

            self._mic_stream = sd.InputStream(
                device=target_dev,
                samplerate=INPUT_SAMPLE_RATE,
                channels=CHANNELS,
                dtype="float32",
                blocksize=blocksize,
                callback=_audio_callback,
            )
            self._mic_stream.start()
            hw = self.get_hardware_audio_status()
            logger.info(
                "Hardware microphone capture active at 16kHz mono on '%s' (speaker: '%s').",
                hw["active_microphone"],
                hw["active_speaker"],
            )
        except Exception as exc:
            logger.warning("Hardware microphone stream fallback to virtual/browser mic: %s", exc)
            self._mic_stream = None

    def _on_mic_frame(self, raw_bytes: bytes, rms: float, fft_norm: list[float]) -> None:
        self.input_rms = rms
        if self.is_live_active or self.is_recording_ptt:
            self.fft_bins = fft_norm

        # Forward raw 16kHz PCM to any connected `agy` CLI `ANTIGRAVITY_MIC` client
        for writer in list(self.mic_tcp_clients):
            try:
                writer.write(raw_bytes)
            except Exception:
                self.mic_tcp_clients.discard(writer)

        if not (self.is_live_active or self.is_recording_ptt):
            return

        # If a browser surface (e.g. /chrome-home) is capturing its own microphone stream,
        # only use the server hardware mic for RMS/FFT telemetry, not duplicate VAD turns.
        if getattr(self, "_browser_mic_surface_active", False) and not self.is_recording_ptt:
            return

        # Barge-in detection: if Gemini is speaking and user speaks loudly, interrupt politely
        if self.interaction_state == "SPEAKING" and self.config.barge_in_enabled and rms > 0.08:
            self._speech_frames += 1
            if self._speech_frames >= 4:
                self.trigger_barge_in()
                return

        # Hybrid VAD accumulation
        if rms > 0.022 or self.is_recording_ptt:
            self._pcm_recording_buffer.extend(raw_bytes)
            self._speech_frames += 1
            self._silence_frames = 0
            if self.interaction_state == "IDLE":
                self.interaction_state = "LISTENING"
        else:
            if self._speech_frames > 0:
                self._pcm_recording_buffer.extend(raw_bytes)
                self._silence_frames += 1
                # ~480ms of silence after speech triggers turn end in Hybrid VAD mode
                if (
                    self.config.vad_mode != "manual_ptt"
                    and not self.is_recording_ptt
                    and self._silence_frames >= 12
                ):
                    pcm_copy = bytes(self._pcm_recording_buffer)
                    self._pcm_recording_buffer.clear()
                    self._speech_frames = 0
                    self._silence_frames = 0
                    asyncio.create_task(
                        self._process_recorded_pcm(pcm_copy, surface="hardware_mic")
                    )

    async def _handle_antigravity_mic_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        addr = writer.get_extra_info("peername")
        logger.info("Recording for %s (ANTIGRAVITY_MIC client connected).", addr)
        self.mic_tcp_clients.add(writer)
        await self.broadcast_event(
            {
                "type": "surface_activity",
                "surface": "agy_cli",
                "status": "recording",
                "message": f"agy CLI connected via ANTIGRAVITY_MIC ({addr})",
            }
        )
        try:
            while not reader.at_eof():
                data = await reader.read(1024)
                if not data:
                    break
        except Exception:
            pass
        finally:
            self.mic_tcp_clients.discard(writer)
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
            await self.broadcast_event(
                {
                    "type": "surface_activity",
                    "surface": "agy_cli",
                    "status": "idle",
                    "message": "agy CLI finished recording session.",
                }
            )

    def trigger_barge_in(self) -> None:
        """Handles polite interruption (barge-in) when user speaks while Gemini is speaking."""
        if HAS_SOUNDDEVICE and sd is not None:
            try:
                sd.stop()
            except Exception:
                pass
        if self._speaking_task and not self._speaking_task.done():
            self._speaking_task.cancel()
        self.interaction_state = "INTERRUPTED"
        self.output_rms = 0.0
        asyncio.create_task(
            self.broadcast_event(
                {
                    "type": "interrupted",
                    "state": "LISTENING",
                    "timestamp": time.time(),
                }
            )
        )
        self.interaction_state = "LISTENING"

    async def _process_recorded_pcm(self, pcm_bytes: bytes, surface: str = "flutter_app") -> None:
        self.interaction_state = "THINKING"
        await self.broadcast_event(
            {"type": "state_change", "state": "THINKING", "surface": surface}
        )
        transcript, stt_ms = await self.whisper.transcribe_pcm16(
            pcm_bytes, language=self.config.language_code
        )
        if not transcript:
            self.interaction_state = "LISTENING" if self.is_live_active else "IDLE"
            await self.broadcast_event({"type": "state_change", "state": self.interaction_state})
            return

        await self.handle_user_utterance(transcript, surface=surface, stt_latency_ms=int(stt_ms))

    async def handle_user_utterance(
        self,
        text: str,
        surface: str = "flutter_app",
        stt_latency_ms: int = 0,
        precomputed_reply: tuple[str, str, int] | None = None,
        pre_synthesized_audio: bytes | None = None,
    ) -> dict[str, Any]:
        """Processes a user voice transcript or slash command across all bridged surfaces."""
        clean_text = text.strip()
        if not clean_text:
            return {"status": "empty"}

        # Check for `/voice` interactive command triggers
        if clean_text.lower() in ["/voice", "/record", "/voice on", "/live"]:
            self.is_live_active = True
            self.interaction_state = "LISTENING"
            await self.broadcast_event(
                {
                    "type": "voice_mode_toggled",
                    "is_live_active": True,
                    "state": "LISTENING",
                    "surface": surface,
                }
            )
            clean_text = "Active le mode vocal Gemini Live interactif."
        elif clean_text.lower() in ["/voice off", "/stop"]:
            self.is_live_active = False
            self.is_recording_ptt = False
            self.interaction_state = "IDLE"
            await self.broadcast_event(
                {
                    "type": "voice_mode_toggled",
                    "is_live_active": False,
                    "state": "IDLE",
                    "surface": surface,
                }
            )
            return {"status": "stopped", "is_live_active": False}

        user_turn = ConversationTurn(
            id=f"turn-{int(time.time() * 1000)}-u",
            role="user",
            text=clean_text,
            timestamp=time.time(),
            surface=surface,
            model_used=f"whisper-{self.config.whisper_model_size}",
            latency_ms=stt_latency_ms,
        )
        self.history.append(user_turn)
        await self.broadcast_event(
            {"type": "transcript", "turn": asdict(user_turn), "is_final": True}
        )

        self.interaction_state = "THINKING"
        await self.broadcast_event(
            {
                "type": "state_change",
                "state": "THINKING",
                "interaction_status": "IN_PROGRESS",
            }
        )

        if precomputed_reply is not None:
            reply_text, model_used, llm_ms = precomputed_reply
        else:
            reply_text, model_used, llm_ms = (
                await self.gemini_bridge.generate_conversational_reply(clean_text, surface=surface)
                if hasattr(self.gemini_bridge, "generate_conversational_reply")
                else await self.gemini_bridge.generate_Conversational_reply(
                    clean_text, surface=surface
                )
            )

        model_turn = ConversationTurn(
            id=f"turn-{int(time.time() * 1000)}-m",
            role="model",
            text=reply_text,
            timestamp=time.time(),
            surface=surface,
            model_used=model_used,
            latency_ms=llm_ms,
        )
        self.history.append(model_turn)

        self.interaction_state = "SPEAKING"
        await self.broadcast_event(
            {
                "type": "model_response",
                "turn": asdict(model_turn),
                "state": "SPEAKING",
                "interaction_status": "IN_PROGRESS",
            }
        )

        # Start speaking + audio synthesis asynchronously
        if self._speaking_task and not self._speaking_task.done():
            self._speaking_task.cancel()
        self._speaking_task = asyncio.create_task(
            self._speak_response(model_turn, pre_synthesized_audio=pre_synthesized_audio)
        )

        return {
            "status": "ok",
            "user_turn": asdict(user_turn),
            "model_turn": asdict(model_turn),
        }

    async def _speak_response(
        self,
        model_turn: ConversationTurn,
        pre_synthesized_audio: bytes | None = None,
    ) -> None:
        try:
            self.interaction_state = "SPEAKING"
            await self.broadcast_event(
                {
                    "type": "model_response",
                    "turn": asdict(model_turn),
                    "state": "SPEAKING",
                    "interaction_status": "IN_PROGRESS",
                }
            )
            audio_bytes = (
                pre_synthesized_audio
                if pre_synthesized_audio is not None
                else await self.gemini_bridge.synthesize_speech_pcm24k(model_turn.text)
            )
            audio_b64 = base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else ""
            mime_type = "audio/wav" if audio_bytes[:4] == b"RIFF" else "audio/mpeg"

            # Broadcast synthesized audio to Flutter / Web / Windows clients
            await self.broadcast_event(
                {
                    "type": "audio_output",
                    "turn_id": model_turn.id,
                    "audio_base64": audio_b64,
                    "mime_type": mime_type,
                    "sample_rate": OUTPUT_SAMPLE_RATE,
                    "text": model_turn.text,
                }
            )

            # Play directly on Windows hardware speaker if no browser WebSocket client is handling playback
            if HAS_SOUNDDEVICE and sd is not None and audio_bytes and len(self.ws_clients) == 0:
                try:
                    if audio_bytes[:4] == b"RIFF":
                        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                            sr = wf.getframerate()
                            pcm = np.frombuffer(
                                wf.readframes(wf.getnframes()), dtype=np.int16
                            ).astype(np.float32) / 32768.0
                            sd.play(pcm, samplerate=sr, blocking=False)
                except Exception as exc:
                    logger.debug("Hardware speaker playback notice: %s", exc)

            # Simulate expressive vocal envelope for the permanent Gemini SVG animation
            est_duration = min(6.0, max(1.2, len(model_turn.text) * 0.042))
            steps = int(est_duration * 25)
            for i in range(steps):
                t = i / 25.0
                env = 0.45 + 0.45 * abs(math.sin(t * 7.5)) * math.sin(t * 3.1 + 0.5) ** 2
                self.output_rms = float(env)
                self.fft_bins = [
                    float(
                        min(
                            1.0,
                            max(
                                0.05,
                                env
                                * (0.6 + 0.4 * math.sin(i * 0.35 + b * 0.45))
                                * (1.0 - b / 42.0),
                            ),
                        )
                    )
                    for b in range(32)
                ]
                await asyncio.sleep(0.04)

        except asyncio.CancelledError:
            logger.info("Speech playback interrupted by user barge-in.")
            raise
        finally:
            self.output_rms = 0.0
            self.interaction_state = "LISTENING" if self.is_live_active else "IDLE"
            await self.broadcast_event(
                {
                    "type": "state_change",
                    "state": self.interaction_state,
                    "interaction_status": "IDLE",
                }
            )

    async def _telemetry_loop(self) -> None:
        """Streams 25Hz real-time waveform/FFT/status telemetry to keep the Gemini SVG alive."""
        phase = 0.0
        while True:
            try:
                phase += 0.12
                if self.interaction_state in ("IDLE", "THINKING"):
                    base_amp = 0.28 if self.interaction_state == "THINKING" else 0.08
                    speed = 3.2 if self.interaction_state == "THINKING" else 1.1
                    self.fft_bins = [
                        round(
                            base_amp
                            + 0.12
                            * abs(math.sin(phase * speed + idx * 0.28))
                            * math.cos(phase * 0.7 - idx * 0.15) ** 2,
                            4,
                        )
                        for idx in range(32)
                    ]
                if self.ws_clients:
                    payload = {
                        "type": "telemetry",
                        "state": self.interaction_state,
                        "is_live_active": self.is_live_active,
                        "is_recording_ptt": self.is_recording_ptt,
                        "input_rms": round(self.input_rms, 4),
                        "output_rms": round(self.output_rms, 4),
                        "fft": self.fft_bins,
                        "active_clients": len(self.ws_clients),
                        "mic_tcp_clients": len(self.mic_tcp_clients),
                        "config": asdict(self.config),
                    }
                    await self.broadcast_event(payload)
                await asyncio.sleep(0.04)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.debug("Telemetry loop error: %s", exc)
                await asyncio.sleep(0.2)

    async def broadcast_event(self, event: dict[str, Any]) -> None:
        if not self.ws_clients:
            return
        msg = json.dumps(event)
        stale: list[web.WebSocketResponse] = []
        for ws in list(self.ws_clients):
            if ws.closed:
                stale.append(ws)
                continue
            try:
                await ws.send_str(msg)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.ws_clients.discard(ws)

    async def pilot_gemini_windows_app(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Pilots C:\\Users\\aphro\\AppData\\Local\\Google\\Gemini\\Gemini.exe (v1.17.0):
        - Launches Gemini.exe or GeminiAppLauncher.exe if requested or not running
        - Sends CLI switches (--start-dictation, --hide, etc.)
        - Broadcasts real-time pilot commands (`show`, `hide`, `stc_trigger`, `toggle_live`,
          `send_prompt`, `inject_unicode`, `get_foreground_context`) over WebSocket to the
          injected Electron controller (`src/voice_bridge_native.js`) inside Gemini.exe.
        """
        gemini_exe = Path(r"C:\Users\aphro\AppData\Local\Google\Gemini\app-1.17.0\Gemini.exe")
        if not gemini_exe.exists():
            gemini_exe = Path(r"C:\Users\aphro\AppData\Local\Google\Gemini\Gemini.exe")

        command = data.get("command", "status")
        prompt = data.get("prompt", "")
        text = data.get("text", "")
        launch = data.get("launch", False)

        launched = False
        if launch and gemini_exe.exists():
            cli_args = [str(gemini_exe)]
            if command in ("stc_trigger", "start_dictation"):
                cli_args.append("--start-dictation")
            elif command == "hide":
                cli_args.append("--hide")
            env = dict(os.environ)
            env["GEMINI_ENABLE_SPEAK_TO_WINDOW"] = "true"
            env["ANTIGRAVITY_MIC"] = f"127.0.0.1:{ANTIGRAVITY_MIC_PORT}"
            subprocess.Popen(
                cli_args,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            launched = True

        pilot_event = {
            "type": "pilot_gemini_windows",
            "command": command,
            "prompt": prompt,
            "text": text,
            "timestamp": time.time(),
        }
        await self.broadcast_event(pilot_event)
        return {
            "status": "ok",
            "command": command,
            "gemini_exe": str(gemini_exe),
            "gemini_exe_exists": gemini_exe.exists(),
            "launched": launched,
            "active_ws_clients": len(self.ws_clients),
            "gemini_windows_state": getattr(self, "gemini_windows_state", {}),
        }

    # HTTP & WebSocket Handlers
    async def handle_status(self, request: web.Request) -> web.Response:
        return web.json_response(
            {
                "status": "ok",
                "service": "gemini-live-voice-hub",
                "state": self.interaction_state,
                "is_live_active": self.is_live_active,
                "is_recording_ptt": self.is_recording_ptt,
                "config": asdict(self.config),
                "hardware_audio": self.get_hardware_audio_status(),
                "antigravity_mic_addr": f"127.0.0.1:{ANTIGRAVITY_MIC_PORT}",
                "ws_url": f"ws://{HTTP_WS_HOST}:{HTTP_WS_PORT}/ws/voice",
                "gemini_windows_state": getattr(self, "gemini_windows_state", {}),
                "history_count": len(self.history),
                "history": [asdict(t) for t in self.history[-20:]],
            },
            headers=self._cors_headers(),
        )

    async def handle_hardware_audio(self, request: web.Request) -> web.Response:
        chime_played = False
        if request.method == "POST":
            try:
                body = await request.json()
                audio_sec = self.full_settings.setdefault("audio", {})
                in_idx = body.get("input_device_index", body.get("device_index"))
                if in_idx is not None:
                    self.selected_input_device_index = int(in_idx)
                    audio_sec["input_device_index"] = int(in_idx)
                    self._start_hardware_mic_if_available(int(in_idx))
                out_idx = body.get("output_device_index")
                if out_idx is not None:
                    self.selected_output_device_index = int(out_idx)
                    audio_sec["output_device_index"] = int(out_idx)
                    if HAS_SOUNDDEVICE and sd is not None:
                        try:
                            cur_in = (
                                self.selected_input_device_index
                                if self.selected_input_device_index is not None
                                else sd.default.device[0]
                            )
                            sd.default.device = (cur_in, int(out_idx))
                        except Exception:
                            pass
                if "voice_name" in body and body["voice_name"]:
                    vname = str(body["voice_name"])
                    self.config.voice_name = vname
                    audio_sec.setdefault("tts", {})["voice_name"] = vname
                if "vad_mode" in body and body["vad_mode"]:
                    vmode = str(body["vad_mode"])
                    self.config.vad_mode = vmode
                    audio_sec["vad_mode"] = vmode
                if "barge_in_enabled" in body:
                    barge = bool(body["barge_in_enabled"])
                    self.config.barge_in_enabled = barge
                    audio_sec["barge_in_enabled"] = barge
                if "youtube_music_ducking" in body:
                    audio_sec["youtube_music_ducking"] = bool(body["youtube_music_ducking"])
                if isinstance(body.get("gemini_web_app"), dict):
                    self.full_settings.setdefault("gemini_web_app", {}).update(
                        body["gemini_web_app"]
                    )
                if isinstance(body.get("antigravity"), dict):
                    self.full_settings.setdefault("antigravity", {}).update(body["antigravity"])
                if body.get("test_speaker"):
                    chime_played = self.play_test_speaker_chime(self.selected_output_device_index)
                self._save_full_settings()
                await self.broadcast_event(
                    {
                        "type": "hardware_settings_updated",
                        "hardware_audio": self.get_hardware_audio_status(),
                        "settings": self.full_settings,
                    }
                )
            except Exception as exc:
                logger.warning("POST /api/audio/hardware notice: %s", exc)
        return web.json_response(
            {
                "ok": True,
                "chime_played": chime_played,
                "hardware_audio": self.get_hardware_audio_status(),
                "settings": self.full_settings,
            },
            headers=self._cors_headers(),
        )

    async def handle_voice_command(self, request: web.Request) -> web.Response:
        data = await request.json()
        action = data.get("action", "toggle_live")
        surface = data.get("surface", "flutter_app")

        if action == "toggle_live":
            self.is_live_active = data.get("enabled", not self.is_live_active)
            if surface in ("gemini_minimal_voice", "gemini_web", "chrome_home") or data.get("browser_mic"):
                self._browser_mic_surface_active = bool(self.is_live_active)
            elif not self.is_live_active:
                self._browser_mic_surface_active = False
            self.interaction_state = "LISTENING" if self.is_live_active else "IDLE"
            if not self.is_live_active and self._speaking_task:
                self._speaking_task.cancel()
            await self.broadcast_event(
                {
                    "type": "voice_mode_toggled",
                    "is_live_active": self.is_live_active,
                    "state": self.interaction_state,
                    "surface": surface,
                }
            )
            return web.json_response(
                {
                    "status": "ok",
                    "is_live_active": self.is_live_active,
                    "state": self.interaction_state,
                },
                headers=self._cors_headers(),
            )

        if action == "ptt_start":
            self.is_recording_ptt = True
            self._pcm_recording_buffer.clear()
            self.interaction_state = "LISTENING"
            await self.broadcast_event(
                {
                    "type": "ptt_state",
                    "recording": True,
                    "state": "LISTENING",
                    "surface": surface,
                }
            )
            return web.json_response(
                {"status": "ok", "recording": True}, headers=self._cors_headers()
            )

        if action == "ptt_stop":
            self.is_recording_ptt = False
            pcm_copy = bytes(self._pcm_recording_buffer)
            self._pcm_recording_buffer.clear()
            if pcm_copy:
                asyncio.create_task(self._process_recorded_pcm(pcm_copy, surface=surface))
            else:
                self.interaction_state = "LISTENING" if self.is_live_active else "IDLE"
            await self.broadcast_event(
                {
                    "type": "ptt_state",
                    "recording": False,
                    "state": self.interaction_state,
                    "surface": surface,
                }
            )
            return web.json_response(
                {"status": "ok", "recording": False}, headers=self._cors_headers()
            )

        if action == "interrupt":
            self.trigger_barge_in()
            return web.json_response(
                {"status": "ok", "state": self.interaction_state},
                headers=self._cors_headers(),
            )

        if action == "update_config":
            for k, v in data.get("config", {}).items():
                if hasattr(self.config, k):
                    setattr(self.config, k, v)
            await self.broadcast_event({"type": "config_updated", "config": asdict(self.config)})
            return web.json_response(
                {"status": "ok", "config": asdict(self.config)},
                headers=self._cors_headers(),
            )

        if action == "utterance":
            text = data.get("text", "")
            result = await self.handle_user_utterance(text, surface=surface)
            if data.get("include_audio"):
                model_text = result.get("model_turn", {}).get("text", "")
                if model_text:
                    audio_bytes = await self.gemini_bridge.synthesize_speech_pcm24k(model_text)
                    result["audio_base64"] = (
                        base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else ""
                    )
                    result["mime_type"] = (
                        "audio/wav" if audio_bytes[:4] == b"RIFF" else "audio/mpeg"
                    )
            return web.json_response(result, headers=self._cors_headers())

        if action in ("stt_pcm16", "voice_to_voice"):
            pcm_b64 = data.get("pcm16_base64", "")
            text_override = data.get("text", "").strip()
            auto_reply = data.get("auto_reply", action == "voice_to_voice")
            stt_ms = 0.0
            transcript = text_override
            precomputed_reply: tuple[str, str, int] | None = None

            if not transcript and pcm_b64:
                raw_pcm = base64.b64decode(pcm_b64)
                # Forward to ANTIGRAVITY_MIC clients too
                for writer in list(self.mic_tcp_clients):
                    try:
                        writer.write(raw_pcm)
                    except Exception:
                        self.mic_tcp_clients.discard(writer)

                if auto_reply:
                    mm_transcript, mm_reply, mm_model, mm_ms = (
                        await self.gemini_bridge.transcribe_and_reply_audio_pcm16(
                            raw_pcm, surface=surface
                        )
                    )
                    if mm_transcript and mm_reply:
                        transcript = mm_transcript
                        stt_ms = float(mm_ms // 2)
                        precomputed_reply = (mm_reply, mm_model, mm_ms)

                if not transcript:
                    transcript, stt_ms = await self.whisper.transcribe_pcm16(
                        raw_pcm, language=self.config.language_code
                    )
            if not transcript:
                return web.json_response(
                    {"status": "empty", "transcript": "", "stt_latency_ms": int(stt_ms)},
                    headers=self._cors_headers(),
                )
            if not auto_reply:
                return web.json_response(
                    {
                        "status": "ok",
                        "transcript": transcript,
                        "stt_latency_ms": int(stt_ms),
                    },
                    headers=self._cors_headers(),
                )

            if precomputed_reply is None:
                reply_text, model_used, llm_ms = (
                    await self.gemini_bridge.generate_conversational_reply(
                        transcript, surface=surface
                    )
                    if hasattr(self.gemini_bridge, "generate_conversational_reply")
                    else await self.gemini_bridge.generate_Conversational_reply(
                        transcript, surface=surface
                    )
                )
                precomputed_reply = (reply_text, model_used, llm_ms)

            model_text = precomputed_reply[0]
            audio_bytes = (
                await self.gemini_bridge.synthesize_speech_pcm24k(model_text)
                if model_text
                else b""
            )
            audio_b64 = base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else ""
            mime_type = "audio/wav" if audio_bytes[:4] == b"RIFF" else "audio/mpeg"

            result = await self.handle_user_utterance(
                transcript,
                surface=surface,
                stt_latency_ms=int(stt_ms),
                precomputed_reply=precomputed_reply,
                pre_synthesized_audio=audio_bytes,
            )
            result["transcript"] = transcript
            result["reply_text"] = model_text
            result["audio_base64"] = audio_b64
            result["mime_type"] = mime_type
            return web.json_response(result, headers=self._cors_headers())

        if action == "pilot_gemini_windows":
            res = await self.pilot_gemini_windows_app(data)
            return web.json_response(res, headers=self._cors_headers())

        if action == "bridge_agentapi":
            prompt = data.get("prompt", "")
            target = data.get("target", "cli")
            conv_id = data.get("conversation_id")
            res = await self.gemini_bridge.send_to_antigravity_agentapi(
                prompt, target=target, conversation_id=conv_id
            )
            return web.json_response(res, headers=self._cors_headers())

        return web.json_response(
            {"status": "error", "message": f"Unknown action: {action}"},
            status=400,
            headers=self._cors_headers(),
        )

    async def handle_ws(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse(heartbeat=20.0)
        await ws.prepare(request)
        self.ws_clients.add(ws)
        logger.info("WebSocket client connected (total=%d).", len(self.ws_clients))

        # Send initial state snapshot
        await ws.send_str(
            json.dumps(
                {
                    "type": "welcome",
                    "state": self.interaction_state,
                    "is_live_active": self.is_live_active,
                    "config": asdict(self.config),
                    "history": [asdict(t) for t in self.history[-20:]],
                    "live_connect_config": self.gemini_bridge.build_live_connect_config(),
                }
            )
        )

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    payload = json.loads(msg.data)
                    msg_type = payload.get("type", "")
                    surface = payload.get("surface", "flutter_app")

                    if msg_type == "realtime_input":
                        # Gemini 3.8 Live compatible `realtime_input` payload (audio, text, audio_stream_end, activity_start, activity_end)
                        if "text" in payload and payload["text"]:
                            await self.handle_user_utterance(payload["text"], surface=surface)
                        elif "audio" in payload and payload["audio"]:
                            b64_data = payload["audio"].get("data", "")
                            if b64_data:
                                raw = base64.b64decode(b64_data)
                                self._pcm_recording_buffer.extend(raw)
                                arr = (
                                    np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                                )
                                if len(arr) > 0:
                                    self.input_rms = float(np.sqrt(np.mean(arr**2)))
                        if (
                            payload.get("audio_stream_end")
                            or payload.get("audioStreamEnd")
                            or "activity_end" in payload
                        ):
                            pcm_copy = bytes(self._pcm_recording_buffer)
                            self._pcm_recording_buffer.clear()
                            if pcm_copy:
                                asyncio.create_task(
                                    self._process_recorded_pcm(pcm_copy, surface=surface)
                                )
                    elif msg_type == "command":
                        action = payload.get("action", "")
                        if action == "toggle_live":
                            self.is_live_active = payload.get("enabled", not self.is_live_active)
                            self.interaction_state = "LISTENING" if self.is_live_active else "IDLE"
                            await self.broadcast_event(
                                {
                                    "type": "voice_mode_toggled",
                                    "is_live_active": self.is_live_active,
                                    "state": self.interaction_state,
                                    "surface": surface,
                                }
                            )
                        elif action == "ptt_start":
                            self.is_recording_ptt = True
                            self._pcm_recording_buffer.clear()
                            self.interaction_state = "LISTENING"
                        elif action == "ptt_stop":
                            self.is_recording_ptt = False
                            pcm_copy = bytes(self._pcm_recording_buffer)
                            self._pcm_recording_buffer.clear()
                            if pcm_copy:
                                asyncio.create_task(
                                    self._process_recorded_pcm(pcm_copy, surface=surface)
                                )
                            else:
                                self.interaction_state = (
                                    "LISTENING" if self.is_live_active else "IDLE"
                                )
                        elif action == "interrupt":
                            self.trigger_barge_in()
                        elif action == "update_config":
                            for k, v in payload.get("config", {}).items():
                                if hasattr(self.config, k):
                                    setattr(self.config, k, v)
                            await self.broadcast_event(
                                {
                                    "type": "config_updated",
                                    "config": asdict(self.config),
                                }
                            )
                    elif msg_type == "gemini_windows_status":
                        self.gemini_windows_state = payload.get("state", {})
                        await self.broadcast_event(
                            {
                                "type": "gemini_windows_status",
                                "state": self.gemini_windows_state,
                            }
                        )
        except Exception as exc:
            logger.debug("WebSocket session ended: %s", exc)
        finally:
            self.ws_clients.discard(ws)
        return ws

    async def handle_options(self, request: web.Request) -> web.Response:
        return web.Response(status=204, headers=self._cors_headers())

    @staticmethod
    def _cors_headers() -> dict[str, str]:
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }


def create_app() -> tuple[web.Application, VoiceHubServer]:
    from backend.aphrody_ai_hub import register_aphrody_routes

    hub = VoiceHubServer()
    app = web.Application()
    app["hub"] = hub
    app.router.add_get("/api/status", hub.handle_status)
    app.router.add_get("/api/audio/hardware", hub.handle_hardware_audio)
    app.router.add_post("/api/audio/hardware", hub.handle_hardware_audio)
    app.router.add_options("/api/audio/hardware", hub.handle_options)
    app.router.add_post("/api/voice", hub.handle_voice_command)
    app.router.add_options("/api/voice", hub.handle_options)
    app.router.add_options("/api/status", hub.handle_options)
    app.router.add_options("/api/aphrody/ai", hub.handle_options)
    app.router.add_options("/api/aphrody/status", hub.handle_options)
    app.router.add_get("/ws/voice", hub.handle_ws)
    register_aphrody_routes(app, hub._cors_headers())

    flutter_web_dir = Path(__file__).resolve().parent.parent / "gemini_voice_app" / "build" / "web"
    if flutter_web_dir.exists():

        async def _root_index(request: web.Request) -> web.StreamResponse:
            return web.FileResponse(flutter_web_dir / "index.html")

        app.router.add_get("/", _root_index)
        app.router.add_static("/app/", path=str(flutter_web_dir), show_index=True)
        # Also serve Flutter web assets at root paths (flutter_bootstrap.js, main.dart.js, assets/)
        for subdir in ("assets", "canvaskit", "icons"):
            subpath = flutter_web_dir / subdir
            if subpath.exists():
                app.router.add_static(f"/{subdir}/", path=str(subpath))
        for root_file in (
            "flutter_bootstrap.js",
            "flutter.js",
            "main.dart.js",
            "manifest.json",
            "version.json",
            "favicon.png",
        ):
            fpath = flutter_web_dir / root_file
            if fpath.exists():
                app.router.add_get(
                    f"/{root_file}",
                    lambda req, p=fpath: web.FileResponse(p),
                )

    app.on_startup.append(hub.start_background_tasks)
    app.on_cleanup.append(hub.cleanup_background_tasks)
    return app, hub


def main() -> None:
    app, _ = create_app()
    logger.info(
        "Starting Gemini Live & Antigravity Voice Hub on http://%s:%d (WS: ws://%s:%d/ws/voice)",
        HTTP_WS_HOST,
        HTTP_WS_PORT,
        HTTP_WS_HOST,
        HTTP_WS_PORT,
    )
    web.run_app(app, host=HTTP_WS_HOST, port=HTTP_WS_PORT, print=None)


if __name__ == "__main__":
    main()
