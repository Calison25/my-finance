from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.application.dtos.dashboard_dto import DashboardSummary
from api.application.use_cases.dashboard_use_case import GetDashboardSummaryUseCase
from api.infrastructure.http.dependencies import get_dashboard_summary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary_endpoint(
    user_id: UUID = Query(...),
    period: str | None = Query(default=None),
    use_case: GetDashboardSummaryUseCase = Depends(get_dashboard_summary),
):
    return await use_case.execute(user_id, period)
