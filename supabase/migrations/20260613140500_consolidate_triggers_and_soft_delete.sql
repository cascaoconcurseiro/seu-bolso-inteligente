-- Migração para consolidar triggers de competence_date e soft delete
-- 1. Consolidar lógica de competence_date para Cartões de Crédito
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
BEGIN
  -- 1. Se for uma parcela, preservamos a competence_date enviada pelo frontend
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo da conta
  SELECT type, closing_day INTO v_account_type, v_closing_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- 2. Se não for cartão de crédito, define competence_date como o primeiro dia do mês da transação
  IF v_account_type IS NULL OR v_account_type != 'CREDIT_CARD' THEN
    IF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
      NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    ELSIF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
      NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    END IF;
    RETURN NEW;
  END IF;

  -- 3. É cartão de crédito: calcular mês de FECHAMENTO
  v_transaction_date := NEW.date::date;
  v_transaction_day := EXTRACT(DAY FROM v_transaction_date);
  v_closing_day := COALESCE(v_closing_day, 1);

  -- Se transação foi NO DIA ou DEPOIS do fechamento (>=), vai para a PRÓXIMA fatura
  IF v_transaction_day >= v_closing_day THEN
    v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
  ELSE
    v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
  END IF;

  NEW.competence_date := v_competence_date;
  RETURN NEW;
END;
$$;

-- Recriar trigger de competence_date
DROP TRIGGER IF EXISTS trigger_set_credit_card_competence_date ON transactions;
CREATE TRIGGER trigger_set_credit_card_competence_date
  BEFORE INSERT OR UPDATE OF date, account_id
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_credit_card_competence_date();


-- 2. Consolidar triggers de Soft Delete para Contas e Categorias

-- Função para Cascade Soft Delete em transações de Conta soft-deletada
CREATE OR REPLACE FUNCTION public.cascade_soft_delete_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se a conta for deletada logicamente (deleted_at IS NOT NULL e antes era NULL)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE transactions 
    SET deleted_at = NEW.deleted_at 
    WHERE account_id = NEW.id AND deleted_at IS NULL;
  END IF;
  
  -- Se a conta for restaurada (deleted_at IS NULL e antes era NOT NULL)
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Opcional: restaurar as transações (descomentar se for regra de negócio desejada)
    -- UPDATE transactions SET deleted_at = NULL WHERE account_id = NEW.id;
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cascade_soft_delete_account ON accounts;
CREATE TRIGGER trigger_cascade_soft_delete_account
  AFTER UPDATE OF deleted_at
  ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_soft_delete_account();


-- Função para Cascade Soft Delete em transações de Categoria soft-deletada
CREATE OR REPLACE FUNCTION public.cascade_soft_delete_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se a categoria for deletada logicamente, nós não deletamos as transações,
  -- mas podemos decidir deixá-las como "Sem Categoria" ou apenas manter a referência.
  -- Neste caso, como é soft delete, manteremos a referência, mas a aplicação pode
  -- ocultar a categoria nas listas.
  
  -- Caso a regra mude e exija que transações percam a categoria:
  -- IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
  --   UPDATE transactions SET category_id = NULL WHERE category_id = NEW.id AND deleted_at IS NULL;
  -- END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cascade_soft_delete_category ON categories;
CREATE TRIGGER trigger_cascade_soft_delete_category
  AFTER UPDATE OF deleted_at
  ON categories
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_soft_delete_category();
