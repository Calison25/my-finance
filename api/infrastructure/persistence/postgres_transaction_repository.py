from datetime import date
from decimal import Decimal
from uuid import UUID

import asyncpg

from api.domain.entities.transaction import Transaction
from api.domain.value_objects.transaction_type import TransactionType


class PostgresTransactionRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list_by_card(
        self,
        card_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[Transaction]:
        query = "SELECT * FROM transactions WHERE card_id = $1"
        params: list = [card_id]
        param_index = 2

        if date_from is not None:
            query += f" AND date >= ${param_index}"
            params.append(date_from)
            param_index += 1

        if date_to is not None:
            query += f" AND date <= ${param_index}"
            params.append(date_to)
            param_index += 1

        if category_id is not None:
            query += f" AND category_id = ${param_index}"
            params.append(category_id)
            param_index += 1

        if is_scheduled is not None:
            query += f" AND is_scheduled = ${param_index}"
            params.append(is_scheduled)
            param_index += 1

        query += " ORDER BY date DESC, created_at DESC"

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        return [self._row_to_transaction(row) for row in rows]

    async def list_by_user(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[Transaction]:
        query = """
            SELECT t.* FROM transactions t
            JOIN cards c ON t.card_id = c.id
            WHERE c.user_id = $1
        """
        params: list = [user_id]
        param_index = 2

        if date_from is not None:
            query += f" AND t.date >= ${param_index}"
            params.append(date_from)
            param_index += 1

        if date_to is not None:
            query += f" AND t.date <= ${param_index}"
            params.append(date_to)
            param_index += 1

        if category_id is not None:
            query += f" AND t.category_id = ${param_index}"
            params.append(category_id)
            param_index += 1

        if is_scheduled is not None:
            query += f" AND t.is_scheduled = ${param_index}"
            params.append(is_scheduled)
            param_index += 1

        query += " ORDER BY t.date DESC, t.created_at DESC"

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        return [self._row_to_transaction(row) for row in rows]

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM transactions WHERE id = $1",
                transaction_id,
            )
        if row is None:
            return None
        return self._row_to_transaction(row)

    async def create(self, transaction: Transaction) -> Transaction:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO transactions
                    (id, card_id, description, amount, type, category_id,
                     date, is_scheduled, scheduled_date, is_realized,
                     is_recurring, is_bill, recurring_transaction_id, notes, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
                """,
                transaction.id,
                transaction.card_id,
                transaction.description,
                transaction.amount,
                transaction.type.value,
                transaction.category_id,
                transaction.date,
                transaction.is_scheduled,
                transaction.scheduled_date,
                transaction.is_realized,
                transaction.is_recurring,
                transaction.is_bill,
                transaction.recurring_transaction_id,
                transaction.notes,
                transaction.created_at,
            )
        return self._row_to_transaction(row)

    async def update(self, transaction: Transaction) -> Transaction | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE transactions
                SET description = $2, amount = $3, type = $4, category_id = $5,
                    date = $6, is_scheduled = $7, scheduled_date = $8,
                    is_realized = $9, notes = $10, is_recurring = $11,
                    is_bill = $12, recurring_transaction_id = $13
                WHERE id = $1
                RETURNING *
                """,
                transaction.id,
                transaction.description,
                transaction.amount,
                transaction.type.value,
                transaction.category_id,
                transaction.date,
                transaction.is_scheduled,
                transaction.scheduled_date,
                transaction.is_realized,
                transaction.notes,
                transaction.is_recurring,
                transaction.is_bill,
                transaction.recurring_transaction_id,
            )
        if row is None:
            return None
        return self._row_to_transaction(row)

    async def delete_by_recurring_id(self, recurring_transaction_id: UUID, from_date: date) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM transactions
                WHERE recurring_transaction_id = $1 AND date >= $2
                """,
                recurring_transaction_id,
                from_date,
            )

    async def delete(self, transaction_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM transactions WHERE id = $1",
                transaction_id,
            )

    async def get_balance(self, card_id: UUID) -> dict:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND is_realized = TRUE), 0) AS total_income,
                    COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND is_realized = TRUE), 0) AS total_expenses,
                    COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND is_scheduled = TRUE AND is_realized = FALSE), 0) AS scheduled_expenses
                FROM transactions
                WHERE card_id = $1
                """,
                card_id,
            )

        total_income = Decimal(str(row["total_income"]))
        total_expenses = Decimal(str(row["total_expenses"]))
        scheduled_expenses = Decimal(str(row["scheduled_expenses"]))

        return {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "scheduled_expenses": scheduled_expenses,
            "available_balance": total_income - total_expenses - scheduled_expenses,
        }

    def _row_to_transaction(self, record: asyncpg.Record) -> Transaction:
        return Transaction(
            id=record["id"],
            card_id=record["card_id"],
            description=record["description"],
            amount=record["amount"],
            type=TransactionType(record["type"]),
            category_id=record["category_id"],
            date=record["date"],
            is_scheduled=record["is_scheduled"],
            scheduled_date=record["scheduled_date"],
            is_realized=record["is_realized"],
            is_recurring=record["is_recurring"],
            is_bill=record["is_bill"],
            recurring_transaction_id=record["recurring_transaction_id"],
            notes=record["notes"],
            created_at=record["created_at"],
        )
