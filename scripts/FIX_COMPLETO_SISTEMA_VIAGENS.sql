-- ==========================================
-- CORREÇÃO COMPLETA: Sistema de Viagens
-- Data: 27/12/2024
-- Problema: Viagens não aparecem nem para criador
-- Causa: Código adiciona em trip_participants mas busca em trip_members
-- ==========================================

BEGIN;

-- ========================================
-- PARTE 1: Adicionar criadores como membros
-- ========================================

-- Adicionar todos os donos de viagens como membros em trip_members
INSERT INTO public.trip_members (
    trip_id,
    user_id,
    role,
    can_edit_details,
    can_manage_expenses,
    created_at
)
SELECT 
    t.id,
    t.owner_id,
    'owner',  -- Role de owner
    true,     -- Pode editar detalhes
    true,     -- Pode gerenciar despesas
    t.created_at
FROM public.trips t
WHERE NOT EXISTS (
    -- Verificar se já não é membro
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = t.id
      AND tm.user_id = t.owner_id
)
ON CONFLICT (trip_id, user_id) DO UPDATE
SET role = 'owner',
    can_edit_details = true,
    can_manage_expenses = true;

-- ========================================
-- PARTE 2: Migrar trip_participants para trip_members
-- ========================================

-- Adicionar todos os participantes como membros
INSERT INTO public.trip_members (
    trip_id,
    user_id,
    role,
    can_edit_details,
    can_manage_expenses,
    created_at
)
SELECT 
    tp.trip_id,
    tp.user_id,
    'member',
    false,
    true,
    tp.created_at
FROM public.trip_participants tp
WHERE tp.user_id IS NOT NULL  -- Apenas participantes com user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = tp.trip_id
      AND tm.user_id = tp.user_id
  )
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ========================================
-- PARTE 3: Criar trigger para adicionar criador automaticamente
-- ========================================

CREATE OR REPLACE FUNCTION public.add_trip_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Adicionar o criador como membro owner automaticamente
    INSERT INTO public.trip_members (
        trip_id,
        user_id,
        role,
        can_edit_details,
        can_manage_expenses
    )
    VALUES (
        NEW.id,
        NEW.owner_id,
        'owner',
        true,
        true
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_add_trip_creator_as_member ON public.trips;

-- Criar trigger
CREATE TRIGGER trg_add_trip_creator_as_member
    AFTER INSERT ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.add_trip_creator_as_member();

-- ========================================
-- PARTE 4: Atualizar políticas RLS de trip_members
-- ========================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Trip members are added via invitations" ON public.trip_members;
DROP POLICY IF EXISTS "Users can view trip members" ON public.trip_members;
DROP POLICY IF EXISTS "Trip owners can add members" ON public.trip_members;
DROP POLICY IF EXISTS "Trip owners can remove members" ON public.trip_members;

-- Política de SELECT: membros podem ver outros membros da mesma viagem
CREATE POLICY "Users can view trip members"
    ON public.trip_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_members tm
            WHERE tm.trip_id = trip_members.trip_id
              AND tm.user_id = auth.uid()
        )
    );

-- Política de INSERT: owners podem adicionar, sistema pode adicionar via trigger
CREATE POLICY "Trip owners and system can add members"
    ON public.trip_members FOR INSERT
    WITH CHECK (
        -- Owner da viagem pode adicionar
        EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_members.trip_id 
              AND t.owner_id = auth.uid()
        )
        OR
        -- Sistema pode adicionar (via trigger de convite ou criação)
        trip_members.user_id = auth.uid()
    );

-- Política de DELETE: apenas owners podem remover membros
CREATE POLICY "Trip owners can remove members"
    ON public.trip_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_members.trip_id 
              AND t.owner_id = auth.uid()
        )
    );

COMMIT;

-- ==========================================
-- VERIFICAÇÃO FINAL
-- ==========================================

-- 1. Ver todas as viagens e seus membros
SELECT 
    t.name as trip_name,
    t.owner_id,
    p_owner.email as owner_email,
    COUNT(tm.id) as total_members,
    STRING_AGG(p_member.email, ', ') as members
FROM trips t
LEFT JOIN profiles p_owner ON p_owner.id = t.owner_id
LEFT JOIN trip_members tm ON tm.trip_id = t.id
LEFT JOIN profiles p_member ON p_member.id = tm.user_id
GROUP BY t.id, t.name, t.owner_id, p_owner.email
ORDER BY t.created_at DESC;

-- 2. Ver se todos os owners são membros
SELECT 
    t.name as trip_name,
    p.email as owner_email,
    CASE 
        WHEN tm.id IS NOT NULL THEN '✅ É membro'
        ELSE '❌ NÃO é membro'
    END as member_status,
    tm.role
FROM trips t
LEFT JOIN profiles p ON p.id = t.owner_id
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
ORDER BY t.created_at DESC;

-- 3. Contar totais
SELECT 
    'Total de viagens' as metric,
    COUNT(*) as count
FROM trips
UNION ALL
SELECT 
    'Total de membros' as metric,
    COUNT(*) as count
FROM trip_members
UNION ALL
SELECT 
    'Viagens sem membros' as metric,
    COUNT(*) as count
FROM trips t
WHERE NOT EXISTS (
    SELECT 1 FROM trip_members tm WHERE tm.trip_id = t.id
);
