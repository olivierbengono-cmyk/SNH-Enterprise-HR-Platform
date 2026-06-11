ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS required_languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS benefits text,
  ADD COLUMN IF NOT EXISTS other_conditions text;
