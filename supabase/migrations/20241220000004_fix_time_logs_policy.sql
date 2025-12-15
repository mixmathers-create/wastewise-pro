-- Fix INSERT policy to allow NULL team_id for personnel time logs
DROP POLICY "Users can insert time logs in their team" ON personnel_time_logs;

CREATE POLICY "Users can insert time logs in their team" ON personnel_time_logs 
FOR INSERT 
WITH CHECK (team_id IS NULL OR team_id = get_user_team_id(auth.uid()));