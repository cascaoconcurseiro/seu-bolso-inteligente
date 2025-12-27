-- ==========================================
-- DEBUG: Verificar se convite foi aceito corretamente
-- ==========================================

-- 1. Ver convites aceitos recentemente
SELECT 
    ti.id,
    ti.status,
    ti.trip_id,
    ti.invitee_id,
    ti.responded_at,
    t.name as trip_name,
    p.email as invitee_email
FROM trip_invitations ti
LEFT JOIN trips t ON t.id = ti.trip_id
LEFT JOIN auth.users u ON u.id = ti.invitee_id
LEFT JOIN profiles p ON p.id = ti.invitee_id
WHERE ti.status = 'accepted'
ORDER BY ti.responded_at DESC
LIMIT 5;

-- 2. Ver membros da viagem (trip_members)
SELECT 
    tm.id,
    tm.trip_id,
    tm.user_id,
    tm.role,
    tm.created_at,
    t.name as trip_name,
    p.email as member_email
FROM trip_members tm
LEFT JOIN trips t ON t.id = tm.trip_id
LEFT JOIN profiles p ON p.id = tm.user_id
ORDER BY tm.created_at DESC
LIMIT 10;

-- 3. Verificar se o Wesley está como membro de alguma viagem
SELECT 
    tm.*,
    t.name as trip_name,
    p.email
FROM trip_members tm
LEFT JOIN trips t ON t.id = tm.trip_id
LEFT JOIN profiles p ON p.id = tm.user_id
WHERE p.email ILIKE '%wesley%'
ORDER BY tm.created_at DESC;

-- 4. Ver o trigger que deveria adicionar o membro
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%invitation%';
