-- Add a PERMISSIVE policy that requires authentication for SELECT on profiles
-- This ensures only authenticated users can read any profile data
CREATE POLICY "Require authentication to view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);