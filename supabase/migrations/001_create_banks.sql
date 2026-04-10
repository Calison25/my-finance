CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    logo_url VARCHAR(255),
    color VARCHAR(7) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banks_user_id ON banks(user_id);
CREATE INDEX idx_banks_is_default ON banks(is_default);
