-- Migration: Update calculate_trip_spent to handle cross-currency
-- Descrição: Usa destination_amount se preenchido, caso contrário usa amount

CREATE OR REPLACE FUNCTION public.calculate_trip_spent(
  p_trip_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_spent NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(COALESCE(destination_amount, amount)), 0) INTO v_spent
  FROM public.transactions
  WHERE trip_id = p_trip_id
    AND type = 'EXPENSE'
    AND source_transaction_id IS NULL -- Excluir transações espelhadas
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND COALESCE(deleted, false) = false;
  
  RETURN v_spent;
END;
$$;

COMMENT ON FUNCTION public.calculate_trip_spent IS 'Calcula o total gasto em uma viagem, suportando pagamentos em moedas cruzadas (destination_amount)';
