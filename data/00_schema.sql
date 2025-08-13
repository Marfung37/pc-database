CREATE TYPE "kicktable" AS ENUM(
  'srs',
  'srs_plus',
  'srsx',
  'srs180',
  'tetrax',
  'asc',
  'ars',
  'none'
);

CREATE TYPE "hold_type" AS ENUM('any', 'cyclic', 'none');

CREATE TYPE "status" AS ENUM('processing', 'completed', 'failed');

CREATE TYPE "setup_type" AS ENUM (
  'regular',
  'qb',
  'oqb'
);

CREATE TYPE unsafe_fraction AS ("numerator" integer, "denominator" integer);

CREATE DOMAIN fraction AS unsafe_fraction CHECK (
  VALUE IS NULL
  OR (
    (VALUE)."denominator" <> 0
    AND (VALUE)."denominator" IS NOT NULL
    AND (VALUE)."numerator" IS NOT NULL
  )
);

CREATE DOMAIN setupid AS varchar(12) CHECK (VALUE ~ '^[1-9][0-9a-f]{11}$');

CREATE DOMAIN queue AS varchar(11) CHECK (
  VALUE IS NULL
  OR VALUE ~ '^[TILJSZO]+$'
);

CREATE DOMAIN fumen AS text CHECK (
  VALUE IS NULL
  OR VALUE ~ '^v115@[A-Za-z0-9+/?]+$'
);

CREATE OR REPLACE FUNCTION all_decimals_lte_100 (arr DECIMAL[]) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE
SET
  search_path = public AS $$
  SELECT bool_and(p <= 100) FROM unnest(arr) AS p
$$;

CREATE OR REPLACE FUNCTION is_valid_fraction_array (arr fraction[]) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE
SET
  search_path = public AS $$
  SELECT bool_and(
    f.numerator IS NOT NULL
    AND f.denominator IS NOT NULL
    AND f.denominator <> 0
  )
  FROM unnest(arr) AS f
$$;

CREATE TABLE "schema_metadata" (
  "version" text PRIMARY KEY,
  "description" text NOT NULL,
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "setups" (
  "setup_id" setupid PRIMARY KEY,
  "pc" smallint NOT NULL CHECK (pc BETWEEN 1 AND 9),
  "leftover" queue NOT NULL CHECK (LENGTH(leftover) <= 7), -- enforce tetris pieces
  "build" queue NOT NULL CHECK (LENGTH(build) <= 10), -- enforce tetris pieces
  "cover_pattern" varchar(255) NOT NULL, -- difficult to constrain
  "type" setup_type NOT NULL DEFAULT 'regular',
  "fumen" fumen NOT NULL, -- enforce fumen structure with version 115
  "solve_pattern" varchar(100), -- difficult to constrain
  "mirror" setupid,
  "see" smallint NOT NULL DEFAULT 7 CHECK (see BETWEEN 1 AND 11),
  "hold" smallint NOT NULL DEFAULT 1 CHECK (hold BETWEEN 0 AND 11),
  "credit" varchar(255),
  -- either all columns about solves are filled or is an oqb setup that doesn't solve
  CONSTRAINT no_solve_oqb_setup CHECK (
    (
      solve_pattern IS NULL
      AND type = 'oqb'::setup_type
    )
    OR (solve_pattern IS NOT NULL)
  ),
  FOREIGN KEY (mirror) REFERENCES setups (setup_id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "setup_translations" (
  "setup_id" setupid NOT NULL,
  "language_code" varchar(10) NOT NULL DEFAULT 'en',
  "cover_description" varchar(255) NOT NULL,
  FOREIGN KEY (setup_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "setup_oqb_paths" (
  "setup_id" setupid PRIMARY KEY,
  "parent_id" setupid,
  "oqb_path" ltree CHECK (
    oqb_path::text ~ '^[1-9][0-9a-f]{11}(\.[1-9][0-9a-f]{11})*$'
  ),
  FOREIGN KEY (setup_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "setup_variants" (
  "setup_id" setupid NOT NULL,
  "variant_number" smallint NOT NULL CHECK (variant_number > 0), -- 1 index with intent 0 is the entry in setups
  "build" queue NOT NULL CHECK (LENGTH(build) <= 10), -- enforce tetris pieces
  "fumen" fumen NOT NULL, -- enforce fumen structure with version 115
  "solve_pattern" varchar(100),
  PRIMARY KEY (setup_id, variant_number),
  FOREIGN KEY (setup_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "sets" (
  "set_id" SERIAL PRIMARY KEY,
  "category" varchar(50)
);

CREATE TABLE "setup_sets" (
  "setup_id" setupid NOT NULL,
  "set_id" int NOT NULL,
  FOREIGN KEY (set_id) REFERENCES sets (set_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (set_id) REFERENCES sets (set_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "set_translations" (
  "set_id" int NOT NULL,
  "language_code" varchar(10) NOT NULL DEFAULT 'en',
  "name" varchar(100) NOT NULL,
  "description" varchar(255) NOT NULL,
  FOREIGN KEY (set_id) REFERENCES sets (set_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "set_paths" (
  "set_id" int NOT NULL,
  "parent_id" int,
  "set_path" ltree CHECK (
    set_path::text ~ '^\d+(\.\d+)*$'
  ),
  FOREIGN KEY (set_id) REFERENCES sets (set_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES sets (set_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "statistics" (
  "stat_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "setup_id" setupid NOT NULL,
  "kicktable" kicktable NOT NULL,
  "hold_type" hold_type NOT NULL DEFAULT 'any',
  "cover_data" bytea, -- NULL is cover dependence is exactly what the setup covered by
  "solve_percent" decimal(5, 2) CHECK (
    solve_percent IS NULL
    OR solve_percent <= 100
  ),
  "solve_fraction" fraction,
  "all_solves" fumen,
  "minimal_solves" fumen,
  "true_minimal" bool,
  "path_file" bool NOT NULL DEFAULT FALSE,
  UNIQUE ("setup_id", "kicktable", "hold_type"),
  FOREIGN KEY (setup_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "saves" (
  "save_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "save" varchar(255) NOT NULL,
  "pc" smallint NOT NULL,
  "importance" smallint NOT NULL,
  "auto_populate" bool NOT NULL DEFAULT false,
  "gen_minimal" bool NOT NULL DEFAULT false,
  "gen_all_solves" bool NOT NULL DEFAULT false
);

CREATE TABLE "save_data" (
  "save_data_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "save_id" uuid NOT NULL,
  "stat_id" uuid NOT NULL,
  "save_percent" decimal(5, 2) CHECK (
    save_percent IS NULL
    OR save_percent <= 100
  ),
  "save_fraction" fraction,
  "priority_save_percent" decimal(5, 2) [],
  "priority_save_fraction" fraction[],
  "all_solves" fumen,
  "minimal_solves" fumen,
  "true_minimal" bool,
  "status" status NOT NULL,
  UNIQUE ("stat_id", "save_id"),
  CHECK (
    priority_save_percent IS NULL
    OR all_decimals_lte_100 (priority_save_percent)
  ),
  CHECK (
    priority_save_fraction IS NULL
    OR is_valid_fraction_array (priority_save_fraction)
  ),
  CHECK (
    (
      save_percent IS NOT NULL
      AND save_fraction IS NOT NULL
      AND priority_save_percent IS NULL
      AND priority_save_fraction IS NULL
    )
    OR (
      save_percent IS NULL
      AND save_fraction IS NULL
      AND priority_save_percent IS NOT NULL
      AND priority_save_fraction IS NOT NULL
    )
  ),
  FOREIGN KEY (stat_id) REFERENCES statistics (stat_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (save_id) REFERENCES saves (save_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "save_translations" (
  "save_id" uuid NOT NULL,
  "language_code" varchar(2) NOT NULL DEFAULT 'en',
  "name" varchar(100) NOT NULL,
  FOREIGN KEY (save_id) REFERENCES saves (save_id) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON COLUMN "setups"."setup_id" IS '12 hexdigits';

COMMENT ON COLUMN "setups"."pc" IS 'PC Number for 1-9';

COMMENT ON COLUMN "setups"."leftover" IS 'Pieces left from bag. Only TILJSZO allowed';

COMMENT ON COLUMN "setups"."build" IS 'Pieces used in setup. Only TILJSZO allowed';

COMMENT ON COLUMN "setups"."cover_pattern" IS 'Extended pieces notation for when setup is covered. Need not be perfect';

COMMENT ON COLUMN "setups"."type" IS 'Type of setup for regular, qb, or oqb';

COMMENT ON COLUMN "setups"."fumen" IS 'Fumen of the setup';

COMMENT ON COLUMN "setups"."solve_pattern" IS 'Extended pieces notation used for solving. NULL if internal node in oqb';

COMMENT ON COLUMN "setups"."mirror" IS 'References a setup_id for mirror setup';

COMMENT ON COLUMN "setups"."see" IS 'Number of pieces that can be seen';

COMMENT ON COLUMN "setups"."hold" IS 'Number of pieces that can be held';

COMMENT ON COLUMN "setups"."credit" IS 'Credit for founder of setup';

COMMENT ON COLUMN "setup_translations"."cover_description" IS 'Description for when to use this setup';

COMMENT ON COLUMN "setup_oqb_paths"."oqb_path" IS 'Materialized path of ids to this setup';

COMMENT ON TABLE "setup_variants" IS 'Setups where other pieces can be placed without affecting statistics';

COMMENT ON COLUMN "setup_variants"."variant_number" IS 'Variant number 1 indexed. Variant 0 is the entry in setups';

COMMENT ON COLUMN "setup_variants"."setup_id" IS '12 hexdigits';

COMMENT ON COLUMN "setup_variants"."build" IS 'Pieces used in setup. Only TILJSZO allowed';

COMMENT ON COLUMN "setup_variants"."fumen" IS 'Fumen of the setup';

COMMENT ON COLUMN "setup_variants"."solve_pattern" IS 'Extended pieces notation used for solving. NULL if internal node in oqb';

COMMENT ON COLUMN "sets"."category" IS 'Overarching set category';

COMMENT ON COLUMN "set_translations"."name" IS 'Name of the set';

COMMENT ON COLUMN "set_translations"."description" IS 'Description about the set';

COMMENT ON COLUMN "set_paths"."set_path" IS 'Materialized path of ids to this set';

COMMENT ON COLUMN "statistics"."setup_id" IS '12 hexdigits';

COMMENT ON COLUMN "statistics"."hold_type" IS 'Structure how hold works';

COMMENT ON COLUMN "statistics"."cover_data" IS 'Bit string of what queues are covered from cover dependence. NULL if all covered';

COMMENT ON COLUMN "statistics"."solve_percent" IS 'Solve percent. NULL if internal node in oqb';

COMMENT ON COLUMN "statistics"."solve_fraction" IS 'Precise solve fraction. NULL if internal node in oqb';

COMMENT ON COLUMN "statistics"."all_solves" IS 'All solves for the setup';

COMMENT ON COLUMN "statistics"."minimal_solves" IS 'Minimal set of solves. NULL if not created';

COMMENT ON COLUMN "statistics"."true_minimal" IS 'Whether algorithm for minimal gurantees minimality';

COMMENT ON COLUMN "statistics"."path_file" IS 'Whether path file exist. Follows [setup-id]-[kicktable].csvd.xz format';

COMMENT ON COLUMN "save_data"."save_percent" IS 'Save percent. NULL if multiple saves';

COMMENT ON COLUMN "save_data"."save_fraction" IS 'Precise save fraction. NULL if multiple saves';

COMMENT ON COLUMN "save_data"."priority_save_percent" IS 'Array of percents for giving priority for saves. NULL if one save';

COMMENT ON COLUMN "save_data"."priority_save_fraction" IS 'Array of fraction for giving priority for saves. NULL if one save';

COMMENT ON COLUMN "save_data"."all_solves" IS 'All solves for save';

COMMENT ON COLUMN "save_data"."minimal_solves" IS 'Minimal set of solves for save';

COMMENT ON COLUMN "save_data"."true_minimal" IS 'Whether algorithm for minimal gurantees minimality';

COMMENT ON COLUMN "save_data"."status" IS 'Status of the populating data';

COMMENT ON COLUMN "saves"."save" IS 'Pieces saved for next PC for sfinder-saves';

COMMENT ON COLUMN "saves"."pc" IS 'PC Number for 1-9';

COMMENT ON COLUMN "saves"."importance" IS 'Level of importance this save is. Denotes which saves are shown above others';

COMMENT ON COLUMN "saves"."auto_populate" IS 'Whether to automatically populate for all setups with this pc';

COMMENT ON COLUMN "saves"."gen_minimal" IS 'When automatically populating, populate the minimal solves';

COMMENT ON COLUMN "saves"."gen_all_solves" IS 'When automatically populating, populate all solves';

COMMENT ON COLUMN "save_translations"."name" IS 'Name of the save. Ex: One T or Two LJ';

CREATE INDEX idx_setups_leftover ON setups (leftover);

CREATE INDEX idx_gist_setups_oqb_path ON setup_oqb_paths USING GIST (oqb_path);

CREATE INDEX idx_gist_sets_path ON set_paths USING GIST (set_path);

CREATE INDEX idx_variants_setup_id ON setup_variants (setup_id);

CREATE INDEX idx_saves_setup_id ON save_data (stat_id);

-- Create authenticated role if not exist. Mostly for testing as supabase has already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'authenticated'
  ) THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;

-- prevent directly affecting generated columns
REVOKE INSERT (oqb_path),
UPDATE (oqb_path) ON setup_oqb_paths
FROM
  PUBLIC,
  authenticated,
  anon;

REVOKE INSERT (set_path),
UPDATE (set_path) ON set_paths
FROM
  PUBLIC,
  authenticated,
  anon;

REVOKE INSERT (variant_number),
UPDATE (variant_number) ON setup_variants
FROM
  PUBLIC,
  authenticated,
  anon;

-- set the metadata
INSERT INTO
  schema_metadata (version, description)
VALUES
  (
    '2.0.0',
    'Change how oqb_paths works to enable DAG instead of tree structure. Adds sets to group together setups and translation tables to provide translations for text in database.'
  );
