from uuid import UUID

import asyncpg

from api.domain.entities.bank import Bank


class PostgresBankRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @staticmethod
    def _row_to_bank(record: asyncpg.Record) -> Bank:
        return Bank(**dict(record))

    async def list_all(self, user_id: UUID | None = None) -> list[Bank]:
        async with self._pool.acquire() as conn:
            if user_id is None:
                rows = await conn.fetch(
                    "SELECT * FROM banks WHERE is_default = TRUE ORDER BY name"
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM banks WHERE is_default = TRUE OR user_id = $1 ORDER BY name",
                    user_id,
                )
        return [self._row_to_bank(row) for row in rows]

    async def list_by_household(self, household_id: UUID) -> list[Bank]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM banks WHERE is_default = TRUE OR household_id = $1 ORDER BY name",
                household_id,
            )
        return [self._row_to_bank(row) for row in rows]

    async def get_by_id(self, bank_id: UUID) -> Bank | None:
        query = "SELECT * FROM banks WHERE id = $1"
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, bank_id)
        if row is None:
            return None
        return self._row_to_bank(row)

    async def create(self, bank: Bank) -> Bank:
        query = """
            INSERT INTO banks (id, name, code, logo_url, color, is_default, user_id, household_id)
            VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
            RETURNING *
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                query,
                bank.id,
                bank.name,
                bank.code,
                bank.logo_url,
                bank.color,
                bank.user_id,
                bank.household_id,
            )
        return self._row_to_bank(row)

    async def delete(self, bank_id: UUID) -> None:
        query = "DELETE FROM banks WHERE id = $1 AND is_default = FALSE"
        async with self._pool.acquire() as conn:
            await conn.execute(query, bank_id)
