from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException

from api.application.dtos.auth_dto import ProvisionUserOutput
from api.application.use_cases.provision_user_use_case import ProvisionUserUseCase
from api.infrastructure.http.auth import decode_jwt
from api.infrastructure.http.dependencies import get_provision_user

router = APIRouter()


@router.post("/me", response_model=ProvisionUserOutput)
async def provision_me(
    authorization: str = Header(..., alias="Authorization"),
    use_case: ProvisionUserUseCase = Depends(get_provision_user),
):
    token = authorization.replace("Bearer ", "", 1)
    if not token or token == authorization:
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    payload = decode_jwt(token)
    user_metadata = payload.get("user_metadata", {})

    return await use_case.execute(
        user_id=UUID(payload["sub"]),
        email=payload.get("email", ""),
        name=user_metadata.get("full_name"),
        avatar_url=user_metadata.get("avatar_url"),
    )
