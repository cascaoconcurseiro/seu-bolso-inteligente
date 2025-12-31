-- Migration: Corrigir notificações duplicadas
-- Data: 31/12/2025
-- Descrição: Atualizar created_date e remover duplicatas

-- 1. Adicionar created_date com valor padrão se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'created_date'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN created_date DATE DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- 2. Atualizar created_date para notificações existentes que não têm
UPDATE notifications
SET created_date = DATE(created_at)
WHERE created_date IS NULL;

-- 3. Tornar created_date NOT NULL e com default
ALTER TABLE notifications
ALTER COLUMN created_date SET NOT NULL;

ALTER TABLE notifications
ALTER COLUMN created_date SET DEFAULT CURRENT_DATE;

-- 4. Deletar notificações duplicadas, mantendo apenas a mais recente de cada dia
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, related_id, created_date
      ORDER BY created_at DESC
    ) as rn
  FROM notifications
  WHERE 
    type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
    AND is_dismissed = false
)
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 5. Criar índice para otimizar verificação de duplicação
CREATE INDEX IF NOT EXISTS idx_notifications_dedup 
ON notifications (user_id, related_id, related_type, created_date, is_dismissed)
WHERE is_dismissed = false;

-- 6. Comentários
COMMENT ON COLUMN notifications.created_date IS 'Data de criação (YYYY-MM-DD) usada para controle de duplicação diária';
COMMENT ON INDEX idx_notifications_dedup IS 'Índice para otimizar verificação de notificações duplicadas';
