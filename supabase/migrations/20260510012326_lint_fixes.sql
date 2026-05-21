-- Fix Security Definer Views
ALTER VIEW public.shared_transactions_for_current_user SET (security_invoker = on);
ALTER VIEW public.trip_budget_summary SET (security_invoker = on);
ALTER VIEW public.shared_transactions_view SET (security_invoker = on);

-- Fix Search Path Mutable and Revoke public execute for trigger functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args, prorettype::regtype::text as rettype
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        -- Set search path for all functions to public
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public;', r.proname, r.args);
        
        -- Revoke execute from anon for all functions to improve security
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon;', r.proname, r.args);
        
        -- If it's a trigger function, it shouldn't be executed by authenticated users either
        IF r.rettype = 'trigger' THEN
            EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated, public;', r.proname, r.args);
        END IF;
    END LOOP;
END $$;

-- Drop permissive policies that are "Always True"
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "trip_members_insert" ON public.trip_members;

-- Create Unindexed Foreign Keys
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_families_deleted_by ON public.families(deleted_by);
CREATE INDEX IF NOT EXISTS idx_family_invitations_scope_trip_id ON public.family_invitations(scope_trip_id);
CREATE INDEX IF NOT EXISTS idx_family_members_removed_by ON public.family_members(removed_by);
CREATE INDEX IF NOT EXISTS idx_family_members_scope_trip_id ON public.family_members(scope_trip_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_related_member_id ON public.financial_ledger(related_member_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_settlement_transaction_id ON public.financial_ledger(settlement_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pending_operations_transaction_id ON public.pending_operations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pending_operations_user_id ON public.pending_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_transaction_mirrors_mirror_transaction_id ON public.shared_transaction_mirrors(mirror_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_creditor_settlement_tx_id ON public.transaction_splits(creditor_settlement_tx_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_debtor_settlement_tx_id ON public.transaction_splits(debtor_settlement_tx_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_member_id ON public.transaction_splits(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id ON public.transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled_by ON public.transactions(reconciled_by);
CREATE INDEX IF NOT EXISTS idx_transactions_refund_of_transaction_id ON public.transactions(refund_of_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trip_id ON public.transactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_checklist_assigned_to ON public.trip_checklist(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_id ON public.trip_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_removed_by ON public.trip_members(removed_by);
CREATE INDEX IF NOT EXISTS idx_trip_participants_member_id ON public.trip_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON public.trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_deleted_by ON public.trips(deleted_by);
CREATE INDEX IF NOT EXISTS idx_trips_source_trip_id ON public.trips(source_trip_id);

-- Drop Duplicate Indexes
DROP INDEX IF EXISTS public.idx_family_members_linked_user;
DROP INDEX IF EXISTS public.idx_transaction_splits_transaction;

-- Fix Auth RLS Initialization Plan (Wrap auth.uid() in a subquery)
DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    create_stmt TEXT;
    role_list TEXT;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
    LOOP
        -- Replace occurrences, ensuring we don't double-wrap
        IF pol.qual IS NOT NULL THEN
            new_qual := replace(replace(pol.qual, '(select auth.uid())', 'auth.uid()'), 'auth.uid()', '(select auth.uid())');
        ELSE
            new_qual := NULL;
        END IF;

        IF pol.with_check IS NOT NULL THEN
            new_with_check := replace(replace(pol.with_check, '(select auth.uid())', 'auth.uid()'), 'auth.uid()', '(select auth.uid())');
        ELSE
            new_with_check := NULL;
        END IF;
        
        -- Drop old policy
        EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        
        -- Construct roles
        role_list := array_to_string(pol.roles, ', ');
        IF role_list = '' OR role_list IS NULL THEN
            role_list := 'public';
        END IF;

        -- Create new policy
        create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s', 
            pol.policyname, pol.schemaname, pol.tablename, pol.cmd, role_list);
            
        IF new_qual IS NOT NULL THEN
            create_stmt := create_stmt || ' USING (' || new_qual || ')';
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            create_stmt := create_stmt || ' WITH CHECK (' || new_with_check || ')';
        END IF;
        
        EXECUTE create_stmt;
    END LOOP;
END $$;
