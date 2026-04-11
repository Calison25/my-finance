from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from api.application.dtos.transaction_dto import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
)
from api.application.use_cases.transaction_use_cases import (
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    RealizeTransactionUseCase,
    DeleteTransactionUseCase,
    DeleteRecurringTransactionsUseCase,
)
from api.infrastructure.http.dependencies import (
    get_list_transactions,
    get_create_transaction,
    get_update_transaction,
    get_realize_transaction,
    get_delete_transaction,
    get_delete_recurring_transactions,
)

router = APIRouter()


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    card_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    is_scheduled: bool | None = Query(default=None),
    use_case: ListTransactionsUseCase = Depends(get_list_transactions),
):
    if card_id is None and user_id is None:
        raise HTTPException(
            status_code=422,
            detail="card_id ou user_id deve ser informado",
        )
    return await use_case.execute(
        card_id=card_id,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        is_scheduled=is_scheduled,
    )


@router.post("", response_model=list[TransactionResponse], status_code=201)
async def create_transaction(
    data: TransactionCreate,
    use_case: CreateTransactionUseCase = Depends(get_create_transaction),
):
    return await use_case.execute(data)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    data: TransactionUpdate,
    use_case: UpdateTransactionUseCase = Depends(get_update_transaction),
):
    return await use_case.execute(transaction_id, data)


@router.delete("/{transaction_id}/recurring-future", status_code=204)
async def delete_recurring_transactions(
    transaction_id: UUID,
    use_case: DeleteRecurringTransactionsUseCase = Depends(
        get_delete_recurring_transactions
    ),
):
    await use_case.execute(transaction_id)


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: UUID,
    use_case: DeleteTransactionUseCase = Depends(get_delete_transaction),
):
    await use_case.execute(transaction_id)


@router.patch("/{transaction_id}/realize", response_model=TransactionResponse)
async def realize_transaction(
    transaction_id: UUID,
    use_case: RealizeTransactionUseCase = Depends(get_realize_transaction),
):
    return await use_case.execute(transaction_id)
