from __future__ import annotations

import logging
from typing import Any, Protocol

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class TelegramClientProtocol(Protocol):
    async def get_me(self) -> dict[str, Any] | None: ...

    async def get_updates(
        self,
        *,
        offset: int | None = None,
        timeout: int = 25,
    ) -> list[dict[str, Any]]: ...

    async def send_message(
        self,
        chat_id: int,
        text: str,
        *,
        parse_mode: str = "HTML",
    ) -> bool: ...

    async def send_document(
        self,
        chat_id: int,
        filename: str,
        content_bytes: bytes,
        *,
        caption: str | None = None,
        parse_mode: str = "HTML",
    ) -> bool: ...

    async def set_webhook(
        self,
        url: str,
        *,
        secret_token: str | None = None,
    ) -> bool: ...

    async def delete_webhook(self, *, drop_pending_updates: bool = False) -> bool: ...


class TelegramBotClient:
    """Lightweight async Telegram Bot API client using httpx (never logs bot token)."""

    def __init__(self, bot_token: str, base_api_url: str = "https://api.telegram.org") -> None:
        self._base_url = f"{base_api_url.rstrip('/')}/bot{bot_token}"
        self._timeout = httpx.Timeout(35.0, connect=10.0)

    async def _post_json(
        self,
        method: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(f"{self._base_url}/{method}", json=payload or {})
                data = response.json()
                if response.is_success and isinstance(data, dict) and data.get("ok") is True:
                    return data
                desc = data.get("description", "unknown error") if isinstance(data, dict) else ""
                logger.warning(
                    "Telegram API method %s failed (status=%s): %s",
                    method,
                    response.status_code,
                    desc,
                )
        except httpx.HTTPError as exc:
            logger.warning("Telegram API network error on %s (%s)", method, type(exc).__name__)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Unexpected Telegram client error on %s (%s)", method, type(exc).__name__
            )
        return None

    async def get_me(self) -> dict[str, Any] | None:
        data = await self._post_json("getMe")
        if data and isinstance(data.get("result"), dict):
            return data["result"]
        return None

    async def get_updates(
        self,
        *,
        offset: int | None = None,
        timeout: int = 25,
    ) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {
            "timeout": timeout,
            "allowed_updates": ["message"],
        }
        if offset is not None:
            payload["offset"] = offset
        data = await self._post_json("getUpdates", payload)
        if data and isinstance(data.get("result"), list):
            return data["result"]
        return []

    async def send_message(
        self,
        chat_id: int,
        text: str,
        *,
        parse_mode: str = "HTML",
    ) -> bool:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }
        data = await self._post_json("sendMessage", payload)
        return data is not None

    async def send_document(
        self,
        chat_id: int,
        filename: str,
        content_bytes: bytes,
        *,
        caption: str | None = None,
        parse_mode: str = "HTML",
    ) -> bool:
        form_data: dict[str, str] = {"chat_id": str(chat_id), "parse_mode": parse_mode}
        if caption:
            form_data["caption"] = caption
        files = {"document": (filename, content_bytes, "application/pdf")}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    f"{self._base_url}/sendDocument",
                    data=form_data,
                    files=files,
                )
                body = response.json()
                if response.is_success and isinstance(body, dict) and body.get("ok") is True:
                    return True
                logger.warning(
                    "Telegram sendDocument failed (status=%s)",
                    response.status_code,
                )
        except httpx.HTTPError as exc:
            logger.warning("Telegram network error on sendDocument (%s)", type(exc).__name__)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Unexpected error on sendDocument (%s)", type(exc).__name__)
        return False

    async def set_webhook(
        self,
        url: str,
        *,
        secret_token: str | None = None,
    ) -> bool:
        payload: dict[str, Any] = {"url": url, "allowed_updates": ["message"]}
        if secret_token:
            payload["secret_token"] = secret_token
        data = await self._post_json("setWebhook", payload)
        return data is not None

    async def delete_webhook(self, *, drop_pending_updates: bool = False) -> bool:
        data = await self._post_json(
            "deleteWebhook",
            {"drop_pending_updates": drop_pending_updates},
        )
        return data is not None


_client_override: TelegramClientProtocol | None = None


def set_telegram_client_override(client: TelegramClientProtocol | None) -> None:
    global _client_override
    _client_override = client


def get_telegram_client() -> TelegramClientProtocol | None:
    if _client_override is not None:
        return _client_override
    settings = get_settings()
    if not settings.telegram_bot_token:
        return None
    return TelegramBotClient(settings.telegram_bot_token)
