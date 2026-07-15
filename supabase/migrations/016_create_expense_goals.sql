-- Migration: Meta de despesa por household (valor unico, sem historico por mes)

CREATE TABLE IF NOT EXISTS expense_goals (
    household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expense_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_goals_own_household ON expense_goals;
CREATE POLICY expense_goals_own_household ON expense_goals
    FOR ALL TO authenticated
    USING (household_id = public.current_household_id())
    WITH CHECK (household_id = public.current_household_id());

REVOKE ALL ON expense_goals FROM anon;
