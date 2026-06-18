-- Allow candidates to delete their own withdrawn or rejected applications
-- (only final/closed statuses — not applications under active review by HR)
CREATE POLICY "Candidates can delete own closed applications"
  ON candidate_applications
  FOR DELETE
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
    AND status IN ('withdrawn', 'rejected')
  );
