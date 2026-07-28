-- Atomic replacement for the former client-side UPDATE -> DELETE splits ->
-- INSERT splits sequence. This is additive so the database migration can be
-- deployed before the frontend starts calling the new RPC.
create or replace function public.update_transaction_with_splits_v1(
  p_transaction_id uuid,
  p_transaction jsonb,
  p_splits jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_transaction public.transactions%rowtype;
  v_member public.family_members%rowtype;
  v_split jsonb;
  v_normalized_splits jsonb := '[]'::jsonb;
  v_unknown_key text;
  v_member_identifier uuid;
  v_percentage numeric;
  v_percentage_sum numeric := 0;
  v_input_amount numeric;
  v_input_amount_sum numeric := 0;
  v_all_amounts_provided boolean := true;
  v_new_amount numeric;
  v_allocated_amount numeric := 0;
  v_split_amount numeric;
  v_split_count integer;
  v_split_index integer := 0;
  v_owner_member_id uuid;
  v_payer_member_id uuid;
  v_related_member_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_transaction_id is null then
    raise exception 'Transaction id is required' using errcode = '22004';
  end if;

  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then
    raise exception 'Transaction patch must be a JSON object' using errcode = '22023';
  end if;

  select key
  into v_unknown_key
  from jsonb_object_keys(p_transaction) as keys(key)
  where key <> all (array[
    'account_id', 'destination_account_id', 'category_id', 'trip_id',
    'amount', 'description', 'date', 'competence_date', 'type', 'currency',
    'domain', 'is_shared', 'payer_id', 'is_installment',
    'current_installment', 'total_installments', 'series_id', 'notes',
    'exchange_rate', 'destination_amount', 'destination_currency',
    'related_member_id', 'is_refund', 'refund_of_transaction_id',
    'is_recurring', 'recurrence_pattern', 'frequency', 'recurrence_day',
    'status', 'enable_notification', 'notification_date'
  ]::text[])
  limit 1;

  if v_unknown_key is not null then
    raise exception 'Transaction field is not editable: %', v_unknown_key
      using errcode = '22023';
  end if;

  select *
  into v_transaction
  from public.transactions
  where id = p_transaction_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;

  if not (
    (
      v_transaction.user_id = v_uid
      and v_transaction.source_transaction_id is null
    )
    or v_transaction.creator_user_id = v_uid
    or exists (
      select 1
      from public.family_members actor
      join public.families family on family.id = actor.family_id
      where (actor.user_id = v_uid or actor.linked_user_id = v_uid)
        and actor.status = 'active'
        and actor.role in (
          'admin'::public.family_role,
          'editor'::public.family_role
        )
        and (
          family.owner_id = v_transaction.user_id
          or exists (
            select 1
            from public.family_members owner_member
            where owner_member.family_id = family.id
              and (
                owner_member.user_id = v_transaction.user_id
                or owner_member.linked_user_id = v_transaction.user_id
              )
          )
        )
    )
  ) then
    raise exception 'Not allowed to edit this transaction' using errcode = '42501';
  end if;

  -- Lock the current split set before checking settlement state. A concurrent
  -- settlement cannot slip between this check and the replacement below.
  perform 1
  from public.transaction_splits
  where transaction_id = p_transaction_id
    and deleted_at is null
  for update;

  if v_transaction.is_settled
    or exists (
      select 1
      from public.transaction_splits split
      where split.transaction_id = p_transaction_id
        and split.deleted_at is null
        and (
          split.is_settled
          or coalesce(split.settled_by_debtor, false)
          or coalesce(split.settled_by_creditor, false)
          or split.settled_transaction_id is not null
          or split.debtor_settlement_tx_id is not null
          or split.creditor_settlement_tx_id is not null
        )
    )
  then
    raise exception
      'Esta transacao possui acertos. Desfaca os acertos antes de edita-la.'
      using errcode = '55000';
  end if;

  v_new_amount := case
    when p_transaction ? 'amount' then (p_transaction->>'amount')::numeric
    else v_transaction.amount
  end;

  if v_new_amount is null or v_new_amount <= 0 then
    raise exception 'Transaction amount must be greater than zero'
      using errcode = '22023';
  end if;

  if p_transaction ? 'description'
    and nullif(btrim(p_transaction->>'description'), '') is null
  then
    raise exception 'Transaction description is required' using errcode = '22023';
  end if;

  if p_transaction ? 'account_id'
    and nullif(p_transaction->>'account_id', '') is not null
    and not exists (
      select 1 from public.accounts
      where id = (p_transaction->>'account_id')::uuid
        and user_id = v_transaction.user_id
        and deleted_at is null
    )
  then
    raise exception 'Account does not belong to the transaction owner'
      using errcode = '42501';
  end if;

  if p_transaction ? 'destination_account_id'
    and nullif(p_transaction->>'destination_account_id', '') is not null
    and not exists (
      select 1 from public.accounts
      where id = (p_transaction->>'destination_account_id')::uuid
        and user_id = v_transaction.user_id
        and deleted_at is null
    )
  then
    raise exception 'Destination account does not belong to the transaction owner'
      using errcode = '42501';
  end if;

  if p_transaction ? 'category_id'
    and nullif(p_transaction->>'category_id', '') is not null
    and not exists (
      select 1 from public.categories
      where id = (p_transaction->>'category_id')::uuid
        and user_id = v_transaction.user_id
        and deleted_at is null
    )
  then
    raise exception 'Category does not belong to the transaction owner'
      using errcode = '42501';
  end if;

  if p_transaction ? 'trip_id'
    and nullif(p_transaction->>'trip_id', '') is not null
    and not (
      public.is_trip_member((p_transaction->>'trip_id')::uuid, v_uid)
      or exists (
        select 1 from public.trips
        where id = (p_transaction->>'trip_id')::uuid
          and owner_id = v_uid
      )
    )
  then
    raise exception 'User is not a participant of this trip' using errcode = '42501';
  end if;

  if p_transaction ? 'payer_id'
    and nullif(p_transaction->>'payer_id', '') is not null
  then
    select member.id
    into v_payer_member_id
    from public.family_members member
    join public.families family on family.id = member.family_id
    where (
        member.id = (p_transaction->>'payer_id')::uuid
        or member.linked_user_id = (p_transaction->>'payer_id')::uuid
      )
      and member.status = 'active'
      and (
        family.owner_id = v_transaction.user_id
        or exists (
          select 1
          from public.family_members owner_member
          where owner_member.family_id = family.id
            and (
              owner_member.user_id = v_transaction.user_id
              or owner_member.linked_user_id = v_transaction.user_id
            )
        )
      )
    order by (member.id = (p_transaction->>'payer_id')::uuid) desc
    limit 1;

    if v_payer_member_id is null then
      raise exception 'Payer is invalid or outside the transaction family'
        using errcode = '42501';
    end if;
  end if;

  if p_transaction ? 'related_member_id'
    and nullif(p_transaction->>'related_member_id', '') is not null
  then
    select member.id
    into v_related_member_id
    from public.family_members member
    join public.families family on family.id = member.family_id
    where (
        member.id = (p_transaction->>'related_member_id')::uuid
        or member.linked_user_id = (p_transaction->>'related_member_id')::uuid
      )
      and member.status = 'active'
      and (
        family.owner_id = v_transaction.user_id
        or exists (
          select 1
          from public.family_members owner_member
          where owner_member.family_id = family.id
            and (
              owner_member.user_id = v_transaction.user_id
              or owner_member.linked_user_id = v_transaction.user_id
            )
        )
      )
    order by (member.id = (p_transaction->>'related_member_id')::uuid) desc
    limit 1;

    if v_related_member_id is null then
      raise exception 'Related member is invalid or outside the transaction family'
        using errcode = '42501';
    end if;
  end if;

  update public.transactions
  set
    account_id = case when p_transaction ? 'account_id'
      then nullif(p_transaction->>'account_id', '')::uuid else account_id end,
    destination_account_id = case when p_transaction ? 'destination_account_id'
      then nullif(p_transaction->>'destination_account_id', '')::uuid
      else destination_account_id end,
    category_id = case when p_transaction ? 'category_id'
      then nullif(p_transaction->>'category_id', '')::uuid else category_id end,
    trip_id = case when p_transaction ? 'trip_id'
      then nullif(p_transaction->>'trip_id', '')::uuid else trip_id end,
    amount = v_new_amount,
    description = case when p_transaction ? 'description'
      then btrim(p_transaction->>'description') else description end,
    date = case when p_transaction ? 'date'
      then (p_transaction->>'date')::date else date end,
    competence_date = case when p_transaction ? 'competence_date'
      then (p_transaction->>'competence_date')::date else competence_date end,
    type = case when p_transaction ? 'type'
      then (p_transaction->>'type')::public.transaction_type else type end,
    currency = case when p_transaction ? 'currency'
      then nullif(p_transaction->>'currency', '') else currency end,
    domain = case when p_transaction ? 'domain'
      then (p_transaction->>'domain')::public.transaction_domain else domain end,
    is_shared = case when p_transaction ? 'is_shared'
      then (p_transaction->>'is_shared')::boolean else is_shared end,
    payer_id = case when p_transaction ? 'payer_id'
      then v_payer_member_id else payer_id end,
    is_installment = case when p_transaction ? 'is_installment'
      then (p_transaction->>'is_installment')::boolean else is_installment end,
    current_installment = case when p_transaction ? 'current_installment'
      then nullif(p_transaction->>'current_installment', '')::integer
      else current_installment end,
    total_installments = case when p_transaction ? 'total_installments'
      then nullif(p_transaction->>'total_installments', '')::integer
      else total_installments end,
    series_id = case when p_transaction ? 'series_id'
      then nullif(p_transaction->>'series_id', '')::uuid else series_id end,
    notes = case when p_transaction ? 'notes'
      then nullif(p_transaction->>'notes', '') else notes end,
    exchange_rate = case when p_transaction ? 'exchange_rate'
      then nullif(p_transaction->>'exchange_rate', '')::numeric else exchange_rate end,
    destination_amount = case when p_transaction ? 'destination_amount'
      then nullif(p_transaction->>'destination_amount', '')::numeric
      else destination_amount end,
    destination_currency = case when p_transaction ? 'destination_currency'
      then nullif(p_transaction->>'destination_currency', '')
      else destination_currency end,
    related_member_id = case when p_transaction ? 'related_member_id'
      then v_related_member_id else related_member_id end,
    is_refund = case when p_transaction ? 'is_refund'
      then (p_transaction->>'is_refund')::boolean else is_refund end,
    refund_of_transaction_id = case when p_transaction ? 'refund_of_transaction_id'
      then nullif(p_transaction->>'refund_of_transaction_id', '')::uuid
      else refund_of_transaction_id end,
    is_recurring = case when p_transaction ? 'is_recurring'
      then (p_transaction->>'is_recurring')::boolean else is_recurring end,
    recurrence_pattern = case
      when p_transaction ? 'recurrence_pattern'
        then nullif(p_transaction->>'recurrence_pattern', '')
      when p_transaction ? 'frequency'
        then nullif(p_transaction->>'frequency', '')
      else recurrence_pattern end,
    frequency = case when p_transaction ? 'frequency'
      then nullif(p_transaction->>'frequency', '') else frequency end,
    recurrence_day = case when p_transaction ? 'recurrence_day'
      then nullif(p_transaction->>'recurrence_day', '')::integer
      else recurrence_day end,
    status = case when p_transaction ? 'status'
      then p_transaction->>'status' else status end,
    enable_notification = case when p_transaction ? 'enable_notification'
      then (p_transaction->>'enable_notification')::boolean
      else enable_notification end,
    notification_date = case when p_transaction ? 'notification_date'
      then nullif(p_transaction->>'notification_date', '')::date
      else notification_date end,
    updated_at = now()
  where id = p_transaction_id
  returning * into v_transaction;

  if p_splits is not null then
    if jsonb_typeof(p_splits) <> 'array' then
      raise exception 'Splits must be a JSON array' using errcode = '22023';
    end if;

    for v_split in
      select value from jsonb_array_elements(p_splits)
    loop
      if jsonb_typeof(v_split) <> 'object'
        or nullif(v_split->>'member_id', '') is null
      then
        raise exception 'Every split must contain a member_id'
          using errcode = '22023';
      end if;

      v_member_identifier := (v_split->>'member_id')::uuid;
      v_percentage := (v_split->>'percentage')::numeric;

      if v_percentage is null or v_percentage <= 0 or v_percentage > 100 then
        raise exception 'Split percentage must be greater than 0 and at most 100'
          using errcode = '22023';
      end if;

      select member.*
      into v_member
      from public.family_members member
      join public.families family on family.id = member.family_id
      where (
          member.id = v_member_identifier
          or member.linked_user_id = v_member_identifier
        )
        and member.status = 'active'
        and (
          family.owner_id = v_transaction.user_id
          or exists (
            select 1
            from public.family_members owner_member
            where owner_member.family_id = family.id
              and (
                owner_member.user_id = v_transaction.user_id
                or owner_member.linked_user_id = v_transaction.user_id
              )
          )
        )
      order by (member.id = v_member_identifier) desc
      limit 1;

      if not found then
        raise exception 'Split member is invalid or outside the transaction family'
          using errcode = '42501';
      end if;

      if exists (
        select 1
        from jsonb_array_elements(v_normalized_splits) normalized
        where normalized->>'member_id' = v_member.id::text
      ) then
        raise exception 'A member cannot appear in more than one split'
          using errcode = '22023';
      end if;

      if v_split ? 'amount' and nullif(v_split->>'amount', '') is not null then
        v_input_amount := (v_split->>'amount')::numeric;
        if v_input_amount < 0 or v_input_amount > v_new_amount then
          raise exception 'Split amount is outside the transaction amount'
            using errcode = '22023';
        end if;
        v_input_amount_sum := v_input_amount_sum + v_input_amount;
      else
        v_all_amounts_provided := false;
      end if;

      v_percentage_sum := v_percentage_sum + v_percentage;
      if v_percentage_sum > 100.000001 then
        raise exception 'Split percentages cannot exceed 100'
          using errcode = '22023';
      end if;

      v_normalized_splits := v_normalized_splits || jsonb_build_array(
        jsonb_build_object(
          'member_id', v_member.id,
          'user_id', coalesce(v_member.linked_user_id, v_member.user_id),
          'name', v_member.name,
          'percentage', v_percentage
        )
      );
    end loop;

    if jsonb_array_length(v_normalized_splits) > 0
      and v_percentage_sum < 99.999999
    then
      select member.id
      into v_owner_member_id
      from public.family_members member
      join public.families family on family.id = member.family_id
      where (
          member.user_id = v_transaction.user_id
          or member.linked_user_id = v_transaction.user_id
        )
        and member.status = 'active'
        and (
          family.owner_id = v_transaction.user_id
          or exists (
            select 1
            from public.family_members owner_member
            where owner_member.family_id = family.id
              and (
                owner_member.user_id = v_transaction.user_id
                or owner_member.linked_user_id = v_transaction.user_id
              )
          )
        )
      limit 1;

      if v_owner_member_id is null then
        raise exception 'Split percentages must total 100'
          using errcode = '22023';
      end if;

      if exists (
        select 1
        from jsonb_array_elements(v_normalized_splits) normalized
        where normalized->>'member_id' = v_owner_member_id::text
      ) then
        raise exception 'Split percentages must total 100'
          using errcode = '22023';
      end if;

      select member.*
      into v_member
      from public.family_members member
      where member.id = v_owner_member_id;

      v_normalized_splits := v_normalized_splits || jsonb_build_array(
        jsonb_build_object(
          'member_id', v_member.id,
          'user_id', coalesce(v_member.linked_user_id, v_member.user_id),
          'name', v_member.name,
          'percentage', 100 - v_percentage_sum
        )
      );
      v_percentage_sum := 100;
      v_all_amounts_provided := false;
    end if;

    if jsonb_array_length(v_normalized_splits) > 0
      and abs(v_percentage_sum - 100) > 0.000001
    then
      raise exception 'Split percentages must total 100'
        using errcode = '22023';
    end if;

    if v_all_amounts_provided
      and jsonb_array_length(v_normalized_splits) > 0
      and abs(v_input_amount_sum - v_new_amount) > 0.01
    then
      raise exception 'Split amounts must total the transaction amount'
        using errcode = '22023';
    end if;

    delete from public.transaction_splits
    where transaction_id = p_transaction_id
      and deleted_at is null;

    v_split_count := jsonb_array_length(v_normalized_splits);
    for v_split in
      select value from jsonb_array_elements(v_normalized_splits)
    loop
      v_split_index := v_split_index + 1;
      if v_split_index = v_split_count then
        v_split_amount := v_new_amount - v_allocated_amount;
      else
        v_split_amount := round(
          v_new_amount * (v_split->>'percentage')::numeric / 100,
          2
        );
        v_allocated_amount := v_allocated_amount + v_split_amount;
      end if;

      insert into public.transaction_splits (
        transaction_id,
        member_id,
        user_id,
        percentage,
        amount,
        name,
        is_settled,
        settled_by_debtor,
        settled_by_creditor
      )
      values (
        p_transaction_id,
        (v_split->>'member_id')::uuid,
        nullif(v_split->>'user_id', '')::uuid,
        (v_split->>'percentage')::numeric,
        v_split_amount,
        v_split->>'name',
        false,
        false,
        false
      );
    end loop;
  end if;

  return to_jsonb(v_transaction);
end;
$$;

revoke all on function public.update_transaction_with_splits_v1(uuid, jsonb, jsonb)
  from public, anon, service_role;
grant execute on function public.update_transaction_with_splits_v1(uuid, jsonb, jsonb)
  to authenticated;

comment on function public.update_transaction_with_splits_v1(uuid, jsonb, jsonb) is
  'Atomically validates and updates a transaction and optionally replaces its unsettled splits.';

notify pgrst, 'reload schema';
