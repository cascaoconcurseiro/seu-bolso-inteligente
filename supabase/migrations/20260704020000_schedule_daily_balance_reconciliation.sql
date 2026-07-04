-- Reconciliação diária de saldos: o campo accounts.balance é desnormalizado
-- (atualizado por RPCs/triggers); este job corrige qualquer drift acumulado.
-- 04:00 UTC = 01:00 BRT, fora da janela dos demais jobs.
-- APLICADA em produção via MCP em 04/07/2026.
SELECT cron.schedule(
  'daily-balance-reconciliation',
  '0 4 * * *',
  $$SELECT public.recalculate_all_balances()$$
);
