-- 017: transaction_date passa a ser obrigatorio.
-- Backfill:
--   1) grupos de parcelas com alguma data real: a data real da compra acompanha
--      TODAS as parcelas, exata (comportamento Nubank).
--   2) grupos recorrentes: propaga o DIA da menor data real do grupo para o
--      mes/ano de competencia de cada ocorrencia (clamp no ultimo dia).
--   3) demais linhas sem data real: dia 1 do mes de competencia.

WITH src AS (
    SELECT installment_group_id AS gid, MIN(transaction_date) AS src_date
    FROM transactions
    WHERE installment_group_id IS NOT NULL
      AND transaction_date IS NOT NULL
    GROUP BY installment_group_id
)
UPDATE transactions t
SET transaction_date = s.src_date
FROM src s
WHERE t.installment_group_id = s.gid
  AND t.transaction_date IS NULL;

WITH src AS (
    SELECT recurring_transaction_id AS gid, MIN(transaction_date) AS src_date
    FROM transactions
    WHERE recurring_transaction_id IS NOT NULL
      AND transaction_date IS NOT NULL
    GROUP BY recurring_transaction_id
)
UPDATE transactions t
SET transaction_date = make_date(
        EXTRACT(YEAR FROM t.date)::int,
        EXTRACT(MONTH FROM t.date)::int,
        LEAST(
            EXTRACT(DAY FROM s.src_date)::int,
            EXTRACT(DAY FROM (date_trunc('month', t.date) + interval '1 month - 1 day'))::int
        )
    )
FROM src s
WHERE t.recurring_transaction_id = s.gid
  AND t.transaction_date IS NULL;

UPDATE transactions
SET transaction_date = date_trunc('month', date)::date
WHERE transaction_date IS NULL;

ALTER TABLE transactions
    ALTER COLUMN transaction_date SET NOT NULL;

COMMENT ON COLUMN transactions.transaction_date IS 'Data real do evento (obrigatoria); default: dia 1 do mes de competencia. Parcelas herdam a data real da compra exata; recorrentes propagam o dia da data real para cada competencia com clamp no ultimo dia do mes.';
