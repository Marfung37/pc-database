-- Link auth user to profile
CREATE OR REPLACE FUNCTION private.link_auth_login_to_app_user () RETURNS TRIGGER
SET
  search_path = '' AS $$
BEGIN
    -- check if profile already exists by email; otherwise error out
    IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
        UPDATE public.users SET auth_id = NEW.id WHERE email = NEW.email;
    ELSE
        RAISE EXCEPTION 'App user with email % does not exist. Will not create new auth user', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_app_user_exists
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE PROCEDURE private.link_auth_login_to_app_user ();
