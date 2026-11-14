import uuid

from app.schemas.base import CamelModel


class UserOut(CamelModel):
    id: uuid.UUID
    name: str
    email: str
    currency: str
    initial_balance: int
    min_balance: int
    avatar_url: str | None = None
