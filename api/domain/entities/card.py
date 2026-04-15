from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from api.domain.value_objects.card_type import CardType


class Card(BaseModel):
    id: UUID
    user_id: UUID
    bank_id: UUID
    household_id: UUID
    name: str
    type: CardType
    last_digits: str | None = None
    credit_limit: Decimal | None = None
    billing_day: int | None = None
    due_day: int | None = None
    created_at: datetime
