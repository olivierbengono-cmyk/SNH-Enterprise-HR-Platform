/*
# Fix missing columns and storage HR upload policy

## Problems fixed

### 1. job_openings table — missing work_mode and salary_range columns
The JobOpeningForm inserts `work_mode` and `salary_range` but these columns don't
exist, causing a schema cache error when creating/editing job openings.

### 2. candidate_applications table — missing spontaneous_type column
The CandidateManagement admin form and CandidatePortal insert `spontaneous_type`
(e.g. 'emploi', 'stage', 'alternance') to classify spontaneous applications,
but the column was never created.

### 3. Storage RLS — HR cannot upload to candidates-documents bucket
The storage bucket `candidates-documents` had INSERT permission only for
candidates (checked via candidates.user_id = auth.uid()). HR admins adding
documents on behalf of candidates had no INSERT policy, causing
"new row violates row-level security policy" on every upload.
This adds INSERT and DELETE policies for HR roles.

## Changes

### job_openings
- ADD COLUMN work_mode text (nullable) — working arrangement label
- ADD COLUMN salary_range text (nullable) — salary bracket display text

### candidate_applications
- ADD COLUMN spontaneous_type text (nullable) — 'emploi' | 'stage' | 'alternance' | 'vie'

### storage.objects (candidates-documents bucket)
- Add INSERT policy allowing HR roles to upload files
- Add DELETE policy allowing HR roles to delete files
*/

-- ── 1. Add missing columns to job_openings ───────────────────────────────────

ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS work_mode text,
  ADD COLUMN IF NOT EXISTS salary_range text;

-- ── 2. Add missing column to candidate_applications ──────────────────────────

ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS spontaneous_type text;

-- ── 3. Add HR storage policies for candidates-documents bucket ───────────────

DROP POLICY IF EXISTS "HR can upload candidate documents" ON storage.objects;
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

DROP POLICY IF EXISTS "HR can delete candidate documents in storage" ON storage.objects;
CREATE POLICY "HR can delete candidate documents in storage"
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
