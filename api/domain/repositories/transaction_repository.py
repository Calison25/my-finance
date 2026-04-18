from datetime import date
from typing import Protocol
from uuid import UUID

from api.domain.entities.transaction import Transaction


class TransactionRepository(Protocol):
    async def list_by_card(
        self,
        card_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[Transaction]: ...

    async def list_by_user(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[Transaction]: ...

    async def list_by_household(
        self,
        household_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[Transaction]: ...

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None: ...

    async def create(self, transaction: Transaction) -> Transaction: ...

    async def create_many(self, transactions: list[Transaction]) -> list[Transaction]: ...

    async def update(self, transaction: Transaction) -> Transaction | None: ...

    async def delete(self, transaction_id: UUID) -> None: ...

    async def delete_by_recurring_id(
        self, recurring_transaction_id: UUID, from_date: date | None = None
    ) -> None: ...

    async def delete_installment_group(
        self, card_id: UUID, base_description: str, from_date: date | None = None
    ) -> None: ...

    async def get_balance(self, card_id: UUID) -> dict: ...
