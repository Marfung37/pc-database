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
    IF NOT EXISTS (SELECT 1 FROM setup_oqb_paths s WHERE s.setup_id = child_id) THEN
        RAISE EXCEPTION 'Cannot create edge: child does not exist as oqb';
    END IF;

    -- Check if parent is NULL which already exists so just return
    IF parent_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM setup_oqb_paths s WHERE s.setup_id = parent_id) THEN
        RAISE EXCEPTION 'Cannot create edge: parent does not exist as oqb';
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
    -- Check if child is NULL which is nonsensical
    IF child_id IS NULL THEN
        RAISE EXCEPTION 'Cannot delete edge: child given as NULL';
    END IF;

    -- Check if child exists
    IF NOT EXISTS (SELECT 1 FROM setup_oqb_paths s WHERE s.setup_id = child_id) THEN
        RAISE EXCEPTION 'Cannot delete edge: child does not exist as oqb';
    END IF;

    -- Check if parent is NULL which is not allowed to be deleted
    IF parent_id IS NULL THEN
        RAISE EXCEPTION 'Cannot delete edge: parent given as NULL';
    END IF;

    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM setup_oqb_paths s WHERE s.setup_id = parent_id) THEN
        RAISE EXCEPTION 'Cannot delete edge: parent does not exist as oqb';
    END IF;

    -- Check for setup and parent set to same value
    IF child_id = parent_id THEN
        RAISE EXCEPTION 'Cannot delete edge: parent is the same as the child';
    END IF;

    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS oqb_path_unique DEFERRED;

        -- remove everything above the descendents in their paths
        -- this creates duplicates on oqb_path
        UPDATE setup_oqb_paths
        SET oqb_path = subpath(oqb_path, index(oqb_path, child_id::ltree))
        WHERE oqb_path ~ ('*.' || parent_id || '.' || child_id || '.*')::lquery;

        -- remove duplicates
        DELETE FROM setup_oqb_paths a
        USING setup_oqb_paths b
        WHERE a.ctid < b.ctid
          AND a.setup_id = b.setup_id
          AND a.oqb_path = b.oqb_path;

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

-- Function to update path when node delete
CREATE OR REPLACE FUNCTION private.delete_setup_node (node_id setupid) 
RETURNS void
SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Check if node is NULL which is nonsensical
    IF node_id IS NULL THEN
        RAISE EXCEPTION 'Cannot delete node: node cannot be NULL';
    END IF;

    -- Check if node exists
    IF NOT EXISTS (SELECT 1 FROM setup_oqb_paths s WHERE s.setup_id = node_id) THEN
        RAISE EXCEPTION 'Cannot delete node: node does not exist as oqb';
    END IF;

    -- remove the node and update the paths appropriately
    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS oqb_path_unique DEFERRED;

        -- removes for all descendants of the node all ancestors including this node and above
        -- this creates duplicates on oqb_path
        UPDATE setup_oqb_paths
        SET oqb_path = subpath(oqb_path, index(oqb_path, node_id::ltree) + 1)
        WHERE oqb_path ~ ('*.' || node_id || '.*{1,}')::lquery;

        -- remove duplicates
        DELETE FROM setup_oqb_paths a
        USING setup_oqb_paths b
        WHERE a.ctid < b.ctid
          AND a.setup_id = b.setup_id
          AND a.oqb_path = b.oqb_path;

        -- Remove the node
        DELETE FROM setup_oqb_paths s
        WHERE setup_id = node_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;

    SET CONSTRAINTS oqb_path_unique IMMEDIATE;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize oqb setups as root nodes
CREATE OR REPLACE FUNCTION private.initialize_oqb_tree_paths () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.type <> NEW.type AND OLD.type = 'oqb' THEN
      PERFORM public.delete_setup_node(OLD.setup_id);
    ELSE 
        IF NEW.type = 'oqb' THEN
            INSERT INTO setup_oqb_paths (setup_id, oqb_path)
            VALUES (NEW.setup_id, NEW.setup_id::ltree);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to delete node
CREATE OR REPLACE FUNCTION private.delete_oqb_tree_node () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    IF OLD.type = 'oqb' THEN
      PERFORM public.delete_setup_node(OLD.setup_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle updates to setup id
CREATE OR REPLACE FUNCTION private.update_oqb_setup_id () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Update all descendents
    UPDATE setup_oqb_paths s
    SET oqb_path = 
      subpath(OLD.oqb_path, 0, -1) 
      || NEW.setup_id::ltree 
      || CASE
          WHEN nlevel(OLD.oqb_path) < nlevel(s.oqb_path)
          THEN subpath(s.oqb_path, index(s.oqb_path, OLD.setup_id::ltree) + 1)
          ELSE ''::ltree
         END
    WHERE oqb_path <@ OLD.oqb_path;

    -- Update node also
    UPDATE setup_oqb_paths s
    SET oqb_path = subpath(OLD.oqb_path, 0, -1) || NEW.setup_id::ltree
    WHERE oqb_path = OLD.oqb_path;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize nodes
CREATE TRIGGER trigger_initialize_oqb_tree_path
AFTER INSERT
OR
UPDATE OF type ON setups FOR EACH ROW
EXECUTE FUNCTION private.initialize_oqb_tree_paths ();

-- Trigger to delete nodes
CREATE TRIGGER trigger_delete_oqb_tree_node
AFTER DELETE
ON setups FOR EACH ROW
EXECUTE FUNCTION private.delete_oqb_tree_node ();

-- Trigger to delete nodes
CREATE TRIGGER trigger_delete_oqb_tree_node
AFTER UPDATE OF setup_id
ON setup_oqb_paths FOR EACH ROW
EXECUTE FUNCTION private.update_oqb_setup_id ();
