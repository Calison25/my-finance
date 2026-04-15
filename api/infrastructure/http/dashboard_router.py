from fastapi import APIRouter, Depends, Query

from api.application.dtos.dashboard_dto import DashboardSummary
from api.application.use_cases.dashboard_use_case import GetDashboardSummaryUseCase
from api.domain.entities.user import User
from api.infrastructure.http.auth import get_current_user
from api.infrastructure.http.dependencies import get_dashboard_summary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary_endpoint(
    current_user: User = Depends(get_current_user),
    period: str | None = Query(default=None),
    use_case: GetDashboardSummaryUseCase = Depends(get_dashboard_summary),
):
    return await use_case.execute(current_user.household_id, period)
