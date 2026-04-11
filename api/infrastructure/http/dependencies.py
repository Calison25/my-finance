import asyncpg
from fastapi import Depends, Request

from api.infrastructure.persistence.postgres_bank_repository import (
    PostgresBankRepository,
)
from api.infrastructure.persistence.postgres_category_repository import (
    PostgresCategoryRepository,
)
from api.infrastructure.persistence.postgres_card_repository import (
    PostgresCardRepository,
)
from api.infrastructure.persistence.postgres_transaction_repository import (
    PostgresTransactionRepository,
)

from api.application.use_cases.bank_use_cases import (
    CreateBankUseCase,
    DeleteBankUseCase,
    ListBanksUseCase,
)
from api.application.use_cases.category_use_cases import (
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
)
from api.application.use_cases.card_use_cases import (
    CreateCardUseCase,
    DeleteCardUseCase,
    GetCardUseCase,
    ListCardsUseCase,
    UpdateCardUseCase,
)
from api.application.use_cases.transaction_use_cases import (
    CreateTransactionUseCase,
    DeleteRecurringTransactionsUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    RealizeTransactionUseCase,
    UpdateTransactionUseCase,
)
from api.application.use_cases.dashboard_use_case import GetDashboardSummaryUseCase


def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.db_pool


# --- Repository factories ---


def get_bank_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresBankRepository:
    return PostgresBankRepository(pool)


def get_category_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresCategoryRepository:
    return PostgresCategoryRepository(pool)


def get_card_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresCardRepository:
    return PostgresCardRepository(pool)


def get_transaction_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresTransactionRepository:
    return PostgresTransactionRepository(pool)


# --- Use case factories: Bank ---


def get_list_banks(
    repo: PostgresBankRepository = Depends(get_bank_repository),
) -> ListBanksUseCase:
    return ListBanksUseCase(repo)


def get_create_bank(
    repo: PostgresBankRepository = Depends(get_bank_repository),
) -> CreateBankUseCase:
    return CreateBankUseCase(repo)


def get_delete_bank(
    repo: PostgresBankRepository = Depends(get_bank_repository),
) -> DeleteBankUseCase:
    return DeleteBankUseCase(repo)


# --- Use case factories: Category ---


def get_list_categories(
    repo: PostgresCategoryRepository = Depends(get_category_repository),
) -> ListCategoriesUseCase:
    return ListCategoriesUseCase(repo)


def get_create_category(
    repo: PostgresCategoryRepository = Depends(get_category_repository),
) -> CreateCategoryUseCase:
    return CreateCategoryUseCase(repo)


def get_delete_category(
    repo: PostgresCategoryRepository = Depends(get_category_repository),
) -> DeleteCategoryUseCase:
    return DeleteCategoryUseCase(repo)


# --- Use case factories: Card ---


def get_list_cards(
    repo: PostgresCardRepository = Depends(get_card_repository),
) -> ListCardsUseCase:
    return ListCardsUseCase(repo)


def get_get_card(
    repo: PostgresCardRepository = Depends(get_card_repository),
) -> GetCardUseCase:
    return GetCardUseCase(repo)


def get_create_card(
    card_repo: PostgresCardRepository = Depends(get_card_repository),
    bank_repo: PostgresBankRepository = Depends(get_bank_repository),
) -> CreateCardUseCase:
    return CreateCardUseCase(card_repo, bank_repo)


def get_update_card(
    repo: PostgresCardRepository = Depends(get_card_repository),
) -> UpdateCardUseCase:
    return UpdateCardUseCase(repo)


def get_delete_card(
    repo: PostgresCardRepository = Depends(get_card_repository),
) -> DeleteCardUseCase:
    return DeleteCardUseCase(repo)


# --- Use case factories: Transaction ---


def get_list_transactions(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
) -> ListTransactionsUseCase:
    return ListTransactionsUseCase(repo)


def get_create_transaction(
    transaction_repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    category_repo: PostgresCategoryRepository = Depends(get_category_repository),
) -> CreateTransactionUseCase:
    return CreateTransactionUseCase(transaction_repo, category_repo)


def get_update_transaction(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
) -> UpdateTransactionUseCase:
    return UpdateTransactionUseCase(repo)


def get_realize_transaction(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
) -> RealizeTransactionUseCase:
    return RealizeTransactionUseCase(repo)


def get_delete_transaction(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
) -> DeleteTransactionUseCase:
    return DeleteTransactionUseCase(repo)


def get_delete_recurring_transactions(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
) -> DeleteRecurringTransactionsUseCase:
    return DeleteRecurringTransactionsUseCase(repo)


# --- Use case factories: Dashboard ---


def get_dashboard_summary(
    card_repo: PostgresCardRepository = Depends(get_card_repository),
    transaction_repo: PostgresTransactionRepository = Depends(
        get_transaction_repository
    ),
) -> GetDashboardSummaryUseCase:
    return GetDashboardSummaryUseCase(card_repo, transaction_repo)
