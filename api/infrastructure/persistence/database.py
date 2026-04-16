import asyncpg
from asyncpg import Pool

_pool: Pool | None = None


async def create_pool(database_url: str) -> Pool:
    global _pool
    is_supabase = "supabase" in database_url
    _pool = await asyncpg.create_pool(
        database_url,
        min_size=1,
        max_size=5,
        ssl="require" if is_supabase else None,
        statement_cache_size=0 if is_supabase else 100,
    )
    return _pool


async def get_pool() -> Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool


async def close_pool(pool: Pool | None = None) -> None:
    global _pool
    target = pool or _pool
    if target:
        await target.close()
    _pool = None
