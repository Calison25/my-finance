from decimal import Decimal
from uuid import UUID

from api.application.dtos.dashboard_dto import CardBalance, DashboardSummary
from api.domain.repositories.card_repository import CardRepository
from api.domain.repositories.transaction_repository import TransactionRepository


class GetDashboardSummaryUseCase:
    def __init__(
        self,
        card_repo: CardRepository,
        transaction_repo: TransactionRepository,
    ) -> None:
        self._card_repo = card_repo
        self._transaction_repo = transaction_repo

    async def execute(
        self,
        user_id: UUID,
        period: str | None = None,
    ) -> DashboardSummary:
        cards = await self._card_repo.list_by_user(user_id)

        card_balances: list[CardBalance] = []
        total_income = Decimal("0")
        total_expenses = Decimal("0")
        total_available = Decimal("0")

        for card in cards:
            balance = await self._transaction_repo.get_balance(card.id)

            card_balance = CardBalance(
                card_id=card.id,
                card_name=card.name,
                total_income=balance["total_income"],
                total_expenses=balance["total_expenses"],
                scheduled_expenses=balance["scheduled_expenses"],
                available_balance=balance["available_balance"],
            )
            card_balances.append(card_balance)

            total_income += balance["total_income"]
            total_expenses += balance["total_expenses"]
            total_available += balance["available_balance"]

        return DashboardSummary(
            period=period or "all",
            cards=card_balances,
            total_income=total_income,
            total_expenses=total_expenses,
            total_available=total_available,
        )
