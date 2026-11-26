from __future__ import annotations

from typing import Annotated, Literal

from pydantic import EmailStr, Field, StringConstraints, field_validator

from app.schemas.base import CamelModel

PeriodPreset = Literal["7d", "30d", "month"]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
CurrencyCode = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=3)]


class FinanceSettingsOut(CamelModel):
    initial_balance: int
    min_balance: int
    currency: str
    period: PeriodPreset
    notify_budget: bool
    notify_balance: bool
    notify_goal: bool


class FinanceSettingsUpdate(CamelModel):
    initial_balance: int | None = Field(default=None, ge=0)
    min_balance: int | None = Field(default=None, ge=0)
    currency: CurrencyCode | None = None
    period: PeriodPreset | None = None
    notify_budget: bool | None = None
    notify_balance: bool | None = None
    notify_goal: bool | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if len(normalized) != 3 or not normalized.isalpha():
            raise ValueError("Mata uang harus berupa 3 huruf kapital (misal: IDR)")
        return normalized


class ProfileUpdate(CamelModel):
    name: Name | None = None
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, max_length=1000)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str | None:
        if value is None:
            return None
        return str(value).strip().lower()

    @field_validator("avatar_url")
    @classmethod
    def normalize_avatar(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not any(character.isalpha() for character in value):
            raise ValueError("Password baru harus mengandung minimal satu huruf")
        if not any(character.isdigit() for character in value):
            raise ValueError("Password baru harus mengandung minimal satu angka")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password baru maksimal 72 byte")
        return value
