-- Add recycler_ids column to schedules table
ALTER TABLE public.schedules 
ADD COLUMN recycler_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.schedules.recycler_ids IS 'Array of recycler IDs assigned to this schedule';