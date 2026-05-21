-- Sistema de convites para viagens

-- 1. Tabela de convites
CREATE TABLE IF NOT EXISTS trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT, -- Mensagem personalizada do convite
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(trip_id, invitee_id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_id ON trip_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_status ON trip_invitations(status);

-- 3. RLS Policies
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver convites que enviaram ou receberam
CREATE POLICY "Users can view their trip invitations"
  ON trip_invitations FOR SELECT
  USING (
    inviter_id = auth.uid() OR invitee_id = auth.uid()
  );

-- Apenas o dono da viagem pode criar convites
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_id AND owner_id = auth.uid()
    )
  );

-- Apenas o convidado pode atualizar o status
CREATE POLICY "Invitees can update invitation status"
  ON trip_invitations FOR UPDATE
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- 4. Trigger para criar trip_member quando aceito
CREATE OR REPLACE FUNCTION handle_trip_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas processar se foi aceito
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Adicionar como membro da viagem
    INSERT INTO trip_members (
      trip_id,
      user_id,
      role,
      can_edit_details,
      can_manage_expenses
    )
    VALUES (
      NEW.trip_id,
      NEW.invitee_id,
      'member',
      false,
      true
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    
    -- Atualizar timestamp de resposta
    NEW.responded_at := NOW();
  END IF;
  
  -- Se rejeitado, apenas atualizar timestamp
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_invitation_accepted ON trip_invitations;
CREATE TRIGGER trg_trip_invitation_accepted
  BEFORE UPDATE ON trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_trip_invitation_accepted();

-- 5. Modificar trip_members para não adicionar automaticamente
-- Remover a inserção direta, usar apenas convites
DROP POLICY IF EXISTS "Trip owners can add members" ON trip_members;
CREATE POLICY "Trip members are added via invitations"
  ON trip_members FOR INSERT
  WITH CHECK (
    -- Apenas o sistema (via trigger) ou o owner pode adicionar
    EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_id AND owner_id = auth.uid()
    )
    OR
    -- Ou via trigger de convite aceito
    EXISTS (
      SELECT 1 FROM trip_invitations
      WHERE trip_id = trip_members.trip_id 
        AND invitee_id = trip_members.user_id 
        AND status = 'accepted'
    )
  );;
