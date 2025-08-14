CREATE OR REPLACE FUNCTION public.print_oqb_as_dot(start_path ltree DEFAULT NULL)
RETURNS text
LANGUAGE sql AS $$
WITH RECURSIVE edges AS (
  -- starting points
  SELECT oqb_path
  FROM setup_oqb_paths
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
  JOIN setup_oqb_paths child
    ON child.oqb_path ~ (edges.oqb_path::text || '.*{1}')::lquery
),
pairs AS (
  SELECT
    subpath(c.oqb_path, -2, -1) AS parent_id,
    c.setup_id AS child_id
  FROM edges e
  JOIN setup_oqb_paths c ON e.oqb_path = c.oqb_path
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
