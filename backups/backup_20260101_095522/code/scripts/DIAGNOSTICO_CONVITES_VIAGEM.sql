-- ========================================================
-- DIAGNÓSTICO: CONVITES DE VIAGEM
-- ========================================================
-- Este script verifica o estado dos convites de viagem

-- 1. Listar todos os usuários
SELECT 
  'USUÁRIOS' as tipo,
  id,
  email,
  full_name
FROM profiles
ORDER BY email;

-- 2. Listar todos os convites
SELECT 
  'CONVITES' as tipo,
  ti.id,
  ti.trip_id,
  ti.inviter_id,
  ti.invitee_id,
  ti.status,
  ti.message,
  ti.created_at,
  t.name as trip_name,
  p1.email as inviter_email,
  p2.email as invitee_email
FROM trip_invitations ti
LEFT JOIN trips t ON ti.trip_id = t.id
LEFT JOIN profiles p1 ON ti.inviter_id = p1.id
LEFT JOIN profiles p2 ON ti.invitee_id = p2.id
ORDER BY ti.created_at DESC;

-- 3. Verificar políticas RLS
SELECT 
  'POLÍTICAS RLS' as tipo,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'trip_invitations'
ORDER BY policyname;

-- 4. Testar query como se fosse o usuário francy.von@gmail.com
-- (ID: 9545d0c1-94be-4b69-b110-f939bce072ee)
SELECT 
  'CONVITES PARA FRAN' as tipo,
  ti.*,
  t.name as trip_name
FROM trip_invitations ti
LEFT JOIN trips t ON ti.trip_id = t.id
WHERE ti.invitee_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
AND ti.status = 'pending';

-- 5. Testar query como se fosse o usuário wesley.diaslima@gmail.com
-- (ID: 56ccd60b-641f-4265-bc17-7b8705a2f8c9)
SELECT 
  'CONVITES PARA WESLEY' as tipo,
  ti.*,
  t.name as trip_name
FROM trip_invitations ti
LEFT JOIN trips t ON ti.trip_id = t.id
WHERE ti.invitee_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9'
AND ti.status = 'pending';

-- 6. Verificar se há problemas com auth.uid()
SELECT 
  'AUTH UID' as tipo,
  auth.uid() as current_user_id;
