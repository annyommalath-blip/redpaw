-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own dogs" ON public.dogs;

-- Create a new policy that allows:
-- 1. Owners to view their own dogs
-- 2. Anyone to view dogs that are part of open care requests
CREATE POLICY "Users can view dogs" 
ON public.dogs 
FOR SELECT 
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM care_requests cr 
    WHERE cr.dog_id = dogs.id 
    AND cr.status = 'open'
  )
  OR EXISTS (
    SELECT 1 FROM lost_alerts la 
    WHERE la.dog_id = dogs.id 
    AND la.status = 'active'
  )
);