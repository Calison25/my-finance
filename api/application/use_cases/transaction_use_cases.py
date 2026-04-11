import datetime as dt
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4

from api.application.dtos.transaction_dto import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from api.domain.entities.category import Category
from api.domain.entities.transaction import Transaction
from api.domain.exceptions import DomainException, NotFoundError
from api.domain.repositories.category_repository import CategoryRepository
from api.domain.repositories.transaction_repository import TransactionRepository


class ListTransactionsUseCase:
    def __init__(self, repo: TransactionRepository):
        self._repo = repo

    async def execute(
        self,
        card_id: UUID | None = None,
        user_id: UUID | None = None,
        date_from: dt.date | None = None,
        date_to: dt.date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[TransactionResponse]:
        if card_id is not None:
            transactions = await self._repo.list_by_card(
                card_id,
                date_from=date_from,
                date_to=date_to,
                category_id=category_id,
                is_scheduled=is_scheduled,
            )
        elif user_id is not None:
            transactions = await self._repo.list_by_user(
                user_id,
                date_from=date_from,
                date_to=date_to,
                category_id=category_id,
                is_scheduled=is_scheduled,
            )
        else:
            raise DomainException("card_id ou user_id deve ser informado")

        return [
            TransactionResponse.model_validate(t, from_attributes=True)
            for t in transactions
        ]


class CreateTransactionUseCase:
    def __init__(
        self,
        transaction_repo: TransactionRepository,
        category_repo: CategoryRepository,
    ):
        self._transaction_repo = transaction_repo
        self._category_repo = category_repo

    async def execute(self, data: TransactionCreate) -> list[TransactionResponse]:
        if data.is_recurring and data.installments and data.installments > 1:
            raise DomainException(
                "Recorrência e parcelamento são mutuamente exclusivos"
            )

        category_id = data.category_id
        if not category_id and data.custom_category_name:
            new_cat = Category(
                id=uuid4(),
                name=data.custom_category_name,
                color="#6B7280",
                is_default=False,
                user_id=None,
            )
            created_cat = await self._category_repo.create(new_cat)
            category_id = created_cat.id

        if data.is_recurring:
            return await self._create_recurring(data, category_id)

        return await self._create_installments(data, category_id)

    async def _create_recurring(
        self, data: TransactionCreate, category_id: UUID | None
    ) -> list[TransactionResponse]:
        recurring_id = uuid4()
        results: list[TransactionResponse] = []

        for i in range(24):
            tx_date = self._advance_month(data.date, i)
            is_first = i == 0

            transaction = Transaction(
                id=uuid4(),
                card_id=data.card_id,
                description=data.description,
                amount=data.amount,
                type=data.type,
                category_id=category_id,
                date=tx_date,
                is_scheduled=data.is_scheduled if is_first else True,
                scheduled_date=data.scheduled_date if is_first else tx_date,
                is_realized=not data.is_scheduled if is_first else False,
                is_recurring=True,
                is_bill=data.is_bill,
                recurring_transaction_id=recurring_id,
                notes=data.notes,
                created_at=datetime.now(UTC),
            )
            created = await self._transaction_repo.create(transaction)
            results.append(
                TransactionResponse.model_validate(created, from_attributes=True)
            )

        return results

    async def _create_installments(
        self, data: TransactionCreate, category_id: UUID | None
    ) -> list[TransactionResponse]:
        installments = data.installments or 1
        installment_amount = (data.amount / installments).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        results: list[TransactionResponse] = []
        for i in range(installments):
            tx_date = self._advance_month(data.date, i)
            is_first = i == 0
            desc = (
                f"{data.description} ({i + 1}/{installments})"
                if installments > 1
                else data.description
            )

            transaction = Transaction(
                id=uuid4(),
                card_id=data.card_id,
                description=desc,
                amount=installment_amount,
                type=data.type,
                category_id=category_id,
                date=tx_date,
                is_scheduled=data.is_scheduled if is_first else True,
                scheduled_date=data.scheduled_date if is_first else tx_date,
                is_realized=not data.is_scheduled if is_first else False,
                is_bill=data.is_bill,
                notes=data.notes,
                created_at=datetime.now(UTC),
            )
            created = await self._transaction_repo.create(transaction)
            results.append(
                TransactionResponse.model_validate(created, from_attributes=True)
            )

        return results

    @staticmethod
    def _advance_month(base: dt.date, months: int) -> dt.date:
        base_first = base.replace(day=1)
        target_month = base_first.month + months
        target_year = base_first.year + (target_month - 1) // 12
        target_month = ((target_month - 1) % 12) + 1
        try:
            return base.replace(year=target_year, month=target_month)
        except ValueError:
            import calendar
            last_day = calendar.monthrange(target_year, target_month)[1]
            return base.replace(year=target_year, month=target_month, day=last_day)


class UpdateTransactionUseCase:
    def __init__(self, repo: TransactionRepository):
        self._repo = repo

    async def execute(
        self, transaction_id: UUID, data: TransactionUpdate
    ) -> TransactionResponse:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        update_data = data.model_dump(exclude_unset=True)
        updated_txn = transaction.model_copy(update=update_data)
        updated = await self._repo.update(updated_txn)
        return TransactionResponse.model_validate(updated, from_attributes=True)


class RealizeTransactionUseCase:
    def __init__(self, repo: TransactionRepository):
        self._repo = repo

    async def execute(self, transaction_id: UUID) -> TransactionResponse:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        realized = transaction.model_copy(
            update={"is_realized": True, "is_scheduled": False}
        )
        updated = await self._repo.update(realized)
        return TransactionResponse.model_validate(updated, from_attributes=True)


class DeleteTransactionUseCase:
    def __init__(self, repo: TransactionRepository):
        self._repo = repo

    async def execute(self, transaction_id: UUID) -> None:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        await self._repo.delete(transaction_id)


class DeleteRecurringTransactionsUseCase:
    def __init__(self, repo: TransactionRepository):
        self._repo = repo

    async def execute(self, transaction_id: UUID) -> None:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        if not transaction.recurring_transaction_id:
            raise DomainException("Transação não é recorrente")
        await self._repo.delete_by_recurring_id(
            transaction.recurring_transaction_id, transaction.date
        )
