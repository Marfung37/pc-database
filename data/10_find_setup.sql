CREATE TYPE setup_variants_data AS (
  variant_number smallint,
  build queue,
  fumen fumen,
  solve_pattern varchar(100)
);

CREATE TYPE setup_saves_data AS (
  save varchar(255),
  description varchar(255),
  save_percent decimal(5,2),
  save_fraction fraction,
  priority_save_percent decimal(5,2)[],
  priority_save_fraction fraction[],
  all_solves fumen,
  minimal_solves fumen
);

-- find a setup for solving using leftover
CREATE OR REPLACE FUNCTION public.find_setup_leftover (
  p_leftover queue,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any'
) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  cover_pattern varchar(255),
  oqb_path ltree,
  oqb_depth smallint,
  cover_description varchar(255),
  fumen fumen,
  solve_pattern varchar(100),
  mirror setupid,
  see smallint,
  hold smallint,
  credit varchar(255),
  cover_data bytea,
  solve_percent decimal(5, 2),
  solve_fraction fraction,
  minimal_solves fumen,
  variants setup_variants_data[],
  saves setup_saves_data[]
)
SET
  search_path = public,
  extensions SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.pc,
    s.leftover,
    s.build,
    s.cover_pattern,
    s.oqb_path,
    s.oqb_depth,
    s.cover_description,
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
      SELECT ARRAY_AGG(ROW(
        v.variant_number,
        v.build,
        v.fumen,
        v.solve_pattern
      )::setup_variants_data ORDER BY v.variant_number)
      FROM setup_variants v
      WHERE v.setup_id = s.setup_id
    ),
    (
      SELECT ARRAY_AGG(ROW(
        sa.save,
        sa.description,
        sd.save_percent,
        sd.save_fraction,
        sd.priority_save_percent,
        sd.priority_save_fraction,
        sd.all_solves,
        sd.minimal_solves
      )::setup_saves_data ORDER BY sa.importance)
      FROM save_data sd
      JOIN saves sa ON sd.save_id = sa.save_id
      WHERE sd.stat_id = st.stat_id AND sd.status = 'completed'
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
    s.leftover = find_setup_leftover.p_leftover AND
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
) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  cover_pattern varchar(255),
  oqb_path ltree,
  oqb_depth smallint,
  cover_description varchar(255),
  fumen fumen,
  solve_pattern varchar(100),
  mirror setupid,
  see smallint,
  hold smallint,
  credit varchar(255),
  cover_data bytea,
  solve_percent decimal(5, 2),
  solve_fraction fraction,
  minimal_solves fumen,
  variants setup_variants_data[],
  saves setup_saves_data[]
)
SET
  search_path = public,
  extensions SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.pc,
    s.leftover,
    s.build,
    s.cover_pattern,
    s.oqb_path,
    s.oqb_depth,
    s.cover_description,
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
      SELECT ARRAY_AGG(ROW(
        v.variant_number,
        v.build,
        v.fumen,
        v.solve_pattern
      )::setup_variants_data ORDER BY v.variant_number)
      FROM setup_variants v
      WHERE v.setup_id = s.setup_id
    ),
    (
      SELECT ARRAY_AGG(ROW(
        sa.save,
        sa.description,
        sd.save_percent,
        sd.save_fraction,
        sd.priority_save_percent,
        sd.priority_save_fraction,
        sd.all_solves,
        sd.minimal_solves
      )::setup_saves_data ORDER BY sa.importance)
      FROM save_data sd
      JOIN saves sa ON sd.save_id = sa.save_id
      WHERE sd.stat_id = st.stat_id AND sd.status = 'completed'
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

-- find a setup for solving using setup_id
CREATE OR REPLACE FUNCTION public.find_setup_setup_id (
  p_setup_id setupid,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any'
) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  cover_pattern varchar(255),
  oqb_path ltree,
  oqb_depth smallint,
  cover_description varchar(255),
  fumen fumen,
  solve_pattern varchar(100),
  mirror setupid,
  see smallint,
  hold smallint,
  credit varchar(255),
  cover_data bytea,
  solve_percent decimal(5, 2),
  solve_fraction fraction,
  minimal_solves fumen,
  variants setup_variants_data[],
  saves setup_saves_data[]
)
SET
  search_path = public,
  extensions SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.pc,
    s.leftover,
    s.build,
    s.cover_pattern,
    s.oqb_path,
    s.oqb_depth,
    s.cover_description,
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
      SELECT ARRAY_AGG(
      ROW(
        v.variant_number,
        v.build,
        v.fumen,
        v.solve_pattern
      )::setup_variants_data ORDER BY v.variant_number)
      FROM setup_variants v
      WHERE v.setup_id = s.setup_id
    ),
    (
      SELECT ARRAY_AGG(ROW(
        sa.save,
        sa.description,
        sd.save_percent,
        sd.save_fraction,
        sd.priority_save_percent,
        sd.priority_save_fraction,
        sd.all_solves,
        sd.minimal_solves
      )::setup_saves_data ORDER BY sa.importance)
      FROM save_data sd
      JOIN saves sa ON sd.save_id = sa.save_id
      WHERE sd.stat_id = st.stat_id AND sd.status = 'completed'
    )
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_setup_setup_id.kicktable
    AND st.hold_type = find_setup_setup_id.hold_type
  LEFT JOIN setup_variants v ON
    s.setup_id = v.setup_id
  WHERE
    s.setup_id = find_setup_setup_id.p_setup_id
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;
