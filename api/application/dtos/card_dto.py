from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from api.domain.value_objects.card_type import CardType


class CardCreate(BaseModel):
    bank_id: UUID | None = None
    custom_bank_name: str | None = Field(default=None, max_length=100)
    name: str = Field(max_length=100)
    type: CardType
    last_digits: str | None = Field(default=None, pattern=r"^\d{1,4}$")
    credit_limit: Decimal | None = Field(default=None, ge=0)
    billing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)

    @model_validator(mode="after")
    def validate_bank(self):
        if self.bank_id is None and not self.custom_bank_name:
            raise ValueError(
                "Informe bank_id ou custom_bank_name"
            )
        return self


class CardUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    last_digits: str | None = Field(default=None, pattern=r"^\d{1,4}$")
    credit_limit: Decimal | None = Field(default=None, ge=0)
    billing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)


class CardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    bank_id: UUID
    household_id: UUID
    name: str
    type: CardType
    last_digits: str | None
    credit_limit: Decimal | None
    billing_day: int | None
    due_day: int | None
    created_at: datetime
