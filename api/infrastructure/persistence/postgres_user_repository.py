from uuid import UUID

import asyncpg

from api.domain.entities.user import User, UserRole


class PostgresUserRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_by_id(self, user_id: UUID) -> User | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id,
            )
        if row is None:
            return None
        return self._row_to_user(row)

    async def get_by_email(self, email: str) -> User | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1",
                email,
            )
        if row is None:
            return None
        return self._row_to_user(row)

    async def create(self, user: User) -> User:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO users (id, household_id, email, name, avatar_url, role, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
                """,
                user.id,
                user.household_id,
                user.email,
                user.name,
                user.avatar_url,
                user.role.value,
                user.created_at,
            )
        return self._row_to_user(row)

    async def list_by_household(self, household_id: UUID) -> list[User]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM users WHERE household_id = $1 ORDER BY created_at",
                household_id,
            )
        return [self._row_to_user(row) for row in rows]

    async def delete(self, user_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute("DELETE FROM users WHERE id = $1", user_id)

    @staticmethod
    def _row_to_user(record: asyncpg.Record) -> User:
        return User(
            id=record["id"],
            household_id=record["household_id"],
            email=record["email"],
            name=record["name"],
            avatar_url=record["avatar_url"],
            role=UserRole(record["role"]),
            created_at=record["created_at"],
        )
