from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    name: str = Field(max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    icon: str | None
    color: str
    is_default: bool
    user_id: UUID | None
    household_id: UUID | None
    created_at: datetime
