"""
Run SQL migrations against the database.

Connects via DATABASE_URL, tracks applied migrations in a _migrations table,
and executes only pending ones in order. Designed to run during Vercel build.
"""

import asyncio
import os
import sys
from pathlib import Path

try:
    import asyncpg
except ImportError:
    print("ERROR: asyncpg not installed")
    sys.exit(1)

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "supabase" / "migrations"


async def run():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("SKIP: DATABASE_URL not set, skipping migrations")
        sys.exit(0)

    conn = await asyncpg.connect(database_url)

    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        applied = {
            row["name"]
            for row in await conn.fetch("SELECT name FROM _migrations")
        }

        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

        if not migration_files:
            print("No migration files found")
            return

        pending = [f for f in migration_files if f.name not in applied]

        if not pending:
            print(f"All {len(applied)} migrations already applied")
            return

        print(f"Found {len(pending)} pending migration(s)")

        for migration_file in pending:
            sql = migration_file.read_text(encoding="utf-8")
            print(f"  Applying: {migration_file.name}...", end=" ")

            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO _migrations (name) VALUES ($1)",
                migration_file.name,
            )

            print("OK")

        total = len(applied) + len(pending)
        print(f"Done. {total} migration(s) applied total")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
