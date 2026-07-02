-- Fase 3b do plano de reorganizacao SSOT (2026-07-01)
-- 31 policies RLS reavaliavam auth.uid() por linha em vez de usar initplan
-- (avaliacao unica por query). Gerado programaticamente a partir da lista
-- exata sinalizada pelo advisor de performance do Supabase (auth_rls_initplan).
-- Transformacao mecanica e segura: auth.uid() e STABLE, (select auth.uid())
-- so muda o momento de avaliacao, nao o resultado.

ALTER POLICY "Users can read their own error logs" ON public.error_logs TO public USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can read own pin attempts" ON public.pin_attempts TO public USING (((select auth.uid()) = user_id));
ALTER POLICY "users can insert own errors" ON public.error_logs TO public WITH CHECK ((((select auth.uid()) = user_id) OR (user_id IS NULL)));
ALTER POLICY "users can read own errors" ON public.error_logs TO public USING (((select auth.uid()) = user_id));
ALTER POLICY "Enable insert for authenticated users only" ON public.audit_log TO authenticated WITH CHECK ((changed_by = (select auth.uid())));
ALTER POLICY "Users can view their own closing overrides via account" ON public.credit_card_closing_overrides TO public USING ((account_id IN ( SELECT accounts.id FROM accounts WHERE (accounts.user_id = (select auth.uid())))));
ALTER POLICY "Users can insert their own closing overrides via account" ON public.credit_card_closing_overrides TO public WITH CHECK ((account_id IN ( SELECT accounts.id FROM accounts WHERE (accounts.user_id = (select auth.uid())))));
ALTER POLICY "Trip owners can update their invitations" ON public.trip_invitations TO authenticated USING ((EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_invitations.trip_id) AND (trips.owner_id = (select auth.uid()))))));
ALTER POLICY "Users can update their own closing overrides via account" ON public.credit_card_closing_overrides TO public USING ((account_id IN ( SELECT accounts.id FROM accounts WHERE (accounts.user_id = (select auth.uid())))));
ALTER POLICY "Users can delete their own closing overrides via account" ON public.credit_card_closing_overrides TO public USING ((account_id IN ( SELECT accounts.id FROM accounts WHERE (accounts.user_id = (select auth.uid())))));
ALTER POLICY goal_milestones_user_policy ON public.goal_milestones TO authenticated USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY push_subscriptions_user_policy ON public.push_subscriptions TO authenticated USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can view their own credit card invoices" ON public.credit_card_invoices TO public USING ((EXISTS ( SELECT 1 FROM accounts WHERE ((accounts.id = credit_card_invoices.account_id) AND (accounts.user_id = (select auth.uid()))))));
ALTER POLICY "Users can manage their own credit card invoices" ON public.credit_card_invoices TO public USING ((EXISTS ( SELECT 1 FROM accounts WHERE ((accounts.id = credit_card_invoices.account_id) AND (accounts.user_id = (select auth.uid()))))));
ALTER POLICY "Owner can manage shared credit cards" ON public.shared_credit_cards TO public USING ((EXISTS ( SELECT 1 FROM accounts WHERE ((accounts.id = shared_credit_cards.account_id) AND (accounts.user_id = (select auth.uid()))))));
ALTER POLICY "Invitee can view and update their own invites" ON public.shared_credit_cards TO public USING ((user_id = (select auth.uid())));
ALTER POLICY "Invitee can update their own invites" ON public.shared_credit_cards TO public USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "Users can view own splits" ON public.transaction_splits TO public USING ((((transaction_id IN ( SELECT transactions.id FROM transactions WHERE ((transactions.user_id = (select auth.uid())) AND (transactions.deleted_at IS NULL)))) OR (user_id = (select auth.uid()))) AND (deleted_at IS NULL)));
ALTER POLICY "Users can view own categories" ON public.categories TO public USING (((user_id = (select auth.uid())) AND (deleted_at IS NULL)));
ALTER POLICY "Users can view own audit log" ON public.audit_log TO public USING ((changed_by = (select auth.uid())));
ALTER POLICY "Users can view own balance changes" ON public.balance_changes TO authenticated USING ((account_id IN ( SELECT accounts.id FROM accounts WHERE (accounts.user_id = (select auth.uid())))));
ALTER POLICY "Users can manage own reconciliations" ON public.account_reconciliations TO authenticated USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "Users can manage own asset transactions" ON public.asset_transactions TO public USING ((user_id = (select auth.uid())));
ALTER POLICY "Users can manage own auto share rules" ON public.transaction_auto_share_rules TO public USING ((user_id = (select auth.uid())));
ALTER POLICY "Users can manage own notification preferences" ON public.notification_preferences TO public USING ((user_id = (select auth.uid())));
ALTER POLICY "Users manage own auto share rules" ON public.transaction_auto_share_rules TO public USING (((select auth.uid()) = user_id));
ALTER POLICY trip_members_select ON public.trip_members TO public USING (((user_id = (select auth.uid())) OR is_trip_member(trip_id, (select auth.uid())) OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (select auth.uid())))))));
ALTER POLICY trip_members_update ON public.trip_members TO public USING (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (select auth.uid())))))));
ALTER POLICY trip_members_delete ON public.trip_members TO public USING (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (select auth.uid())))))));
ALTER POLICY users_own_milestones ON public.goal_milestones TO public USING (((select auth.uid()) = user_id));
ALTER POLICY users_own_push_subs ON public.push_subscriptions TO public USING (((select auth.uid()) = user_id));
