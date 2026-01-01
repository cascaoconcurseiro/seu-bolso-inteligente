-- =====================================================
-- SCRIPT DE VALIDAÇÃO: Integridade do Sistema de Viagens
-- =====================================================
-- Execute este script para verificar a integridade dos dados
-- Pode ser executado a qualquer momento sem modificar dados
-- =====================================================

-- ============================================================================
-- 1. VIAGENS SEM OWNER EM TRIP_MEMBERS
-- ============================================================================
-- Toda viagem deve ter pelo menos um owner em trip_members

SELECT 
  'VIAGENS SEM OWNER' as problema,
  t.id as trip_id,
  t.name as trip_name,
  t.owner_id,
  t.created_at
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.role = 'owner'
WHERE tm.id IS NULL
ORDER BY t.created_at DESC;

-- ============================================================================
-- 2. OWNERS NÃO EM TRIP_MEMBERS
-- ============================================================================
-- O owner_id da viagem deve estar em trip_members

SELECT 
  'OWNER NÃO É MEMBRO' as problema,
  t.id as trip_id,
  t.name as trip_name,
  t.owner_id,
  t.created_at
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
WHERE tm.id IS NULL
ORDER BY t.created_at DESC;

-- ============================================================================
-- 3. DUPLICATAS EM TRIP_MEMBERS
-- ============================================================================
-- Não deve haver duplicatas de (trip_id, user_id)

SELECT 
  'DUPLICATA EM TRIP_MEMBERS' as problema,
  trip_id,
  user_id,
  COUNT(*) as quantidade,
  array_agg(id) as member_ids
FROM trip_members
GROUP BY trip_id, user_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- 4. CONVITES ACEITOS SEM MEMBRO
-- ============================================================================
-- Convites com status='accepted' devem ter membro correspondente

SELECT 
  'CONVITE ACEITO SEM MEMBRO' as problema,
  ti.id as invitation_id,
  ti.trip_id,
  ti.invitee_id,
  ti.status,
  ti.responded_at
FROM trip_invitations ti
LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
WHERE ti.status = 'accepted' AND tm.id IS NULL
ORDER BY ti.responded_at DESC;

-- ============================================================================
-- 5. VIAGENS COM MÚLTIPLOS OWNERS
-- ============================================================================
-- Cada viagem deve ter exatamente um owner

SELECT 
  'MÚLTIPLOS OWNERS' as problema,
  trip_id,
  COUNT(*) as quantidade_owners,
  array_agg(user_id) as owner_ids,
  array_agg(id) as member_ids
FROM trip_members
WHERE role = 'owner'
GROUP BY trip_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- 6. MEMBROS SEM VIAGEM (ÓRFÃOS)
-- ============================================================================
-- Membros devem referenciar viagens existentes

SELECT 
  'MEMBRO ÓRFÃO' as problema,
  tm.id as member_id,
  tm.trip_id,
  tm.user_id,
  tm.role,
  tm.created_at
FROM trip_members tm
LEFT JOIN trips t ON t.id = tm.trip_id
WHERE t.id IS NULL
ORDER BY tm.created_at DESC;

-- ============================================================================
-- 7. CONVITES SEM VIAGEM (ÓRFÃOS)
-- ============================================================================
-- Convites devem referenciar viagens existentes

SELECT 
  'CONVITE ÓRFÃO' as problema,
  ti.id as invitation_id,
  ti.trip_id,
  ti.invitee_id,
  ti.status,
  ti.created_at
FROM trip_invitations ti
LEFT JOIN trips t ON t.id = ti.trip_id
WHERE t.id IS NULL
ORDER BY ti.created_at DESC;

-- ============================================================================
-- 8. RESUMO GERAL
-- ============================================================================

SELECT 
  'RESUMO' as tipo,
  (SELECT COUNT(*) FROM trips) as total_viagens,
  (SELECT COUNT(*) FROM trip_members) as total_membros,
  (SELECT COUNT(*) FROM trip_members WHERE role = 'owner') as total_owners,
  (SELECT COUNT(*) FROM trip_members WHERE role = 'member') as total_members,
  (SELECT COUNT(*) FROM trip_invitations) as total_convites,
  (SELECT COUNT(*) FROM trip_invitations WHERE status = 'pending') as convites_pendentes,
  (SELECT COUNT(*) FROM trip_invitations WHERE status = 'accepted') as convites_aceitos,
  (SELECT COUNT(*) FROM trip_invitations WHERE status = 'rejected') as convites_rejeitados;

-- ============================================================================
-- 9. ESTATÍSTICAS POR VIAGEM
-- ============================================================================

SELECT 
  t.id as trip_id,
  t.name as trip_name,
  t.owner_id,
  t.status,
  t.start_date,
  t.end_date,
  COUNT(DISTINCT tm.id) as total_membros,
  COUNT(DISTINCT CASE WHEN tm.role = 'owner' THEN tm.id END) as total_owners,
  COUNT(DISTINCT CASE WHEN tm.role = 'member' THEN tm.id END) as total_members,
  COUNT(DISTINCT ti.id) as total_convites,
  COUNT(DISTINCT CASE WHEN ti.status = 'pending' THEN ti.id END) as convites_pendentes
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id
LEFT JOIN trip_invitations ti ON ti.trip_id = t.id
GROUP BY t.id, t.name, t.owner_id, t.status, t.start_date, t.end_date
ORDER BY t.created_at DESC;

-- ============================================================================
-- INSTRUÇÕES:
-- ============================================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Revise cada seção de resultados
-- 3. Se houver problemas, use o script de correção
-- 4. Execute novamente para confirmar que problemas foram resolvidos
-- =====================================================
