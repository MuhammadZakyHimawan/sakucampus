TRANSACTION_PAYLOAD = {
    "description": "Makan siang",
    "amount": 25_000,
    "type": "expense",
    "category": "Kebutuhan Primer",
    "date": "2026-11-10",
    "source": "telegram",
}


def create_transaction(client, headers, **overrides):
    payload = {**TRANSACTION_PAYLOAD, **overrides}
    return client.post("/api/v1/transactions", json=payload, headers=headers)


def test_create_transaction_returns_camel_case(client, auth):
    account = auth()
    response = create_transaction(client, account["headers"])

    assert response.status_code == 201
    body = response.json()
    assert body["description"] == "Makan siang"
    assert body["amount"] == 25_000
    assert body["type"] == "expense"
    assert body["category"] == "Kebutuhan Primer"
    assert body["date"] == "2026-11-10"
    assert body["source"] == "telegram"


def test_list_transactions_filters_and_sorts(client, auth):
    account = auth()
    headers = account["headers"]
    create_transaction(client, headers, description="Kopi", date="2026-11-01", amount=15_000)
    create_transaction(client, headers, description="Bensin", date="2026-11-05", amount=60_000)

    response = client.get("/api/v1/transactions", headers=headers)

    assert response.status_code == 200
    assert [item["description"] for item in response.json()] == ["Bensin", "Kopi"]

    filtered = client.get(
        "/api/v1/transactions",
        params={"search": "kopi"},
        headers=headers,
    )
    assert [item["description"] for item in filtered.json()] == ["Kopi"]

    sorted_by_amount = client.get(
        "/api/v1/transactions",
        params={"sort": "amount", "order": "asc"},
        headers=headers,
    )
    assert [item["amount"] for item in sorted_by_amount.json()] == [15_000, 60_000]


def test_update_and_delete_transaction(client, auth):
    account = auth()
    headers = account["headers"]
    created = create_transaction(client, headers).json()

    updated = client.patch(
        f"/api/v1/transactions/{created['id']}",
        json={**TRANSACTION_PAYLOAD, "description": "Makan malam", "amount": 35_000},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Makan malam"
    assert updated.json()["amount"] == 35_000

    deleted = client.delete(f"/api/v1/transactions/{created['id']}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/transactions", headers=headers).json() == []


def test_transaction_validation(client, auth):
    headers = auth()["headers"]

    invalid_amount = create_transaction(client, headers, amount=0)
    assert invalid_amount.status_code == 422

    invalid_category = create_transaction(client, headers, category="Uang Saku")
    assert invalid_category.status_code == 422


def test_transaction_isolation_between_users(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")
    created = create_transaction(client, first["headers"]).json()

    assert client.get("/api/v1/transactions", headers=second["headers"]).json() == []
    assert (
        client.get(f"/api/v1/transactions/{created['id']}", headers=second["headers"]).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/transactions/{created['id']}",
            json=TRANSACTION_PAYLOAD,
            headers=second["headers"],
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/transactions/{created['id']}",
            headers=second["headers"],
        ).status_code
        == 404
    )


def test_transactions_require_authentication(client):
    assert client.get("/api/v1/transactions").status_code == 401
