from uuid import UUID

from fastapi import APIRouter, Depends

from api.application.dtos.auth_dto import (
    InviteCreate,
    InviteResponse,
    MemberResponse,
)
from api.application.use_cases.household_use_cases import (
    CancelInviteUseCase,
    ListInvitesUseCase,
    ListMembersUseCase,
    RemoveMemberUseCase,
)
from api.application.use_cases.invite_use_cases import InviteMemberUseCase
from api.domain.entities.user import User
from api.infrastructure.http.auth import get_current_user
from api.infrastructure.http.dependencies import (
    get_cancel_invite,
    get_invite_member,
    get_list_invites,
    get_list_members,
    get_remove_member,
)

router = APIRouter()


@router.get("/members", response_model=list[MemberResponse])
async def list_members(
    current_user: User = Depends(get_current_user),
    use_case: ListMembersUseCase = Depends(get_list_members),
):
    return await use_case.execute(current_user)


@router.delete("/members/{user_id}", status_code=204)
async def remove_member(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: RemoveMemberUseCase = Depends(get_remove_member),
):
    await use_case.execute(current_user, user_id)


@router.post("/invites", response_model=InviteResponse, status_code=201)
async def invite_member(
    data: InviteCreate,
    current_user: User = Depends(get_current_user),
    use_case: InviteMemberUseCase = Depends(get_invite_member),
):
    return await use_case.execute(current_user, data.email)


@router.get("/invites", response_model=list[InviteResponse])
async def list_invites(
    current_user: User = Depends(get_current_user),
    use_case: ListInvitesUseCase = Depends(get_list_invites),
):
    return await use_case.execute(current_user)


@router.delete("/invites/{invite_id}", status_code=204)
async def cancel_invite(
    invite_id: UUID,
    current_user: User = Depends(get_current_user),
    use_case: CancelInviteUseCase = Depends(get_cancel_invite),
):
    await use_case.execute(current_user, invite_id)
