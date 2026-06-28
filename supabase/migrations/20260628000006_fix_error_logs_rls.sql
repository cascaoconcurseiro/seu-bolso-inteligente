-- =========================================================================
-- MIGRATION: Restringir leitura de error_logs (B-20)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- B-20: error_logs tinha USING(true) para SELECT — qualquer authenticated
-- podia ler todos os logs. Agora só admin e o próprio usuário podem ler.
-- =========================================================================

DROP POLICY IF EXISTS "Admins can read all logs" ON public.error_logs;

-- Admin pode ler tudo
CREATE POLICY "Admins can read all logs"
  ON public.error_logs
  FOR SELECT
  USING (public.is_admin());

-- Usuário pode ler seus próprios logs
CREATE POLICY "Users can read their own error logs"
  ON public.error_logs
  FOR SELECT
  USING (auth.uid() = user_id);
