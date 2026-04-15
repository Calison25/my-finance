from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from api.domain.entities.user import UserRole


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    household_id: UUID
    email: str
    name: str | None
    avatar_url: str | None
    role: UserRole
    created_at: datetime


class HouseholdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime


class ProvisionUserOutput(BaseModel):
    user: UserResponse
    household: HouseholdResponse
    is_new: bool


class InviteCreate(BaseModel):
    email: EmailStr


class InviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    household_id: UUID
    invited_email: str
    invited_by: UUID
    status: str
    accepted_at: datetime | None
    created_at: datetime


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str | None
    avatar_url: str | None
    role: UserRole
    created_at: datetime
