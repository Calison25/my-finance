"""Testes das regras de transaction_date (data real) na criação e atualização."""
import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from api.application.dtos.transaction_dto import TransactionCreate, TransactionUpdate
from api.application.use_cases.transaction_use_cases import (
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
)
from api.domain.entities.transaction import Transaction
from api.domain.value_objects.transaction_type import TransactionType

# ---------------------------------------------------------------------------
# Helpers / Fakes
# ---------------------------------------------------------------------------

_HOUSEHOLD_ID = uuid4()
_CARD_ID = uuid4()


class _StubCard:
    def __init__(self, household_id: UUID):
        self.household_id = household_id


class FakeCardRepo:
    def __init__(self, household_id: UUID = _HOUSEHOLD_ID):
        self._card = _StubCard(household_id)

    async def get_by_id(self, card_id: UUID):  # noqa: ARG002
        return self._card


class FakeCategoryRepo:
    async def create(self, category):
        return category


class FakeTransactionRepo:
    def __init__(self, transaction: Transaction | None = None):
        self._transaction = transaction
        self.created: list[Transaction] = []
        self.updated: Transaction | None = None

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None:  # noqa: ARG002
        return self._transaction

    async def create_many(self, transactions: list[Transaction]) -> list[Transaction]:
        self.created = transactions
        return transactions

    async def update(self, transaction: Transaction) -> Transaction:
        self.updated = transaction
        return transaction


def _create_data(**kwargs) -> TransactionCreate:
    defaults = dict(
        card_id=_CARD_ID,
        description="Compra teste",
        amount=Decimal("100.00"),
        type=TransactionType.EXPENSE,
        date=date(2026, 9, 15),
    )
    defaults.update(kwargs)
    return TransactionCreate(**defaults)


def _run_create(data: TransactionCreate) -> list:
    use_case = CreateTransactionUseCase(
        transaction_repo=FakeTransactionRepo(),
        category_repo=FakeCategoryRepo(),
        card_repo=FakeCardRepo(),
    )
    return asyncio.run(use_case.execute(data, _HOUSEHOLD_ID))


# ---------------------------------------------------------------------------
# Criação — avulsa
# ---------------------------------------------------------------------------


def test_avulsa_sem_data_real_vira_dia_1_da_competencia():
    created = _run_create(_create_data())
    assert len(created) == 1
    assert created[0].transaction_date == date(2026, 9, 1)


def test_avulsa_com_data_real_mantem_exata():
    """Data real fora do mês de competência é preservada como está."""
    created = _run_create(_create_data(transaction_date=date(2026, 8, 31)))
    assert created[0].transaction_date == date(2026, 8, 31)


# ---------------------------------------------------------------------------
# Criação — parcelada
# ---------------------------------------------------------------------------


def test_parcelada_mantem_data_real_exata_em_todas_as_parcelas():
    """Comportamento Nubank: a data da compra acompanha todas as parcelas."""
    created = _run_create(
        _create_data(transaction_date=date(2026, 8, 31), installments=2)
    )
    assert [t.transaction_date for t in created] == [date(2026, 8, 31), date(2026, 8, 31)]


def test_parcelada_sem_data_real_dia_1_em_cada_competencia():
    created = _run_create(_create_data(installments=2))
    assert [t.transaction_date for t in created] == [date(2026, 9, 1), date(2026, 10, 1)]


# ---------------------------------------------------------------------------
# Criação — recorrente
# ---------------------------------------------------------------------------


def test_recorrente_propaga_dia_nas_24_ocorrencias():
    created = _run_create(
        _create_data(transaction_date=date(2026, 8, 31), is_recurring=True)
    )
    assert len(created) == 24
    assert created[0].transaction_date == date(2026, 9, 30)
    assert created[1].transaction_date == date(2026, 10, 31)
    # fevereiro/2027 dentro da série (set/2026 + 5 meses)
    assert created[5].transaction_date == date(2027, 2, 28)


def test_recorrente_sem_data_real_dia_1():
    created = _run_create(_create_data(is_recurring=True))
    assert created[0].transaction_date == date(2026, 9, 1)
    assert created[23].transaction_date == date(2028, 8, 1)


# ---------------------------------------------------------------------------
# Update — null reseta para dia 1 da competência
# ---------------------------------------------------------------------------


def _existing_transaction(**kwargs) -> Transaction:
    defaults = dict(
        id=uuid4(),
        card_id=_CARD_ID,
        description="Compra existente",
        amount=Decimal("50.00"),
        type=TransactionType.EXPENSE,
        date=date(2026, 9, 15),
        transaction_date=date(2026, 9, 20),
        created_at=datetime(2026, 9, 15, 10, 0, 0, tzinfo=timezone.utc),
    )
    defaults.update(kwargs)
    return Transaction(**defaults)


def test_update_com_null_reseta_para_dia_1_da_competencia():
    tx = _existing_transaction()
    repo = FakeTransactionRepo(transaction=tx)
    use_case = UpdateTransactionUseCase(
        repo=repo, card_repo=FakeCardRepo(), category_repo=FakeCategoryRepo()
    )

    updated = asyncio.run(
        use_case.execute(tx.id, TransactionUpdate(transaction_date=None), _HOUSEHOLD_ID)
    )

    assert updated.transaction_date == date(2026, 9, 1)


def test_update_com_data_real_explicita_mantem():
    tx = _existing_transaction()
    repo = FakeTransactionRepo(transaction=tx)
    use_case = UpdateTransactionUseCase(
        repo=repo, card_repo=FakeCardRepo(), category_repo=FakeCategoryRepo()
    )

    updated = asyncio.run(
        use_case.execute(
            tx.id, TransactionUpdate(transaction_date=date(2026, 8, 31)), _HOUSEHOLD_ID
        )
    )

    assert updated.transaction_date == date(2026, 8, 31)


def test_update_sem_tocar_no_campo_preserva():
    tx = _existing_transaction()
    repo = FakeTransactionRepo(transaction=tx)
    use_case = UpdateTransactionUseCase(
        repo=repo, card_repo=FakeCardRepo(), category_repo=FakeCategoryRepo()
    )

    updated = asyncio.run(
        use_case.execute(tx.id, TransactionUpdate(description="Nova desc"), _HOUSEHOLD_ID)
    )

    assert updated.transaction_date == date(2026, 9, 20)
