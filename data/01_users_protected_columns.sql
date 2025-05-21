CREATE OR REPLACE FUNCTION prevent_protected_users_field_changes () RETURNS TRIGGER AS $$
DECLARE
  current_auth_id uuid;
BEGIN
  current_auth_id := current_setting('request.jwt.claim.sub', true)::uuid;

  IF OLD.auth_id = current_auth_id THEN
    IF NEW.admin IS DISTINCT FROM OLD.admin
       OR NEW.editor IS DISTINCT FROM OLD.editor THEN
      RAISE EXCEPTION 'Cannot modify protected fields: admin or editor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_protected_users_field_updates BEFORE
UPDATE ON users FOR EACH ROW
EXECUTE FUNCTION prevent_protected_users_field_changes ();
