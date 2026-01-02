-- 1. Criar função para criar notificação quando convite de viagem é criado
CREATE OR REPLACE FUNCTION create_trip_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  trip_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Buscar nome da viagem
  SELECT name INTO trip_name
  FROM trips
  WHERE id = NEW.trip_id;
  
  -- Buscar nome do convidador
  SELECT full_name INTO inviter_name
  FROM profiles
  WHERE id = NEW.inviter_id;
  
  -- Criar notificação para o convidado
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    icon,
    action_url,
    action_label,
    related_id,
    related_type,
    priority
  ) VALUES (
    NEW.invitee_id,
    'TRIP_INVITE',
    'Convite para viagem',
    COALESCE(inviter_name, 'Alguém') || ' convidou você para participar da viagem "' || COALESCE(trip_name, 'Sem nome') || '"',
    '✈️',
    '/viagens',
    'Ver convite',
    NEW.id,
    'trip_invitation',
    'HIGH'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar trigger
DROP TRIGGER IF EXISTS trg_create_trip_invitation_notification ON trip_invitations;
CREATE TRIGGER trg_create_trip_invitation_notification
AFTER INSERT ON trip_invitations
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION create_trip_invitation_notification();

-- 3. Criar função para marcar notificação como lida quando convite é respondido
CREATE OR REPLACE FUNCTION handle_trip_invitation_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending' THEN
    -- Marcar notificação como lida
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE related_id = NEW.id
      AND related_type = 'trip_invitation'
      AND type = 'TRIP_INVITE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger para resposta
DROP TRIGGER IF EXISTS trg_handle_trip_invitation_response ON trip_invitations;
CREATE TRIGGER trg_handle_trip_invitation_response
AFTER UPDATE ON trip_invitations
FOR EACH ROW
WHEN (NEW.status != OLD.status)
EXECUTE FUNCTION handle_trip_invitation_response();

-- 5. Criar notificação para convite existente de Wesley
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  icon,
  action_url,
  action_label,
  related_id,
  related_type,
  priority
)
SELECT 
  ti.invitee_id,
  'TRIP_INVITE',
  'Convite para viagem',
  COALESCE(p.full_name, 'Alguém') || ' convidou você para participar da viagem "' || COALESCE(t.name, 'Sem nome') || '"',
  '✈️',
  '/viagens',
  'Ver convite',
  ti.id,
  'trip_invitation',
  'HIGH'
FROM trip_invitations ti
JOIN trips t ON t.id = ti.trip_id
JOIN profiles p ON p.id = ti.inviter_id
WHERE ti.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.related_id = ti.id
      AND n.related_type = 'trip_invitation'
  );

-- 6. Verificar resultado
SELECT 
  'Notificações criadas' as status,
  COUNT(*) as total
FROM notifications
WHERE type = 'TRIP_INVITE';;
