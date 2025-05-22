-- prevent modifying user_id or auth_id
REVOKE INSERT (user_id, auth_id),
UPDATE (user_id, auth_id) ON users
FROM
  PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION private.prevent_protected_users_field_changes () RETURNS TRIGGER
SET
  search_path = public AS $$
DECLARE
  current_auth_id uuid;
BEGIN
  current_auth_id := current_setting('request.jwt.claim.sub', true)::uuid;

  -- changing self
  IF OLD.auth_id = current_auth_id THEN
     IF NEW.admin IS DISTINCT FROM OLD.admin
       OR NEW.editor IS DISTINCT FROM OLD.editor THEN
      RAISE EXCEPTION 'Cannot modify protected fields from self: admin or editor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protected_users_field_updates BEFORE
UPDATE ON users FOR EACH ROW
EXECUTE FUNCTION private.prevent_protected_users_field_changes ();
