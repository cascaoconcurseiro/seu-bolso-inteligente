-- Criar sistema de compartilhamento de viagens

-- 1. Tabela de membros da viagem
CREATE TABLE IF NOT EXISTS trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  can_edit_details BOOLEAN DEFAULT false, -- Pode editar nome, período, moeda
  can_manage_expenses BOOLEAN DEFAULT true, -- Pode adicionar/editar gastos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);

-- 3. RLS Policies
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver membros das viagens que participam
CREATE POLICY "Users can view trip members of their trips"
  ON trip_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Apenas o dono da viagem pode adicionar membros
CREATE POLICY "Trip owners can add members"
  ON trip_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_id AND owner_id = auth.uid()
    )
  );

-- Apenas o dono pode remover membros
CREATE POLICY "Trip owners can remove members"
  ON trip_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_id AND owner_id = auth.uid()
    )
  );

-- 4. Trigger para adicionar o criador como owner automaticamente
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adicionar o criador da viagem como owner
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, true);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_trip_owner ON trips;
CREATE TRIGGER trg_add_trip_owner
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner();

-- 5. Atualizar RLS da tabela trips para incluir membros
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Users can view own trips and shared trips"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- 6. Policy para UPDATE: apenas owner pode editar detalhes críticos
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Trip owners can update trip details"
  ON trips FOR UPDATE
  USING (
    owner_id = auth.uid() -- Apenas o criador original
  )
  WITH CHECK (
    owner_id = auth.uid()
  );;
