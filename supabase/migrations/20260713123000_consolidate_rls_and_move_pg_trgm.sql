-- Keep extension objects outside the API-exposed public schema.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- admin_users is consumed only through audited SECURITY DEFINER admin RPCs.
revoke all on table public.admin_users from anon, authenticated;
drop policy if exists admin_users_no_direct_client_access on public.admin_users;
create policy admin_users_no_direct_client_access
on public.admin_users for all to authenticated
using (false) with check (false);

-- error_logs SELECT: own rows or administrator, evaluated once.
drop policy if exists "Admins can read all logs" on public.error_logs;
drop policy if exists "Users can read their own error logs" on public.error_logs;
create policy error_logs_select_authenticated
on public.error_logs for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

-- shared_credit_cards: preserve owner management and invitee read/update access
-- without overlapping ALL, SELECT and UPDATE policies.
drop policy if exists "Owner can manage shared credit cards" on public.shared_credit_cards;
drop policy if exists "Invitee can view and update their own invites" on public.shared_credit_cards;
drop policy if exists "Invitee can update their own invites" on public.shared_credit_cards;

create policy shared_credit_cards_select_authenticated
on public.shared_credit_cards for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.accounts
    where accounts.id = shared_credit_cards.account_id
      and accounts.user_id = (select auth.uid())
  )
);

create policy shared_credit_cards_insert_owner
on public.shared_credit_cards for insert to authenticated
with check (
  exists (
    select 1 from public.accounts
    where accounts.id = shared_credit_cards.account_id
      and accounts.user_id = (select auth.uid())
  )
);

create policy shared_credit_cards_update_authenticated
on public.shared_credit_cards for update to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.accounts
    where accounts.id = shared_credit_cards.account_id
      and accounts.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.accounts
    where accounts.id = shared_credit_cards.account_id
      and accounts.user_id = (select auth.uid())
  )
);

create policy shared_credit_cards_delete_owner
on public.shared_credit_cards for delete to authenticated
using (
  exists (
    select 1 from public.accounts
    where accounts.id = shared_credit_cards.account_id
      and accounts.user_id = (select auth.uid())
  )
);

-- transaction_splits: split the old ALL policy by command and merge SELECT.
drop policy if exists transaction_splits_manage_ssot on public.transaction_splits;
drop policy if exists "Users can view own splits" on public.transaction_splits;

create policy transaction_splits_select_authenticated
on public.transaction_splits for select to authenticated
using (
  user_id = (select auth.uid())
  or public.check_split_access(transaction_id, (select auth.uid()))
  or (
    deleted_at is null
    and transaction_id in (
      select transactions.id from public.transactions
      where transactions.user_id = (select auth.uid())
        and transactions.deleted_at is null
    )
  )
);

create policy transaction_splits_insert_authenticated
on public.transaction_splits for insert to authenticated
with check (
  user_id = (select auth.uid())
  or public.check_split_access(transaction_id, (select auth.uid()))
);

create policy transaction_splits_update_authenticated
on public.transaction_splits for update to authenticated
using (
  user_id = (select auth.uid())
  or public.check_split_access(transaction_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or public.check_split_access(transaction_id, (select auth.uid()))
);

create policy transaction_splits_delete_authenticated
on public.transaction_splits for delete to authenticated
using (
  user_id = (select auth.uid())
  or public.check_split_access(transaction_id, (select auth.uid()))
);

-- transactions UPDATE: union both actors and both original WITH CHECK clauses.
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists family_members_can_edit_based_on_role on public.transactions;
create policy transactions_update_authenticated
on public.transactions for update to authenticated
using (
  (
    user_id = (select auth.uid())
    and source_transaction_id is null
    and deleted_at is null
  )
  or creator_user_id = (select auth.uid())
  or exists (
    select 1
    from public.family_members fm
    join public.families f on f.id = fm.family_id
    where fm.user_id = (select auth.uid())
      and (
        f.owner_id = transactions.user_id
        or exists (
          select 1 from public.family_members fm2
          where fm2.family_id = f.id and fm2.user_id = transactions.user_id
        )
      )
      and fm.role in ('admin'::public.family_role, 'editor'::public.family_role)
  )
)
with check (
  (
    user_id = (select auth.uid())
    and source_transaction_id is null
    and deleted_at is null
  )
  or source_transaction_id is null
);

-- trip invitations UPDATE: owner, inviter or invitee in one policy.
drop policy if exists "Trip owners can update their invitations" on public.trip_invitations;
drop policy if exists trip_invitations_update_policy on public.trip_invitations;
create policy trip_invitations_update_authenticated
on public.trip_invitations for update to authenticated
using (
  invitee_id = (select auth.uid())
  or inviter_id = (select auth.uid())
  or exists (
    select 1 from public.trips
    where trips.id = trip_invitations.trip_id
      and trips.owner_id = (select auth.uid())
  )
)
with check (
  invitee_id = (select auth.uid())
  or inviter_id = (select auth.uid())
  or exists (
    select 1 from public.trips
    where trips.id = trip_invitations.trip_id
      and trips.owner_id = (select auth.uid())
  )
);
