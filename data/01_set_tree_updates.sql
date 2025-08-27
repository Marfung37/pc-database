-- Function to update path when links change
CREATE OR REPLACE FUNCTION public.add_set_edge (parent_id int, child_id int) RETURNS void SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Check if child is NULL which is nonsensical
    IF child_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create edge: child given as NULL';
    END IF;

    -- Check if child exists
    IF NOT EXISTS (SELECT 1 FROM set_paths s WHERE s.set_id = child_id) THEN
        RAISE EXCEPTION 'Cannot create edge: child does not exist';
    END IF;

    -- Check if parent is NULL which already exists so just return
    IF parent_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM set_paths s WHERE s.set_id = parent_id) THEN
        RAISE EXCEPTION 'Cannot create edge: parent does not exist';
    END IF;

    -- Check for set and parent set to same value
    IF child_id = parent_id THEN
        RAISE EXCEPTION 'Cannot create edge: parent is the same as the child';
    END IF;

    -- Check for circular reference
    IF EXISTS (
        SELECT 1
        FROM set_paths p
        WHERE p.set_id = parent_id
          AND p.set_path ~ ('*.' || child_id::text || '.*')::lquery
    ) THEN 
        RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
            child_id, parent_id;
    END IF;

    BEGIN
        -- Cartesian product of the two graphs
        INSERT INTO set_paths (set_id, set_path) (
            SELECT DISTINCT set_id, fp.set_path || subpath(s.set_path, index(s.set_path, child_id::text::ltree))
            FROM set_paths s,
                 (SELECT set_path FROM set_paths WHERE set_path ~ ('*.' || parent_id::text)::lquery) as fp
            WHERE s.set_path ~ ('*.' || child_id::text || '.*')::lquery
        );

        -- Cleanup the old paths
        DELETE FROM set_paths s WHERE s.set_path ~ (child_id::text || '.*')::lquery;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when links delete
CREATE OR REPLACE FUNCTION public.delete_set_edge (parent_id int, child_id int) RETURNS void SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Check if child is NULL which is nonsensical
    IF child_id IS NULL THEN
        RAISE EXCEPTION 'Cannot delete edge: child given as NULL';
    END IF;

    -- Check if child exists
    IF NOT EXISTS (SELECT 1 FROM set_paths s WHERE s.set_id = child_id) THEN
        RAISE EXCEPTION 'Cannot delete edge: child does not exist';
    END IF;

    -- Check if parent is NULL which is not allowed to be deleted
    IF parent_id IS NULL THEN
        RAISE EXCEPTION 'Cannot delete edge: parent given as NULL';
    END IF;

    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM set_paths s WHERE s.set_id = parent_id) THEN
        RAISE EXCEPTION 'Cannot delete edge: parent does not exist';
    END IF;

    -- Check for set and parent set to same value
    IF child_id = parent_id THEN
        RAISE EXCEPTION 'Cannot delete edge: parent is the same as the child';
    END IF;

    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS set_path_unique DEFERRED;

        -- remove everything above the descendents in their paths
        -- this creates duplicates on set_path
        UPDATE set_paths
        SET set_path = subpath(set_path, index(set_path, child_id::text::ltree))
        WHERE set_path ~ ('*.' || parent_id::text || '.' || child_id::text || '.*')::lquery;

        -- remove duplicates
        DELETE FROM set_paths a
        USING set_paths b
        WHERE a.ctid < b.ctid
          AND a.set_id = b.set_id
          AND a.set_path = b.set_path;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;

    SET CONSTRAINTS set_path_unique IMMEDIATE;

    -- After the update the one of the paths of the child will be
    -- containing only the child.
    -- This can only be when the child has no parent at all.
    -- In case the child has more than one parent, remove this path
    -- (note that we want it to remove it too from descendants of this
    -- child, ex. 'child_id'.'desc1')
    IF (SELECT COUNT(1) FROM set_paths WHERE set_id = child_id) > 1
    THEN
        DELETE FROM set_paths WHERE set_path <@ child_id::text::ltree;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when node delete
CREATE OR REPLACE FUNCTION private.delete_set_node (node_id int) RETURNS void SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Check if node is NULL which is nonsensical
    IF node_id IS NULL THEN
        RAISE EXCEPTION 'Cannot delete node: node cannot be NULL';
    END IF;

    -- remove the node and update the paths appropriately
    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS set_path_unique DEFERRED;

        -- removes for all descendants of the node all ancestors including this node and above
        -- this creates duplicates on set_path
        UPDATE set_paths
        SET set_path = subpath(set_path, index(set_path, node_id::text::ltree) + 1)
        WHERE set_path ~ ('*.' || node_id::text || '.*{1,}')::lquery;

        -- remove duplicates
        DELETE FROM set_paths a
        USING set_paths b
        WHERE a.ctid < b.ctid
          AND a.set_id = b.set_id
          AND a.set_path = b.set_path;

        -- Remove the node
        DELETE FROM set_paths s
        WHERE set_id = node_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;

    SET CONSTRAINTS set_path_unique IMMEDIATE;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize sets as root nodes
CREATE OR REPLACE FUNCTION private.initialize_set_tree_paths () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    INSERT INTO set_paths (set_id, set_path)
    VALUES (NEW.set_id, NEW.set_id::text::ltree);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to delete node
CREATE OR REPLACE FUNCTION private.delete_set_tree_node () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    PERFORM private.delete_set_node(OLD.set_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle updates to set id
CREATE OR REPLACE FUNCTION private.update_set_id () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Update all descendents
    UPDATE set_paths s
    SET set_path = 
      subpath(OLD.set_path, 0, -1) 
      || NEW.set_id::text::ltree 
      || CASE
          WHEN nlevel(OLD.set_path) < nlevel(s.set_path)
          THEN subpath(s.set_path, index(s.set_path, OLD.set_id::text::ltree) + 1)
          ELSE ''::ltree
         END
    WHERE set_path <@ OLD.set_path;

    -- Update node also
    UPDATE set_paths s
    SET set_path = subpath(OLD.set_path, 0, -1) || NEW.set_id::text::ltree
    WHERE set_path = OLD.set_path;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize nodes
CREATE TRIGGER trigger_initialize_set_tree_path
AFTER INSERT
OR
UPDATE ON sets FOR EACH ROW
EXECUTE FUNCTION private.initialize_set_tree_paths ();

-- Trigger to delete nodes
CREATE TRIGGER trigger_delete_set_tree_node
AFTER DELETE ON sets FOR EACH ROW
EXECUTE FUNCTION private.delete_set_tree_node ();

-- Trigger to delete nodes
CREATE TRIGGER trigger_update_set_id
AFTER
UPDATE OF set_id ON set_paths FOR EACH ROW
EXECUTE FUNCTION private.update_set_id ();
