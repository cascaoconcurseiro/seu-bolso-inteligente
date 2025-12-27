-- ==========================================
-- CORREÇÃO FINAL: Sistema de Convites de Viagem
-- Data: 27/12/2024
-- Problema: Convites aceitos mas membros não aparecem
-- ==========================================

BEGIN;

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver convites recebidos" ON public.trip_invitations;
DROP POLICY IF EXISTS "Usuários podem ver convites enviados" ON public.trip_invitations;
DROP POLICY IF EXISTS "Donos de viagem podem criar convites" ON public.trip_invitations;
DROP POLICY IF EXISTS "Convidados podem responder convites" ON public.trip_invitations;
DROP POLICY IF EXISTS "Users can view their trip invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "Trip owners can create invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "Invitees can update invitation status" ON public.trip_invitations;

-- 2. Recriar políticas corretas

-- Ver convites recebidos ou enviados
CREATE POLICY "Users can view their trip invitations"
  ON public.trip_invitations FOR SELECT
  USING (
    inviter_id = auth.uid() OR invitee_id = auth.uid()
  );

-- Donos de viagem podem criar convites
CREATE POLICY "Trip owners can create invitations"
  ON public.trip_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_invitations.trip_id
      AND t.owner_id = auth.uid()
    )
  );

-- Convidados podem atualizar o status
CREATE POLICY "Invitees can update invitation status"
  ON public.trip_invitations FOR UPDATE
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- 3. Recriar função de trigger COMPLETA
CREATE OR REPLACE FUNCTION public.handle_trip_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_id UUID;
    v_invitee_id UUID;
BEGIN
    -- Apenas processar se foi aceito
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Capturar valores em variáveis
        v_trip_id := NEW.trip_id;
        v_invitee_id := NEW.invitee_id;

        -- Adicionar como membro da viagem
        INSERT INTO public.trip_members (
            trip_id,
            user_id,
            role,
            can_edit_details,
            can_manage_expenses
        )
        VALUES (
            v_trip_id,
            v_invitee_id,
            'member',
            false,
            true
        )
        ON CONFLICT (trip_id, user_id) DO NOTHING;
        
        -- Atualizar timestamp de resposta
        NEW.responded_at := NOW();
        
        RAISE NOTICE 'Convite aceito: viagem=%, usuário=%', v_trip_id, v_invitee_id;
    END IF;
    
    -- Se rejeitado, apenas atualizar timestamp
    IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        NEW.responded_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recriar trigger
DROP TRIGGER IF EXISTS trg_trip_invitation_accepted ON public.trip_invitations;
CREATE TRIGGER trg_trip_invitation_accepted
    BEFORE UPDATE ON public.trip_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_trip_invitation_accepted();

COMMIT;

-- ==========================================
-- TESTE MANUAL (opcional):
-- ==========================================
-- Para testar se está funcionando, execute:
-- 
-- UPDATE trip_invitations 
-- SET status = 'accepted' 
-- WHERE id = 'SEU_CONVITE_ID_AQUI';
-- 
-- Depois verifique:
-- SELECT * FROM trip_members WHERE user_id = 'SEU_USER_ID';
-- ==========================================
