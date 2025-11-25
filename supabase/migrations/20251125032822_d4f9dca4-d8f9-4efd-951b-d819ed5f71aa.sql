-- Add team_id column to user_roles table
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Create a default team for existing users if they don't have one
-- For now, we'll create a simple approach where each user gets a unique team_id
-- In production, you'd want to manually assign users to teams

-- Update existing user_roles to have a team_id (set to their user_id as a simple default)
UPDATE public.user_roles
SET team_id = gen_random_uuid()
WHERE team_id IS NULL;

-- Make team_id required for new entries
ALTER TABLE public.user_roles
ALTER COLUMN team_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_team ON public.user_roles(team_id);