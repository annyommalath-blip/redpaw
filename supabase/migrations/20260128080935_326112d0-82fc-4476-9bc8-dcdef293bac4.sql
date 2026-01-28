-- Fix sitter-logs storage upload policy to only allow assigned sitters
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload sitter log media" ON storage.objects;

-- Create a restrictive policy that verifies the user is an assigned sitter for the care request
CREATE POLICY "Assigned sitters can upload log media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sitter-logs' AND
  auth.uid() IS NOT NULL AND
  -- Verify the path starts with a request ID the user is assigned to
  EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.assigned_sitter_id = auth.uid()
    AND cr.status = 'open'::request_status
    AND (storage.foldername(name))[1] = cr.id::text
  )
);