from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_categories():
    return {"message": "List categories - TODO"}


@router.post("")
async def create_category():
    return {"message": "Create category - TODO"}


@router.delete("/{category_id}")
async def delete_category(category_id: str):
    return {"message": f"Delete category {category_id} - TODO"}
