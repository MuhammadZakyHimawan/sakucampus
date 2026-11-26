def _auth_headers(client, email: str = "goala@example.com") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Goal User", "email": email, "password": "Password123"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_goals_crud_and_contributions_aggregation(client):
    headers = _auth_headers(client)

    created = client.post(
        "/api/v1/goals",
        headers=headers,
        json={
            "name": "Dana Darurat",
            "targetAmount": 1500000,
            "deadline": "2027-06-01",
        },
    )
    assert created.status_code == 201
    goal = created.json()
    assert goal["savedAmount"] == 0

    contrib1 = client.post(
        f"/api/v1/goals/{goal['id']}/contributions",
        headers=headers,
        json={"amount": 250000, "note": "Sisihan pertama"},
    )
    assert contrib1.status_code == 201
    assert contrib1.json()["savedAmount"] == 250000

    contrib2 = client.post(
        f"/api/v1/goals/{goal['id']}/contributions",
        headers=headers,
        json={"amount": 350000},
    )
    assert contrib2.status_code == 201
    assert contrib2.json()["savedAmount"] == 600000

    listed = client.get("/api/v1/goals", headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["savedAmount"] == 600000

    history = client.get(f"/api/v1/goals/{goal['id']}/contributions", headers=headers)
    assert history.status_code == 200
    assert len(history.json()) == 2

    invalid_contrib = client.post(
        f"/api/v1/goals/{goal['id']}/contributions",
        headers=headers,
        json={"amount": 0},
    )
    assert invalid_contrib.status_code == 422

    updated = client.patch(
        f"/api/v1/goals/{goal['id']}",
        headers=headers,
        json={"name": "Dana Darurat Kuliah", "targetAmount": 2000000},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Dana Darurat Kuliah"
    assert updated.json()["savedAmount"] == 600000

    deleted = client.delete(f"/api/v1/goals/{goal['id']}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/goals", headers=headers).json() == []


def test_goals_multi_user_isolation(client):
    headers_a = _auth_headers(client, email="ga@example.com")
    headers_b = _auth_headers(client, email="gb@example.com")

    created = client.post(
        "/api/v1/goals",
        headers=headers_a,
        json={"name": "Laptop Baru", "targetAmount": 8000000, "deadline": "2027-08-01"},
    )
    goal_id = created.json()["id"]

    assert client.get("/api/v1/goals", headers=headers_b).json() == []
    assert (
        client.patch(
            f"/api/v1/goals/{goal_id}",
            headers=headers_b,
            json={"name": "Bajak"},
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/v1/goals/{goal_id}/contributions",
            headers=headers_b,
            json={"amount": 100000},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/goals/{goal_id}", headers=headers_b).status_code == 404
