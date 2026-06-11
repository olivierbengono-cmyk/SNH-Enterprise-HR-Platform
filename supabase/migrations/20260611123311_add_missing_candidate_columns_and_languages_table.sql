-- Add missing columns to candidate_experiences
ALTER TABLE candidate_experiences
  ADD COLUMN IF NOT EXISTS sector        text,
  ADD COLUMN IF NOT EXISTS contract_type text;

-- Add country column to candidate_educations if missing
ALTER TABLE candidate_educations
  ADD COLUMN IF NOT EXISTS country text;

-- Create candidate_languages table (used by portal for languages tab)
CREATE TABLE IF NOT EXISTS candidate_languages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name         text NOT NULL,
  level        text NOT NULL DEFAULT 'intermediate'
    CHECK (level IN ('beginner','intermediate','good','excellent')),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE candidate_languages ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own languages
CREATE POLICY "candidates_select_own_languages" ON candidate_languages
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );
CREATE POLICY "candidates_insert_own_languages" ON candidate_languages
  FOR INSERT WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );
CREATE POLICY "candidates_delete_own_languages" ON candidate_languages
  FOR DELETE USING (
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
  );

-- HR staff can read all languages (user_profiles uses 'id' = auth.uid())
CREATE POLICY "hr_read_all_languages" ON candidate_languages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin','drh','recruitment_manager','career_manager')
    )
  );
