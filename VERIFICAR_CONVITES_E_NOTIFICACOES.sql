-- ============================================
-- VERIFICAÇÃO: Convites e Notificações
-- ============================================
-- Execute este SQL no Supabase SQL Editor para verificar
-- ============================================

-- 1. Ver convites pendentes
SELECT 
  fi.id,
  fi.member_name,
  fi.status,
  fi.created_at,
  p1.email as de_usuario,
  p2.email as para_usuario
FROM family_invitations fi
LEFT JOIN profiles p1 ON fi.from_user_id = p1.id
LEFT JOIN profiles p2 ON fi.to_user_id = p2.id
WHERE fi.status = 'pending'
ORDER BY fi.created_at DESC;

-- 2. Ver notificações (sem duplicatas)
SELECT 
  user_id,
  type,
  title,
  COUNT(*) as quantidade,
  MAX(created_at) as ultima_criacao
FROM notifications
GROUP BY user_id, type, title
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- 3. Verificar se o índice único foi criado
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications' 
  AND indexname = 'idx_notifications_welcome_unique';

-- 4. Verificar trigger de convites
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trg_family_invitation_accepted';
