-- Add photo columns to incident_reports table
ALTER TABLE incident_reports 
ADD COLUMN IF NOT EXISTS photos JSONB,
ADD COLUMN IF NOT EXISTS admin_photos JSONB;

-- Add comments for clarity
COMMENT ON COLUMN incident_reports.photos IS 'Photos uploaded by the incident reporter (array of base64 strings)';
COMMENT ON COLUMN incident_reports.admin_photos IS 'Documentation photos uploaded by admin during review (array of base64 strings)';