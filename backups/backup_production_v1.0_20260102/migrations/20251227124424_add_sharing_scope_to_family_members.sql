-- Adicionar campos de escopo de compartilhamento
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS sharing_scope TEXT DEFAULT 'all' CHECK (sharing_scope IN ('all', 'trips_only', 'date_range', 'specific_trip')),
ADD COLUMN IF NOT EXISTS scope_start_date DATE,
ADD COLUMN IF NOT EXISTS scope_end_date DATE,
ADD COLUMN IF NOT EXISTS scope_trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_family_members_scope ON family_members(sharing_scope, scope_start_date, scope_end_date);

-- Comentar
COMMENT ON COLUMN family_members.sharing_scope IS 'Escopo do compartilhamento: all (tudo), trips_only (apenas viagens), date_range (período específico), specific_trip (viagem específica)';
COMMENT ON COLUMN family_members.scope_start_date IS 'Data de início do período de compartilhamento (para date_range)';
COMMENT ON COLUMN family_members.scope_end_date IS 'Data de fim do período de compartilhamento (para date_range)';
COMMENT ON COLUMN family_members.scope_trip_id IS 'ID da viagem específica (para specific_trip)';;
