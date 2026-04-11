from uuid import UUID, uuid4

from api.application.dtos.category_dto import CategoryCreate, CategoryResponse
from api.domain.entities.category import Category
from api.domain.exceptions import NotFoundError
from api.domain.repositories.category_repository import CategoryRepository


class ListCategoriesUseCase:
    def __init__(self, repo: CategoryRepository):
        self._repo = repo

    async def execute(self, user_id: UUID | None = None) -> list[CategoryResponse]:
        categories = await self._repo.list_all(user_id)
        return [
            CategoryResponse.model_validate(c, from_attributes=True)
            for c in categories
        ]


class CreateCategoryUseCase:
    def __init__(self, repo: CategoryRepository):
        self._repo = repo

    async def execute(self, data: CategoryCreate) -> CategoryResponse:
        category = Category(
            id=uuid4(),
            name=data.name,
            icon=data.icon,
            color=data.color,
            is_default=False,
            user_id=data.user_id,
        )
        created = await self._repo.create(category)
        return CategoryResponse.model_validate(created, from_attributes=True)


class DeleteCategoryUseCase:
    def __init__(self, repo: CategoryRepository):
        self._repo = repo

    async def execute(self, category_id: UUID) -> None:
        category = await self._repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category", str(category_id))
        await self._repo.delete(category_id)
