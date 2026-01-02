-- REGRA CRÍTICA: Transação SEMPRE herda a moeda da conta
-- Criar trigger para garantir que currency seja sempre igual à moeda da conta

CREATE OR REPLACE FUNCTION public.set_transaction_currency_from_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_currency TEXT;
  v_account_is_international BOOLEAN;
BEGIN
  -- Buscar moeda e tipo da conta
  SELECT currency, is_international
  INTO v_account_currency, v_account_is_international
  FROM public.accounts
  WHERE id = NEW.account_id;
  
  -- Se a conta for internacional, usar a moeda da conta
  IF v_account_is_international = true THEN
    NEW.currency := v_account_currency;
  ELSE
    -- Se a conta for nacional, usar BRL
    NEW.currency := 'BRL';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trigger_set_transaction_currency ON public.transactions;

CREATE TRIGGER trigger_set_transaction_currency
  BEFORE INSERT OR UPDATE OF account_id
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_transaction_currency_from_account();

COMMENT ON FUNCTION public.set_transaction_currency_from_account IS 
'Garante que a moeda da transação seja sempre a mesma da conta de origem';

-- Corrigir todas as transações existentes com moeda errada
UPDATE public.transactions t
SET currency = a.currency
FROM public.accounts a
WHERE t.account_id = a.id
  AND a.is_international = true
  AND (t.currency IS NULL OR t.currency != a.currency);;
