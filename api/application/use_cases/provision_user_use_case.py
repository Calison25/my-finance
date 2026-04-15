from datetime import UTC, datetime
from uuid import UUID, uuid4

from api.application.dtos.auth_dto import (
    HouseholdResponse,
    ProvisionUserOutput,
    UserResponse,
)
from api.domain.entities.household import Household
from api.domain.entities.user import User, UserRole
from api.domain.repositories.household_invite_repository import (
    HouseholdInviteRepository,
)
from api.domain.repositories.household_repository import HouseholdRepository
from api.domain.repositories.user_repository import UserRepository


class ProvisionUserUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        household_repo: HouseholdRepository,
        invite_repo: HouseholdInviteRepository,
    ) -> None:
        self._user_repo = user_repo
        self._household_repo = household_repo
        self._invite_repo = invite_repo

    async def execute(
        self,
        user_id: UUID,
        email: str,
        name: str | None,
        avatar_url: str | None,
    ) -> ProvisionUserOutput:
        existing = await self._user_repo.get_by_id(user_id)
        if existing:
            household = await self._household_repo.get_by_id(existing.household_id)
            return ProvisionUserOutput(
                user=UserResponse.model_validate(existing, from_attributes=True),
                household=HouseholdResponse.model_validate(
                    household, from_attributes=True
                ),
                is_new=False,
            )

        invite = await self._invite_repo.get_pending_by_email(email)
        if invite:
            household = await self._household_repo.get_by_id(invite.household_id)
            user = User(
                id=user_id,
                household_id=invite.household_id,
                email=email,
                name=name,
                avatar_url=avatar_url,
                role=UserRole.member,
                created_at=datetime.now(UTC),
            )
            created_user = await self._user_repo.create(user)
            await self._invite_repo.mark_accepted(invite.id)
            return ProvisionUserOutput(
                user=UserResponse.model_validate(created_user, from_attributes=True),
                household=HouseholdResponse.model_validate(
                    household, from_attributes=True
                ),
                is_new=True,
            )

        now = datetime.now(UTC)
        household = Household(
            id=uuid4(),
            name=f"{name or email}",
            created_at=now,
        )
        created_household = await self._household_repo.create(household)

        user = User(
            id=user_id,
            household_id=created_household.id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            role=UserRole.owner,
            created_at=now,
        )
        created_user = await self._user_repo.create(user)

        return ProvisionUserOutput(
            user=UserResponse.model_validate(created_user, from_attributes=True),
            household=HouseholdResponse.model_validate(
                created_household, from_attributes=True
            ),
            is_new=True,
        )
