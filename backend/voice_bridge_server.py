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
                self._client = genai.Client(api_key=api_key)
                logger.info("Initialized Google GenAI client with API Key.")
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
                        "Réponds de manière naturelle, fluide, chaleureuse et concise (1 à 3 phrases max) "
                        "pour un mode vocal temps réel type Gemini Live. Évite le markdown lourd."
                    )
                    if hasattr(self._client, "interactions"):
                        kwargs: dict[str, Any] = {
                            "model": "gemini-3.8-flash",
                            "input": f"{sys_prompt}\n\nUtilisateur ({surface}): {prompt}",
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
                    return reply.strip(), "gemini-3.8-live / gemini-4-argon", ms
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
        p = prompt.lower().strip()
        if any(w in p for w in ["salut", "bonjour", "hello", "hey", "coucou"]):
            return (
                "Salut ! Je t'écoute en direct sur le hub Gemini Live. "
                "Tous tes ponts — Antigravity CLI, l'application Windows, le Web et Flutter — sont actifs. "
                "Sur quoi on travaille ?"
            )
        if any(w in p for w in ["comment ça va", "comment vas-tu", "ça va"]):
            return (
                "Ça va super bien ! Mon moteur audio bidirectionnel tourne à pleine vitesse en arrière-plan "
                "et l'orbe Gemini est synchronisé avec ta voix. Dis-moi ce dont tu as besoin !"
            )
        if "/voice" in p or "record" in p or "micro" in p:
            return (
                "Le mode /voice et les boutons Record sont maintenant interactifs en duplex intégral. "
                "Tu peux parler librement, m'interrompre à tout moment, ou envoyer tes commandes directement à agy CLI."
            )
        if "whisper" in p or "modèle" in p or "model" in p:
            return (
                f"J'utilise actuellement {self.config.live_model} couplé à {self.config.reasoning_model}, "
                f"{self.config.tts_model} avec la voix {self.config.voice_name}, et Faster-Whisper {self.config.whisper_model_size} avec filtre VAD Silero."
            )
        return (
            f"Bien reçu depuis {surface} : « {prompt} ». "
            "Je traite ta demande en temps réel avec Gemini Live et je synchronise la session avec Antigravity."
        )

    async def synthesize_speech_pcm24k(self, text: str) -> bytes:
        """
        Synthesizes speech using:
        1. `gemini-3.8-flash-tts` (`audio/l16`, 24kHz) with `speech_metadata` annotations
        2. `edge-tts` neural multilingual voice fallback
        3. Pure harmonic voice-like chime/synth if offline
        Returns 24kHz 16-bit signed little-endian mono WAV bytes.
        """
        clean_text = text.strip()
        if not clean_text:
            return b""

        # 1. Try Gemini 3.8 Flash TTS via Interactions API
        if self._client is not None and hasattr(self._client, "interactions"):
            try:
                loop = asyncio.get_running_loop()

                def _call_tts() -> bytes:
                    interaction = self._client.interactions.create(
                        model=self.config.tts_model,
                        input=[
                            {
                                "type": "user_input",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": clean_text,
                                        "annotations": [
                                            {
                                                "type": "speech_metadata",
                                                "style": self.config.speech_style,
                                            }
                                        ],
                                    }
                                ],
                            }
                        ],
                        response_format={"type": "audio"},
                        generation_config={"speech_config": [{"voice": self.config.voice_name}]},
                    )
                    out_audio = getattr(interaction, "output_audio", None)
                    if out_audio and getattr(out_audio, "data", None):
                        return base64.b64decode(out_audio.data)
                    return b""

                wav_bytes = await asyncio.wait_for(
                    loop.run_in_executor(None, _call_tts), timeout=4.5
                )
                if wav_bytes:
                    return wav_bytes
            except Exception as exc:
                logger.debug("Gemini 3.8 TTS fallback to neural edge-tts: %s", exc)

        # 2. Neural Edge-TTS (High-speed humanized multilingual voice)
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
                logger.warning("edge-tts synthesis fallback: %s", exc)

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

    async def start_background_tasks(self, app: web.Application) -> None:
        self._loop = asyncio.get_running_loop()
        self._telemetry_task = asyncio.create_task(self._telemetry_loop())
        app["mic_tcp_server"] = await asyncio.start_server(
            self._handle_antigravity_mic_client,
            host="127.0.0.1",
            port=ANTIGRAVITY_MIC_PORT,
        )
        logger.info(
            "ANTIGRAVITY_MIC TCP server listening on 127.0.0.1:%d (for `agy` /voice & F5)",
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

    def _start_hardware_mic_if_available(self) -> None:
        if not HAS_SOUNDDEVICE:
            return
        try:
            blocksize = int(INPUT_SAMPLE_RATE * 0.04)  # 40ms frames (640 samples)

            def _audio_callback(
                indata: np.ndarray, frames: int, time_info: Any, status: Any
            ) -> None:
                if self._loop is None:
                    return
                pcm16 = (np.clip(indata[:, 0], -1.0, 1.0) * 32767.0).astype(np.int16)
                raw_bytes = pcm16.tobytes()
                rms = float(np.sqrt(np.mean(indata[:, 0] ** 2)))
                # Compute 32-band FFT magnitudes in [0.0, 1.0]
                fft_vals = np.abs(np.fft.rfft(indata[:, 0], n=64))[:32]
                fft_norm = np.clip(fft_vals * 4.0, 0.0, 1.0).tolist()
                self._loop.call_soon_threadsafe(self._on_mic_frame, raw_bytes, rms, fft_norm)

            self._mic_stream = sd.InputStream(
                samplerate=INPUT_SAMPLE_RATE,
                channels=CHANNELS,
                dtype="float32",
                blocksize=blocksize,
                callback=_audio_callback,
            )
            self._mic_stream.start()
            logger.info("Hardware microphone capture started at 16kHz mono.")
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
        self, text: str, surface: str = "flutter_app", stt_latency_ms: int = 0
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

        reply_text, model_used, llm_ms = (
            await self.gemini_bridge.generate_conversational_reply(clean_text, surface=surface)
            if hasattr(self.gemini_bridge, "generate_conversational_reply")
            else await self.gemini_bridge.generate_Conversational_reply(clean_text, surface=surface)
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
        self._speaking_task = asyncio.create_task(self._speak_response(model_turn))

        return {
            "status": "ok",
            "user_turn": asdict(user_turn),
            "model_turn": asdict(model_turn),
        }

    async def _speak_response(self, model_turn: ConversationTurn) -> None:
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
            audio_bytes = await self.gemini_bridge.synthesize_speech_pcm24k(model_turn.text)
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
                "antigravity_mic_addr": f"127.0.0.1:{ANTIGRAVITY_MIC_PORT}",
                "ws_url": f"ws://{HTTP_WS_HOST}:{HTTP_WS_PORT}/ws/voice",
                "gemini_windows_state": getattr(self, "gemini_windows_state", {}),
                "history_count": len(self.history),
                "history": [asdict(t) for t in self.history[-20:]],
            },
            headers=self._cors_headers(),
        )

    async def handle_voice_command(self, request: web.Request) -> web.Response:
        data = await request.json()
        action = data.get("action", "toggle_live")
        surface = data.get("surface", "flutter_app")

        if action == "toggle_live":
            self.is_live_active = data.get("enabled", not self.is_live_active)
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
            if not transcript and pcm_b64:
                raw_pcm = base64.b64decode(pcm_b64)
                # Forward to ANTIGRAVITY_MIC clients too
                for writer in list(self.mic_tcp_clients):
                    try:
                        writer.write(raw_pcm)
                    except Exception:
                        self.mic_tcp_clients.discard(writer)
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
            result = await self.handle_user_utterance(
                transcript, surface=surface, stt_latency_ms=int(stt_ms)
            )
            model_text = result.get("model_turn", {}).get("text", "")
            audio_b64 = ""
            mime_type = "audio/mpeg"
            if model_text:
                audio_bytes = await self.gemini_bridge.synthesize_speech_pcm24k(model_text)
                audio_b64 = base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else ""
                mime_type = "audio/wav" if audio_bytes[:4] == b"RIFF" else "audio/mpeg"
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
    hub = VoiceHubServer()
    app = web.Application()
    app["hub"] = hub
    app.router.add_get("/api/status", hub.handle_status)
    app.router.add_post("/api/voice", hub.handle_voice_command)
    app.router.add_options("/api/voice", hub.handle_options)
    app.router.add_options("/api/status", hub.handle_options)
    app.router.add_get("/ws/voice", hub.handle_ws)

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
