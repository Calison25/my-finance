from decimal import Decimal

from pydantic import BaseModel


class FinancialSummary(BaseModel):
    total_income: Decimal
    realized_expenses: Decimal
    scheduled_expenses: Decimal
    total_expenses: Decimal
    current_balance: Decimal
    projected_balance: Decimal
