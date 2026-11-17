GOAL_PAYLOAD = {
    "name": "Dana Darurat",
    "targetAmount": 5_000_000,
    "deadline": "2027-02-01",
}


def create_goal(client, headers, **overrides):
    payload = {**GOAL_PAYLOAD, **overrides}
    return client.post("/api/v1/goals", json=payload, headers=headers)


def test_create_goal_starts_with_zero_saved_amount(client, auth):
    account = auth()
    response = create_goal(client, account["headers"])

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Dana Darurat"
    assert body["targetAmount"] == 5_000_000
    assert body["savedAmount"] == 0
    assert body["deadline"] == "2027-02-01"


def test_add_goal_contribution_updates_saved_amount(client, auth):
    headers = auth()["headers"]
    goal = create_goal(client, headers).json()

    response = client.post(
        f"/api/v1/goals/{goal['id']}/contributions",
        json={"amount": 750_000, "note": "Tabungan bulan ini"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["savedAmount"] == 750_000

    second = client.post(
        f"/api/v1/goals/{goal['id']}/contributions",
        json={"amount": 250_000},
        headers=headers,
    )
    assert second.json()["savedAmount"] == 1_000_000

    listed = client.get("/api/v1/goals", headers=headers).json()
    assert listed[0]["savedAmount"] == 1_000_000


def test_update_and_delete_goal(client, auth):
    headers = auth()["headers"]
    goal = create_goal(client, headers).json()

    updated = client.patch(
        f"/api/v1/goals/{goal['id']}",
        json={**GOAL_PAYLOAD, "name": "Dana Darurat Baru"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Dana Darurat Baru"

    deleted = client.delete(f"/api/v1/goals/{goal['id']}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/goals", headers=headers).json() == []


def test_goal_contribution_validation(client, auth):
    headers = auth()["headers"]
    goal = create_goal(client, headers).json()

    response = client.post(
        f"/api/v1/goals/{goal['id']}/contributions",
        json={"amount": 0},
        headers=headers,
    )

    assert response.status_code == 422


def test_goal_isolation_between_users(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")
    goal = create_goal(client, first["headers"]).json()

    assert client.get("/api/v1/goals", headers=second["headers"]).json() == []
    assert (
        client.post(
            f"/api/v1/goals/{goal['id']}/contributions",
            json={"amount": 100_000},
            headers=second["headers"],
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/api/v1/goals/{goal['id']}", headers=second["headers"]).status_code == 404
    )
