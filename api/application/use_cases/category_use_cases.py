from uuid import UUID, uuid4

from api.application.dtos.category_dto import CategoryCreate, CategoryResponse
from api.domain.entities.category import Category
from api.domain.exceptions import ForbiddenError, NotFoundError
from api.domain.repositories.category_repository import CategoryRepository


class ListCategoriesUseCase:
    def __init__(self, repo: CategoryRepository):
        self._repo = repo

    async def execute(
        self, household_id: UUID | None = None
    ) -> list[CategoryResponse]:
        if household_id:
            categories = await self._repo.list_by_household(household_id)
        else:
            categories = await self._repo.list_all()
        return [
            CategoryResponse.model_validate(c, from_attributes=True)
            for c in categories
        ]


class CreateCategoryUseCase:
    def __init__(self, repo: CategoryRepository):
        self._repo = repo

    async def execute(
        self, data: CategoryCreate, household_id: UUID | None = None
    ) -> CategoryResponse:
        category = Category(
            id=uuid4(),
            name=data.name,
            icon=data.icon,
            color=data.color,
            is_default=False,
            user_id=None,
            household_id=household_id,
        )
        created = await self._repo.create(category)
        return CategoryResponse.model_validate(created, from_attributes=True)


class DeleteCategoryUseCase:
    def __init__(self, repo: CategoryRepository):
        self._repo = repo

    async def execute(self, category_id: UUID, household_id: UUID) -> None:
        category = await self._repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category", str(category_id))
        if category.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")
        await self._repo.delete(category_id)
