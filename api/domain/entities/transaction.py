from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from api.domain.value_objects.transaction_type import TransactionType


class Transaction(BaseModel):
    id: UUID
    card_id: UUID
    description: str
    amount: Decimal
    type: TransactionType
    category_id: UUID | None = None
    date: date
    is_scheduled: bool = False
    scheduled_date: date | None = None
    is_realized: bool = False
    is_recurring: bool = False
    recurring_transaction_id: UUID | None = None
    notes: str | None = None
    created_at: datetime
