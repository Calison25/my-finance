from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseGoalUpdate(BaseModel):
    amount: Decimal = Field(ge=0)


class ExpenseGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    amount: Decimal | None
