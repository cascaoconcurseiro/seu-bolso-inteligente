create or replace function public.calculate_single_account_balance(
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_account_id is null then
    raise exception 'Account ID is required' using errcode = '22004';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;

  update public.accounts
  set balance = (
    select coalesce(sum(case
      when type = 'INCOME'::public.transaction_type then amount
      when type = 'EXPENSE'::public.transaction_type then -amount
      when type = 'TRANSFER'::public.transaction_type
        and destination_account_id = p_account_id then amount
      when type = 'TRANSFER'::public.transaction_type
        and account_id = p_account_id then -amount
      else 0
    end), 0)
    from public.transactions
    where (account_id = p_account_id or destination_account_id = p_account_id)
      and deleted_at is null
  )
  where id = p_account_id and user_id = v_uid;
end;
$$;

create or replace function public.check_account_dependencies(
  p_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_transaction_count integer;
  v_future_installments integer;
  v_open_shared_expenses integer;
  v_linked_goals integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_account_id is null then
    raise exception 'Account ID is required' using errcode = '22004';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;

  select count(*) into v_transaction_count
  from public.transactions
  where (account_id = p_account_id or destination_account_id = p_account_id)
    and deleted_at is null;

  select count(*) into v_future_installments
  from public.transactions
  where account_id = p_account_id
    and date > current_date
    and (series_id is not null or is_recurring = true)
    and deleted_at is null;

  select count(distinct s.id) into v_open_shared_expenses
  from public.transaction_splits s
  join public.transactions t on t.id = s.transaction_id
  where t.account_id = p_account_id
    and t.deleted_at is null
    and s.deleted_at is null
    and coalesce(s.is_settled, false) = false;

  select count(*) into v_linked_goals
  from public.goals
  where linked_account_id = p_account_id;

  return jsonb_build_object(
    'can_delete', (
      v_transaction_count = 0
      and v_open_shared_expenses = 0
      and v_linked_goals = 0
    ),
    'total_transactions', v_transaction_count,
    'future_installments', v_future_installments,
    'open_shared_expenses', v_open_shared_expenses,
    'linked_goals', v_linked_goals
  );
end;
$$;

revoke all on function public.calculate_single_account_balance(uuid) from public, anon, authenticated;
grant execute on function public.calculate_single_account_balance(uuid) to service_role;

revoke all on function public.check_account_dependencies(uuid) from public, anon;
grant execute on function public.check_account_dependencies(uuid) to authenticated, service_role;
