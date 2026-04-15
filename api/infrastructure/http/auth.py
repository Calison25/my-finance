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

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _extract_bearer(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return authorization[7:]


def decode_jwt(token: str) -> dict:
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
    authorization: str = Header(..., alias="Authorization"),
    user_repo: PostgresUserRepository = Depends(get_user_repository),
) -> User:
    token = _extract_bearer(authorization)
    payload = decode_jwt(token)
    user_id = UUID(payload["sub"])
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not provisioned")
    return user
