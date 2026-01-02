-- Corrigir política RLS de SELECT em trip_members
-- Problema: Usuário só via seu próprio registro, não via outros membros
-- Solução: Se é membro da viagem, pode ver todos os membros

DROP POLICY IF EXISTS trip_members_select ON trip_members;

CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));;
