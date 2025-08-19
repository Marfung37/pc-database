CREATE OR REPLACE FUNCTION public.print_sets_as_dot (start_path ltree DEFAULT NULL) RETURNS text LANGUAGE sql AS $$
WITH RECURSIVE edges AS (
  -- starting points
  SELECT set_path
  FROM set_paths
  WHERE (
    start_path IS NULL
    AND nlevel(set_path) = 1
  )
  OR (
    start_path IS NOT NULL
    AND set_path = start_path
  )
  
  UNION ALL
  
  SELECT child.set_path
  FROM edges
  JOIN set_paths child
    ON child.set_path ~ (edges.set_path::text || '.*{1}')::lquery
),
pairs AS (
  SELECT DISTINCT
    subpath(c.set_path, -2, -1) AS parent_id,
    c.set_id AS child_id
  FROM edges e
  JOIN set_paths c ON e.set_path = c.set_path
  WHERE nlevel(c.set_path) > 1
)
SELECT 'digraph G {' || E'\n' ||
   string_agg(
    '"' || parent_id::text || '" -> "' || child_id::text || '"',
    E'\n'
   )
   || E'\n}'
FROM pairs;
$$;
