-- Keep transaction ownership immutable for authenticated users while allowing
-- authorized owners, creators and family editors to update linked transactions.
ALTER POLICY transactions_update_authenticated
  ON public.transactions
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR creator_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.family_members fm
      JOIN public.families f ON f.id = fm.family_id
      WHERE fm.user_id = (SELECT auth.uid())
        AND (
          f.owner_id = transactions.user_id
          OR EXISTS (
            SELECT 1
            FROM public.family_members fm2
            WHERE fm2.family_id = f.id
              AND fm2.user_id = transactions.user_id
          )
        )
        AND fm.role IN ('admin'::public.family_role, 'editor'::public.family_role)
    )
  );

CREATE OR REPLACE FUNCTION private.prevent_transaction_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF current_user = 'authenticated' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Transaction ownership cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.prevent_transaction_owner_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_transaction_owner_change ON public.transactions;
CREATE TRIGGER prevent_transaction_owner_change
  BEFORE UPDATE OF user_id ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_transaction_owner_change();
