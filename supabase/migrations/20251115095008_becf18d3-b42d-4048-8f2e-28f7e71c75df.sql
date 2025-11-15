-- Add contact person and contact number to clients table
ALTER TABLE public.clients 
ADD COLUMN contact_person text,
ADD COLUMN contact_number text;