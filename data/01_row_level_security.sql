CREATE OR REPLACE FUNCTION public.has_edit_permission () RETURNS boolean LANGUAGE SQL
SET
  search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_id = (SELECT auth.uid())
      AND (users.editor = true OR users.admin = true)
  )
$$;

CREATE OR REPLACE FUNCTION public.has_admin_permission () RETURNS boolean LANGUAGE SQL
SET
  search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_id = (SELECT auth.uid())
      AND users.admin = true
  )
$$;

-- schema metadata RLS
-- SELECT all
-- INSERT admin only
-- UPDATE never
-- DELETE never
ALTER TABLE schema_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_schema_metadata ON schema_metadata;

CREATE POLICY view_schema_metadata ON schema_metadata FOR
SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS insert_schema_metadata ON schema_metadata;

CREATE POLICY insert_schema_metadata ON schema_metadata FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_admin_permission ()
    )
  );

-- users RLS
-- SELECT only self for username, email, editor and admin all
-- INSERT admin only
-- UPDATE only self for username and email and admin all
-- DELETE admin only
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_users ON users;

CREATE POLICY view_users ON users FOR
SELECT
  TO authenticated USING (
    -- self
    auth_id = (
      SELECT
        auth.uid ()
    )
    OR
    -- has admin permission
    (
      SELECT
        public.has_admin_permission ()
    )
  );

DROP POLICY IF EXISTS insert_users ON users;

CREATE POLICY insert_users ON users FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_admin_permission ()
    )
  );

DROP POLICY IF EXISTS update_users ON users;

CREATE POLICY update_users ON users
FOR UPDATE
  TO authenticated USING (
    -- self
    auth_id = (
      SELECT
        auth.uid ()
    )
    OR
    -- has admin permission
    (
      SELECT
        public.has_admin_permission ()
    )
  );

DROP POLICY IF EXISTS delete_users ON users;

CREATE POLICY delete_users ON users FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_admin_permission ()
  )
);

-- setups RLS
-- SELECT all setups
-- INSERT if have editor set
-- UPDATE if have editor set
-- DELETE if have editor set
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_setups ON setups;

CREATE POLICY view_setups ON setups FOR
SELECT
  TO authenticated,
  anon USING (true);

DROP POLICY IF EXISTS edit_setups ON setups;

CREATE POLICY edit_setups ON setups FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_edit_permission ()
    )
    -- only can set oqb_path to setup_id if want to disregard need to put pieces
    AND (
      (
        oqb_path IS NULL
        OR oqb_path::text = setup_id
      )
      AND oqb_depth IS NULL
    )
  );

DROP POLICY IF EXISTS update_setups ON setups;

CREATE POLICY update_setups ON setups
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS delete_setups ON setups;

CREATE POLICY delete_setups ON setups FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_edit_permission ()
  )
);

-- setup variants RLS
-- SELECT all setups variants
-- INSERT if have editor set
-- UPDATE if have editor set
-- DELETE if have editor set
ALTER TABLE setup_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_setup_variants ON setup_variants;

CREATE POLICY view_setup_variants ON setup_variants FOR
SELECT
  TO authenticated,
  anon USING (true);

DROP POLICY IF EXISTS edit_setup_variants ON setup_variants;

CREATE POLICY edit_setup_variants ON setup_variants FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS update_setup_variants ON setup_variants;

CREATE POLICY update_setup_variants ON setup_variants
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS delete_setup_variants ON setup_variants;

CREATE POLICY delete_setup_variants ON setup_variants FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_edit_permission ()
  )
);

-- setup links RLS
-- SELECT all setup links
-- INSERT if have editor set
-- UPDATE if have editor set
-- DELETE if have editor set
ALTER TABLE setup_oqb_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_setup_oqb_links ON setup_oqb_links;

CREATE POLICY view_setup_oqb_links ON setup_oqb_links FOR
SELECT
  TO authenticated,
  anon USING (true);

DROP POLICY IF EXISTS edit_setup_oqb_links ON setup_oqb_links;

CREATE POLICY edit_setup_oqb_links ON setup_oqb_links FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS update_setup_oqb_links ON setup_oqb_links;

CREATE POLICY update_setup_oqb_links ON setup_oqb_links
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS delete_setup_oqb_links ON setup_oqb_links;

CREATE POLICY delete_setup_oqb_links ON setup_oqb_links FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_edit_permission ()
  )
);

-- statistics RLS
-- SELECT all statistics
-- INSERT if have editor set
-- UPDATE if have editor set
-- DELETE if have editor set
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_statistics ON statistics;

CREATE POLICY view_statistics ON statistics FOR
SELECT
  TO authenticated,
  anon USING (true);

DROP POLICY IF EXISTS edit_statistics ON statistics;

CREATE POLICY edit_statistics ON statistics FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS update_statistics ON statistics;

CREATE POLICY update_statistics ON statistics
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS delete_statistics ON statistics;

CREATE POLICY delete_statistics ON statistics FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_edit_permission ()
  )
);

-- save_data RLS
-- SELECT all save_data
-- INSERT if have editor set
-- UPDATE if have editor set
-- DELETE if have editor set
ALTER TABLE save_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_save_data ON save_data;

CREATE POLICY view_save_data ON save_data FOR
SELECT
  TO authenticated,
  anon USING (true);

DROP POLICY IF EXISTS edit_save_data ON save_data;

CREATE POLICY edit_save_data ON save_data FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS update_save_data ON save_data;

CREATE POLICY update_save_data ON save_data
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS delete_save_data ON save_data;

CREATE POLICY delete_save_data ON save_data FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_edit_permission ()
  )
);

-- saves RLS
-- SELECT all saves
-- INSERT if have editor set
-- UPDATE if have editor set
-- DELETE if have editor set
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_saves ON saves;

CREATE POLICY view_saves ON saves FOR
SELECT
  TO authenticated,
  anon USING (true);

DROP POLICY IF EXISTS edit_saves ON saves;

CREATE POLICY edit_saves ON saves FOR INSERT TO authenticated
WITH
  CHECK (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS update_saves ON saves;

CREATE POLICY update_saves ON saves
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        public.has_edit_permission ()
    )
  );

DROP POLICY IF EXISTS delete_saves ON saves;

CREATE POLICY delete_saves ON saves FOR DELETE TO authenticated USING (
  (
    SELECT
      public.has_edit_permission ()
  )
);
