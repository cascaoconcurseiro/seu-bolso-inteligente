-- ==========================================
-- SCRIPT: Adicionar membros de convites já aceitos
-- Data: 27/12/2024
-- Objetivo: Corrigir convites aceitos que não viraram membros
-- ==========================================

-- Este script vai:
-- 1. Encontrar todos os convites aceitos
-- 2. Verificar se o usuário já é membro da viagem
-- 3. Adicionar como membro se não estiver

BEGIN;

-- Inserir membros para todos os convites aceitos que ainda não são membros
INSERT INTO public.trip_members (
    trip_id,
    user_id,
    role,
    can_edit_details,
    can_manage_expenses,
    created_at
)
SELECT 
    ti.trip_id,
    ti.invitee_id,
    'member',
    false,
    true,
    ti.responded_at  -- Usar a data que aceitou o convite
FROM public.trip_invitations ti
WHERE ti.status = 'accepted'
  AND NOT EXISTS (
    -- Verificar se já não é membro
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = ti.trip_id
      AND tm.user_id = ti.invitee_id
  )
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Mostrar quantos membros foram adicionados
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contar convites aceitos
    SELECT COUNT(*) INTO v_count
    FROM public.trip_invitations
    WHERE status = 'accepted';
    
    RAISE NOTICE '✅ Total de convites aceitos: %', v_count;
    
    -- Contar membros adicionados agora
    SELECT COUNT(*) INTO v_count
    FROM public.trip_members tm
    WHERE tm.created_at >= NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE '✅ Membros adicionados agora: %', v_count;
END $$;

COMMIT;

-- ==========================================
-- VERIFICAÇÃO:
-- Execute estas queries para confirmar:
-- ==========================================

-- 1. Ver todos os convites aceitos e seus membros
SELECT 
    ti.id as invitation_id,
    ti.status,
    t.name as trip_name,
    p_invitee.email as invitee_email,
    CASE 
        WHEN tm.id IS NOT NULL THEN '✅ É membro'
        ELSE '❌ NÃO é membro'
    END as member_status
FROM trip_invitations ti
LEFT JOIN trips t ON t.id = ti.trip_id
LEFT JOIN profiles p_invitee ON p_invitee.id = ti.invitee_id
LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
WHERE ti.status = 'accepted'
ORDER BY ti.responded_at DESC;

-- 2. Ver membros por viagem
SELECT 
    t.name as trip_name,
    COUNT(tm.id) as total_members,
    STRING_AGG(p.email, ', ') as members
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id
LEFT JOIN profiles p ON p.id = tm.user_id
GROUP BY t.id, t.name
ORDER BY t.name;
