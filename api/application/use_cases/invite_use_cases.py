from datetime import UTC, datetime
from uuid import uuid4

from api.application.dtos.auth_dto import InviteResponse
from api.domain.entities.household_invite import HouseholdInvite
from api.domain.entities.user import User, UserRole
from api.domain.exceptions import DomainException, ForbiddenError
from api.domain.repositories.household_invite_repository import (
    HouseholdInviteRepository,
)
from api.domain.repositories.user_repository import UserRepository


class InviteMemberUseCase:
    def __init__(
        self,
        invite_repo: HouseholdInviteRepository,
        user_repo: UserRepository,
    ) -> None:
        self._invite_repo = invite_repo
        self._user_repo = user_repo

    async def execute(self, current_user: User, email: str) -> InviteResponse:
        if current_user.role != UserRole.owner:
            raise ForbiddenError("Apenas o dono da conta pode convidar membros")

        existing_user = await self._user_repo.get_by_email(email)
        if existing_user and existing_user.household_id == current_user.household_id:
            raise DomainException("Este email ja e membro da sua conta")

        existing_invite = await self._invite_repo.get_pending_by_email(email)
        if (
            existing_invite
            and existing_invite.household_id == current_user.household_id
        ):
            raise DomainException("Ja existe um convite pendente para este email")

        invite = HouseholdInvite(
            id=uuid4(),
            household_id=current_user.household_id,
            invited_email=email,
            invited_by=current_user.id,
            status="pending",
            created_at=datetime.now(UTC),
        )
        created = await self._invite_repo.create(invite)
        return InviteResponse.model_validate(created, from_attributes=True)
