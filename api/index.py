from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.infrastructure.config.settings import settings
from api.domain.exceptions import DomainException, NotFoundError, ForbiddenError
from api.infrastructure.persistence.database import create_pool, close_pool
from api.infrastructure.http.bank_router import router as bank_router
from api.infrastructure.http.card_router import router as card_router
from api.infrastructure.http.transaction_router import router as transaction_router
from api.infrastructure.http.category_router import router as category_router
from api.infrastructure.http.dashboard_router import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await create_pool(settings.database_url)
    app.state.db_pool = pool
    yield
    await close_pool(pool)


app = FastAPI(
    title="My Finance API",
    description="API para gestao financeira pessoal",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bank_router, prefix="/api/banks", tags=["Banks"])
app.include_router(card_router, prefix="/api/cards", tags=["Cards"])
app.include_router(transaction_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(category_router, prefix="/api/categories", tags=["Categories"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])


@app.exception_handler(NotFoundError)
async def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request, exc):
    return JSONResponse(status_code=403, content={"detail": str(exc)})


@app.exception_handler(DomainException)
async def domain_exception_handler(request, exc):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/api/health")
async def health_check(request: Request):
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")
    return {"status": "ok", "database": "connected"}
