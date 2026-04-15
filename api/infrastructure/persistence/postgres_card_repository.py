from uuid import UUID

import asyncpg

from api.domain.entities.card import Card
from api.domain.value_objects.card_type import CardType


class PostgresCardRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list_by_user(self, user_id: UUID) -> list[Card]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC",
                user_id,
            )
        return [self._row_to_card(row) for row in rows]

    async def list_by_household(self, household_id: UUID) -> list[Card]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM cards WHERE household_id = $1 ORDER BY created_at DESC",
                household_id,
            )
        return [self._row_to_card(row) for row in rows]

    async def get_by_id(self, card_id: UUID) -> Card | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM cards WHERE id = $1",
                card_id,
            )
        if row is None:
            return None
        return self._row_to_card(row)

    async def create(self, card: Card) -> Card:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO cards (id, user_id, bank_id, household_id, name, type, last_digits, credit_limit, billing_day, due_day, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
                """,
                card.id,
                card.user_id,
                card.bank_id,
                card.household_id,
                card.name,
                card.type.value,
                card.last_digits,
                card.credit_limit,
                card.billing_day,
                card.due_day,
                card.created_at,
            )
        return self._row_to_card(row)

    async def update(self, card: Card) -> Card | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE cards
                SET bank_id = $2, name = $3, type = $4, last_digits = $5,
                    credit_limit = $6, billing_day = $7, due_day = $8
                WHERE id = $1
                RETURNING *
                """,
                card.id,
                card.bank_id,
                card.name,
                card.type.value,
                card.last_digits,
                card.credit_limit,
                card.billing_day,
                card.due_day,
            )
        if row is None:
            return None
        return self._row_to_card(row)

    async def delete(self, card_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM cards WHERE id = $1",
                card_id,
            )

    def _row_to_card(self, record: asyncpg.Record) -> Card:
        return Card(
            id=record["id"],
            user_id=record["user_id"],
            bank_id=record["bank_id"],
            household_id=record["household_id"],
            name=record["name"],
            type=CardType(record["type"]),
            last_digits=record["last_digits"],
            credit_limit=record["credit_limit"],
            billing_day=record["billing_day"],
            due_day=record["due_day"],
            created_at=record["created_at"],
        )
