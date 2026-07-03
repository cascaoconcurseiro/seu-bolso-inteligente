-- PostgREST precisa que o role anon tenha EXECUTE para incluir funções no schema
-- cache de forma confiável. Todas as funções abaixo já verificam auth.uid() ou
-- is_admin() internamente — chamadas anônimas falham com "Não autenticado".
-- Corrige o 404 em create_installment_series e previne o mesmo em outras RPCs.

-- === Funções com auth.uid() interno ===
GRANT EXECUTE ON FUNCTION public.clear_pin() TO anon;
GRANT EXECUTE ON FUNCTION public.set_pin(text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(text) TO anon;
GRANT EXECUTE ON FUNCTION public.contribute_to_goal(uuid, numeric, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_account_with_balance(text, text, numeric, text, text, text, boolean, integer, integer, numeric, numeric, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.create_installment_series(jsonb, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_installment_series(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_respond_family_invitation(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_respond_trip_invitation(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_family_consolidated_summary(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_evolution_report(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_net_worth(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_expense_summary_by_person(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_invoice_data(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_as_paid_by_debtor(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_as_received_by_creditor(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.recalculate_all_balances(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.restore_transaction(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.search_transactions(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_account(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_transaction(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_error_report(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric, text, date, numeric, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.unsettle_multiple_splits(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.unsettle_split(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.withdraw_from_account(uuid, numeric, text, date) TO anon;

-- === Funções com is_admin() interno ===
GRANT EXECUTE ON FUNCTION public.get_admin_system_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users_detailed() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_error_logs() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_user_dossier(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_error_report(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.clean_old_audit_logs(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_all_data() TO anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_single_user(uuid) TO anon;

-- === Funções com p_user_id (sem auth check explícito, mas seguro para routing) ===
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_shared_debts(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_account_balance_at_date(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_projection(uuid, date, character varying) TO anon;
GRANT EXECUTE ON FUNCTION public.get_wealth_evolution(uuid, integer, character varying) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_budgets_progress_with_rollover(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_record_history(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pending_splits_for_settlement(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.assign_default_account_to_orphans(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_account_dependencies(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.migrate_transactions_to_account(uuid, uuid, uuid) TO anon;

-- === Funções de settlement ===
GRANT EXECUTE ON FUNCTION public.confirm_settlement(uuid[], uuid, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_settlement_receipt(uuid[], uuid, uuid, date, uuid, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_settlement_request(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_settlement(uuid[], uuid, uuid, boolean, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.request_settlement_confirmation(uuid[], uuid, uuid, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.settle_multiple_splits(uuid[], uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.settle_partial_balance(uuid, uuid, numeric, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.settle_split(uuid, numeric, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.suggest_payment_plan(uuid, uuid, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.undo_settlement(uuid, uuid) TO anon;

NOTIFY pgrst, 'reload schema';
