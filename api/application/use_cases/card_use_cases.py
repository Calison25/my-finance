from datetime import UTC, datetime
from uuid import UUID, uuid4

from api.application.dtos.card_dto import CardCreate, CardResponse, CardUpdate
from api.domain.entities.bank import Bank
from api.domain.entities.card import Card
from api.domain.exceptions import NotFoundError
from api.domain.repositories.bank_repository import BankRepository
from api.domain.repositories.card_repository import CardRepository


class ListCardsUseCase:
    def __init__(self, repo: CardRepository):
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[CardResponse]:
        cards = await self._repo.list_by_user(user_id)
        return [CardResponse.model_validate(c, from_attributes=True) for c in cards]


class GetCardUseCase:
    def __init__(self, repo: CardRepository):
        self._repo = repo

    async def execute(self, card_id: UUID) -> CardResponse:
        card = await self._repo.get_by_id(card_id)
        if card is None:
            raise NotFoundError("Card", str(card_id))
        return CardResponse.model_validate(card, from_attributes=True)


class CreateCardUseCase:
    def __init__(self, card_repo: CardRepository, bank_repo: BankRepository):
        self._card_repo = card_repo
        self._bank_repo = bank_repo

    async def execute(self, data: CardCreate, user_id: UUID) -> CardResponse:
        bank_id = data.bank_id
        if bank_id is None:
            bank = Bank(
                id=uuid4(),
                name=data.custom_bank_name,
                color="#6B7280",
                is_default=False,
                user_id=user_id,
            )
            created_bank = await self._bank_repo.create(bank)
            bank_id = created_bank.id

        card = Card(
            id=uuid4(),
            user_id=user_id,
            bank_id=bank_id,
            name=data.name,
            type=data.type,
            last_digits=data.last_digits,
            credit_limit=data.credit_limit,
            billing_day=data.billing_day,
            created_at=datetime.now(UTC),
        )
        created = await self._card_repo.create(card)
        return CardResponse.model_validate(created, from_attributes=True)


class UpdateCardUseCase:
    def __init__(self, repo: CardRepository):
        self._repo = repo

    async def execute(self, card_id: UUID, data: CardUpdate) -> CardResponse:
        card = await self._repo.get_by_id(card_id)
        if card is None:
            raise NotFoundError("Card", str(card_id))
        update_data = data.model_dump(exclude_unset=True)
        updated_card = card.model_copy(update=update_data)
        updated = await self._repo.update(updated_card)
        return CardResponse.model_validate(updated, from_attributes=True)


class DeleteCardUseCase:
    def __init__(self, repo: CardRepository):
        self._repo = repo

    async def execute(self, card_id: UUID) -> None:
        card = await self._repo.get_by_id(card_id)
        if card is None:
            raise NotFoundError("Card", str(card_id))
        await self._repo.delete(card_id)
