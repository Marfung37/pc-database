CREATE TABLE "users" (
  "user_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "auth_id" uuid UNIQUE REFERENCES auth.users ON UPDATE CASCADE ON DELETE SET NULL,
  "username" varchar(255) UNIQUE NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "editor" bool NOT NULL DEFAULT false,
  "admin" bool NOT NULL DEFAULT false,
  "active" bool NOT NULL DEFAULT true
);

-- Auth schema and table just for reference. Actual implementation is provided by Supabase
CREATE SCHEMA if not exists "auth";

CREATE TABLE if not exists "auth"."users" (
  "id" uuid PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "raw_app_meta_data" jsonb
);

CREATE UNIQUE INDEX "user_auth_id_idex" ON "users" ("auth_id");

-- Link auth user to profile
CREATE OR REPLACE FUNCTION public.link_auth_login_to_app_user () RETURNS TRIGGER AS $$
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
EXECUTE PROCEDURE public.link_auth_login_to_app_user ();
