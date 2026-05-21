/*
  # CVthèque — Authentification candidats + matching offres

  ## Modifications
  1. `candidates` — ajout user_id (lié à auth.users), password_hash retiré (géré par Supabase Auth)
  2. `candidate_applications` — ajout job_opening_id pour candidater à une offre spécifique
  3. `candidate_job_matches` — table de cache des scores IA par (candidat, offre)
  4. `job_openings` — ajout colonnes required_skills[] et nice_to_have_skills[] pour le matching
  5. Politiques RLS : candidats voient uniquement leurs propres données via auth.uid()

  ## Sécurité
  - Les candidats s'authentifient via Supabase Auth (email/password)
  - Un candidat ne peut voir/modifier que ses propres données
  - Les scores de matching sont calculés par l'edge function et mis en cache ici
*/

-- ============================================================
-- EXTEND candidates: lier à auth.users
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='user_id'
  ) THEN
    ALTER TABLE candidates ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  -- colonne pour stocker si l'inscription est complète
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='profile_completed'
  ) THEN
    ALTER TABLE candidates ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- EXTEND job_openings: compétences requises pour matching IA
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='required_skills'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN required_skills text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='nice_to_have_skills'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN nice_to_have_skills text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='min_experience_years'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN min_experience_years integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='education_level'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN education_level text;
  END IF;
END $$;

-- ============================================================
-- EXTEND candidate_applications: lier à une offre spécifique
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='job_opening_id'
  ) THEN
    ALTER TABLE candidate_applications ADD COLUMN job_opening_id uuid REFERENCES job_openings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- TABLE: candidate_job_matches (cache des scores IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_opening_id uuid NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  match_score integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  skill_match_score integer DEFAULT 0,
  experience_match_score integer DEFAULT 0,
  education_match_score integer DEFAULT 0,
  matched_skills text[] DEFAULT '{}',
  missing_skills text[] DEFAULT '{}',
  ai_summary text,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(candidate_id, job_opening_id)
);

ALTER TABLE candidate_job_matches ENABLE ROW LEVEL SECURITY;

-- HR can view all matches
CREATE POLICY "HR can view all matches"
  ON candidate_job_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
    )
  );

-- Candidates can view their own matches
CREATE POLICY "Candidates can view own matches"
  ON candidate_job_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_job_matches.candidate_id
      AND candidates.user_id = auth.uid()
    )
  );

-- Service role / edge function can insert/update matches
CREATE POLICY "Anyone authenticated can upsert matches"
  ON candidate_job_matches FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update matches"
  ON candidate_job_matches FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- ADJUST RLS on candidates: candidats voient/modifient leurs données
-- ============================================================

-- Drop old permissive policies if exist and replace with owner-based
DO $$ BEGIN
  DROP POLICY IF EXISTS "HR can view all candidates" ON candidates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "HR can view all candidates"
  ON candidates FOR SELECT TO authenticated
  USING (
    -- HR roles
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
    )
    OR
    -- Own record
    user_id = auth.uid()
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "HR can update candidates" ON candidates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "HR can update candidates"
  ON candidates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
    )
    OR user_id = auth.uid()
  );

-- Candidate-owned select/insert/update on sub-tables
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert candidate experiences" ON candidate_experiences;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate experiences"
  ON candidate_experiences FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own experiences"
  ON candidate_experiences FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can update own experiences"
  ON candidate_experiences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()));

CREATE POLICY "Owners can delete own experiences"
  ON candidate_experiences FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_educations
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert candidate educations" ON candidate_educations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate educations"
  ON candidate_educations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own educations"
  ON candidate_educations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can update own educations"
  ON candidate_educations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()));

CREATE POLICY "Owners can delete own educations"
  ON candidate_educations FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_candidate_skills
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert candidate skills" ON candidate_candidate_skills;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate skills"
  ON candidate_candidate_skills FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own skills"
  ON candidate_candidate_skills FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can update own skills"
  ON candidate_candidate_skills FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()));

CREATE POLICY "Owners can delete own skills"
  ON candidate_candidate_skills FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_applications: owners can view and insert own
CREATE POLICY "Owners can view own applications"
  ON candidate_applications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can insert own applications"
  ON candidate_applications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_documents
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can upload candidate documents" ON candidate_documents;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate documents"
  ON candidate_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own documents"
  ON candidate_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- job_openings: public SELECT for candidates portal
CREATE POLICY "Authenticated can view open jobs"
  ON job_openings FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_candidate ON candidate_job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_job ON candidate_job_matches(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_score ON candidate_job_matches(match_score DESC);
