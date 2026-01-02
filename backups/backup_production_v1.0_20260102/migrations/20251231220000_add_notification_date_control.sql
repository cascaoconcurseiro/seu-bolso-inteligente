-- Adicionar controle de data nas notificações para evitar duplicatas
-- Garantir que cada tipo de notificação seja criado no máximo 1 vez por dia

-- Adicionar campo para rastrear a data de criação (sem hora)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS created_date DATE DEFAULT CURRENT_DATE;

-- Atualizar registros existentes
UPDATE notifications 
SET created_date = DATE(created_at)
WHERE created_date IS NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_date 
ON notifications(user_id, type, related_id, created_date) 
WHERE is_dismissed = false;

-- Comentário explicativo
COMMENT ON COLUMN notifications.created_date IS 'Data de criação da notificação (sem hora) para controle de duplicatas diárias';
