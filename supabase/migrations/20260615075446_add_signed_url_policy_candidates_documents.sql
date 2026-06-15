-- Allow HR to insert documents on behalf of candidates (needed for admin upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'HR can upload candidate documents'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can upload candidate documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'candidates-documents' AND
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
          )
        );
    $policy$;
  END IF;
END $$;

-- Allow HR to delete candidate documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'HR can delete candidate documents'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can delete candidate documents"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'candidates-documents' AND
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
          )
        );
    $policy$;
  END IF;
END $$;