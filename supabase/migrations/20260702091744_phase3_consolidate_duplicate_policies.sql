-- Fase 3c do plano de reorganizacao SSOT (2026-07-01)
-- Consolida policies RLS permissivas duplicadas ou subconjunto (110 avisos do advisor,
-- 30 grupos distintos de tabela+comando). So mexe onde a analise da definicao real
-- (nao so o nome) prova que remove sem mudar comportamento:
--  - Duplicata exata (mesmo qual/with_check)
--  - Subconjunto provado (policy A so cobre o que a policy B ja cobre)
--
-- NAO mexido de proposito (atores genuinamente diferentes, precisa merge cuidadoso,
-- risco > ganho de performance numa app pessoal):
--  - shared_credit_cards (dono vs convidado)
--  - transaction_splits (transaction_splits_manage_ssot usa check_split_access(),
--    logica diferente de "Users can view own splits" -- precisa entender a funcao
--    antes de mexer)
--  - transactions UPDATE (dono vs familiar com role admin/editor)
--  - trip_invitations UPDATE (dono da viagem vs convidado/convidante)

-- accounts SELECT: "Users can view own accounts" e subconjunto de accounts_select_v2
-- (accounts_select_v2 ja inclui "user_id = auth.uid()" sem a condicao extra)
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;

-- asset_transactions: duplicata exata (mesmo qual, ambas FOR ALL)
DROP POLICY IF EXISTS "Users can manage their own asset transactions" ON public.asset_transactions;

-- credit_card_invoices: policy SELECT-only e subconjunto da policy FOR ALL (mesmo qual)
DROP POLICY IF EXISTS "Users can view their own credit card invoices" ON public.credit_card_invoices;

-- error_logs: duplicata exata (so o nome mudou de maiusculo pra minusculo)
DROP POLICY IF EXISTS "users can read own errors" ON public.error_logs;

-- goal_milestones: users_own_milestones e subconjunto de goal_milestones_user_policy
-- (mesmo qual, e a FOR ALL ja cobre tudo)
DROP POLICY IF EXISTS "users_own_milestones" ON public.goal_milestones;

-- notification_preferences: as 3 policies de comando unico sao subconjunto da FOR ALL
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;

-- push_subscriptions: users_own_push_subs e subconjunto de push_subscriptions_user_policy
DROP POLICY IF EXISTS "users_own_push_subs" ON public.push_subscriptions;

-- transaction_auto_share_rules: duplicata exata (mesmo qual, ordem dos operandos trocada)
DROP POLICY IF EXISTS "Users manage own auto share rules" ON public.transaction_auto_share_rules;

-- transactions SELECT: "Users can view own transactions" e subconjunto de
-- transactions_unified_select (que ja inclui "user_id = auth.uid()" no OR)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

-- settlement_reversals: a policy "immutable" (USING false, FOR ALL) so precisa
-- bloquear UPDATE/DELETE de verdade -- em SELECT/INSERT ela e um no-op inofensivo
-- (false OR condicao = condicao), mas aparece como "duplicada" no advisor.
-- Reescrever como 2 policies escopadas (UPDATE, DELETE) elimina a sobreposicao
-- com SELECT/INSERT sem mudar nenhum comportamento (UPDATE/DELETE continuam
-- 100% bloqueados, SELECT/INSERT continuam funcionando exatamente igual).
DROP POLICY IF EXISTS "Settlement reversals are immutable" ON public.settlement_reversals;
CREATE POLICY "Settlement reversals immutable (update)" ON public.settlement_reversals
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Settlement reversals immutable (delete)" ON public.settlement_reversals
  FOR DELETE TO authenticated USING (false);
