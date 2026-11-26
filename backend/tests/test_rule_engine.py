import uuid
from datetime import date, timedelta

from app.models import Budget, FinanceSettings, Goal, GoalContribution, Transaction
from app.modules.rule_engine.service import evaluate_user_finances


def _register_user(client, email: str) -> tuple[uuid.UUID, dict[str, str]]:
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Rule Tester", "email": email, "password": "Password123"},
    )
    assert res.status_code == 201
    body = res.json()
    return uuid.UUID(body["user"]["id"]), {"Authorization": f"Bearer {body['accessToken']}"}


def test_rule_engine_normal_and_zero_burn_rate(client, db_session):
    user_id, _ = _register_user(client, "normal@example.com")
    settings = db_session.get(FinanceSettings, user_id)
    settings.initial_balance = 2_000_000
    settings.min_balance = 300_000
    db_session.commit()

    ref = date(2026, 11, 10)
    # Zero expense -> runway_days is None, status normal
    res_zero = evaluate_user_finances(db_session, user_id, reference_date=ref)
    assert res_zero.financial_status == "normal"
    assert res_zero.metrics.runway_days is None
    assert res_zero.alerts == []

    # Modest expense + safe budget (< 75%) + transfer excluded
    db_session.add_all(
        [
            Transaction(
                user_id=user_id,
                description="Makan hemat",
                amount=150_000,
                type="expense",
                category="Kebutuhan Primer",
                date=date(2026, 11, 5),
            ),
            Transaction(
                user_id=user_id,
                description="Pindah ke tabungan",
                amount=900_000,
                type="transfer",
                category="Lainnya",
                date=date(2026, 11, 6),
            ),
            Budget(
                user_id=user_id,
                category="Kebutuhan Primer",
                limit_amount=800_000,
                period_start=date(2026, 11, 1),
                period_end=date(2026, 11, 30),
            ),
        ]
    )
    db_session.commit()

    res_safe = evaluate_user_finances(db_session, user_id, reference_date=ref)
    # Balance = 2,000,000 - 150,000 = 1,850,000 (transfer ignored!)
    assert res_safe.metrics.balance == 1_850_000
    assert res_safe.metrics.daily_burn_rate == 15_000
    assert res_safe.metrics.runway_days == 123.3
    assert res_safe.financial_status == "normal"
    assert res_safe.alerts == []


def test_rule_engine_low_balance_warning_critical_and_negative(client, db_session):
    user_id, _ = _register_user(client, "lowbal@example.com")
    settings = db_session.get(FinanceSettings, user_id)
    settings.initial_balance = 300_000
    settings.min_balance = 250_000
    db_session.commit()

    ref = date(2026, 11, 10)
    # 300,000 <= 1.25 * 250,000 (312,500) -> BALANCE_LOW_WARNING
    warn_res = evaluate_user_finances(db_session, user_id, reference_date=ref)
    assert warn_res.financial_status == "warning"
    assert any(a.rule_code == "BALANCE_LOW_WARNING" for a in warn_res.alerts)

    # Spend 60,000 -> balance = 240,000 <= 250,000 -> escalates to BALANCE_LOW_CRITICAL
    db_session.add(
        Transaction(
            user_id=user_id,
            description="Belanja",
            amount=60_000,
            type="expense",
            category="Kebutuhan Primer",
            date=date(2026, 11, 10),
        )
    )
    db_session.commit()
    crit_res = evaluate_user_finances(db_session, user_id, reference_date=ref)
    assert crit_res.financial_status == "critical"
    assert any(a.rule_code == "BALANCE_LOW_CRITICAL" for a in crit_res.alerts)

    # Spend another 300,000 -> balance = -60,000 -> BALANCE_NEGATIVE
    db_session.add(
        Transaction(
            user_id=user_id,
            description="Tagihan mendadak",
            amount=300_000,
            type="expense",
            category="Tagihan",
            date=date(2026, 11, 10),
        )
    )
    db_session.commit()
    neg_res = evaluate_user_finances(db_session, user_id, reference_date=ref)
    assert neg_res.financial_status == "critical"
    assert neg_res.metrics.runway_days == 0.0
    assert any(a.rule_code == "BALANCE_NEGATIVE" for a in neg_res.alerts)


def test_rule_engine_budget_burn_rate_and_runway_thresholds(client, db_session):
    user_id, _ = _register_user(client, "burn@example.com")
    settings = db_session.get(FinanceSettings, user_id)
    settings.initial_balance = 1_200_000
    settings.min_balance = 200_000
    db_session.commit()

    ref = date(2026, 11, 10)  # 10 elapsed days, 20 days after today in Nov
    db_session.add(
        Budget(
            user_id=user_id,
            category="Gaya Hidup",
            limit_amount=200_000,
            period_start=date(2026, 11, 1),
            period_end=date(2026, 11, 30),
        )
    )
    # Spend 160,000 on Gaya Hidup (80% -> BUDGET_WARNING) + transfer 500,000 (ignored)
    db_session.add_all(
        [
            Transaction(
                user_id=user_id,
                description="Ngopi & bioskop",
                amount=160_000,
                type="expense",
                category="Gaya Hidup",
                date=date(2026, 11, 5),
            ),
            Transaction(
                user_id=user_id,
                description="Transfer dompet",
                amount=500_000,
                type="transfer",
                category="Lainnya",
                date=date(2026, 11, 5),
            ),
        ]
    )
    db_session.commit()

    res_warn = evaluate_user_finances(db_session, user_id, reference_date=ref)
    codes_warn = {a.rule_code for a in res_warn.alerts}
    assert any(c.startswith("BUDGET_WARNING:") for c in codes_warn)
    assert not any(c.startswith("BUDGET_EXCEEDED:") for c in codes_warn)

    # Spend 840,000 more (total expense = 1,000,000 over 10 days -> burn_rate = 100,000/day)
    # Balance becomes 200,000 -> runway_days = 2.0 (<= 3 -> RUNWAY_CRITICAL & BURN_RATE_CRITICAL)
    db_session.add(
        Transaction(
            user_id=user_id,
            description="Belanja gaya hidup berlebih",
            amount=840_000,
            type="expense",
            category="Gaya Hidup",
            date=date(2026, 11, 10),
        )
    )
    db_session.commit()

    res_crit = evaluate_user_finances(db_session, user_id, reference_date=ref)
    codes_crit = {a.rule_code for a in res_crit.alerts}
    assert res_crit.financial_status == "critical"
    assert res_crit.metrics.runway_days == 2.0
    assert any(c.startswith("BUDGET_EXCEEDED:") for c in codes_crit)
    assert "BURN_RATE_CRITICAL" in codes_crit
    assert "RUNWAY_CRITICAL" in codes_crit


def test_rule_engine_month_end_and_goal_rules(client, db_session):
    user_id, _ = _register_user(client, "goalsrule@example.com")
    settings = db_session.get(FinanceSettings, user_id)
    settings.initial_balance = 2_000_000
    db_session.commit()

    ref = date(2026, 11, 15)
    g_achieved = Goal(
        user_id=user_id,
        name="Dana Buku",
        target_amount=300_000,
        deadline=ref + timedelta(days=30),
    )
    g_behind = Goal(
        user_id=user_id,
        name="Bayar Praktikum",
        target_amount=500_000,
        deadline=ref + timedelta(days=7),
    )
    db_session.add_all([g_achieved, g_behind])
    db_session.flush()
    db_session.add_all(
        [
            GoalContribution(goal_id=g_achieved.id, amount=300_000),
            GoalContribution(goal_id=g_behind.id, amount=100_000),  # 20% < 80%, <= 14 days
        ]
    )
    db_session.commit()

    # Force month end on Nov 15
    res = evaluate_user_finances(
        db_session,
        user_id,
        reference_date=ref,
        force_month_end=True,
    )
    codes = {a.rule_code for a in res.alerts}
    assert "MONTH_END_EVAL:2026-11" in codes
    assert f"GOAL_ACHIEVED:{g_achieved.id}" in codes
    assert f"GOAL_BEHIND:{g_behind.id}" in codes

    # Natural month-end window (Nov 29 is within last 3 days of November)
    res_end_of_month = evaluate_user_finances(
        db_session,
        user_id,
        persist_notifications=False,
        reference_date=date(2026, 11, 29),
    )
    assert any(a.rule_code == "MONTH_END_EVAL:2026-11" for a in res_end_of_month.alerts)


def test_rule_engine_deduplication_and_preference_toggles(client, db_session):
    user_id, _ = _register_user(client, "dedup@example.com")
    settings = db_session.get(FinanceSettings, user_id)
    settings.initial_balance = 500_000
    settings.min_balance = 450_000  # 500k <= 1.25 * 450k -> warning
    settings.notify_budget = False  # Suppress budget notifications!
    db_session.add(
        Budget(
            user_id=user_id,
            category="Kebutuhan Primer",
            limit_amount=100_000,
            period_start=date(2026, 11, 1),
            period_end=date(2026, 11, 30),
        )
    )
    db_session.add(
        Transaction(
            user_id=user_id,
            description="Makan",
            amount=80_000,  # 80% budget warning + balance becomes 420k <= 450k critical!
            type="expense",
            category="Kebutuhan Primer",
            date=date(2026, 11, 10),
        )
    )
    db_session.commit()

    ref = date(2026, 11, 10)
    first_run = evaluate_user_finances(db_session, user_id, reference_date=ref)
    # Budget alert exists in alerts, but NOT persisted because notify_budget=False
    assert any(a.notification_type == "budget" for a in first_run.alerts)
    assert all(n.type != "budget" for n in first_run.new_notifications)
    assert len(first_run.new_notifications) >= 1

    # Second run on the SAME day -> 0 duplicate notifications created!
    second_run = evaluate_user_finances(db_session, user_id, reference_date=ref)
    assert second_run.new_notifications == []

    # Also verify notify_balance=False and notify_goal=False suppress their notifications
    settings.notify_balance = False
    settings.notify_goal = False
    urgent_goal = Goal(
        user_id=user_id,
        name="Target Mepet",
        target_amount=1_000_000,
        deadline=ref + timedelta(days=5),
    )
    db_session.add(urgent_goal)
    db_session.commit()

    next_day = ref + timedelta(days=1)
    suppressed_run = evaluate_user_finances(
        db_session,
        user_id,
        reference_date=next_day,
        force_month_end=True,
    )
    assert any(a.notification_type == "balance" for a in suppressed_run.alerts)
    assert any(a.notification_type == "goal" for a in suppressed_run.alerts)
    # Only 'info' (MONTH_END_EVAL) should be persisted when all 3 toggles are False
    assert [n.type for n in suppressed_run.new_notifications] == ["info"]


def test_automatic_rule_trigger_via_transactions_and_evaluate_endpoint(client):
    _, headers = _register_user(client, "apitrigger@example.com")
    today = date.today()

    client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={"initialBalance": 300000, "minBalance": 250000},
    )
    # Posting a large expense via REST API automatically triggers critical notification
    post_tx = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "description": "Bayar tagihan besar",
            "amount": 120000,
            "type": "expense",
            "category": "Tagihan",
            "date": today.isoformat(),
        },
    )
    assert post_tx.status_code == 201

    notifs_res = client.get("/api/v1/notifications", headers=headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert len(notifs) >= 1
    assert any(n["severity"] == "critical" for n in notifs)
    assert all(n["sentToTelegram"] is False for n in notifs)

    summary_res = client.get("/api/v1/analytics/summary", headers=headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["summary"]["financialStatus"] == "critical"
    assert len(summary_res.json()["ruleAlerts"]) >= 1

    eval_res = client.post(
        "/api/v1/rule-engine/evaluate",
        headers=headers,
        json={"forceMonthEnd": True},
    )
    assert eval_res.status_code == 200
    eval_body = eval_res.json()
    assert eval_body["financialStatus"] == "critical"
    assert any(a["ruleCode"].startswith("MONTH_END_EVAL:") for a in eval_body["alerts"])
