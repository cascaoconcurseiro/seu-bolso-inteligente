-- Correção: Marcar notificação como dispensada quando convite é respondido
-- Problema: Notificações de convite não somem após aceitar/rejeitar

CREATE OR REPLACE FUNCTION handle_trip_invitation_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending' THEN
    -- Marcar notificação como lida E dispensada
    UPDATE notifications
    SET is_read = true,
        read_at = NOW(),
        is_dismissed = true,
        dismissed_at = NOW()
    WHERE related_id = NEW.id
      AND related_type = 'trip_invitation'
      AND type = 'TRIP_INVITE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_handle_trip_invitation_response ON trip_invitations;
CREATE TRIGGER trg_handle_trip_invitation_response
AFTER UPDATE ON trip_invitations
FOR EACH ROW
WHEN (NEW.status != OLD.status)
EXECUTE FUNCTION handle_trip_invitation_response();

-- Limpar notificações antigas de convites já respondidos
UPDATE notifications
SET is_dismissed = true,
    dismissed_at = NOW()
WHERE type = 'TRIP_INVITE'
  AND related_type = 'trip_invitation'
  AND related_id IN (
    SELECT id FROM trip_invitations
    WHERE status IN ('accepted', 'rejected')
  )
  AND is_dismissed = false;

-- Verificar resultado
SELECT 
  'Notificações de convites respondidos' as status,
  COUNT(*) as total_dispensadas
FROM notifications
WHERE type = 'TRIP_INVITE'
  AND is_dismissed = true;
