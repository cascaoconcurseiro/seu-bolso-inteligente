-- Adicionar campos de escopo na tabela family_invitations
ALTER TABLE family_invitations
ADD COLUMN IF NOT EXISTS sharing_scope TEXT DEFAULT 'all' CHECK (sharing_scope IN ('all', 'trips_only', 'date_range', 'specific_trip')),
ADD COLUMN IF NOT EXISTS scope_start_date DATE,
ADD COLUMN IF NOT EXISTS scope_end_date DATE,
ADD COLUMN IF NOT EXISTS scope_trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;;
