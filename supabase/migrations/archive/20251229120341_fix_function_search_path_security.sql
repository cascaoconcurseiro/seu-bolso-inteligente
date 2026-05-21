-- Fix search_path for all functions (Security)

-- 1. update_family_invitations_updated_at
CREATE OR REPLACE FUNCTION public.update_family_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. user_is_trip_member
CREATE OR REPLACE FUNCTION public.user_is_trip_member(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
END;
$$;

-- 3. handle_invitation_accepted
CREATE OR REPLACE FUNCTION public.handle_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO family_members (family_id, user_id, name, role, invited_by)
    VALUES (NEW.family_id, NEW.invitee_id, 
            (SELECT full_name FROM profiles WHERE id = NEW.invitee_id),
            'member', NEW.inviter_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. handle_trip_invitation_accepted
CREATE OR REPLACE FUNCTION public.handle_trip_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO trip_members (trip_id, user_id)
    VALUES (NEW.trip_id, NEW.invitee_id)
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. user_can_view_trip
CREATE OR REPLACE FUNCTION public.user_can_view_trip(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips t
    LEFT JOIN trip_members tm ON t.id = tm.trip_id
    WHERE t.id = p_trip_id
    AND (t.owner_id = p_user_id OR tm.user_id = p_user_id)
  );
END;
$$;

-- 6. sync_transaction_settled_status
CREATE OR REPLACE FUNCTION public.sync_transaction_settled_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_settled = TRUE AND OLD.is_settled = FALSE THEN
    UPDATE transactions
    SET is_settled = TRUE, settled_at = NEW.settled_at
    WHERE id = NEW.settled_transaction_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. add_trip_owner
CREATE OR REPLACE FUNCTION public.add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;;
