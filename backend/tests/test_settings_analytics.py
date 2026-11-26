from datetime import date, timedelta


def _auth_headers(
    client,
    email: str = "settings@example.com",
    password: str = "Password123",
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Andi Mahasiswa", "email": email, "password": password},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_finance_settings_profile_and_change_password(client):
    headers = _auth_headers(client)
    _auth_headers(client, email="other@example.com")

    settings_get = client.get("/api/v1/settings/finance", headers=headers)
    assert settings_get.status_code == 200
    assert settings_get.json()["currency"] == "IDR"

    settings_patch = client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={
            "initialBalance": 1000000,
            "minBalance": 250000,
            "period": "7d",
            "notifyBudget": False,
        },
    )
    assert settings_patch.status_code == 200
    assert settings_patch.json()["initialBalance"] == 1000000
    assert settings_patch.json()["minBalance"] == 250000
    assert settings_patch.json()["period"] == "7d"
    assert settings_patch.json()["notifyBudget"] is False

    profile_ok = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"name": "Andi Baru", "email": "andi.baru@example.com"},
    )
    assert profile_ok.status_code == 200
    assert profile_ok.json()["name"] == "Andi Baru"
    assert profile_ok.json()["email"] == "andi.baru@example.com"

    profile_conflict = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"email": "other@example.com"},
    )
    assert profile_conflict.status_code == 409

    wrong_pw = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "WrongPassword1", "newPassword": "NewPassword123"},
    )
    assert wrong_pw.status_code == 400

    change_pw = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "Password123", "newPassword": "NewPassword123"},
    )
    assert change_pw.status_code == 204

    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "andi.baru@example.com", "password": "Password123"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "andi.baru@example.com", "password": "NewPassword123"},
    )
    assert new_login.status_code == 200


def test_analytics_summary_and_report_calculations(client):
    headers = _auth_headers(client, email="analytics@example.com")
    today = date.today()

    client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={"initialBalance": 1000000, "minBalance": 250000},
    )

    # Without expenses -> runwayDays must be null
    empty_summary = client.get(
        "/api/v1/analytics/summary", headers=headers, params={"preset": "7d"}
    )
    assert empty_summary.status_code == 200
    assert empty_summary.json()["summary"]["balance"] == 1000000
    assert empty_summary.json()["summary"]["dailyBurnRate"] == 0
    assert empty_summary.json()["summary"]["runwayDays"] is None
    assert empty_summary.json()["summary"]["financialStatus"] == "normal"

    # Add income, expense, and transfer (transfer must NOT affect balance/income/expense)
    client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Uang saku",
            "amount": 500000,
            "type": "income",
            "category": "Uang Saku",
            "date": today.isoformat(),
        },
    )
    client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Makan & jajan",
            "amount": 700000,
            "type": "expense",
            "category": "Kebutuhan Primer",
            "date": today.isoformat(),
        },
    )
    client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Transfer internal tabungan",
            "amount": 400000,
            "type": "transfer",
            "category": "Lainnya",
            "date": today.isoformat(),
        },
    )
    client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Kebutuhan Primer",
            "limit": 800000,
            "periodStart": (today - timedelta(days=6)).isoformat(),
            "periodEnd": today.isoformat(),
        },
    )

    summary_res = client.get("/api/v1/analytics/summary", headers=headers, params={"preset": "7d"})
    assert summary_res.status_code == 200
    body = summary_res.json()
    # Balance = 1,000,000 + 500,000 - 700,000 = 800,000 (transfer excluded!)
    assert body["summary"]["balance"] == 800000
    assert body["summary"]["totalIncome"] == 500000
    assert body["summary"]["totalExpense"] == 700000
    assert body["summary"]["netCashFlow"] == -200000
    # 700,000 / 7 days = 100,000/day -> runway = 800,000 // 100,000 = 8 days
    assert body["summary"]["dailyBurnRate"] == 100000
    assert body["summary"]["runwayDays"] == 8
    # 700,000 / 800,000 = 88% (warning) + runway 8 days (warning) -> warning
    assert body["summary"]["financialStatus"] == "warning"
    assert len(body["budgets"]) == 1
    assert body["budgets"][0]["used"] == 700000
    assert body["budgets"][0]["status"] == "warning"

    report_res = client.get("/api/v1/analytics/report", headers=headers, params={"preset": "7d"})
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["balance"] == 800000
    assert report["dailyBurnRate"] == 100000
    assert report["runwayDays"] == 8
    assert report["summary"]["income"] == 500000
    assert report["summary"]["expense"] == 700000
    assert report["summary"]["transactionCount"] == 3
    assert len(report["transactions"]) == 3
