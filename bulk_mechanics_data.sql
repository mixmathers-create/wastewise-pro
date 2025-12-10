-- Generate 100 mechanics
INSERT INTO mechanics (name, contact_number, status) 
SELECT 
  'Mechanic ' || generate_series AS name,
  '+63 9' || LPAD((900000000 + generate_series)::text, 9, '0') AS contact_number,
  CASE WHEN generate_series % 10 = 0 THEN 'inactive' ELSE 'active' END AS status
FROM generate_series(1, 100);

-- Generate 200 tools
INSERT INTO tools (name, code, category, status)
SELECT 
  'Tool ' || generate_series AS name,
  'T' || LPAD(generate_series::text, 4, '0') AS code,
  CASE 
    WHEN generate_series % 5 = 0 THEN 'Power Tools'
    WHEN generate_series % 4 = 0 THEN 'Hand Tools'
    WHEN generate_series % 3 = 0 THEN 'Measuring'
    WHEN generate_series % 2 = 0 THEN 'Cutting'
    ELSE 'General'
  END AS category,
  CASE WHEN generate_series % 15 = 0 THEN 'maintenance' ELSE 'available' END AS status
FROM generate_series(1, 200);

-- Generate 150 consumables
INSERT INTO mechanic_consumables (name, code, category, unit, quantity, min_stock_level, unit_cost)
SELECT 
  'Consumable ' || generate_series AS name,
  'C' || LPAD(generate_series::text, 4, '0') AS code,
  CASE 
    WHEN generate_series % 6 = 0 THEN 'Lubricants'
    WHEN generate_series % 5 = 0 THEN 'Fluids'
    WHEN generate_series % 4 = 0 THEN 'Filters'
    WHEN generate_series % 3 = 0 THEN 'Electrical'
    WHEN generate_series % 2 = 0 THEN 'Hardware'
    ELSE 'General'
  END AS category,
  CASE 
    WHEN generate_series % 3 = 0 THEN 'pieces'
    WHEN generate_series % 2 = 0 THEN 'liters'
    ELSE 'kg'
  END AS unit,
  (generate_series % 100) + 10 AS quantity,
  (generate_series % 20) + 5 AS min_stock_level,
  (generate_series % 500) + 50 AS unit_cost
FROM generate_series(1, 150);

-- Generate 50 job orders
INSERT INTO job_orders (job_number, title, description, priority, status, created_by)
SELECT 
  'JO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(generate_series::text, 4, '0') AS job_number,
  'Job Order ' || generate_series AS title,
  'Description for job order ' || generate_series AS description,
  CASE 
    WHEN generate_series % 4 = 0 THEN 'high'
    WHEN generate_series % 3 = 0 THEN 'medium'
    ELSE 'low'
  END AS priority,
  CASE 
    WHEN generate_series % 5 = 0 THEN 'completed'
    WHEN generate_series % 4 = 0 THEN 'in_progress'
    WHEN generate_series % 3 = 0 THEN 'suspended'
    ELSE 'pending'
  END AS status,
  (SELECT user_id FROM profiles LIMIT 1) AS created_by
FROM generate_series(1, 50);