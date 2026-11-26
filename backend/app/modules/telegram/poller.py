from __future__ import annotations

import asyncio
import contextlib
import logging

from app.database import get_session_factory
from app.modules.telegram.client import TelegramClientProtocol, get_telegram_client
from app.modules.telegram.handlers import handle_telegram_update

logger = logging.getLogger(__name__)


class TelegramPoller:
    """Resilient asyncio background long-polling worker for local development."""

    def __init__(
        self,
        client: TelegramClientProtocol | None = None,
        *,
        poll_timeout: int = 20,
        error_backoff_seconds: float = 2.5,
    ) -> None:
        self._client = client
        self._poll_timeout = poll_timeout
        self._backoff = error_backoff_seconds
        self._stop_event = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._offset: int | None = None

    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        client = self._client or get_telegram_client()
        if client is None:
            return
        self._client = client
        self._stop_event.clear()
        await client.delete_webhook(drop_pending_updates=False)
        self._task = asyncio.create_task(self._run_loop(), name="sakucampus-telegram-poller")
        logger.info("Telegram long-polling worker started.")

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
            logger.info("Telegram long-polling worker stopped.")

    async def _run_loop(self) -> None:
        assert self._client is not None
        session_factory = get_session_factory()

        while not self._stop_event.is_set():
            try:
                updates = await self._client.get_updates(
                    offset=self._offset,
                    timeout=self._poll_timeout,
                )
                for update in updates:
                    update_id = update.get("update_id")
                    if isinstance(update_id, int):
                        self._offset = update_id + 1
                    try:
                        with session_factory() as db:
                            await handle_telegram_update(db, update, self._client)
                    except Exception as exc:  # noqa: BLE001
                        logger.warning(
                            "Error processing Telegram update %s (%s)",
                            update_id,
                            type(exc).__name__,
                        )
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.warning("Telegram poller loop error (%s), retrying...", type(exc).__name__)
                await asyncio.sleep(self._backoff)
