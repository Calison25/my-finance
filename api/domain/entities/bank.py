from uuid import UUID

from pydantic import BaseModel


class Bank(BaseModel):
    id: UUID
    name: str
    code: str | None = None
    logo_url: str | None = None
    color: str
    is_default: bool = True
    user_id: UUID | None = None
