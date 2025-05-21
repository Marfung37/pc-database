-- Making sure the solve percent and fraction is set if not oqb
CREATE OR REPLACE FUNCTION check_statistic_solve () RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.solve_percent IS NULL OR NEW.solve_fraction IS NULL) AND EXISTS (
      SELECT 1 FROM setups s
      WHERE s.setup_id = NEW.setup_id AND s.oqb_path IS NULL
  ) THEN
      RAISE EXCEPTION 'Statistic must set solve percent and fraction if not oqb setup';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_statistic_solve BEFORE INSERT
OR
UPDATE ON statistics FOR EACH ROW
EXECUTE FUNCTION check_statistic_solve ();
