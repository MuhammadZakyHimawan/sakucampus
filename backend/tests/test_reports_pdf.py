import re
import uuid
from datetime import date, timedelta

from sqlalchemy import select

from app.models import User
from app.modules.reports.pdf_generator import (
    generate_financial_report_pdf,
    sanitize_pdf_text,
)


def _register_user(
    client,
    email: str,
    name: str = "Andi Mahasiswa",
) -> tuple[uuid.UUID, dict[str, str]]:
    res = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "Password123"},
    )
    assert res.status_code == 201
    body = res.json()
    return uuid.UUID(body["user"]["id"]), {"Authorization": f"Bearer {body['accessToken']}"}


def _count_pdf_pages(pdf_bytes: bytes) -> int:
    # Count "/Type /Page" occurrences (excluding "/Type /Pages")
    return len(re.findall(rb"/Type\s*/Page\b", pdf_bytes))


def test_sanitize_pdf_text_handles_emojis_and_unicode():
    cleaned = sanitize_pdf_text("Kopi susu ☕🔥 — 'mantap' & hemat\u00a0banget")
    assert "☕" not in cleaned
    assert "🔥" not in cleaned
    assert "Kopi susu" in cleaned
    assert "-" in cleaned
    assert sanitize_pdf_text("☕🔥") == "-"


def test_pdf_report_with_empty_user_data_succeeds(client):
    _, headers = _register_user(client, "empty_pdf@example.com", "Mahasiswa Baru")

    res = client.get("/api/v1/reports/pdf", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert 'attachment; filename="SakuCampus_Laporan_' in res.headers["content-disposition"]
    assert res.headers["content-disposition"].endswith('.pdf"')
    assert res.content.startswith(b"%PDF-")
    assert b"%%EOF" in res.content[-64:]
    assert len(res.content) > 1500
    assert _count_pdf_pages(res.content) >= 1


def test_pdf_report_full_data_emojis_multipage_and_cors(client):
    _, headers = _register_user(client, "full_pdf@example.com", "Andi Pratama 🚀")
    today = date.today()

    client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={"initialBalance": 500000, "minBalance": 250000},
    )
    client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Gaya Hidup",
            "limit": 150000,
            "periodStart": today.replace(day=1).isoformat(),
            "periodEnd": today.isoformat(),
        },
    )
    goal_res = client.post(
        "/api/v1/goals",
        headers=headers,
        json={
            "name": "Dana Darurat & Buku Kuliah 📚",
            "targetAmount": 1000000,
            "deadline": (today + timedelta(days=60)).isoformat(),
        },
    )
    goal_id = goal_res.json()["id"]
    client.post(
        f"/api/v1/goals/{goal_id}/contributions",
        headers=headers,
        json={"amount": 350000},
    )

    # Create 28 transactions including emojis, XML special chars (<, >, &), and long descriptions
    for idx in range(28):
        is_telegram = idx % 2 == 0
        desc = (
            f"Kopi ☕ & Roti <Spesial> #{idx + 1} bareng teman diskusi proyek akhir "
            "capstone sistem informasi keuangan mahasiswa di kantin kampus"
        )
        client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "description": desc,
                "amount": 15000 + (idx * 1000),
                "type": "expense" if idx % 5 != 0 else "income",
                "category": "Gaya Hidup" if idx % 5 != 0 else "Uang Saku",
                "date": (today - timedelta(days=idx % 10)).isoformat(),
                "source": "telegram" if is_telegram else "manual",
            },
        )

    res = client.get(
        "/api/v1/reports/pdf",
        headers={**headers, "Origin": "http://localhost:5173"},
        params={"preset": "30d"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "content-disposition" in res.headers.get("access-control-expose-headers", "").lower()
    assert res.content.startswith(b"%PDF-")
    assert len(res.content) > 4000
    assert _count_pdf_pages(res.content) >= 2


def test_pdf_report_filters_validation_security_and_direct_helper(client, db_session):
    assert client.get("/api/v1/reports/pdf").status_code == 401

    user_a_id, headers_a = _register_user(client, "pdf_a@example.com", "User Alpha")
    user_b_id, headers_b = _register_user(client, "pdf_b@example.com", "User Beta")
    today = date.today()

    client.post(
        "/api/v1/transactions",
        headers=headers_a,
        json={
            "description": "Transaksi Eksklusif Alpha",
            "amount": 250000,
            "type": "expense",
            "category": "Pendidikan",
            "date": today.isoformat(),
        },
    )

    for preset in ("7d", "30d", "month", "all"):
        r = client.get("/api/v1/reports/pdf", headers=headers_a, params={"preset": preset})
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF-")

    custom_ok = client.get(
        "/api/v1/reports/pdf",
        headers=headers_a,
        params={
            "start_date": (today - timedelta(days=5)).isoformat(),
            "end_date": today.isoformat(),
        },
    )
    assert custom_ok.status_code == 200
    assert (
        f"SakuCampus_Laporan_{(today - timedelta(days=5)).isoformat()}_{today.isoformat()}.pdf"
        in custom_ok.headers["content-disposition"]
    )

    # Invalid ranges -> 422
    assert (
        client.get(
            "/api/v1/reports/pdf",
            headers=headers_a,
            params={
                "start_date": today.isoformat(),
                "end_date": (today - timedelta(days=5)).isoformat(),
            },
        ).status_code
        == 422
    )
    assert (
        client.get(
            "/api/v1/reports/pdf",
            headers=headers_a,
            params={"start_date": today.isoformat()},
        ).status_code
        == 422
    )

    # Direct helper call (used by Telegram /pdf in Phase 5) & multi-user isolation
    user_a = db_session.scalar(select(User).where(User.id == user_a_id))
    user_b = db_session.scalar(select(User).where(User.id == user_b_id))
    pdf_a, fname_a = generate_financial_report_pdf(db_session, user_a, preset="30d")
    pdf_b, fname_b = generate_financial_report_pdf(db_session, user_b, preset="30d")

    assert pdf_a.startswith(b"%PDF-")
    assert pdf_b.startswith(b"%PDF-")
    assert fname_a.endswith(".pdf")
    assert fname_b.endswith(".pdf")
    # User A has transactions + alerts so PDF stream is larger than empty User B's PDF
    assert len(pdf_a) > len(pdf_b)
    assert client.get("/api/v1/reports/pdf", headers=headers_b).status_code == 200
