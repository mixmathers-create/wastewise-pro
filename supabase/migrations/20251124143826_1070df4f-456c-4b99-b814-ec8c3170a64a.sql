-- Add new columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS contract_file_url text,
ADD COLUMN IF NOT EXISTS contract_expiry_date date;

-- Create storage bucket for client contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-contracts', 'client-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client contracts bucket
CREATE POLICY "Authenticated users can view client contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-contracts');

CREATE POLICY "Authenticated users can upload client contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-contracts');

CREATE POLICY "Authenticated users can update client contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-contracts');

CREATE POLICY "Authenticated users can delete client contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-contracts');