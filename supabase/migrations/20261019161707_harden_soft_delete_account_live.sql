create or replace function public.soft_delete_account(
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

  perform 1
  from public.accounts
  where id = p_account_id and user_id = v_uid and deleted_at is null
  for update;

  if not found then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.transactions
    where (account_id = p_account_id or destination_account_id = p_account_id)
      and deleted_at is null
  ) then
    raise exception 'Account has active transactions and must be archived' using errcode = '23503';
  end if;
  if exists (
    select 1 from public.goals where linked_account_id = p_account_id
  ) then
    raise exception 'Account has linked goals and must be archived' using errcode = '23503';
  end if;

  update public.accounts
  set deleted_at = now(),
      deleted_by = v_uid,
      is_active = false
  where id = p_account_id and user_id = v_uid;
end;
$$;

revoke all on function public.soft_delete_account(uuid) from public, anon;
grant execute on function public.soft_delete_account(uuid) to authenticated, service_role;
