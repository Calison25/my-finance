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

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None: ...

    async def create(self, transaction: Transaction) -> Transaction: ...

    async def update(self, transaction: Transaction) -> Transaction: ...

    async def delete(self, transaction_id: UUID) -> None: ...

    async def get_balance(self, card_id: UUID) -> dict: ...
