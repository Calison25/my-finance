import datetime as dt
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from api.domain.value_objects.transaction_type import TransactionType


class TransactionCreate(BaseModel):
    card_id: UUID
    description: str = Field(max_length=300)
    amount: Decimal = Field(gt=0)
    type: TransactionType
    category_id: UUID | None = None
    custom_category_name: str | None = Field(default=None, max_length=100)
    date: dt.date
    is_scheduled: bool = False
    scheduled_date: dt.date | None = None
    is_recurring: bool = False
    is_bill: bool = False
    notes: str | None = Field(default=None, max_length=1000)
    installments: int | None = Field(default=None, ge=2, le=48)


class TransactionUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=300)
    amount: Decimal | None = Field(default=None, gt=0)
    type: TransactionType | None = None
    category_id: UUID | None = None
    date: dt.date | None = None
    is_scheduled: bool | None = None
    scheduled_date: dt.date | None = None
    is_realized: bool | None = None
    is_recurring: bool | None = None
    is_bill: bool | None = None
    notes: str | None = Field(default=None, max_length=1000)


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    card_id: UUID
    description: str
    amount: Decimal
    type: TransactionType
    category_id: UUID | None
    date: dt.date
    is_scheduled: bool
    scheduled_date: dt.date | None
    is_realized: bool
    is_recurring: bool
    is_bill: bool
    recurring_transaction_id: UUID | None
    notes: str | None
    created_at: dt.datetime
    classification: str | None = None
