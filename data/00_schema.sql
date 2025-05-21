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

CREATE TYPE fraction AS ("numerator" integer, "denominator" integer);

CREATE DOMAIN setupid AS varchar(12) CHECK (VALUE ~ '^[1-9][0-9a-f]{11}$');

CREATE OR REPLACE FUNCTION all_decimals_lte_100 (arr DECIMAL[]) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
  SELECT bool_and(p <= 100) FROM unnest(arr) AS p
$$;

CREATE OR REPLACE FUNCTION is_valid_fraction_array (arr fraction[]) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
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
  "leftover" varchar(7) NOT NULL CHECK (leftover ~ '^[TILJSZO]+$'), -- enforce tetris pieces
  "build" varchar(10) NOT NULL CHECK (build ~ '^[TILJSZO]+$'), -- enforce tetris pieces
  "cover_dependence" varchar(255) NOT NULL, -- difficult to constrain
  "oqb_path" varchar(131) CHECK (
    oqb_path IS NULL
    OR oqb_path ~ '^[1-9][0-9a-f]{11}(\.[1-9][0-9a-f]{11})*$'
  ), -- enforce max depth 10 with max string length
  "oqb_depth" int GENERATED ALWAYS AS (
    CASE
      WHEN oqb_path IS NULL THEN NULL
      ELSE length(oqb_path) - length(replace(oqb_path, '.', ''))
    END
  ) STORED,
  "oqb_description" varchar(255),
  "fumen" text NOT NULL CHECK (fumen ~ '^v115@[A-Za-z0-9+/?]+$'), -- enforce fumen structure with version 115
  "pieces" varchar(100), -- difficult to constrain
  "mirror" setupid,
  "credit" varchar(255),
  -- either all columns about solves are filled or is an oqb setup that doesn't solve
  CONSTRAINT no_solve_oqb_setup CHECK (
    (
      pieces IS NULL
      AND oqb_path IS NOT NULL
    )
    OR (pieces IS NOT NULL)
  ),
  FOREIGN KEY (mirror) REFERENCES setups (setup_id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE setup_oqb_links (
  child_id setupid PRIMARY KEY,
  parent_id setupid NOT NULL,
  FOREIGN KEY (child_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "setup_variants" (
  "setup_id" setupid NOT NULL,
  "variant_number" int NOT NULL CHECK (variant_number > 0), -- 1 index with intent 0 is the entry in setups
  "build" varchar(10) NOT NULL CHECK (build ~ '^[TILJSZO]+$'), -- enforce tetris pieces
  "fumen" text NOT NULL CHECK (fumen ~ '^v115@[A-Za-z0-9+/?]+$'), -- enforce fumen structure with version 115
  "pieces" varchar(100),
  PRIMARY KEY (setup_id, variant_number),
  FOREIGN KEY (setup_id) REFERENCES setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "statistics" (
  "stat_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "setup_id" setupid NOT NULL,
  "kicktable" kicktable NOT NULL,
  "cover_data" bytea, -- NULL is cover dependence is exactly what the setup covered by
  "solve_percent" decimal(5, 2) CHECK (
    solve_percent IS NULL
    OR solve_percent <= 100
  ),
  "solve_fraction" fraction,
  "all_solves" text CHECK (
    minimal_solves IS NULL
    OR minimal_solves ~ '^v115@[A-Za-z0-9+/?]+$'
  ),
  "minimal_solves" text CHECK (
    minimal_solves IS NULL
    OR minimal_solves ~ '^v115@[A-Za-z0-9+/?]+$'
  ),
  "path_file" bool,
  UNIQUE ("setup_id", "kicktable"),
  CHECK (
    solve_fraction IS NULL
    OR (
      (solve_fraction).numerator IS NOT NULL
      AND (solve_fraction).denominator IS NOT NULL
      AND (solve_fraction).denominator <> 0
    )
  )
);

CREATE TABLE "saves" (
  "save_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "stat_id" uuid NOT NULL,
  "save" varchar(255) NOT NULL,
  "description" varchar(255),
  "save_percent" decimal(5, 2) CHECK (
    save_percent IS NULL
    OR save_percent <= 100
  ),
  "save_fraction" fraction,
  "priority_save_percent" decimal(5, 2) [],
  "priority_save_fraction" fraction[],
  "all_solves" text CHECK (
    minimal_solves IS NULL
    OR minimal_solves ~ '^v115@[A-Za-z0-9+/?]+$'
  ),
  "minimal_solves" text CHECK (
    minimal_solves IS NULL
    OR minimal_solves ~ '^v115@[A-Za-z0-9+/?]+$'
  ),
  UNIQUE ("stat_id", "save"),
  CHECK (
    save_fraction IS NULL
    OR (
      (save_fraction).numerator IS NOT NULL
      AND (save_fraction).denominator IS NOT NULL
      AND (save_fraction).denominator <> 0
    )
  ),
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
  )
);

COMMENT ON COLUMN "setups"."setup_id" IS '12 hexdigits';

COMMENT ON COLUMN "setups"."pc" IS 'PC Number for 1-9';

COMMENT ON COLUMN "setups"."leftover" IS 'Pieces left from bag. Only TILJSZO allowed';

COMMENT ON COLUMN "setups"."build" IS 'Pieces used in setup. Only TILJSZO allowed';

COMMENT ON COLUMN "setups"."cover_dependence" IS 'Extended pieces notation for when setup is covered. Need not be perfect';

COMMENT ON COLUMN "setups"."oqb_path" IS 'Materialized path of ids to this setup. NULL if not oqb and set to setup_id if oqb initially and populated from setup_oqb_links';

COMMENT ON COLUMN "setups"."oqb_depth" IS 'Setup oqb tree depth';

COMMENT ON COLUMN "setups"."oqb_description" IS 'Description for when to use this setup';

COMMENT ON COLUMN "setups"."fumen" IS 'Fumen of the setup';

COMMENT ON COLUMN "setups"."pieces" IS 'Pieces used for solving. NULL if internal node in oqb';

COMMENT ON COLUMN "setups"."mirror" IS 'References a setup_id for mirror setup';

COMMENT ON COLUMN "setups"."credit" IS 'Credit for founder of setup';

COMMENT ON TABLE "setup_variants" IS 'Setups where other pieces can be placed without affecting statistics';

COMMENT ON COLUMN "setup_variants"."variant_number" IS 'Variant number 1 indexed. Variant 0 is the entry in setups';

COMMENT ON COLUMN "setup_variants"."setup_id" IS '12 hexdigits';

COMMENT ON COLUMN "setup_variants"."build" IS 'Pieces used in setup. Only TILJSZO allowed';

COMMENT ON COLUMN "setup_variants"."fumen" IS 'Fumen of the setup';

COMMENT ON COLUMN "setup_variants"."pieces" IS 'Extended pieces notation used for solving. NULL if internal node in oqb';

COMMENT ON COLUMN "statistics"."setup_id" IS '12 hexdigits';

COMMENT ON COLUMN "statistics"."cover_data" IS 'Bit string of what queues are covered from cover dependence. NULL if all covered';

COMMENT ON COLUMN "statistics"."solve_percent" IS 'Solve percent. NULL if internal node in oqb';

COMMENT ON COLUMN "statistics"."solve_fraction" IS 'Precise solve fraction. NULL if internal node in oqb';

COMMENT ON COLUMN "statistics"."all_solves" IS 'All solves for the setup';

COMMENT ON COLUMN "statistics"."minimal_solves" IS 'Minimal set of solves. NULL if not created';

COMMENT ON COLUMN "statistics"."path_file" IS 'Whether path file exist. Follows [setup-id]-[kicktable].csvd.xz format';

COMMENT ON COLUMN "saves"."save" IS 'Pieces saved for next PC for sfinder-saves';

COMMENT ON COLUMN "saves"."description" IS 'Description of the save. Ex: One T or Two LJ';

COMMENT ON COLUMN "saves"."save_percent" IS 'Save percent. NULL if multiple saves';

COMMENT ON COLUMN "saves"."save_fraction" IS 'Precise save fraction. NULL if multiple saves';

COMMENT ON COLUMN "saves"."priority_save_percent" IS 'Array of percents for giving priority for saves. NULL if one save';

COMMENT ON COLUMN "saves"."priority_save_fraction" IS 'Array of fraction for giving priority for saves. NULL if one save';

COMMENT ON COLUMN "saves"."all_solves" IS 'All solves for save';

COMMENT ON COLUMN "saves"."minimal_solves" IS 'Minimal set of solves';

ALTER TABLE "statistics"
ADD FOREIGN KEY ("setup_id") REFERENCES "setups" ("setup_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saves"
ADD FOREIGN KEY ("stat_id") REFERENCES "statistics" ("stat_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "setup_variants"
ADD FOREIGN KEY ("setup_id") REFERENCES "setups" ("setup_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX idx_setups_leftover ON setups (leftover);

CREATE INDEX idx_setups_oqb_path ON setups (oqb_path);

CREATE INDEX idx_setups_oqb_links_parent_id ON setup_oqb_links (parent_id);

CREATE INDEX idx_variants_setup_id ON setup_variants (setup_id);

CREATE INDEX idx_saves_setup_id ON saves (stat_id);

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

-- prevent directly affecting auto generated columns
REVOKE INSERT (oqb_depth),
UPDATE (oqb_path, oqb_depth) ON setups
FROM
  PUBLIC;

REVOKE INSERT (oqb_depth),
UPDATE (oqb_path, oqb_depth) ON setups
FROM
  authenticated;

REVOKE INSERT (variant_number),
UPDATE (variant_number) ON setup_variants
FROM
  PUBLIC;

REVOKE INSERT (variant_number),
UPDATE (variant_number) ON setup_variants
FROM
  authenticated;

-- set the metadata
INSERT INTO
  schema_metadata (version, description)
VALUES
  (
    '1.0.0',
    'PC Database for 4L 10-wide setups with tetraminos with several kicktables. This supports oqb setups and storing save statistics. Schema may be flawed if a kicktable can cause shifts of a setup to give different stats as difficult to check.'
  );
