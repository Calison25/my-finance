from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.application.dtos.card_dto import CardCreate, CardUpdate, CardResponse
from api.application.use_cases.card_use_cases import (
    ListCardsUseCase,
    GetCardUseCase,
    CreateCardUseCase,
    UpdateCardUseCase,
    DeleteCardUseCase,
)
from api.infrastructure.http.dependencies import (
    get_list_cards,
    get_get_card,
    get_create_card,
    get_update_card,
    get_delete_card,
)

router = APIRouter()


@router.get("", response_model=list[CardResponse])
async def list_cards(
    user_id: UUID = Query(...),
    use_case: ListCardsUseCase = Depends(get_list_cards),
):
    return await use_case.execute(user_id)


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(
    card_id: UUID,
    use_case: GetCardUseCase = Depends(get_get_card),
):
    return await use_case.execute(card_id)


@router.post("", response_model=CardResponse, status_code=201)
async def create_card(
    data: CardCreate,
    user_id: UUID = Query(...),
    use_case: CreateCardUseCase = Depends(get_create_card),
):
    return await use_case.execute(data, user_id)


@router.put("/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: UUID,
    data: CardUpdate,
    use_case: UpdateCardUseCase = Depends(get_update_card),
):
    return await use_case.execute(card_id, data)


@router.delete("/{card_id}", status_code=204)
async def delete_card(
    card_id: UUID,
    use_case: DeleteCardUseCase = Depends(get_delete_card),
):
    await use_case.execute(card_id)
