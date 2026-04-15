from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from api.application.dtos.transaction_dto import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
)
from api.application.dtos.transaction_summary_dto import TransactionSummaryResponse
from api.application.use_cases.transaction_use_cases import (
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    RealizeTransactionUseCase,
    DeleteTransactionUseCase,
    DeleteRecurringTransactionsUseCase,
)
from api.application.use_cases.transaction_summary_use_case import (
    GetTransactionSummaryUseCase,
)
from api.domain.entities.user import User
from api.infrastructure.http.auth import get_current_user
from api.infrastructure.http.dependencies import (
    get_list_transactions,
    get_create_transaction,
    get_update_transaction,
    get_realize_transaction,
    get_delete_transaction,
    get_delete_recurring_transactions,
    get_transaction_summary,
)

router = APIRouter()


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    current_user: User = Depends(get_current_user),
    card_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    is_scheduled: bool | None = Query(default=None),
    use_case: ListTransactionsUseCase = Depends(get_list_transactions),
):
    return await use_case.execute(
        card_id=card_id,
        household_id=current_user.household_id,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        is_scheduled=is_scheduled,
    )


@router.get("/summary", response_model=TransactionSummaryResponse)
async def get_summary(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    card_id: UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    use_case: GetTransactionSummaryUseCase = Depends(get_transaction_summary),
):
    return await use_case.execute(
        household_id=current_user.household_id,
        month=month,
        card_id=card_id,
    )


@router.post("", response_model=list[TransactionResponse], status_code=201)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    use_case: CreateTransactionUseCase = Depends(get_create_transaction),
):
    return await use_case.execute(data, current_user.household_id)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    use_case: UpdateTransactionUseCase = Depends(get_update_transaction),
):
    return await use_case.execute(transaction_id, data, current_user.household_id)


@router.delete("/{transaction_id}/recurring-future", status_code=204)
async def delete_recurring_transactions(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: DeleteRecurringTransactionsUseCase = Depends(
        get_delete_recurring_transactions
    ),
):
    await use_case.execute(transaction_id, current_user.household_id)


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: DeleteTransactionUseCase = Depends(get_delete_transaction),
):
    await use_case.execute(transaction_id, current_user.household_id)


@router.patch("/{transaction_id}/realize", response_model=TransactionResponse)
async def realize_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: RealizeTransactionUseCase = Depends(get_realize_transaction),
):
    return await use_case.execute(transaction_id, current_user.household_id)
