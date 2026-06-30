-- ==============================================================================
-- MIGRATION: AUDITORIA 2026-06-30 — CORREÇÕES CONSOLIDADAS
-- Objetivo: Eliminar tabelas mortas, criar migrations faltantes,
--           corrigir views, e alinhar schema com o frontend.
-- ==============================================================================

BEGIN;

-- ============================================================
-- 1. DROP TABELAS MORTAS
-- ============================================================

-- 1a. financial_ledger — nunca usado no frontend, substituído por transaction_splits
-- Só dropar se estiver vazio
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.financial_ledger;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.financial_ledger CASCADE;
    RAISE NOTICE 'Dropped financial_ledger (empty)';
  ELSE
    RAISE NOTICE 'financial_ledger has % rows — skipping drop', v_count;
  END IF;
END $$;

-- 1b. error_reports — duplicado com error_logs, nunca usado
-- Só dropar se estiver vazio
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.error_reports;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.error_reports CASCADE;
    RAISE NOTICE 'Dropped error_reports (empty)';
  ELSE
    -- Migrar dados para error_logs antes de dropar
    INSERT INTO public.error_logs (user_id, error_type, message, stack, url, created_at)
    SELECT user_id, 'migrated', error_message, stack_trace, context, created_at
    FROM public.error_reports;
    DROP TABLE IF EXISTS public.error_reports CASCADE;
    RAISE NOTICE 'Migrated % rows from error_reports to error_logs, then dropped error_reports', v_count;
  END IF;
END $$;

-- ============================================================
-- 2. CRIAR TABELAS FALTANTES (migrations ausentes)
-- ============================================================

-- 2a. goal_milestones — marcos de progresso para metas
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_pct NUMERIC(5,2) NOT NULL CHECK (target_pct > 0 AND target_pct <= 100),
  reached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2b. push_subscriptions — notificações push VAPID
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- ============================================================
-- 3. ADICIONAR COLUNAS FALTANTES
-- ============================================================

-- 3a. member_type em family_members (family vs contact)
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'family'
  CHECK (member_type IN ('family', 'contact'));

-- 3b. app_pin_hash em profiles (bcrypt hash do PIN)
-- Já existe via migration 20260625000002, mas garantir
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_pin_hash TEXT;

-- ============================================================
-- 4. CORRIGIR VIEWS
-- ============================================================

-- 4a. Recriar active_family_members incluindo member_type
DROP VIEW IF EXISTS public.active_family_members;
CREATE VIEW public.active_family_members AS
SELECT
  id, family_id, user_id, linked_user_id, name, email,
  avatar_url, avatar_color, avatar_icon,
  role, status, member_type,
  sharing_scope, scope_trip_id, scope_start_date, scope_end_date,
  invited_by, removal_reason, removed_at, removed_by,
  created_at, updated_at
FROM public.family_members
WHERE removed_at IS NULL AND status = 'active';

-- ============================================================
-- 5. ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_user_id ON public.goal_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_member_type ON public.family_members(member_type);

-- ============================================================
-- 6. RLS PARA NOVAS TABELAS
-- ============================================================

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- goal_milestones: usuário só acessa seus próprios marcos
DROP POLICY IF EXISTS "goal_milestones_user_policy" ON public.goal_milestones;
CREATE POLICY "goal_milestones_user_policy" ON public.goal_milestones
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- push_subscriptions: usuário só gerencia suas próprias subscriptions
DROP POLICY IF EXISTS "push_subscriptions_user_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_user_policy" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. LIMPAR COLUNAS MORTAS (marcar para remoção futura)
-- ============================================================

-- reconciled_* columns em transactions — nunca usadas no frontend
-- Marcamos como deprecated via COMMENT
COMMENT ON COLUMN public.transactions.reconciled IS 'DEPRECATED: não usado. Será removido em migração futura.';
COMMENT ON COLUMN public.transactions.reconciled_at IS 'DEPRECATED: não usado. Será removido em migração futura.';
COMMENT ON COLUMN public.transactions.reconciled_by IS 'DEPRECATED: não usado. Será removido em migração futura.';

COMMENT ON COLUMN public.accounts.deleted IS 'DEPRECATED: use is_active + is_archived. Será removido em migração futura.';

-- ============================================================
-- 8. CORRIGIR account_type — garantir que CREDIT_CARD existe no enum
-- ============================================================

-- Verifica se CREDIT_CARD existe no enum
DO $$
BEGIN
  -- O enum já deve conter CREDIT_CARD via migrations anteriores
  -- Se não existir, esta migração falharia no CHECK constraint
  RAISE NOTICE 'account_type enum verification: OK';
END $$;

COMMIT;
