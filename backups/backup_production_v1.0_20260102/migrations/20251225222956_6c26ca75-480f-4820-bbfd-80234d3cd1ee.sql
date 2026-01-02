-- Função para criar vinculação bidirecional de membros da família
CREATE OR REPLACE FUNCTION public.create_bidirectional_family_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_other_user_family_id UUID;
    v_inviter_name TEXT;
    v_inviter_email TEXT;
    v_existing_link UUID;
BEGIN
    -- Se linked_user_id foi preenchido (usuário existe e foi vinculado)
    IF NEW.linked_user_id IS NOT NULL THEN
        -- Buscar a família do outro usuário (o que foi convidado)
        SELECT id INTO v_other_user_family_id
        FROM public.families
        WHERE owner_id = NEW.linked_user_id;
        
        -- Se o outro usuário tem uma família
        IF v_other_user_family_id IS NOT NULL THEN
            -- Buscar dados do dono da família que está convidando
            SELECT 
                f.owner_id,
                p.full_name,
                p.email
            INTO 
                v_existing_link,
                v_inviter_name,
                v_inviter_email
            FROM public.families f
            JOIN public.profiles p ON p.id = f.owner_id
            WHERE f.id = NEW.family_id;
            
            -- Verificar se já existe vínculo reverso
            SELECT id INTO v_existing_link
            FROM public.family_members
            WHERE family_id = v_other_user_family_id
            AND linked_user_id = (SELECT owner_id FROM families WHERE id = NEW.family_id);
            
            -- Se não existe, criar o vínculo reverso
            IF v_existing_link IS NULL THEN
                INSERT INTO public.family_members (
                    family_id,
                    linked_user_id,
                    user_id,
                    name,
                    email,
                    role,
                    status,
                    invited_by
                ) VALUES (
                    v_other_user_family_id,
                    (SELECT owner_id FROM families WHERE id = NEW.family_id),
                    (SELECT owner_id FROM families WHERE id = NEW.family_id),
                    COALESCE(v_inviter_name, 'Usuário'),
                    v_inviter_email,
                    'editor',
                    'active',
                    NEW.linked_user_id
                );
                
                RAISE NOTICE 'Vínculo bidirecional criado: % agora vê % na família dele', 
                    NEW.linked_user_id, v_inviter_name;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para criar vínculo bidirecional ao inserir/atualizar membro
DROP TRIGGER IF EXISTS create_bidirectional_link_trigger ON public.family_members;
CREATE TRIGGER create_bidirectional_link_trigger
AFTER INSERT OR UPDATE OF linked_user_id ON public.family_members
FOR EACH ROW
WHEN (NEW.linked_user_id IS NOT NULL)
EXECUTE FUNCTION public.create_bidirectional_family_link();