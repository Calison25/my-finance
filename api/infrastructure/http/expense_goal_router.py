from fastapi import APIRouter, Depends

from api.application.dtos.expense_goal_dto import ExpenseGoalResponse, ExpenseGoalUpdate
from api.application.use_cases.expense_goal_use_cases import (
    GetExpenseGoalUseCase,
    SetExpenseGoalUseCase,
)
from api.domain.entities.user import User
from api.infrastructure.http.auth import get_current_user
from api.infrastructure.http.dependencies import (
    get_get_expense_goal,
    get_set_expense_goal,
)

router = APIRouter()


@router.get("", response_model=ExpenseGoalResponse)
async def get_expense_goal(
    current_user: User = Depends(get_current_user),
    use_case: GetExpenseGoalUseCase = Depends(get_get_expense_goal),
):
    return await use_case.execute(current_user.household_id)


@router.put("", response_model=ExpenseGoalResponse)
async def set_expense_goal(
    data: ExpenseGoalUpdate,
    current_user: User = Depends(get_current_user),
    use_case: SetExpenseGoalUseCase = Depends(get_set_expense_goal),
):
    return await use_case.execute(data, current_user.household_id)
