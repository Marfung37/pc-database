CREATE OR REPLACE FUNCTION update_variant_number () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public AS $$
DECLARE
    count INT;
BEGIN
    SELECT COALESCE(MAX(variant_number),0) + 1 INTO count
    FROM setup_variants
    WHERE setup_id = NEW.setup_id;

    NEW.variant_number := count;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_variant_number BEFORE INSERT ON setup_variants FOR EACH ROW
EXECUTE FUNCTION update_variant_number ();
