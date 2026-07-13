create or replace function public.settle_compensated_splits(
  p_split_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_split_id uuid;
  v_split record;
  v_counterparty_id uuid;
  v_expected_counterparty_id uuid;
  v_currency text;
  v_domain public.transaction_domain;
  v_trip_id uuid;
  v_signed_amount numeric;
  v_net_amount numeric := 0;
  v_positive_count integer := 0;
  v_negative_count integer := 0;
  v_processed_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_split_ids is null or cardinality(p_split_ids) = 0 then
    return jsonb_build_object('success', false, 'error', 'Nenhum split fornecido.');
  end if;
  if cardinality(p_split_ids) <> (
    select count(distinct split_id) from unnest(p_split_ids) as split_id
  ) then
    return jsonb_build_object('success', false, 'error', 'A lista contem splits duplicados.');
  end if;

  perform 1
  from public.transaction_splits s
  where s.id = any(p_split_ids)
  order by s.id
  for update;

  if (select count(*) from public.transaction_splits where id = any(p_split_ids))
      <> cardinality(p_split_ids) then
    return jsonb_build_object('success', false, 'error', 'Um ou mais splits nao foram encontrados.');
  end if;

  foreach v_split_id in array p_split_ids loop
    select
      s.*,
      t.user_id as creditor_user_id,
      t.type as transaction_type,
      t.currency as transaction_currency,
      t.domain as transaction_domain,
      t.trip_id as transaction_trip_id,
      t.deleted_at as transaction_deleted_at
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    if v_split.deleted_at is not null or v_split.transaction_deleted_at is not null then
      return jsonb_build_object('success', false, 'error', 'Split removido nao pode ser compensado.');
    end if;
    if v_split.is_settled then
      return jsonb_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' ja foi totalmente liquidado.'
      );
    end if;
    if v_split.user_id is distinct from v_uid
       and v_split.creditor_user_id is distinct from v_uid then
      raise exception 'User is not a participant in split %', v_split_id
        using errcode = '42501';
    end if;
    if v_split.user_id = v_uid and coalesce(v_split.settled_by_debtor, false) then
      return jsonb_build_object('success', false, 'error', 'O pagamento deste split ja foi confirmado.');
    end if;
    if v_split.creditor_user_id = v_uid
       and coalesce(v_split.settled_by_creditor, false) then
      return jsonb_build_object('success', false, 'error', 'O recebimento deste split ja foi confirmado.');
    end if;
    if v_split.transaction_type not in (
      'EXPENSE'::public.transaction_type,
      'INCOME'::public.transaction_type
    ) then
      return jsonb_build_object('success', false, 'error', 'Tipo de transacao invalido para compensacao.');
    end if;

    v_counterparty_id := case
      when v_split.user_id = v_uid then v_split.creditor_user_id
      else v_split.user_id
    end;
    if v_counterparty_id is null or v_counterparty_id = v_uid then
      return jsonb_build_object('success', false, 'error', 'Contraparte vinculada e obrigatoria.');
    end if;

    if v_expected_counterparty_id is null then
      v_expected_counterparty_id := v_counterparty_id;
      v_currency := v_split.transaction_currency;
      v_domain := v_split.transaction_domain;
      v_trip_id := v_split.transaction_trip_id;
    elsif v_counterparty_id is distinct from v_expected_counterparty_id then
      return jsonb_build_object('success', false, 'error', 'Os splits devem pertencer a mesma contraparte.');
    elsif v_split.transaction_currency is distinct from v_currency then
      return jsonb_build_object('success', false, 'error', 'Os splits devem usar a mesma moeda.');
    elsif v_split.transaction_domain is distinct from v_domain
       or v_split.transaction_trip_id is distinct from v_trip_id then
      return jsonb_build_object('success', false, 'error', 'Os splits devem pertencer ao mesmo dominio.');
    end if;

    v_signed_amount := case
      when v_split.creditor_user_id = v_uid
        then case when v_split.transaction_type = 'EXPENSE'::public.transaction_type
          then v_split.amount else -v_split.amount end
      else case when v_split.transaction_type = 'EXPENSE'::public.transaction_type
        then -v_split.amount else v_split.amount end
    end;
    v_net_amount := v_net_amount + v_signed_amount;
    if v_signed_amount > 0 then
      v_positive_count := v_positive_count + 1;
    elsif v_signed_amount < 0 then
      v_negative_count := v_negative_count + 1;
    end if;
  end loop;

  if v_positive_count = 0 or v_negative_count = 0 then
    return jsonb_build_object('success', false, 'error', 'A compensacao exige valores a pagar e a receber.');
  end if;
  if round(v_net_amount, 2) <> 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'O saldo dos splits nao e zero.',
      'net_amount', round(v_net_amount, 2)
    );
  end if;

  foreach v_split_id in array p_split_ids loop
    select s.*, t.user_id as creditor_user_id
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    update public.transaction_splits
    set settled_by_debtor = case
          when v_split.user_id = v_uid then true else settled_by_debtor
        end,
        settled_by_creditor = case
          when v_split.creditor_user_id = v_uid then true else settled_by_creditor
        end,
        is_settled = (
          (case when v_split.user_id = v_uid then true
            else coalesce(settled_by_debtor, false) end)
          and
          (case when v_split.creditor_user_id = v_uid then true
            else coalesce(settled_by_creditor, false) end)
        ),
        settled_at = case
          when (
            (case when v_split.user_id = v_uid then true
              else coalesce(settled_by_debtor, false) end)
            and
            (case when v_split.creditor_user_id = v_uid then true
              else coalesce(settled_by_creditor, false) end)
          ) then now()
          else null
        end
    where id = v_split_id;

    v_processed_count := v_processed_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'counterparty_id', v_expected_counterparty_id,
    'currency', v_currency,
    'net_amount', round(v_net_amount, 2)
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.settle_compensated_splits(uuid[]) from public, anon;
grant execute on function public.settle_compensated_splits(uuid[]) to authenticated, service_role;
