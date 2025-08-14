-- Function to initialize oqb setups as root nodes
CREATE OR REPLACE FUNCTION private.initialize_tree_paths () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.type <> NEW.type AND OLD.type = 'oqb' THEN
      -- Delete entry if changed from oqb
      DELETE FROM setup_oqb_paths
      WHERE setup_id = OLD.setup_id;
    ELSE 
        IF NEW.type = 'oqb' THEN
            INSERT INTO setup_oqb_paths (setup_id, oqb_path)
            VALUES (NEW.setup_id, NEW.setup_id::ltree);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when links change
CREATE OR REPLACE FUNCTION public.add_setup_edge (parent_id setupid, child_id setupid) 
RETURNS void
SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Check if child is NULL which is nonsensical
    IF child_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create edge: child given as NULL';
    END IF;

    -- Check if child exists
    IF NOT EXISTS (SELECT 1 FROM setups s WHERE s.setup_id = child_id AND s.type = 'oqb') THEN
        RAISE EXCEPTION 'Cannot create edge: child does not exist';
    END IF;

    -- Check if parent is NULL which already exists so just return
    IF parent_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM setups s WHERE s.setup_id = parent_id AND s.type = 'oqb') THEN
        RAISE EXCEPTION 'Cannot create edge: parent does not exist';
    END IF;

    -- Check for setup and parent set to same value
    IF child_id = parent_id THEN
        RAISE EXCEPTION 'Cannot create edge: parent is the same as the child';
    END IF;

    -- Check for circular reference
    IF EXISTS (
        SELECT 1
        FROM setup_oqb_paths p
        WHERE p.setup_id = parent_id
          AND p.oqb_path ~ ('*.' || child_id || '.*')::lquery
    ) THEN 
        RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
            child_id, parent_id;
    END IF;

    BEGIN
        -- Cartesian product of the two graphs
        INSERT INTO setup_oqb_paths (setup_id, oqb_path) (
            SELECT DISTINCT setup_id, fp.oqb_path || subpath(s.oqb_path, index(s.oqb_path, child_id::ltree))
            FROM setup_oqb_paths s,
                 (SELECT oqb_path FROM setup_oqb_paths WHERE oqb_path ~ ('*.' || parent_id)::lquery) as fp
            WHERE s.oqb_path ~ ('*.' || child_id || '.*')::lquery
        );

        -- Cleanup the old paths
        DELETE FROM setup_oqb_paths s WHERE s.oqb_path ~ (child_id || '.*')::lquery;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when links delete
CREATE OR REPLACE FUNCTION public.delete_setup_edge (parent_id setupid, child_id setupid) 
RETURNS void
SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS oqb_path_unique DEFERRED;

        -- remove everything above the child lot_id in the path
        -- this creates duplicates on path and lot_id
        UPDATE setup_oqb_paths
        SET oqb_path = subpath(oqb_path, index(oqb_path, child_id::ltree))
        WHERE oqb_path ~ ('*.' || parent_id || '.' || child_id || '.*')::lquery;

        -- remove duplicates
        DELETE FROM setup_oqb_paths s
        USING (
            SELECT setup_id, oqb_path
            FROM setup_oqb_paths
            GROUP BY setup_id, oqb_path
            HAVING COUNT(*) > 1
        ) dup
        WHERE s.setup_id = dup.setup_id
          AND s.oqb_path = dup.oqb_path;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;

    SET CONSTRAINTS oqb_path_unique IMMEDIATE;

    -- After the update the one of the paths of the child will be
    -- containing only the child.
    -- This can only be when the child has no parent at all.
    -- In case the child has more than one parent, remove this path
    -- (note that we want it to remove it too from descendants of this
    -- child, ex. 'child_id'.'desc1')
    IF (SELECT COUNT(1) FROM setup_oqb_paths WHERE setup_id = child_id) > 1
    THEN
        DELETE FROM setup_oqb_paths WHERE oqb_path <@ child_id::ltree;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle path updates
CREATE TRIGGER trigger_initialize_tree_path
AFTER INSERT
OR
UPDATE OF type ON setups FOR EACH ROW
EXECUTE FUNCTION private.initialize_tree_paths ();
