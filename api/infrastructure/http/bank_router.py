from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.application.dtos.bank_dto import BankCreate, BankResponse
from api.application.use_cases.bank_use_cases import (
    CreateBankUseCase,
    DeleteBankUseCase,
    ListBanksUseCase,
)
from api.infrastructure.http.dependencies import (
    get_create_bank,
    get_delete_bank,
    get_list_banks,
)

router = APIRouter()


@router.get("", response_model=list[BankResponse])
async def list_banks(
    user_id: UUID | None = Query(default=None),
    use_case: ListBanksUseCase = Depends(get_list_banks),
):
    return await use_case.execute(user_id)


@router.post("", response_model=BankResponse, status_code=201)
async def create_custom_bank(
    data: BankCreate,
    use_case: CreateBankUseCase = Depends(get_create_bank),
):
    return await use_case.execute(data)


@router.delete("/{bank_id}", status_code=204)
async def delete_custom_bank(
    bank_id: UUID,
    use_case: DeleteBankUseCase = Depends(get_delete_bank),
):
    await use_case.execute(bank_id)
