-- Insert 10 additional drivers with varied availability
INSERT INTO drivers (name, license_number, contact_number, birthdate, id_number, availability)
VALUES
  ('Michael Rodriguez', 'DL-2024-006', '+63-912-345-6789', '1988-03-15', 'ID-006', '{"shifts": ["AM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'),
  ('Sarah Chen', 'DL-2024-007', '+63-913-456-7890', '1992-07-22', 'ID-007', '{"shifts": ["PM"], "days": ["Mon", "Wed", "Fri", "Sat", "Sun"]}'),
  ('David Martinez', 'DL-2024-008', '+63-914-567-8901', '1985-11-08', 'ID-008', '{"shifts": ["AM", "PM"], "days": ["Tue", "Thu", "Sat"]}'),
  ('Jessica Wong', 'DL-2024-009', '+63-915-678-9012', '1990-05-30', 'ID-009', '{"shifts": ["AM"], "days": ["Mon", "Tue", "Wed", "Fri", "Sat"]}'),
  ('Robert Taylor', 'DL-2024-010', '+63-916-789-0123', '1987-09-12', 'ID-010', '{"shifts": ["PM"], "days": ["Sun", "Mon", "Tue", "Thu", "Fri"]}'),
  ('Amanda Garcia', 'DL-2024-011', '+63-917-890-1234', '1993-01-25', 'ID-011', '{"shifts": ["AM", "PM"], "days": ["Wed", "Thu", "Fri", "Sat", "Sun"]}'),
  ('Kevin Brown', 'DL-2024-012', '+63-918-901-2345', '1989-06-18', 'ID-012', '{"shifts": ["AM"], "days": ["Mon", "Wed", "Thu", "Sat"]}'),
  ('Lisa Anderson', 'DL-2024-013', '+63-919-012-3456', '1991-12-03', 'ID-013', '{"shifts": ["PM"], "days": ["Tue", "Wed", "Fri", "Sat", "Sun"]}'),
  ('James Wilson', 'DL-2024-014', '+63-920-123-4567', '1986-04-20', 'ID-014', '{"shifts": ["AM", "PM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'),
  ('Maria Santos', 'DL-2024-015', '+63-921-234-5678', '1994-08-14', 'ID-015', '{"shifts": ["AM"], "days": ["Tue", "Thu", "Fri", "Sat", "Sun"]}');

-- Insert 20 additional helpers with varied availability
INSERT INTO helpers (name, contact_number, birthdate, id_number, availability)
VALUES
  ('Carlos Reyes', '+63-922-345-6789', '1995-02-10', 'HLP-007', '{"shifts": ["AM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'),
  ('Jennifer Lee', '+63-923-456-7890', '1996-06-25', 'HLP-008', '{"shifts": ["PM"], "days": ["Mon", "Wed", "Fri", "Sat", "Sun"]}'),
  ('Miguel Torres', '+63-924-567-8901', '1994-10-05', 'HLP-009', '{"shifts": ["AM", "PM"], "days": ["Tue", "Thu", "Sat"]}'),
  ('Patricia Cruz', '+63-925-678-9012', '1997-03-18', 'HLP-010', '{"shifts": ["AM"], "days": ["Mon", "Tue", "Thu", "Fri", "Sat"]}'),
  ('Daniel Ramos', '+63-926-789-0123', '1993-08-30', 'HLP-011', '{"shifts": ["PM"], "days": ["Sun", "Mon", "Wed", "Fri"]}'),
  ('Angela Flores', '+63-927-890-1234', '1998-01-12', 'HLP-012', '{"shifts": ["AM"], "days": ["Tue", "Wed", "Thu", "Sat", "Sun"]}'),
  ('Ricardo Mendoza', '+63-928-901-2345', '1992-07-07', 'HLP-013', '{"shifts": ["PM"], "days": ["Mon", "Tue", "Thu", "Fri", "Sat"]}'),
  ('Sofia Gonzales', '+63-929-012-3456', '1999-11-22', 'HLP-014', '{"shifts": ["AM", "PM"], "days": ["Wed", "Fri", "Sat", "Sun"]}'),
  ('Fernando Castro', '+63-930-123-4567', '1991-05-15', 'HLP-015', '{"shifts": ["AM"], "days": ["Mon", "Wed", "Fri", "Sat"]}'),
  ('Isabella Morales', '+63-931-234-5678', '1996-09-28', 'HLP-016', '{"shifts": ["PM"], "days": ["Tue", "Thu", "Fri", "Sun"]}'),
  ('Antonio Diaz', '+63-932-345-6789', '1995-12-08', 'HLP-017', '{"shifts": ["AM"], "days": ["Mon", "Tue", "Wed", "Sat", "Sun"]}'),
  ('Christina Rivera', '+63-933-456-7890', '1997-04-03', 'HLP-018', '{"shifts": ["PM"], "days": ["Mon", "Wed", "Thu", "Fri", "Sat"]}'),
  ('Eduardo Silva', '+63-934-567-8901', '1994-08-19', 'HLP-019', '{"shifts": ["AM", "PM"], "days": ["Tue", "Wed", "Thu", "Fri"]}'),
  ('Gabriela Ortiz', '+63-935-678-9012', '1998-02-14', 'HLP-020', '{"shifts": ["AM"], "days": ["Mon", "Thu", "Fri", "Sat", "Sun"]}'),
  ('Luis Vargas', '+63-936-789-0123', '1993-06-27', 'HLP-021', '{"shifts": ["PM"], "days": ["Tue", "Wed", "Fri", "Sat"]}'),
  ('Victoria Herrera', '+63-937-890-1234', '1996-10-11', 'HLP-022', '{"shifts": ["AM"], "days": ["Mon", "Tue", "Thu", "Sat", "Sun"]}'),
  ('Pablo Navarro', '+63-938-901-2345', '1995-03-05', 'HLP-023', '{"shifts": ["PM"], "days": ["Mon", "Wed", "Thu", "Fri", "Sun"]}'),
  ('Natalia Jimenez', '+63-939-012-3456', '1999-07-20', 'HLP-024', '{"shifts": ["AM", "PM"], "days": ["Tue", "Fri", "Sat", "Sun"]}'),
  ('Roberto Guerrero', '+63-940-123-4567', '1992-11-16', 'HLP-025', '{"shifts": ["AM"], "days": ["Mon", "Wed", "Thu", "Fri", "Sat"]}'),
  ('Carmen Delgado', '+63-941-234-5678', '1997-01-29', 'HLP-026', '{"shifts": ["PM"], "days": ["Tue", "Wed", "Thu", "Sat", "Sun"]}');

-- Insert 5 additional trucks with varied types and capacities
INSERT INTO trucks (code, type, plate_number, status, capacity)
VALUES
  ('GC-006', 'GC', 'ABC-1236', 'available', 4),
  ('DT-003', 'DT', 'XYZ-7893', 'available', 2),
  ('GC-007', 'GC', 'DEF-4567', 'available', 4),
  ('DT-004', 'DT', 'GHI-7894', 'available', 2),
  ('GC-008', 'GC', 'JKL-1238', 'available', 4);