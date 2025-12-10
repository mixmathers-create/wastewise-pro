-- Insert test users for each user type
INSERT INTO profiles (user_id, full_name, email, role, user_type) VALUES
('11111111-1111-1111-1111-111111111111', 'Test Admin', 'test.admin@waste.ph', 'admin', 'admin'),
('22222222-2222-2222-2222-222222222222', 'Test Mechanic', 'test.mechanic@waste.ph', 'user', 'mechanic'),
('33333333-3333-3333-3333-333333333333', 'Test Collector', 'test.collector@waste.ph', 'user', 'collector'),
('44444444-4444-4444-4444-444444444444', 'Test HR', 'test.hr@waste.ph', 'user', 'hr');