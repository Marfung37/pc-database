-- Making sure the solve_pattern is set if not oqb
CREATE OR REPLACE FUNCTION private.check_variant_solve_pattern () RETURNS TRIGGER
SET
  search_path = public AS $$
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
