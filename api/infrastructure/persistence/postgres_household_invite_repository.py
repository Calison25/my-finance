from datetime import UTC, datetime
from uuid import UUID

import asyncpg

from api.domain.entities.household_invite import HouseholdInvite


class PostgresHouseholdInviteRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(self, invite: HouseholdInvite) -> HouseholdInvite:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO household_invites (id, household_id, invited_email, invited_by, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                """,
                invite.id,
                invite.household_id,
                invite.invited_email,
                invite.invited_by,
                invite.status,
                invite.created_at,
            )
        return self._row_to_invite(row)

    async def get_by_id(self, invite_id: UUID) -> HouseholdInvite | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM household_invites WHERE id = $1",
                invite_id,
            )
        if row is None:
            return None
        return self._row_to_invite(row)

    async def get_pending_by_email(self, email: str) -> HouseholdInvite | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM household_invites
                WHERE invited_email = $1 AND status = 'pending'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                email,
            )
        if row is None:
            return None
        return self._row_to_invite(row)

    async def list_by_household(self, household_id: UUID) -> list[HouseholdInvite]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM household_invites WHERE household_id = $1 ORDER BY created_at DESC",
                household_id,
            )
        return [self._row_to_invite(row) for row in rows]

    async def mark_accepted(self, invite_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE household_invites SET status = 'accepted', accepted_at = $2 WHERE id = $1",
                invite_id,
                datetime.now(UTC),
            )

    async def cancel(self, invite_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE household_invites SET status = 'cancelled' WHERE id = $1",
                invite_id,
            )

    @staticmethod
    def _row_to_invite(record: asyncpg.Record) -> HouseholdInvite:
        return HouseholdInvite(**dict(record))
