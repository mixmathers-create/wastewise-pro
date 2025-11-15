-- Drop the restrictive truck type constraint
ALTER TABLE public.trucks DROP CONSTRAINT IF EXISTS trucks_type_check;

-- Add new columns to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Add new columns to helpers table
ALTER TABLE public.helpers
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Add new columns to trucks table
ALTER TABLE public.trucks
ADD COLUMN IF NOT EXISTS plate_number TEXT;

-- Clear existing data
DELETE FROM public.collection_receipts;
DELETE FROM public.drivers;
DELETE FROM public.helpers;
DELETE FROM public.trucks;
DELETE FROM public.clients;

-- Create or get default team
INSERT INTO public.teams (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Team')
ON CONFLICT (id) DO NOTHING;

-- Insert seed data for clients
INSERT INTO public.clients (team_id, name, qr_code, address, industry, contact_person, contact_number) VALUES
('00000000-0000-0000-0000-000000000001', 'Makati Medical Center', 'CLIENT-MMC-001', '2 Amorsolo Street, Legaspi Village, Makati City', 'Healthcare', 'Dr. Maria Santos', '+63 917 123 4567'),
('00000000-0000-0000-0000-000000000001', 'SM Megamall', 'CLIENT-SM-002', 'EDSA corner Julia Vargas Avenue, Mandaluyong City', 'Retail', 'John Cruz', '+63 918 234 5678'),
('00000000-0000-0000-0000-000000000001', 'Bonifacio Global City Residences', 'CLIENT-BGC-003', '5th Avenue, Bonifacio Global City, Taguig', 'Residential', 'Anna Reyes', '+63 919 345 6789'),
('00000000-0000-0000-0000-000000000001', 'Ayala Triangle Gardens', 'CLIENT-ATG-004', 'Ayala Avenue, Makati City', 'Commercial', 'Robert Tan', '+63 920 456 7890'),
('00000000-0000-0000-0000-000000000001', 'Manila Bay Hotel', 'CLIENT-MBH-005', 'Roxas Boulevard, Manila', 'Hospitality', 'Lisa Garcia', '+63 921 567 8901');

-- Insert seed data for trucks
INSERT INTO public.trucks (team_id, code, type, plate_number) VALUES
('00000000-0000-0000-0000-000000000001', 'GC-01', 'Garbage Collector', 'ABC-1234'),
('00000000-0000-0000-0000-000000000001', 'GC-02', 'Garbage Collector', 'DEF-5678'),
('00000000-0000-0000-0000-000000000001', 'DT-01', 'Dump Truck', 'GHI-9012'),
('00000000-0000-0000-0000-000000000001', 'DT-02', 'Dump Truck', 'JKL-3456'),
('00000000-0000-0000-0000-000000000001', 'GC-03', 'Garbage Collector', 'MNO-7890');

-- Insert seed data for drivers
INSERT INTO public.drivers (team_id, name, license_number, id_number, birthdate, contact_number) VALUES
('00000000-0000-0000-0000-000000000001', 'Pedro Martinez', 'N03-12-345678', 'DRV-001', '1985-03-15', '+63 917 111 2222'),
('00000000-0000-0000-0000-000000000001', 'Juan Dela Cruz', 'N02-13-456789', 'DRV-002', '1990-07-22', '+63 918 222 3333'),
('00000000-0000-0000-0000-000000000001', 'Carlos Ramos', 'N03-14-567890', 'DRV-003', '1988-11-30', '+63 919 333 4444'),
('00000000-0000-0000-0000-000000000001', 'Miguel Santos', 'N02-15-678901', 'DRV-004', '1992-05-18', '+63 920 444 5555'),
('00000000-0000-0000-0000-000000000001', 'Ramon Lopez', 'N03-16-789012', 'DRV-005', '1987-09-25', '+63 921 555 6666');

-- Insert seed data for helpers
INSERT INTO public.helpers (team_id, name, id_number, birthdate, contact_number) VALUES
('00000000-0000-0000-0000-000000000001', 'Jose Garcia', 'HLP-001', '1995-02-10', '+63 917 666 7777'),
('00000000-0000-0000-0000-000000000001', 'Ricardo Torres', 'HLP-002', '1993-06-15', '+63 918 777 8888'),
('00000000-0000-0000-0000-000000000001', 'Antonio Flores', 'HLP-003', '1991-10-20', '+63 919 888 9999'),
('00000000-0000-0000-0000-000000000001', 'Manuel Rivera', 'HLP-004', '1994-12-05', '+63 920 999 0000'),
('00000000-0000-0000-0000-000000000001', 'Fernando Gomez', 'HLP-005', '1996-04-28', '+63 921 000 1111'),
('00000000-0000-0000-0000-000000000001', 'Pablo Morales', 'HLP-006', '1992-08-14', '+63 922 111 2222');