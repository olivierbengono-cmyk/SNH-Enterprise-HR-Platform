/*
  # CVthèque — Extension du système de candidatures

  ## Modifications
  - Extension de la table `candidates` existante avec les champs manquants
  - Création de `candidate_experiences`, `candidate_educations`, `candidate_skills`, `candidate_documents`
  - Création de `candidate_applications` (pipeline RH)

  ## Sécurité
  - RLS sur toutes les nouvelles tables
  - Insertion publique (anon) autorisée pour le portail candidat
  - Lecture/gestion réservée aux rôles RH
*/

-- ============================================================
-- EXTEND: candidates (ajouter colonnes manquantes)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='access_token') THEN
    ALTER TABLE candidates ADD COLUMN access_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='location') THEN
    ALTER TABLE candidates ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='linkedin_url') THEN
    ALTER TABLE candidates ADD COLUMN linkedin_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='portfolio_url') THEN
    ALTER TABLE candidates ADD COLUMN portfolio_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='summary') THEN
    ALTER TABLE candidates ADD COLUMN summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='desired_position') THEN
    ALTER TABLE candidates ADD COLUMN desired_position text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='desired_salary_min') THEN
    ALTER TABLE candidates ADD COLUMN desired_salary_min numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='desired_salary_max') THEN
    ALTER TABLE candidates ADD COLUMN desired_salary_max numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='availability_date') THEN
    ALTER TABLE candidates ADD COLUMN availability_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='mobility') THEN
    ALTER TABLE candidates ADD COLUMN mobility text DEFAULT 'local';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='source') THEN
    ALTER TABLE candidates ADD COLUMN source text DEFAULT 'direct';
  END IF;
END $$;

-- Backfill access_token for existing rows
UPDATE candidates SET access_token = gen_random_uuid() WHERE access_token IS NULL;

-- ============================================================
-- RLS: candidates
-- ============================================================
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='HR can view all candidates') THEN
    CREATE POLICY "HR can view all candidates"
      ON candidates FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='Anyone can submit a candidature') THEN
    CREATE POLICY "Anyone can submit a candidature"
      ON candidates FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='HR can update candidates') THEN
    CREATE POLICY "HR can update candidates"
      ON candidates FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='HR can delete candidates') THEN
    CREATE POLICY "HR can delete candidates"
      ON candidates FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager')
        )
      );
  END IF;
END $$;

-- ============================================================
-- TABLE: candidate_experiences
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company text NOT NULL,
  location text,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  skills_used text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate experiences"
  ON candidate_experiences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can insert candidate experiences"
  ON candidate_experiences FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate experiences"
  ON candidate_experiences FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

-- ============================================================
-- TABLE: candidate_educations
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_educations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  degree text NOT NULL,
  field_of_study text,
  institution text NOT NULL,
  location text,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  grade text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_educations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate educations"
  ON candidate_educations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can insert candidate educations"
  ON candidate_educations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate educations"
  ON candidate_educations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

-- ============================================================
-- TABLE: candidate_skills
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_candidate_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'other' CHECK (category IN ('technical','soft','language','certification','other')),
  level text DEFAULT 'intermediate' CHECK (level IN ('beginner','intermediate','advanced','expert')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_candidate_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate skills"
  ON candidate_candidate_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can insert candidate skills"
  ON candidate_candidate_skills FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate skills"
  ON candidate_candidate_skills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

-- ============================================================
-- TABLE: candidate_applications (pipeline RH)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  desired_position text,
  cover_letter text,
  status text DEFAULT 'new' CHECK (status IN ('new','reviewing','interview','offer','hired','rejected','withdrawn')),
  rejection_reason text,
  internal_notes text,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  interview_date timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all applications"
  ON candidate_applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can submit application"
  ON candidate_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can update applications"
  ON candidate_applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "HR can delete applications"
  ON candidate_applications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager')));

-- ============================================================
-- TABLE: candidate_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cv','cover_letter','diploma','reference','other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate documents"
  ON candidate_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

CREATE POLICY "Anyone can upload candidate documents"
  ON candidate_documents FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate documents"
  ON candidate_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager')));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidate_applications_status ON candidate_applications(status);
CREATE INDEX IF NOT EXISTS idx_candidate_applications_candidate ON candidate_applications(candidate_id);
