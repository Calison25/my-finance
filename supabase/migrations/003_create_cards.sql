CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    bank_id UUID NOT NULL REFERENCES banks(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CHECKING_ACCOUNT', 'CREDIT_CARD')),
    last_digits VARCHAR(4),
    credit_limit DECIMAL(12, 2),
    billing_day INTEGER CHECK (billing_day >= 1 AND billing_day <= 31),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_bank_id ON cards(bank_id);
