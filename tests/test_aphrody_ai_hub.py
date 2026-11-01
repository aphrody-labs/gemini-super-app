"""Unit and route tests for AphrodyAIHub (`backend/aphrody_ai_hub.py`)."""

from __future__ import annotations

import pytest
from aiohttp.test_utils import TestClient, TestServer

from backend.aphrody_ai_hub import AphrodyAIHub
from backend.voice_bridge_server import create_app


def test_aphrody_hub_status_and_oauth_url() -> None:
    hub = AphrodyAIHub()
    status = hub.get_status()

    assert status["project_id"] == "aphrody"
    assert status["project_number"] == "468000409790"
    assert status["service_accounts"]["primary"] == "aphrody-bot@aphrody.iam.gserviceaccount.com"
    assert (
        status["service_accounts"]["automation"]
        == "bun-google-automation@aphrody.iam.gserviceaccount.com"
    )
    assert (
        "468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com"
        in status["oauth_clients"]["primary_client_id"]
    )
    assert status["models"]["reasoning"] == "gemini-4-argon"
    assert status["models"]["live"] == "gemini-3.8-live"
    assert status["models"]["tts"] == "gemini-3.8-flash-tts"
    assert status["models"]["stt"] == "gemini-3.5-transcribe"
    assert status["models"]["lyria_song"] == "lyria-3.5"
    assert status["models"]["flow_video"] == "gemini-omni-1.1-flash"

    consent_url = hub.build_oauth_consent_url()
    assert "https://accounts.google.com/o/oauth2/v2/auth?" in consent_url
    assert "youtube.readonly" in consent_url


@pytest.mark.asyncio
async def test_aphrody_http_routes() -> None:
    app, _ = create_app()
    async with TestClient(TestServer(app)) as client:
        resp = await client.get("/api/aphrody/status")
        assert resp.status == 200
        data = await resp.json()
        assert data["project_id"] == "aphrody"
        assert data["models"]["lyria_realtime"] == "models/lyria-realtime-exp"

        resp_oauth = await client.post("/api/aphrody/ai", json={"feature": "oauth_url"})
        assert resp_oauth.status == 200
        oauth_data = await resp_oauth.json()
        assert "accounts.google.com" in oauth_data["consent_url"]

        resp_cb = await client.get("/oauth2callback?code=test_code")
        assert resp_cb.status == 200
        cb_data = await resp_cb.json()
        assert cb_data["code_received"] is True
