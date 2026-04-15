from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BankCreate(BaseModel):
    name: str = Field(max_length=100)
    code: str | None = Field(default=None, max_length=10)
    logo_url: str | None = Field(default=None, max_length=500)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class BankResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str | None
    logo_url: str | None
    color: str
    is_default: bool
    user_id: UUID | None
    household_id: UUID | None
    created_at: datetime
