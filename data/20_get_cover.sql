create type cover_fumen_info as (cover_pattern text, cover_data bytea, fumen fumen);

CREATE OR REPLACE FUNCTION public.get_cover_fumen (targets jsonb) RETURNS setof cover_fumen_info as $$
BEGIN
  RETURN QUERY
  SELECT
    s.cover_pattern,
    st.cover_data,
    s.fumen
  FROM statistics st
  JOIN jsonb_to_recordset(targets) as x(setup_id setupid, kicktable kicktable, hold_type hold_type) ON 
    st.setup_id = x.setup_id
    AND st.kicktable = x.kicktable
    AND st.hold_type = x.hold_type
  JOIN setups s
    ON s.setup_id = st.setup_id;
END;
$$ LANGUAGE plpgsql;
