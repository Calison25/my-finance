from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_cards():
    return {"message": "List cards - TODO"}


@router.post("")
async def create_card():
    return {"message": "Create card - TODO"}


@router.get("/{card_id}")
async def get_card(card_id: str):
    return {"message": f"Get card {card_id} - TODO"}


@router.put("/{card_id}")
async def update_card(card_id: str):
    return {"message": f"Update card {card_id} - TODO"}


@router.delete("/{card_id}")
async def delete_card(card_id: str):
    return {"message": f"Delete card {card_id} - TODO"}
