from typing import Annotated

from pydantic import EmailStr, Field, StringConstraints, field_validator

from app.schemas.base import CamelModel
from app.schemas.user import UserOut

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


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
        if not any(character.isalpha() for character in value):
            raise ValueError("Password must contain at least one letter")
        if not any(character.isdigit() for character in value):
            raise ValueError("Password must contain at least one number")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return value


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class AuthResponse(CamelModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserOut
