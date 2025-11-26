-- Add management_id and recycler_id columns to equipment_checkouts table
ALTER TABLE public.equipment_checkouts
ADD COLUMN management_id uuid REFERENCES public.management(id),
ADD COLUMN recycler_id uuid REFERENCES public.recyclers(id);