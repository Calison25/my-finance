ALTER TABLE transactions
  ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN recurring_transaction_id UUID NULL;

CREATE INDEX idx_transactions_recurring_id
  ON transactions(recurring_transaction_id)
  WHERE recurring_transaction_id IS NOT NULL;
