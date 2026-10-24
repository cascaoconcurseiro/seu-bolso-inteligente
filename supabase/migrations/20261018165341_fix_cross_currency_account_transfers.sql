CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_exchange_rate numeric DEFAULT NULL,
  p_destination_amount numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_from public.accounts%ROWTYPE;
  v_to public.accounts%ROWTYPE;
  v_from_currency text;
  v_to_currency text;
  v_effective_date date := COALESCE(p_date, CURRENT_DATE);
  v_expected_destination_amount numeric;
  v_destination_amount numeric;
  v_transaction_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  IF p_from_account_id IS NULL
    OR p_to_account_id IS NULL
    OR p_from_account_id = p_to_account_id THEN
    RETURN json_build_object('success', false, 'error', 'Contas de origem e destino devem ser diferentes');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
    RETURN json_build_object('success', false, 'error', 'Valor de origem inválido');
  END IF;

  PERFORM 1
  FROM public.accounts AS account
  WHERE account.id IN (p_from_account_id, p_to_account_id)
  ORDER BY account.id
  FOR UPDATE;

  SELECT account.* INTO v_from
  FROM public.accounts AS account
  WHERE account.id = p_from_account_id;

  SELECT account.* INTO v_to
  FROM public.accounts AS account
  WHERE account.id = p_to_account_id;

  IF v_from.id IS NULL OR v_from.user_id IS DISTINCT FROM v_user_id
    OR NOT v_from.is_active OR COALESCE(v_from.is_archived, false)
    OR v_from.deleted_at IS NOT NULL
    OR v_to.id IS NULL OR v_to.user_id IS DISTINCT FROM v_user_id
    OR NOT v_to.is_active OR COALESCE(v_to.is_archived, false)
    OR v_to.deleted_at IS NOT NULL
    OR v_from.type = 'CREDIT_CARD'::public.account_type
    OR v_to.type = 'CREDIT_CARD'::public.account_type THEN
    RETURN json_build_object('success', false, 'error', 'Conta de origem ou destino indisponível');
  END IF;

  IF COALESCE(v_from.balance, 0) < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente na conta de origem');
  END IF;

  v_from_currency := COALESCE(v_from.currency, 'BRL');
  v_to_currency := COALESCE(v_to.currency, 'BRL');

  IF v_from_currency = v_to_currency
    OR ((v_from_currency = 'BRL') = (v_to_currency = 'BRL')) THEN
    RETURN json_build_object('success', false, 'error', 'A transferência exige moedas diferentes e BRL em uma das contas');
  END IF;

  IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Taxa de câmbio inválida');
  END IF;

  v_expected_destination_amount := CASE
    WHEN v_from_currency = 'BRL' THEN round(p_amount / p_exchange_rate, 2)
    ELSE round(p_amount * p_exchange_rate, 2)
  END;
  v_destination_amount := COALESCE(p_destination_amount, v_expected_destination_amount);

  IF v_destination_amount <= 0
    OR v_destination_amount <> v_expected_destination_amount THEN
    RETURN json_build_object('success', false, 'error', 'Valor de destino incompatível com a taxa de câmbio');
  END IF;

  INSERT INTO public.transactions (
    user_id,
    creator_user_id,
    account_id,
    destination_account_id,
    type,
    amount,
    destination_amount,
    currency,
    destination_currency,
    exchange_rate,
    description,
    date,
    competence_date,
    domain
  ) VALUES (
    v_user_id,
    v_user_id,
    p_from_account_id,
    p_to_account_id,
    'TRANSFER'::public.transaction_type,
    p_amount,
    v_destination_amount,
    v_from_currency,
    v_to_currency,
    p_exchange_rate,
    COALESCE(p_description, 'Transferência entre contas'),
    v_effective_date,
    date_trunc('month', v_effective_date)::date,
    'PERSONAL'::public.transaction_domain
  )
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'from_account_id', p_from_account_id,
    'to_account_id', p_to_account_id,
    'source_amount', p_amount,
    'destination_amount', v_destination_amount,
    'exchange_rate', p_exchange_rate
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.transfer_between_accounts(
  uuid, uuid, numeric, text, date, numeric, numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_between_accounts(
  uuid, uuid, numeric, text, date, numeric, numeric
) TO authenticated, service_role;
