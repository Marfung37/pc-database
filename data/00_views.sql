-- leftovers for each pc
CREATE VIEW pc_leftovers AS
SELECT DISTINCT
  pc,
  leftover,
  MIN(setup_id) AS sort_key
FROM
  setups
GROUP BY
  pc,
  leftover;
