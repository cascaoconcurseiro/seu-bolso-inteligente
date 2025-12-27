-- ==========================================
-- CORREÇÃO DEFINITIVA: AMBIGUIDADE DE trip_id
-- Data: 27/12/2024
-- Problema: Erro "column reference 'trip_id' is ambiguous"
-- Solução: Qualificar explicitamente todas as referências
-- ==========================================

BEGIN;

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver convites recebidos" ON public.trip_invitations;
DROP POLICY IF EXISTS "Usuários podem ver convites enviados" ON public.trip_invitations;
DROP POLICY IF EXISTS "Donos de viagem podem criar convites" ON public.trip_invitations;
DROP POLICY IF EXISTS "Convidados podem responder convites" ON public.trip_invitations;

-- 2. Recriar políticas com qualificação explícita

-- Ver convites recebidos
CREATE POLICY "Usuários podem ver convites recebidos"
    ON public.trip_invitations FOR SELECT
    USING (auth.uid() = invitee_id);

-- Ver convites enviados
CREATE POLICY "Usuários podem ver convites enviados"
    ON public.trip_invitations FOR SELECT
    USING (auth.uid() = inviter_id);

-- Donos de viagem podem criar convites
-- CRÍTICO: Qualificar trip_invitations.trip_id para evitar ambiguidade
CREATE POLICY "Donos de viagem podem criar convites"
    ON public.trip_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_invitations.trip_id
            AND t.user_id = auth.uid()
        )
    );

-- Convidados podem responder convites
CREATE POLICY "Convidados podem responder convites"
    ON public.trip_invitations FOR UPDATE
    USING (auth.uid() = invitee_id)
    WITH CHECK (auth.uid() = invitee_id);

-- 3. Corrigir função de trigger
CREATE OR REPLACE FUNCTION public.handle_trip_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_id UUID;
    v_invitee_id UUID;
BEGIN
    IF (NEW.status = 'accepted' AND OLD.status = 'pending') THEN
        -- Capturar valores em variáveis para evitar ambiguidade
        v_trip_id := NEW.trip_id;
        v_invitee_id := NEW.invitee_id;

        -- Inserir membro na viagem (qualificando tm.trip_id)
        INSERT INTO public.trip_members (trip_id, user_id, role)
        SELECT v_trip_id, v_invitee_id, 'member'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.trip_members tm
            WHERE tm.trip_id = v_trip_id 
            AND tm.user_id = v_invitee_id
        );
        
        RAISE NOTICE 'Convite aceito: viagem=%, usuário=%', v_trip_id, v_invitee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ==========================================
-- INSTRUÇÕES:
-- 1. Copie este script completo
-- 2. Abra o SQL Editor do Supabase
-- 3. Cole e execute
-- 4. Teste aceitando um convite de viagem
-- ==========================================
