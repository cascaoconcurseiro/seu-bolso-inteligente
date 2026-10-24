CREATE OR REPLACE FUNCTION public.get_credit_card_invoice(
  p_account_id uuid,
  p_user_id uuid,
  p_month_start date,
  p_month_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_card_owner_id uuid;
  v_result jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot read another user credit card invoice'
      USING ERRCODE = '42501';
  END IF;

  IF p_month_start IS NULL OR p_month_end IS NULL OR p_month_end < p_month_start THEN
    RAISE EXCEPTION 'Invalid invoice date range'
      USING ERRCODE = '22007';
  END IF;

  SELECT account.user_id
  INTO v_card_owner_id
  FROM public.accounts AS account
  WHERE account.id = p_account_id
    AND account.type = 'CREDIT_CARD'::public.account_type
    AND account.is_active
    AND account.deleted_at IS NULL;

  IF NOT FOUND OR (
    v_card_owner_id IS DISTINCT FROM p_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.shared_credit_cards AS shared_card
      WHERE shared_card.account_id = p_account_id
        AND shared_card.user_id = p_user_id
        AND shared_card.status = 'ACCEPTED'
    )
  ) THEN
    RAISE EXCEPTION 'Credit card is not available to the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  WITH invoice_rows AS (
    SELECT
      transaction.id,
      transaction.description,
      transaction.amount,
      transaction.destination_amount,
      transaction.destination_currency,
      transaction.date,
      transaction.competence_date,
      transaction.type,
      transaction.current_installment,
      transaction.total_installments,
      transaction.series_id,
      transaction.is_shared,
      transaction.currency,
      transaction.account_id,
      transaction.destination_account_id,
      transaction.user_id,
      jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'icon', category.icon
      ) AS category,
      jsonb_build_object(
        'id', profile.id,
        'name', profile.full_name,
        'avatar_url', profile.avatar_url
      ) AS creator
    FROM public.transactions AS transaction
    LEFT JOIN public.categories AS category ON category.id = transaction.category_id
    LEFT JOIN public.profiles AS profile ON profile.id = transaction.user_id
    WHERE transaction.user_id = p_user_id
      AND transaction.deleted_at IS NULL
      AND transaction.competence_date >= p_month_start
      AND transaction.competence_date <= p_month_end
      AND (
        (
          transaction.account_id = p_account_id
          AND transaction.source_transaction_id IS NULL
        )
        OR (
          transaction.destination_account_id = p_account_id
          AND transaction.type = 'TRANSFER'::public.transaction_type
        )
      )
  ), invoice_total AS (
    SELECT COALESCE(SUM(
      CASE
        WHEN row.type = 'EXPENSE'::public.transaction_type THEN row.amount
        WHEN row.type = 'INCOME'::public.transaction_type THEN -row.amount
        WHEN row.type = 'TRANSFER'::public.transaction_type
          AND row.account_id = p_account_id
          AND row.destination_account_id = p_account_id
          AND row.description LIKE 'Estorno Saldo Rotativo Fatura %'
          THEN -row.amount
        WHEN row.type = 'TRANSFER'::public.transaction_type
          AND row.account_id = p_account_id
          AND row.destination_account_id = p_account_id
          AND row.description LIKE 'Saldo Rotativo Fatura Anterior (%'
          THEN row.amount
        WHEN row.type = 'TRANSFER'::public.transaction_type
          AND row.destination_account_id = p_account_id
          AND row.account_id IS DISTINCT FROM p_account_id
          THEN -COALESCE(row.destination_amount, row.amount)
        WHEN row.type = 'TRANSFER'::public.transaction_type
          AND row.account_id = p_account_id
          AND row.destination_account_id IS DISTINCT FROM p_account_id
          THEN row.amount
        ELSE 0
      END
    ), 0) AS total,
    COUNT(*) AS tx_count
    FROM invoice_rows AS row
  )
  SELECT jsonb_build_object(
    'total', invoice_total.total,
    'tx_count', invoice_total.tx_count,
    'transactions', COALESCE((
      SELECT jsonb_agg(to_jsonb(row) ORDER BY row.date DESC, row.id)
      FROM invoice_rows AS row
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM invoice_total;

  RETURN COALESCE(v_result, '{"total":0,"tx_count":0,"transactions":[]}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_credit_card_invoice(uuid, uuid, date, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_credit_card_invoice(uuid, uuid, date, date)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_account_balance_at_date(
  p_account_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_initial_balance numeric;
  v_balance numeric;
BEGIN
  SELECT COALESCE(account.initial_balance, 0)
  INTO v_initial_balance
  FROM public.accounts AS account
  WHERE account.id = p_account_id;

  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN transaction.type = 'INCOME'::public.transaction_type
        AND transaction.account_id = p_account_id THEN transaction.amount
      WHEN transaction.type = 'EXPENSE'::public.transaction_type
        AND transaction.account_id = p_account_id THEN -transaction.amount
      WHEN transaction.type = 'TRANSFER'::public.transaction_type
        AND transaction.account_id = p_account_id
        AND transaction.destination_account_id = p_account_id THEN 0
      WHEN transaction.type = 'TRANSFER'::public.transaction_type
        AND transaction.account_id = p_account_id THEN -transaction.amount
      WHEN transaction.type = 'TRANSFER'::public.transaction_type
        AND transaction.destination_account_id = p_account_id
        THEN COALESCE(transaction.destination_amount, transaction.amount)
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.transactions AS transaction
  WHERE (transaction.account_id = p_account_id OR transaction.destination_account_id = p_account_id)
    AND (
      transaction.payer_id IS NULL
      OR transaction.payer_id = ANY (
        ARRAY(
          SELECT member.id
          FROM public.family_members AS member
          WHERE member.user_id = transaction.user_id
        )
      )
    )
    AND transaction.date <= p_date
    AND transaction.deleted_at IS NULL;

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_initial_balance numeric;
  v_calculated_balance numeric;
BEGIN
  SELECT COALESCE(account.initial_balance, 0)
  INTO v_initial_balance
  FROM public.accounts AS account
  WHERE account.id = p_account_id;

  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN transaction.type = 'INCOME'::public.transaction_type
        AND transaction.account_id = p_account_id THEN transaction.amount
      WHEN transaction.type = 'EXPENSE'::public.transaction_type
        AND transaction.account_id = p_account_id THEN -transaction.amount
      WHEN transaction.type = 'TRANSFER'::public.transaction_type
        AND transaction.account_id = p_account_id
        AND transaction.destination_account_id = p_account_id THEN 0
      WHEN transaction.type = 'TRANSFER'::public.transaction_type
        AND transaction.account_id = p_account_id THEN -transaction.amount
      WHEN transaction.type = 'TRANSFER'::public.transaction_type
        AND transaction.destination_account_id = p_account_id
        THEN COALESCE(transaction.destination_amount, transaction.amount)
      ELSE 0
    END
  ), 0)
  INTO v_calculated_balance
  FROM public.transactions AS transaction
  WHERE (transaction.account_id = p_account_id OR transaction.destination_account_id = p_account_id)
    AND (
      transaction.payer_id IS NULL
      OR transaction.payer_id = ANY (
        ARRAY(
          SELECT member.id
          FROM public.family_members AS member
          WHERE member.user_id = transaction.user_id
        )
      )
    )
    AND transaction.date <= CURRENT_DATE
    AND transaction.deleted_at IS NULL;

  UPDATE public.accounts AS account
  SET balance = v_calculated_balance,
      updated_at = NOW()
  WHERE account.id = p_account_id;

  RETURN v_calculated_balance;
END;
$$;

CREATE OR REPLACE FUNCTION private.pay_credit_card_invoice_atomic(
  p_card_account_id uuid,
  p_source_account_id uuid,
  p_invoice_month date,
  p_invoice_total numeric,
  p_amount numeric,
  p_payment_date date,
  p_idempotency_key uuid,
  p_exchange_rate numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_card record;
  v_source record;
  v_source_currency text;
  v_card_currency text;
  v_payment_amount numeric;
  v_debit_amount numeric;
  v_remaining numeric;
  v_current_total numeric;
  v_invoice_label text;
  v_payment_date date;
  v_reversal_date date;
  v_carryover_month date;
  v_carryover_date date;
  v_expected_count integer;
  v_existing_count integer;
  v_inserted_count integer;
  v_keys text[];
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Payment idempotency key is required' USING ERRCODE = '22004';
  END IF;

  IF p_invoice_month IS NULL
    OR p_invoice_month <> date_trunc('month', p_invoice_month)::date
    OR p_payment_date IS NULL
    OR p_payment_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Invalid invoice or payment date' USING ERRCODE = '22007';
  END IF;

  IF p_invoice_total IS NULL
    OR p_amount IS NULL
    OR p_invoice_total <= 0
    OR p_amount <= 0
    OR p_invoice_total <> round(p_invoice_total, 2)
    OR p_amount <> round(p_amount, 2)
    OR p_amount > p_invoice_total THEN
    RAISE EXCEPTION 'Invalid invoice or payment amount' USING ERRCODE = '22023';
  END IF;

  SELECT account.id, account.user_id, account.name, account.type,
    account.currency, account.is_active, account.is_archived, account.deleted_at
  INTO v_card
  FROM public.accounts AS account
  WHERE account.id = p_card_account_id;

  IF NOT FOUND
    OR v_card.type <> 'CREDIT_CARD'::public.account_type
    OR NOT v_card.is_active
    OR v_card.is_archived
    OR v_card.deleted_at IS NOT NULL
    OR (
      v_card.user_id IS DISTINCT FROM v_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.shared_credit_cards AS shared_card
        WHERE shared_card.account_id = p_card_account_id
          AND shared_card.user_id = v_user_id
          AND shared_card.status = 'ACCEPTED'
      )
    ) THEN
    RAISE EXCEPTION 'Credit card is not available to the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  SELECT account.id, account.user_id, account.type, account.currency,
    account.is_active, account.is_archived, account.deleted_at
  INTO v_source
  FROM public.accounts AS account
  WHERE account.id = p_source_account_id;

  IF NOT FOUND
    OR v_source.user_id IS DISTINCT FROM v_user_id
    OR v_source.type = 'CREDIT_CARD'::public.account_type
    OR NOT v_source.is_active
    OR v_source.is_archived
    OR v_source.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Source account is not available to the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  v_source_currency := COALESCE(v_source.currency, 'BRL');
  v_card_currency := COALESCE(v_card.currency, 'BRL');

  IF v_source_currency IS DISTINCT FROM v_card_currency THEN
    IF v_source_currency <> 'BRL' OR v_card_currency = 'BRL'
      OR p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
      RAISE EXCEPTION 'A positive BRL exchange rate is required for this card payment'
        USING ERRCODE = '22023';
    END IF;
    v_debit_amount := round(p_amount * p_exchange_rate, 2);
  ELSE
    IF p_exchange_rate IS NOT NULL THEN
      RAISE EXCEPTION 'Exchange rate is not valid for accounts with the same currency'
        USING ERRCODE = '22023';
    END IF;
    v_debit_amount := p_amount;
  END IF;

  v_payment_amount := p_amount;
  v_payment_date := p_payment_date;
  v_remaining := round(p_invoice_total - v_payment_amount, 2);
  v_expected_count := CASE WHEN v_remaining > 0 THEN 3 ELSE 1 END;
  v_invoice_label := (ARRAY[
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ])[EXTRACT(MONTH FROM p_invoice_month)::integer]
    || '/' || EXTRACT(YEAR FROM p_invoice_month)::integer::text;
  v_carryover_month := (p_invoice_month + INTERVAL '1 month')::date;
  v_reversal_date := p_invoice_month - 1;
  v_carryover_date := v_carryover_month - 1;
  v_keys := ARRAY[
    p_idempotency_key::text || ':payment',
    p_idempotency_key::text || ':reversal',
    p_idempotency_key::text || ':carryover'
  ];

  PERFORM 1
  FROM public.accounts AS account
  WHERE account.id IN (p_card_account_id, p_source_account_id)
  ORDER BY account.id
  FOR UPDATE;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.transactions AS transaction
  WHERE transaction.user_id = v_user_id
    AND transaction.idempotency_key = ANY(v_keys);

  IF v_existing_count > 0 THEN
    IF v_existing_count <> v_expected_count OR EXISTS (
      SELECT 1
      FROM public.transactions AS transaction
      WHERE transaction.user_id = v_user_id
        AND transaction.idempotency_key = ANY(v_keys)
        AND NOT (
          (transaction.idempotency_key = v_keys[1]
            AND transaction.type = 'TRANSFER'::public.transaction_type
            AND transaction.amount = v_debit_amount
            AND transaction.account_id = p_source_account_id
            AND transaction.destination_account_id = p_card_account_id
            AND transaction.date = v_payment_date
            AND transaction.competence_date = p_invoice_month)
          OR (v_expected_count = 3
            AND transaction.idempotency_key = v_keys[2]
            AND transaction.type = 'TRANSFER'::public.transaction_type
            AND transaction.amount = v_remaining
            AND transaction.account_id = p_card_account_id
            AND transaction.destination_account_id = p_card_account_id
            AND transaction.date = v_reversal_date
            AND transaction.competence_date = p_invoice_month)
          OR (v_expected_count = 3
            AND transaction.idempotency_key = v_keys[3]
            AND transaction.type = 'TRANSFER'::public.transaction_type
            AND transaction.amount = v_remaining
            AND transaction.account_id = p_card_account_id
            AND transaction.destination_account_id = p_card_account_id
            AND transaction.date = v_carryover_date
            AND transaction.competence_date = v_carryover_month)
        )
    ) THEN
      RAISE EXCEPTION 'Payment idempotency key conflicts with another request'
        USING ERRCODE = '23505';
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(transaction) ORDER BY transaction.date, transaction.id), '[]'::jsonb)
    INTO v_result
    FROM public.transactions AS transaction
    WHERE transaction.user_id = v_user_id
      AND transaction.idempotency_key = ANY(v_keys);

    RETURN v_result;
  END IF;

  v_current_total := round(COALESCE((
    public.get_credit_card_invoice(
      p_card_account_id,
      v_user_id,
      p_invoice_month,
      (p_invoice_month + INTERVAL '1 month' - INTERVAL '1 day')::date
    )->>'total'
  )::numeric, 0), 2);

  IF v_current_total <= 0 OR v_current_total <> p_invoice_total THEN
    RAISE EXCEPTION 'Invoice changed; refresh the invoice and retry'
      USING ERRCODE = '40001';
  END IF;

  WITH payment_rows AS (
    SELECT
      'payment'::text AS row_key,
      v_source.id AS account_id,
      v_card.id AS destination_account_id,
      v_debit_amount AS amount,
      'Pagamento Fatura ' || v_card.name || ' - ' || v_invoice_label AS description,
      v_payment_date AS transaction_date,
      p_invoice_month AS competence_date,
      v_source_currency AS currency,
      CASE WHEN v_source_currency = v_card_currency THEN NULL ELSE v_payment_amount END AS destination_amount,
      CASE WHEN v_source_currency = v_card_currency THEN NULL ELSE v_card_currency END AS destination_currency,
      CASE WHEN v_source_currency = v_card_currency THEN NULL ELSE p_exchange_rate END AS exchange_rate
    UNION ALL
    SELECT
      'reversal', v_card.id, v_card.id, v_remaining,
      'Estorno Saldo Rotativo Fatura ' || v_invoice_label,
      v_reversal_date, p_invoice_month, v_card_currency, NULL::numeric, NULL::text, NULL::numeric
    WHERE v_remaining > 0
    UNION ALL
    SELECT
      'carryover', v_card.id, v_card.id, v_remaining,
      'Saldo Rotativo Fatura Anterior (' || v_invoice_label || ')',
      v_carryover_date, v_carryover_month, v_card_currency, NULL::numeric, NULL::text, NULL::numeric
    WHERE v_remaining > 0
  )
  INSERT INTO public.transactions (
    user_id,
    creator_user_id,
    account_id,
    destination_account_id,
    amount,
    description,
    date,
    competence_date,
    type,
    domain,
    currency,
    destination_amount,
    destination_currency,
    exchange_rate,
    idempotency_key
  )
  SELECT
    v_user_id,
    v_user_id,
    payment_rows.account_id,
    payment_rows.destination_account_id,
    payment_rows.amount,
    payment_rows.description,
    payment_rows.transaction_date,
    payment_rows.competence_date,
    'TRANSFER'::public.transaction_type,
    'PERSONAL'::public.transaction_domain,
    payment_rows.currency,
    payment_rows.destination_amount,
    payment_rows.destination_currency,
    payment_rows.exchange_rate,
    p_idempotency_key::text || ':' || payment_rows.row_key
  FROM payment_rows;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count <> v_expected_count THEN
    RAISE EXCEPTION 'Could not write all invoice payment rows'
      USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(transaction) ORDER BY transaction.date, transaction.id), '[]'::jsonb)
  INTO v_result
  FROM public.transactions AS transaction
  WHERE transaction.user_id = v_user_id
    AND transaction.idempotency_key = ANY(v_keys);

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION private.pay_credit_card_invoice_atomic(
  uuid, uuid, date, numeric, numeric, date, uuid, numeric
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION private.pay_credit_card_invoice_atomic(
  uuid, uuid, date, numeric, numeric, date, uuid, numeric
) TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_credit_card_invoice_atomic(
  p_card_account_id uuid,
  p_source_account_id uuid,
  p_invoice_month date,
  p_invoice_total numeric,
  p_amount numeric,
  p_payment_date date,
  p_idempotency_key uuid,
  p_exchange_rate numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.pay_credit_card_invoice_atomic(
    p_card_account_id,
    p_source_account_id,
    p_invoice_month,
    p_invoice_total,
    p_amount,
    p_payment_date,
    p_idempotency_key,
    p_exchange_rate
  );
$$;

REVOKE ALL ON FUNCTION public.pay_credit_card_invoice_atomic(
  uuid, uuid, date, numeric, numeric, date, uuid, numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_credit_card_invoice_atomic(
  uuid, uuid, date, numeric, numeric, date, uuid, numeric
) TO authenticated;
