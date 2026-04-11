-- ============================================================
-- My Finance - Seed de Teste (Carga Completa)
-- ============================================================
-- Para executar:
--   docker exec -i my-finance-db-1 psql -U myfinance -d myfinance < scripts/seed_test_data.sql
--
-- Para reverter:
--   docker exec -i my-finance-db-1 psql -U myfinance -d myfinance < scripts/seed_test_data_rollback.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. IDs fixos dos bancos e categorias (do seed original 005)
-- ============================================================

-- Buscar IDs dos bancos
DO $$
DECLARE
  v_nubank_id UUID;
  v_inter_id UUID;
  v_itau_id UUID;
  v_c6_id UUID;
  v_bradesco_id UUID;

  v_cat_alimentacao UUID;
  v_cat_transporte UUID;
  v_cat_moradia UUID;
  v_cat_saude UUID;
  v_cat_educacao UUID;
  v_cat_lazer UUID;
  v_cat_compras UUID;
  v_cat_servicos UUID;
  v_cat_salario UUID;
  v_cat_outros UUID;

  -- Cards (contas e cartoes)
  v_nubank_cc UUID := uuid_generate_v4();
  v_nubank_credito UUID := uuid_generate_v4();
  v_inter_cc UUID := uuid_generate_v4();
  v_inter_credito UUID := uuid_generate_v4();
  v_itau_cc UUID := uuid_generate_v4();
  v_itau_credito UUID := uuid_generate_v4();
  v_c6_credito UUID := uuid_generate_v4();

  -- Recurring IDs
  v_rec_salario_nubank UUID := uuid_generate_v4();
  v_rec_salario_inter UUID := uuid_generate_v4();
  v_rec_aluguel UUID := uuid_generate_v4();
  v_rec_internet UUID := uuid_generate_v4();
  v_rec_academia UUID := uuid_generate_v4();
  v_rec_streaming UUID := uuid_generate_v4();
  v_rec_plano_saude UUID := uuid_generate_v4();
  v_rec_seguro_auto UUID := uuid_generate_v4();
  v_rec_condominio UUID := uuid_generate_v4();
  v_rec_energia UUID := uuid_generate_v4();

  -- Installment IDs
  v_inst_iphone UUID := uuid_generate_v4();
  v_inst_notebook UUID := uuid_generate_v4();
  v_inst_curso UUID := uuid_generate_v4();
  v_inst_geladeira UUID := uuid_generate_v4();
  v_inst_sofa UUID := uuid_generate_v4();

  i INTEGER;
  v_date DATE;
  v_today DATE := CURRENT_DATE;
  v_month_start DATE;

BEGIN

  -- Buscar bancos
  SELECT id INTO v_nubank_id FROM banks WHERE code = '260' LIMIT 1;
  SELECT id INTO v_inter_id FROM banks WHERE code = '077' LIMIT 1;
  SELECT id INTO v_itau_id FROM banks WHERE code = '341' LIMIT 1;
  SELECT id INTO v_c6_id FROM banks WHERE code = '336' LIMIT 1;
  SELECT id INTO v_bradesco_id FROM banks WHERE code = '237' AND name = 'Bradesco' LIMIT 1;

  -- Buscar categorias
  SELECT id INTO v_cat_alimentacao FROM categories WHERE name = 'Alimentacao' LIMIT 1;
  SELECT id INTO v_cat_transporte FROM categories WHERE name = 'Transporte' LIMIT 1;
  SELECT id INTO v_cat_moradia FROM categories WHERE name = 'Moradia' LIMIT 1;
  SELECT id INTO v_cat_saude FROM categories WHERE name = 'Saude' LIMIT 1;
  SELECT id INTO v_cat_educacao FROM categories WHERE name = 'Educacao' LIMIT 1;
  SELECT id INTO v_cat_lazer FROM categories WHERE name = 'Lazer' LIMIT 1;
  SELECT id INTO v_cat_compras FROM categories WHERE name = 'Compras' LIMIT 1;
  SELECT id INTO v_cat_servicos FROM categories WHERE name = 'Servicos' LIMIT 1;
  SELECT id INTO v_cat_salario FROM categories WHERE name = 'Salario' LIMIT 1;
  SELECT id INTO v_cat_outros FROM categories WHERE name = 'Outros' LIMIT 1;

  -- ============================================================
  -- 2. CARDS (3 contas correntes + 4 cartoes de credito)
  -- ============================================================

  INSERT INTO cards (id, user_id, bank_id, name, type, last_digits, credit_limit, billing_day, due_day) VALUES
    -- Contas correntes
    (v_nubank_cc,      '00000000-0000-0000-0000-000000000001', v_nubank_id, 'Conta Nubank',       'CHECKING_ACCOUNT', '8742', NULL, NULL, NULL),
    (v_inter_cc,       '00000000-0000-0000-0000-000000000001', v_inter_id,  'Conta Inter',        'CHECKING_ACCOUNT', '3021', NULL, NULL, NULL),
    (v_itau_cc,        '00000000-0000-0000-0000-000000000001', v_itau_id,   'Conta Itau Salario', 'CHECKING_ACCOUNT', '5590', NULL, NULL, NULL),
    -- Cartoes de credito (billing_day = fechamento, due_day = vencimento)
    (v_nubank_credito, '00000000-0000-0000-0000-000000000001', v_nubank_id, 'Nubank Platinum',    'CREDIT_CARD', '4455', 12000.00, 10, 17),
    (v_inter_credito,  '00000000-0000-0000-0000-000000000001', v_inter_id,  'Inter Gold',         'CREDIT_CARD', '7823', 8000.00, 15, 22),
    (v_itau_credito,   '00000000-0000-0000-0000-000000000001', v_itau_id,   'Itau Click',         'CREDIT_CARD', '1190', 5000.00, 5, 12),
    (v_c6_credito,     '00000000-0000-0000-0000-000000000001', v_c6_id,     'C6 Carbon',          'CREDIT_CARD', '6677', 15000.00, 20, 27);

  -- ============================================================
  -- 3. TRANSACOES RECORRENTES (24 meses cada)
  -- ============================================================

  -- Salario Nubank - R$ 8.500 (receita recorrente)
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 4;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_nubank_cc, 'Salario - Empresa Tech', 8500.00, 'INCOME', v_cat_salario, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_salario_nubank, TRUE);
  END LOOP;

  -- Freelance Inter - R$ 3.200 (receita recorrente)
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 14;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_inter_cc, 'Freelance - Consultoria', 3200.00, 'INCOME', v_cat_salario, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_salario_inter, TRUE);
  END LOOP;

  -- Aluguel - R$ 2.800
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 9;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_nubank_cc, 'Aluguel Apartamento', 2800.00, 'EXPENSE', v_cat_moradia, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_aluguel, TRUE);
  END LOOP;

  -- Condominio - R$ 650
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 9;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_nubank_cc, 'Condominio', 650.00, 'EXPENSE', v_cat_moradia, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_condominio, TRUE);
  END LOOP;

  -- Internet - R$ 149,90
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 19;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_inter_cc, 'Vivo Fibra 600MB', 149.90, 'EXPENSE', v_cat_servicos, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_internet, TRUE);
  END LOOP;

  -- Energia - R$ 280 (varia, mas seed fixo)
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 21;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_nubank_cc, 'Conta de Energia', 280.00, 'EXPENSE', v_cat_moradia, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_energia, TRUE);
  END LOOP;

  -- Academia - R$ 129,90
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_nubank_credito, 'Smart Fit Mensal', 129.90, 'EXPENSE', v_cat_saude, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_academia, TRUE);
  END LOOP;

  -- Streaming (Netflix+Spotify) - R$ 89,80
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 4;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_nubank_credito, 'Netflix + Spotify', 89.80, 'EXPENSE', v_cat_lazer, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_streaming, TRUE);
  END LOOP;

  -- Plano de Saude - R$ 520
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 14;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_inter_cc, 'Unimed Plano Saude', 520.00, 'EXPENSE', v_cat_saude, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_plano_saude, TRUE);
  END LOOP;

  -- Seguro Auto - R$ 189,90
  FOR i IN 0..23 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 24;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, is_recurring, recurring_transaction_id, is_bill)
    VALUES (v_itau_cc, 'Porto Seguro Auto', 189.90, 'EXPENSE', v_cat_servicos, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            TRUE, v_rec_seguro_auto, TRUE);
  END LOOP;

  -- ============================================================
  -- 4. COMPRAS PARCELADAS (cartoes de credito)
  -- ============================================================

  -- iPhone 15 Pro - 12x R$ 749,92 no Nubank (comecou 2 meses atras)
  FOR i IN 0..11 LOOP
    v_date := (date_trunc('month', v_today) + ((i - 2) || ' months')::interval)::date + 7;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, notes)
    VALUES (v_nubank_credito, 'iPhone 15 Pro (' || (i+1) || '/12)', 749.92, 'EXPENSE', v_cat_compras, v_date,
            CASE WHEN i < 2 THEN FALSE ELSE TRUE END,
            CASE WHEN i < 2 THEN TRUE ELSE FALSE END,
            'Apple Store - parcelado');
  END LOOP;

  -- Notebook Dell - 10x R$ 879,90 no Inter (comecou 1 mes atras)
  FOR i IN 0..9 LOOP
    v_date := (date_trunc('month', v_today) + ((i - 1) || ' months')::interval)::date + 11;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, notes)
    VALUES (v_inter_credito, 'Notebook Dell Inspiron (' || (i+1) || '/10)', 879.90, 'EXPENSE', v_cat_compras, v_date,
            CASE WHEN i < 1 THEN FALSE ELSE TRUE END,
            CASE WHEN i < 1 THEN TRUE ELSE FALSE END,
            'Dell Store - parcelado');
  END LOOP;

  -- Curso Alura Anual - 6x R$ 166,50 no Nubank (comecou mes atual)
  FOR i IN 0..5 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 2;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, notes)
    VALUES (v_nubank_credito, 'Alura Anual (' || (i+1) || '/6)', 166.50, 'EXPENSE', v_cat_educacao, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            'Plataforma de cursos');
  END LOOP;

  -- Geladeira Brastemp - 8x R$ 437,38 no Itau (comecou 3 meses atras)
  FOR i IN 0..7 LOOP
    v_date := (date_trunc('month', v_today) + ((i - 3) || ' months')::interval)::date + 16;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, notes)
    VALUES (v_itau_credito, 'Geladeira Brastemp Frost Free (' || (i+1) || '/8)', 437.38, 'EXPENSE', v_cat_compras, v_date,
            CASE WHEN i < 3 THEN FALSE ELSE TRUE END,
            CASE WHEN i < 3 THEN TRUE ELSE FALSE END,
            'Magazine Luiza');
  END LOOP;

  -- Sofa Retratil - 5x R$ 599,80 no C6 (comecou mes atual)
  FOR i IN 0..4 LOOP
    v_date := (date_trunc('month', v_today) + (i || ' months')::interval)::date + 8;
    INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized, notes)
    VALUES (v_c6_credito, 'Sofa Retratil 3 Lugares (' || (i+1) || '/5)', 599.80, 'EXPENSE', v_cat_compras, v_date,
            CASE WHEN i = 0 AND v_date <= v_today THEN FALSE ELSE TRUE END,
            CASE WHEN i = 0 AND v_date <= v_today THEN TRUE ELSE FALSE END,
            'Tok&Stok');
  END LOOP;

  -- ============================================================
  -- 5. TRANSACOES AVULSAS - MES ATUAL (realizadas)
  -- ============================================================

  -- Despesas do dia a dia - conta corrente Nubank
  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized) VALUES
    (v_nubank_cc, 'Supermercado Extra', 387.42, 'EXPENSE', v_cat_alimentacao, date_trunc('month', v_today)::date + 1, FALSE, TRUE),
    (v_nubank_cc, 'Posto Shell - Gasolina', 250.00, 'EXPENSE', v_cat_transporte, date_trunc('month', v_today)::date + 2, FALSE, TRUE),
    (v_nubank_cc, 'Farmacia Pacheco', 87.50, 'EXPENSE', v_cat_saude, date_trunc('month', v_today)::date + 3, FALSE, TRUE),
    (v_nubank_cc, 'Uber - Semana', 145.30, 'EXPENSE', v_cat_transporte, date_trunc('month', v_today)::date + 3, FALSE, TRUE),
    (v_nubank_cc, 'PIX - Devolucao amigo', 150.00, 'INCOME', v_cat_outros, date_trunc('month', v_today)::date + 4, FALSE, TRUE),
    (v_nubank_cc, 'Padaria Bella Vista', 42.80, 'EXPENSE', v_cat_alimentacao, date_trunc('month', v_today)::date + 5, FALSE, TRUE),
    (v_nubank_cc, 'Estacionamento Shopping', 25.00, 'EXPENSE', v_cat_transporte, date_trunc('month', v_today)::date + 6, FALSE, TRUE);

  -- Despesas do dia a dia - conta corrente Inter
  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized) VALUES
    (v_inter_cc, 'Mercado Livre - Fones', 189.90, 'EXPENSE', v_cat_compras, date_trunc('month', v_today)::date + 2, FALSE, TRUE),
    (v_inter_cc, 'iFood - Semana', 156.70, 'EXPENSE', v_cat_alimentacao, date_trunc('month', v_today)::date + 4, FALSE, TRUE),
    (v_inter_cc, 'Rendimento CDB', 45.32, 'INCOME', v_cat_outros, date_trunc('month', v_today)::date + 1, FALSE, TRUE);

  -- Despesas do dia a dia - conta Itau
  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized) VALUES
    (v_itau_cc, 'Transferencia recebida', 500.00, 'INCOME', v_cat_outros, date_trunc('month', v_today)::date + 6, FALSE, TRUE),
    (v_itau_cc, 'IPVA 2026 - Cota unica', 1850.00, 'EXPENSE', v_cat_servicos, date_trunc('month', v_today)::date + 3, FALSE, TRUE);

  -- Compras no cartao de credito - avulsas mes atual
  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized) VALUES
    (v_nubank_credito, 'Restaurante Outback', 187.40, 'EXPENSE', v_cat_alimentacao, date_trunc('month', v_today)::date + 1, FALSE, TRUE),
    (v_nubank_credito, 'Amazon - Livro Clean Code', 69.90, 'EXPENSE', v_cat_educacao, date_trunc('month', v_today)::date + 2, FALSE, TRUE),
    (v_nubank_credito, 'Zara - Roupas', 459.80, 'EXPENSE', v_cat_compras, date_trunc('month', v_today)::date + 5, FALSE, TRUE),
    (v_nubank_credito, 'Posto Ipiranga', 220.00, 'EXPENSE', v_cat_transporte, date_trunc('month', v_today)::date + 7, FALSE, TRUE),
    (v_inter_credito, 'Drogasil - Remedios', 134.50, 'EXPENSE', v_cat_saude, date_trunc('month', v_today)::date + 3, FALSE, TRUE),
    (v_inter_credito, 'Cinema Cinemark', 89.00, 'EXPENSE', v_cat_lazer, date_trunc('month', v_today)::date + 6, FALSE, TRUE),
    (v_inter_credito, 'Renner - Calcados', 279.90, 'EXPENSE', v_cat_compras, date_trunc('month', v_today)::date + 8, FALSE, TRUE),
    (v_itau_credito, 'Supermercado Pao de Acucar', 412.35, 'EXPENSE', v_cat_alimentacao, date_trunc('month', v_today)::date + 2, FALSE, TRUE),
    (v_itau_credito, 'Pet Shop Cobasi', 156.00, 'EXPENSE', v_cat_outros, date_trunc('month', v_today)::date + 4, FALSE, TRUE),
    (v_c6_credito, 'Steam - Jogos', 199.90, 'EXPENSE', v_cat_lazer, date_trunc('month', v_today)::date + 1, FALSE, TRUE),
    (v_c6_credito, 'Livraria Cultura', 87.50, 'EXPENSE', v_cat_educacao, date_trunc('month', v_today)::date + 3, FALSE, TRUE),
    (v_c6_credito, 'Decathlon - Equipamento', 345.00, 'EXPENSE', v_cat_lazer, date_trunc('month', v_today)::date + 7, FALSE, TRUE);

  -- ============================================================
  -- 6. TRANSACOES AGENDADAS (futuras, mes atual)
  -- ============================================================

  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, scheduled_date, is_realized) VALUES
    (v_nubank_cc, 'Dentista - Consulta', 350.00, 'EXPENSE', v_cat_saude, date_trunc('month', v_today)::date + 25, TRUE, date_trunc('month', v_today)::date + 25, FALSE),
    (v_nubank_cc, 'Presente aniversario mae', 200.00, 'EXPENSE', v_cat_compras, date_trunc('month', v_today)::date + 22, TRUE, date_trunc('month', v_today)::date + 22, FALSE),
    (v_inter_cc, 'Mecanico - Revisao carro', 800.00, 'EXPENSE', v_cat_servicos, date_trunc('month', v_today)::date + 27, TRUE, date_trunc('month', v_today)::date + 27, FALSE),
    (v_nubank_credito, 'Jantar aniversario', 350.00, 'EXPENSE', v_cat_alimentacao, date_trunc('month', v_today)::date + 20, TRUE, date_trunc('month', v_today)::date + 20, FALSE),
    (v_c6_credito, 'Passagem aerea - Viagem', 1200.00, 'EXPENSE', v_cat_lazer, date_trunc('month', v_today)::date + 28, TRUE, date_trunc('month', v_today)::date + 28, FALSE);

  -- ============================================================
  -- 7. TRANSACOES DO MES PASSADO (historico, todas realizadas)
  -- ============================================================

  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized) VALUES
    (v_nubank_cc, 'Supermercado Carrefour', 523.17, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '1 month')::date + 3, FALSE, TRUE),
    (v_nubank_cc, 'Posto BR - Gasolina', 230.00, 'EXPENSE', v_cat_transporte, (date_trunc('month', v_today) - interval '1 month')::date + 5, FALSE, TRUE),
    (v_nubank_cc, 'Uber - Semana', 98.70, 'EXPENSE', v_cat_transporte, (date_trunc('month', v_today) - interval '1 month')::date + 8, FALSE, TRUE),
    (v_nubank_cc, 'Restaurante Madero', 165.40, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '1 month')::date + 12, FALSE, TRUE),
    (v_nubank_cc, 'Farmacia Drogasil', 63.20, 'EXPENSE', v_cat_saude, (date_trunc('month', v_today) - interval '1 month')::date + 15, FALSE, TRUE),
    (v_inter_cc, 'iFood - Semana', 203.40, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '1 month')::date + 6, FALSE, TRUE),
    (v_inter_cc, 'Mercado Livre - Cabo USB', 34.90, 'EXPENSE', v_cat_compras, (date_trunc('month', v_today) - interval '1 month')::date + 10, FALSE, TRUE),
    (v_inter_cc, 'Rendimento CDB', 38.76, 'INCOME', v_cat_outros, (date_trunc('month', v_today) - interval '1 month')::date + 1, FALSE, TRUE),
    (v_itau_cc, 'Oficina mecanica', 450.00, 'EXPENSE', v_cat_servicos, (date_trunc('month', v_today) - interval '1 month')::date + 14, FALSE, TRUE),
    (v_nubank_credito, 'Shopping Iguatemi - Roupas', 380.00, 'EXPENSE', v_cat_compras, (date_trunc('month', v_today) - interval '1 month')::date + 2, FALSE, TRUE),
    (v_nubank_credito, 'Mercado Municipal', 95.60, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '1 month')::date + 9, FALSE, TRUE),
    (v_inter_credito, 'Posto Shell', 200.00, 'EXPENSE', v_cat_transporte, (date_trunc('month', v_today) - interval '1 month')::date + 7, FALSE, TRUE),
    (v_inter_credito, 'Burguer King', 67.80, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '1 month')::date + 11, FALSE, TRUE),
    (v_c6_credito, 'PlayStation Store', 249.90, 'EXPENSE', v_cat_lazer, (date_trunc('month', v_today) - interval '1 month')::date + 4, FALSE, TRUE),
    (v_c6_credito, 'Uber Eats', 78.50, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '1 month')::date + 13, FALSE, TRUE);

  -- ============================================================
  -- 8. TRANSACOES DE 2 MESES ATRAS (mais historico)
  -- ============================================================

  INSERT INTO transactions (card_id, description, amount, type, category_id, date, is_scheduled, is_realized) VALUES
    (v_nubank_cc, 'Supermercado Extra', 445.80, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '2 months')::date + 4, FALSE, TRUE),
    (v_nubank_cc, 'Posto Ipiranga', 210.00, 'EXPENSE', v_cat_transporte, (date_trunc('month', v_today) - interval '2 months')::date + 9, FALSE, TRUE),
    (v_nubank_cc, 'Consulta medica', 320.00, 'EXPENSE', v_cat_saude, (date_trunc('month', v_today) - interval '2 months')::date + 16, FALSE, TRUE),
    (v_inter_cc, 'iFood', 178.30, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '2 months')::date + 7, FALSE, TRUE),
    (v_inter_cc, 'Rendimento CDB', 41.18, 'INCOME', v_cat_outros, (date_trunc('month', v_today) - interval '2 months')::date + 1, FALSE, TRUE),
    (v_nubank_credito, 'Centauro - Tenis corrida', 599.90, 'EXPENSE', v_cat_compras, (date_trunc('month', v_today) - interval '2 months')::date + 5, FALSE, TRUE),
    (v_nubank_credito, 'Churrascaria Fogo de Chao', 289.00, 'EXPENSE', v_cat_alimentacao, (date_trunc('month', v_today) - interval '2 months')::date + 18, FALSE, TRUE),
    (v_c6_credito, 'Ingresso Rock in Rio', 795.00, 'EXPENSE', v_cat_lazer, (date_trunc('month', v_today) - interval '2 months')::date + 3, FALSE, TRUE);

  RAISE NOTICE '=== SEED COMPLETO ===';
  RAISE NOTICE 'Cards criados: 7 (3 contas + 4 cartoes)';
  RAISE NOTICE 'Transacoes recorrentes: 10 tipos x 24 meses = 240';
  RAISE NOTICE 'Parcelas: 5 compras = ~41 transacoes';
  RAISE NOTICE 'Avulsas mes atual: ~24';
  RAISE NOTICE 'Agendadas: 5';
  RAISE NOTICE 'Historico (1 e 2 meses atras): ~23';

END $$;

COMMIT;
