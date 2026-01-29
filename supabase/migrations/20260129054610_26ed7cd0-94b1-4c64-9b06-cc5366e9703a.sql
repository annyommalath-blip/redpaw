-- Make sitter-logs bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'sitter-logs';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view sitter log media" ON storage.objects;

-- Create restrictive SELECT policy for owners and assigned sitters only
CREATE POLICY "Owners and sitters can view log media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sitter-logs' AND
  (
    -- Owner of the care request
    EXISTS (
      SELECT 1 FROM care_requests cr
      WHERE (storage.foldername(name))[1] = cr.id::text
      AND cr.owner_id = auth.uid()
    )
    OR
    -- Assigned sitter
    EXISTS (
      SELECT 1 FROM care_requests cr
      WHERE (storage.foldername(name))[1] = cr.id::text
      AND cr.assigned_sitter_id = auth.uid()
    )
  )
);