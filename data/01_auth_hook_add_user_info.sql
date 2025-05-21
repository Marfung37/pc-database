-- Add profile info to JWT auth claims under "app_metadata"
CREATE OR REPLACE FUNCTION auth_hook_add_user_info (event jsonb) returns jsonb security definer language plpgsql AS $$
DECLARE
    claims   jsonb;
    _user_id uuid;
BEGIN
    -- Get user id from public.users table from auth id
    SELECT users.user_id INTO _user_id FROM public.users WHERE auth_id = (event ->> 'user_id')::uuid;

    -- Extract claims
    claims := event -> 'claims';

    -- Add App User ID to claims for sanity
    claims := jsonb_set(claims, '{user_id}', to_jsonb(_user_id));

    -- Check if 'app_metadata' exists in claims
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
        claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- Add user info to claim. Omitting email as it is already in the claims
    claims := jsonb_set(claims, '{app_metadata, user_info}',
                        (SELECT jsonb_build_object(
                                        'user_id', u.user_id,
                                        'username', u.username, 
                                        'active', u.active,
                                        'editor', u.editor,
                                        'admin', u.admin)
                         FROM public.users u
                         WHERE u.user_id = _user_id));

    -- Update original event
    event := jsonb_set(event, '{claims}', claims);

    -- Update auth table
    UPDATE auth.users SET raw_app_meta_data = claims -> 'app_metadata' WHERE id = (event ->> 'user_id')::uuid;
    RETURN event;
END
$$;

GRANT
EXECUTE ON FUNCTION public.auth_hook_add_user_info TO supabase_auth_admin;

REVOKE
EXECUTE ON FUNCTION public.auth_hook_add_user_info
FROM
  authenticated,
  anon,
  PUBLIC;
