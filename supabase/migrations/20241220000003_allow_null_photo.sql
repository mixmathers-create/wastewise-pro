-- Allow photo_url to be null in personnel_time_logs
ALTER TABLE personnel_time_logs ALTER COLUMN photo_url DROP NOT NULL;