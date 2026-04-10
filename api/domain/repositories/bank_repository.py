from typing import Protocol
from uuid import UUID

from api.domain.entities.bank import Bank


class BankRepository(Protocol):
    async def list_all(self, user_id: UUID | None = None) -> list[Bank]: ...

    async def get_by_id(self, bank_id: UUID) -> Bank | None: ...

    async def create(self, bank: Bank) -> Bank: ...

    async def delete(self, bank_id: UUID) -> None: ...
