from uuid import UUID

from fastapi import APIRouter, Depends

from api.application.dtos.category_dto import CategoryCreate, CategoryResponse
from api.application.use_cases.category_use_cases import (
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
)
from api.domain.entities.user import User
from api.infrastructure.http.auth import get_current_user
from api.infrastructure.http.dependencies import (
    get_create_category,
    get_delete_category,
    get_list_categories,
)

router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    current_user: User = Depends(get_current_user),
    use_case: ListCategoriesUseCase = Depends(get_list_categories),
):
    return await use_case.execute(current_user.household_id)


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    use_case: CreateCategoryUseCase = Depends(get_create_category),
):
    return await use_case.execute(data, current_user.household_id)


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: DeleteCategoryUseCase = Depends(get_delete_category),
):
    await use_case.execute(category_id, current_user.household_id)
