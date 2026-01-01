-- Migration: Ajuste automático de orçamento de viagem quando acertos são feitos
-- Data: 31/12/2024
-- Descrição: Quando um split de viagem é marcado como pago, o orçamento da viagem é ajustado

-- Função para ajustar orçamento da viagem quando acerto é feito
CREATE OR REPLACE FUNCTION adjust_trip_budget_on_settlement()
RETURNS TRIGGER AS $$
DECLARE
  v_trip_id UUID;
  v_settlement_amount NUMERIC;
  v_current_budget NUMERIC;
BEGIN
  -- Verificar se é um split de viagem e se foi marcado como pago
  IF NEW.is_settled = TRUE AND (OLD.is_settled IS NULL OR OLD.is_settled = FALSE) THEN
    -- Buscar trip_id da transação original
    SELECT trip_id INTO v_trip_id
    FROM transactions
    WHERE id = NEW.transaction_id;
    
    -- Se não for transação de viagem, não fazer nada
    IF v_trip_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Valor do acerto
    v_settlement_amount := NEW.amount;
    
    -- Buscar orçamento atual da viagem
    SELECT budget INTO v_current_budget
    FROM trips
    WHERE id = v_trip_id;
    
    -- Se não houver orçamento definido, não fazer nada
    IF v_current_budget IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- LÓGICA DO AJUSTE:
    -- Quando alguém acerta uma dívida de viagem, esse dinheiro "volta" para o orçamento
    -- Exemplo: Orçamento $ 100, gastou $ 10 (dividido), acertou $ 5 → Disponível $ 95
    -- 
    -- Mas atenção: O orçamento não deve aumentar além do original!
    -- Vamos apenas registrar que o acerto foi feito, sem alterar o orçamento base
    -- 
    -- DECISÃO: Não alterar o orçamento automaticamente
    -- Motivo: Orçamento é um limite de gastos, não um saldo de conta
    -- Acertos são entre participantes, não afetam o orçamento total da viagem
    
    -- Log para debug (opcional)
    RAISE NOTICE 'Split % da viagem % foi marcado como pago. Valor: %', 
      NEW.id, v_trip_id, v_settlement_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_adjust_trip_budget_on_settlement ON transaction_splits;
CREATE TRIGGER trigger_adjust_trip_budget_on_settlement
  AFTER UPDATE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION adjust_trip_budget_on_settlement();

-- Comentários
COMMENT ON FUNCTION adjust_trip_budget_on_settlement IS 
  'Função chamada quando um split de viagem é marcado como pago. 
   Atualmente apenas loga o evento, mas pode ser expandida para ajustar orçamento se necessário.';

-- View para calcular orçamento disponível (se necessário no futuro)
CREATE OR REPLACE VIEW trip_budget_summary AS
SELECT 
  t.id as trip_id,
  t.name as trip_name,
  t.budget as total_budget,
  COALESCE(SUM(CASE WHEN tx.type = 'EXPENSE' THEN tx.amount ELSE 0 END), 0) as total_spent,
  COALESCE(SUM(CASE WHEN ts.is_settled = TRUE THEN ts.amount ELSE 0 END), 0) as total_settled,
  t.budget - COALESCE(SUM(CASE WHEN tx.type = 'EXPENSE' THEN tx.amount ELSE 0 END), 0) as remaining_budget,
  -- Orçamento "disponível" considerando acertos (conceito alternativo)
  t.budget - COALESCE(SUM(CASE WHEN tx.type = 'EXPENSE' THEN tx.amount ELSE 0 END), 0) 
    + COALESCE(SUM(CASE WHEN ts.is_settled = TRUE THEN ts.amount ELSE 0 END), 0) as available_budget
FROM trips t
LEFT JOIN transactions tx ON t.id = tx.trip_id
LEFT JOIN transaction_splits ts ON tx.id = ts.transaction_id
GROUP BY t.id, t.name, t.budget;

COMMENT ON VIEW trip_budget_summary IS 
  'Resumo de orçamento de viagem incluindo gastos e acertos.
   - total_budget: Orçamento planejado
   - total_spent: Total gasto na viagem
   - total_settled: Total de acertos feitos
   - remaining_budget: Orçamento restante (budget - spent)
   - available_budget: Conceito alternativo (budget - spent + settled)';;
