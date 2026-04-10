from fastapi import APIRouter

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary():
    return {"message": "Dashboard summary - TODO"}
