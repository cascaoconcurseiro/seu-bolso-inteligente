-- =====================================================
-- MIGRATION: Criar Sistema de Ledger Financeiro
-- Data: 2024-12-31
-- Descrição: Implementa ledger como fonte única da verdade
-- =====================================================

-- 1. CRIAR TABELA DE LEDGER
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Tipo de movimento
  entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  
  -- Valores
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  
  -- Relacionamento (para compartilhamento)
  related_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  
  -- Contexto
  description TEXT NOT NULL,
  category TEXT, -- 'PERSONAL', 'SHARED', 'TRAVEL', 'SETTLEMENT'
  
  -- Acerto de contas
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settlement_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HABILITAR RLS
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_ledger_user_id ON public.financial_ledger(user_id);
CREATE INDEX idx_ledger_transaction_id ON public.financial_ledger(transaction_id);
CREATE INDEX idx_ledger_related_user_id ON public.financial_ledger(related_user_id);
CREATE INDEX idx_ledger_is_settled ON public.financial_ledger(is_settled);
CREATE INDEX idx_ledger_created_at ON public.financial_ledger(created_at DESC);

-- 4. POLÍTICAS RLS
CREATE POLICY "Users can view own ledger entries" ON public.financial_ledger
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ledger entries" ON public.financial_ledger
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ledger entries" ON public.financial_ledger
  FOR UPDATE USING (user_id = auth.uid());

-- 5. TRIGGER PARA UPDATED_AT
CREATE TRIGGER update_ledger_updated_at 
  BEFORE UPDATE ON public.financial_ledger
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. FUNÇÃO PARA CRIAR ENTRADAS DE LEDGER AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.create_ledger_entries_for_transaction()
RETURNS TRIGGER AS $$
DECLARE
  split_record RECORD;
BEGIN
  -- Se a transação é compartilhada, criar entradas de ledger
  IF NEW.is_shared = TRUE THEN
    
    -- 1. DÉBITO para o pagador (quem pagou a despesa)
    INSERT INTO public.financial_ledger (
      transaction_id,
      user_id,
      entry_type,
      amount,
      currency,
      description,
      category
    ) VALUES (
      NEW.id,
      NEW.user_id, -- Quem pagou
      'DEBIT',
      NEW.amount,
      COALESCE(NEW.currency, 'BRL'),
      NEW.description || ' (Pagamento)',
      CASE 
        WHEN NEW.trip_id IS NOT NULL THEN 'TRAVEL'
        ELSE 'SHARED'
      END
    );
    
    -- 2. CRÉDITOS para o pagador (valores que outros devem)
    -- Isso será criado quando os splits forem inseridos
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. TRIGGER PARA CRIAR LEDGER AO CRIAR TRANSAÇÃO
CREATE TRIGGER trg_create_ledger_on_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.is_shared = TRUE)
  EXECUTE FUNCTION public.create_ledger_entries_for_transaction();

-- 8. FUNÇÃO PARA CRIAR ENTRADAS DE LEDGER PARA SPLITS
CREATE OR REPLACE FUNCTION public.create_ledger_entries_for_split()
RETURNS TRIGGER AS $$
DECLARE
  transaction_record RECORD;
BEGIN
  -- Buscar dados da transação
  SELECT * INTO transaction_record
  FROM public.transactions
  WHERE id = NEW.transaction_id;
  
  -- 1. CRÉDITO para quem pagou (valor que vai receber)
  INSERT INTO public.financial_ledger (
    transaction_id,
    user_id,
    entry_type,
    amount,
    currency,
    related_user_id,
    related_member_id,
    description,
    category
  ) VALUES (
    NEW.transaction_id,
    transaction_record.user_id, -- Quem pagou
    'CREDIT',
    NEW.amount,
    COALESCE(transaction_record.currency, 'BRL'),
    NEW.user_id, -- Quem deve
    NEW.member_id,
    transaction_record.description || ' (A receber de ' || NEW.name || ')',
    CASE 
      WHEN transaction_record.trip_id IS NOT NULL THEN 'TRAVEL'
      ELSE 'SHARED'
    END
  );
  
  -- 2. DÉBITO para quem deve
  INSERT INTO public.financial_ledger (
    transaction_id,
    user_id,
    entry_type,
    amount,
    currency,
    related_user_id,
    related_member_id,
    description,
    category
  ) VALUES (
    NEW.transaction_id,
    NEW.user_id, -- Quem deve
    'DEBIT',
    NEW.amount,
    COALESCE(transaction_record.currency, 'BRL'),
    transaction_record.user_id, -- Quem pagou
    NEW.member_id,
    transaction_record.description || ' (Dívida com ' || (
      SELECT full_name FROM public.profiles WHERE id = transaction_record.user_id
    ) || ')',
    CASE 
      WHEN transaction_record.trip_id IS NOT NULL THEN 'TRAVEL'
      ELSE 'SHARED'
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. TRIGGER PARA CRIAR LEDGER AO CRIAR SPLIT
CREATE TRIGGER trg_create_ledger_on_split
  AFTER INSERT ON public.transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ledger_entries_for_split();

-- 10. FUNÇÃO PARA CALCULAR SALDO ENTRE DOIS USUÁRIOS
CREATE OR REPLACE FUNCTION public.calculate_balance_between_users(
  p_user1_id UUID,
  p_user2_id UUID,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS TABLE (
  user1_owes NUMERIC,
  user2_owes NUMERIC,
  net_balance NUMERIC,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user1_debits AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM public.financial_ledger
    WHERE user_id = p_user1_id
      AND related_user_id = p_user2_id
      AND entry_type = 'DEBIT'
      AND is_settled = FALSE
      AND currency = p_currency
  ),
  user2_debits AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM public.financial_ledger
    WHERE user_id = p_user2_id
      AND related_user_id = p_user1_id
      AND entry_type = 'DEBIT'
      AND is_settled = FALSE
      AND currency = p_currency
  )
  SELECT 
    u1.total AS user1_owes,
    u2.total AS user2_owes,
    u1.total - u2.total AS net_balance,
    p_currency AS currency
  FROM user1_debits u1, user2_debits u2;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 11. FUNÇÃO PARA ACERTAR CONTAS
CREATE OR REPLACE FUNCTION public.settle_balance_between_users(
  p_user1_id UUID,
  p_user2_id UUID,
  p_settlement_transaction_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Marcar todas as entradas como acertadas
  UPDATE public.financial_ledger
  SET 
    is_settled = TRUE,
    settled_at = NOW(),
    settlement_transaction_id = p_settlement_transaction_id
  WHERE (
    (user_id = p_user1_id AND related_user_id = p_user2_id)
    OR (user_id = p_user2_id AND related_user_id = p_user1_id)
  )
  AND is_settled = FALSE;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Também marcar splits como acertados
  UPDATE public.transaction_splits
  SET 
    is_settled = TRUE,
    settled_at = NOW(),
    settled_transaction_id = p_settlement_transaction_id
  WHERE (
    (user_id = p_user1_id AND transaction_id IN (
      SELECT id FROM public.transactions WHERE user_id = p_user2_id
    ))
    OR (user_id = p_user2_id AND transaction_id IN (
      SELECT id FROM public.transactions WHERE user_id = p_user1_id
    ))
  )
  AND is_settled = FALSE;
  
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE public.financial_ledger IS 'Ledger financeiro - fonte única da verdade para débitos e créditos';
COMMENT ON COLUMN public.financial_ledger.entry_type IS 'DEBIT = devo, CREDIT = tenho a receber';
COMMENT ON COLUMN public.financial_ledger.related_user_id IS 'Usuário relacionado (quem devo ou quem me deve)';
COMMENT ON FUNCTION public.calculate_balance_between_users IS 'Calcula saldo líquido entre dois usuários';
COMMENT ON FUNCTION public.settle_balance_between_users IS 'Marca todas as entradas entre dois usuários como acertadas';

