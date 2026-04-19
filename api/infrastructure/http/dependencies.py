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
from api.infrastructure.persistence.postgres_user_repository import (
    PostgresUserRepository,
)
from api.infrastructure.persistence.postgres_household_repository import (
    PostgresHouseholdRepository,
)
from api.infrastructure.persistence.postgres_household_invite_repository import (
    PostgresHouseholdInviteRepository,
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
    DeleteTransactionGroupUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    RealizeTransactionUseCase,
    UpdateTransactionUseCase,
)
from api.application.use_cases.transaction_summary_use_case import (
    GetTransactionSummaryUseCase,
)
from api.application.use_cases.dashboard_use_case import GetDashboardSummaryUseCase
from api.application.use_cases.provision_user_use_case import ProvisionUserUseCase
from api.application.use_cases.invite_use_cases import InviteMemberUseCase
from api.application.use_cases.household_use_cases import (
    CancelInviteUseCase,
    ListInvitesUseCase,
    ListMembersUseCase,
    RemoveMemberUseCase,
)


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


def get_user_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresUserRepository:
    return PostgresUserRepository(pool)


def get_household_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresHouseholdRepository:
    return PostgresHouseholdRepository(pool)


def get_household_invite_repository(
    pool: asyncpg.Pool = Depends(get_db_pool),
) -> PostgresHouseholdInviteRepository:
    return PostgresHouseholdInviteRepository(pool)


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
    card_repo: PostgresCardRepository = Depends(get_card_repository),
) -> ListTransactionsUseCase:
    return ListTransactionsUseCase(repo, card_repo)


def get_create_transaction(
    transaction_repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    category_repo: PostgresCategoryRepository = Depends(get_category_repository),
    card_repo: PostgresCardRepository = Depends(get_card_repository),
) -> CreateTransactionUseCase:
    return CreateTransactionUseCase(transaction_repo, category_repo, card_repo)


def get_update_transaction(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    card_repo: PostgresCardRepository = Depends(get_card_repository),
    category_repo: PostgresCategoryRepository = Depends(get_category_repository),
) -> UpdateTransactionUseCase:
    return UpdateTransactionUseCase(repo, card_repo, category_repo)


def get_realize_transaction(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    card_repo: PostgresCardRepository = Depends(get_card_repository),
) -> RealizeTransactionUseCase:
    return RealizeTransactionUseCase(repo, card_repo)


def get_delete_transaction(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    card_repo: PostgresCardRepository = Depends(get_card_repository),
) -> DeleteTransactionUseCase:
    return DeleteTransactionUseCase(repo, card_repo)


def get_delete_transaction_group(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    card_repo: PostgresCardRepository = Depends(get_card_repository),
) -> DeleteTransactionGroupUseCase:
    return DeleteTransactionGroupUseCase(repo, card_repo)


def get_transaction_summary(
    repo: PostgresTransactionRepository = Depends(get_transaction_repository),
    card_repo: PostgresCardRepository = Depends(get_card_repository),
) -> GetTransactionSummaryUseCase:
    return GetTransactionSummaryUseCase(repo, card_repo)


# --- Use case factories: Dashboard ---


def get_dashboard_summary(
    card_repo: PostgresCardRepository = Depends(get_card_repository),
    transaction_repo: PostgresTransactionRepository = Depends(
        get_transaction_repository
    ),
) -> GetDashboardSummaryUseCase:
    return GetDashboardSummaryUseCase(card_repo, transaction_repo)


# --- Use case factories: Auth ---


def get_provision_user(
    user_repo: PostgresUserRepository = Depends(get_user_repository),
    household_repo: PostgresHouseholdRepository = Depends(get_household_repository),
    invite_repo: PostgresHouseholdInviteRepository = Depends(
        get_household_invite_repository
    ),
) -> ProvisionUserUseCase:
    return ProvisionUserUseCase(user_repo, household_repo, invite_repo)


# --- Use case factories: Household ---


def get_invite_member(
    invite_repo: PostgresHouseholdInviteRepository = Depends(
        get_household_invite_repository
    ),
    user_repo: PostgresUserRepository = Depends(get_user_repository),
) -> InviteMemberUseCase:
    return InviteMemberUseCase(invite_repo, user_repo)


def get_list_members(
    user_repo: PostgresUserRepository = Depends(get_user_repository),
) -> ListMembersUseCase:
    return ListMembersUseCase(user_repo)


def get_remove_member(
    user_repo: PostgresUserRepository = Depends(get_user_repository),
) -> RemoveMemberUseCase:
    return RemoveMemberUseCase(user_repo)


def get_list_invites(
    invite_repo: PostgresHouseholdInviteRepository = Depends(
        get_household_invite_repository
    ),
) -> ListInvitesUseCase:
    return ListInvitesUseCase(invite_repo)


def get_cancel_invite(
    invite_repo: PostgresHouseholdInviteRepository = Depends(
        get_household_invite_repository
    ),
) -> CancelInviteUseCase:
    return CancelInviteUseCase(invite_repo)
