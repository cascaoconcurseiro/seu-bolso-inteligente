-- 1. Remover convites aceitos (já viraram membros)
DELETE FROM family_invitations 
WHERE status = 'accepted';

-- 2. Criar índice único parcial para evitar convites duplicados pendentes
DROP INDEX IF EXISTS idx_unique_pending_invitation;

CREATE UNIQUE INDEX idx_unique_pending_invitation 
ON family_invitations (from_user_id, to_user_id, family_id)
WHERE status = 'pending';

-- 3. Modificar trigger para deletar convite após aceitar
CREATE OR REPLACE FUNCTION handle_family_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_member_id UUID;
BEGIN
  -- Só executar se o status mudou para 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Verificar se já existe um membro com esse linked_user_id
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
          name = NEW.member_name
      WHERE id = existing_member_id;
    ELSE
      -- Criar novo membro
      INSERT INTO family_members (
        family_id,
        user_id,
        linked_user_id,
        name,
        role,
        status,
        invited_by
      ) VALUES (
        NEW.family_id,
        NULL,
        NEW.to_user_id,
        NEW.member_name,
        NEW.role,
        'active',
        NEW.from_user_id
      );
    END IF;
    
    -- DELETAR o convite após processar
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
