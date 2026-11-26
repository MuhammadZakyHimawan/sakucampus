from typing import Annotated, Self

from pydantic import EmailStr, Field, StringConstraints, field_validator, model_validator

from app.schemas.base import CamelModel
from app.schemas.user import UserOut

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
AvatarUrl = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


def validate_password_strength(value: str) -> str:
    if not any(character.isalpha() for character in value):
        raise ValueError("Password must contain at least one letter")
    if not any(character.isdigit() for character in value):
        raise ValueError("Password must contain at least one number")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes")
    return value


class RegisterRequest(CamelModel):
    name: Name
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class ProfileUpdate(CamelModel):
    name: Name | None = None
    email: EmailStr | None = None
    avatar_url: AvatarUrl | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str | None:
        return str(value).strip().lower() if value is not None else None


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def validate_new_password(self) -> Self:
        if self.new_password == self.current_password:
            raise ValueError("Password baru harus berbeda dari password saat ini")
        return self


class AuthResponse(CamelModel):
    expires_in: int
    user: UserOut
