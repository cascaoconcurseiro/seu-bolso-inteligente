-- Corrigir trigger para criar vínculo bidirecional correto
CREATE OR REPLACE FUNCTION handle_family_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_member_id UUID;
  inviter_family_id UUID;
  invitee_family_id UUID;
  inviter_profile RECORD;
  invitee_profile RECORD;
BEGIN
  -- Só executar se o status mudou para 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Buscar perfis
    SELECT id, full_name, email INTO inviter_profile
    FROM profiles WHERE id = NEW.from_user_id;
    
    SELECT id, full_name, email INTO invitee_profile
    FROM profiles WHERE id = NEW.to_user_id;
    
    -- Buscar famílias
    SELECT id INTO inviter_family_id
    FROM families WHERE owner_id = NEW.from_user_id;
    
    SELECT id INTO invitee_family_id
    FROM families WHERE owner_id = NEW.to_user_id;
    
    -- 1. Adicionar convidado (to_user) na família do convidador (from_user)
    -- Verificar se já existe
    SELECT id INTO existing_member_id
    FROM family_members
    WHERE family_id = NEW.family_id
      AND linked_user_id = NEW.to_user_id
    LIMIT 1;
    
    IF existing_member_id IS NOT NULL THEN
      -- Atualizar membro existente
      UPDATE family_members
      SET status = 'active',
          role = NEW.role,
          name = invitee_profile.full_name
      WHERE id = existing_member_id;
    ELSE
      -- Criar novo membro
      INSERT INTO family_members (
        family_id,
        linked_user_id,
        name,
        email,
        role,
        status,
        invited_by
      ) VALUES (
        NEW.family_id,
        NEW.to_user_id,
        invitee_profile.full_name,
        invitee_profile.email,
        NEW.role,
        'active',
        NEW.from_user_id
      );
    END IF;
    
    -- 2. Adicionar convidador (from_user) na família do convidado (to_user)
    -- APENAS se o convidado tiver família E não for a mesma família
    IF invitee_family_id IS NOT NULL AND invitee_family_id != NEW.family_id THEN
      -- Verificar se já existe
      SELECT id INTO existing_member_id
      FROM family_members
      WHERE family_id = invitee_family_id
        AND linked_user_id = NEW.from_user_id
      LIMIT 1;
      
      IF existing_member_id IS NULL THEN
        -- Criar vínculo bidirecional
        INSERT INTO family_members (
          family_id,
          linked_user_id,
          name,
          email,
          role,
          status,
          invited_by
        ) VALUES (
          invitee_family_id,
          NEW.from_user_id,
          inviter_profile.full_name,
          inviter_profile.email,
          'editor',  -- Role padrão para vínculo bidirecional
          'active',
          NEW.to_user_id
        );
      END IF;
    END IF;
    
    -- 3. DELETAR o convite após processar
    DELETE FROM family_invitations WHERE id = NEW.id;
    
    -- Retornar NULL para cancelar o UPDATE (já deletamos)
    RETURN NULL;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se der erro, não aceitar o convite
    RAISE NOTICE 'Erro ao criar membro: %', SQLERRM;
    RETURN OLD;
END;
$$;;
