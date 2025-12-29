-- Sistema de notificações para despesas compartilhadas

-- Função para criar notificação de despesa compartilhada
CREATE OR REPLACE FUNCTION notify_shared_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payer_name TEXT;
  v_description TEXT;
  v_amount NUMERIC;
  v_installments TEXT;
  v_split RECORD;
  v_member_user_id UUID;
BEGIN
  -- Apenas para transações compartilhadas novas
  IF NEW.is_shared = TRUE AND TG_OP = 'INSERT' THEN
    -- Buscar nome do pagador
    SELECT full_name INTO v_payer_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    v_description := NEW.description;
    v_amount := NEW.amount;
    
    -- Formatar texto de parcelamento
    IF NEW.is_installment = TRUE AND NEW.total_installments > 1 THEN
      v_installments := ' em ' || NEW.total_installments || 'x de R$ ' || 
                        ROUND(NEW.amount / NEW.total_installments, 2);
    ELSE
      v_installments := '';
    END IF;
    
    -- Criar notificação para cada membro que recebeu split
    FOR v_split IN 
      SELECT ts.member_id, ts.amount as split_amount
      FROM transaction_splits ts
      WHERE ts.transaction_id = NEW.id
    LOOP
      -- Buscar user_id do membro
      SELECT linked_user_id INTO v_member_user_id
      FROM family_members
      WHERE id = v_split.member_id;
      
      -- Criar notificação apenas se o membro não for o pagador e tiver user_id
      IF v_member_user_id IS NOT NULL AND v_member_user_id != NEW.user_id THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_read
        ) VALUES (
          v_member_user_id,
          'SHARED_EXPENSE',
          'Nova despesa compartilhada',
          v_payer_name || ' compartilhou "' || v_description || '"' || v_installments || 
          '. Sua parte: R$ ' || ROUND(v_split.split_amount, 2),
          jsonb_build_object(
            'transaction_id', NEW.id,
            'series_id', NEW.series_id,
            'payer_id', NEW.user_id,
            'payer_name', v_payer_name,
            'description', v_description,
            'total_amount', v_amount,
            'split_amount', v_split.split_amount,
            'is_installment', NEW.is_installment,
            'total_installments', NEW.total_installments
          ),
          FALSE
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS notify_shared_expense_trigger ON transactions;
CREATE TRIGGER notify_shared_expense_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_shared_expense();

-- Adicionar índice para melhorar performance de notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_unread 
ON notifications(user_id, type, is_read) 
WHERE is_read = FALSE;;
