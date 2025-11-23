-- Add unit_cost to mechanic_consumables
ALTER TABLE mechanic_consumables
ADD COLUMN unit_cost numeric DEFAULT 0;

-- Add time tracking fields to job_orders
ALTER TABLE job_orders
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN total_active_minutes integer DEFAULT 0,
ADD COLUMN last_resume_at timestamp with time zone,
ADD COLUMN suspended_periods jsonb DEFAULT '[]'::jsonb;