-- ============================================================================
-- Captura RPCs existentes no Supabase que não tinham migration
-- ============================================================================

BEGIN;

-- 1. transfer_between_accounts
DROP FUNCTION IF EXISTS public.transfer_between_accounts;
CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_exchange_rate NUMERIC DEFAULT NULL,
  p_destination_amount NUMERIC DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_from_tx_id UUID;
  v_to_tx_id UUID;
  v_effective_date DATE;
  v_dest_amount NUMERIC;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_effective_date := COALESCE(p_date, CURRENT_DATE);
  v_dest_amount := COALESCE(p_destination_amount, p_amount);

  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Conta de origem não encontrada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Conta de destino não encontrada');
  END IF;
  IF p_from_account_id = p_to_account_id THEN
    RETURN json_build_object('success', false, 'error', 'Contas de origem e destino devem ser diferentes');
  END IF;

  INSERT INTO transactions (user_id, creator_user_id, account_id, type, amount, description, date, competence_date, domain)
  VALUES (v_user_id, v_user_id, p_from_account_id, 'EXPENSE', p_amount, COALESCE(p_description, 'Transferência entre contas'), v_effective_date, date_trunc('month', v_effective_date)::date, 'PERSONAL')
  RETURNING id INTO v_from_tx_id;

  INSERT INTO transactions (user_id, creator_user_id, account_id, type, amount, description, date, competence_date, domain)
  VALUES (v_user_id, v_user_id, p_to_account_id, 'INCOME', v_dest_amount, COALESCE(p_description, 'Transferência entre contas'), v_effective_date, date_trunc('month', v_effective_date)::date, 'PERSONAL')
  RETURNING id INTO v_to_tx_id;

  RETURN json_build_object('success', true, 'from_transaction_id', v_from_tx_id, 'to_transaction_id', v_to_tx_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.transfer_between_accounts FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transfer_between_accounts TO authenticated;

-- 2. delete_installment_series
DROP FUNCTION IF EXISTS public.delete_installment_series(UUID);
CREATE OR REPLACE FUNCTION public.delete_installment_series(p_series_id UUID)
RETURNS TABLE (deleted_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_creator_id UUID;
BEGIN
  v_user_id := auth.uid();
  SELECT creator_user_id INTO v_creator_id FROM transactions WHERE series_id = p_series_id LIMIT 1;
  IF v_creator_id IS NULL THEN RAISE EXCEPTION 'Série não encontrada'; END IF;
  IF v_creator_id != v_user_id THEN RAISE EXCEPTION 'Apenas o criador da série pode excluí-la'; END IF;
  RETURN QUERY
    WITH deleted AS (DELETE FROM transactions WHERE series_id = p_series_id AND date >= CURRENT_DATE RETURNING id)
    SELECT COUNT(*)::BIGINT FROM deleted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_installment_series FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_installment_series TO authenticated;

-- 3. withdraw_from_account
DROP FUNCTION IF EXISTS public.withdraw_from_account;
CREATE OR REPLACE FUNCTION public.withdraw_from_account(
  p_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_date DATE
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Valor deve ser maior que zero');
  END IF;
  INSERT INTO transactions (user_id, creator_user_id, account_id, type, amount, description, date, competence_date, domain)
  VALUES (v_user_id, v_user_id, p_account_id, 'EXPENSE', p_amount, p_description, p_date, date_trunc('month', p_date)::date, 'PERSONAL')
  RETURNING id INTO v_tx_id;
  RETURN json_build_object('success', true, 'transaction_id', v_tx_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.withdraw_from_account FROM public, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_from_account TO authenticated;

-- 4. fn_respond_family_invitation
DROP FUNCTION IF EXISTS public.fn_respond_family_invitation;
CREATE OR REPLACE FUNCTION public.fn_respond_family_invitation(
  p_invitation_id UUID,
  p_status TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_invitation RECORD;
BEGIN
  v_user_id := auth.uid();
  IF p_status NOT IN ('accepted', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Status inválido');
  END IF;
  SELECT * INTO v_invitation FROM family_invitations WHERE id = p_invitation_id;
  IF v_invitation IS NULL THEN RETURN json_build_object('success', false, 'error', 'Convite não encontrado'); END IF;
  IF v_invitation.to_user_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Este convite não é para você'); END IF;
  IF v_invitation.status != 'pending' THEN RETURN json_build_object('success', false, 'error', 'Convite já respondido'); END IF;
  UPDATE family_invitations SET status = p_status, updated_at = NOW() WHERE id = p_invitation_id;
  IF p_status = 'accepted' THEN
    INSERT INTO family_members (family_id, linked_user_id, member_name, role)
    VALUES (v_invitation.family_id, v_user_id, v_invitation.member_name, v_invitation.role);
  END IF;
  RETURN json_build_object('success', true, 'status', p_status);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_respond_family_invitation FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_respond_family_invitation TO authenticated;

-- 5. migrate_transactions_to_account
DROP FUNCTION IF EXISTS public.migrate_transactions_to_account;
CREATE OR REPLACE FUNCTION public.migrate_transactions_to_account(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_user_id UUID
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Conta de destino não encontrada';
  END IF;
  UPDATE transactions SET account_id = p_to_account_id WHERE account_id = p_from_account_id AND user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.migrate_transactions_to_account FROM public, anon;
GRANT EXECUTE ON FUNCTION public.migrate_transactions_to_account TO authenticated;

-- 6. clear_error_logs
DROP FUNCTION IF EXISTS public.clear_error_logs;
CREATE OR REPLACE FUNCTION public.clear_error_logs()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = 'public'
AS $$ DELETE FROM error_logs; $$;
REVOKE EXECUTE ON FUNCTION public.clear_error_logs FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clear_error_logs TO authenticated;

-- 7. assign_default_account_to_orphans
DROP FUNCTION IF EXISTS public.assign_default_account_to_orphans;
CREATE OR REPLACE FUNCTION public.assign_default_account_to_orphans(
  p_default_account_id UUID,
  p_user_id UUID
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_default_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Conta padrão não encontrada';
  END IF;
  UPDATE transactions SET account_id = p_default_account_id WHERE account_id IS NULL AND user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_default_account_to_orphans FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_default_account_to_orphans TO authenticated;

COMMIT;
