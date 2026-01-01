-- ========================================================
-- CORREÇÃO: Coluna ambígua trip_id nas políticas RLS
-- ========================================================

BEGIN;

-- Remover políticas duplicadas e ambíguas
DROP POLICY IF EXISTS "Trip owners can create invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_insert_policy" ON public.trip_invitations;
DROP POLICY IF EXISTS "Users can view their trip invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_select_policy" ON public.trip_invitations;
DROP POLICY IF EXISTS "Invitees can update invitation status" ON public.trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_update_policy" ON public.trip_invitations;

-- Criar políticas corrigidas com qualificação explícita

-- SELECT: Usuários podem ver convites enviados ou recebidos
CREATE POLICY "trip_invitations_select_policy" ON public.trip_invitations
  FOR SELECT USING (
    trip_invitations.invitee_id = auth.uid() OR 
    trip_invitations.inviter_id = auth.uid()
  );

-- INSERT: Apenas donos da viagem podem criar convites
CREATE POLICY "trip_invitations_insert_policy" ON public.trip_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

-- UPDATE: Convidados podem atualizar status, ou quem enviou pode gerenciar
CREATE POLICY "trip_invitations_update_policy" ON public.trip_invitations
  FOR UPDATE USING (
    trip_invitations.invitee_id = auth.uid() OR 
    trip_invitations.inviter_id = auth.uid()
  );

-- DELETE: Apenas quem enviou pode deletar convites
CREATE POLICY "trip_invitations_delete_policy" ON public.trip_invitations
  FOR DELETE USING (
    trip_invitations.inviter_id = auth.uid()
  );

COMMIT;

SELECT 'Políticas RLS de trip_invitations corrigidas com sucesso!' as status;;
