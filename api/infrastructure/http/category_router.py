from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.application.dtos.category_dto import CategoryCreate, CategoryResponse
from api.application.use_cases.category_use_cases import (
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
)
from api.infrastructure.http.dependencies import (
    get_create_category,
    get_delete_category,
    get_list_categories,
)

router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    user_id: UUID | None = Query(default=None),
    use_case: ListCategoriesUseCase = Depends(get_list_categories),
):
    return await use_case.execute(user_id)


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    use_case: CreateCategoryUseCase = Depends(get_create_category),
):
    return await use_case.execute(data)


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    use_case: DeleteCategoryUseCase = Depends(get_delete_category),
):
    await use_case.execute(category_id)
