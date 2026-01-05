-- Fix: Corrigir payer_id no trigger de criação de transações espelhadas
-- Problema: O trigger estava copiando user_id para payer_id, mas payer_id é FK para family_members.id
-- Solução: Buscar o family_member.id correspondente ao user_id do criador

CREATE OR REPLACE FUNCTION public.create_mirrored_transaction_for_split()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_original_tx transactions%ROWTYPE;
  v_mirror_tx_id UUID;
  v_payer_member_id UUID;
BEGIN
  -- Buscar transação original
  SELECT * INTO v_original_tx
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Se não encontrou ou não é compartilhada, não fazer nada
  IF NOT FOUND OR v_original_tx.is_shared = false THEN
    RETURN NEW;
  END IF;

  -- Buscar o family_member.id correspondente ao user_id do criador
  SELECT id INTO v_payer_member_id
  FROM family_members
  WHERE linked_user_id = v_original_tx.user_id
  LIMIT 1;

  -- Verificar se já existe transação espelho
  SELECT id INTO v_mirror_tx_id
  FROM transactions
  WHERE source_transaction_id = NEW.transaction_id
    AND user_id = NEW.user_id;

  -- Se já existe, apenas atualizar
  IF FOUND THEN
    UPDATE transactions
    SET 
      amount = NEW.amount,
      description = v_original_tx.description,
      date = v_original_tx.date,
      competence_date = v_original_tx.competence_date,
      account_id = v_original_tx.account_id,
      category_id = v_original_tx.category_id,
      trip_id = v_original_tx.trip_id,
      currency = v_original_tx.currency,
      updated_at = NOW()
    WHERE id = v_mirror_tx_id;
  ELSE
    -- Criar nova transação espelho
    INSERT INTO transactions (
      user_id,
      account_id,
      category_id,
      trip_id,
      amount,
      description,
      date,
      competence_date,
      type,
      currency,
      domain,
      is_shared,
      source_transaction_id,
      payer_id,
      is_installment,
      current_installment,
      total_installments,
      series_id
    ) VALUES (
      NEW.user_id,
      v_original_tx.account_id,
      v_original_tx.category_id,
      v_original_tx.trip_id,
      NEW.amount,
      v_original_tx.description,
      v_original_tx.date,
      v_original_tx.competence_date,
      v_original_tx.type,
      v_original_tx.currency,
      v_original_tx.domain,
      false,
      NEW.transaction_id,
      v_payer_member_id,  -- Usar family_member.id ao invés de user_id
      v_original_tx.is_installment,
      v_original_tx.current_installment,
      v_original_tx.total_installments,
      v_original_tx.series_id
    );
  END IF;

  RETURN NEW;
END;
$function$;
