from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class CardBalance(BaseModel):
    card_id: UUID
    card_name: str
    total_income: Decimal
    total_expenses: Decimal
    scheduled_expenses: Decimal
    available_balance: Decimal


class DashboardSummary(BaseModel):
    period: str
    cards: list[CardBalance]
    total_income: Decimal
    total_expenses: Decimal
    total_available: Decimal
