create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.authenticated_uid()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

create or replace function public.create_installment_series_v2(p_transactions jsonb)
returns jsonb language sql volatile security definer set search_path = ''
as $$ select public.create_installment_series(p_transactions, private.authenticated_uid()) $$;

create or replace function public.create_transaction_with_splits_v2(
  p_transaction jsonb, p_splits jsonb default '[]'::jsonb
)
returns jsonb language sql volatile security definer set search_path = ''
as $$ select public.create_transaction_with_splits(p_transaction, p_splits, private.authenticated_uid()) $$;

create or replace function public.get_current_shared_debts_v2(
  p_start_date date default null, p_end_date date default null
)
returns table(member_id uuid, currency text, total_credits numeric, total_debits numeric, net_balance numeric)
language sql stable security definer set search_path = ''
as $$ select * from public.get_current_shared_debts(private.authenticated_uid(), p_start_date, p_end_date) $$;

create or replace function public.get_dashboard_summary_v2(p_start_date date, p_end_date date)
returns jsonb language sql stable security definer set search_path = ''
as $$ select public.get_dashboard_summary(private.authenticated_uid(), p_start_date, p_end_date) $$;

create or replace function public.get_monthly_evolution_report_v2(p_months integer)
returns jsonb language sql stable security definer set search_path = ''
as $$ select public.get_monthly_evolution_report(private.authenticated_uid(), p_months) $$;

create or replace function public.get_monthly_financial_summary_v2(p_start_date date, p_end_date date)
returns table(total_balance numeric, total_income numeric, total_expenses numeric, net_savings numeric)
language sql stable security definer set search_path = ''
as $$ select * from public.get_monthly_financial_summary(private.authenticated_uid(), p_start_date, p_end_date) $$;

create or replace function public.get_monthly_projection_v2(
  p_end_date date, p_currency varchar default 'BRL'
)
returns table(
  current_balance numeric, future_income numeric, future_expenses numeric,
  credit_card_invoices numeric, shared_debts numeric, projected_balance numeric
)
language sql stable security definer set search_path = ''
as $$ select * from public.get_monthly_projection(private.authenticated_uid(), p_end_date, p_currency) $$;

create or replace function public.get_net_worth_v2()
returns jsonb language sql stable security definer set search_path = ''
as $$ select public.get_net_worth(private.authenticated_uid()) $$;

create or replace function public.get_shared_expense_summary_by_person_v2(
  p_start_date date, p_end_date date
)
returns jsonb language sql stable security definer set search_path = ''
as $$ select public.get_shared_expense_summary_by_person(private.authenticated_uid(), p_start_date, p_end_date) $$;

create or replace function public.get_shared_invoice_data_v2()
returns jsonb language sql stable security definer set search_path = ''
as $$ select public.get_shared_invoice_data(private.authenticated_uid()) $$;

create or replace function public.get_user_budgets_progress_v2(p_start_date date, p_end_date date)
returns table(
  budget_id uuid, budget_name text, category_id uuid, category_name text,
  category_icon text, budget_amount numeric, spent_amount numeric,
  remaining_amount numeric, percentage_used numeric, currency text, period text
)
language sql stable security definer set search_path = ''
as $$ select * from public.get_user_budgets_progress(private.authenticated_uid(), p_start_date, p_end_date) $$;

create or replace function public.get_user_budgets_progress_with_rollover_v2(
  p_start_date date, p_end_date date
)
returns table(
  budget_id uuid, budget_name text, category_id uuid, category_name text,
  category_icon text, budget_amount numeric, spent_amount numeric,
  remaining_amount numeric, percentage_used numeric, currency text, period text,
  _original_budget numeric, _rollover numeric
)
language sql stable security definer set search_path = ''
as $$ select * from public.get_user_budgets_progress_with_rollover(private.authenticated_uid(), p_start_date, p_end_date) $$;

create or replace function public.get_wealth_evolution_v2(
  p_months integer default 6, p_currency varchar default 'BRL'
)
returns table(month_label text, balance numeric)
language sql stable security definer set search_path = ''
as $$ select * from public.get_wealth_evolution(private.authenticated_uid(), p_months, p_currency) $$;

create or replace function public.request_settlement_v2(
  p_split_ids uuid[], p_account_id uuid, p_is_payment boolean, p_amount numeric default null
)
returns json language sql volatile security definer set search_path = ''
as $$
  select public.request_settlement(
    p_split_ids, p_account_id, private.authenticated_uid(), p_is_payment, p_amount
  )
$$;

create or replace function public.undo_settlement_v2(p_split_id uuid)
returns jsonb language sql volatile security definer set search_path = ''
as $$ select public.undo_settlement(p_split_id, private.authenticated_uid()) $$;

create or replace function public.get_account_balance_at_date_v2(p_account_id uuid, p_date date)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := private.authenticated_uid();
begin
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;
  return public.get_account_balance_at_date(p_account_id, p_date);
end;
$$;

create or replace function public.get_trip_participant_balances_v2(p_trip_id uuid)
returns table(
  participant_id uuid, user_id uuid, name text, paid numeric,
  owes numeric, balance numeric, currency text
)
language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := private.authenticated_uid();
begin
  if not public.is_trip_member(p_trip_id, v_uid) then
    raise exception 'User is not a trip participant' using errcode = '42501';
  end if;
  return query select * from public.get_trip_participant_balances(p_trip_id);
end;
$$;

-- Legacy signatures remain callable only by trusted server code.
revoke execute on function public.create_installment_series(jsonb, uuid) from authenticated;
revoke execute on function public.create_transaction_with_splits(jsonb, jsonb, uuid) from authenticated;
revoke execute on function public.get_current_shared_debts(uuid, date, date) from authenticated;
revoke execute on function public.get_dashboard_summary(uuid, date, date) from authenticated;
revoke execute on function public.get_monthly_evolution_report(uuid, integer) from authenticated;
revoke execute on function public.get_monthly_financial_summary(uuid, date, date) from authenticated;
revoke execute on function public.get_monthly_projection(uuid, date, varchar) from authenticated;
revoke execute on function public.get_net_worth(uuid) from authenticated;
revoke execute on function public.get_shared_expense_summary_by_person(uuid, date, date) from authenticated;
revoke execute on function public.get_shared_invoice_data(uuid) from authenticated;
revoke execute on function public.get_user_budgets_progress(uuid, date, date) from authenticated;
revoke execute on function public.get_user_budgets_progress_with_rollover(uuid, date, date) from authenticated;
revoke execute on function public.get_wealth_evolution(uuid, integer, varchar) from authenticated;
revoke execute on function public.request_settlement(uuid[], uuid, uuid, boolean, numeric) from authenticated;
revoke execute on function public.undo_settlement(uuid, uuid) from authenticated;
revoke execute on function public.get_account_balance_at_date(uuid, date) from authenticated;
revoke execute on function public.get_trip_participant_balances(uuid) from authenticated;

-- Broken or unused legacy ledger APIs must not be exposed to clients.
revoke execute on function public.calculate_balance_between_users(uuid, uuid, text) from authenticated;
revoke execute on function public.calculate_member_balance(uuid, uuid) from authenticated;
revoke execute on function public.settle_balance_between_users(uuid, uuid, uuid) from authenticated;
revoke execute on function public.get_record_history(text, uuid) from authenticated;
revoke execute on function public.suggest_payment_plan(uuid, uuid, numeric, text) from authenticated;
revoke execute on function public.get_pending_splits_for_settlement(uuid, uuid, text) from authenticated;
revoke execute on function public.recalculate_account_balance(uuid) from authenticated;

grant execute on function public.create_installment_series_v2(jsonb) to authenticated, service_role;
grant execute on function public.create_transaction_with_splits_v2(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.get_current_shared_debts_v2(date, date) to authenticated, service_role;
grant execute on function public.get_dashboard_summary_v2(date, date) to authenticated, service_role;
grant execute on function public.get_monthly_evolution_report_v2(integer) to authenticated, service_role;
grant execute on function public.get_monthly_financial_summary_v2(date, date) to authenticated, service_role;
grant execute on function public.get_monthly_projection_v2(date, varchar) to authenticated, service_role;
grant execute on function public.get_net_worth_v2() to authenticated, service_role;
grant execute on function public.get_shared_expense_summary_by_person_v2(date, date) to authenticated, service_role;
grant execute on function public.get_shared_invoice_data_v2() to authenticated, service_role;
grant execute on function public.get_user_budgets_progress_v2(date, date) to authenticated, service_role;
grant execute on function public.get_user_budgets_progress_with_rollover_v2(date, date) to authenticated, service_role;
grant execute on function public.get_wealth_evolution_v2(integer, varchar) to authenticated, service_role;
grant execute on function public.request_settlement_v2(uuid[], uuid, boolean, numeric) to authenticated, service_role;
grant execute on function public.undo_settlement_v2(uuid) to authenticated, service_role;
grant execute on function public.get_account_balance_at_date_v2(uuid, date) to authenticated, service_role;
grant execute on function public.get_trip_participant_balances_v2(uuid) to authenticated, service_role;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all functions in schema public from anon;
