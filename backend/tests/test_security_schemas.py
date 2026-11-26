from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.auth import ChangePasswordRequest
from app.schemas.budget import BudgetPayload
from app.schemas.goal import GoalContributionCreate, GoalPayload
from app.schemas.settings import FinanceSettingsUpdate
from app.schemas.transaction import TransactionPayload


def transaction_payload(**overrides):
    payload = {
        "description": "Makan siang",
        "amount": 25_000,
        "type": "expense",
        "category": "Kebutuhan Primer",
        "date": date(2026, 11, 10),
        "source": "manual",
    }
    return TransactionPayload(**{**payload, **overrides})


def test_transaction_payload_accepts_manual_source():
    assert transaction_payload().source == "manual"


def test_transaction_payload_rejects_client_supplied_telegram_source():
    with pytest.raises(ValidationError):
        transaction_payload(source="telegram")


@pytest.mark.parametrize("amount", [0, -1, 1_000_000_000_001])
def test_transaction_payload_rejects_amount_out_of_range(amount):
    with pytest.raises(ValidationError):
        transaction_payload(amount=amount)


def test_budget_payload_rejects_limit_out_of_range():
    with pytest.raises(ValidationError):
        BudgetPayload(
            category="Kebutuhan Primer",
            limit=1_000_000_000_001,
            period_start=date(2026, 11, 1),
            period_end=date(2026, 11, 30),
        )


def test_goal_payloads_reject_amounts_out_of_range():
    with pytest.raises(ValidationError):
        GoalPayload(name="Liburan", target_amount=0, deadline=date(2026, 12, 31))

    with pytest.raises(ValidationError):
        GoalContributionCreate(amount=1_000_000_000_001)


def test_finance_settings_update_rejects_negative_balance():
    with pytest.raises(ValidationError):
        FinanceSettingsUpdate(initial_balance=-1)

    with pytest.raises(ValidationError):
        FinanceSettingsUpdate(min_balance=1_000_000_000_001)


def test_change_password_rejects_same_password():
    with pytest.raises(ValidationError):
        ChangePasswordRequest(currentPassword="demo1234", newPassword="demo1234")
