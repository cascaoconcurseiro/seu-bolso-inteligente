-- Adicionar campos de avatar personalizado na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(50) DEFAULT 'green',
ADD COLUMN IF NOT EXISTS avatar_icon VARCHAR(50) DEFAULT 'user';

-- Adicionar campo de arquivamento na tabela trips
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Criar índice para buscar viagens arquivadas
CREATE INDEX IF NOT EXISTS idx_trips_archived ON public.trips(is_archived, owner_id);

-- Comentários
COMMENT ON COLUMN public.profiles.avatar_color IS 'Cor do avatar personalizado do usuário';
COMMENT ON COLUMN public.profiles.avatar_icon IS 'Ícone do avatar personalizado do usuário';
COMMENT ON COLUMN public.trips.is_archived IS 'Indica se a viagem foi arquivada';
COMMENT ON COLUMN public.trips.archived_at IS 'Data e hora em que a viagem foi arquivada';
