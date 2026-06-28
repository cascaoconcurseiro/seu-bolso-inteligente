-- =========================================================================
-- MIGRATION: PIN lockout server-side (anti-brute-force real)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- Problema: lockout anterior era client-side (localStorage) — bypass trivial.
-- Solução: contador de tentativas no banco, lockout real via RLS.
-- =========================================================================

-- Tabela de tentativas de PIN (por usuário)
CREATE TABLE IF NOT EXISTS pin_attempts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_count INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ
);

ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas o próprio usuário (ou SECURITY DEFINER) pode ler
CREATE POLICY "Users can read own pin attempts" ON pin_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Substitui verify_pin com lockout server-side
CREATE OR REPLACE FUNCTION verify_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash TEXT;
  v_locked_until TIMESTAMPTZ;
  v_attempts INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Verificar lockout
  SELECT locked_until INTO v_locked_until
  FROM pin_attempts WHERE user_id = auth.uid();

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RAISE EXCEPTION 'Conta bloqueada temporariamente. Tente novamente em % segundos.',
      EXTRACT(EPOCH FROM (v_locked_until - NOW()))::INT
      USING ERRCODE = 'P0004';
  END IF;

  -- Obter hash
  SELECT app_pin_hash INTO v_pin_hash
  FROM profiles WHERE id = auth.uid();

  IF v_pin_hash IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar PIN
  IF crypt(p_pin, v_pin_hash) = v_pin_hash THEN
    -- Sucesso: resetar tentativas
    DELETE FROM pin_attempts WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  -- Falha: registrar tentativa
  INSERT INTO pin_attempts (user_id, attempt_count, last_attempt_at)
  VALUES (auth.uid(), 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET attempt_count = pin_attempts.attempt_count + 1,
      last_attempt_at = NOW();

  SELECT attempt_count INTO v_attempts
  FROM pin_attempts WHERE user_id = auth.uid();

  -- Lockout após 5 tentativas: 60 segundos
  IF v_attempts >= 5 THEN
    UPDATE pin_attempts
    SET locked_until = NOW() + INTERVAL '60 seconds',
        attempt_count = 0
    WHERE user_id = auth.uid();
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_pin(TEXT) TO authenticated;
