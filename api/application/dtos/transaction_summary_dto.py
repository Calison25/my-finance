from pydantic import BaseModel

from api.application.dtos.financial_summary_dto import FinancialSummary


class BalanceSummary(BaseModel):
    income: float = 0
    expenses: float = 0
    balance: float = 0


class GroupSummary(BaseModel):
    income_total: float = 0
    expense_total: float = 0
    total: float = 0
    count: int = 0


class TransactionSummaryResponse(BaseModel):
    total_month: float
    realized: BalanceSummary
    pending: BalanceSummary
    recurring: GroupSummary
    installments: GroupSummary
    scheduled: GroupSummary
    financial_summary: FinancialSummary
