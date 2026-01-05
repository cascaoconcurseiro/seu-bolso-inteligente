CREATE OR REPLACE FUNCTION sync_profile_to_family_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar family_members quando o profile for atualizado
  UPDATE family_members
  SET 
    avatar_url = NEW.avatar_url,
    avatar_color = NEW.avatar_color,
    avatar_icon = NEW.avatar_icon
  WHERE linked_user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_profile_to_family_members_trigger ON profiles;

CREATE TRIGGER sync_profile_to_family_members_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR OLD.avatar_color IS DISTINCT FROM NEW.avatar_color OR OLD.avatar_icon IS DISTINCT FROM NEW.avatar_icon)
EXECUTE FUNCTION sync_profile_to_family_members();;
