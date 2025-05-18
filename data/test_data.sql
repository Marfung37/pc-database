-- Clear tables in proper order to respect foreign keys
TRUNCATE TABLE saves CASCADE;
TRUNCATE TABLE setup_variants CASCADE;
TRUNCATE TABLE setup_oqb_links CASCADE;
TRUNCATE TABLE setups CASCADE;

-- Insert root nodes (no parent)
INSERT INTO setups (setup_id, leftover, build, cover_dependence, fumen, pieces, solve_percent, solve_fraction, oqb_path)
VALUES 
  ('1aaaaaaaaaaa', 'TILJSZO', 'TILJSZO', 'Full cover', 'v115@example1', 'TILJSZO', 100.00, (1,1)::fraction, '1aaaaaaaaaaa'),
  ('2bbbbbbbbbbb', 'TILJSZO', 'TILJSZO', 'Full cover', 'v115@example2', 'TILJSZO', 100.00, (1,1)::fraction, '2bbbbbbbbbbb');

-- Insert level 2 children
INSERT INTO setups (setup_id, leftover, build, cover_dependence, fumen, pieces, solve_percent, solve_fraction)
VALUES
  ('3ccccccccccc', 'TILJSZO', 'TILJSZO', 'Partial cover', 'v115@example3', 'TILJSZO', 95.50, (191,200)::fraction),
  ('4ddddddddddd', 'TILJSZO', 'TILJSZO', 'Partial cover', 'v115@example4', 'TILJSZO', 97.25, (389,400)::fraction),
  ('5eeeeeeeeeee', 'TILJSZO', 'TILJSZO', 'Partial cover', 'v115@example5', 'TILJSZO', 92.75, (371,400)::fraction);

-- Create relationships (this should trigger your path updates)
INSERT INTO setup_oqb_links (child_id, parent_id) VALUES
  -- Level 2 children
  ('3ccccccccccc', '1aaaaaaaaaaa'),
  ('4ddddddddddd', '1aaaaaaaaaaa'),
  ('5eeeeeeeeeee', '2bbbbbbbbbbb');

-- Insert level 3 children
INSERT INTO setups (setup_id, leftover, build, cover_dependence, fumen, pieces, solve_percent, solve_fraction)
VALUES
  ('6fffffffffff', 'TILJSZO', 'TILJSZO', 'Special case', 'v115@example6', 'TILJSZO', 85.25, (341,400)::fraction),
  ('7aaaaaaaaaaa', 'TILJSZO', 'TILJSZO', 'Special case', 'v115@example7', 'TILJSZO', 88.50, (177,200)::fraction);

INSERT INTO setup_oqb_links (child_id, parent_id) VALUES
  -- Level 3 children
  ('6fffffffffff', '3ccccccccccc'),
  ('7aaaaaaaaaaa', '4ddddddddddd');
 
-- Verify paths were generated correctly
SELECT setup_id, oqb_path, oqb_depth FROM setups ORDER BY oqb_path;

-- Expected output:
-- setup_id      | oqb_path                     | oqb_depth
-- --------------+------------------------------+----------
-- 1aaaaaaaaaaa  | 1aaaaaaaaaaa                 | 0
-- 2bbbbbbbbbbb  | 2bbbbbbbbbbb                 | 0
-- 3ccccccccccc  | 1aaaaaaaaaaa.3ccccccccccc    | 1
-- 4ddddddddddd  | 1aaaaaaaaaaa.4ddddddddddd    | 1
-- 5eeeeeeeeeee  | 2bbbbbbbbbbb.5eeeeeeeeeee    | 1
-- 6ffffffffff   | 1aaaaaaaaaaa.3ccccccccccc.6ffffffffff | 2
-- 7gggggggggg   | 1aaaaaaaaaaa.4ddddddddddd.7gggggggggg | 2

-- Add some variants and saves
INSERT INTO setup_variants (setup_id, variant_id, build, cover_dependence, fumen)
VALUES
  ('3ccccccccccc', 1, 'TILJSZO', 'Variant cover', 'v115@variant1'),
  ('4ddddddddddd', 1, 'TILJSZO', 'Variant cover', 'v115@variant2');

INSERT INTO saves (setup_id, save, description, save_percent, save_fraction)
VALUES
  ('6fffffffffff', 'T', 'One T saved', 100.00, (1,1)::fraction),
  ('7aaaaaaaaaaa', 'LJ', 'LJ pair saved', 100.00, (1,1)::fraction);

-- Test mirror relationship
UPDATE setups SET mirror = '4ddddddddddd' WHERE setup_id = '5eeeeeeeeeee';
