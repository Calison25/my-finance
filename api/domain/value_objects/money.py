from decimal import Decimal

from pydantic import BaseModel, field_validator


class Money(BaseModel):
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def amount_must_be_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Amount must be non-negative")
        return v.quantize(Decimal("0.01"))
