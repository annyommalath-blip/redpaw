
-- Fix adoption-photos DELETE: scope to owner via folder
DROP POLICY IF EXISTS "Users can delete their own adoption photos" ON storage.objects;
CREATE POLICY "Users can delete their own adoption photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'adoption-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix donation-photos DELETE: scope to owner via folder
DROP POLICY IF EXISTS "Users can delete their own donation photos" ON storage.objects;
CREATE POLICY "Users can delete their own donation photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'donation-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix donation-receipts SELECT: only donor or campaign owner can read
-- Files are stored at: {donor_user_id}/{campaign_id}/{timestamp}.{ext}
DROP POLICY IF EXISTS "Authenticated users can view donation receipts" ON storage.objects;
CREATE POLICY "Donor or campaign owner can view donation receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'donation-receipts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.donation_campaigns dc
      WHERE dc.id::text = (storage.foldername(name))[2]
        AND dc.owner_id = auth.uid()
    )
  )
);
