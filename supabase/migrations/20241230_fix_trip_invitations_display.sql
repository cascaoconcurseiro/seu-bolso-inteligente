-- =====================================================
-- CORREÇÃO: CONVITES DE VIAGEM NÃO APARECEM NA UI
-- =====================================================
-- Data: 30/12/2024
-- Objetivo: Garantir que convites apareçam corretamente

-- Verificar políticas RLS de trip_invitations
DO $
DECLARE
  v_policy_exists BOOLEAN;
BEGIN
  -- Verificar se política de SELECT existe
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trip_invitations'
      AND policyname LIKE '%select%'
      AND cmd = 'SELECT'
  ) INTO v_policy_exists;
  
  IF NOT v_policy_exists THEN
    RAISE NOTICE '⚠️  Política de SELECT não encontrada para trip_invitations';
  ELSE
    RAISE NOTICE '✅ Política de SELECT existe para trip_invitations';
  END IF;
END $;

-- Garantir que usuários possam ver convites recebidos
DROP POLICY IF EXISTS "Users can view their invitations" ON trip_invitations;
CREATE POLICY "Users can view their invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_id = auth.uid() OR  -- Convites recebidos
    inviter_id = auth.uid()     -- Convites enviados
  );

-- Garantir que usuários possam atualizar convites recebidos (aceitar/rejeitar)
DROP POLICY IF EXISTS "Users can respond to their invitations" ON trip_invitations;
CREATE POLICY "Users can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- Garantir que donos de viagens possam criar convites
DROP POLICY IF EXISTS "Trip owners can create invitations" ON trip_invitations;
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_invitations.trip_id
        AND trips.owner_id = auth.uid()
    )
  );

-- Verificar se há convites pendentes no banco
DO $
DECLARE
  v_pending_count INTEGER;
  v_sample_invitation RECORD;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM trip_invitations
  WHERE status = 'pending';
  
  RAISE NOTICE '=== DIAGNÓSTICO ===';
  RAISE NOTICE 'Convites pendentes no banco: %', v_pending_count;
  
  IF v_pending_count > 0 THEN
    -- Mostrar exemplo de convite
    SELECT * INTO v_sample_invitation
    FROM trip_invitations
    WHERE status = 'pending'
    LIMIT 1;
    
    RAISE NOTICE 'Exemplo de convite:';
    RAISE NOTICE '  ID: %', v_sample_invitation.id;
    RAISE NOTICE '  Viagem: %', v_sample_invitation.trip_id;
    RAISE NOTICE '  De: %', v_sample_invitation.inviter_id;
    RAISE NOTICE '  Para: %', v_sample_invitation.invitee_id;
    RAISE NOTICE '  Status: %', v_sample_invitation.status;
  END IF;
END $;

-- Verificar se notificações existem para os convites
DO $
DECLARE
  v_notifications_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_notifications_count
  FROM notifications
  WHERE type = 'TRIP_INVITE'
    AND is_read = false;
  
  RAISE NOTICE 'Notificações de convite não lidas: %', v_notifications_count;
END $;

-- Validação final
DO $
BEGIN
  RAISE NOTICE '=== VALIDAÇÃO ===';
  RAISE NOTICE '✅ Políticas RLS atualizadas';
  RAISE NOTICE '✅ Usuários podem ver convites recebidos';
  RAISE NOTICE '✅ Usuários podem aceitar/rejeitar convites';
  RAISE NOTICE '✅ Donos podem criar convites';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 PRÓXIMO PASSO: Verificar no frontend se convites aparecem';
  RAISE NOTICE '   1. Fazer logout/login';
  RAISE NOTICE '   2. Ir para página de Viagens';
  RAISE NOTICE '   3. Verificar console do navegador (logs 🟣)';
END $;
