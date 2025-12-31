-- ==========================================
-- SCRIPT DE REPARAÇÃO: AMBIGUIDADE DE trip_id
-- Data: 27/12/2025
-- Descrição: Qualifica explicitamente as referências a trip_id
-- nas Políticas de Segurança (RLS) e funções.
-- ==========================================

BEGIN;

-- 1. Limpeza de Políticas Antigas (para garantir estado limpo)
DROP POLICY IF EXISTS "Usuários podem ver convites recebidos" ON public.trip_invitations;
DROP POLICY IF EXISTS "Usuários podem ver convites enviados" ON public.trip_invitations;
DROP POLICY IF EXISTS "Donos de viagem podem criar convites" ON public.trip_invitations;
DROP POLICY IF EXISTS "Convidados podem responder convites" ON public.trip_invitations;

-- 2. Recriação com Qualificação Explícita
-- Nota: Usamos trip_invitations.trip_id para evitar ambiguidade com trips.id ou variáveis

-- Ver convites recebidos
CREATE POLICY "Usuários podem ver convites recebidos"
    ON public.trip_invitations FOR SELECT
    USING (auth.uid() = invitee_id);

-- Ver convites enviados
CREATE POLICY "Usuários podem ver convites enviados"
    ON public.trip_invitations FOR SELECT
    USING (auth.uid() = inviter_id);

-- Donos de viagem podem criar convites
-- Aqui qualificamos o SELECT na tabela trips
CREATE POLICY "Donos de viagem podem criar convites"
    ON public.trip_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_invitations.trip_id  -- QUALIFICAÇÃO CRÍTICA
            AND t.user_id = auth.uid()
        )
    );

-- Convidados podem atualizar apenas o status (responder)
CREATE POLICY "Convidados podem responder convites"
    ON public.trip_invitations FOR UPDATE
    USING (auth.uid() = invitee_id)
    WITH CHECK (auth.uid() = invitee_id);


-- 3. Atualização da Função de Gatilho (Trigger Function)
-- Garantindo que referências internas não sejam ambíguas
CREATE OR REPLACE FUNCTION public.handle_trip_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_id UUID;
    v_invitee_id UUID;
BEGIN
    IF (NEW.status = 'accepted' AND OLD.status = 'pending') THEN
        -- Captura valores explicitamente
        v_trip_id := NEW.trip_id;
        v_invitee_id := NEW.invitee_id;

        -- Inserir membro na viagem se não existir
        -- Qualificamos as colunas da tabela trip_members (tm)
        INSERT INTO public.trip_members (trip_id, user_id, role)
        SELECT v_trip_id, v_invitee_id, 'member'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.trip_members tm
            WHERE tm.trip_id = v_trip_id 
            AND tm.user_id = v_invitee_id
        );
        
        -- Opcional: Log de sucesso
        RAISE NOTICE 'Convite aceito para viagem % pelo usuário %', v_trip_id, v_invitee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- INSTRUÇÕES DE USO:
-- 1. Copie este script e execute no SQL Editor do Supabase.
-- 2. Isso resolverá o erro "column reference 'trip_id' is ambiguous".
-- 3. O frontend já está preparado com uma correção redundante (fetch sequencial).
