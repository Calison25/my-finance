from uuid import UUID

from api.application.dtos.expense_goal_dto import ExpenseGoalResponse, ExpenseGoalUpdate
from api.domain.entities.expense_goal import ExpenseGoal
from api.domain.repositories.expense_goal_repository import ExpenseGoalRepository


class GetExpenseGoalUseCase:
    def __init__(self, repo: ExpenseGoalRepository):
        self._repo = repo

    async def execute(self, household_id: UUID) -> ExpenseGoalResponse:
        goal = await self._repo.get_by_household(household_id)
        return ExpenseGoalResponse(amount=goal.amount if goal else None)


class SetExpenseGoalUseCase:
    def __init__(self, repo: ExpenseGoalRepository):
        self._repo = repo

    async def execute(
        self, data: ExpenseGoalUpdate, household_id: UUID
    ) -> ExpenseGoalResponse:
        goal = ExpenseGoal(household_id=household_id, amount=data.amount)
        saved = await self._repo.upsert(goal)
        return ExpenseGoalResponse(amount=saved.amount)
