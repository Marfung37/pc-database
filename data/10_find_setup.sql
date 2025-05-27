CREATE TYPE setup_variants_data AS (
  build           queue,
  fumen           fumen,
  solve_pattern   varchar(100)
);

-- find a setup for solving using leftover
CREATE OR REPLACE FUNCTION public.find_setup_leftover (
  leftover  queue,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any'
) 
RETURNS TABLE (
  setup_id        setupid,
  build           queue,
  cover_pattern   varchar(255),
  oqb_path        ltree,
  oqb_depth       smallint,
  oqb_description varchar(255),
  fumen           fumen,
  solve_pattern   varchar(100),
  mirror          setupid,
  see             smallint,
  hold            smallint,
  credit          varchar(255),
  cover_data      bytea,
  solve_percent   decimal(5, 2),
  solve_fraction  fraction,
  minimal_solves  fumen,
  variants        setup_variants_data[]
)
SET
  search_path = public, extensions AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.build,
    s.cover_pattern,
    s.oqb_path,
    s.oqb_depth,
    s.oqb_description,
    s.fumen,
    s.solve_pattern,
    s.mirror,
    s.see,
    s.hold,
    s.credit,
    st.cover_data,
    st.solve_percent,
    st.solve_fraction,
    st.minimal_solves,
    (
      SELECT ARRAY_AGG(ROW(v.build,
        v.fumen,
        v.solve_pattern
      )::setup_variants_data ORDER BY v.variant_number)
      FROM setup_variants v
      WHERE v.setup_id = s.setup_id
    )
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_setup_leftover.kicktable
    AND st.hold_type = find_setup_leftover.hold_type
  LEFT JOIN setup_variants v ON
    s.setup_id = v.setup_id
  WHERE
    s.leftover = find_setup_leftover.leftover AND
    (
      s.oqb_depth IS NULL OR s.oqb_depth = 1
    )
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;

-- find a setup for solving using parent_id
CREATE OR REPLACE FUNCTION public.find_setup_parent_id (
  parent_id setupid,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any'
) 
RETURNS TABLE (
  setup_id        setupid,
  build           queue,
  cover_pattern   varchar(255),
  oqb_path        ltree,
  oqb_depth       smallint,
  oqb_description varchar(255),
  fumen           fumen,
  solve_pattern   varchar(100),
  mirror          setupid,
  see             smallint,
  hold            smallint,
  credit          varchar(255),
  cover_data      bytea,
  solve_percent   decimal(5, 2),
  solve_fraction  fraction,
  minimal_solves  fumen,
  variants        setup_variants_data[]
)
SET
  search_path = public, extensions AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.build,
    s.cover_pattern,
    s.oqb_path,
    s.oqb_depth,
    s.oqb_description,
    s.fumen,
    s.solve_pattern,
    s.mirror,
    s.see,
    s.hold,
    s.credit,
    st.cover_data,
    st.solve_percent,
    st.solve_fraction,
    st.minimal_solves,
    (
      SELECT ARRAY_AGG(ROW(v.build,
        v.fumen,
        v.solve_pattern
      )::setup_variants_data ORDER BY v.variant_number)
      FROM setup_variants v
      WHERE v.setup_id = s.setup_id
    )
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_setup_parent_id.kicktable
    AND st.hold_type = find_setup_parent_id.hold_type
  JOIN setup_oqb_links l ON
    find_setup_parent_id.parent_id = l.parent_id AND
    s.setup_id = l.child_id
  LEFT JOIN setup_variants v ON
    s.setup_id = v.setup_id
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;
