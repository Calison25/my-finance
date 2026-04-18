-- Fix legacy installments: parcelas >=2 foram criadas com is_scheduled=TRUE
-- mesmo quando a transação original não era agendada.
-- Regra: se qualquer parcela do mesmo grupo já está como não-agendada/realizada,
-- considera o grupo inteiro como não-agendado e corrige as demais.

UPDATE transactions AS t
SET is_scheduled = FALSE,
    is_realized = TRUE,
    scheduled_date = NULL
FROM transactions AS other
WHERE t.description ~ ' \(\d+/\d+\)$'
  AND other.description ~ ' \(\d+/\d+\)$'
  AND other.card_id = t.card_id
  AND regexp_replace(other.description, ' \(\d+/\d+\)$', '') = regexp_replace(t.description, ' \(\d+/\d+\)$', '')
  AND other.is_scheduled = FALSE
  AND other.is_realized = TRUE
  AND t.is_scheduled = TRUE
  AND t.id <> other.id;
