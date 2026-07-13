create or replace function public.request_settlement(
  p_split_ids uuid[],
  p_account_id uuid,
  p_user_id uuid,
  p_is_payment boolean,
  p_amount numeric default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_split_id uuid;
  v_split record;
  v_total_amount numeric := 0;
  v_tx_id uuid;
  v_processed_count integer := 0;
  v_month_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot settle expenses for another user' using errcode = '42501';
  end if;
  if p_split_ids is null or cardinality(p_split_ids) = 0 then
    return json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  end if;
  if cardinality(p_split_ids) <> (
    select count(distinct split_id) from unnest(p_split_ids) as split_id
  ) then
    return json_build_object('success', false, 'error', 'A lista contem splits duplicados.');
  end if;
  if p_amount is not null and p_amount <= 0 then
    return json_build_object('success', false, 'error', 'O valor do acerto deve ser positivo.');
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;

  -- Acquire locks in deterministic order before validating or writing.
  perform 1
  from public.transaction_splits s
  where s.id = any(p_split_ids)
  order by s.id
  for update;

  if (select count(*) from public.transaction_splits where id = any(p_split_ids))
      <> cardinality(p_split_ids) then
    return json_build_object('success', false, 'error', 'Um ou mais splits nao foram encontrados.');
  end if;

  foreach v_split_id in array p_split_ids loop
    select s.*, t.user_id as creditor_user_id
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    if v_split.is_settled then
      return json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' ja foi totalmente liquidado.'
      );
    end if;
    if v_split.user_id is distinct from v_uid
       and v_split.creditor_user_id is distinct from v_uid then
      raise exception 'User is not a participant in split %', v_split_id
        using errcode = '42501';
    end if;

    v_total_amount := v_total_amount + v_split.amount;
  end loop;

  if p_amount is not null then
    v_total_amount := p_amount;
  end if;
  if v_total_amount <= 0 then
    return json_build_object('success', false, 'error', 'O valor do acerto deve ser positivo.');
  end if;

  v_month_name := case extract(month from current_date)
    when 1 then 'Janeiro' when 2 then 'Fevereiro' when 3 then 'Marco'
    when 4 then 'Abril' when 5 then 'Maio' when 6 then 'Junho'
    when 7 then 'Julho' when 8 then 'Agosto' when 9 then 'Setembro'
    when 10 then 'Outubro' when 11 then 'Novembro' when 12 then 'Dezembro'
  end;

  insert into public.transactions (
    user_id, creator_user_id, account_id, amount, type, description, date,
    competence_date, domain, is_shared, created_at, updated_at
  ) values (
    v_uid, v_uid, p_account_id, v_total_amount,
    case when p_is_payment then 'EXPENSE'::public.transaction_type
         else 'INCOME'::public.transaction_type end,
    case when p_is_payment then 'Pagamento de despesa compartilhada - '
         else 'Recebimento de despesa compartilhada - ' end
      || v_month_name || '/' || extract(year from current_date),
    current_date, date_trunc('month', current_date)::date,
    'PERSONAL'::public.transaction_domain, false, now(), now()
  ) returning id into v_tx_id;

  foreach v_split_id in array p_split_ids loop
    select s.*, t.user_id as creditor_user_id
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    if v_split.user_id = v_uid then
      update public.transaction_splits
      set settled_by_debtor = true,
          debtor_settlement_tx_id = v_tx_id
      where id = v_split_id;
    end if;

    if v_split.creditor_user_id = v_uid then
      update public.transaction_splits
      set settled_by_creditor = true,
          creditor_settlement_tx_id = v_tx_id
      where id = v_split_id;
    end if;

    update public.transaction_splits
    set is_settled = (settled_by_debtor = true and settled_by_creditor = true),
        settled_at = case
          when settled_by_debtor = true and settled_by_creditor = true then now()
          else null
        end,
        settled_transaction_id = case
          when settled_by_debtor = true and settled_by_creditor = true then v_tx_id
          else null
        end
    where id = v_split_id;

    v_processed_count := v_processed_count + 1;
  end loop;

  return json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'processed_count', v_processed_count,
    'total_amount', v_total_amount
  );
exception
  when insufficient_privilege then raise;
  when others then
    return json_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.undo_settlement(
  p_split_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_split record;
  v_is_debtor boolean;
  v_is_creditor boolean;
  v_settlement_tx_id uuid;
  v_affected integer := 0;
  v_side_affected integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot undo a settlement for another user' using errcode = '42501';
  end if;

  select s.*, t.user_id as creditor_user_id
  into v_split
  from public.transaction_splits s
  join public.transactions t on t.id = s.transaction_id
  where s.id = p_split_id
  for update of s;

  if v_split is null then
    return jsonb_build_object('success', false, 'error', 'Split nao encontrado.');
  end if;

  v_is_debtor := v_split.user_id = v_uid;
  v_is_creditor := v_split.creditor_user_id = v_uid;
  if not v_is_debtor and not v_is_creditor then
    raise exception 'User is not a participant in this split' using errcode = '42501';
  end if;

  if v_is_debtor then
    v_settlement_tx_id := v_split.debtor_settlement_tx_id;
    if v_settlement_tx_id is not null and not exists (
      select 1 from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid
    ) then
      raise exception 'Settlement transaction ownership mismatch' using errcode = '42501';
    end if;

    if v_settlement_tx_id is null then
      update public.transaction_splits
      set settled_by_debtor = false,
          debtor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where id = p_split_id;
    else
      update public.transaction_splits
      set settled_by_debtor = false,
          debtor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where debtor_settlement_tx_id = v_settlement_tx_id;
    end if;
    get diagnostics v_side_affected = row_count;
    v_affected := v_affected + v_side_affected;

    if v_settlement_tx_id is not null then
      delete from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid;
    end if;
  end if;

  if v_is_creditor then
    v_settlement_tx_id := v_split.creditor_settlement_tx_id;
    if v_settlement_tx_id is not null and not exists (
      select 1 from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid
    ) then
      raise exception 'Settlement transaction ownership mismatch' using errcode = '42501';
    end if;

    if v_settlement_tx_id is null then
      update public.transaction_splits
      set settled_by_creditor = false,
          creditor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where id = p_split_id;
    else
      update public.transaction_splits
      set settled_by_creditor = false,
          creditor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where creditor_settlement_tx_id = v_settlement_tx_id;
    end if;
    get diagnostics v_side_affected = row_count;
    v_affected := v_affected + v_side_affected;

    if v_settlement_tx_id is not null then
      delete from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid;
    end if;
  end if;

  return jsonb_build_object('success', true, 'reverted_count', v_affected);
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.request_settlement(uuid[], uuid, uuid, boolean, numeric) from public, anon;
revoke all on function public.undo_settlement(uuid, uuid) from public, anon;
grant execute on function public.request_settlement(uuid[], uuid, uuid, boolean, numeric) to authenticated, service_role;
grant execute on function public.undo_settlement(uuid, uuid) to authenticated, service_role;

-- Legacy settlement endpoints are not called by the production frontend and
-- still trust caller-supplied identities or lack complete ownership checks.
revoke execute on function public.confirm_settlement(uuid[], uuid, uuid, boolean) from authenticated;
revoke execute on function public.confirm_settlement_receipt(uuid[], uuid, uuid, date, uuid, numeric) from authenticated;
revoke execute on function public.request_settlement_confirmation(uuid[], uuid, uuid, numeric, text) from authenticated;
revoke execute on function public.settle_multiple_splits(uuid[], uuid, uuid) from authenticated;
revoke execute on function public.settle_split(uuid, numeric, uuid, uuid) from authenticated;
revoke execute on function public.unsettle_multiple_splits(uuid[]) from authenticated;
revoke execute on function public.unsettle_split(uuid) from authenticated;

grant execute on function public.confirm_settlement(uuid[], uuid, uuid, boolean) to service_role;
grant execute on function public.confirm_settlement_receipt(uuid[], uuid, uuid, date, uuid, numeric) to service_role;
grant execute on function public.request_settlement_confirmation(uuid[], uuid, uuid, numeric, text) to service_role;
grant execute on function public.settle_multiple_splits(uuid[], uuid, uuid) to service_role;
grant execute on function public.settle_split(uuid, numeric, uuid, uuid) to service_role;
grant execute on function public.unsettle_multiple_splits(uuid[]) to service_role;
grant execute on function public.unsettle_split(uuid) to service_role;
