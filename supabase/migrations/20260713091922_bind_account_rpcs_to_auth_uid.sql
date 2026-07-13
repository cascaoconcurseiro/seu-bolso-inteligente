create or replace function public.assign_default_account_to_orphans(
  p_default_account_id uuid,
  p_user_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot manage transactions for another user' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_default_account_id and user_id = v_uid
  ) then
    raise exception 'Conta padrao nao encontrada';
  end if;

  update public.transactions
  set account_id = p_default_account_id
  where account_id is null and user_id = v_uid;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.migrate_transactions_to_account(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_user_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot manage accounts for another user' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_from_account_id and user_id = v_uid
  ) then
    raise exception 'Conta de origem nao encontrada';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_to_account_id and user_id = v_uid
  ) then
    raise exception 'Conta de destino nao encontrada';
  end if;

  update public.transactions
  set account_id = p_to_account_id
  where account_id = p_from_account_id and user_id = v_uid;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.check_split_access(
  p_transaction_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_user_id is distinct from v_uid then
    return false;
  end if;

  return exists (
    select 1
    from public.transactions t
    where t.id = p_transaction_id
      and (t.user_id = v_uid or t.creator_user_id = v_uid or t.payer_id = v_uid)
  );
end;
$$;

create or replace function public.recalculate_all_balances(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_account_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot recalculate balances for another user' using errcode = '42501';
  end if;

  for v_account_id in
    select id from public.accounts
    where user_id = v_uid and deleted_at is null
  loop
    perform public.calculate_single_account_balance(v_account_id);
  end loop;
end;
$$;

revoke all on function public.assign_default_account_to_orphans(uuid, uuid) from public, anon;
revoke all on function public.migrate_transactions_to_account(uuid, uuid, uuid) from public, anon;
revoke all on function public.check_split_access(uuid, uuid) from public, anon;
revoke all on function public.recalculate_all_balances(uuid) from public, anon;

grant execute on function public.assign_default_account_to_orphans(uuid, uuid) to authenticated, service_role;
grant execute on function public.migrate_transactions_to_account(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.check_split_access(uuid, uuid) to authenticated, service_role;
grant execute on function public.recalculate_all_balances(uuid) to authenticated, service_role;
