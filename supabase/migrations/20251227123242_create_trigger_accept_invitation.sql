-- Trigger para criar vínculo automático quando solicitação é aceita
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou para 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Criar membro na família de quem enviou
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
    VALUES (
      NEW.family_id,
      NEW.from_user_id,
      NEW.to_user_id,
      NEW.member_name,
      (SELECT email FROM profiles WHERE id = NEW.to_user_id),
      NEW.role,
      'active',
      NEW.from_user_id
    )
    ON CONFLICT (family_id, user_id, linked_user_id) DO NOTHING;
    
    -- Criar membro recíproco na família de quem aceitou
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
      f2.id,
      NEW.to_user_id,
      NEW.from_user_id,
      (SELECT full_name FROM profiles WHERE id = NEW.from_user_id),
      (SELECT email FROM profiles WHERE id = NEW.from_user_id),
      NEW.role,
      'active',
      NEW.to_user_id
    FROM families f2
    WHERE f2.owner_id = NEW.to_user_id
    ON CONFLICT (family_id, user_id, linked_user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_invitation_accepted
AFTER UPDATE ON family_invitations
FOR EACH ROW
EXECUTE FUNCTION handle_invitation_accepted();;
