from uuid import UUID

from fastapi import APIRouter, Depends

from api.application.dtos.bank_dto import BankCreate, BankResponse
from api.application.use_cases.bank_use_cases import (
    CreateBankUseCase,
    DeleteBankUseCase,
    ListBanksUseCase,
)
from api.domain.entities.user import User
from api.infrastructure.http.auth import get_current_user
from api.infrastructure.http.dependencies import (
    get_create_bank,
    get_delete_bank,
    get_list_banks,
)

router = APIRouter()


@router.get("", response_model=list[BankResponse])
async def list_banks(
    current_user: User = Depends(get_current_user),
    use_case: ListBanksUseCase = Depends(get_list_banks),
):
    return await use_case.execute(current_user.household_id)


@router.post("", response_model=BankResponse, status_code=201)
async def create_custom_bank(
    data: BankCreate,
    current_user: User = Depends(get_current_user),
    use_case: CreateBankUseCase = Depends(get_create_bank),
):
    return await use_case.execute(data, current_user.household_id)


@router.delete("/{bank_id}", status_code=204)
async def delete_custom_bank(
    bank_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: DeleteBankUseCase = Depends(get_delete_bank),
):
    await use_case.execute(bank_id, current_user.household_id)
