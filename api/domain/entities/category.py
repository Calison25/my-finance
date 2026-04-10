from uuid import UUID

from pydantic import BaseModel


class Category(BaseModel):
    id: UUID
    name: str
    icon: str | None = None
    color: str
    is_default: bool = True
    user_id: UUID | None = None
