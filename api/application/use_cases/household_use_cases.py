from uuid import UUID

from api.application.dtos.auth_dto import InviteResponse, MemberResponse
from api.domain.entities.user import User, UserRole
from api.domain.exceptions import ForbiddenError, NotFoundError
from api.domain.repositories.household_invite_repository import (
    HouseholdInviteRepository,
)
from api.domain.repositories.user_repository import UserRepository


class ListMembersUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, current_user: User) -> list[MemberResponse]:
        users = await self._user_repo.list_by_household(current_user.household_id)
        return [
            MemberResponse.model_validate(u, from_attributes=True) for u in users
        ]


class RemoveMemberUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, current_user: User, target_user_id: UUID) -> None:
        if current_user.role != UserRole.owner:
            raise ForbiddenError("Apenas o dono da conta pode remover membros")
        if target_user_id == current_user.id:
            raise ForbiddenError("Voce nao pode remover a si mesmo")

        target = await self._user_repo.get_by_id(target_user_id)
        if target is None:
            raise NotFoundError("User", str(target_user_id))
        if target.household_id != current_user.household_id:
            raise ForbiddenError("Usuario nao pertence a sua conta")

        await self._user_repo.delete(target_user_id)


class ListInvitesUseCase:
    def __init__(self, invite_repo: HouseholdInviteRepository) -> None:
        self._invite_repo = invite_repo

    async def execute(self, current_user: User) -> list[InviteResponse]:
        invites = await self._invite_repo.list_by_household(
            current_user.household_id
        )
        return [
            InviteResponse.model_validate(i, from_attributes=True) for i in invites
        ]


class CancelInviteUseCase:
    def __init__(self, invite_repo: HouseholdInviteRepository) -> None:
        self._invite_repo = invite_repo

    async def execute(self, current_user: User, invite_id: UUID) -> None:
        if current_user.role != UserRole.owner:
            raise ForbiddenError("Apenas o dono da conta pode cancelar convites")
        invite = await self._invite_repo.get_by_id(invite_id)
        if invite is None:
            raise NotFoundError("Invite", str(invite_id))
        if invite.household_id != current_user.household_id:
            raise ForbiddenError("Acesso negado a este recurso")
        await self._invite_repo.cancel(invite_id)
