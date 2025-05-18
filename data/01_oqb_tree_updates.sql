-- Function to update path when links change
CREATE OR REPLACE FUNCTION update_tree_paths()
RETURNS TRIGGER
SECURITY DEFINER  -- Runs with owner's privileges
AS $$
DECLARE
    parent_exists BOOLEAN;
    is_valid BOOLEAN := TRUE;
BEGIN
    BEGIN 
        SELECT EXISTS(SELECT 1 FROM setups WHERE setup_id = NEW.parent_id) INTO parent_exists;

        -- Update the modified node's path
        IF NOT parent_exists THEN
            UPDATE setups
            SET oqb_path = NEW.child_id::TEXT
            WHERE setup_id = NEW.child_id;
        ELSE
            -- Check for circular reference
            IF EXISTS (
                SELECT 1
                FROM setups p
                WHERE p.setup_id = NEW.parent_id
                  AND p.oqb_path LIKE '%' || NEW.child_id || '%'
            ) THEN 
                RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
                    NEW.child_id, NEW.parent_id;
            END IF;

            UPDATE setups s
            SET oqb_path = p.oqb_path || '.' || NEW.child_id::TEXT
            FROM setups p
            WHERE s.setup_id = NEW.child_id AND p.setup_id = NEW.parent_id;
        END IF;
        
        -- If UPDATE child_id then need to update children nodes to move them with it
        IF TG_OP = 'UPDATE' AND OLD.child_id IS DISTINCT FROM NEW.child_id THEN
          UPDATE setup_oqb_links
          SET parent_id = NEW.child_id
          WHERE parent_id = OLD.child_id;
          -- the children will call this function and update their descendants
        ELSE
          -- Update all descendants (recursively)
          PERFORM update_descendant_paths(NEW.child_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tree path update aborted: %', SQLERRM;
        RETURN NULL; -- Cancels INSERT or UPDATE
    END;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to update descendant paths
CREATE OR REPLACE FUNCTION update_descendant_paths(parent_node TEXT)
RETURNS VOID
SECURITY DEFINER  -- Runs with owner's privileges
AS $$
DECLARE
    parent_path TEXT;
    circular_child_id TEXT;
BEGIN
    SELECT oqb_path INTO parent_path
    FROM setups WHERE setup_id = parent_node;

    -- Check for circular reference by checking if children ids already in the oqb path
    SELECT l.child_id INTO circular_child_id
    FROM setup_oqb_links l
    WHERE l.parent_id = parent_node
    AND parent_path LIKE '%' || l.child_id || '%'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE EXCEPTION 'Circular reference detected: Setup % cannot be child of %', 
            circular_child_id, parent_node;
    END IF;
    
    UPDATE setups d
    SET oqb_path = parent_path || '.' || l.child_id::TEXT
    FROM setup_oqb_links l
    WHERE l.parent_id = parent_node
    AND d.setup_id = l.child_id;
   
    -- Recursively update children of updated nodes
    PERFORM update_descendant_paths(l.child_id)
    FROM setups d
    JOIN setup_oqb_links l ON d.setup_id = l.child_id
    WHERE l.parent_id = parent_node;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle path updates
CREATE TRIGGER tree_path_trigger
AFTER INSERT OR UPDATE OF parent_id, child_id ON setup_oqb_links
FOR EACH ROW EXECUTE FUNCTION update_tree_paths();
