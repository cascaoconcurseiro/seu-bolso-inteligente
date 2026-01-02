-- Migration: Atualizar função de resumo financeiro para incluir acertos
-- Data: 31/12/2024
-- Descrição: Adiciona informação sobre acertos feitos na viagem

-- Dropar função existente
DROP FUNCTION IF EXISTS public.get_trip_financial_summary(UUID);

-- Recriar função com total_settled
CREATE OR REPLACE FUNCTION public.get_trip_financial_summary(
  p_trip_id UUID
)
RETURNS TABLE (
  total_budget NUMERIC,
  total_spent NUMERIC,
  total_settled NUMERIC,
  remaining NUMERIC,
  percentage_used NUMERIC,
  currency TEXT,
  participants_count BIGINT,
  transactions_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.budget AS total_budget,
    public.calculate_trip_spent(p_trip_id) AS total_spent,
    -- Total de acertos feitos (splits marcados como pagos)
    COALESCE((
      SELECT SUM(ts.amount)
      FROM public.transaction_splits ts
      JOIN public.transactions tx ON ts.transaction_id = tx.id
      WHERE tx.trip_id = p_trip_id
        AND ts.is_settled = TRUE
    ), 0) AS total_settled,
    COALESCE(t.budget, 0) - public.calculate_trip_spent(p_trip_id) AS remaining,
    CASE 
      WHEN t.budget > 0 THEN 
        ROUND((public.calculate_trip_spent(p_trip_id) / t.budget) * 100, 2)
      ELSE 0
    END AS percentage_used,
    t.currency,
    (SELECT COUNT(*) FROM public.trip_members WHERE trip_id = p_trip_id) AS participants_count,
    (SELECT COUNT(*) FROM public.transactions WHERE trip_id = p_trip_id AND source_transaction_id IS NULL) AS transactions_count
  FROM public.trips t
  WHERE t.id = p_trip_id;
END;
$$;

COMMENT ON FUNCTION public.get_trip_financial_summary IS 
  'Retorna resumo financeiro completo de uma viagem incluindo:
   - total_budget: Orçamento planejado
   - total_spent: Total gasto
   - total_settled: Total de acertos feitos entre participantes
   - remaining: Orçamento restante
   - percentage_used: Percentual usado do orçamento
   - currency: Moeda da viagem
   - participants_count: Número de participantes
   - transactions_count: Número de transações';
