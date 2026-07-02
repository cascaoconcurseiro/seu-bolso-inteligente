-- Fase 5 (achado durante Fase 3): accounts_select_v2 e transactions_unified_select
-- nao filtravam deleted_at IS NULL, deixando contas/transacoes soft-deletadas
-- visiveis via RLS pra qualquer papel que a policy ampla cobre (dono, familia,
-- viagem). is_archived (contas arquivadas) e um campo SEPARADO de deleted_at
-- (lixeira) -- confirmado no codigo (ArchivedAccountsSection usa is_archived,
-- nao deleted_at), entao esse fix nao afeta contas arquivadas.
-- Verificado com RLS simulada: transacao some da visao do dono ao ser soft-deletada;
-- contas ativas continuam 100% visiveis.

ALTER POLICY accounts_select_v2 ON public.accounts
  USING (
    (
      (user_id = (select auth.uid()))
      OR is_family_member_v2((SELECT families.id FROM families WHERE families.owner_id = accounts.user_id LIMIT 1), (select auth.uid()))
      OR EXISTS (SELECT 1 FROM family_members WHERE family_members.user_id = accounts.user_id AND is_family_member_v2(family_members.family_id, (select auth.uid())))
    )
    AND deleted_at IS NULL
  );

ALTER POLICY transactions_unified_select ON public.transactions
  USING (
    (
      (user_id = (select auth.uid()))
      OR (creator_user_id = (select auth.uid()))
      OR EXISTS (SELECT 1 FROM family_members WHERE family_members.user_id = transactions.user_id AND is_family_member_v2(family_members.family_id, (select auth.uid())))
      OR (
        trip_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM trip_members WHERE trip_members.trip_id = transactions.trip_id AND trip_members.user_id = (select auth.uid()))
        AND (is_shared = true OR user_id = (select auth.uid()) OR creator_user_id = (select auth.uid()))
      )
    )
    AND deleted_at IS NULL
  );
