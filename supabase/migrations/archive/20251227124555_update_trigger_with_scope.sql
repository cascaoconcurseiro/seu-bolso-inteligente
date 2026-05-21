-- Atualizar trigger para copiar campos de escopo
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_from_family_id UUID;
  v_to_family_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT id INTO v_from_family_id FROM families WHERE owner_id = NEW.from_user_id LIMIT 1;
    SELECT id INTO v_to_family_id FROM families WHERE owner_id = NEW.to_user_id LIMIT 1;
    
    IF v_from_family_id IS NOT NULL THEN
      INSERT INTO family_members (
        family_id, user_id, linked_user_id, name, email, role, status, invited_by,
        sharing_scope, scope_start_date, scope_end_date, scope_trip_id
      )
      SELECT
        v_from_family_id, NEW.from_user_id, NEW.to_user_id, NEW.member_name,
        (SELECT email FROM profiles WHERE id = NEW.to_user_id),
        NEW.role, 'active', NEW.from_user_id,
        NEW.sharing_scope, NEW.scope_start_date, NEW.scope_end_date, NEW.scope_trip_id
      WHERE NOT EXISTS (
        SELECT 1 FROM family_members
        WHERE family_id = v_from_family_id AND user_id = NEW.from_user_id AND linked_user_id = NEW.to_user_id
      );
    END IF;
    
    IF v_to_family_id IS NOT NULL THEN
      INSERT INTO family_members (
        family_id, user_id, linked_user_id, name, email, role, status, invited_by,
        sharing_scope, scope_start_date, scope_end_date, scope_trip_id
      )
      SELECT
        v_to_family_id, NEW.to_user_id, NEW.from_user_id,
        (SELECT full_name FROM profiles WHERE id = NEW.from_user_id),
        (SELECT email FROM profiles WHERE id = NEW.from_user_id),
        NEW.role, 'active', NEW.to_user_id,
        NEW.sharing_scope, NEW.scope_start_date, NEW.scope_end_date, NEW.scope_trip_id
      WHERE NOT EXISTS (
        SELECT 1 FROM family_members
        WHERE family_id = v_to_family_id AND user_id = NEW.to_user_id AND linked_user_id = NEW.from_user_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
