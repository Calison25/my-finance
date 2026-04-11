from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BankCreate(BaseModel):
    name: str
    code: str | None = None
    logo_url: str | None = None
    color: str
    user_id: UUID | None = None


class BankResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str | None
    logo_url: str | None
    color: str
    is_default: bool
    user_id: UUID | None
    created_at: datetime
