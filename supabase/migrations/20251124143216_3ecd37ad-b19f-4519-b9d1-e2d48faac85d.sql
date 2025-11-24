-- Function to generate ID numbers in format ABC-123456789
CREATE OR REPLACE FUNCTION public.generate_personnel_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  random_suffix text;
BEGIN
  -- Generate 9 random digits
  random_suffix := lpad(floor(random() * 1000000000)::text, 9, '0');
  RETURN 'ABC-' || random_suffix;
END;
$$;

-- Trigger function to auto-generate id_number if blank
CREATE OR REPLACE FUNCTION public.set_personnel_id_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id_number IS NULL OR NEW.id_number = '' THEN
    NEW.id_number := public.generate_personnel_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for helpers
DROP TRIGGER IF EXISTS set_helper_id_number ON public.helpers;
CREATE TRIGGER set_helper_id_number
  BEFORE INSERT OR UPDATE ON public.helpers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_personnel_id_number();

-- Create triggers for mechanics
DROP TRIGGER IF EXISTS set_mechanic_id_number ON public.mechanics;
CREATE TRIGGER set_mechanic_id_number
  BEFORE INSERT OR UPDATE ON public.mechanics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_personnel_id_number();

-- Create triggers for recyclers
DROP TRIGGER IF EXISTS set_recycler_id_number ON public.recyclers;
CREATE TRIGGER set_recycler_id_number
  BEFORE INSERT OR UPDATE ON public.recyclers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_personnel_id_number();

-- Create triggers for management
DROP TRIGGER IF EXISTS set_management_id_number ON public.management;
CREATE TRIGGER set_management_id_number
  BEFORE INSERT OR UPDATE ON public.management
  FOR EACH ROW
  EXECUTE FUNCTION public.set_personnel_id_number();

-- Backfill existing records with blank or null id_numbers
UPDATE public.helpers SET id_number = public.generate_personnel_id() WHERE id_number IS NULL OR id_number = '';
UPDATE public.mechanics SET id_number = public.generate_personnel_id() WHERE id_number IS NULL OR id_number = '';
UPDATE public.recyclers SET id_number = public.generate_personnel_id() WHERE id_number IS NULL OR id_number = '';
UPDATE public.management SET id_number = public.generate_personnel_id() WHERE id_number IS NULL OR id_number = '';