-- Migration: Corrige o nível de segurança da função de responder convites
-- Permite que o convidado (invitee) possa aceitar o convite, inserindo em trip_members e notificando o owner,
-- tarefas que normalmente são bloqueadas por RLS. A função agora é SECURITY DEFINER com verificação de auth.uid()

CREATE OR REPLACE FUNCTION public.fn_respond_trip_invitation(p_invitation_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER -- Modificado de INVOKER para DEFINER para ignorar RLS nas inserções internas
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invitation RECORD;
    v_trip_name TEXT;
    v_invitee_name TEXT;
    v_result JSONB;
BEGIN
    -- Buscar dados do convite
    SELECT * INTO v_invitation FROM public.trip_invitations WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Convite não encontrado';
    END IF;

    -- Validar se o usuário atual é o verdadeiro convidado (segurança)
    IF v_invitation.invitee_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para responder a este convite.';
    END IF;

    IF v_invitation.status != 'pending' THEN
        RAISE EXCEPTION 'Este convite já foi respondido';
    END IF;

    -- Buscar nomes para notificação
    SELECT name INTO v_trip_name FROM public.trips WHERE id = v_invitation.trip_id;
    SELECT full_name INTO v_invitee_name FROM public.profiles WHERE id = v_invitation.invitee_id;

    -- Atualizar status do convite
    UPDATE public.trip_invitations 
    SET status = p_status,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;

    IF p_status = 'accepted' THEN
        -- Adicionar em trip_members
        INSERT INTO public.trip_members (trip_id, user_id, role, status)
        VALUES (v_invitation.trip_id, v_invitation.invitee_id, 'member', 'active')
        ON CONFLICT (trip_id, user_id) DO UPDATE SET status = 'active';

        -- Notificar o convidador
        PERFORM public.fn_create_notification(
            v_invitation.inviter_id,
            'Convite Aceito',
            COALESCE(v_invitee_name, 'Alguém') || ' aceitou seu convite para a viagem "' || COALESCE(v_trip_name, 'Sem nome') || '".',
            'GENERAL',
            v_invitation.trip_id::TEXT,
            jsonb_build_object('trip_id', v_invitation.trip_id),
            '/viagens'
        );
    ELSE
        -- Notificar o convidador da rejeição
        PERFORM public.fn_create_notification(
            v_invitation.inviter_id,
            'Convite Recusado',
            COALESCE(v_invitee_name, 'Alguém') || ' recusou seu convite para a viagem "' || COALESCE(v_trip_name, 'Sem nome') || '".',
            'GENERAL',
            v_invitation.trip_id::TEXT,
            jsonb_build_object('trip_id', v_invitation.trip_id),
            '/viagens'
        );
    END IF;

    -- Limpar notificação do convidado
    UPDATE public.notifications
    SET is_read = true, read_at = NOW(), is_dismissed = true, dismissed_at = NOW()
    WHERE related_id = p_invitation_id AND related_type = 'trip_invitation';

    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$function$;
