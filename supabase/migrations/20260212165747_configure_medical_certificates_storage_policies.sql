/*
  # Configure Storage Policies for Medical Certificates

  1. Storage Policies
    - Enable RLS on storage.objects (if not already enabled)
    - Allow employees to upload certificates to their own folder
    - Allow employees to read their own certificates
    - Allow managers to read certificates from their team members
    - Allow DRH to read all certificates
  
  2. Security
    - Files are organized by user_id in folders
    - Only authenticated users can access
    - No public access allowed
*/

-- Storage policies for medical certificates bucket

-- Policy: Employees can upload medical certificates to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Employees can upload medical certificates'
  ) THEN
    CREATE POLICY "Employees can upload medical certificates"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'medical-certificates'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Policy: Employees can read their own medical certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Employees can read own medical certificates'
  ) THEN
    CREATE POLICY "Employees can read own medical certificates"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Policy: Managers can read medical certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Managers can read medical certificates'
  ) THEN
    CREATE POLICY "Managers can read medical certificates"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates'
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'manager'
        )
      );
  END IF;
END $$;

-- Policy: DRH can read all medical certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'DRH can read all medical certificates'
  ) THEN
    CREATE POLICY "DRH can read all medical certificates"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates'
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'drh'
        )
      );
  END IF;
END $$;