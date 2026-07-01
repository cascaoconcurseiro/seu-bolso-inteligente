-- ============================================================================
-- MIGRATION: Cleanup & Organization — Database Professionalization
-- Date: 2026-07-01
-- ============================================================================
-- 1. Add missing balance triggers (CRITICAL BUG: insert/delete não atualizavam saldo)
-- 2. Drop orphan trigger functions (6 funções sem trigger ativo)
-- 3. Add cron job for audit_log cleanup
-- 4. Drop duplicate cleanup_old_audit_logs() (no-param, replaced by clean_old_audit_logs(int))
-- 5. Document remaining known duplicates (low priority, não quebram nada)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: CRITICAL — Recriar funções de balance + triggers
-- ============================================================================
-- update_account_balance_on_insert() e update_account_balance_on_delete()
-- NÃO existem no remote (foram perdidas ou nunca criadas).
-- Apenas update_account_balance_on_update() + recalculate_account_balance() existem.
-- Isso significa que INSERT e DELETE em transactions NÃO atualizavam saldo.
-- Recriamos as funções e triggers agora.

-- 1a. Função para INSERT
CREATE OR REPLACE FUNCTION public.update_account_balance_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.account_id IS NOT NULL
     AND (NEW.payer_id IS NULL OR NEW.payer_id = (SELECT id FROM family_members WHERE user_id = NEW.user_id LIMIT 1))
     AND NEW.date <= CURRENT_DATE THEN

    IF NEW.type = 'EXPENSE' THEN
      UPDATE accounts SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'INCOME' THEN
      UPDATE accounts SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'TRANSFER' THEN
      UPDATE accounts SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
      IF NEW.destination_account_id IS NOT NULL THEN
        UPDATE accounts SET balance = balance + NEW.amount, updated_at = NOW()
        WHERE id = NEW.destination_account_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 1b. Função para DELETE
CREATE OR REPLACE FUNCTION public.update_account_balance_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.account_id IS NOT NULL
     AND (OLD.payer_id IS NULL OR OLD.payer_id = (SELECT id FROM family_members WHERE user_id = OLD.user_id LIMIT 1))
     AND OLD.date <= CURRENT_DATE THEN

    IF OLD.type = 'EXPENSE' THEN
      UPDATE accounts SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'INCOME' THEN
      UPDATE accounts SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'TRANSFER' THEN
      UPDATE accounts SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
      IF OLD.destination_account_id IS NOT NULL THEN
        UPDATE accounts SET balance = balance - OLD.amount, updated_at = NOW()
        WHERE id = OLD.destination_account_id;
      END IF;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- 1c. Triggers (idempotentes)
DROP TRIGGER IF EXISTS trg_update_balance_insert ON public.transactions;
CREATE TRIGGER trg_update_balance_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance_on_insert();

DROP TRIGGER IF EXISTS trg_update_balance_delete ON public.transactions;
CREATE TRIGGER trg_update_balance_delete
  AFTER DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance_on_delete();

-- ============================================================================
-- PHASE 2: Drop orphan trigger functions
-- ============================================================================

-- 2.1 calculate_account_balance() — no-param trigger version
-- Substituída por recalculate_account_balance(p_account_id UUID)
-- NENHUM trigger ativo referencia esta função
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'calculate_account_balance'
      AND pronargs = 0
      AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP FUNCTION public.calculate_account_balance();
  END IF;
END;
$$;

-- 2.2 fn_trg_family_invitation_notification()
-- Nunca conectada a nenhum trigger. Código morto.
DROP FUNCTION IF EXISTS public.fn_trg_family_invitation_notification();

-- 2.3 validate_competence_date()
-- Substituída por set_credit_card_competence_date()
-- Nenhum trigger a referencia
DROP FUNCTION IF EXISTS public.validate_competence_date();

-- 2.4 create_mirrored_transaction_for_split()
-- Arquitetura antiga (pré-ledger). Nenhum trigger ativo a chama.
DROP FUNCTION IF EXISTS public.create_mirrored_transaction_for_split();

-- 2.5 update_mirrored_transactions_on_transaction_update()
-- Arquitetura antiga (pré-ledger). Nenhum trigger ativo a chama.
DROP FUNCTION IF EXISTS public.update_mirrored_transactions_on_transaction_update();

-- ============================================================================
-- PHASE 3: Drop duplicate audit_log cleanup function
-- ============================================================================
-- cleanup_old_audit_logs() (no-param, hardcoded 1 ano) é redundante.
-- clean_old_audit_logs(int) é a versão mantida (chamada pelo frontend).
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs();

-- ============================================================================
-- PHASE 4: Add pg_cron job for audit_log cleanup
-- ============================================================================
-- Limpa logs com mais de 90 dias, rodando semanalmente (domingo 3am)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Remove old job if exists (safe: catch exception if not found)
    BEGIN
      PERFORM cron.unschedule('weekly_audit_log_cleanup');
    EXCEPTION WHEN OTHERS THEN
      -- Job doesn't exist, that's fine
    END;

    -- Schedule weekly cleanup
    PERFORM cron.schedule(
      'weekly_audit_log_cleanup',
      '0 3 * * 0',  -- every Sunday at 3am UTC
      'SELECT public.clean_old_audit_logs(90)'
    );
  END IF;
END;
$$;

-- ============================================================================
-- PHASE 5: Document remaining known issues (não críticos)
-- ============================================================================
-- A função update_updated_at_column() é a única das 3 variantes de updated_at
-- que sobreviveu. As outras (handle_updated_at, trigger_set_updated_at) já foram
-- removidas pela auditoria anterior.
--
-- Funções is_family_member triplicadas: verificar na próxima auditoria quais
-- ainda existem e consolidar em is_family_member_v2 (usada nas policies RLS).
-- ============================================================================

-- ============================================================================
-- PHASE 6: Recalcular todos os saldos (corrige drift causado pelo bug dos triggers)
-- ============================================================================
-- Como insert/delete não atualizavam balance, pode haver drift.
-- Recalculamos todos os saldos para garantir consistência.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.accounts LOOP
    BEGIN
      PERFORM public.recalculate_account_balance(r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao recalcular conta %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMIT;
