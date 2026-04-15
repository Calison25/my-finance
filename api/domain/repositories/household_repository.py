from typing import Protocol
from uuid import UUID

from api.domain.entities.household import Household


class HouseholdRepository(Protocol):
    async def create(self, household: Household) -> Household: ...

    async def get_by_id(self, household_id: UUID) -> Household | None: ...
