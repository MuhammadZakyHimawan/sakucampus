from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.config import get_settings
from app.models import Notification, TelegramLinkToken, Transaction
from app.modules.telegram.client import set_telegram_client_override
from app.services.telegram_service import hash_link_token


@dataclass
class FakeTelegramClient:
    """In-memory mock of TelegramBotClient — never makes real network requests."""

    messages: list[tuple[int, str]] = field(default_factory=list)
    documents: list[tuple[int, str, bytes, str | None]] = field(default_factory=list)

    async def get_me(self) -> dict[str, Any] | None:
        return {"id": 999, "is_bot": True, "username": "SakuCampusTestBot"}

    async def get_updates(
        self,
        *,
        offset: int | None = None,
        timeout: int = 25,
    ) -> list[dict[str, Any]]:
        return []

    async def send_message(
        self,
        chat_id: int,
        text: str,
        *,
        parse_mode: str = "HTML",
    ) -> bool:
        self.messages.append((chat_id, text))
        return True

    async def send_document(
        self,
        chat_id: int,
        filename: str,
        content_bytes: bytes,
        *,
        caption: str | None = None,
        parse_mode: str = "HTML",
    ) -> bool:
        self.documents.append((chat_id, filename, content_bytes, caption))
        return True

    async def set_webhook(self, url: str, *, secret_token: str | None = None) -> bool:
        return True

    async def delete_webhook(self, *, drop_pending_updates: bool = False) -> bool:
        return True


def _register_user(
    client,
    email: str,
    name: str = "Mahasiswa",
) -> tuple[uuid.UUID, dict[str, str]]:
    res = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "Password123"},
    )
    assert res.status_code == 201
    body = res.json()
    return uuid.UUID(body["user"]["id"]), {"Authorization": f"Bearer {body['accessToken']}"}


def _make_private_update(
    tg_user_id: int,
    text: str,
    *,
    chat_id: int | None = None,
    username: str = "andi_mhs",
    chat_type: str = "private",
) -> dict[str, Any]:
    return {
        "update_id": 1001,
        "message": {
            "message_id": 1,
            "from": {"id": tg_user_id, "is_bot": False, "username": username},
            "chat": {"id": chat_id or tg_user_id, "type": chat_type},
            "text": text,
        },
    }


def test_telegram_link_token_hashing_expiry_and_multi_user_isolation(client, db_session):
    fake_tg = FakeTelegramClient()
    set_telegram_client_override(fake_tg)

    user_a_id, headers_a = _register_user(client, "tga@example.com", "Andi Alpha")
    user_b_id, headers_b = _register_user(client, "tgb@example.com", "Budi Beta")

    # Initial status is disconnected
    st0 = client.get("/api/v1/telegram/status", headers=headers_a).json()
    assert st0["connected"] is False
    assert st0["botUsername"] == "SakuCampusTestBot"

    # Generate link token for User A -> verify plaintext is NEVER stored in DB
    link_res = client.post("/api/v1/telegram/link-token", headers=headers_a)
    assert link_res.status_code == 201
    link_body = link_res.json()
    raw_token = link_body["token"]
    assert link_body["deepLink"] == f"https://t.me/SakuCampusTestBot?start={raw_token}"
    assert link_body["startCommand"] == f"/start {raw_token}"

    stored_row = db_session.scalar(
        select(TelegramLinkToken).where(TelegramLinkToken.user_id == user_a_id)
    )
    assert stored_row is not None
    assert stored_row.token_hash != raw_token
    assert stored_row.token_hash == hash_link_token(raw_token)

    # Invalid token via /start -> rejected politely
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(111001, "/start token-palsu"),
    )
    assert "Gagal menautkan akun" in fake_tg.messages[-1][1]

    # Expired token -> rejected
    expired_tok_res = client.post("/api/v1/telegram/link-token", headers=headers_b).json()
    b_row = db_session.scalar(
        select(TelegramLinkToken).where(TelegramLinkToken.user_id == user_b_id)
    )
    b_row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(222002, f"/start {expired_tok_res['token']}"),
    )
    assert "kedaluwarsa" in fake_tg.messages[-1][1]

    # Valid /start <token> for User A (Telegram ID 111001) -> connected!
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(111001, f"/start {raw_token}", username="andi_tg"),
    )
    assert "Berhasil terhubung!" in fake_tg.messages[-1][1]

    st_a = client.get("/api/v1/telegram/status", headers=headers_a).json()
    assert st_a["connected"] is True
    assert st_a["telegramUsername"] == "@andi_tg"
    assert st_a["telegramUserId"] == "111001"

    # Reusing the same one-time token -> rejected!
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(111001, f"/start {raw_token}"),
    )
    assert "sudah pernah digunakan" in fake_tg.messages[-1][1]

    # Multi-User Isolation: Telegram 111001 tries to link to User B -> MUST be rejected!
    fresh_b_token = client.post("/api/v1/telegram/link-token", headers=headers_b).json()["token"]
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(111001, f"/start {fresh_b_token}"),
    )
    assert "sudah tertaut ke akun SakuCampus lain" in fake_tg.messages[-1][1]

    # Link User B with their own distinct Telegram ID 222002 -> succeeds!
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(222002, f"/start {fresh_b_token}", username="budi_tg"),
    )
    assert "Berhasil terhubung!" in fake_tg.messages[-1][1]

    # Chat from Telegram A records only into User A, invisible to User B
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(111001, "makan siang ayam bakar 25rb"),
    )
    assert len(client.get("/api/v1/transactions", headers=headers_a).json()) == 1
    assert len(client.get("/api/v1/transactions", headers=headers_b).json()) == 0


def test_telegram_nlp_chat_commands_pdf_undo_and_group_ignore(client, db_session):
    fake_tg = FakeTelegramClient()
    set_telegram_client_override(fake_tg)

    user_id, headers = _register_user(client, "chatflow@example.com", "Citra Mahasiswa")
    today = date.today()

    client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={"initialBalance": 300000, "minBalance": 250000},
    )
    client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Gaya Hidup",
            "limit": 100000,
            "periodStart": today.replace(day=1).isoformat(),
            "periodEnd": today.isoformat(),
        },
    )
    client.post(
        "/api/v1/goals",
        headers=headers,
        json={
            "name": "Beli Buku Skripsi",
            "targetAmount": 400000,
            "deadline": (today + timedelta(days=45)).isoformat(),
        },
    )

    # Group/supergroup messages MUST be completely ignored
    before_msgs = len(fake_tg.messages)
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(333003, "beli kopi 20rb", chat_type="group"),
    )
    assert len(fake_tg.messages) == before_msgs

    # Unlinked user sending transaction -> prompted to link first
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(333003, "beli kopi 20rb"),
    )
    assert "belum terhubung" in fake_tg.messages[-1][1]

    # Link Citra's Telegram (333003)
    tok = client.post("/api/v1/telegram/link-token", headers=headers).json()["token"]
    client.post("/api/v1/telegram/webhook", json=_make_private_update(333003, f"/start {tok}"))

    # Message without amount -> friendly guide, 0 transactions created
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(333003, "halo bot lupa nominalnya"),
    )
    assert "nominal transaksi belum terbaca" in fake_tg.messages[-1][1]
    assert client.get("/api/v1/transactions", headers=headers).json() == []

    # Natural NLP chat -> exceeds Gaya Hidup budget (120k > 100k) & drops balance to 180k < 250k!
    client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(333003, "nongkrong ngopi kekinian 120rb"),
    )
    reply_text = fake_tg.messages[-1][1]
    assert "Transaksi Tercatat!" in reply_text
    assert "Rp120.000" in reply_text
    assert "PERINGATAN KRITIS" in reply_text

    # Verify DB transaction metadata & notifications marked sent_to_telegram=True
    tx_list = client.get("/api/v1/transactions", headers=headers).json()
    assert len(tx_list) == 1
    assert tx_list[0]["source"] == "telegram"
    assert tx_list[0]["rawText"] == "nongkrong ngopi kekinian 120rb"
    assert tx_list[0]["nlpConfidence"] is not None

    notifs = db_session.scalars(select(Notification).where(Notification.user_id == user_id)).all()
    critical_notifs = [n for n in notifs if n.severity == "critical"]
    assert len(critical_notifs) >= 1
    assert all(n.sent_to_telegram is True for n in critical_notifs)

    # Test interactive commands: /saldo, /ringkasan, /budget, /goals, /bantuan, /pdf
    for cmd, expected_snippet in [
        ("/saldo", "Ringkasan Saldo"),
        ("/ringkasan", "Ringkasan Bulan Ini"),
        ("/budget", "Status Anggaran Kategori"),
        ("/goals", "Progres Target Tabungan"),
        ("/bantuan", "Panduan Bot SakuCampus"),
    ]:
        client.post("/api/v1/telegram/webhook", json=_make_private_update(333003, cmd))
        assert expected_snippet in fake_tg.messages[-1][1]

    # /pdf sends valid %PDF- bytes via send_document!
    client.post("/api/v1/telegram/webhook", json=_make_private_update(333003, "/pdf"))
    assert len(fake_tg.documents) == 1
    doc_chat_id, doc_filename, doc_bytes, doc_caption = fake_tg.documents[0]
    assert doc_chat_id == 333003
    assert doc_filename.endswith(".pdf")
    assert doc_bytes.startswith(b"%PDF-")
    assert "Citra Mahasiswa" in (doc_caption or "")

    # /batal undoes the recent Telegram transaction & restores balance to Rp300.000
    client.post("/api/v1/telegram/webhook", json=_make_private_update(333003, "/batal"))
    assert "Transaksi berhasil dibatalkan!" in fake_tg.messages[-1][1]
    assert "Rp300.000" in fake_tg.messages[-1][1]
    assert client.get("/api/v1/transactions", headers=headers).json() == []

    # Test 15-minute safety window on /batal (old transaction > 15m is NOT deleted)
    old_tx = Transaction(
        user_id=user_id,
        description="Kopi lama",
        amount=18000,
        type="expense",
        category="Gaya Hidup",
        date=today,
        source="telegram",
        created_at=datetime.now(UTC) - timedelta(minutes=25),
    )
    db_session.add(old_tx)
    db_session.commit()
    client.post("/api/v1/telegram/webhook", json=_make_private_update(333003, "/batal"))
    assert "lebih dari 15 menit" in fake_tg.messages[-1][1]
    assert len(client.get("/api/v1/transactions", headers=headers).json()) == 1


def test_webhook_secret_realtime_web_push_and_unlink(client, db_session, monkeypatch):
    fake_tg = FakeTelegramClient()
    set_telegram_client_override(fake_tg)

    user_id, headers = _register_user(client, "webpush@example.com", "Dimas Web")
    today = date.today()

    # Link Dimas's Telegram (444004)
    tok = client.post("/api/v1/telegram/link-token", headers=headers).json()["token"]
    client.post("/api/v1/telegram/webhook", json=_make_private_update(444004, f"/start {tok}"))
    fake_tg.messages.clear()

    # Configure finance settings, then create large expense via WEB API -> BackgroundTasks push!
    client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={"initialBalance": 400000, "minBalance": 300000},
    )
    fake_tg.messages.clear()

    web_tx_res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Bayar UKT tambahan via Web",
            "amount": 200000,
            "type": "expense",
            "category": "Pendidikan",
            "date": today.isoformat(),
            "source": "manual",
        },
    )
    assert web_tx_res.status_code == 201

    # Verify real-time push message arrived in Telegram chat & DB marked sent_to_telegram=True!
    assert len(fake_tg.messages) >= 1
    pushed_chat_id, pushed_text = fake_tg.messages[-1]
    assert pushed_chat_id == 444004
    assert "Notifikasi SakuCampus" in pushed_text
    assert "PERINGATAN KRITIS" in pushed_text

    db_session.expire_all()
    notifs = db_session.scalars(select(Notification).where(Notification.user_id == user_id)).all()
    critical_notifs = [n for n in notifs if n.severity == "critical"]
    assert len(critical_notifs) >= 1
    assert all(n.sent_to_telegram is True for n in critical_notifs)

    # Test Webhook Secret verification (403 when missing/wrong, 200 when matching)
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_webhook_secret", "rahasia-webhook-123")

    forbidden_no_hdr = client.post(
        "/api/v1/telegram/webhook",
        json=_make_private_update(444004, "/saldo"),
    )
    assert forbidden_no_hdr.status_code == 403

    forbidden_bad_hdr = client.post(
        "/api/v1/telegram/webhook",
        headers={"X-Telegram-Bot-Api-Secret-Token": "salah"},
        json=_make_private_update(444004, "/saldo"),
    )
    assert forbidden_bad_hdr.status_code == 403

    ok_hdr = client.post(
        "/api/v1/telegram/webhook",
        headers={"X-Telegram-Bot-Api-Secret-Token": "rahasia-webhook-123"},
        json=_make_private_update(444004, "/saldo"),
    )
    assert ok_hdr.status_code == 200

    # Unlink Telegram -> status disconnected & next chat asks to link again
    unlink_res = client.delete("/api/v1/telegram/unlink", headers=headers)
    assert unlink_res.status_code == 200
    assert unlink_res.json()["connected"] is False

    client.post(
        "/api/v1/telegram/webhook",
        headers={"X-Telegram-Bot-Api-Secret-Token": "rahasia-webhook-123"},
        json=_make_private_update(444004, "/saldo"),
    )
    assert "belum terhubung" in fake_tg.messages[-1][1]
