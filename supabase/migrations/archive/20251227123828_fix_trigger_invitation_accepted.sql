-- Corrigir trigger para remover ON CONFLICT
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_from_family_id UUID;
  v_to_family_id UUID;
BEGIN
  -- Se mudou para 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Buscar família de quem enviou
    SELECT id INTO v_from_family_id
    FROM families
    WHERE owner_id = NEW.from_user_id
    LIMIT 1;
    
    -- Buscar família de quem aceitou
    SELECT id INTO v_to_family_id
    FROM families
    WHERE owner_id = NEW.to_user_id
    LIMIT 1;
    
    -- Criar membro na família de quem enviou (se não existir)
    IF v_from_family_id IS NOT NULL THEN
      INSERT INTO family_members (
        family_id,
        user_id,
        linked_user_id,
        name,
        email,
        role,
        status,
        invited_by
      )
      SELECT
        v_from_family_id,
        NEW.from_user_id,
        NEW.to_user_id,
        NEW.member_name,
        (SELECT email FROM profiles WHERE id = NEW.to_user_id),
        NEW.role,
        'active',
        NEW.from_user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM family_members
        WHERE family_id = v_from_family_id
        AND user_id = NEW.from_user_id
        AND linked_user_id = NEW.to_user_id
      );
    END IF;
    
    -- Criar membro recíproco na família de quem aceitou (se não existir)
    IF v_to_family_id IS NOT NULL THEN
      INSERT INTO family_members (
        family_id,
        user_id,
        linked_user_id,
        name,
        email,
        role,
        status,
        invited_by
      )
      SELECT
        v_to_family_id,
        NEW.to_user_id,
        NEW.from_user_id,
        (SELECT full_name FROM profiles WHERE id = NEW.from_user_id),
        (SELECT email FROM profiles WHERE id = NEW.from_user_id),
        NEW.role,
        'active',
        NEW.to_user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM family_members
        WHERE family_id = v_to_family_id
        AND user_id = NEW.to_user_id
        AND linked_user_id = NEW.from_user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
