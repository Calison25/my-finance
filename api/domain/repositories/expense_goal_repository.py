from typing import Protocol
from uuid import UUID

from api.domain.entities.expense_goal import ExpenseGoal


class ExpenseGoalRepository(Protocol):
    async def get_by_household(self, household_id: UUID) -> ExpenseGoal | None: ...

    async def upsert(self, goal: ExpenseGoal) -> ExpenseGoal: ...
