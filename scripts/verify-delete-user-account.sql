-- Prova transacional do expurgo LGPD (public.delete_user_account).
-- NAO PERSISTE: tudo roda dentro de BEGIN/ROLLBACK.
-- Objetivo: provar que a funcao completa contra um usuario REAL sem erro de FK
-- e que a identidade (auth.users) seria removida.
--
-- Uso:
--   psql "$SUPABASE_DB_URL" -v user_id="'<UUID_DE_UM_USUARIO_REAL>'" \
--        -f scripts/verify-delete-user-account.sql
--
-- Escolha um usuario com dados ricos (contas, transacoes compartilhadas, viagem
-- com outros membros) para exercitar os caminhos de cascade e de SET NULL.

\set ON_ERROR_STOP on

BEGIN;

-- Impersona o usuario alvo: auth.uid() le request.jwt.claims->>'sub'.
SELECT set_config('request.jwt.claims', json_build_object('sub', :user_id)::text, true);

-- Sanidade: confirma que auth.uid() resolve para o alvo dentro da transacao.
SELECT auth.uid() AS acting_as;

-- Estado antes.
SELECT count(*) AS users_before   FROM auth.users     WHERE id = :user_id;
SELECT count(*) AS accounts_before FROM public.accounts WHERE user_id = :user_id;

-- Executa o expurgo. Qualquer FK NO ACTION nao tratada aborta aqui.
SELECT public.delete_user_account();

-- Estado depois (esperado: usuario e dados proprios zerados).
SELECT count(*) AS users_after     FROM auth.users              WHERE id = :user_id;
SELECT count(*) AS accounts_after  FROM public.accounts          WHERE user_id = :user_id;
SELECT count(*) AS asset_tx_after  FROM public.asset_transactions WHERE user_id = :user_id;

-- Prova de que dado ALHEIO onde o usuario era so ator/criador foi desvinculado,
-- nao apagado: nenhuma linha deve manter o vinculo, mas o registro permanece.
SELECT count(*) AS dangling_creator FROM public.transactions WHERE creator_user_id = :user_id;

ROLLBACK;

\echo 'Prova concluida com ROLLBACK. Se chegou aqui sem erro, a funcao completa sem violacao de FK.'
