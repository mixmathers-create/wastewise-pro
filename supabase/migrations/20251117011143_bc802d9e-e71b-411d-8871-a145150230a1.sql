-- Add latitude and longitude columns to clients table
ALTER TABLE public.clients 
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric;