-- Tornar destination obrigatório e usar como nome da viagem
-- Isso simplifica o formulário, tendo apenas um campo "Destino"

-- Primeiro, preencher destination vazio com name
UPDATE trips SET destination = name WHERE destination IS NULL OR destination = '';

-- Tornar destination NOT NULL
ALTER TABLE trips ALTER COLUMN destination SET NOT NULL;

-- Adicionar comentários
COMMENT ON COLUMN trips.destination IS 'Destino da viagem (usado também como nome)';
COMMENT ON COLUMN trips.name IS 'Nome da viagem (preenchido automaticamente com destination para compatibilidade)';
