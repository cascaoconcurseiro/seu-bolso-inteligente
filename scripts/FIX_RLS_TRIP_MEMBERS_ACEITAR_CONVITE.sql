-- ==========================================
-- FIX: Permitir que usuários se adicionem ao aceitar convite
-- Data: 27/12/2024
-- Problema: Erro 500 ao aceitar convite porque RLS bloqueia INSERT
-- ==========================================

-- Remover política antiga que só permite owner adicionar
DROP POLICY IF EXISTS "Trip owners can add members" ON public.trip_members;

-- Nova política: owner pode adicionar OU usuário pode se adicionar se tiver convite aceito
CREATE POLICY "Trip owners and invited users can add members"
  ON public.trip_members FOR INSERT
  WITH CHECK (
    -- Owner da viagem pode adicionar qualquer um
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_id AND owner_id = auth.uid()
    )
    OR
    -- Usuário pode se adicionar se tiver convite aceito
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.trip_invitations
        WHERE trip_id = trip_members.trip_id
          AND invitee_id = auth.uid()
          AND status = 'accepted'
      )
    )
  );

-- Verificar políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'trip_members'
ORDER BY policyname;
