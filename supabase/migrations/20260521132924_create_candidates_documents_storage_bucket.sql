/*
  # Create candidates-documents storage bucket

  1. Storage
    - Creates the `candidates-documents` bucket for candidate file uploads (CV, diplomas, etc.)
    - Bucket is private (not public)

  2. Security Policies
    - Candidates can upload their own files (INSERT)
    - Candidates can read their own files (SELECT)
    - Candidates can delete their own files (DELETE)
    - HR roles (drh, admin, recruitment_manager, career_manager) can read all candidate files

  3. RLS on candidate_documents table
    - Candidates can insert/select/delete their own document records
    - HR roles can select all document records
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidates-documents',
  'candidates-documents',
  false,
  10485760, -- 10 MB limit
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for candidates-documents bucket
CREATE POLICY "Candidates can upload own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.user_id = auth.uid()
        AND candidates.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Candidates can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.user_id = auth.uid()
        AND candidates.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Candidates can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.user_id = auth.uid()
        AND candidates.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "HR can view all candidate documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- Ensure RLS is enabled on candidate_documents table
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "HR can view candidate documents" ON public.candidate_documents;
DROP POLICY IF EXISTS "Anyone can upload documents" ON public.candidate_documents;
DROP POLICY IF EXISTS "HR can delete candidate documents" ON public.candidate_documents;

-- Candidates can insert their own document records
CREATE POLICY "Candidates can insert own document records"
  ON public.candidate_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_documents.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- Candidates can view their own document records
CREATE POLICY "Candidates can view own document records"
  ON public.candidate_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_documents.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- Candidates can delete their own document records
CREATE POLICY "Candidates can delete own document records"
  ON public.candidate_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_documents.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- HR roles can view all document records
CREATE POLICY "HR can view all candidate document records"
  ON public.candidate_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- HR roles can delete any document record
CREATE POLICY "HR can delete any candidate document record"
  ON public.candidate_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );
