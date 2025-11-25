-- Add odometer_reading column to trucks table
ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS odometer_reading numeric DEFAULT 0;

-- Add comments column to job_orders table for mechanic notes
ALTER TABLE public.job_orders 
ADD COLUMN IF NOT EXISTS mechanic_comments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.trucks.odometer_reading IS 'Current odometer reading in kilometers';
COMMENT ON COLUMN public.job_orders.mechanic_comments IS 'Array of comment objects with user_id, user_name, comment, and created_at';