from uuid import UUID

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Header

from api.domain.entities.user import User
from api.infrastructure.config.settings import settings
from api.infrastructure.http.dependencies import get_user_repository
from api.infrastructure.persistence.postgres_user_repository import (
    PostgresUserRepository,
)

LOCAL_DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    return authorization[7:]


def _is_local_dev(token: str) -> bool:
    return not settings.supabase_url and token == "local-dev"


def decode_jwt(token: str) -> dict:
    if _is_local_dev(token):
        return {
            "sub": str(LOCAL_DEV_USER_ID),
            "email": "dev@localhost",
            "user_metadata": {"full_name": "Dev Local", "avatar_url": None},
        }
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    user_repo: PostgresUserRepository = Depends(get_user_repository),
) -> User:
    token = _extract_bearer(authorization)
    if _is_local_dev(token):
        user = await user_repo.get_by_id(LOCAL_DEV_USER_ID)
        if user is None:
            raise HTTPException(status_code=401, detail="Local dev user not provisioned — call /api/auth/me first")
        return user
    payload = decode_jwt(token)
    user_id = UUID(payload["sub"])
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not provisioned")
    return user
