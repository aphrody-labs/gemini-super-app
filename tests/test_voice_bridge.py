"""Unit & Integration Tests for the Gemini Live & Antigravity Voice Bridge Server."""

from __future__ import annotations

import pytest
from aiohttp.test_utils import TestClient, TestServer

from backend.voice_bridge_server import (
    GeminiLiveAndTTSBridge,
    VoiceSessionConfig,
    create_app,
)


def test_live_connect_config_structure() -> None:
    cfg = VoiceSessionConfig(
        live_model="gemini-3.8-live-extended-thinking",
        voice_name="Aoede",
        language_code="fr-FR",
        vad_mode="hybrid",
        thinking_level="low",
    )
    bridge = GeminiLiveAndTTSBridge(cfg)
    live_cfg = bridge.build_live_connect_config()
    assert live_cfg["response_modalities"] == ["AUDIO"]
    assert (
        live_cfg["speech_config"]["voice_config"]["prebuilt_voice_config"]["voice_name"] == "Aoede"
    )
    assert live_cfg["thinking_config"]["thinking_level"] == "low"
    assert "Antigravity" in live_cfg["input_audio_transcription"]["custom_vocabulary"]


@pytest.mark.asyncio
async def test_http_and_websocket_voice_hub() -> None:
    app, hub = create_app()
    # Use ephemeral port for test
    async with TestServer(app) as server, TestClient(server) as client:
        # 1. Check status endpoint
        resp = await client.get("/api/status")
        assert resp.status == 200
        data = await resp.json()
        assert data["service"] == "gemini-live-voice-hub"
        assert data["state"] == "IDLE"

        # 2. Test `/voice` activation via POST
        resp2 = await client.post(
            "/api/voice",
            json={"action": "toggle_live", "enabled": True, "surface": "agy_cli"},
        )
        assert resp2.status == 200
        data2 = await resp2.json()
        assert data2["is_live_active"] is True
        assert data2["state"] == "LISTENING"

        # 3. Test WebSocket real-time interaction & audio synthesis
        async with client.ws_connect("/ws/voice") as ws:
            welcome_msg = await ws.receive_json(timeout=3.0)
            assert welcome_msg["type"] == "welcome"
            assert welcome_msg["is_live_active"] is True

            await ws.send_json(
                {
                    "type": "realtime_input",
                    "surface": "flutter_app",
                    "text": "Salut Gemini, comment ça va ?",
                }
            )

            received_types = set()
            for _ in range(15):
                msg = await ws.receive_json(timeout=5.0)
                received_types.add(msg.get("type"))
                if "audio_output" in received_types and "model_response" in received_types:
                    break

            assert "transcript" in received_types
            assert "model_response" in received_types

        # 4. Test real Voice-to-Voice endpoint & Gemini Windows App piloting
        resp3 = await client.post(
            "/api/voice",
            json={
                "action": "voice_to_voice",
                "text": "Bonjour Gemini, test voice to voice",
                "surface": "gemini_windows",
            },
        )
        assert resp3.status == 200
        data3 = await resp3.json()
        assert data3["status"] == "ok"
        assert data3["reply_text"]
        assert data3["audio_base64"]

        resp4 = await client.post(
            "/api/voice",
            json={
                "action": "pilot_gemini_windows",
                "command": "show",
            },
        )
        assert resp4.status == 200
        data4 = await resp4.json()
        assert data4["status"] == "ok"
        assert data4["gemini_exe_exists"] is True
