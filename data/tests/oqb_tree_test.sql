-- 1. Setup test environment with DEFERRED constraints
BEGIN;

CREATE TEMP TABLE test_setups (LIKE setups INCLUDING ALL) ON
COMMIT
DROP;

CREATE TEMP TABLE test_setup_oqb_paths (LIKE setup_oqb_paths INCLUDING ALL) ON
COMMIT
DROP;

ALTER TABLE test_setup_oqb_paths
ADD CONSTRAINT test_setup_oqb_paths_setup
FOREIGN KEY (setup_id)
REFERENCES test_setups(setup_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE test_setup_oqb_paths
DROP CONSTRAINT test_setup_oqb_paths_oqb_path_key;

ALTER TABLE test_setup_oqb_paths
ADD CONSTRAINT test_oqb_path_unique
UNIQUE (oqb_path)
DEFERRABLE INITIALLY IMMEDIATE;

-- Function to initialize oqb setups as root nodes
CREATE OR REPLACE FUNCTION test_initialize_tree_paths () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.type <> NEW.type AND OLD.type = 'oqb' THEN
      -- Delete entry if changed from oqb
      DELETE FROM test_setup_oqb_paths
      WHERE setup_id = OLD.setup_id;
    ELSE 
        IF NEW.type = 'oqb' THEN
            INSERT INTO test_setup_oqb_paths (setup_id, oqb_path)
            VALUES (NEW.setup_id, NEW.setup_id::ltree);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when links change
CREATE OR REPLACE FUNCTION test_add_setup_edge (parent_id setupid, child_id setupid) 
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
    IF NOT EXISTS (SELECT 1 FROM test_setups s WHERE s.setup_id = child_id AND s.type = 'oqb') THEN
        RAISE EXCEPTION 'Cannot create edge: child does not exist';
    END IF;

    -- Check if parent is NULL which already exists so just return
    IF parent_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM test_setups s WHERE s.setup_id = parent_id AND s.type = 'oqb') THEN
        RAISE EXCEPTION 'Cannot create edge: parent does not exist';
    END IF;

    -- Check for setup and parent set to same value
    IF child_id = parent_id THEN
        RAISE EXCEPTION 'Cannot create edge: parent is the same as the child';
    END IF;

    -- Check for circular reference
    IF EXISTS (
        SELECT 1
        FROM test_setup_oqb_paths p
        WHERE p.setup_id = parent_id
          AND p.oqb_path ~ ('*.' || child_id || '.*')::lquery
    ) THEN 
        RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
            child_id, parent_id;
    END IF;

    BEGIN
        -- Cartesian product of the two graphs
        INSERT INTO test_setup_oqb_paths (setup_id, oqb_path) (
            SELECT DISTINCT setup_id, fp.oqb_path || subpath(s.oqb_path, index(s.oqb_path, child_id::ltree))
            FROM test_setup_oqb_paths s,
                 (SELECT oqb_path FROM test_setup_oqb_paths WHERE oqb_path ~ ('*.' || parent_id)::lquery) as fp
            WHERE s.oqb_path ~ ('*.' || child_id || '.*')::lquery
        );

        -- Cleanup the old paths
        DELETE FROM test_setup_oqb_paths s WHERE s.oqb_path ~ (child_id || '.*')::lquery;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when links delete
CREATE OR REPLACE FUNCTION test_delete_setup_edge (parent_id setupid, child_id setupid) 
RETURNS void
SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS test_oqb_path_unique DEFERRED;

        -- remove everything above the child lot_id in the path
        -- this creates duplicates on path and lot_id
        UPDATE test_setup_oqb_paths
        SET oqb_path = subpath(oqb_path, index(oqb_path, child_id::ltree))
        WHERE oqb_path ~ ('*.' || parent_id || '.' || child_id || '.*')::lquery;

        -- remove duplicates
        DELETE FROM test_setup_oqb_paths a
        USING test_setup_oqb_paths b
        WHERE a.ctid < b.ctid
          AND a.setup_id = b.setup_id
          AND a.oqb_path = b.oqb_path;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;

    SET CONSTRAINTS test_oqb_path_unique IMMEDIATE;

    -- After the update the one of the paths of the child will be
    -- containing only the child.
    -- This can only be when the child has no parent at all.
    -- In case the child has more than one parent, remove this path
    -- (note that we want it to remove it too from descendants of this
    -- child, ex. 'child_id'.'desc1')
    IF (SELECT COUNT(1) FROM test_setup_oqb_paths WHERE setup_id = child_id) > 1
    THEN
        DELETE FROM test_setup_oqb_paths WHERE oqb_path <@ child_id::ltree;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when node delete
CREATE OR REPLACE FUNCTION test_delete_setup_node (node_id setupid) 
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

    -- remove the node and update the paths appropriately
    BEGIN
        -- don't check uniqueness as going to have duplicate rows
        SET CONSTRAINTS test_oqb_path_unique DEFERRED;

        -- removes for all descendants of the node all ancestors including this node and above
        -- this creates duplicates on oqb_path
        UPDATE test_setup_oqb_paths
        SET oqb_path = subpath(oqb_path, index(oqb_path, node_id::ltree) + 1)
        WHERE oqb_path ~ ('*.' || node_id || '.*{1,}')::lquery;

        -- remove duplicates
        DELETE FROM test_setup_oqb_paths a
        USING test_setup_oqb_paths b
        WHERE a.ctid < b.ctid
          AND a.setup_id = b.setup_id
          AND a.oqb_path = b.oqb_path;

        -- Remove the node
        DELETE FROM test_setup_oqb_paths s
        WHERE setup_id = node_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
    END;

    SET CONSTRAINTS test_oqb_path_unique IMMEDIATE;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize oqb setups as root nodes
CREATE OR REPLACE FUNCTION test_initialize_oqb_tree_paths () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.type <> NEW.type AND OLD.type = 'oqb' THEN
      PERFORM test_delete_setup_node(OLD.setup_id);
    ELSE 
        IF NEW.type = 'oqb' THEN
            INSERT INTO test_setup_oqb_paths (setup_id, oqb_path)
            VALUES (NEW.setup_id, NEW.setup_id::ltree);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to delete node
CREATE OR REPLACE FUNCTION test_delete_oqb_tree_node () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    IF OLD.type = 'oqb' THEN
      PERFORM test_delete_setup_node(OLD.setup_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle updates to setup id
CREATE OR REPLACE FUNCTION test_update_oqb_setup_id () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
SET
  search_path = public,
  extensions AS $$
BEGIN
    -- Update all descendents
    UPDATE test_setup_oqb_paths s
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
    UPDATE test_setup_oqb_paths s
    SET oqb_path = subpath(OLD.oqb_path, 0, -1) || NEW.setup_id::ltree
    WHERE oqb_path = OLD.oqb_path;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle path updates
CREATE TRIGGER trigger_test_initialize_tree_path
AFTER INSERT
OR
UPDATE OF type ON test_setups FOR EACH ROW
EXECUTE FUNCTION test_initialize_tree_paths ();

-- Trigger to delete nodes
CREATE TRIGGER trigger_test_delete_oqb_tree_node
AFTER DELETE
ON test_setups FOR EACH ROW
EXECUTE FUNCTION test_delete_oqb_tree_node ();

-- Trigger to delete nodes
CREATE TRIGGER trigger_test_update_oqb_setup_id
AFTER UPDATE OF setup_id
ON test_setup_oqb_paths FOR EACH ROW
EXECUTE FUNCTION test_update_oqb_setup_id ();

-- Debug function to print out the graph
CREATE OR REPLACE FUNCTION test_print_oqb_as_dot(start_path ltree DEFAULT NULL)
RETURNS text
LANGUAGE sql AS $$
WITH RECURSIVE edges AS (
  -- starting points
  SELECT oqb_path
  FROM test_setup_oqb_paths
  WHERE (
    start_path IS NULL
    AND nlevel(oqb_path) = 1
  )
  OR (
    start_path IS NOT NULL
    AND oqb_path = start_path
  )
  
  UNION ALL
  
  SELECT child.oqb_path
  FROM edges
  JOIN test_setup_oqb_paths child
    ON child.oqb_path ~ (edges.oqb_path::text || '.*{1}')::lquery
),
pairs AS (
  SELECT DISTINCT
    subpath(c.oqb_path, -2, -1) AS parent_id,
    c.setup_id AS child_id
  FROM edges e
  JOIN test_setup_oqb_paths c ON e.oqb_path = c.oqb_path
  WHERE nlevel(c.oqb_path) > 1
)
SELECT 'digraph G {' || E'\n' ||
   string_agg(
    '"' || parent_id::text || '" -> "' || child_id::text || '"',
    E'\n'
   )
   || E'\n}'
FROM pairs;
$$;

-- 4. Test Cases with Unusual Insertion Orders
DO $$
DECLARE
    root1_id setupid := '1' || substring(md5('root1') FROM 1 FOR 11);
    root2_id setupid := '2' || substring(md5('root2') FROM 1 FOR 11);
    setup1_id setupid := '3' || substring(md5('setup1') FROM 1 FOR 11);
    setup2_id setupid := '4' || substring(md5('child2') FROM 1 FOR 11);
    grandsetup1_id setupid := '5' || substring(md5('grand1') FROM 1 FOR 11);
    grandsetup2_id setupid := '6' || substring(md5('grand2') FROM 1 FOR 11);

    flag boolean := False;
    
    test_count INT := 0;
    passed_count INT := 0;
BEGIN
    -- Test 1: Trying add nonexistent parent or child
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        -- Try to insert link to non-existent parent (should fail)
        BEGIN
            PERFORM test_add_setup_edge(root1_id, setup1_id);
            flag := true;
        EXCEPTION WHEN OTHERS THEN
            flag := false;
        END;

        IF flag THEN
            RAISE EXCEPTION 'Test % failed: Should not allow link to non-existent parent', test_count;
        END IF;

        -- Try to insert link to non-existent child (should fail)
        BEGIN
            PERFORM test_add_setup_edge(setup1_id, grandsetup1_id);
            flag := true;
        EXCEPTION WHEN OTHERS THEN
            flag := false;
        END;

        IF flag THEN
            RAISE EXCEPTION 'Test % failed: Should not allow link to non-existent child', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Blocked link to non-existent parent or child', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 2: Normal additions
    BEGIN
        test_count := test_count + 1;

        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        -- Verify full path
        PERFORM test_add_setup_edge(root1_id, setup1_id);
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for root node', test_count;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup1_id AND oqb_path = (root1_id || '.' || setup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect direct child link', test_count;
        END IF;

        -- Verify full path
        PERFORM test_add_setup_edge(setup1_id, grandsetup1_id);
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for root node', test_count;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup1_id AND oqb_path = (root1_id || '.' || setup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect direct child link', test_count;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.' || setup1_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandchild link', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Added child and grandchild', test_count;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
    END;
    
    -- Test 3: Complex out-of-order build
    BEGIN
        test_count := test_count + 1;

        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;

        -- Insert leaf node first
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (grandsetup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
        
        -- Insert middle node
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
        
        -- Create link between them
        PERFORM test_add_setup_edge(setup2_id, grandsetup2_id);
        
        -- Insert root last
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
        
        -- Complete the chain
        PERFORM test_add_setup_edge(root2_id, setup2_id);
        
        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (root2_id || '.' || setup2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path in out-of-order build', test_count;
        END IF;
        
        RAISE NOTICE 'Test % passed: Complex out-of-order build', test_count;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
    END;

    -- Test 4: Multi-parent
    BEGIN
        test_count := test_count + 1;

        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;

        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
 
        PERFORM test_add_setup_edge(root1_id, setup2_id);
        PERFORM test_add_setup_edge(root2_id, setup2_id);
       
        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup2_id AND oqb_path = (root1_id || '.' || setup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for direct child in multiparent', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup2_id AND oqb_path = (root2_id || '.' || setup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for direct child in multiparent', test_count;
        END IF;
 
        
        RAISE NOTICE 'Test % passed: Multiple parent nodes', test_count;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
    END;

    -- Test 5: Diamond
    BEGIN
        test_count := test_count + 1;

        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;

        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
 
        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root1_id, setup2_id);
        PERFORM test_add_setup_edge(setup1_id, grandsetup1_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup1_id);
       
        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.' || setup1_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for grandchild in diamond shape', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.' || setup2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for grandchild in diamond shape', test_count;
        END IF;
 
        
        RAISE NOTICE 'Test % passed: Diamond graph', test_count;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
    END;
 
    -- Test 6: Combine two existing graphs
    BEGIN
        test_count := test_count + 1;

        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;

        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
 
        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root2_id, grandsetup1_id);
        PERFORM test_add_setup_edge(root2_id, grandsetup2_id);
        PERFORM test_add_setup_edge(setup1_id, root2_id);
       
        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.' || setup1_id || '.' || root2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for connecting two graphs', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (root1_id || '.' || setup1_id || '.' || root2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for connecting two graphs', test_count;
        END IF;
 
        
        RAISE NOTICE 'Test % passed: Connecting two graphs', test_count;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
    END;

    -- Test 7: Combine in diamond shape
    BEGIN
        test_count := test_count + 1;

        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;

        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');
 
        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root1_id, setup2_id);
        PERFORM test_add_setup_edge(root2_id, grandsetup1_id);
        PERFORM test_add_setup_edge(root2_id, grandsetup2_id);
        PERFORM test_add_setup_edge(setup1_id, root2_id);
        PERFORM test_add_setup_edge(setup2_id, root2_id);
       
        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.' || setup1_id || '.' || root2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for connecting two graphs in diamond shape', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (root1_id || '.' || setup1_id || '.' || root2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for connecting two graphs in diamond shape', test_count;
        END IF;
 
        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.' || setup2_id || '.' || root2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for connecting two graphs in diamond shape', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (root1_id || '.' || setup2_id || '.' || root2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path for connecting two graphs in diamond shape', test_count;
        END IF;
 
        
        RAISE NOTICE 'Test % passed: Connecting two graphs in diamond shape', test_count;
        passed_count := passed_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
    END;

    -- Test 8: Simple circular reference
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        -- Try to insert link to self (should fail)
        BEGIN
            PERFORM test_add_setup_edge(setup1_id, setup1_id);
            flag := true;
        EXCEPTION WHEN OTHERS THEN
            flag := false;
        END;

        IF flag THEN
            RAISE EXCEPTION 'Test % failed: Should not allow link to self', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Blocked link to self', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 9: 2nd Simple circular reference
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        -- Try to insert link to self (should fail)
        PERFORM test_add_setup_edge(root1_id, setup1_id);
        BEGIN
            PERFORM test_add_setup_edge(setup1_id, root1_id);
            flag := true;
        EXCEPTION WHEN OTHERS THEN
            flag := false;
        END;

        IF flag THEN
            RAISE EXCEPTION 'Test % failed: Should not allow indirect circular reference', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Blocked link to indirect circular reference', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 10: Complex circular reference
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        -- Form diamond shape
        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root1_id, setup2_id);
        PERFORM test_add_setup_edge(setup1_id, grandsetup1_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup1_id);

        -- Try to insert link to self (should fail)
        BEGIN
            PERFORM test_add_setup_edge(grandsetup1_id, root1_id);
            flag := true;
        EXCEPTION WHEN OTHERS THEN
            flag := false;
        END;

        IF flag THEN
            RAISE EXCEPTION 'Test % failed: Should not allow complex indirect circular reference', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Blocked link to complex indirect circular reference', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 11: Deleting an edge
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_delete_setup_edge(root1_id, setup1_id);

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup1_id AND oqb_path = setup1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path after deleting edge', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Correctly delete edge', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 12: Deleting later edge
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(setup1_id, grandsetup1_id);
        PERFORM test_add_setup_edge(grandsetup1_id, root2_id);
        PERFORM test_delete_setup_edge(setup1_id, grandsetup1_id);

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup1_id AND oqb_path = (root1_id || '.' || setup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = grandsetup1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root2_id AND oqb_path = (grandsetup1_id || '.' || root2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect path after deleting edge', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Correctly delete later edge', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 13: Deleting edge with parent when multiple parents
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root2_id, setup1_id);
        PERFORM test_add_setup_edge(setup1_id, setup2_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup1_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup2_id);
        PERFORM test_delete_setup_edge(setup1_id, setup2_id);

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect root1 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root2_id AND oqb_path = root2_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect root2 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup1_id AND oqb_path = (root1_id || '.' || setup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect setup1 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup1_id AND oqb_path = (root2_id || '.' || setup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect setup1 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup2_id AND oqb_path = setup2_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect setup2 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (setup2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandsetup1 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (setup2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandsetup2 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF (SELECT COUNT(*) FROM test_setup_oqb_paths WHERE setup_id = setup2_id) > 1
        THEN
            RAISE EXCEPTION 'Test % failed: More paths to child than expected', test_count;
        END IF;

        -- Verify full path
        IF (SELECT COUNT(*) FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id) > 1
        THEN
            RAISE EXCEPTION 'Test % failed: More paths to grandchild than expected', test_count;
        END IF;

        -- Verify full path
        IF (SELECT COUNT(*) FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id) > 1
        THEN
            RAISE EXCEPTION 'Test % failed: More paths to grandchild than expected', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Correctly delete edge with multiple parents', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 14: Deleting a node
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root2_id, setup1_id);
        PERFORM test_add_setup_edge(setup1_id, setup2_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup1_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup2_id);

        DELETE FROM test_setups WHERE setup_id = setup1_id;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect root1 path after deleting node', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root2_id AND oqb_path = root2_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect root2 path after deleting node', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup2_id AND oqb_path = setup2_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect setup2 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (setup2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandsetup1 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (setup2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandsetup1 path after deleting edge', test_count;
        END IF;

        -- Verify full path
        IF (SELECT COUNT(*) FROM test_setup_oqb_paths WHERE setup_id = setup2_id) > 1
        THEN
            RAISE EXCEPTION 'Test % failed: More paths to child than expected', test_count;
        END IF;

        -- Verify full path
        IF (SELECT COUNT(*) FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id) > 1
        THEN
            RAISE EXCEPTION 'Test % failed: More paths to grandchild than expected', test_count;
        END IF;

        -- Verify full path
        IF (SELECT COUNT(*) FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id) > 1
        THEN
            RAISE EXCEPTION 'Test % failed: More paths to grandchild than expected', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Correctly delete node', test_count;
        passed_count := passed_count + 1;
    END;

    -- Test 15: Updating a node
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_paths;
        DELETE FROM test_setups;
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_pattern, fumen, type) VALUES
            (root1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (setup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup1_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb'),
            (grandsetup2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', 'oqb');

        PERFORM test_add_setup_edge(root1_id, setup1_id);
        PERFORM test_add_setup_edge(root2_id, setup1_id);
        PERFORM test_add_setup_edge(setup1_id, setup2_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup1_id);
        PERFORM test_add_setup_edge(setup2_id, grandsetup2_id);

        UPDATE test_setups SET setup_id = '100000000001' WHERE setup_id = setup1_id;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root1_id AND oqb_path = root1_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect root1 path after updating node', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = root2_id AND oqb_path = root2_id::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect root2 path after updating node', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = '100000000001' AND oqb_path = (root1_id || '.100000000001')::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect setup1 path after updating edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = setup2_id AND oqb_path = (root1_id || '.100000000001' || '.' || setup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect setup2 path after updating edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup1_id AND oqb_path = (root1_id || '.100000000001' || '.' || setup2_id || '.' || grandsetup1_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandsetup1 path after updating edge', test_count;
        END IF;

        -- Verify full path
        IF NOT EXISTS (SELECT 1 FROM test_setup_oqb_paths WHERE setup_id = grandsetup2_id AND oqb_path = (root1_id || '.100000000001' || '.' || setup2_id || '.' || grandsetup2_id)::ltree)
        THEN
            RAISE EXCEPTION 'Test % failed: Incorrect grandsetup2 path after updating edge', test_count;
        END IF;

        RAISE NOTICE 'Test % passed: Correctly update node cascade', test_count;
        passed_count := passed_count + 1;
    END;

    -- Final results
    RAISE NOTICE '=== TEST RESULTS: %/% tests passed ===', passed_count, test_count;
END $$;

-- 5. Clean up
ROLLBACK;
