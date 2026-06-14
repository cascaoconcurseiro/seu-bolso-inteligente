-- Arquivo: supabase/migrations/20260614020000_implement_hybrid_shared_cycle.sql

BEGIN;

-- 1. Adicionar colunas Base da Família
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS shared_closing_day INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS shared_due_day INTEGER DEFAULT 5;

-- 2. Garantir limites válidos (ignorando erro se já existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_shared_closing_day'
    ) THEN
        ALTER TABLE public.families
        ADD CONSTRAINT valid_shared_closing_day CHECK (shared_closing_day BETWEEN 1 AND 31);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_shared_due_day'
    ) THEN
        ALTER TABLE public.families
        ADD CONSTRAINT valid_shared_due_day CHECK (shared_due_day BETWEEN 1 AND 31);
    END IF;
END $$;


-- 3. Atualizar o trigger para suportar a Arquitetura Híbrida
CREATE OR REPLACE FUNCTION public.set_credit_card_competence_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_type TEXT;
  v_closing_day INTEGER;
  v_transaction_date DATE;
  v_transaction_day INTEGER;
  v_competence_date DATE;
  v_is_shared BOOLEAN;
  v_family RECORD;
BEGIN
  -- Se for uma parcela de cartão com data já definida, não recalcula
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo e fechamento da conta atual
  SELECT type, closing_day INTO v_account_type, v_closing_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- É uma transação compartilhada?
  SELECT EXISTS(SELECT 1 FROM transaction_splits WHERE transaction_id = NEW.id) INTO v_is_shared;
  
  -- Se não existir em splits (novo insert), assumimos que não é, mas o trigger do split vai recalcular depois
  IF NOT v_is_shared AND TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
     -- Não mudou para compartilhado, só verificar o tipo da conta
  END IF;

  -- ====== ARQUITETURA HÍBRIDA ======

  -- 1. REGRA DO CARTÃO (Preserva Fluxo de Caixa)
  IF v_account_type = 'CREDIT_CARD' THEN
    v_transaction_date := NEW.date::date;
    v_transaction_day := EXTRACT(DAY FROM v_transaction_date);
    v_closing_day := COALESCE(v_closing_day, 1);

    IF v_transaction_day >= v_closing_day THEN
      v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
    ELSE
      v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
    END IF;

    NEW.competence_date := v_competence_date;
    RETURN NEW;
  END IF;

  -- 2. REGRA DO PIX/DINHEIRO (Fatura Base da Família)
  -- Aplica-se apenas se for compartilhado
  IF v_is_shared THEN
    -- Achar a família ativa do dono da transação
    SELECT f.* INTO v_family 
    FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = NEW.user_id AND fm.status = 'ACTIVE'
    LIMIT 1;

    IF FOUND AND v_family.shared_closing_day IS NOT NULL THEN
      v_transaction_day := EXTRACT(DAY FROM NEW.date::date);
      IF v_transaction_day >= v_family.shared_closing_day THEN
        NEW.competence_date := (DATE_TRUNC('month', NEW.date::date) + INTERVAL '1 month')::date;
      ELSE
        NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- 3. Comportamento padrão para contas normais não-compartilhadas
  IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  ELSIF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  END IF;

  RETURN NEW;
END;
$$;


-- 4. Atualizar o trigger pós-split (quando os splits são inseridos, precisamos recalcular a competência)
CREATE OR REPLACE FUNCTION public.update_shared_competence_after_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_family RECORD;
  v_transaction_day INTEGER;
  v_new_competence DATE;
BEGIN
  -- Pegar a transação raiz e seu tipo de conta
  SELECT t.*, a.type as account_type INTO v_transaction
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.id = NEW.transaction_id;

  -- Se for cartão de crédito, o trigger do cartão já tratou. 
  -- Se for PIX/Dinheiro (Não Cartão), cai na Rede de Segurança (Família)
  IF v_transaction.account_type IS DISTINCT FROM 'CREDIT_CARD' THEN
    
    SELECT f.* INTO v_family 
    FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = v_transaction.user_id AND fm.status = 'ACTIVE'
    LIMIT 1;
    
    IF FOUND AND v_family.shared_closing_day IS NOT NULL THEN
      v_transaction_day := EXTRACT(DAY FROM v_transaction.date::date);
      
      IF v_transaction_day >= v_family.shared_closing_day THEN
        v_new_competence := (DATE_TRUNC('month', v_transaction.date::date) + INTERVAL '1 month')::date;
      ELSE
        v_new_competence := DATE_TRUNC('month', v_transaction.date::date)::date;
      END IF;

      -- Atualiza se divergir do padrão do mês corrente
      IF v_new_competence != v_transaction.competence_date THEN
        UPDATE transactions SET competence_date = v_new_competence WHERE id = v_transaction.id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
