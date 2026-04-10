from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_banks():
    return {"message": "List banks - TODO"}


@router.post("")
async def create_custom_bank():
    return {"message": "Create custom bank - TODO"}


@router.delete("/{bank_id}")
async def delete_custom_bank(bank_id: str):
    return {"message": f"Delete bank {bank_id} - TODO"}
