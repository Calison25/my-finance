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

    async def list_by_household(
        self,
        household_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: UUID | None = None,
        is_scheduled: bool | None = None,
    ) -> list[Transaction]:
        query = """
            SELECT t.* FROM transactions t
            JOIN cards c ON t.card_id = c.id
            WHERE c.household_id = $1
        """
        params: list = [household_id]
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
                     date, transaction_date, is_scheduled, scheduled_date, is_realized,
                     is_recurring, is_bill, recurring_transaction_id, installment_group_id,
                     notes, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
                """,
                transaction.id,
                transaction.card_id,
                transaction.description,
                transaction.amount,
                transaction.type.value,
                transaction.category_id,
                transaction.date,
                transaction.transaction_date,
                transaction.is_scheduled,
                transaction.scheduled_date,
                transaction.is_realized,
                transaction.is_recurring,
                transaction.is_bill,
                transaction.recurring_transaction_id,
                transaction.installment_group_id,
                transaction.notes,
                transaction.created_at,
            )
        return self._row_to_transaction(row)

    async def create_many(self, transactions: list[Transaction]) -> list[Transaction]:
        if not transactions:
            return []

        columns_per_row = 17
        values_sql_parts: list[str] = []
        params: list = []
        for i, tx in enumerate(transactions):
            base = i * columns_per_row
            placeholders = ", ".join(f"${base + j + 1}" for j in range(columns_per_row))
            values_sql_parts.append(f"({placeholders})")
            params.extend([
                tx.id,
                tx.card_id,
                tx.description,
                tx.amount,
                tx.type.value,
                tx.category_id,
                tx.date,
                tx.transaction_date,
                tx.is_scheduled,
                tx.scheduled_date,
                tx.is_realized,
                tx.is_recurring,
                tx.is_bill,
                tx.recurring_transaction_id,
                tx.installment_group_id,
                tx.notes,
                tx.created_at,
            ])

        query = f"""
            INSERT INTO transactions
                (id, card_id, description, amount, type, category_id,
                 date, transaction_date, is_scheduled, scheduled_date, is_realized,
                 is_recurring, is_bill, recurring_transaction_id, installment_group_id,
                 notes, created_at)
            VALUES {", ".join(values_sql_parts)}
            RETURNING *
        """

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        return [self._row_to_transaction(row) for row in rows]

    async def update(self, transaction: Transaction) -> Transaction | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE transactions
                SET description = $2, amount = $3, type = $4, category_id = $5,
                    date = $6, transaction_date = $7, is_scheduled = $8, scheduled_date = $9,
                    is_realized = $10, notes = $11, is_recurring = $12,
                    is_bill = $13, recurring_transaction_id = $14,
                    installment_group_id = $15
                WHERE id = $1
                RETURNING *
                """,
                transaction.id,
                transaction.description,
                transaction.amount,
                transaction.type.value,
                transaction.category_id,
                transaction.date,
                transaction.transaction_date,
                transaction.is_scheduled,
                transaction.scheduled_date,
                transaction.is_realized,
                transaction.notes,
                transaction.is_recurring,
                transaction.is_bill,
                transaction.recurring_transaction_id,
                transaction.installment_group_id,
            )
        if row is None:
            return None
        return self._row_to_transaction(row)

    async def delete_by_recurring_id(
        self, recurring_transaction_id: UUID, from_date: date | None = None
    ) -> int:
        async with self._pool.acquire() as conn:
            if from_date is None:
                status = await conn.execute(
                    "DELETE FROM transactions WHERE recurring_transaction_id = $1",
                    recurring_transaction_id,
                )
            else:
                status = await conn.execute(
                    """
                    DELETE FROM transactions
                    WHERE recurring_transaction_id = $1 AND date >= $2
                    """,
                    recurring_transaction_id,
                    from_date,
                )
        return int(status.split()[-1])

    async def delete_installment_group(
        self, card_id: UUID, base_description: str, from_date: date | None = None
    ) -> int:
        async with self._pool.acquire() as conn:
            if from_date is None:
                status = await conn.execute(
                    r"""
                    DELETE FROM transactions
                    WHERE card_id = $1
                      AND description ~ '\(\d+/\d+\)$'
                      AND btrim(regexp_replace(description, '\s*\(\d+/\d+\)$', '')) = $2
                    """,
                    card_id,
                    base_description,
                )
            else:
                status = await conn.execute(
                    r"""
                    DELETE FROM transactions
                    WHERE card_id = $1
                      AND description ~ '\(\d+/\d+\)$'
                      AND btrim(regexp_replace(description, '\s*\(\d+/\d+\)$', '')) = $2
                      AND date >= $3
                    """,
                    card_id,
                    base_description,
                    from_date,
                )
        return int(status.split()[-1])

    async def delete_installment_group_by_id(
        self, installment_group_id: UUID, from_date: date | None = None
    ) -> int:
        async with self._pool.acquire() as conn:
            if from_date is None:
                status = await conn.execute(
                    "DELETE FROM transactions WHERE installment_group_id = $1",
                    installment_group_id,
                )
            else:
                status = await conn.execute(
                    "DELETE FROM transactions WHERE installment_group_id = $1 AND date >= $2",
                    installment_group_id,
                    from_date,
                )
        return int(status.split()[-1])

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
            transaction_date=record["transaction_date"],
            is_scheduled=record["is_scheduled"],
            scheduled_date=record["scheduled_date"],
            is_realized=record["is_realized"],
            is_recurring=record["is_recurring"],
            is_bill=record["is_bill"],
            recurring_transaction_id=record["recurring_transaction_id"],
            installment_group_id=record["installment_group_id"],
            notes=record["notes"],
            created_at=record["created_at"],
        )
