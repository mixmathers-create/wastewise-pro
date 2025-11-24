-- Add leave_days and is_paid columns to leaves table
ALTER TABLE leaves 
ADD COLUMN leave_days integer NOT NULL DEFAULT 0,
ADD COLUMN is_paid boolean NOT NULL DEFAULT true;