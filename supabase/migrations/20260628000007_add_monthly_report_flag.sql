-- =========================================================================
-- MIGRATION: Adiciona monthly_report_enabled em profiles (FEAT-01)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- Suporte ao relatório mensal por email via Edge Function send-monthly-report
-- =========================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS monthly_report_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.monthly_report_enabled IS 'Usuário optou por receber relatório mensal por email';
