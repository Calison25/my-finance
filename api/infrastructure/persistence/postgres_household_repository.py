from uuid import UUID

import asyncpg

from api.domain.entities.household import Household


class PostgresHouseholdRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(self, household: Household) -> Household:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO households (id, name, created_at)
                VALUES ($1, $2, $3)
                RETURNING *
                """,
                household.id,
                household.name,
                household.created_at,
            )
        return self._row_to_household(row)

    async def get_by_id(self, household_id: UUID) -> Household | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM households WHERE id = $1",
                household_id,
            )
        if row is None:
            return None
        return self._row_to_household(row)

    @staticmethod
    def _row_to_household(record: asyncpg.Record) -> Household:
        return Household(**dict(record))
