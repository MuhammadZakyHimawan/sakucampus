from app.models import Transaction


def _create_transaction(
    client,
    headers: dict,
    *,
    description: str,
    amount: int,
    transaction_type: str,
    category: str,
    day: str,
) -> None:
    response = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": description,
            "amount": amount,
            "type": transaction_type,
            "category": category,
            "date": day,
            "source": "manual",
        },
    )
    assert response.status_code == 201, response.json()


def _seed_finance_data(client, headers: dict) -> None:
    response = client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={
            "initialBalance": 1_000_000,
            "minBalance": 250_000,
            "period": "7d",
        },
    )
    assert response.status_code == 200, response.json()

    _create_transaction(
        client,
        headers,
        description="Uang saku",
        amount=500_000,
        transaction_type="income",
        category="Uang Saku",
        day="2026-11-15",
    )
    _create_transaction(
        client,
        headers,
        description="Makan",
        amount=100_000,
        transaction_type="expense",
        category="Kebutuhan Primer",
        day="2026-11-14",
    )
    _create_transaction(
        client,
        headers,
        description="Kopi",
        amount=50_000,
        transaction_type="expense",
        category="Gaya Hidup",
        day="2026-11-14",
    )
    _create_transaction(
        client,
        headers,
        description="Kos lama",
        amount=200_000,
        transaction_type="expense",
        category="Kebutuhan Primer",
        day="2026-11-01",
    )

    response = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Kebutuhan Primer",
            "limit": 300_000,
            "periodStart": "2026-11-01",
            "periodEnd": "2026-11-30",
        },
    )
    assert response.status_code == 201, response.json()


def test_dashboard_endpoint_returns_consistent_aggregates(client, auth, db_session):
    account = auth()
    _seed_finance_data(client, account["headers"])

    response = client.get(
        "/api/v1/analytics/dashboard",
        headers=account["headers"],
        params={"preset": "7d", "reference": "2026-11-19"},
    )

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["range"] == {
        "start": "2026-11-13",
        "end": "2026-11-19",
        "label": "7 hari terakhir",
    }
    assert body["summary"] == {
        "balance": 1_150_000,
        "minBalance": 250_000,
        "income": 500_000,
        "expense": 150_000,
        "net": 350_000,
        "burnRate": 21_429,
    }
    assert body["transactionCount"] == 3
    assert body["categories"] == [
        {"category": "Kebutuhan Primer", "total": 100_000},
        {"category": "Gaya Hidup", "total": 50_000},
    ]
    assert body["budgets"][0]["status"] == "exceeded"
    assert body["budgets"][0]["percentage"] == 100
    assert body["recentTransactions"][0]["description"] == "Uang saku"
    assert db_session.query(Transaction).count() == 4


def test_analytics_endpoints_are_scoped_to_current_user(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")
    _seed_finance_data(client, first["headers"])

    second_dashboard = client.get(
        "/api/v1/analytics/dashboard",
        headers=second["headers"],
        params={"preset": "7d", "reference": "2026-11-19"},
    )

    assert second_dashboard.status_code == 200
    assert second_dashboard.json()["transactionCount"] == 0
    assert second_dashboard.json()["summary"]["balance"] == 0


def test_report_and_contract_endpoints(client, auth):
    account = auth()
    _seed_finance_data(client, account["headers"])

    report = client.get(
        "/api/v1/analytics/report",
        headers=account["headers"],
        params={"preset": "7d", "reference": "2026-11-19"},
    )
    summary = client.get(
        "/api/v1/analytics/summary",
        headers=account["headers"],
        params={"preset": "7d", "reference": "2026-11-19"},
    )
    expenses = client.get(
        "/api/v1/analytics/expenses",
        headers=account["headers"],
        params={"preset": "7d", "reference": "2026-11-19"},
    )
    trends = client.get(
        "/api/v1/analytics/trends",
        headers=account["headers"],
        params={"preset": "7d", "reference": "2026-11-19"},
    )

    assert report.status_code == 200
    assert report.json()["summary"]["dailyAverageExpense"] == 21_429
    assert report.json()["comparison"]["incomeChange"] is None
    assert len(report.json()["cashflow"]) == 7
    assert summary.status_code == 200
    assert summary.json()["expense"] == 150_000
    assert expenses.status_code == 200
    assert len(expenses.json()) == 2
    assert trends.status_code == 200
    assert len(trends.json()) == 7
