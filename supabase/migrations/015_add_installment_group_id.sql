-- Adiciona installment_group_id para agrupar parcelas de forma estavel,
-- espelhando recurring_transaction_id. Substitui o agrupamento fragil por
-- string-matching da descricao (description LIKE '... (%/%)').

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE transactions
    ADD COLUMN installment_group_id UUID NULL;

COMMENT ON COLUMN transactions.installment_group_id IS 'Agrupa parcelas do mesmo parcelamento; NULL quando nao parcelada';

-- Backfill: agrupa parcelas existentes por (card_id, descricao base) e atribui
-- um UUID compartilhado por grupo. Base = descricao sem o sufixo " (x/y)",
-- tolerante a multiplos espacos (\s*).
WITH groups AS MATERIALIZED (
    SELECT
        card_id,
        btrim(regexp_replace(description, '\s*\(\d+/\d+\)$', '')) AS base_desc,
        gen_random_uuid() AS group_id
    FROM transactions
    WHERE description ~ '\(\d+/\d+\)$'
    GROUP BY card_id, btrim(regexp_replace(description, '\s*\(\d+/\d+\)$', ''))
)
UPDATE transactions t
SET installment_group_id = g.group_id
FROM groups g
WHERE t.installment_group_id IS NULL
  AND t.description ~ '\(\d+/\d+\)$'
  AND t.card_id = g.card_id
  AND btrim(regexp_replace(t.description, '\s*\(\d+/\d+\)$', '')) = g.base_desc;

CREATE INDEX idx_transactions_installment_group_id
    ON transactions (installment_group_id)
    WHERE installment_group_id IS NOT NULL;
