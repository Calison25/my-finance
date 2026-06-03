"""Testes unitários para DeleteTransactionGroupUseCase."""
import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from api.application.use_cases.transaction_use_cases import DeleteTransactionGroupUseCase
from api.domain.entities.transaction import Transaction
from api.domain.exceptions import DomainException, ForbiddenError, NotFoundError
from api.domain.value_objects.transaction_type import TransactionType

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_HOUSEHOLD_ID = uuid4()
_CARD_ID = uuid4()


def _make_transaction(**kwargs) -> Transaction:
    """Constrói uma Transaction com valores-padrão, sobrescrevendo via kwargs."""
    defaults = dict(
        id=uuid4(),
        card_id=_CARD_ID,
        description="Compra qualquer",
        amount=Decimal("100.00"),
        type=TransactionType.EXPENSE,
        date=date(2025, 3, 15),
        created_at=datetime(2025, 3, 15, 10, 0, 0, tzinfo=timezone.utc),
        installment_group_id=None,
        recurring_transaction_id=None,
    )
    defaults.update(kwargs)
    return Transaction(**defaults)


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


class _StubCard:
    """Objeto mínimo que satisfaz o acesso a card.household_id no use case."""

    def __init__(self, household_id: UUID):
        self.household_id = household_id


class FakeCardRepo:
    def __init__(self, household_id: UUID = _HOUSEHOLD_ID):
        self._card = _StubCard(household_id)

    async def get_by_id(self, card_id: UUID):  # noqa: ARG002
        return self._card


class FakeTransactionRepo:
    """Repositório em memória para testes."""

    def __init__(self, transaction: Transaction | None = None, deleted_count: int = 1):
        self._transaction = transaction
        self._deleted_count = deleted_count
        # Registro de chamadas
        self.last_call: str | None = None
        self.last_args: tuple = ()

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None:  # noqa: ARG002
        return self._transaction

    async def delete_installment_group_by_id(
        self, group_id: UUID, from_date: date | None
    ) -> int:
        self.last_call = "delete_installment_group_by_id"
        self.last_args = (group_id, from_date)
        return self._deleted_count

    async def delete_by_recurring_id(
        self, recurring_id: UUID, from_date: date | None
    ) -> int:
        self.last_call = "delete_by_recurring_id"
        self.last_args = (recurring_id, from_date)
        return self._deleted_count

    async def delete_installment_group(
        self, card_id: UUID, base_description: str, from_date: date | None
    ) -> int:
        self.last_call = "delete_installment_group"
        self.last_args = (card_id, base_description, from_date)
        return self._deleted_count


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


def test_deleta_por_installment_group_id():
    """Caso 1: transaction com installment_group_id → chama delete_installment_group_by_id."""
    group_id = uuid4()
    tx = _make_transaction(installment_group_id=group_id)
    repo = FakeTransactionRepo(transaction=tx, deleted_count=3)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="all"))

    assert repo.last_call == "delete_installment_group_by_id"
    assert repo.last_args[0] == group_id
    assert repo.last_args[1] is None  # scope="all" → from_date=None


def test_scope_future_passa_from_date():
    """Caso 2: scope='future' → from_date == transaction.date."""
    group_id = uuid4()
    tx_date = date(2025, 6, 1)
    tx = _make_transaction(installment_group_id=group_id, date=tx_date)
    repo = FakeTransactionRepo(transaction=tx, deleted_count=2)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="future"))

    assert repo.last_args[1] == tx_date


def test_levanta_quando_zero_deletado():
    """Caso 3: deleted_count=0 → DomainException com mensagem esperada."""
    group_id = uuid4()
    tx = _make_transaction(installment_group_id=group_id)
    repo = FakeTransactionRepo(transaction=tx, deleted_count=0)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    with pytest.raises(DomainException, match="Nenhuma transação encontrada"):
        asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="all"))


def test_fallback_descricao_quando_sem_group_id():
    """Caso 4: sem group_id nem recurring_id, descrição com padrão X/Y → delete_installment_group."""
    tx = _make_transaction(
        description="Compra (2/10)",
        installment_group_id=None,
        recurring_transaction_id=None,
    )
    repo = FakeTransactionRepo(transaction=tx, deleted_count=5)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="all"))

    assert repo.last_call == "delete_installment_group"
    _card_id_arg, base_desc_arg, from_date_arg = repo.last_args
    assert base_desc_arg == "Compra"
    assert from_date_arg is None


def test_forbidden_quando_household_diferente():
    """Caso 5: card.household_id != household_id passado → ForbiddenError."""
    tx = _make_transaction(installment_group_id=uuid4())
    repo = FakeTransactionRepo(transaction=tx)
    outro_household = uuid4()
    card_repo = FakeCardRepo(household_id=outro_household)  # household diferente
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    with pytest.raises(ForbiddenError):
        asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="all"))


def test_scope_invalido_levanta_domain_exception():
    """Bônus: scope inválido → DomainException."""
    tx = _make_transaction()
    repo = FakeTransactionRepo(transaction=tx)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    with pytest.raises(DomainException, match="Escopo inválido"):
        asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="invalid"))


def test_not_found_quando_transacao_inexistente():
    """Bônus: get_by_id retorna None → NotFoundError."""
    repo = FakeTransactionRepo(transaction=None)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    with pytest.raises(NotFoundError):
        asyncio.run(use_case.execute(uuid4(), _HOUSEHOLD_ID, scope="all"))


def test_deleta_por_recurring_transaction_id():
    """Bônus: transaction com recurring_transaction_id → chama delete_by_recurring_id."""
    recurring_id = uuid4()
    tx = _make_transaction(
        recurring_transaction_id=recurring_id,
        installment_group_id=None,
    )
    repo = FakeTransactionRepo(transaction=tx, deleted_count=4)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="all"))

    assert repo.last_call == "delete_by_recurring_id"
    assert repo.last_args[0] == recurring_id
    assert repo.last_args[1] is None


def test_descricao_sem_padrao_sem_group_levanta():
    """Bônus: sem group_id, sem recurring_id, sem padrão X/Y → DomainException."""
    tx = _make_transaction(
        description="Compra avulsa",
        installment_group_id=None,
        recurring_transaction_id=None,
    )
    repo = FakeTransactionRepo(transaction=tx)
    card_repo = FakeCardRepo()
    use_case = DeleteTransactionGroupUseCase(repo=repo, card_repo=card_repo)

    with pytest.raises(DomainException, match="não é recorrente nem parcelada"):
        asyncio.run(use_case.execute(tx.id, _HOUSEHOLD_ID, scope="all"))
