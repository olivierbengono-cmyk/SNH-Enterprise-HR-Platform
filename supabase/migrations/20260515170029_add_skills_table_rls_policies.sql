/*
  # Add RLS policies for skills table

  1. Problem
    - skills table has no RLS policies — blocks all operations

  2. Solution
    - All authenticated users can view skills (needed for dropdowns everywhere)
    - Only HR roles can create/update/delete skills
*/

-- All authenticated users can view skills
CREATE POLICY "Authenticated users can view skills"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

-- HR roles can insert skills
CREATE POLICY "HR roles can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager')
    )
  );

-- HR roles can update skills
CREATE POLICY "HR roles can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager')
    )
  );

-- HR roles can delete skills
CREATE POLICY "HR roles can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager')
    )
  );
