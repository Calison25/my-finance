-- Migration: Habilita Row Level Security (RLS) em todas as tabelas com dados
-- sensiveis e cria policies baseadas no household do usuario autenticado.
--
-- Contexto:
--   - O backend (FastAPI) conecta via asyncpg com a role do banco (postgres/
--     service_role) e BYPASSA RLS - a logica de autorizacao fica 100% no
--     backend, como ja e hoje.
--   - O frontend expoe a VITE_SUPABASE_ANON_KEY publicamente. Sem RLS, qualquer
--     um com essa chave acessaria /rest/v1/* diretamente. Com RLS, a anon_key
--     e a JWT "authenticated" so enxergam o que as policies permitirem.
--
-- Dependencias:
--   - Tabelas criadas nas migrations 001..011
--   - Coluna households_id adicionada na 010
--   - `auth.uid()` e `auth.jwt()` disponibilizados pelo Supabase

-- ============================================================================
-- Helper: resolve o household_id do usuario autenticado (cacheavel por query)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT household_id FROM public.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_household_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_household_id() TO authenticated;

-- ============================================================================
-- HOUSEHOLDS
-- ============================================================================
-- NOTA: NAO usamos FORCE ROW LEVEL SECURITY porque o backend conecta como
-- owner/service_role e precisa continuar bypassando RLS. As policies valem
-- apenas para os roles `anon` e `authenticated` (acesso via PostgREST/anon key).
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS households_select_own ON households;
CREATE POLICY households_select_own ON households
    FOR SELECT TO authenticated
    USING (id = public.current_household_id());

-- Inserts/updates/deletes de households ficam a cargo do backend (service_role).

-- ============================================================================
-- USERS
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_household ON users;
CREATE POLICY users_select_own_household ON users
    FOR SELECT TO authenticated
    USING (household_id = public.current_household_id());

-- Sem INSERT/UPDATE/DELETE via anon/authenticated: provisioning e via backend.

-- ============================================================================
-- HOUSEHOLD_INVITES
-- ============================================================================
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invites_select_own_household ON household_invites;
CREATE POLICY invites_select_own_household ON household_invites
    FOR SELECT TO authenticated
    USING (
        household_id = public.current_household_id()
        OR invited_email = (auth.jwt() ->> 'email')
    );

-- ============================================================================
-- BANKS
-- ============================================================================
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS banks_select_default_or_own ON banks;
CREATE POLICY banks_select_default_or_own ON banks
    FOR SELECT TO authenticated
    USING (
        is_default = TRUE
        OR household_id = public.current_household_id()
    );

DROP POLICY IF EXISTS banks_modify_own ON banks;
CREATE POLICY banks_modify_own ON banks
    FOR ALL TO authenticated
    USING (
        is_default = FALSE
        AND household_id = public.current_household_id()
    )
    WITH CHECK (
        is_default = FALSE
        AND household_id = public.current_household_id()
    );

-- ============================================================================
-- CATEGORIES
-- ============================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select_default_or_own ON categories;
CREATE POLICY categories_select_default_or_own ON categories
    FOR SELECT TO authenticated
    USING (
        is_default = TRUE
        OR household_id = public.current_household_id()
    );

DROP POLICY IF EXISTS categories_modify_own ON categories;
CREATE POLICY categories_modify_own ON categories
    FOR ALL TO authenticated
    USING (
        is_default = FALSE
        AND household_id = public.current_household_id()
    )
    WITH CHECK (
        is_default = FALSE
        AND household_id = public.current_household_id()
    );

-- ============================================================================
-- CARDS
-- ============================================================================
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cards_own_household ON cards;
CREATE POLICY cards_own_household ON cards
    FOR ALL TO authenticated
    USING (household_id = public.current_household_id())
    WITH CHECK (household_id = public.current_household_id());

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_own_household ON transactions;
CREATE POLICY transactions_own_household ON transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cards
            WHERE cards.id = transactions.card_id
              AND cards.household_id = public.current_household_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards
            WHERE cards.id = transactions.card_id
              AND cards.household_id = public.current_household_id()
        )
    );

-- ============================================================================
-- Revogar acesso amplo a anon (nao autenticado nao le nada sensivel)
-- ============================================================================
REVOKE ALL ON households, users, household_invites, cards, transactions FROM anon;
-- banks/categories: mantemos SELECT para anon NAO, pois a app sempre exige login.
REVOKE ALL ON banks, categories FROM anon;
