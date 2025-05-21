-- 1. Setup test environment with DEFERRED constraints
BEGIN;

CREATE TEMP TABLE test_setups (LIKE setups INCLUDING ALL) ON
COMMIT
DROP;

CREATE TEMP TABLE test_setup_oqb_links (LIKE setup_oqb_links INCLUDING ALL) ON
COMMIT
DROP;

ALTER TABLE "test_setup_oqb_links"
ADD FOREIGN KEY (child_id) REFERENCES test_setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_setup_oqb_links"
ADD FOREIGN KEY (parent_id) REFERENCES test_setups (setup_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Create test versions of your EXACT functions (unchanged except table names)
CREATE OR REPLACE FUNCTION test_update_tree_paths () RETURNS TRIGGER AS $$
DECLARE
    parent_exists BOOLEAN;
    is_valid BOOLEAN := TRUE;
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

-- 4. Test Cases with Unusual Insertion Orders
DO $$
DECLARE
    root1_id setupid := '1' || substring(md5('root1') FROM 1 FOR 11);
    root2_id setupid := '2' || substring(md5('root2') FROM 1 FOR 11);
    child1_id setupid := '3' || substring(md5('child1') FROM 1 FOR 11);
    child2_id setupid := '4' || substring(md5('child2') FROM 1 FOR 11);
    grandchild1_id setupid := '5' || substring(md5('grand1') FROM 1 FOR 11);
    grandchild2_id setupid := '6' || substring(md5('grand2') FROM 1 FOR 11);
    
    test_count INT := 0;
    passed_count INT := 0;
BEGIN
    -- Test 1: Mixed order insert with immediate constraints
    BEGIN
        test_count := test_count + 1;
        
        -- Clear previous data
        DELETE FROM test_setup_oqb_links;
        DELETE FROM test_setups WHERE setup_id IN (root2_id, child2_id, grandchild2_id);
        
        -- Insert some nodes
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_dependence, fumen, oqb_path) VALUES
            (root2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', root2_id),
            (grandchild2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', grandchild2_id);

        -- Try to insert link to non-existent parent (should fail)
        BEGIN
            INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
                (grandchild2_id, child2_id);

            RAISE EXCEPTION 'Test % failed: Should not allow link to non-existent parent', test_count;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'Test % passed: Blocked link to non-existent parent', test_count;
            passed_count := passed_count + 1;
        END;
        
        -- Complete the tree properly
        INSERT INTO test_setups (setup_id, pc, leftover, build, cover_dependence, fumen, oqb_path) VALUES
            (child2_id, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', child2_id);
        
        INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
            (child2_id, root2_id),
            (grandchild2_id, child2_id);
    END;
    
    -- Test 2: Complex out-of-order build
    BEGIN
        test_count := test_count + 1;
        
        -- Generate new valid IDs
        DECLARE
            new_root setupid := '7' || substring(md5('new_root') FROM 1 FOR 11);
            mid_node setupid := '8' || substring(md5('mid_node') FROM 1 FOR 11);
            leaf_node setupid := '9' || substring(md5('leaf_node') FROM 1 FOR 11);
        BEGIN
            -- Insert leaf node first
            INSERT INTO test_setups (setup_id, pc, leftover, build, cover_dependence, fumen, oqb_path) VALUES
                (leaf_node, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', leaf_node);
            
            -- Insert middle node
            INSERT INTO test_setups (setup_id, pc, leftover, build, cover_dependence, fumen, oqb_path) VALUES
                (mid_node, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', mid_node);
            
            -- Create link between them
            INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
                (leaf_node, mid_node);
            
            -- Insert root last
            INSERT INTO test_setups (setup_id, pc, leftover, build, cover_dependence, fumen, oqb_path) VALUES
                (new_root, 1, 'TILJSZO', 'TILJSZO', 'test', 'v115@test', new_root);
            
            -- Complete the chain
            INSERT INTO test_setup_oqb_links (child_id, parent_id) VALUES
                (mid_node, new_root);
            
            -- Verify full path
            IF (SELECT oqb_path FROM test_setups WHERE setup_id = leaf_node) <>
               (new_root || '.' || mid_node || '.' || leaf_node) THEN
                RAISE EXCEPTION 'Test % failed: Incorrect path in out-of-order build', test_count;
            END IF;
            
            RAISE NOTICE 'Test % passed: Complex out-of-order build', test_count;
            passed_count := passed_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Test % failed: %', test_count, SQLERRM;
        END;
    END;
    
    -- Final results
    RAISE NOTICE '=== TEST RESULTS: %/% tests passed ===', passed_count, test_count;
END $$;

-- 5. Clean up
ROLLBACK;
