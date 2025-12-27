-- ========================================================
-- SCRIPT DE REPARO: AMBIGUIDADE NO trip_id (TRIP_INVITATIONS)
-- ========================================================
-- Este script corrige o erro de "coluna ambígua" ao buscar convites.
-- Ele qualifica explicitamente as referências a trip_id nas políticas de RLS.

BEGIN;

-- 1. Identificar e reconstruir políticas de RLS para trip_invitations
-- Notas: Algumas políticas podem estar usando o nome bruto 'trip_id' 
-- que colide com variáveis internas do Postgres durante o JOIN.

DROP POLICY IF EXISTS "Usuários podem ver convites recebidos" ON public.trip_invitations;
DROP POLICY IF EXISTS "Usuários podem ver convites enviados" ON public.trip_invitations;
DROP POLICY IF EXISTS "Dono da viagem pode gerenciar convites" ON public.trip_invitations;
DROP POLICY IF EXISTS "Convidado pode atualizar status" ON public.trip_invitations;

-- Nova política: Visualização (Recebidos ou Enviados)
CREATE POLICY "trip_invitations_select_policy" ON public.trip_invitations
  FOR SELECT USING (
    invitee_id = auth.uid() OR 
    inviter_id = auth.uid()
  );

-- Nova política: Inserção (Apenas dono da viagem)
CREATE POLICY "trip_invitations_insert_policy" ON public.trip_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = trip_invitations.trip_id -- Qualificação explícita
      AND trips.owner_id = auth.uid()
    )
  );

-- Nova política: Update (Apenas convidado o status ou dono do convite)
CREATE POLICY "trip_invitations_update_policy" ON public.trip_invitations
  FOR UPDATE USING (
    invitee_id = auth.uid() OR 
    inviter_id = auth.uid()
  );

-- 2. Verificar se a função handle_trip_invitation_accepted existe e qualificar trip_id nela
CREATE OR REPLACE FUNCTION public.handle_trip_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Adicionar como membro se não existir
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES (NEW.trip_id, NEW.invitee_id, 'member')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    
    -- Atualizar data de resposta
    NEW.responded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar trigger
DROP TRIGGER IF EXISTS trg_trip_invitation_accepted ON public.trip_invitations;
CREATE TRIGGER trg_trip_invitation_accepted
  BEFORE UPDATE OF status ON public.trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_invitation_accepted();

COMMIT;

SELECT 'Reparo de trip_invitations concluído com sucesso!' as status;
