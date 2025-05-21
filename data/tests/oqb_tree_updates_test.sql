-- 1. Create a temporary test environment
BEGIN;

-- Create temporary tables with all constraints
CREATE TEMP TABLE test_setups (LIKE setups INCLUDING ALL) ON
COMMIT
DROP;

CREATE TEMP TABLE test_setup_oqb_links (LIKE setup_oqb_links INCLUDING ALL) ON
COMMIT
DROP;

-- 2. Create test versions of your EXACT functions (unchanged except table names)
CREATE OR REPLACE FUNCTION test_update_tree_paths () RETURNS TRIGGER AS $$
DECLARE
    parent_exists BOOLEAN;
BEGIN
    -- bypass trigger if set variable
    IF current_setting('app.bypass_triggers', true) = 'true' THEN
      RETURN NEW;
    END IF;

    BEGIN 
        SELECT EXISTS(SELECT 1 FROM test_setups WHERE setup_id = NEW.parent_id) INTO parent_exists;

        -- Update the modified node's path
        IF NOT parent_exists THEN
            UPDATE test_setups
            SET oqb_path = NEW.child_id::TEXT
            WHERE setup_id = NEW.child_id;
        ELSE
            -- Check for circular reference
            IF EXISTS (
                SELECT 1
                FROM test_setups p
                WHERE p.setup_id = NEW.parent_id
                  AND p.oqb_path LIKE '%' || NEW.child_id || '%'
            ) THEN 
                RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
                    NEW.child_id, NEW.parent_id;
            END IF;

            UPDATE test_setups s
            SET oqb_path = p.oqb_path || '.' || NEW.child_id::TEXT
            FROM test_setups p
            WHERE s.setup_id = NEW.child_id AND p.setup_id = NEW.parent_id;
        END IF;
        
        -- If UPDATE child_id then need to update children nodes to move them with it
        IF TG_OP = 'UPDATE' AND OLD.child_id IS DISTINCT FROM NEW.child_id THEN
          PERFORM set_config('app.bypass_triggers', 'true', true);
          UPDATE test_setup_oqb_links
          SET parent_id = NEW.child_id
          WHERE parent_id = OLD.child_id;
          PERFORM set_config('app.bypass_triggers', 'false', true);
        END IF;

        -- Update all descendants (recursively)
        PERFORM test_update_descendant_paths(NEW.child_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
        RETURN NULL;
    END;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update path when links delete
CREATE OR REPLACE FUNCTION test_update_tree_paths_on_delete () RETURNS TRIGGER SECURITY DEFINER -- Runs with owner's privileges
AS $$
BEGIN
    BEGIN 
        -- set the path to setup_id as no longer part of a tree and keeps that it is oqb. User can explicitly update to be not oqb
        UPDATE test_setups
        SET oqb_path = setup_id
        WHERE setup_id = OLD.child_id;

        -- link the children to their grandparent
        PERFORM set_config('app.bypass_triggers', 'true', true);
        UPDATE test_setup_oqb_links
        SET parent_id = OLD.parent_id
        WHERE parent_id = OLD.child_id;
        PERFORM set_config('app.bypass_triggers', 'false', true);

        PERFORM test_update_descendant_paths(OLD.parent_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
        RETURN NULL; -- Cancels DELETE
    END;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION test_update_descendant_paths (parent_node TEXT) RETURNS VOID AS $$
DECLARE
    parent_path TEXT;
    circular_child_id TEXT;
BEGIN
    SELECT oqb_path INTO parent_path
    FROM test_setups WHERE setup_id = parent_node;

    -- Check for circular reference by checking if children ids already in the oqb path
    SELECT l.child_id INTO circular_child_id
    FROM test_setup_oqb_links l
    WHERE l.parent_id = parent_node
    AND parent_path LIKE '%' || l.child_id || '%'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
            circular_child_id, parent_node;
    END IF;
    
    UPDATE test_setups d
    SET oqb_path = parent_path || '.' || l.child_id::TEXT
    FROM test_setup_oqb_links l
    WHERE l.parent_id = parent_node
    AND d.setup_id = l.child_id;
   
    -- Recursively update children of updated nodes
    PERFORM test_update_descendant_paths(l.child_id)
    FROM test_setup_oqb_links l
    WHERE l.parent_id = parent_node;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER test_tree_path_trigger
AFTER INSERT
OR
UPDATE ON test_setup_oqb_links FOR EACH ROW
EXECUTE FUNCTION test_update_tree_paths ();

-- Trigger to handle path updates on delete
CREATE TRIGGER test_trigger_update_tree_path_on_delete
AFTER DELETE ON test_setup_oqb_links FOR EACH ROW
EXECUTE FUNCTION test_update_tree_paths_on_delete ();

-- 3. Insert test data (valid 12-character hex IDs)
INSERT INTO
  test_setups (
    setup_id,
    pc,
    leftover,
    build,
    cover_dependence,
    fumen,
    pieces,
    oqb_path
  )
VALUES
  (
    '100000000001',
    1,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    '100000000001'
  ),
  (
    '200000000002',
    2,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    '200000000002'
  ),
  (
    '300000000003',
    3,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    NULL
  ),
  (
    '400000000004',
    4,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    NULL
  ),
  (
    '500000000005',
    5,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    NULL
  ),
  (
    '600000000006',
    6,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    NULL
  ),
  (
    '700000000007',
    7,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    NULL
  ),
  (
    '800000000008',
    8,
    'TILJSZO',
    'TILJSZO',
    'test',
    'v115@test',
    'TILJSZO',
    NULL
  );

-- 4. Test Cases
DO $$
DECLARE
  test_count INT := 0;
  passed_count INT := 0;
  expected_path TEXT;
  current_path TEXT;
BEGIN
  RAISE NOTICE '=== RUNNING MATERIALIZED PATH TRIGGER TESTS ===';

  -- Test 1: Update parent_id only (move node within tree)
  BEGIN
    -- First reset the test data
    DELETE FROM test_setup_oqb_links;
    INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
      ('300000000003', '100000000001'),
      ('400000000004', '100000000001'),
      ('500000000005', '200000000002'),
      ('600000000006', '300000000003'),
      ('700000000007', '400000000004');

    test_count := test_count + 1;
    
    -- Move node 400000000004 from 100000000001 to 200000000002
    UPDATE test_setup_oqb_links 
    SET parent_id = '200000000002' 
    WHERE child_id = '400000000004';
    
    -- Verify moved node path
    expected_path := '200000000002.400000000004';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '400000000004';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Expected path "%", got "%"', test_count, expected_path, current_path;
    END IF;
    
    -- Verify descendant path updated
    expected_path := '200000000002.400000000004.700000000007';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '700000000007';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Descendant path not updated. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    RAISE NOTICE 'Test % passed: parent_id update (node move)', test_count;
    passed_count := passed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
  END;
  
  -- Test 2: Update child_id only (node ID change)
  BEGIN
    test_count := test_count + 1;

    -- First reset the test data
    DELETE FROM test_setup_oqb_links;
    INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
      ('300000000003', '100000000001'),
      ('400000000004', '100000000001'),
      ('500000000005', '200000000002'),
      ('600000000006', '300000000003'),
      ('700000000007', '400000000004');
    
    -- Change node 300000000003 to 800000000008 (with same parent)
    UPDATE test_setup_oqb_links 
    SET child_id = '800000000008'
    WHERE child_id = '300000000003';
    
    -- Verify the old node is no longer in the tree
    PERFORM 1 FROM test_setup_oqb_links WHERE child_id = '300000000003';
    IF FOUND THEN
      RAISE EXCEPTION 'Test % failed: Old child_id still exists in links', test_count;
    END IF;
    
    -- Verify new node has correct path
    expected_path := '100000000001.800000000008';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '800000000008';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: New node path incorrect. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    -- Verify descendant paths updated
    expected_path := '100000000001.800000000008.600000000006';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '600000000006';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Descendant path not updated. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    RAISE NOTICE 'Test % passed: child_id update (node rename)', test_count;
    passed_count := passed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
  END;
  
  -- Test 3: Update both parent_id and child_id (complex subtree move)
  BEGIN
    test_count := test_count + 1;
    
    -- First reset the test data
    DELETE FROM test_setup_oqb_links;
    INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
      ('300000000003', '100000000001'),
      ('400000000004', '100000000001'),
      ('500000000005', '200000000002'),
      ('600000000006', '300000000003'),
      ('700000000007', '400000000004');
    
    -- Create a new parent node
    UPDATE test_setups SET oqb_path = NULL WHERE setup_id = '800000000008';
    
    -- Move node 400000000004 to be 800000000008 with parent 200000000002
    UPDATE test_setup_oqb_links 
    SET child_id = '800000000008', parent_id = '200000000002'
    WHERE child_id = '400000000004';
    
    -- Verify the old node is no longer in the tree
    PERFORM 1 FROM test_setup_oqb_links WHERE child_id = '400000000004';
    IF FOUND THEN
      RAISE EXCEPTION 'Test % failed: Old child_id still exists in links', test_count;
    END IF;
    
    -- Verify new node has correct path
    expected_path := '200000000002.800000000008';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '800000000008';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: New node path incorrect. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    -- Verify descendant paths updated
    expected_path := '200000000002.800000000008.700000000007';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '700000000007';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Descendant path not updated. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    RAISE NOTICE 'Test % passed: Simultaneous child_id/parent_id update (subtree move)', test_count;
    passed_count := passed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
  END;
  
  -- Test 4: Circular reference prevention
  BEGIN
    test_count := test_count + 1;
    
    -- Try to make 200000000002 a child of one of its descendants
    UPDATE test_setup_oqb_links 
    SET parent_id = '600000000006'
    WHERE child_id = '200000000002';
    
    RAISE EXCEPTION 'Test % failed: Allowed circular reference', test_count;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%circular reference%' THEN
      RAISE NOTICE 'Test % passed: Circular reference prevented', test_count;
      passed_count := passed_count + 1;
    ELSE
      RAISE NOTICE 'Test % failed with unexpected error: %', test_count, SQLERRM;
    END IF;
  END;

  -- Test 5: Delete node in middle
  BEGIN
    test_count := test_count + 1;
    
    -- First reset the test data
    DELETE FROM test_setup_oqb_links;
    INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
      ('300000000003', '100000000001'),
      ('400000000004', '100000000001'),
      ('500000000005', '300000000003'),
      ('600000000006', '300000000003'),
      ('700000000007', '600000000006');
    
    DELETE FROM test_setup_oqb_links WHERE child_id = '300000000003';

    -- Verify the old link is no longer in the tree
    PERFORM 1 FROM test_setup_oqb_links WHERE child_id = '300000000003';
    IF FOUND THEN
      RAISE EXCEPTION 'Test % failed: Old child_id still exists in links', test_count;
    END IF;

    -- Verify deleted link node has correct path
    expected_path := '300000000003';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '300000000003';

    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Deleted link node path incorrect. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;

    -- Verify child node has correct path
    expected_path := '100000000001.600000000006';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '600000000006';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Child node path incorrect. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    -- Verify descendant paths updated
    expected_path := '100000000001.600000000006.700000000007';
    SELECT oqb_path INTO current_path FROM test_setups WHERE setup_id = '700000000007';
    
    IF current_path <> expected_path THEN
      RAISE EXCEPTION 'Test % failed: Descendant path not updated. Expected "%", got "%"', 
        test_count, expected_path, current_path;
    END IF;
    
    RAISE NOTICE 'Test % passed: Deletion of a link', test_count;
    passed_count := passed_count + 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
  END;

  -- Final results
  RAISE NOTICE '=== TEST RESULTS: %/% tests passed ===', passed_count, test_count;
END $$;

-- 5. Clean up
ROLLBACK;
