DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop composite types
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT n.nspname as schema, t.typname as name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'c' -- composite types
  )
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.name);
  END LOOP;
END $$;

-- Drop enum types
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT n.nspname as schema, t.typname as name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e' -- enum types
  )
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.name);
  END LOOP;
END $$;

-- Drop domain types
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT domain_name
    FROM information_schema.domains
    WHERE domain_schema = 'public'
  )
  LOOP
    EXECUTE format('DROP DOMAIN IF EXISTS public.%I CASCADE', r.domain_name);
  END LOOP;
END $$;
