def test_get_default_finance_settings(client, auth):
    account = auth()

    response = client.get("/api/v1/settings/finance", headers=account["headers"])

    assert response.status_code == 200
    assert response.json() == {
        "currency": "IDR",
        "initialBalance": 0,
        "minBalance": 0,
        "period": "30d",
        "notifyBudget": True,
        "notifyBalance": True,
        "notifyGoal": True,
    }


def test_update_finance_settings(client, auth):
    account = auth()

    response = client.patch(
        "/api/v1/settings/finance",
        json={
            "initialBalance": 1_000_000,
            "minBalance": 250_000,
            "period": "month",
            "notifyBudget": False,
        },
        headers=account["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["initialBalance"] == 1_000_000
    assert body["minBalance"] == 250_000
    assert body["period"] == "month"
    assert body["notifyBudget"] is False
    assert body["notifyBalance"] is True

    me = client.get("/api/v1/auth/me", headers=account["headers"]).json()
    assert me["initialBalance"] == 1_000_000
    assert me["minBalance"] == 250_000


def test_finance_settings_validation(client, auth):
    headers = auth()["headers"]

    negative_balance = client.patch(
        "/api/v1/settings/finance",
        json={"initialBalance": -1},
        headers=headers,
    )
    assert negative_balance.status_code == 422

    invalid_period = client.patch(
        "/api/v1/settings/finance",
        json={"period": "1y"},
        headers=headers,
    )
    assert invalid_period.status_code == 422


def test_finance_settings_isolation(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")

    client.patch(
        "/api/v1/settings/finance",
        json={"initialBalance": 2_000_000},
        headers=first["headers"],
    )

    second_settings = client.get(
        "/api/v1/settings/finance",
        headers=second["headers"],
    ).json()
    assert second_settings["initialBalance"] == 0
