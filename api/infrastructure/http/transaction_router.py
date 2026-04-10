from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_transactions():
    return {"message": "List transactions - TODO"}


@router.post("")
async def create_transaction():
    return {"message": "Create transaction - TODO"}


@router.put("/{transaction_id}")
async def update_transaction(transaction_id: str):
    return {"message": f"Update transaction {transaction_id} - TODO"}


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str):
    return {"message": f"Delete transaction {transaction_id} - TODO"}


@router.patch("/{transaction_id}/realize")
async def realize_transaction(transaction_id: str):
    return {"message": f"Realize transaction {transaction_id} - TODO"}
