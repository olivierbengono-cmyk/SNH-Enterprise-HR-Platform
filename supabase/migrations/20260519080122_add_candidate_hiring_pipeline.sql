/*
  # Candidate Hiring Pipeline

  ## Summary
  Adds a complete end-to-end hiring workflow tracking candidates from application
  through screening, interview, offer, trial period, and full integration as employees.

  ## Changes

  ### Modified Tables
  - `candidate_applications`
    - Updated status constraint to include: pre_onboarding, onboarding, integrated
    - New columns: offer_date, offer_salary, offer_contract_type, offer_start_date,
      trial_period_months, trial_end_date, hired_as_employee_id, hiring_decision_date,
      hiring_manager_notes, onboarding_checklist (jsonb)

  ### New Table
  - `hiring_pipeline_events` — chronological audit log of all status transitions
    - fields: candidate_id, application_id, from_status, to_status, actor_id, notes, metadata, created_at

  ## Security
  - RLS enabled on hiring_pipeline_events
  - HR roles (drh, admin, recruitment_manager, career_manager) have full access
  - Managers can view
  - Candidates can view their own events
*/

-- 1. Extend candidate_applications with hiring fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_salary') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_salary numeric(15,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_contract_type') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_contract_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_start_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_start_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='trial_period_months') THEN
    ALTER TABLE candidate_applications ADD COLUMN trial_period_months integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='trial_end_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN trial_end_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='hiring_decision_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN hiring_decision_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='hiring_manager_notes') THEN
    ALTER TABLE candidate_applications ADD COLUMN hiring_manager_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='hired_as_employee_id') THEN
    ALTER TABLE candidate_applications ADD COLUMN hired_as_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='onboarding_checklist') THEN
    ALTER TABLE candidate_applications ADD COLUMN onboarding_checklist jsonb DEFAULT '[]';
  END IF;
END $$;

-- 2. Expand status constraint to include all pipeline stages
ALTER TABLE candidate_applications DROP CONSTRAINT IF EXISTS candidate_applications_status_check;
ALTER TABLE candidate_applications
  ADD CONSTRAINT candidate_applications_status_check
  CHECK (status IN ('new','reviewing','interview','offer','pre_onboarding','onboarding','integrated','rejected','withdrawn'));

-- 3. Create hiring pipeline events audit log
CREATE TABLE IF NOT EXISTS hiring_pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES candidate_applications(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hiring_pipeline_events_candidate_id_idx ON hiring_pipeline_events(candidate_id);
CREATE INDEX IF NOT EXISTS hiring_pipeline_events_application_id_idx ON hiring_pipeline_events(application_id);

-- 4. RLS
ALTER TABLE hiring_pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view pipeline events"
  ON hiring_pipeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
    )
  );

CREATE POLICY "HR can insert pipeline events"
  ON hiring_pipeline_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
    )
  );

CREATE POLICY "Candidates can view own pipeline events"
  ON hiring_pipeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = hiring_pipeline_events.candidate_id
      AND candidates.user_id = auth.uid()
    )
  );
