from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated, Self

from pydantic import Field, StringConstraints, field_validator, model_validator

from app.schemas.base import CamelModel

GoalName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
ContributionNote = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class GoalPayload(CamelModel):
    name: GoalName
    target_amount: int = Field(gt=0)
    deadline: date


class GoalCreate(GoalPayload):
    pass


class GoalUpdate(GoalPayload):
    pass


class GoalContributionCreate(CamelModel):
    amount: int = Field(gt=0)
    note: ContributionNote | None = None

    @model_validator(mode="after")
    def normalize_note(self) -> Self:
        if self.note == "":
            self.note = None
        return self


class GoalContributionOut(CamelModel):
    id: uuid.UUID
    amount: int
    contributed_at: datetime
    note: str | None = None


class GoalOut(CamelModel):
    id: uuid.UUID
    name: str
    target_amount: int
    saved_amount: int
    deadline: date

    @field_validator("saved_amount")
    @classmethod
    def validate_saved_amount(cls, value: int) -> int:
        return max(0, value)
