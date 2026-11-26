def _auth_headers(client, email: str = "budgeta@example.com") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Budget User", "email": email, "password": "Password123"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_budgets_crud_and_limit_mapping(client):
    headers = _auth_headers(client)

    created = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Kebutuhan Primer",
            "limit": 800000,
            "periodStart": "2026-11-01",
            "periodEnd": "2026-11-30",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["limit"] == 800000
    assert body["category"] == "Kebutuhan Primer"
    assert body["periodStart"] == "2026-11-01"
    assert body["periodEnd"] == "2026-11-30"

    listed = client.get("/api/v1/budgets", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["limit"] == 800000

    updated = client.patch(
        f"/api/v1/budgets/{body['id']}",
        headers=headers,
        json={"limit": 950000},
    )
    assert updated.status_code == 200
    assert updated.json()["limit"] == 950000

    deleted = client.delete(f"/api/v1/budgets/{body['id']}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/budgets", headers=headers).json() == []


def test_budgets_reject_duplicate_and_overlapping_period(client):
    headers = _auth_headers(client)

    first = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Gaya Hidup",
            "limit": 300000,
            "periodStart": "2026-11-01",
            "periodEnd": "2026-11-30",
        },
    )
    assert first.status_code == 201

    overlap = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Gaya Hidup",
            "limit": 200000,
            "periodStart": "2026-11-15",
            "periodEnd": "2026-12-15",
        },
    )
    assert overlap.status_code == 409

    invalid_category = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Uang Saku",
            "limit": 200000,
            "periodStart": "2026-12-01",
            "periodEnd": "2026-12-31",
        },
    )
    assert invalid_category.status_code == 422

    invalid_dates = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Transportasi",
            "limit": 200000,
            "periodStart": "2026-12-15",
            "periodEnd": "2026-12-01",
        },
    )
    assert invalid_dates.status_code == 422


def test_budgets_multi_user_isolation(client):
    headers_a = _auth_headers(client, email="ba@example.com")
    headers_b = _auth_headers(client, email="bb@example.com")

    created = client.post(
        "/api/v1/budgets",
        headers=headers_a,
        json={
            "category": "Pendidikan",
            "limit": 400000,
            "periodStart": "2026-11-01",
            "periodEnd": "2026-11-30",
        },
    )
    assert created.status_code == 201
    budget_id = created.json()["id"]

    assert client.get("/api/v1/budgets", headers=headers_b).json() == []
    assert (
        client.patch(
            f"/api/v1/budgets/{budget_id}",
            headers=headers_b,
            json={"limit": 100000},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/budgets/{budget_id}", headers=headers_b).status_code == 404
