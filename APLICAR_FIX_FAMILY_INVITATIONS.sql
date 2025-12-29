-- ============================================
-- FIX: Trigger para aceitar convites de família
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Trigger para criar family_member automaticamente quando convite é aceito
CREATE OR REPLACE FUNCTION handle_family_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executar se o status mudou para 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Criar o membro da família
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
      NULL, -- user_id será preenchido quando o usuário se vincular
      NEW.to_user_id, -- linked_user_id é o usuário convidado
      NEW.member_name,
      NEW.role,
      'active',
      NEW.from_user_id
    )
    ON CONFLICT (family_id, linked_user_id) 
    DO UPDATE SET
      status = 'active',
      role = EXCLUDED.role,
      name = EXCLUDED.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_family_invitation_accepted ON family_invitations;
CREATE TRIGGER trg_family_invitation_accepted
  AFTER UPDATE ON family_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_family_invitation_accepted();

-- Verificar se funcionou
SELECT 'Trigger criado com sucesso!' as status;
