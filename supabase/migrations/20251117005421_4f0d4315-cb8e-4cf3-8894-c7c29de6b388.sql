-- Add scheduling-related fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS mt_requirement numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS collection_days text[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
ADD COLUMN IF NOT EXISTS collection_shift text DEFAULT 'AM';

-- Add client_ids array to schedules table to track which clients are serviced
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS client_ids uuid[] DEFAULT ARRAY[]::uuid[];