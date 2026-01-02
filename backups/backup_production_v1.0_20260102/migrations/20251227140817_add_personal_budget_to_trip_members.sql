-- Adicionar campo personal_budget em trip_members
ALTER TABLE trip_members
ADD COLUMN IF NOT EXISTS personal_budget NUMERIC;

COMMENT ON COLUMN trip_members.personal_budget IS 'Orçamento pessoal do membro para esta viagem';;
