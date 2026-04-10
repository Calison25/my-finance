from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.infrastructure.http.bank_router import router as bank_router
from api.infrastructure.http.card_router import router as card_router
from api.infrastructure.http.transaction_router import router as transaction_router
from api.infrastructure.http.category_router import router as category_router
from api.infrastructure.http.dashboard_router import router as dashboard_router

app = FastAPI(
    title="My Finance API",
    description="API para gestao financeira pessoal",
    version="0.1.0",
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


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
