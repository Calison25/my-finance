from uuid import UUID, uuid4

from api.application.dtos.bank_dto import BankCreate, BankResponse
from api.domain.entities.bank import Bank
from api.domain.exceptions import ForbiddenError, NotFoundError
from api.domain.repositories.bank_repository import BankRepository


class ListBanksUseCase:
    def __init__(self, repo: BankRepository):
        self._repo = repo

    async def execute(self, household_id: UUID | None = None) -> list[BankResponse]:
        if household_id:
            banks = await self._repo.list_by_household(household_id)
        else:
            banks = await self._repo.list_all()
        return [BankResponse.model_validate(b, from_attributes=True) for b in banks]


class CreateBankUseCase:
    def __init__(self, repo: BankRepository):
        self._repo = repo

    async def execute(
        self, data: BankCreate, household_id: UUID | None = None
    ) -> BankResponse:
        bank = Bank(
            id=uuid4(),
            name=data.name,
            code=data.code,
            logo_url=data.logo_url,
            color=data.color,
            is_default=False,
            user_id=None,
            household_id=household_id,
        )
        created = await self._repo.create(bank)
        return BankResponse.model_validate(created, from_attributes=True)


class DeleteBankUseCase:
    def __init__(self, repo: BankRepository):
        self._repo = repo

    async def execute(self, bank_id: UUID, household_id: UUID) -> None:
        bank = await self._repo.get_by_id(bank_id)
        if bank is None:
            raise NotFoundError("Bank", str(bank_id))
        if bank.household_id != household_id:
            raise ForbiddenError("Acesso negado a este recurso")
        await self._repo.delete(bank_id)
