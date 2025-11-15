-- Remove team-based restrictions and allow all authenticated users to access all data

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view clients in their team" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view trucks in their team" ON public.trucks;
DROP POLICY IF EXISTS "Admins can insert trucks" ON public.trucks;
DROP POLICY IF EXISTS "Admins can update trucks" ON public.trucks;
DROP POLICY IF EXISTS "Admins can delete trucks" ON public.trucks;

DROP POLICY IF EXISTS "Users can view drivers in their team" ON public.drivers;
DROP POLICY IF EXISTS "Admins can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins can update drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins can delete drivers" ON public.drivers;

DROP POLICY IF EXISTS "Users can view helpers in their team" ON public.helpers;
DROP POLICY IF EXISTS "Admins can insert helpers" ON public.helpers;
DROP POLICY IF EXISTS "Admins can update helpers" ON public.helpers;
DROP POLICY IF EXISTS "Admins can delete helpers" ON public.helpers;

DROP POLICY IF EXISTS "Users can view receipts in their team" ON public.collection_receipts;
DROP POLICY IF EXISTS "Users can insert receipts" ON public.collection_receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.collection_receipts;

DROP POLICY IF EXISTS "Users can view profiles in their team" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own team" ON public.teams;
DROP POLICY IF EXISTS "Users can insert team" ON public.teams;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Create simple policies: all authenticated users can do everything
CREATE POLICY "All authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "All authenticated users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view trucks" ON public.trucks FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert trucks" ON public.trucks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update trucks" ON public.trucks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "All authenticated users can delete trucks" ON public.trucks FOR DELETE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "All authenticated users can delete drivers" ON public.drivers FOR DELETE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view helpers" ON public.helpers FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert helpers" ON public.helpers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update helpers" ON public.helpers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "All authenticated users can delete helpers" ON public.helpers FOR DELETE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view receipts" ON public.collection_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert receipts" ON public.collection_receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update receipts" ON public.collection_receipts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "All authenticated users can delete receipts" ON public.collection_receipts FOR DELETE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update teams" ON public.teams FOR UPDATE TO authenticated USING (true);

CREATE POLICY "All authenticated users can view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (true);