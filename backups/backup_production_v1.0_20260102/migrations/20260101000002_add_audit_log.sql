-- =====================================================
-- MIGRATION: Implementar Sistema de Auditoria
-- Data: 2026-01-01
-- Descrição: Tabela de auditoria para rastrear mudanças
-- =====================================================

-- 1. CRIAR TABELA DE AUDITORIA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do registro
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  
  -- Tipo de operação
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  
  -- Dados
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[], -- Array de campos que mudaram
  
  -- Auditoria
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contexto adicional
  ip_address INET,
  user_agent TEXT,
  request_id TEXT
);

-- 2. HABILITAR RLS
-- =====================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver audit log (por enquanto, todos podem ver seus próprios)
CREATE POLICY "Users can view own audit log" ON public.audit_log
  FOR SELECT USING (changed_by = auth.uid());

-- 3. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_by ON public.audit_log(changed_by);
CREATE INDEX idx_audit_log_changed_at ON public.audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);

-- 4. FUNÇÃO GENÉRICA DE AUDITORIA
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_changed_fields TEXT[];
  v_key TEXT;
BEGIN
  -- Converter registros para JSONB
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    
    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      old_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      v_old_values,
      auth.uid()
    );
    
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    
    -- Identificar campos que mudaram
    v_changed_fields := ARRAY[]::TEXT[];
    FOR v_key IN SELECT jsonb_object_keys(v_new_values)
    LOOP
      IF v_old_values->v_key IS DISTINCT FROM v_new_values->v_key THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;
    
    -- Apenas registrar se algo mudou
    IF array_length(v_changed_fields, 1) > 0 THEN
      INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        changed_by
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        CASE 
          WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'SOFT_DELETE'
          WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'RESTORE'
          ELSE 'UPDATE'
        END,
        v_old_values,
        v_new_values,
        v_changed_fields,
        auth.uid()
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);
    
    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      new_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      v_new_values,
      auth.uid()
    );
    
    RETURN NEW;
  END IF;
END;
$;

-- 5. APLICAR TRIGGERS EM TABELAS CRÍTICAS
-- =====================================================

-- Transactions
DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Accounts
DROP TRIGGER IF EXISTS audit_accounts ON public.accounts;
CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Transaction Splits
DROP TRIGGER IF EXISTS audit_transaction_splits ON public.transaction_splits;
CREATE TRIGGER audit_transaction_splits
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_splits
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Financial Ledger
DROP TRIGGER IF EXISTS audit_financial_ledger ON public.financial_ledger;
CREATE TRIGGER audit_financial_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Family Members
DROP TRIGGER IF EXISTS audit_family_members ON public.family_members;
CREATE TRIGGER audit_family_members
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- 6. FUNÇÕES DE CONSULTA DE AUDITORIA
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_record_history(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS TABLE (
  action TEXT,
  changed_at TIMESTAMPTZ,
  changed_by_email TEXT,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    al.action,
    al.changed_at,
    p.email AS changed_by_email,
    al.changed_fields,
    al.old_values,
    al.new_values
  FROM audit_log al
  LEFT JOIN profiles p ON p.id = al.changed_by
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC;
END;
$;

CREATE OR REPLACE FUNCTION public.get_user_activity(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  table_name TEXT,
  record_id UUID,
  action TEXT,
  changed_at TIMESTAMPTZ,
  changed_fields TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    al.table_name,
    al.record_id,
    al.action,
    al.changed_at,
    al.changed_fields
  FROM audit_log al
  WHERE al.changed_by = p_user_id
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$;

-- 7. FUNÇÃO DE LIMPEZA DE AUDIT LOG
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_count INTEGER;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Manter logs por 1 ano
  v_cutoff_date := NOW() - INTERVAL '1 year';
  
  DELETE FROM audit_log
  WHERE changed_at < v_cutoff_date;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$;

-- 8. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE audit_log IS 'Log de auditoria de todas as mudanças em tabelas críticas';
COMMENT ON COLUMN audit_log.changed_fields IS 'Array de campos que foram modificados';
COMMENT ON FUNCTION audit_changes IS 'Trigger function para registrar mudanças automaticamente';
COMMENT ON FUNCTION get_record_history IS 'Retorna histórico completo de um registro';
COMMENT ON FUNCTION get_user_activity IS 'Retorna atividade recente de um usuário';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove logs de auditoria com mais de 1 ano';

