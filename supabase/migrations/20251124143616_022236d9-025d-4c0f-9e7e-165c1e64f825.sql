-- Drop the old generic function
DROP FUNCTION IF EXISTS public.generate_personnel_id();

-- Create table-specific ID generation function
CREATE OR REPLACE FUNCTION public.set_personnel_id_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
  random_suffix text;
BEGIN
  -- Only generate if id_number is null or empty
  IF NEW.id_number IS NULL OR NEW.id_number = '' THEN
    -- Determine prefix based on table name
    CASE TG_TABLE_NAME
      WHEN 'helpers' THEN prefix := 'HLP';
      WHEN 'recyclers' THEN prefix := 'RYC';
      WHEN 'management' THEN prefix := 'MNM';
      WHEN 'mechanics' THEN prefix := 'MEC';
      ELSE prefix := 'PER'; -- fallback
    END CASE;
    
    -- Generate 9 random digits
    random_suffix := lpad(floor(random() * 1000000000)::text, 9, '0');
    NEW.id_number := prefix || '-' || random_suffix;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Backfill existing records with correct prefixes
UPDATE public.helpers SET id_number = 'HLP-' || lpad(floor(random() * 1000000000)::text, 9, '0') 
WHERE id_number IS NULL OR id_number = '' OR id_number LIKE 'ABC-%';

UPDATE public.mechanics SET id_number = 'MEC-' || lpad(floor(random() * 1000000000)::text, 9, '0') 
WHERE id_number IS NULL OR id_number = '' OR id_number LIKE 'ABC-%';

UPDATE public.recyclers SET id_number = 'RYC-' || lpad(floor(random() * 1000000000)::text, 9, '0') 
WHERE id_number IS NULL OR id_number = '' OR id_number LIKE 'ABC-%';

UPDATE public.management SET id_number = 'MNM-' || lpad(floor(random() * 1000000000)::text, 9, '0') 
WHERE id_number IS NULL OR id_number = '' OR id_number LIKE 'ABC-%';