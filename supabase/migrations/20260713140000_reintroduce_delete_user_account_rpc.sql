-- Reintroduz o expurgo fisico LGPD de conta, perdido no cutover de baseline (2026-07-13).
-- A versao antiga (20260604174400) cobria um schema incompleto: ignorava trips,
-- trip_members, trip_invitations, trip_exchange_purchases, shared_credit_cards,
-- asset_transactions, categories, goal_milestones, transaction_auto_share_rules,
-- account_reconciliations, user_category_learning, notification_preferences,
-- push_subscriptions, pin_attempts e as colunas de ator (creator/removed/invited/
-- deleted/granted/changed_by). Varias FKs sao NO ACTION e bloqueariam o DELETE.
--
-- Estrategia (escopada por auth.uid(), sem tocar dado de outro usuario):
--   1. SET NULL nas colunas de ATOR/CRIADOR (FK NO ACTION) que apontam para o
--      usuario. Onde o registro pertence a OUTRO usuario, isso apenas corta o
--      vinculo e o registro alheio permanece intacto; onde pertence ao proprio
--      usuario, o registro sera removido pela cascata do passo 3.
--   2. DELETE explicito no unico filho "proprio" com FK NO ACTION e sem caminho
--      garantido de cascade (asset_transactions.user_id -> auth.users).
--   3. DELETE FROM auth.users: cascateia profiles e todo o dado proprio restante
--      (accounts, transactions, budgets.user_id, goals.user_id, assets, trips.owner_id,
--      trip_members.user_id, families.owner_id, notifications, pin_attempts, etc.),
--      alem de disparar os SET NULL ja definidos em error_logs.user_id e
--      settlement_reversals.reversed_by.
--
-- error_logs.user_id e settlement_reversals.reversed_by ja sao ON DELETE SET NULL,
-- entao nao precisam de tratamento manual.

CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nao autenticado' USING ERRCODE = '42501';
    END IF;

    -- 1) Colunas de CRIADOR de registros que podem pertencer a outro usuario.
    UPDATE public.budgets      SET creator_user_id = NULL WHERE creator_user_id = v_user_id;
    UPDATE public.goals        SET creator_user_id = NULL WHERE creator_user_id = v_user_id;
    UPDATE public.transactions SET creator_user_id = NULL WHERE creator_user_id = v_user_id;
    UPDATE public.trips        SET creator_user_id = NULL WHERE creator_user_id = v_user_id;

    -- 1b) Colunas de ATOR (quem executou uma acao sobre registro de terceiros).
    UPDATE public.trips          SET deleted_by     = NULL WHERE deleted_by     = v_user_id;
    UPDATE public.families       SET deleted_by     = NULL WHERE deleted_by     = v_user_id;
    UPDATE public.family_members SET invited_by     = NULL WHERE invited_by     = v_user_id;
    UPDATE public.family_members SET removed_by     = NULL WHERE removed_by     = v_user_id;
    UPDATE public.family_members SET linked_user_id = NULL WHERE linked_user_id = v_user_id;
    UPDATE public.trip_members   SET removed_by     = NULL WHERE removed_by     = v_user_id;
    UPDATE public.audit_log      SET changed_by     = NULL WHERE changed_by     = v_user_id;
    UPDATE public.admin_users    SET granted_by     = NULL WHERE granted_by     = v_user_id;

    -- 2) Filho proprio com FK NO ACTION e sem caminho garantido de cascade.
    DELETE FROM public.asset_transactions WHERE user_id = v_user_id;

    -- 3) Expurgo fisico da identidade: cascateia profiles -> todo o dado proprio.
    --    Se o papel definidor nao tiver privilegio de DELETE em auth.users neste
    --    projeto, este passo deve migrar para uma Edge Function com service_role
    --    chamando auth.admin.deleteUser(); os passos 1 e 2 continuam validos.
    DELETE FROM auth.users WHERE id = v_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO service_role;
