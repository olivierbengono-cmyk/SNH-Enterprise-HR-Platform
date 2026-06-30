ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS recruitment_request_id uuid REFERENCES recruitment_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_openings_recruitment_request_id ON job_openings(recruitment_request_id);
