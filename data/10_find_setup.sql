CREATE TYPE setup_variants_data AS (
  variant_number smallint,
  build queue,
  fumen fumen,
  solve_pattern text
);

CREATE TYPE setup_saves_data AS (
  save text,
  name text,
  save_percent decimal(5, 2),
  save_fraction fraction,
  priority_save_percent decimal(5, 2) [],
  priority_save_fraction fraction[],
  all_solves fumen,
  minimal_solves fumen,
  true_miniaml boolean
);

-- bare minimal data to determine if a given setup is actually buildable based on leftover
CREATE OR REPLACE FUNCTION public.find_bare_setup_leftover (
  p_leftover queue,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any'
) RETURNS TABLE (
  setup_id setupid,
  build queue,
  cover_pattern text,
  cover_data bytea
)
SET
  search_path = public,
  extensions SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.build,
    s.cover_pattern,
    st.cover_data
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_bare_setup_leftover.kicktable
    AND st.hold_type = find_bare_setup_leftover.hold_type
  LEFT JOIN setup_oqb_paths sop ON
    s.setup_id = sop.setup_id
  WHERE
    s.leftover = find_bare_setup_leftover.p_leftover AND
    (
      s.type <> 'oqb' OR
      (
        s.type = 'oqb' AND sop.oqb_path = s.setup_id::ltree -- if oqb then only the root node
      )
    )
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;

-- bare minimal data to determine if a given setup is actually buildable based on parent id
CREATE OR REPLACE FUNCTION public.find_bare_setup_parent_id (
  parent_id setupid,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any'
) RETURNS TABLE (
  setup_id setupid,
  build queue,
  cover_pattern text,
  cover_data bytea
)
SET
  search_path = public,
  extensions SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setup_id,
    s.build,
    s.cover_pattern,
    st.cover_data
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_bare_setup_parent_id.kicktable
    AND st.hold_type = find_bare_setup_parent_id.hold_type
  JOIN setup_oqb_paths sop ON
    s.setup_id = sop.setup_id AND
    sop.oqb_path ~ (find_bare_setup_parent_id.parent_id::text || '.*{1}')::lquery
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;

-- find a possibly invalid setup for solving using leftover
CREATE OR REPLACE FUNCTION public.find_setup_leftover (
  p_leftover queue,
  p_include_variants boolean DEFAULT false,
  p_include_saves boolean DEFAULT false,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any',
  language varchar(2) DEFAULT 'en'
) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  type setup_type,
  cover_pattern text,
  cover_description text,
  fumen fumen,
  solve_pattern text,
  mirror setupid,
  see smallint,
  hold smallint,
  credit text,
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
    s.type,
    s.cover_pattern,
    COALESCE(sl.cover_description, sl_default.cover_description) AS cover_description,
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
    v.variants,
    sa.saves
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_setup_leftover.kicktable
    AND st.hold_type = find_setup_leftover.hold_type
  LEFT JOIN setup_translations sl ON
    s.setup_id = sl.setup_id AND sl.language_code = language
  LEFT JOIN setup_translations sl_default ON
    s.setup_id = sl_default.setup_id AND sl_default.language_code = 'en'
  LEFT JOIN setup_oqb_paths sop ON
    s.setup_id = sop.setup_id
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ROW(
      v.variant_number,
      v.build,
      v.fumen,
      v.solve_pattern
    )::setup_variants_data ORDER BY v.variant_number) AS variants
    FROM setup_variants v
    WHERE v.setup_id = s.setup_id
  ) v ON p_include_variants
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ROW(
      sa.save,
      COALESCE(sal.name, sal_default.name),
      sd.save_percent,
      sd.save_fraction,
      sd.priority_save_percent,
      sd.priority_save_fraction,
      sd.all_solves,
      sd.minimal_solves,
      sd.true_minimal
    )::setup_saves_data ORDER BY sa.importance) AS saves
    FROM save_data sd
    JOIN saves sa ON sd.save_id = sa.save_id
    LEFT JOIN save_translations sal 
      ON sd.save_id = sal.save_id AND sal.language_code = language
    LEFT JOIN save_translations sal_default 
      ON sd.save_id = sal_default.save_id AND sal_default.language_code = 'en'
    WHERE sd.stat_id = st.stat_id
      AND sd.status = 'completed'
  ) sa ON p_include_saves
  WHERE
    s.leftover = find_setup_leftover.p_leftover AND
    (
      s.type <> 'oqb' OR
      (
        s.type = 'oqb' AND sop.oqb_path = s.setup_id::ltree -- if oqb then only the root node
      )
    )
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;

-- find a setup for solving using parent_id
CREATE OR REPLACE FUNCTION public.find_setup_parent_id (
  parent_id setupid,
  p_include_variants boolean DEFAULT false,
  p_include_saves boolean DEFAULT false,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any',
  language varchar(2) DEFAULT 'en'
) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  type setup_type,
  cover_pattern text,
  cover_description text,
  fumen fumen,
  solve_pattern text,
  mirror setupid,
  see smallint,
  hold smallint,
  credit text,
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
    s.type,
    s.cover_pattern,
    COALESCE(sl.cover_description, sl_default.cover_description) AS cover_description,
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
    v.variants,
    sa.saves
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_setup_parent_id.kicktable
    AND st.hold_type = find_setup_parent_id.hold_type
  JOIN setup_oqb_paths sop ON
    s.setup_id = sop.setup_id AND
    sop.oqb_path ~ (find_setup_parent_id.parent_id::text || '.*{1}')::lquery
  LEFT JOIN setup_translations sl ON
    s.setup_id = sl.setup_id AND sl.language_code = language
  LEFT JOIN setup_translations sl_default ON
    s.setup_id = sl_default.setup_id AND sl_default.language_code = 'en'
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ROW(
      v.variant_number,
      v.build,
      v.fumen,
      v.solve_pattern
    )::setup_variants_data ORDER BY v.variant_number) AS variants
    FROM setup_variants v
    WHERE v.setup_id = s.setup_id
  ) v ON p_include_variants
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ROW(
      sa.save,
      COALESCE(sal.name, sal_default.name),
      sd.save_percent,
      sd.save_fraction,
      sd.priority_save_percent,
      sd.priority_save_fraction,
      sd.all_solves,
      sd.minimal_solves,
      sd.true_minimal
    )::setup_saves_data ORDER BY sa.importance) AS saves
    FROM save_data sd
    JOIN saves sa ON sd.save_id = sa.save_id
    LEFT JOIN save_translations sal 
      ON sd.save_id = sal.save_id AND sal.language_code = language
    LEFT JOIN save_translations sal_default 
      ON sd.save_id = sal_default.save_id AND sal_default.language_code = 'en'
    WHERE sd.stat_id = st.stat_id
      AND sd.status = 'completed'
  ) sa ON p_include_saves
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;

-- find a setup for solving using setup_id
CREATE OR REPLACE FUNCTION public.find_setup_setup_id (
  p_setup_ids setupid[],
  p_include_variants boolean DEFAULT false,
  p_include_saves boolean DEFAULT false,
  kicktable kicktable DEFAULT 'srs180',
  hold_type hold_type DEFAULT 'any',
  language varchar(2) DEFAULT 'en'
) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  type setup_type,
  cover_pattern text,
  cover_description text,
  fumen fumen,
  solve_pattern text,
  mirror setupid,
  see smallint,
  hold smallint,
  credit text,
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
    s.type,
    s.cover_pattern,
    COALESCE(sl.cover_description, sl_default.cover_description) AS cover_description,
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
    v.variants,
    sa.saves
  FROM
    setups s
  JOIN statistics st ON 
    s.setup_id = st.setup_id
    AND st.kicktable = find_setup_setup_id.kicktable
    AND st.hold_type = find_setup_setup_id.hold_type
  LEFT JOIN setup_translations sl ON
    s.setup_id = sl.setup_id AND sl.language_code = language
  LEFT JOIN setup_translations sl_default ON
    s.setup_id = sl_default.setup_id AND sl_default.language_code = 'en'
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ROW(
      v.variant_number,
      v.build,
      v.fumen,
      v.solve_pattern
    )::setup_variants_data ORDER BY v.variant_number) AS variants
    FROM setup_variants v
    WHERE v.setup_id = s.setup_id
  ) v ON p_include_variants
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ROW(
      sa.save,
      COALESCE(sal.name, sal_default.name),
      sd.save_percent,
      sd.save_fraction,
      sd.priority_save_percent,
      sd.priority_save_fraction,
      sd.all_solves,
      sd.minimal_solves,
      sd.true_minimal
    )::setup_saves_data ORDER BY sa.importance) AS saves
    FROM save_data sd
    JOIN saves sa ON sd.save_id = sa.save_id
    LEFT JOIN save_translations sal 
      ON sd.save_id = sal.save_id AND sal.language_code = language
    LEFT JOIN save_translations sal_default 
      ON sd.save_id = sal_default.save_id AND sal_default.language_code = 'en'
    WHERE sd.stat_id = st.stat_id
      AND sd.status = 'completed'
  ) sa ON p_include_saves
  WHERE
    s.setup_id = ANY(find_setup_setup_id.p_setup_ids)
  ORDER BY
    s.setup_id;
END;
$$ LANGUAGE plpgsql;
