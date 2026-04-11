from uuid import UUID

import asyncpg

from api.domain.entities.category import Category


class PostgresCategoryRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @staticmethod
    def _row_to_category(record: asyncpg.Record) -> Category:
        return Category(**dict(record))

    async def list_all(self, user_id: UUID | None = None) -> list[Category]:
        async with self._pool.acquire() as conn:
            if user_id is None:
                rows = await conn.fetch(
                    "SELECT * FROM categories WHERE is_default = TRUE ORDER BY name"
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM categories WHERE is_default = TRUE OR user_id = $1 ORDER BY name",
                    user_id,
                )
        return [self._row_to_category(row) for row in rows]

    async def get_by_id(self, category_id: UUID) -> Category | None:
        query = "SELECT * FROM categories WHERE id = $1"
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, category_id)
        if row is None:
            return None
        return self._row_to_category(row)

    async def create(self, category: Category) -> Category:
        query = """
            INSERT INTO categories (id, name, icon, color, is_default, user_id)
            VALUES ($1, $2, $3, $4, FALSE, $5)
            RETURNING *
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                query,
                category.id,
                category.name,
                category.icon,
                category.color,
                category.user_id,
            )
        return self._row_to_category(row)

    async def delete(self, category_id: UUID) -> None:
        query = "DELETE FROM categories WHERE id = $1 AND is_default = FALSE"
        async with self._pool.acquire() as conn:
            await conn.execute(query, category_id)
