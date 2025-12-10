-- Insert test mechanics data to test lazy loading
INSERT INTO mechanics (name, contact_number, status) VALUES
('John Smith', '+63 912 345 6789', 'active'),
('Maria Garcia', '+63 923 456 7890', 'active'),
('Robert Johnson', '+63 934 567 8901', 'active'),
('Lisa Wong', '+63 945 678 9012', 'active'),
('Carlos Rodriguez', '+63 956 789 0123', 'active'),
('Anna Chen', '+63 967 890 1234', 'active'),
('Michael Brown', '+63 978 901 2345', 'active'),
('Sarah Davis', '+63 989 012 3456', 'active'),
('David Wilson', '+63 990 123 4567', 'active'),
('Jennifer Lee', '+63 901 234 5678', 'active');

-- Insert test tools
INSERT INTO tools (name, code, category, status) VALUES
('Wrench Set', 'WR001', 'Hand Tools', 'available'),
('Screwdriver Set', 'SD001', 'Hand Tools', 'available'),
('Socket Set', 'SK001', 'Hand Tools', 'available'),
('Drill Machine', 'DR001', 'Power Tools', 'available'),
('Angle Grinder', 'AG001', 'Power Tools', 'available'),
('Welding Machine', 'WM001', 'Welding', 'available'),
('Multimeter', 'MM001', 'Testing', 'available'),
('Hydraulic Jack', 'HJ001', 'Lifting', 'available'),
('Tire Iron', 'TI001', 'Vehicle', 'available'),
('Oil Filter Wrench', 'OF001', 'Vehicle', 'available');

-- Insert test consumables
INSERT INTO mechanic_consumables (name, code, category, unit, quantity, min_stock_level) VALUES
('Engine Oil 15W-40', 'EO001', 'Lubricants', 'liters', 50, 10),
('Brake Fluid DOT 4', 'BF001', 'Fluids', 'liters', 25, 5),
('Air Filter', 'AF001', 'Filters', 'pieces', 20, 5),
('Oil Filter', 'OF001', 'Filters', 'pieces', 30, 8),
('Spark Plugs', 'SP001', 'Ignition', 'pieces', 40, 10),
('Brake Pads', 'BP001', 'Brakes', 'sets', 15, 3),
('Coolant', 'CL001', 'Fluids', 'liters', 35, 8),
('Transmission Fluid', 'TF001', 'Fluids', 'liters', 20, 5),
('Grease', 'GR001', 'Lubricants', 'kg', 10, 2),
('Gaskets Set', 'GS001', 'Seals', 'sets', 12, 3);