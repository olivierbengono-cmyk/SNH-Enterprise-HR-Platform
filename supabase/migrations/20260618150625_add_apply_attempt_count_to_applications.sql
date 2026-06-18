-- Track how many times a candidate has applied (including re-applies after withdrawal)
-- for a given job opening, without losing history.

ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1;

-- Backfill: for existing rows, set attempt_number = 1 (all current rows are first attempts)
-- (already handled by DEFAULT 1)

-- A function that returns how many non-draft applications (including withdrawn ones)
-- a candidate has made to a specific job opening.
CREATE OR REPLACE FUNCTION count_candidate_job_attempts(
  p_candidate_id uuid,
  p_job_opening_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM candidate_applications
  WHERE candidate_id = p_candidate_id
    AND job_opening_id = p_job_opening_id
    AND draft = false
    AND is_draft = false;
$$;
