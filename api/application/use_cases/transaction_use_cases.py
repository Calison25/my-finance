import datetime as dt
import re
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
from api.domain.exceptions import DomainException, ForbiddenError, NotFoundError
from api.domain.repositories.card_repository import CardRepository
from api.domain.repositories.category_repository import CategoryRepository
from api.domain.repositories.transaction_repository import TransactionRepository

_INSTALLMENT_RE = re.compile(r"\(\d+/\d+\)$")


def classify_transaction(tx: Transaction) -> str:
    if tx.is_scheduled and not tx.is_realized:
        return "scheduled"
    if tx.is_recurring:
        return "recurring"
    if _INSTALLMENT_RE.search(tx.description):
        return "installment"
    return "regular"


class ListTransactionsUseCase:
    def __init__(self, repo: TransactionRepository, card_repo: CardRepository):
        self._repo = repo
        self._card_repo = card_repo

    async def execute(
        self,
        card_id: UUID | None = None,
        household_id: UUID | None = None,
        date_from: dt.date | None = None,
        date_to: dt.date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[TransactionResponse]:
        if card_id is not None:
            if household_id is None:
                raise ForbiddenError("Acesso negado a este recurso")
            card = await self._card_repo.get_by_id(card_id)
            if card is None or card.household_id != household_id:
                raise ForbiddenError("Acesso negado a este recurso")
            transactions = await self._repo.list_by_card(
                card_id,
                date_from=date_from,
                date_to=date_to,
                category_id=category_id,
                is_scheduled=is_scheduled,
            )
        elif household_id is not None:
            transactions = await self._repo.list_by_household(
                household_id,
                date_from=date_from,
                date_to=date_to,
                category_id=category_id,
                is_scheduled=is_scheduled,
            )
        else:
            raise DomainException("card_id ou household_id deve ser informado")

        results = []
        for t in transactions:
            resp = TransactionResponse.model_validate(t, from_attributes=True)
            resp.classification = classify_transaction(t)
            results.append(resp)
        return results


class CreateTransactionUseCase:
    def __init__(
        self,
        transaction_repo: TransactionRepository,
        category_repo: CategoryRepository,
        card_repo: CardRepository,
    ):
        self._transaction_repo = transaction_repo
        self._category_repo = category_repo
        self._card_repo = card_repo

    async def execute(
        self, data: TransactionCreate, household_id: UUID
    ) -> list[TransactionResponse]:
        card = await self._card_repo.get_by_id(data.card_id)
        if card is None or card.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")

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
                household_id=household_id,
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
        now = datetime.now(UTC)

        transactions = [
            Transaction(
                id=uuid4(),
                card_id=data.card_id,
                description=data.description,
                amount=data.amount,
                type=data.type,
                category_id=category_id,
                date=(tx_date := self._advance_month(data.date, i)),
                transaction_date=data.transaction_date if i == 0 else None,
                is_scheduled=data.is_scheduled,
                scheduled_date=tx_date if data.is_scheduled else None,
                is_realized=(not data.is_scheduled) and (not data.is_bill),
                is_recurring=True,
                is_bill=data.is_bill,
                recurring_transaction_id=recurring_id,
                notes=data.notes,
                created_at=now,
            )
            for i in range(24)
        ]

        created = await self._transaction_repo.create_many(transactions)
        return [
            TransactionResponse.model_validate(t, from_attributes=True) for t in created
        ]

    async def _create_installments(
        self, data: TransactionCreate, category_id: UUID | None
    ) -> list[TransactionResponse]:
        installments = data.installments or 1
        installment_amount = (data.amount / installments).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        now = datetime.now(UTC)

        transactions: list[Transaction] = []
        for i in range(installments):
            tx_date = self._advance_month(data.date, i)
            desc = (
                f"{data.description} ({i + 1}/{installments})"
                if installments > 1
                else data.description
            )

            transactions.append(
                Transaction(
                    id=uuid4(),
                    card_id=data.card_id,
                    description=desc,
                    amount=installment_amount,
                    type=data.type,
                    category_id=category_id,
                    date=tx_date,
                    transaction_date=data.transaction_date,
                    is_scheduled=data.is_scheduled,
                    scheduled_date=tx_date if data.is_scheduled else None,
                    is_realized=(not data.is_scheduled) and (not data.is_bill),
                    is_bill=data.is_bill,
                    notes=data.notes,
                    created_at=now,
                )
            )

        created = await self._transaction_repo.create_many(transactions)
        return [
            TransactionResponse.model_validate(t, from_attributes=True) for t in created
        ]

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
    def __init__(
        self,
        repo: TransactionRepository,
        card_repo: CardRepository,
        category_repo: CategoryRepository,
    ):
        self._repo = repo
        self._card_repo = card_repo
        self._category_repo = category_repo

    async def execute(
        self, transaction_id: UUID, data: TransactionUpdate, household_id: UUID
    ) -> TransactionResponse:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        card = await self._card_repo.get_by_id(transaction.card_id)
        if card is None or card.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")

        update_data = data.model_dump(exclude_unset=True)
        custom_category_name = update_data.pop("custom_category_name", None)
        if custom_category_name and not update_data.get("category_id"):
            new_cat = Category(
                id=uuid4(),
                name=custom_category_name,
                color="#6B7280",
                is_default=False,
                user_id=None,
                household_id=household_id,
            )
            created_cat = await self._category_repo.create(new_cat)
            update_data["category_id"] = created_cat.id

        updated_txn = transaction.model_copy(update=update_data)
        updated = await self._repo.update(updated_txn)
        return TransactionResponse.model_validate(updated, from_attributes=True)


class RealizeTransactionUseCase:
    def __init__(self, repo: TransactionRepository, card_repo: CardRepository):
        self._repo = repo
        self._card_repo = card_repo

    async def execute(
        self, transaction_id: UUID, household_id: UUID
    ) -> TransactionResponse:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        card = await self._card_repo.get_by_id(transaction.card_id)
        if card is None or card.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")
        realized = transaction.model_copy(
            update={"is_realized": True, "is_scheduled": False}
        )
        updated = await self._repo.update(realized)
        return TransactionResponse.model_validate(updated, from_attributes=True)


class DeleteTransactionUseCase:
    def __init__(self, repo: TransactionRepository, card_repo: CardRepository):
        self._repo = repo
        self._card_repo = card_repo

    async def execute(self, transaction_id: UUID, household_id: UUID) -> None:
        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        card = await self._card_repo.get_by_id(transaction.card_id)
        if card is None or card.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")
        await self._repo.delete(transaction_id)


class DeleteTransactionGroupUseCase:
    def __init__(self, repo: TransactionRepository, card_repo: CardRepository):
        self._repo = repo
        self._card_repo = card_repo

    async def execute(
        self, transaction_id: UUID, household_id: UUID, scope: str
    ) -> None:
        if scope not in ("all", "future"):
            raise DomainException("Escopo inválido. Use 'all' ou 'future'.")

        transaction = await self._repo.get_by_id(transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction", str(transaction_id))
        card = await self._card_repo.get_by_id(transaction.card_id)
        if card is None or card.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")

        from_date = transaction.date if scope == "future" else None

        if transaction.recurring_transaction_id is not None:
            await self._repo.delete_by_recurring_id(
                transaction.recurring_transaction_id, from_date
            )
            return

        if _INSTALLMENT_RE.search(transaction.description):
            base_description = _INSTALLMENT_RE.sub("", transaction.description).rstrip()
            await self._repo.delete_installment_group(
                transaction.card_id, base_description, from_date
            )
            return

        raise DomainException(
            "Transação não é recorrente nem parcelada"
        )
