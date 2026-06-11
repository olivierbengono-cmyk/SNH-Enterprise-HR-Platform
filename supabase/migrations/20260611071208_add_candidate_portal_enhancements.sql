
-- Add social links to candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Add niveau (education level) and specialization to candidate_educations
ALTER TABLE candidate_educations
  ADD COLUMN IF NOT EXISTS niveau TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Add expiration_date to candidate_documents
ALTER TABLE candidate_documents
  ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- Add draft support to candidate_applications
ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stage_topic TEXT,
  ADD COLUMN IF NOT EXISTS stage_duration TEXT,
  ADD COLUMN IF NOT EXISTS stage_start TEXT,
  ADD COLUMN IF NOT EXISTS stage_school TEXT,
  ADD COLUMN IF NOT EXISTS stage_end_date DATE,
  ADD COLUMN IF NOT EXISTS stage_supervisor_name TEXT,
  ADD COLUMN IF NOT EXISTS stage_supervisor_contact TEXT,
  ADD COLUMN IF NOT EXISTS stage_study_level TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT;

-- Update document type constraint to allow more types
ALTER TABLE candidate_documents DROP CONSTRAINT IF EXISTS candidate_documents_type_check;

ALTER TABLE candidate_documents
  ADD CONSTRAINT candidate_documents_type_check
  CHECK (type IN (
    'cv', 'cover_letter', 'diploma', 'reference', 'other',
    'cni_passport', 'attestation_emploi', 'certificat_travail',
    'casier_judiciaire', 'certificat_medical', 'photo_identite',
    'releve_notes', 'attestation_stage', 'permis_conduire',
    'justificatif_domicile', 'contrat_travail', 'attestation_immatriculation'
  ));
