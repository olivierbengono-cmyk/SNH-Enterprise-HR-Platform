-- Allow candidates to upload/update their own photo in candidates-documents bucket
-- Photos stored under photos/<candidate_id>/profile.*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('candidate-photos', 'candidate-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Public read
CREATE POLICY "candidate_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-photos');

-- Authenticated candidates can upload
CREATE POLICY "candidate_photos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-photos');

-- Authenticated can update/delete their own
CREATE POLICY "candidate_photos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-photos');

CREATE POLICY "candidate_photos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-photos');
