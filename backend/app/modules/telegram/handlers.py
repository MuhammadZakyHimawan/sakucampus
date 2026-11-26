from __future__ import annotations

import html
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Transaction, User
from app.modules.nlp.service import parse_transaction_text
from app.modules.reports.pdf_generator import ReportPeriodPreset, generate_financial_report_pdf
from app.modules.rule_engine.metrics import format_rupiah
from app.modules.rule_engine.service import evaluate_user_finances
from app.modules.telegram.client import TelegramClientProtocol
from app.modules.telegram.notifier import format_notification_alert_html
from app.schemas.transaction import TransactionCreate
from app.services.analytics_service import (
    format_short_date_id,
    get_period_range,
    group_expenses_by_category,
)
from app.services.errors import InvalidTelegramTokenError, TelegramAlreadyLinkedError
from app.services.goal_service import list_goals
from app.services.telegram_service import consume_link_token, get_user_by_telegram_id
from app.services.transaction_service import (
    create_transaction_with_evaluation,
    delete_transaction_with_evaluation,
    list_transactions,
)

UNDO_WINDOW_MINUTES = 15

_TYPE_LABEL: dict[str, str] = {
    "income": "Pemasukan",
    "expense": "Pengeluaran",
    "transfer": "Transfer",
}

_STATUS_BADGE: dict[str, str] = {
    "normal": "NORMAL (Aman)",
    "warning": "WASPADA",
    "critical": "KRITIS",
}

_BUDGET_STATUS_LABEL: dict[str, str] = {
    "safe": "Aman",
    "warning": "Waspada",
    "exceeded": "Terlampaui",
}


def _ensure_utc(dt_value: datetime) -> datetime:
    if dt_value.tzinfo is None:
        return dt_value.replace(tzinfo=UTC)
    return dt_value.astimezone(UTC)


def _help_text() -> str:
    return (
        "<b>Panduan Bot SakuCampus</b>\n\n"
        "<b>1. Catat Transaksi Cukup Chat Natural:</b>\n"
        "• <code>makan ayam geprek 20rb</code>\n"
        "• <code>beli 2 kopi susu 36rb</code>\n"
        "• <code>kiriman uang saku ortu 1,5jt</code>\n"
        "• <code>pindah saldo bca ke gopay 200k</code>\n\n"
        "<b>2. Perintah Interaktif:</b>\n"
        "• /saldo — Cek saldo, burn rate, runway &amp; status kesehatan\n"
        "• /ringkasan — Ringkasan arus kas &amp; kategori bulan ini\n"
        "• /budget — Pantau pemakaian anggaran kategori\n"
        "• /goals — Pantau progres target tabungan\n"
        "• /pdf — Unduh laporan keuangan PDF (30 hari terakhir)\n"
        "• /batal — Batalkan transaksi Telegram terakhir (&le; 15 menit)\n"
        "• /bantuan — Tampilkan panduan ini"
    )


def _unlinked_message() -> str:
    return (
        "<b>Akun Telegram belum terhubung ke SakuCampus.</b>\n\n"
        "Cara menghubungkan:\n"
        "1. Masuk ke akun Web SakuCampus kamu.\n"
        "2. Buka menu <b>Pengaturan &rarr; Integrasi Telegram</b>.\n"
        "3. Klik <b>Hubungkan Telegram</b> untuk mendapatkan tautan/kode <code>/start</code>."
    )


async def _handle_start(
    db: Session,
    client: TelegramClientProtocol,
    *,
    chat_id: int,
    telegram_user_id: int,
    telegram_username: str | None,
    arg: str,
) -> None:
    if arg:
        try:
            user = consume_link_token(
                db,
                raw_token=arg,
                telegram_user_id=telegram_user_id,
                telegram_chat_id=chat_id,
                telegram_username=telegram_username,
            )
        except (InvalidTelegramTokenError, TelegramAlreadyLinkedError) as exc:
            await client.send_message(
                chat_id,
                f"<b>Gagal menautkan akun:</b> {html.escape(str(exc))}",
            )
            return

        await client.send_message(
            chat_id,
            (
                f"<b>Berhasil terhubung!</b> Halo, <b>{html.escape(user.name)}</b>.\n"
                f"Akun SakuCampus (<code>{html.escape(user.email)}</code>) "
                "kini aktif terhubung.\n\n"
                f"{_help_text()}"
            ),
        )
        return

    existing_user = get_user_by_telegram_id(db, telegram_user_id)
    if existing_user is None:
        await client.send_message(chat_id, _unlinked_message())
        return

    # Keep chat_id & username fresh
    normalized_uname = f"@{telegram_username.lstrip('@')}" if telegram_username else None
    if (
        existing_user.telegram_chat_id != chat_id
        or existing_user.telegram_username != normalized_uname
    ):
        existing_user.telegram_chat_id = chat_id
        if normalized_uname:
            existing_user.telegram_username = normalized_uname
        db.commit()

    await client.send_message(
        chat_id,
        (
            f"Halo kembali, <b>{html.escape(existing_user.name)}</b>!\n"
            "Kirim langsung pesan transaksi (contoh: <code>makan siang 20rb</code>) "
            "atau ketik /bantuan untuk daftar perintah."
        ),
    )


async def _handle_saldo(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
) -> None:
    eval_res = evaluate_user_finances(db, user.id, persist_notifications=False)
    m = eval_res.metrics
    status_str = _STATUS_BADGE.get(eval_res.financial_status, "NORMAL")
    if m.runway_days is None:
        runway_str = "Aman (belum ada pengeluaran)"
    elif m.runway_days <= 0:
        runway_str = "0 hari (defisit/habis)"
    else:
        runway_str = f"{m.runway_days:g} hari"

    text = (
        f"<b>Ringkasan Saldo — {html.escape(user.name)}</b>\n"
        f"Status Keuangan: <b>{status_str}</b>\n\n"
        f"• Saldo Berjalan: <b>{format_rupiah(m.balance)}</b>\n"
        f"• Batas Minimum: {format_rupiah(m.min_balance)}\n"
        f"• Daily Burn Rate: {format_rupiah(m.daily_burn_rate)}/hari\n"
        f"• Batas Aman Harian: {format_rupiah(m.safe_daily_spend)}/hari\n"
        f"• Estimasi Runway: <b>{runway_str}</b>"
    )
    await client.send_message(chat_id, text)


async def _handle_ringkasan(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
) -> None:
    pr = get_period_range("month")
    eval_res = evaluate_user_finances(
        db,
        user.id,
        persist_notifications=False,
        reference_date=pr.end,
        period_start=pr.start,
        period_end=pr.end,
    )
    m = eval_res.metrics
    month_txs = list_transactions(db, user.id, start_date=pr.start, end_date=pr.end)
    top_cats = group_expenses_by_category(month_txs)[:5]

    cat_lines = (
        "\n".join(
            f"  {idx}. {html.escape(cat.category)}: {format_rupiah(cat.total)}"
            for idx, cat in enumerate(top_cats, start=1)
        )
        if top_cats
        else "  Belum ada pengeluaran bulan ini."
    )

    net_label = "Surplus" if m.net_cash_flow >= 0 else "Defisit"
    range_str = f"{format_short_date_id(pr.start)} - {format_short_date_id(pr.end)}"
    text = (
        f"<b>Ringkasan Bulan Ini ({range_str})</b>\n\n"
        f"• Pemasukan: <b>{format_rupiah(m.period_income)}</b>\n"
        f"• Pengeluaran: <b>{format_rupiah(m.period_expense)}</b>\n"
        f"• Arus Kas Bersih ({net_label}): <b>{format_rupiah(m.net_cash_flow)}</b>\n\n"
        f"<b>Kategori Pengeluaran Terbesar:</b>\n{cat_lines}"
    )
    await client.send_message(chat_id, text)


async def _handle_budget(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
) -> None:
    eval_res = evaluate_user_finances(
        db,
        user.id,
        persist_notifications=False,
        evaluate_all_budgets=True,
    )
    usages = eval_res.metrics.budget_usages
    if not usages:
        await client.send_message(
            chat_id,
            (
                "Belum ada anggaran kategori yang diatur. "
                "Tambahkan di menu <b>Anggaran</b> pada Web SakuCampus."
            ),
        )
        return

    lines = ["<b>Status Anggaran Kategori</b>\n"]
    for u in usages:
        st = _BUDGET_STATUS_LABEL.get(u.status, "Aman")
        lines.append(
            f"• <b>{html.escape(u.category)}</b> [{st}]\n"
            f"  {format_rupiah(u.spent)} / {format_rupiah(u.limit_amount)} ({u.percentage_int}%)"
        )
    await client.send_message(chat_id, "\n".join(lines))


async def _handle_goals(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
) -> None:
    goals = list_goals(db, user.id)
    if not goals:
        await client.send_message(
            chat_id,
            (
                "Belum ada target tabungan. "
                "Buat target pertamamu di menu <b>Target Tabungan</b> pada Web SakuCampus!"
            ),
        )
        return

    lines = ["<b>Progres Target Tabungan</b>\n"]
    for g in goals:
        pct = round((g.saved_amount / g.target_amount) * 100) if g.target_amount > 0 else 0
        lines.append(
            f"• <b>{html.escape(g.name)}</b> ({pct}%)\n"
            f"  {format_rupiah(g.saved_amount)} / {format_rupiah(g.target_amount)} "
            f"(Deadline: {g.deadline.isoformat()})"
        )
    await client.send_message(chat_id, "\n".join(lines))


async def _handle_pdf(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
    arg: str,
) -> None:
    chosen = arg.strip().lower()
    preset: ReportPeriodPreset = (
        chosen if chosen in {"7d", "30d", "month", "all"} else "30d"  # type: ignore[assignment]
    )
    pdf_bytes, filename = generate_financial_report_pdf(db, user, preset=preset)
    caption = f"Laporan Keuangan SakuCampus ({preset}) untuk <b>{html.escape(user.name)}</b>."
    sent = await client.send_document(chat_id, filename, pdf_bytes, caption=caption)
    if not sent:
        await client.send_message(
            chat_id,
            "Maaf, pengiriman file PDF gagal. Silakan coba lagi atau unduh melalui Web SakuCampus.",
        )


async def _handle_batal(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
) -> None:
    latest_tx = db.scalar(
        select(Transaction)
        .where(
            Transaction.user_id == user.id,
            Transaction.source == "telegram",
        )
        .order_by(desc(Transaction.created_at))
        .limit(1)
    )
    if latest_tx is None:
        await client.send_message(
            chat_id,
            "Belum ada transaksi dari Telegram yang dapat dibatalkan.",
        )
        return

    now = datetime.now(UTC)
    created_utc = _ensure_utc(latest_tx.created_at)
    if now - created_utc > timedelta(minutes=UNDO_WINDOW_MINUTES):
        await client.send_message(
            chat_id,
            (
                f"Transaksi Telegram terakhir (<b>{html.escape(latest_tx.description)}</b> - "
                f"{format_rupiah(latest_tx.amount)}) tercatat lebih dari "
                f"{UNDO_WINDOW_MINUTES} menit lalu. "
                "Silakan ubah atau hapus melalui halaman <b>Transaksi</b> di Web SakuCampus."
            ),
        )
        return

    desc_copy = latest_tx.description
    amount_copy = latest_tx.amount
    eval_res = delete_transaction_with_evaluation(db, user.id, latest_tx.id)

    await client.send_message(
        chat_id,
        (
            "<b>Transaksi berhasil dibatalkan!</b>\n"
            f"• Dihapus: {html.escape(desc_copy)} ({format_rupiah(amount_copy)})\n"
            f"• Saldo Terbaru: <b>{format_rupiah(eval_res.metrics.balance)}</b>"
        ),
    )


async def _handle_natural_transaction(
    db: Session,
    client: TelegramClientProtocol,
    user: User,
    chat_id: int,
    raw_text: str,
) -> None:
    parsed = parse_transaction_text(raw_text)
    if parsed.amount is None:
        await client.send_message(
            chat_id,
            (
                "Maaf, nominal transaksi belum terbaca dari pesanmu.\n\n"
                "Coba sertakan angka nominal seperti contoh berikut:\n"
                "• <code>makan ayam geprek 20rb</code>\n"
                "• <code>kiriman ortu 500k</code>\n"
                "• <code>bayar kos 850.000</code>"
            ),
        )
        return

    payload = TransactionCreate(
        description=parsed.description,
        amount=parsed.amount,
        type=parsed.type,
        category=parsed.category,
        date=date.today(),
        source="telegram",
        raw_text=raw_text,
        nlp_confidence=parsed.confidence,
    )
    tx, evaluation = create_transaction_with_evaluation(db, user.id, payload)

    conf_pct = round(parsed.confidence * 100)
    lines = [
        "<b>Transaksi Tercatat!</b>",
        f"• Deskripsi: <b>{html.escape(tx.description)}</b>",
        f"• Nominal: <b>{format_rupiah(tx.amount)}</b>",
        f"• Jenis: {_TYPE_LABEL.get(tx.type, tx.type)}",
        f"• Kategori: {html.escape(tx.category)} <i>(keyakinan {conf_pct}%)</i>",
        f"• Saldo Berjalan: <b>{format_rupiah(evaluation.metrics.balance)}</b>",
    ]
    if parsed.needs_confirmation:
        lines.append(
            "<i>Catatan: Keyakinan kategori cukup rendah, "
            "kamu dapat menyesuaikannya di Web bila perlu.</i>"
        )
    lines.append("\n<i>Ketik /batal dalam 15 menit jika pencatatan keliru.</i>")

    if evaluation.new_notifications:
        alert_blocks = [
            format_notification_alert_html(notif) for notif in evaluation.new_notifications
        ]
        lines.append("\n" + "\n\n".join(alert_blocks))

    delivered = await client.send_message(chat_id, "\n".join(lines))
    if delivered and evaluation.new_notifications:
        for notif in evaluation.new_notifications:
            notif.sent_to_telegram = True
        db.commit()


async def handle_telegram_update(
    db: Session,
    update: dict[str, Any],
    client: TelegramClientProtocol,
) -> bool:
    """Process a single Telegram Update object. Returns True if handled, False if ignored."""
    message = update.get("message")
    if not isinstance(message, dict):
        return False

    chat = message.get("chat")
    if not isinstance(chat, dict) or chat.get("type") != "private":
        # Strictly ignore group/supergroup/channel chats to protect financial privacy
        return False

    from_user = message.get("from")
    if not isinstance(from_user, dict):
        return False

    chat_id = chat.get("id")
    telegram_user_id = from_user.get("id")
    if not isinstance(chat_id, int) or not isinstance(telegram_user_id, int):
        return False

    telegram_username = from_user.get("username")
    if telegram_username is not None and not isinstance(telegram_username, str):
        telegram_username = None

    raw_text = message.get("text")
    if not isinstance(raw_text, str) or not raw_text.strip():
        return False

    stripped = raw_text.strip()

    if stripped.startswith("/"):
        parts = stripped.split(maxsplit=1)
        cmd_token = parts[0].split("@", 1)[0].lower()
        arg = parts[1].strip() if len(parts) > 1 else ""

        if cmd_token == "/start":
            await _handle_start(
                db,
                client,
                chat_id=chat_id,
                telegram_user_id=telegram_user_id,
                telegram_username=telegram_username,
                arg=arg,
            )
            return True

        if cmd_token in {"/bantuan", "/help"}:
            await client.send_message(chat_id, _help_text())
            return True

        user = get_user_by_telegram_id(db, telegram_user_id)
        if user is None:
            await client.send_message(chat_id, _unlinked_message())
            return True

        if user.telegram_chat_id != chat_id:
            user.telegram_chat_id = chat_id
            db.commit()

        if cmd_token == "/saldo":
            await _handle_saldo(db, client, user, chat_id)
        elif cmd_token == "/ringkasan":
            await _handle_ringkasan(db, client, user, chat_id)
        elif cmd_token == "/budget":
            await _handle_budget(db, client, user, chat_id)
        elif cmd_token == "/goals":
            await _handle_goals(db, client, user, chat_id)
        elif cmd_token == "/pdf":
            await _handle_pdf(db, client, user, chat_id, arg)
        elif cmd_token == "/batal":
            await _handle_batal(db, client, user, chat_id)
        else:
            await client.send_message(
                chat_id,
                (
                    "Perintah tidak dikenali. "
                    "Ketik /bantuan untuk melihat daftar perintah yang tersedia."
                ),
            )
        return True

    # Natural language message -> require linked account
    user = get_user_by_telegram_id(db, telegram_user_id)
    if user is None:
        await client.send_message(chat_id, _unlinked_message())
        return True

    if user.telegram_chat_id != chat_id:
        user.telegram_chat_id = chat_id
        db.commit()

    await _handle_natural_transaction(db, client, user, chat_id, stripped)
    return True
