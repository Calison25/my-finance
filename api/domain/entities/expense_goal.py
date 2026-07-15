from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ExpenseGoal(BaseModel):
    household_id: UUID
    amount: Decimal
    updated_at: datetime = Field(default_factory=datetime.now)
