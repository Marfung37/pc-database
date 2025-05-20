-- Making sure the pieces is set if not oqb
CREATE OR REPLACE FUNCTION check_variant_pieces () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pieces IS NULL AND EXISTS (
      SELECT 1 FROM setups s
      WHERE s.setup_id = NEW.setup_id AND s.oqb_path IS NULL
  ) THEN
      RAISE EXCEPTION 'Variant must set pieces if not oqb setup';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_variant_pieces BEFORE INSERT
OR
UPDATE ON setup_variants FOR EACH ROW
EXECUTE FUNCTION check_variant_pieces ();
