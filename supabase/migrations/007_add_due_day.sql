ALTER TABLE cards ADD COLUMN due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31);
