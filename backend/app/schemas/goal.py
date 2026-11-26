from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import Field, StringConstraints

from app.schemas.base import CamelModel

GoalName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
ContributionNote = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class GoalCreate(CamelModel):
    name: GoalName
    target_amount: int = Field(gt=0)
    deadline: date


class GoalUpdate(CamelModel):
    name: GoalName | None = None
    target_amount: int | None = Field(default=None, gt=0)
    deadline: date | None = None


class GoalContributionCreate(CamelModel):
    amount: int = Field(gt=0)
    note: ContributionNote | None = None


class GoalContributionOut(CamelModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    amount: int
    contributed_at: datetime
    note: str | None = None


class GoalOut(CamelModel):
    id: uuid.UUID
    name: str
    target_amount: int
    saved_amount: int
    deadline: date
