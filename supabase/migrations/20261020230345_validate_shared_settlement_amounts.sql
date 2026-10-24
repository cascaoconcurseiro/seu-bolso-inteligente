-- Validate settlement direction, amount, currency, account and date on the server.
CREATE OR REPLACE FUNCTION private.request_settlement_secure(
  p_split_ids uuid[],
  p_account_id uuid,
  p_user_id uuid,
  p_is_payment boolean,
  p_amount numeric DEFAULT NULL,
  p_settlement_date date DEFAULT (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_split_id uuid;
  v_split record;
  v_net_amount numeric := 0;
  v_amount numeric;
  v_currency text;
  v_account_currency text;
  v_transaction_id uuid;
  v_processed_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Cannot settle expenses for another user' USING ERRCODE = '42501';
  END IF;
  IF p_split_ids IS NULL OR cardinality(p_split_ids) = 0 THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;
  IF cardinality(p_split_ids) <> (
    SELECT count(DISTINCT split_id) FROM unnest(p_split_ids) AS split_id
  ) THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'A lista contém splits duplicados.');
  END IF;
  IF p_amount IS NOT NULL AND p_amount <= 0 THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'O valor do acerto deve ser positivo.');
  END IF;
  IF p_settlement_date IS NULL OR p_settlement_date > (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'A data do acerto é inválida.');
  END IF;

  SELECT account.currency INTO v_account_currency
  FROM public.accounts AS account
  WHERE account.id = p_account_id AND account.user_id = v_uid
    AND account.deleted_at IS NULL AND account.is_active = true
    AND COALESCE(account.is_archived, false) = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account does not belong to authenticated user or is unavailable'
      USING ERRCODE = '42501';
  END IF;

  PERFORM split.id
  FROM public.transaction_splits AS split
  WHERE split.id = ANY(p_split_ids)
  ORDER BY split.id
  FOR UPDATE;

  IF (
    SELECT count(*) FROM public.transaction_splits AS split
    JOIN public.transactions AS transaction ON transaction.id = split.transaction_id
    WHERE split.id = ANY(p_split_ids)
      AND split.deleted_at IS NULL
      AND transaction.deleted_at IS NULL
      AND transaction.type IN ('EXPENSE', 'INCOME')
  ) <> cardinality(p_split_ids) THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'Um ou mais itens não estão disponíveis para acerto.');
  END IF;

  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT split.*, transaction.user_id AS creditor_user_id,
           COALESCE(transaction.currency, 'BRL') AS split_currency,
           transaction.type AS transaction_type
    INTO v_split
    FROM public.transaction_splits AS split
    JOIN public.transactions AS transaction ON transaction.id = split.transaction_id
    WHERE split.id = v_split_id
      AND split.deleted_at IS NULL
      AND transaction.deleted_at IS NULL
      AND transaction.type IN ('EXPENSE', 'INCOME');

    IF v_split.is_settled THEN
      RETURN pg_catalog.json_build_object('success', false, 'error', 'Um ou mais itens já foram totalmente acertados.');
    END IF;
    IF v_split.user_id IS DISTINCT FROM v_uid
       AND v_split.creditor_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'User is not a participant in split %', v_split_id
        USING ERRCODE = '42501';
    END IF;
    IF (v_split.user_id = v_uid AND COALESCE(v_split.settled_by_debtor, false))
       OR (v_split.creditor_user_id = v_uid AND COALESCE(v_split.settled_by_creditor, false)) THEN
      RETURN pg_catalog.json_build_object('success', false, 'error', 'Este lado já registrou o acerto deste item.');
    END IF;

    IF v_currency IS NULL THEN
      v_currency := v_split.split_currency;
    ELSIF v_currency IS DISTINCT FROM v_split.split_currency THEN
      RETURN pg_catalog.json_build_object('success', false, 'error', 'Selecione itens de uma única moeda por acerto.');
    END IF;

    -- Income rows are shared refunds. Their economic direction is opposite
    -- to an expense, matching generateInvoices() in the client.
    IF (v_split.user_id = v_uid) = (v_split.transaction_type = 'INCOME') THEN
      v_net_amount := v_net_amount + v_split.amount;
    ELSE
      v_net_amount := v_net_amount - v_split.amount;
    END IF;
  END LOOP;

  IF pg_catalog.round(v_net_amount, 2) = 0 THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'Itens compensados devem usar a ação de compensação.');
  END IF;
  IF (v_net_amount < 0) IS DISTINCT FROM p_is_payment THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'A direção do acerto não corresponde aos itens selecionados.');
  END IF;

  v_amount := pg_catalog.abs(v_net_amount);
  IF p_amount IS NOT NULL AND pg_catalog.abs(pg_catalog.round(p_amount, 2) - pg_catalog.round(v_amount, 2)) >= 0.01 THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'O valor precisa corresponder ao saldo líquido integral dos itens selecionados.');
  END IF;
  IF COALESCE(v_account_currency, 'BRL') IS DISTINCT FROM COALESCE(v_currency, 'BRL') THEN
    RETURN pg_catalog.json_build_object('success', false, 'error', 'A moeda da conta precisa corresponder à moeda do acerto.');
  END IF;

  INSERT INTO public.transactions (
    user_id, creator_user_id, account_id, amount, type, description, date,
    competence_date, domain, is_shared, currency, created_at, updated_at
  ) VALUES (
    v_uid, v_uid, p_account_id, v_amount,
    CASE WHEN p_is_payment THEN 'EXPENSE'::public.transaction_type
         ELSE 'INCOME'::public.transaction_type END,
    CASE WHEN p_is_payment THEN 'Pagamento de despesa compartilhada'
         ELSE 'Recebimento de despesa compartilhada' END,
    p_settlement_date, pg_catalog.date_trunc('month', p_settlement_date)::date,
    'PERSONAL'::public.transaction_domain, false, COALESCE(v_currency, 'BRL'),
    pg_catalog.now(), pg_catalog.now()
  ) RETURNING id INTO v_transaction_id;

  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT split.*, transaction.user_id AS creditor_user_id
    INTO v_split
    FROM public.transaction_splits AS split
    JOIN public.transactions AS transaction ON transaction.id = split.transaction_id
    WHERE split.id = v_split_id;

    IF v_split.user_id = v_uid THEN
      UPDATE public.transaction_splits
      SET settled_by_debtor = true, debtor_settlement_tx_id = v_transaction_id
      WHERE id = v_split_id;
    END IF;
    IF v_split.creditor_user_id = v_uid THEN
      UPDATE public.transaction_splits
      SET settled_by_creditor = true, creditor_settlement_tx_id = v_transaction_id
      WHERE id = v_split_id;
    END IF;

    UPDATE public.transaction_splits
    SET is_settled = (settled_by_debtor = true AND settled_by_creditor = true),
        settled_at = CASE WHEN settled_by_debtor = true AND settled_by_creditor = true THEN pg_catalog.now() ELSE NULL END,
        settled_transaction_id = CASE WHEN settled_by_debtor = true AND settled_by_creditor = true THEN v_transaction_id ELSE NULL END
    WHERE id = v_split_id;
    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN pg_catalog.json_build_object(
    'success', true, 'transaction_id', v_transaction_id,
    'processed_count', v_processed_count, 'total_amount', v_amount
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.request_settlement_secure(uuid[], uuid, uuid, boolean, numeric, date)
  FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.request_settlement_v2(uuid[], uuid, boolean, numeric);
CREATE FUNCTION public.request_settlement_v2(
  p_split_ids uuid[],
  p_account_id uuid,
  p_is_payment boolean,
  p_amount numeric DEFAULT NULL,
  p_settlement_date date DEFAULT (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.request_settlement_secure(
    p_split_ids, p_account_id, private.authenticated_uid(), p_is_payment,
    p_amount, p_settlement_date
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.request_settlement_v2(uuid[], uuid, boolean, numeric, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_settlement_v2(uuid[], uuid, boolean, numeric, date)
  TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.request_settlement(uuid[], uuid, uuid, boolean, numeric)
  FROM PUBLIC, anon, authenticated;
