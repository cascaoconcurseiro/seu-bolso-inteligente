-- Script para corrigir notificações duplicadas
-- Execute este script no Supabase SQL Editor

-- 1. Ver quantas notificações duplicadas existem
SELECT 
  user_id,
  type,
  related_id,
  COUNT(*) as count,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM notifications
WHERE 
  type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
  AND is_dismissed = false
GROUP BY user_id, type, related_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Atualizar created_date para todas as notificações existentes
-- (usar a data de created_at)
UPDATE notifications
SET created_date = DATE(created_at)
WHERE created_date IS NULL;

-- 3. Deletar notificações duplicadas, mantendo apenas a mais recente de cada dia
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, related_id, DATE(created_at)
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

-- 4. Verificar resultado
SELECT 
  user_id,
  type,
  related_id,
  created_date,
  COUNT(*) as count
FROM notifications
WHERE 
  type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
  AND is_dismissed = false
GROUP BY user_id, type, related_id, created_date
ORDER BY created_date DESC, count DESC;

-- 5. Ver notificações restantes
SELECT 
  id,
  type,
  title,
  created_at,
  created_date,
  is_dismissed
FROM notifications
WHERE 
  type IN ('BUDGET_WARNING', 'BUDGET_EXCEEDED')
ORDER BY created_at DESC
LIMIT 20;
