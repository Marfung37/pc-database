-- create private schema used for hiding functions
CREATE SCHEMA IF NOT EXISTS "private";

REVOKE ALL ON SCHEMA private
FROM
  public,
  anon,
  authenticated;

GRANT USAGE ON SCHEMA private TO supabase_admin;

GRANT
EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO supabase_admin;
