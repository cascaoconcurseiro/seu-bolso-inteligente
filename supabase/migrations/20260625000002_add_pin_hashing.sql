-- SEC-02: PIN hashing via pgcrypto
-- Replaces plaintext app_pin storage with bcrypt hash
-- Client-side comparison removed; verify_pin RPC is the only way to check

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- New column for hashed PIN (bcrypt)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_pin_hash TEXT;

-- Backfill: hash existing plaintext PINs (skip if pgcrypto functions unavailable)
DO $$
BEGIN
  UPDATE profiles
  SET app_pin_hash = crypt(app_pin, gen_salt('bf', 8))
  WHERE app_pin IS NOT NULL AND app_pin != '' AND app_pin_hash IS NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping PIN backfill: %', SQLERRM;
END;
$$;

-- Clear plaintext after hashing
UPDATE profiles SET app_pin = NULL WHERE app_pin_hash IS NOT NULL;

-- Verify PIN server-side (bcrypt comparison, no plaintext ever exposed)
CREATE OR REPLACE FUNCTION verify_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT app_pin_hash INTO v_pin_hash
  FROM profiles WHERE id = auth.uid();

  IF v_pin_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN crypt(p_pin, v_pin_hash) = v_pin_hash;
END;
$$;

-- Set PIN (hashes before storing, clears plaintext)
CREATE OR REPLACE FUNCTION set_pin(p_pin TEXT, p_require_on_open BOOLEAN DEFAULT true)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    app_pin = NULL,
    require_pin_on_open = p_require_on_open
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

-- Clear PIN
CREATE OR REPLACE FUNCTION clear_pin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  UPDATE profiles
  SET
    app_pin_hash = NULL,
    app_pin = NULL,
    require_pin_on_open = false
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_pin(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_pin() TO authenticated;
