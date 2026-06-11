
-- Add expiration_date to candidate_documents
ALTER TABLE candidate_documents 
  ADD COLUMN IF NOT EXISTS expiration_date date,
  ADD COLUMN IF NOT EXISTS document_number text;

-- Extend document type enum / check constraint to include more types
-- First drop existing constraint if any and recreate with more values
ALTER TABLE candidate_documents DROP CONSTRAINT IF EXISTS candidate_documents_type_check;

-- Add new columns to candidates for social media
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

-- Add education_level and specialization to candidate_educations
ALTER TABLE candidate_educations
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS specialization text;

-- Add stage-specific fields to candidate_applications
ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS stage_end_date date,
  ADD COLUMN IF NOT EXISTS stage_supervisor text,
  ADD COLUMN IF NOT EXISTS current_education_level text,
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;
