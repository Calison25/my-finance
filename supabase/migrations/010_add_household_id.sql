-- Migration: Add household_id to existing tables
-- Creates a default household for orphan records

-- 1. Default household for existing data
INSERT INTO households (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Household')
ON CONFLICT (id) DO NOTHING;

-- 2. Add household_id columns (nullable first for safe migration)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
ALTER TABLE banks ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

-- 3. Backfill cards with default household
UPDATE cards SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE household_id IS NULL;

-- 4. Cards must always belong to a household
ALTER TABLE cards ALTER COLUMN household_id SET NOT NULL;

-- 5. Banks/categories: only custom ones get household_id
UPDATE banks SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE is_default = false AND household_id IS NULL;

UPDATE categories SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE is_default = false AND household_id IS NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cards_household_id ON cards(household_id);
CREATE INDEX IF NOT EXISTS idx_banks_household_id ON banks(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);
