-- =====================================================
-- MIGRATION: Índices Adicionais para Performance
-- Data: 2026-01-01
-- Descrição: Otimizar queries frequentes
-- =====================================================

-- 1. ÍNDICES PARA RELATÓRIOS POR CATEGORIA
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_category_date_expense 
  ON public.transactions(category_id, date DESC) 
  WHERE type = 'EXPENSE' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_category_date_income 
  ON public.transactions(category_id, date DESC) 
  WHERE type = 'INCOME' AND deleted_at IS NULL;

-- 2. ÍNDICES PARA TRANSAÇÕES COMPARTILHADAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_shared_user_date 
  ON public.transactions(user_id, is_shared, date DESC) 
  WHERE is_shared = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_shared_trip 
  ON public.transactions(trip_id, is_shared, date DESC) 
  WHERE is_shared = TRUE AND trip_id IS NOT NULL AND deleted_at IS NULL;

-- 3. ÍNDICES PARA ESPELHOS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_mirrors 
  ON public.transactions(source_transaction_id, user_id) 
  WHERE source_transaction_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_originals_with_mirrors 
  ON public.transactions(id, is_shared) 
  WHERE is_shared = TRUE AND source_transaction_id IS NULL AND deleted_at IS NULL;

-- 4. ÍNDICES PARA ACERTOS PENDENTES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_splits_unsettled_user 
  ON public.transaction_splits(user_id, is_settled) 
  WHERE is_settled = FALSE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_splits_unsettled_transaction 
  ON public.transaction_splits(transaction_id, is_settled) 
  WHERE is_settled = FALSE AND deleted_at IS NULL;

-- 5. ÍNDICES PARA PARCELAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_installments_series 
  ON public.transactions(series_id, current_installment, competence_date) 
  WHERE is_installment = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_installments_user 
  ON public.transactions(user_id, is_installment, competence_date) 
  WHERE is_installment = TRUE AND deleted_at IS NULL;

-- 6. ÍNDICES PARA VIAGENS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_trip_date 
  ON public.transactions(trip_id, date DESC) 
  WHERE trip_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_members_user 
  ON public.trip_members(user_id, trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee 
  ON public.trip_invitations(invitee_id, status) 
  WHERE status = 'pending';

-- 7. ÍNDICES PARA LEDGER
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ledger_user_related_unsettled 
  ON public.financial_ledger(user_id, related_user_id, is_settled) 
  WHERE is_settled = FALSE;

CREATE INDEX IF NOT EXISTS idx_ledger_currency 
  ON public.financial_ledger(currency, user_id) 
  WHERE is_settled = FALSE;

-- 8. ÍNDICES PARA CONTAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_active 
  ON public.accounts(user_id, is_active) 
  WHERE is_active = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_type 
  ON public.accounts(user_id, type) 
  WHERE deleted_at IS NULL;

-- 9. ÍNDICES PARA NOTIFICAÇÕES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_type_user 
  ON public.notifications(type, user_id, created_at DESC);

-- 10. ÍNDICES PARA FAMÍLIA
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_family_members_user_active 
  ON public.family_members(user_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_family_members_family_active 
  ON public.family_members(family_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_family_invitations_pending 
  ON public.family_invitations(to_user_id, status) 
  WHERE status = 'pending';

-- 11. ÍNDICES COMPOSTOS PARA QUERIES COMPLEXAS
-- =====================================================

-- Para dashboard: transações recentes por tipo
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
  ON public.transactions(user_id, type, date DESC) 
  WHERE deleted_at IS NULL;

-- Para relatórios mensais
CREATE INDEX IF NOT EXISTS idx_transactions_user_competence 
  ON public.transactions(user_id, competence_date DESC) 
  WHERE deleted_at IS NULL;

-- Para busca de transações por valor
CREATE INDEX IF NOT EXISTS idx_transactions_user_amount 
  ON public.transactions(user_id, amount DESC) 
  WHERE deleted_at IS NULL;

-- 12. ÍNDICES PARA AUDIT LOG
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_table_action 
  ON public.audit_log(table_name, action, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_recent 
  ON public.audit_log(changed_by, changed_at DESC);

-- 13. ESTATÍSTICAS
-- =====================================================

-- Atualizar estatísticas para melhor planejamento de queries
ANALYZE public.transactions;
ANALYZE public.transaction_splits;
ANALYZE public.accounts;
ANALYZE public.financial_ledger;
ANALYZE public.trips;
ANALYZE public.family_members;

-- 14. COMENTÁRIOS
-- =====================================================

COMMENT ON INDEX idx_transactions_category_date_expense IS 
  'Otimiza relatórios de despesas por categoria';

COMMENT ON INDEX idx_transactions_shared_user_date IS 
  'Otimiza busca de transações compartilhadas';

COMMENT ON INDEX idx_splits_unsettled_user IS 
  'Otimiza busca de acertos pendentes';

COMMENT ON INDEX idx_transactions_installments_series IS 
  'Otimiza busca de parcelas por série';

COMMENT ON INDEX idx_ledger_user_related_unsettled IS 
  'Otimiza cálculo de saldos entre usuários';

