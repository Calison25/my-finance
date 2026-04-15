-- ============================================================
-- My Finance - Rollback do Seed de Teste
-- ============================================================
-- Executa:
--   docker exec -i my-finance-db-1 psql -U myfinance -d myfinance < scripts/seed_test_data_rollback.sql
-- ============================================================

BEGIN;

-- Transacoes dependem de cards (CASCADE), entao basta deletar cards
DELETE FROM transactions WHERE card_id IN (
  SELECT id FROM cards WHERE user_id = '51fc729a-817d-4c32-861a-b69866588a84'
);

DELETE FROM cards WHERE user_id = '51fc729a-817d-4c32-861a-b69866588a84';

COMMIT;

DO $$ BEGIN RAISE NOTICE 'Rollback completo. Todos os cards e transacoes de teste foram removidos.'; END $$;
