import datetime as dt
import re
from decimal import Decimal
from uuid import UUID

from api.application.dtos.financial_summary_dto import FinancialSummary
from api.application.dtos.transaction_summary_dto import (
    BalanceSummary,
    GroupSummary,
    TransactionSummaryResponse,
)
from api.domain.entities.transaction import Transaction
from api.domain.exceptions import ForbiddenError
from api.domain.repositories.card_repository import CardRepository
from api.domain.repositories.transaction_repository import TransactionRepository

_INSTALLMENT_RE = re.compile(r"\(\d+/\d+\)$")


def _is_installment(tx: Transaction) -> bool:
    return bool(_INSTALLMENT_RE.search(tx.description))


def _is_effectively_realized(tx: Transaction) -> bool:
    """Recorrentes e parcelados contam como realizado, exceto se agendados."""
    if tx.is_scheduled and not tx.is_realized:
        return False
    return tx.is_realized or tx.is_recurring or _is_installment(tx)


class GetTransactionSummaryUseCase:
    def __init__(self, repo: TransactionRepository, card_repo: CardRepository):
        self._repo = repo
        self._card_repo = card_repo

    async def execute(
        self,
        household_id: UUID,
        month: str,
        card_id: UUID | None = None,
    ) -> TransactionSummaryResponse:
        year, m = int(month[:4]), int(month[5:7])
        date_from = dt.date(year, m, 1)
        if m == 12:
            date_to = dt.date(year, 12, 31)
        else:
            date_to = dt.date(year, m + 1, 1) - dt.timedelta(days=1)

        if card_id:
            card = await self._card_repo.get_by_id(card_id)
            if card is None or card.household_id != household_id:
                raise ForbiddenError("Acesso negado a este recurso")
            transactions = await self._repo.list_by_card(
                card_id, date_from=date_from, date_to=date_to
            )
        else:
            transactions = await self._repo.list_by_household(
                household_id, date_from=date_from, date_to=date_to
            )

        scheduled_txs = [t for t in transactions if t.is_scheduled and not t.is_realized]
        non_scheduled = [t for t in transactions if not (t.is_scheduled and not t.is_realized)]
        recurring_txs = [t for t in non_scheduled if t.is_recurring]
        installment_txs = [t for t in non_scheduled if _is_installment(t)]

        realized_income = sum(
            (t.amount for t in transactions if t.type == "INCOME" and _is_effectively_realized(t)),
            Decimal(0),
        )
        realized_expenses = sum(
            (t.amount for t in transactions if t.type == "EXPENSE" and _is_effectively_realized(t)),
            Decimal(0),
        )
        pending_income = sum(
            (t.amount for t in transactions if t.type == "INCOME" and not _is_effectively_realized(t)),
            Decimal(0),
        )
        pending_expenses = sum(
            (t.amount for t in transactions if t.type == "EXPENSE" and not _is_effectively_realized(t)),
            Decimal(0),
        )

        total_month = (realized_income + pending_income) - (realized_expenses + pending_expenses)

        total_income = realized_income + pending_income
        scheduled_exp = sum(
            (t.amount for t in transactions if t.type == "EXPENSE" and t.is_scheduled and not t.is_realized),
            Decimal(0),
        )
        total_exp = realized_expenses + scheduled_exp
        current_balance = total_income - realized_expenses
        projected_balance = total_income - total_exp

        return TransactionSummaryResponse(
            total_month=total_month,
            realized=BalanceSummary(
                income=realized_income,
                expenses=realized_expenses,
                balance=realized_income - realized_expenses,
            ),
            pending=BalanceSummary(
                income=pending_income,
                expenses=pending_expenses,
                balance=pending_income - pending_expenses,
            ),
            recurring=self._build_group(recurring_txs),
            installments=self._build_group(installment_txs),
            scheduled=self._build_group(scheduled_txs),
            financial_summary=FinancialSummary(
                total_income=total_income,
                realized_expenses=realized_expenses,
                scheduled_expenses=scheduled_exp,
                total_expenses=total_exp,
                current_balance=current_balance,
                projected_balance=projected_balance,
            ),
        )

    @staticmethod
    def _build_group(txs: list[Transaction]) -> GroupSummary:
        income = sum((t.amount for t in txs if t.type == "INCOME"), Decimal(0))
        expenses = sum((t.amount for t in txs if t.type == "EXPENSE"), Decimal(0))
        return GroupSummary(
            income_total=income,
            expense_total=expenses,
            total=income - expenses,
            count=len(txs),
        )
