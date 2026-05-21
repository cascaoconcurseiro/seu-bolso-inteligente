-- Remover notificações duplicadas (manter apenas a mais recente de cada tipo por usuário)
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, type ORDER BY created_at DESC) as rn
    FROM notifications
  ) t
  WHERE rn > 1
);

-- Adicionar constraint para evitar duplicatas de notificações WELCOME
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_welcome_unique 
ON notifications(user_id, type) 
WHERE type = 'WELCOME';;
