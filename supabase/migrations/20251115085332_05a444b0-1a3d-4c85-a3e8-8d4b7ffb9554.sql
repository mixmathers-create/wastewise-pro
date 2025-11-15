-- Seed demo data with correct truck types
DO $$
DECLARE demo_team_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Demo Waste Management Team') THEN
    INSERT INTO public.teams (name) VALUES ('Demo Waste Management Team') RETURNING id INTO demo_team_id;

    -- Trucks: type must be one of ['GC1','GC2','GC3','GC4','GC5','GC6','DT']
    INSERT INTO public.trucks (team_id, code, type) VALUES
      (demo_team_id, 'GC1', 'GC1'),
      (demo_team_id, 'GC2', 'GC2'),
      (demo_team_id, 'GC3', 'GC3'),
      (demo_team_id, 'GC4', 'GC4'),
      (demo_team_id, 'GC5', 'GC5'),
      (demo_team_id, 'GC6', 'GC6'),
      (demo_team_id, 'DT', 'DT');

    -- Clients
    INSERT INTO public.clients (team_id, name, industry, qr_code, contact_info, address) VALUES
      (demo_team_id, 'Green Valley Mall', 'Commercial', 'GVM-001-' || demo_team_id, '+1-555-0101', '123 Mall Street, Green Valley'),
      (demo_team_id, 'City Hospital', 'Healthcare', 'CHO-002-' || demo_team_id, '+1-555-0102', '456 Health Ave, Medical District'),
      (demo_team_id, 'Tech Industries Inc', 'Technology', 'TII-003-' || demo_team_id, '+1-555-0103', '789 Innovation Blvd, Tech Park'),
      (demo_team_id, 'Downtown Restaurant', 'Food Service', 'DTR-004-' || demo_team_id, '+1-555-0104', '321 Food Court, Downtown'),
      (demo_team_id, 'Construction Co.', 'Construction', 'CCO-005-' || demo_team_id, '+1-555-0105', '654 Builder Lane, Industrial Zone');

    -- Drivers
    INSERT INTO public.drivers (team_id, name, license_number) VALUES
      (demo_team_id, 'John Smith', 'DL-12345'),
      (demo_team_id, 'Maria Garcia', 'DL-23456'),
      (demo_team_id, 'James Brown', 'DL-34567'),
      (demo_team_id, 'Lisa Chen', 'DL-45678');

    -- Helpers
    INSERT INTO public.helpers (team_id, name) VALUES
      (demo_team_id, 'Robert Johnson'),
      (demo_team_id, 'Sarah Williams'),
      (demo_team_id, 'Michael Davis'),
      (demo_team_id, 'Jennifer Martinez'),
      (demo_team_id, 'David Wilson'),
      (demo_team_id, 'Emily Taylor');
  END IF;
END $$;