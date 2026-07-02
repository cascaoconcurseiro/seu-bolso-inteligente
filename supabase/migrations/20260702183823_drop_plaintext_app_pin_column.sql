-- PROF-01: remover coluna residual profiles.app_pin (PIN em plaintext).
-- O app usa apenas app_pin_hash (bcrypt). set_pin/clear_pin só zeravam a coluna.

CREATE OR REPLACE FUNCTION public.set_pin(p_pin text, p_require_on_open boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'PIN must be at least 4 digits' USING ERRCODE = 'P0002';
  END IF;

  IF p_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PIN must contain only digits' USING ERRCODE = 'P0003';
  END IF;

  UPDATE profiles
  SET
    app_pin_hash = crypt(p_pin, gen_salt('bf', 8)),
    require_pin_on_open = p_require_on_open
  WHERE id = auth.uid();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_pin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  UPDATE profiles
  SET
    app_pin_hash = NULL,
    require_pin_on_open = false
  WHERE id = auth.uid();

  RETURN true;
END;
$function$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS app_pin;
