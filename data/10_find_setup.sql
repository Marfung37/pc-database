-- find a setup for solving
CREATE OR REPLACE FUNCTION public.find_setup (
  leftover  varchar(7),
  queue     varchar(11),
  kicktable kicktable DEFAULT "srs180",
  parent_id setupid DEFAULT NULL
) 
RETURNS TABLE (
  setup_id      setupid,
  build         varchar(10),
  cover_pattern varchar(255),
  oqb_path      ltree,
  oqb_depth     int
)
SET
  search_path = public, extensions AS $$
BEGIN
  IF NEW.solve_pattern IS NULL AND EXISTS (
      SELECT 1 FROM setups s
      WHERE s.setup_id = NEW.setup_id AND s.oqb_path IS NULL
  ) THEN
      RAISE EXCEPTION 'Variant must set solve_pattern if not oqb setup';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_variant_solve_pattern BEFORE INSERT
OR
UPDATE ON setup_variants FOR EACH ROW
EXECUTE FUNCTION private.check_variant_solve_pattern ();
