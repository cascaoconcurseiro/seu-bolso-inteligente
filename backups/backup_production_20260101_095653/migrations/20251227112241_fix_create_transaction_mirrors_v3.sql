-- Versão final corrigida da função
CREATE OR REPLACE FUNCTION public.create_transaction_mirrors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  original_transaction transactions%ROWTYPE;
  member_record family_members%ROWTYPE;
  member_user_id uuid;
  payer_member_id uuid;
BEGIN
  SELECT * INTO original_transaction FROM transactions WHERE id = NEW.transaction_id;
  IF NOT original_transaction.is_shared THEN RETURN NEW; END IF;
  
  SELECT * INTO member_record FROM family_members WHERE id = NEW.member_id;
  member_user_id := member_record.linked_user_id;
  
  IF member_user_id IS NULL OR member_user_id = original_transaction.user_id THEN RETURN NEW; END IF;
  
  IF EXISTS (SELECT 1 FROM transactions WHERE source_transaction_id = NEW.transaction_id AND user_id = member_user_id) THEN
    RETURN NEW;
  END IF;
  
  SELECT id INTO payer_member_id FROM family_members
  WHERE user_id = member_user_id AND linked_user_id = original_transaction.user_id LIMIT 1;
  
  INSERT INTO transactions (
    user_id, category_id, trip_id, amount, description, date, type, domain,
    is_shared, payer_id, source_transaction_id, is_installment,
    current_installment, total_installments, series_id, notes, creator_user_id
  ) VALUES (
    member_user_id, original_transaction.category_id, original_transaction.trip_id,
    NEW.amount, original_transaction.description, original_transaction.date,
    original_transaction.type, original_transaction.domain, true, payer_member_id,
    NEW.transaction_id, original_transaction.is_installment,
    original_transaction.current_installment, original_transaction.total_installments,
    original_transaction.series_id, 'Espelho', original_transaction.user_id
  );
  
  RETURN NEW;
END;
$function$;;
