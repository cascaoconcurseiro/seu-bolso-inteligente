-- Tabela para compras de câmbio
CREATE TABLE trip_exchange_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Valores da compra
  foreign_amount DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(10,6) NOT NULL,
  cet_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Valores calculados
  effective_rate DECIMAL(10,6) NOT NULL,
  local_amount DECIMAL(15,2) NOT NULL,
  
  -- Metadados
  description TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_trip_exchange_trip_id ON trip_exchange_purchases(trip_id);
CREATE INDEX idx_trip_exchange_user_id ON trip_exchange_purchases(user_id);

-- Comentário
COMMENT ON TABLE trip_exchange_purchases IS 'Compras de câmbio para viagens internacionais';

-- RLS
ALTER TABLE trip_exchange_purchases ENABLE ROW LEVEL SECURITY;

-- Participantes da viagem podem ver compras de câmbio
CREATE POLICY "Trip members can view exchange purchases"
  ON trip_exchange_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_exchange_purchases.trip_id
      AND tm.user_id = auth.uid()
    )
  );

-- Usuários podem criar suas próprias compras
CREATE POLICY "Users can create own exchange purchases"
  ON trip_exchange_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem editar suas próprias compras
CREATE POLICY "Users can update own exchange purchases"
  ON trip_exchange_purchases FOR UPDATE
  USING (user_id = auth.uid());

-- Usuários podem deletar suas próprias compras
CREATE POLICY "Users can delete own exchange purchases"
  ON trip_exchange_purchases FOR DELETE
  USING (user_id = auth.uid());;
