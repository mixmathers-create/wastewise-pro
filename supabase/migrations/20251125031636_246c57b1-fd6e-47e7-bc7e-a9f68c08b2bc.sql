-- Create storage bucket for time log photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('time-logs', 'time-logs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for time-logs bucket
CREATE POLICY "Time log photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'time-logs');

CREATE POLICY "Authenticated users can upload time log photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'time-logs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update time log photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'time-logs' AND auth.role() = 'authenticated');