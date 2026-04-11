-- ============================================================
-- My Finance - Rollback do Seed de Teste
-- ============================================================
-- Executa:
--   docker exec -i my-finance-db-1 psql -U myfinance -d myfinance < scripts/seed_test_data_rollback.sql
-- ============================================================

BEGIN;

-- Transacoes dependem de cards (CASCADE), entao basta deletar cards
DELETE FROM transactions WHERE card_id IN (
  SELECT id FROM cards WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

DELETE FROM cards WHERE user_id = '00000000-0000-0000-0000-000000000001';

COMMIT;

DO $$ BEGIN RAISE NOTICE 'Rollback completo. Todos os cards e transacoes de teste foram removidos.'; END $$;
