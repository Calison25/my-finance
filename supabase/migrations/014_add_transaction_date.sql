-- Adiciona transaction_date opcional.
-- A coluna date existente passa a representar o MES DE COMPETENCIA da transacao
-- (a fatura/mes em que ela aparece). transaction_date eh a data real do evento,
-- que pode ser diferente da competencia (ex: gasto ocorreu ha 3 meses, mas esta
-- sendo cobrado neste mes).

ALTER TABLE transactions
    ADD COLUMN transaction_date DATE NULL;

COMMENT ON COLUMN transactions.date IS 'Mes de competencia (fatura) em que a transacao aparece';
COMMENT ON COLUMN transactions.transaction_date IS 'Data real do evento (opcional); quando NULL, assume-se que ocorreu na competencia';
