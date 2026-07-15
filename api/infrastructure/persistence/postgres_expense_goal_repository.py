from uuid import UUID

import asyncpg

from api.domain.entities.expense_goal import ExpenseGoal


class PostgresExpenseGoalRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @staticmethod
    def _row_to_goal(record: asyncpg.Record) -> ExpenseGoal:
        return ExpenseGoal(**dict(record))

    async def get_by_household(self, household_id: UUID) -> ExpenseGoal | None:
        query = "SELECT * FROM expense_goals WHERE household_id = $1"
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, household_id)
        if row is None:
            return None
        return self._row_to_goal(row)

    async def upsert(self, goal: ExpenseGoal) -> ExpenseGoal:
        query = """
            INSERT INTO expense_goals (household_id, amount, updated_at)
            VALUES ($1, $2, now())
            ON CONFLICT (household_id)
            DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()
            RETURNING *
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, goal.household_id, goal.amount)
        return self._row_to_goal(row)
