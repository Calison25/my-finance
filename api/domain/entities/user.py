from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class UserRole(str, Enum):
    owner = "owner"
    member = "member"


class User(BaseModel):
    id: UUID
    household_id: UUID
    email: str
    name: str | None = None
    avatar_url: str | None = None
    role: UserRole = UserRole.owner
    created_at: datetime
