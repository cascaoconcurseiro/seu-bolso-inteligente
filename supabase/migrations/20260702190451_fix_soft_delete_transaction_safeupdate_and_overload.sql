-- BUG (reportado pelo usuario, erro 400 "DELETE requires a WHERE clause"):
-- soft_delete_transaction(uuid, text) fazia "DELETE FROM _sdt_targets;" sem WHERE,
-- e o Supabase roda com pg-safeupdate que rejeita DELETE/UPDATE sem WHERE.
-- Fix: TRUNCATE (nao afetado pelo safeupdate).
-- Tambem remove a versao antiga sobrecarregada soft_delete_transaction(uuid)
-- (sem validacao, retorno void, redundante) -- 1 nome, 1 conceito.
-- Testado ao vivo: RPC chamada sob role authenticated + jwt do usuario,
-- retornou 1 (transacao de teste soft-deletada com sucesso).

DROP FUNCTION IF EXISTS public.soft_delete_transaction(uuid);

CREATE OR REPLACE FUNCTION public.soft_delete_transaction(p_transaction_id uuid, p_cascade text DEFAULT 'NONE'::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tx transactions%ROWTYPE;
  v_now timestamptz := now();
  v_count integer := 0;
  v_mirror_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_cascade NOT IN ('NONE', 'NEXT', 'ALL') THEN
    RAISE EXCEPTION 'Tipo de cascata inválido: %', p_cascade;
  END IF;

  SELECT * INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada ou já excluída';
  END IF;

  -- Permissão: dono, criador, ou admin/editor da família do dono
  IF v_tx.user_id <> v_uid
     AND COALESCE(v_tx.creator_user_id, v_tx.user_id) <> v_uid
     AND NOT EXISTS (
       SELECT 1
       FROM family_members fm
       JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = v_uid
         AND fm.role IN ('admin', 'editor')
         AND (
           f.owner_id = v_tx.user_id
           OR EXISTS (
             SELECT 1 FROM family_members fm2
             WHERE fm2.family_id = f.id AND fm2.user_id = v_tx.user_id
           )
         )
     )
  THEN
    RAISE EXCEPTION 'Sem permissão para excluir esta transação';
  END IF;

  -- Espelho: excluir o original, não o espelho
  IF v_tx.source_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'Esta é uma transação espelhada. Exclua a transação original.';
  END IF;

  -- Alvos da exclusão conforme cascata
  CREATE TEMP TABLE IF NOT EXISTS _sdt_targets (id uuid PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _sdt_targets;

  IF p_cascade = 'ALL' AND v_tx.series_id IS NOT NULL THEN
    INSERT INTO _sdt_targets
    SELECT id FROM transactions
    WHERE series_id = v_tx.series_id AND deleted_at IS NULL;
  ELSIF p_cascade = 'NEXT' AND v_tx.series_id IS NOT NULL THEN
    INSERT INTO _sdt_targets
    SELECT id FROM transactions
    WHERE series_id = v_tx.series_id
      AND deleted_at IS NULL
      AND COALESCE(current_installment, 1) >= COALESCE(v_tx.current_installment, 1);
  ELSE
    INSERT INTO _sdt_targets VALUES (p_transaction_id);
  END IF;

  -- Bloqueio: alguma transação alvo já liquidada
  IF EXISTS (
    SELECT 1 FROM transactions t
    JOIN _sdt_targets tg ON tg.id = t.id
    WHERE t.is_settled = true
  ) THEN
    RAISE EXCEPTION 'Transação já liquidada/acertada. Desfaça o acerto antes de excluí-la.';
  END IF;

  -- Bloqueio: splits com acertos (totais ou parciais)
  IF EXISTS (
    SELECT 1 FROM transaction_splits s
    JOIN _sdt_targets tg ON tg.id = s.transaction_id
    WHERE s.is_settled = true OR s.settled_by_debtor = true OR s.settled_by_creditor = true
  ) THEN
    RAISE EXCEPTION 'Transação possui acertos. Desfaça os acertos antes de excluí-la.';
  END IF;

  -- Soft delete dos alvos
  UPDATE transactions t
  SET deleted_at = v_now
  FROM _sdt_targets tg
  WHERE t.id = tg.id AND t.deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Cascata para espelhos dos alvos
  UPDATE transactions t
  SET deleted_at = v_now
  WHERE t.source_transaction_id IN (SELECT id FROM _sdt_targets)
    AND t.deleted_at IS NULL;
  GET DIAGNOSTICS v_mirror_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma transação foi excluída';
  END IF;

  RETURN v_count + v_mirror_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_transaction(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.soft_delete_transaction(uuid, text) TO authenticated;
