from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from api.domain.value_objects.card_type import CardType


class CardCreate(BaseModel):
    bank_id: UUID | None = None
    custom_bank_name: str | None = None
    name: str
    type: CardType
    last_digits: str | None = None
    credit_limit: Decimal | None = None
    billing_day: int | None = None

    @model_validator(mode="after")
    def validate_bank(self):
        if self.bank_id is None and not self.custom_bank_name:
            raise ValueError(
                "Informe bank_id ou custom_bank_name"
            )
        return self


class CardUpdate(BaseModel):
    name: str | None = None
    last_digits: str | None = None
    credit_limit: Decimal | None = None
    billing_day: int | None = None


class CardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    bank_id: UUID
    name: str
    type: CardType
    last_digits: str | None
    credit_limit: Decimal | None
    billing_day: int | None
    created_at: datetime
