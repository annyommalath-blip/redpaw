
-- Drop the existing SELECT policy on dogs
DROP POLICY IF EXISTS "Users can view dogs" ON public.dogs;

-- Create updated policy that checks both dog_id AND dog_ids array
CREATE POLICY "Users can view dogs" 
ON public.dogs 
FOR SELECT 
USING (
  (auth.uid() = owner_id) 
  OR (EXISTS ( 
    SELECT 1 FROM care_requests cr
    WHERE cr.status = 'open'::request_status
    AND (cr.dog_id = dogs.id OR dogs.id = ANY(cr.dog_ids))
  )) 
  OR (EXISTS ( 
    SELECT 1 FROM lost_alerts la
    WHERE la.dog_id = dogs.id AND la.status = 'active'::alert_status
  ))
);
