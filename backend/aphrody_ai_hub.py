"""
Aphrody Google Cloud & Google AI 2026 Unified Hub (Python Backend)
Connects GCP Project `aphrody` (468000409790), OAuth 2.0 Clients, Service Accounts,
and all canonical 2026 Google AI capabilities:
- Search Grounding (`google_search`, `url_context`, `deep-research-preview-04-2026`)
- Voice & Speech-to-Speech (`gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.5-live-translate-preview`)
- Controllable TTS, Voice Design & Replication (`gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`)
- Speech-to-Text (`gemini-3.5-transcribe`, `gemini-3.5-transcribe-live`, `faster-whisper` large-v3-turbo)
- ML, Reasoning & Embeddings (`gemini-4-argon`, `gemini-embedding-2`, `gemini-nano-banana-2.1`, `antigravity-preview-09-2026`)
- YouTube Data API v3 + Gemini YouTube Multimodal Video Understanding
- Lyria Music Generation (`lyria-3.5`, `lyria-3-clip-preview`, `models/lyria-realtime-exp`)
- Flow Video Generation & Editing (`gemini-omni-1.1-flash`)
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import aiohttp
from aiohttp import web


def load_aphrody_dotenv() -> None:
    """Loads root `.env` if present without overriding existing environment variables."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


load_aphrody_dotenv()


class AphrodyAIHub:
    """Unified Google Cloud (`aphrody`) & Google AI 2026 Hub."""

    def __init__(self) -> None:
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "aphrody")
        self.project_number = os.environ.get("GOOGLE_CLOUD_PROJECT_NUMBER", "468000409790")
        self.region = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")
        self.primary_sa = os.environ.get(
            "APHRODY_SERVICE_ACCOUNT", "aphrody-bot@aphrody.iam.gserviceaccount.com"
        )
        self.automation_sa = os.environ.get(
            "APHRODY_AUTOMATION_SERVICE_ACCOUNT",
            "bun-google-automation@aphrody.iam.gserviceaccount.com",
        )
        self.oauth_client_id = os.environ.get(
            "GOOGLE_CLIENT_ID",
            "468000409790-f66ui5vphebsj9mgu38b146s519pu11d.apps.googleusercontent.com",
        )
        self.auto_oauth_client_id = os.environ.get(
            "AUTO_GOOGLE_CLIENT_ID",
            "468000409790-qf5cjq6vdj2v0rsdgnj5deb5kt6l9k9t.apps.googleusercontent.com",
        )
        self.redirect_uri = os.environ.get(
            "GOOGLE_OAUTH_REDIRECT_URI", "http://127.0.0.1:8765/oauth2callback"
        )
        self.gemini_api_key = (
            os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        )
        self.youtube_api_key = (
            os.environ.get("YOUTUBE_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
            or self.gemini_api_key
        )
        self._client: Any = None

    @property
    def client(self) -> Any:
        if self._client is None:
            from google import genai

            self._client = genai.Client(api_key=self.gemini_api_key or "MOCK_KEY")
        return self._client

    def get_status(self) -> dict[str, Any]:
        return {
            "project_id": self.project_id,
            "project_number": self.project_number,
            "region": self.region,
            "service_accounts": {
                "primary": self.primary_sa,
                "automation": self.automation_sa,
                "firebase": "firebase-adminsdk-fbsvc@aphrody.iam.gserviceaccount.com",
            },
            "oauth_clients": {
                "primary_client_id": self.oauth_client_id,
                "automation_client_id": self.auto_oauth_client_id,
                "redirect_uri": self.redirect_uri,
                "has_client_secret": bool(os.environ.get("GOOGLE_CLIENT_SECRET")),
            },
            "api_keys_configured": {
                "gemini_api_key": bool(self.gemini_api_key),
                "youtube_api_key": bool(self.youtube_api_key),
            },
            "models": {
                "reasoning": "gemini-4-argon",
                "flash": "gemini-3.8-flash",
                "flash_lite": "gemini-3.5-flash-lite",
                "live": "gemini-3.8-live",
                "live_extended_thinking": "gemini-3.8-live-extended-thinking",
                "live_translate": "gemini-3.5-live-translate-preview",
                "tts": "gemini-3.8-flash-tts",
                "tts_lite": "gemini-3.8-flash-lite-tts",
                "stt": "gemini-3.5-transcribe",
                "stt_live": "gemini-3.5-transcribe-live",
                "lyria_song": "lyria-3.5",
                "lyria_clip": "lyria-3-clip-preview",
                "lyria_realtime": "models/lyria-realtime-exp",
                "flow_video": "gemini-omni-1.1-flash",
                "image": "gemini-nano-banana-2.1",
                "image_pro": "gemini-3-pro-image",
                "embedding": "gemini-embedding-2",
                "managed_agent": "antigravity-preview-09-2026",
                "deep_research": "deep-research-preview-04-2026",
            },
        }

    def build_oauth_consent_url(self, automation: bool = False) -> str:
        client_id = self.auto_oauth_client_id if automation else self.oauth_client_id
        params = {
            "client_id": client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
            "scope": " ".join(
                [
                    "https://www.googleapis.com/auth/cloud-platform",
                    "https://www.googleapis.com/auth/generative-language.retriever",
                    "https://www.googleapis.com/auth/youtube.readonly",
                    "openid",
                    "email",
                    "profile",
                ]
            ),
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    def search_grounded(
        self, query: str, model: str = "gemini-3.8-flash", include_url_context: bool = False
    ) -> dict[str, Any]:
        tools: list[dict[str, Any]] = [{"type": "google_search"}]
        if include_url_context:
            tools.append({"type": "url_context"})
        interaction = self.client.interactions.create(
            model=model,
            input=query,
            tools=tools,
        )
        return {
            "interaction_id": getattr(interaction, "id", ""),
            "model": model,
            "output_text": getattr(interaction, "output_text", "") or "",
        }

    async def youtube_search_or_analyze(
        self, query_or_url: str, max_results: int = 5, question: str | None = None
    ) -> dict[str, Any]:
        if "youtube.com/" in query_or_url or "youtu.be/" in query_or_url:
            prompt = (
                question
                or "Résume cette vidéo YouTube en français avec les points clés et les timestamps."
            )
            interaction = self.client.interactions.create(
                model="gemini-3.8-flash",
                input=[
                    {"type": "text", "text": prompt},
                    {"type": "video", "uri": query_or_url},
                ],
            )
            return {
                "mode": "gemini_video_understanding",
                "youtube_url": query_or_url,
                "interaction_id": getattr(interaction, "id", ""),
                "analysis": getattr(interaction, "output_text", "") or "",
            }

        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "type": "video",
            "q": query_or_url,
            "maxResults": str(max_results),
            "key": self.youtube_api_key,
        }
        async with aiohttp.ClientSession() as session, session.get(url, params=params) as resp:
            payload = await resp.json()
            if resp.status != 200:
                return {"status": "error", "code": resp.status, "details": payload}
            items = [
                {
                    "video_id": item.get("id", {}).get("videoId", ""),
                    "title": item.get("snippet", {}).get("title", ""),
                    "channel_title": item.get("snippet", {}).get("channelTitle", ""),
                    "published_at": item.get("snippet", {}).get("publishedAt", ""),
                    "url": f"https://www.youtube.com/watch?v={item.get('id', {}).get('videoId', '')}",
                }
                for item in payload.get("items", [])
            ]
            return {"mode": "youtube_data_v3", "query": query_or_url, "items": items}

    def generate_lyria_music(self, prompt: str, clip_only: bool = False) -> dict[str, Any]:
        model = "lyria-3-clip-preview" if clip_only else "lyria-3.5"
        interaction = self.client.interactions.create(model=model, input=prompt)
        out_audio = getattr(interaction, "output_audio", None)
        return {
            "interaction_id": getattr(interaction, "id", ""),
            "model": model,
            "audio_base64": getattr(out_audio, "data", None) if out_audio else None,
            "mime_type": getattr(out_audio, "mime_type", "audio/mp3") if out_audio else "audio/mp3",
            "lyrics_or_structure": getattr(interaction, "output_text", None),
        }

    def generate_flow_video(
        self,
        prompt: str,
        resolution: str = "720p",
        aspect_ratio: str = "16:9",
        duration_seconds: int = 5,
        first_frame_uri: str | None = None,
        last_frame_uri: str | None = None,
        previous_interaction_id: str | None = None,
    ) -> dict[str, Any]:
        input_parts: list[dict[str, Any]] = []
        tags: list[str] = []
        if first_frame_uri:
            input_parts.append({"type": "image", "uri": first_frame_uri})
            tags.append("<FIRST_FRAME>")
        if last_frame_uri and first_frame_uri:
            input_parts.append({"type": "image", "uri": last_frame_uri})
            tags.append("<LAST_FRAME>")
        tagged_prompt = f"{' '.join(tags)} {prompt}".strip() if tags else prompt
        input_parts.append({"type": "text", "text": tagged_prompt})

        kwargs: dict[str, Any] = {
            "model": "gemini-omni-1.1-flash",
            "input": input_parts,
            "generation_config": {
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "duration_seconds": duration_seconds,
            },
        }
        if previous_interaction_id:
            kwargs["previous_interaction_id"] = previous_interaction_id

        interaction = self.client.interactions.create(**kwargs)
        return {
            "interaction_id": getattr(interaction, "id", ""),
            "model": "gemini-omni-1.1-flash",
            "prompt": tagged_prompt,
            "status": getattr(interaction, "status", "completed"),
        }

    def synthesize_tts_38(
        self,
        text: str,
        voice: str = "Aoede",
        style: str = "warm, natural, expressive conversational French",
        lite: bool = False,
    ) -> dict[str, Any]:
        model = "gemini-3.8-flash-lite-tts" if lite else "gemini-3.8-flash-tts"
        interaction = self.client.interactions.create(
            model=model,
            input=[
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": text,
                            "annotations": [{"type": "speech_metadata", "style": style}],
                        }
                    ],
                }
            ],
            response_format={"type": "audio"},
            generation_config={"speech_config": [{"voice": voice}]},
        )
        out_audio = getattr(interaction, "output_audio", None)
        return {
            "interaction_id": getattr(interaction, "id", ""),
            "model": model,
            "voice": voice,
            "audio_base64": getattr(out_audio, "data", None) if out_audio else None,
            "mime_type": getattr(out_audio, "mime_type", "audio/wav") if out_audio else "audio/wav",
        }

    def reason_or_embed(self, text: str, embed_only: bool = False) -> dict[str, Any]:
        if embed_only:
            res = self.client.models.embed_content(model="gemini-embedding-2", contents=text)
            embeddings = getattr(res, "embeddings", []) or []
            values = getattr(embeddings[0], "values", []) if embeddings else []
            return {
                "model": "gemini-embedding-2",
                "dimension": len(values),
                "preview": values[:8],
            }
        interaction = self.client.interactions.create(model="gemini-4-argon", input=text)
        return {
            "interaction_id": getattr(interaction, "id", ""),
            "model": "gemini-4-argon",
            "output_text": getattr(interaction, "output_text", "") or "",
        }


def register_aphrody_routes(app: web.Application, cors_headers: dict[str, str]) -> AphrodyAIHub:
    aphrody_hub = AphrodyAIHub()
    app["aphrody_hub"] = aphrody_hub

    async def handle_aphrody_status(_request: web.Request) -> web.Response:
        return web.json_response(aphrody_hub.get_status(), headers=cors_headers)

    async def handle_oauth_callback(request: web.Request) -> web.Response:
        code = request.query.get("code", "")
        return web.json_response(
            {
                "status": "ok",
                "project": aphrody_hub.project_id,
                "oauth_client_id": aphrody_hub.oauth_client_id,
                "code_received": bool(code),
                "message": "Aphrody OAuth 2.0 callback received.",
            },
            headers=cors_headers,
        )

    async def handle_aphrody_ai(request: web.Request) -> web.Response:
        data = await request.json()
        feature = data.get("feature", "status")
        try:
            if feature == "status":
                return web.json_response(aphrody_hub.get_status(), headers=cors_headers)
            if feature == "oauth_url":
                return web.json_response(
                    {
                        "consent_url": aphrody_hub.build_oauth_consent_url(
                            bool(data.get("automation"))
                        )
                    },
                    headers=cors_headers,
                )
            if feature == "search":
                res = aphrody_hub.search_grounded(
                    data.get("query", ""),
                    model=data.get("model", "gemini-3.8-flash"),
                    include_url_context=bool(data.get("include_url_context")),
                )
                return web.json_response(res, headers=cors_headers)
            if feature == "youtube":
                res = await aphrody_hub.youtube_search_or_analyze(
                    data.get("query") or data.get("url", ""),
                    max_results=int(data.get("max_results", 5)),
                    question=data.get("question"),
                )
                return web.json_response(res, headers=cors_headers)
            if feature == "lyria":
                res = aphrody_hub.generate_lyria_music(
                    data.get("prompt", ""), clip_only=bool(data.get("clip_only"))
                )
                return web.json_response(res, headers=cors_headers)
            if feature == "flow":
                res = aphrody_hub.generate_flow_video(
                    prompt=data.get("prompt", ""),
                    resolution=data.get("resolution", "720p"),
                    aspect_ratio=data.get("aspect_ratio", "16:9"),
                    duration_seconds=int(data.get("duration_seconds", 5)),
                    first_frame_uri=data.get("first_frame_uri"),
                    last_frame_uri=data.get("last_frame_uri"),
                    previous_interaction_id=data.get("previous_interaction_id"),
                )
                return web.json_response(res, headers=cors_headers)
            if feature == "tts":
                res = aphrody_hub.synthesize_tts_38(
                    text=data.get("text", ""),
                    voice=data.get("voice", "Aoede"),
                    style=data.get("style", "warm, expressive conversational French"),
                    lite=bool(data.get("lite")),
                )
                return web.json_response(res, headers=cors_headers)
            if feature in ("ml", "embed"):
                res = aphrody_hub.reason_or_embed(
                    text=data.get("text") or data.get("prompt", ""),
                    embed_only=(feature == "embed"),
                )
                return web.json_response(res, headers=cors_headers)
            return web.json_response(
                {"status": "error", "message": f"Unknown feature: {feature}"},
                status=400,
                headers=cors_headers,
            )
        except Exception as exc:
            return web.json_response(
                {"status": "error", "feature": feature, "message": str(exc)},
                status=500,
                headers=cors_headers,
            )

    app.router.add_get("/api/aphrody/status", handle_aphrody_status)
    app.router.add_post("/api/aphrody/ai", handle_aphrody_ai)
    app.router.add_get("/oauth2callback", handle_oauth_callback)
    return aphrody_hub
