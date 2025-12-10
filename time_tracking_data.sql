-- Generate 500 mechanic time logs (heavy data to test performance)
INSERT INTO mechanic_time_logs (mechanic_id, time_in, time_out, created_at)
SELECT 
  (SELECT id FROM mechanics ORDER BY RANDOM() LIMIT 1) AS mechanic_id,
  (NOW() - INTERVAL '30 days') + (generate_series * INTERVAL '1 hour') AS time_in,
  CASE 
    WHEN generate_series % 3 = 0 THEN NULL  -- Some entries without time_out (still working)
    ELSE (NOW() - INTERVAL '30 days') + (generate_series * INTERVAL '1 hour') + INTERVAL '8 hours'
  END AS time_out,
  (NOW() - INTERVAL '30 days') + (generate_series * INTERVAL '1 hour') AS created_at
FROM generate_series(1, 500);

-- Generate additional personnel time logs for drivers/helpers
INSERT INTO personnel_time_logs (personnel_id, personnel_name, personnel_type, time_in, time_out, created_at)
SELECT 
  CASE 
    WHEN generate_series % 2 = 0 THEN (SELECT id FROM drivers ORDER BY RANDOM() LIMIT 1)
    ELSE (SELECT id FROM helpers ORDER BY RANDOM() LIMIT 1)
  END AS personnel_id,
  CASE 
    WHEN generate_series % 2 = 0 THEN (SELECT name FROM drivers ORDER BY RANDOM() LIMIT 1)
    ELSE (SELECT name FROM helpers ORDER BY RANDOM() LIMIT 1)
  END AS personnel_name,
  CASE 
    WHEN generate_series % 2 = 0 THEN 'driver'
    ELSE 'helper'
  END AS personnel_type,
  (NOW() - INTERVAL '30 days') + (generate_series * INTERVAL '2 hours') AS time_in,
  CASE 
    WHEN generate_series % 4 = 0 THEN NULL  -- Some entries without time_out
    ELSE (NOW() - INTERVAL '30 days') + (generate_series * INTERVAL '2 hours') + INTERVAL '9 hours'
  END AS time_out,
  (NOW() - INTERVAL '30 days') + (generate_series * INTERVAL '2 hours') AS created_at
FROM generate_series(1, 300);