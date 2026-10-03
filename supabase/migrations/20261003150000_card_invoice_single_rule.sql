-- Regra única de fatura do cartão (decisão do produto em 03/10/2026):
-- 1. Compra feita NO dia do fechamento vai para a PRÓXIMA fatura (>=).
-- 2. Competência de compra de cartão só é calculada no INSERT ou quando data/conta mudam.
--    Editar descrição/categoria nunca move a compra de fatura, mesmo após mudar o closing_day.
-- 3. Parcelas derivam da primeira parcela da série (+N meses), em vez de recalcular
--    a partir de datas deslocadas (que o calendário corta em meses curtos).
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_card_invoice_month(p_account_id uuid, p_date date)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_closing_day integer;
  v_mode text;
  v_month_start date := date_trunc('month', p_date)::date;
  v_closing_date date;
BEGIN
  SELECT a.closing_day, COALESCE(a.closing_day_mode, 'FIXED_DAY')
  INTO v_closing_day, v_mode
  FROM public.accounts a
  WHERE a.id = p_account_id;

  SELECT o.closing_date INTO v_closing_date
  FROM public.credit_card_closing_overrides o
  WHERE o.account_id = p_account_id
    AND o.reference_date = v_month_start;

  IF v_closing_date IS NULL THEN
    v_closing_date := public.get_actual_closing_date(v_month_start, COALESCE(v_closing_day, 1), v_mode);
  END IF;

  IF p_date >= v_closing_date THEN
    RETURN (v_month_start + INTERVAL '1 month')::date;
  END IF;
  RETURN v_month_start;
END;
$$;

REVOKE ALL ON FUNCTION private.get_card_invoice_month(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_credit_card_competence_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type text;
  v_anchor record;
  v_date_or_account_changed boolean := true;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_date_or_account_changed :=
      OLD.date IS DISTINCT FROM NEW.date
      OR OLD.account_id IS DISTINCT FROM NEW.account_id;
  END IF;

  SELECT a.type::text INTO v_account_type
  FROM accounts a
  WHERE a.id = NEW.account_id;

  IF v_account_type = 'CREDIT_CARD' THEN
    IF NOT v_date_or_account_changed AND OLD.competence_date IS NOT NULL THEN
      -- Fatura já atribuída fica travada; só data/conta podem movê-la.
      NEW.competence_date := OLD.competence_date;
      RETURN NEW;
    END IF;

    IF NEW.is_installment = true AND NEW.series_id IS NOT NULL THEN
      IF TG_OP = 'UPDATE' AND NEW.competence_date IS NOT NULL THEN
        -- Edição de parcela: o cliente preserva a competência original da parcela.
        RETURN NEW;
      END IF;

      SELECT t.competence_date, t.current_installment
      INTO v_anchor
      FROM transactions t
      WHERE t.series_id = NEW.series_id
        AND t.user_id = NEW.user_id
        AND t.deleted_at IS NULL
        AND t.competence_date IS NOT NULL
        AND t.current_installment IS NOT NULL
      ORDER BY t.current_installment
      LIMIT 1;

      IF FOUND AND NEW.current_installment IS NOT NULL THEN
        NEW.competence_date := (v_anchor.competence_date
          + make_interval(months => NEW.current_installment - v_anchor.current_installment))::date;
        RETURN NEW;
      END IF;
    END IF;

    NEW.competence_date := private.get_card_invoice_month(NEW.account_id, NEW.date::date);
    RETURN NEW;
  END IF;

  -- Fora do cartão: competência = mês da data.
  IF TG_OP = 'UPDATE' AND v_date_or_account_changed THEN
    NEW.competence_date := date_trunc('month', NEW.date::date)::date;
  ELSIF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
    NEW.competence_date := date_trunc('month', NEW.date::date)::date;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
