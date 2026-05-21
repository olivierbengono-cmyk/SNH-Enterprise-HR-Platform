/*
  # Ajout contraintes UNIQUE pour ON CONFLICT dans le seed

  - candidates(email) — un candidat unique par email
  - candidate_job_matches(candidate_id, job_opening_id) — déjà défini mais vérifié
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidates_email_unique'
  ) THEN
    ALTER TABLE candidates ADD CONSTRAINT candidates_email_unique UNIQUE (email);
  END IF;
END $$;
