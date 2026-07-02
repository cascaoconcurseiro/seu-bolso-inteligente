-- Fase 2 do plano de reorganizacao SSOT (2026-07-01)
-- active_family_members e transactions_ssot rodavam com privilegio de quem criou a view
-- (SECURITY DEFINER implicito de view), nao de quem consulta. Verificado: RLS de
-- transactions/family_members ja cobre compartilhamento familiar e de viagem, entao
-- security_invoker=true nao regride visibilidade -- so passa a respeitar RLS de verdade.

ALTER VIEW public.active_family_members SET (security_invoker = true);
ALTER VIEW public.transactions_ssot SET (security_invoker = true);
