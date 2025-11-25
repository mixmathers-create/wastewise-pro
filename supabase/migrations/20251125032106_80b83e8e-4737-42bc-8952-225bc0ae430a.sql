-- Add truck_id to personnel_time_logs table
ALTER TABLE public.personnel_time_logs
ADD COLUMN truck_id UUID REFERENCES public.trucks(id);

-- Add index for truck_id
CREATE INDEX idx_personnel_time_logs_truck ON public.personnel_time_logs(truck_id);

-- Update the group_session_id to be optional since truck_id will serve as group identifier
COMMENT ON COLUMN public.personnel_time_logs.truck_id IS 'The truck/vehicle the group is using. Groups are identified by truck_id + time_in date.';