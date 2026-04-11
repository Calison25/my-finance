from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class Category(BaseModel):
    id: UUID
    name: str
    icon: str | None = None
    color: str
    is_default: bool = True
    user_id: UUID | None = None
    created_at: datetime = Field(default_factory=datetime.now)
