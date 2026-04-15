from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class HouseholdInvite(BaseModel):
    id: UUID
    household_id: UUID
    invited_email: str
    invited_by: UUID
    status: str = "pending"
    accepted_at: datetime | None = None
    created_at: datetime
