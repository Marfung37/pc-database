CREATE OR REPLACE FUNCTION public.find_uncalculated_saves (max_rows smallint DEFAULT 1) RETURNS TABLE (
  setup_id setupid,
  pc smallint,
  leftover queue,
  build queue,
  fumen fumen,
  hold smallint,
  stat_id uuid,
  kicktable kicktable,
  hold_type hold_type,
  save_id uuid,
  save varchar(255),
  auto_populate bool,
  gen_minimal bool,
  gen_all_solves bool
)
SET
  search_path = public SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.setup_id,
    s.pc,
    s.leftover,
    s.build,
    s.fumen,
    s.hold,
    st.stat_id,
    st.kicktable,
    st.hold_type,
    sa.save_id,
    sa.save,
    sa.auto_populate,
    sa.gen_minimal,
    sa.gen_all_solves
  FROM
    setups s
  JOIN saves sa ON
    s.pc = sa.pc
  JOIN statistics st ON 
    s.setup_id = st.setup_id
  WHERE
    sa.auto_populate = true
    AND s.solve_pattern IS NOT NULL
    AND NOT EXISTS ( -- anti join for save data entry doesn't exist
      SELECT 1
      FROM save_data sd
      WHERE sd.stat_id = st.stat_id
        AND sd.save_id = sa.save_id
    )
  ORDER BY
    s.setup_id, s.pc
  LIMIT max_rows;
END;
$$ LANGUAGE plpgsql;
