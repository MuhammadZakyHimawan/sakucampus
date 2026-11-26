from datetime import date, timedelta


def _auth_headers(client, email: str = "usera@example.com", name: str = "User A") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "Password123"},
    )
    assert response.status_code == 201
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_transactions_crud_and_filters(client):
    headers = _auth_headers(client)
    today = date.today()
    yesterday = today - timedelta(days=1)

    create_expense = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Makan ayam geprek",
            "amount": 20000,
            "type": "expense",
            "category": "Kebutuhan Primer",
            "date": today.isoformat(),
            "source": "telegram",
            "rawText": "makan ayam geprek 20rb",
            "nlpConfidence": 0.93,
        },
    )
    assert create_expense.status_code == 201
    tx_expense = create_expense.json()
    assert tx_expense["amount"] == 20000
    assert tx_expense["source"] == "telegram"
    assert tx_expense["rawText"] == "makan ayam geprek 20rb"
    assert tx_expense["nlpConfidence"] == 0.93

    create_income = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Uang saku bulanan",
            "amount": 1500000,
            "type": "income",
            "category": "Uang Saku",
            "date": yesterday.isoformat(),
            "source": "manual",
        },
    )
    assert create_income.status_code == 201

    list_all = client.get("/api/v1/transactions", headers=headers)
    assert list_all.status_code == 200
    assert len(list_all.json()) == 2

    filtered = client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "expense", "source": "telegram", "search": "geprek"},
    )
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1
    assert filtered.json()[0]["id"] == tx_expense["id"]

    detail = client.get(f"/api/v1/transactions/{tx_expense['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["description"] == "Makan ayam geprek"

    updated = client.patch(
        f"/api/v1/transactions/{tx_expense['id']}",
        headers=headers,
        json={"amount": 25000, "note": "Tambah es teh"},
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 25000
    assert updated.json()["note"] == "Tambah es teh"

    deleted = client.delete(f"/api/v1/transactions/{tx_expense['id']}", headers=headers)
    assert deleted.status_code == 204

    after_delete = client.get(f"/api/v1/transactions/{tx_expense['id']}", headers=headers)
    assert after_delete.status_code == 404


def test_transactions_validation_rejects_invalid_category_and_amount(client):
    headers = _auth_headers(client)
    today = date.today().isoformat()

    bad_category = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Salah kategori",
            "amount": 15000,
            "type": "expense",
            "category": "Uang Saku",
            "date": today,
        },
    )
    assert bad_category.status_code == 422

    bad_amount = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Nominal nol",
            "amount": 0,
            "type": "expense",
            "category": "Kebutuhan Primer",
            "date": today,
        },
    )
    assert bad_amount.status_code == 422


def test_transactions_multi_user_isolation(client):
    headers_a = _auth_headers(client, email="a@example.com", name="User A")
    headers_b = _auth_headers(client, email="b@example.com", name="User B")

    created = client.post(
        "/api/v1/transactions",
        headers=headers_a,
        json={
            "description": "Rahasia User A",
            "amount": 50000,
            "type": "expense",
            "category": "Gaya Hidup",
            "date": date.today().isoformat(),
        },
    )
    assert created.status_code == 201
    tx_id = created.json()["id"]

    assert client.get("/api/v1/transactions", headers=headers_b).json() == []
    assert client.get(f"/api/v1/transactions/{tx_id}", headers=headers_b).status_code == 404
    assert (
        client.patch(
            f"/api/v1/transactions/{tx_id}",
            headers=headers_b,
            json={"amount": 99999},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/transactions/{tx_id}", headers=headers_b).status_code == 404
