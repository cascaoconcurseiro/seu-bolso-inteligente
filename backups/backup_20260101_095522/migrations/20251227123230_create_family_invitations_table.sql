-- Criar tabela de solicitações de vínculo familiar
CREATE TABLE IF NOT EXISTS family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role family_role NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, family_id)
);

-- Índices
CREATE INDEX idx_family_invitations_to_user ON family_invitations(to_user_id, status);
CREATE INDEX idx_family_invitations_from_user ON family_invitations(from_user_id, status);

-- RLS
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Ver solicitações enviadas ou recebidas
CREATE POLICY "Users can view own invitations"
ON family_invitations
FOR SELECT
TO public
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Policy: Criar solicitações
CREATE POLICY "Users can create invitations"
ON family_invitations
FOR INSERT
TO public
WITH CHECK (auth.uid() = from_user_id);

-- Policy: Atualizar apenas as recebidas
CREATE POLICY "Users can update received invitations"
ON family_invitations
FOR UPDATE
TO public
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_family_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_family_invitations_updated_at
BEFORE UPDATE ON family_invitations
FOR EACH ROW
EXECUTE FUNCTION update_family_invitations_updated_at();;
