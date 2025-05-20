-- Prevent users from inserting values into oqb_path / oqb_depth
CREATE POLICY "Disallow oqb_path/depth on INSERT" ON setups FOR INSERT TO authenticated
WITH
  CHECK (
    (
      oqb_path IS NULL
      OR oqb_path = setup_id
    )
    AND oqb_depth IS NULL
  );

-- Prevent users from updating those fields manually
CREATE POLICY "Disallow oqb_path/depth on UPDATE" ON setups
FOR UPDATE
  TO authenticated
WITH
  CHECK (
    oqb_path IS NULL
    AND oqb_depth IS NULL
  );
