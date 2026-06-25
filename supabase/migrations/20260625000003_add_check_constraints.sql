-- SEC-06: CHECK constraints to enforce financial data integrity at DB level
-- These complement client-side validation (validationService.ts) and cannot be bypassed via REST API

-- Transactions: amount must be positive
ALTER TABLE transactions
  ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);

-- Transactions: competence_date must be first day of month (YYYY-MM-01)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_competence_date_first_of_month
  CHECK (competence_date = date_trunc('month', competence_date)::date);

-- Transactions: description cannot be empty
ALTER TABLE transactions
  ADD CONSTRAINT transactions_description_not_empty CHECK (trim(description) != '');

-- Transactions: installment numbers are consistent
ALTER TABLE transactions
  ADD CONSTRAINT transactions_installment_valid
  CHECK (
    (is_installment = false)
    OR (
      is_installment = true
      AND total_installments IS NOT NULL
      AND current_installment IS NOT NULL
      AND current_installment >= 1
      AND current_installment <= total_installments
      AND total_installments > 1
    )
  );

-- transaction_splits: split percentage must be between 0 and 100
ALTER TABLE transaction_splits
  ADD CONSTRAINT splits_percentage_valid CHECK (percentage > 0 AND percentage <= 100);

-- transaction_splits: split amount must be positive
ALTER TABLE transaction_splits
  ADD CONSTRAINT splits_amount_positive CHECK (amount > 0);

-- accounts: balance validation is handled by trigger (SSOT), no CHECK needed here

-- goals: target_amount must be positive
ALTER TABLE goals
  ADD CONSTRAINT goals_target_amount_positive CHECK (target_amount > 0);
