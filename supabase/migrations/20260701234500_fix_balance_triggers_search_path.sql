-- Fix triggers criadas com search_path = '' que referenciam tabelas sem schema-qualifier.
-- As funcoes update_account_balance_on_insert e update_account_balance_on_delete
-- usam SET search_path = '' (boa pratica de seguranca) mas referenciam 'accounts'
-- e 'family_members' sem o prefixo 'public.', causando erro em todo INSERT/DELETE.

CREATE OR REPLACE FUNCTION public.update_account_balance_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.account_id IS NOT NULL
     AND (NEW.payer_id IS NULL OR NEW.payer_id = (SELECT id FROM public.family_members WHERE user_id = NEW.user_id LIMIT 1))
     AND NEW.date <= CURRENT_DATE THEN

    IF NEW.type = 'EXPENSE' THEN
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'INCOME' THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'TRANSFER' THEN
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
      IF NEW.destination_account_id IS NOT NULL THEN
        UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = NOW()
        WHERE id = NEW.destination_account_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_account_balance_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.account_id IS NOT NULL
     AND (OLD.payer_id IS NULL OR OLD.payer_id = (SELECT id FROM public.family_members WHERE user_id = OLD.user_id LIMIT 1))
     AND OLD.date <= CURRENT_DATE THEN

    IF OLD.type = 'EXPENSE' THEN
      UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'INCOME' THEN
      UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'TRANSFER' THEN
      UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
      IF OLD.destination_account_id IS NOT NULL THEN
        UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = NOW()
        WHERE id = OLD.destination_account_id;
      END IF;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;
