-- =====================================================
-- TABELA DE OPERAÇÕES PENDENTES
-- Single Source of Truth para fila de retry
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pending_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE_SPLIT', 'UPDATE_SPLIT', 'DELETE_SPLIT', 'MIRROR_TRANSACTION')),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pending_operations_user_status 
ON public.pending_operations(user_id, status) 
WHERE status IN ('PENDING', 'PROCESSING');

CREATE INDEX IF NOT EXISTS idx_pending_operations_next_retry 
ON public.pending_operations(next_retry_at) 
WHERE status = 'PENDING' AND next_retry_at IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pending_operations_updated_at
  BEFORE UPDATE ON public.pending_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.pending_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending operations"
  ON public.pending_operations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending operations"
  ON public.pending_operations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending operations"
  ON public.pending_operations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending operations"
  ON public.pending_operations FOR DELETE
  USING (auth.uid() = user_id);

-- Função para limpar operações antigas (completadas ou falhadas há mais de 7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_pending_operations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.pending_operations
  WHERE status IN ('COMPLETED', 'FAILED')
    AND updated_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON TABLE public.pending_operations IS 'Fila de operações pendentes para retry automático (Single Source of Truth)';
COMMENT ON FUNCTION public.cleanup_old_pending_operations IS 'Limpa operações completadas/falhadas há mais de 7 dias';;
