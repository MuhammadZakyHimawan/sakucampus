BUDGET_PAYLOAD = {
    "category": "Gaya Hidup",
    "limit": 300_000,
    "periodStart": "2026-11-01",
    "periodEnd": "2026-11-30",
}


def create_budget(client, headers, **overrides):
    payload = {**BUDGET_PAYLOAD, **overrides}
    return client.post("/api/v1/budgets", json=payload, headers=headers)


def test_create_budget_returns_limit(client, auth):
    account = auth()
    response = create_budget(client, account["headers"])

    assert response.status_code == 201
    body = response.json()
    assert body["category"] == "Gaya Hidup"
    assert body["limit"] == 300_000
    assert body["periodStart"] == "2026-11-01"
    assert body["periodEnd"] == "2026-11-30"


def test_budget_overlap_is_rejected(client, auth):
    headers = auth()["headers"]
    create_budget(client, headers)

    overlap = create_budget(
        client,
        headers,
        periodStart="2026-11-15",
        periodEnd="2026-12-15",
    )

    assert overlap.status_code == 409
    assert "sudah ada" in overlap.json()["detail"]


def test_update_and_delete_budget(client, auth):
    headers = auth()["headers"]
    created = create_budget(client, headers).json()

    updated = client.patch(
        f"/api/v1/budgets/{created['id']}",
        json={**BUDGET_PAYLOAD, "limit": 450_000},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["limit"] == 450_000

    deleted = client.delete(f"/api/v1/budgets/{created['id']}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/budgets", headers=headers).json() == []


def test_budget_isolation_between_users(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")
    created = create_budget(client, first["headers"]).json()

    assert client.get("/api/v1/budgets", headers=second["headers"]).json() == []
    assert (
        client.patch(
            f"/api/v1/budgets/{created['id']}",
            json=BUDGET_PAYLOAD,
            headers=second["headers"],
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/api/v1/budgets/{created['id']}", headers=second["headers"]).status_code
        == 404
    )


def test_budget_period_validation(client, auth):
    headers = auth()["headers"]
    response = client.post(
        "/api/v1/budgets",
        json={**BUDGET_PAYLOAD, "periodStart": "2026-11-30", "periodEnd": "2026-11-01"},
        headers=headers,
    )

    assert response.status_code == 422
