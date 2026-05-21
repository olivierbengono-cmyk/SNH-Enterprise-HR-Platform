/*
  # Add RLS policies for employee_skills table

  1. Problem
    - employee_skills table has RLS enabled but no policies defined
    - This blocks all INSERT/UPDATE/DELETE/SELECT operations

  2. Solution
    - Allow authenticated users with HR/admin/career_manager roles to manage all skill assignments
    - Allow managers to assign skills to their team members
    - Allow employees to view their own skills
*/

-- Allow HR roles to view all employee skills
CREATE POLICY "HR roles can view all employee skills"
  ON employee_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager', 'manager', 'recruitment_manager')
    )
  );

-- Allow employees to view their own skills
CREATE POLICY "Employees can view own skills"
  ON employee_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_skills.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Allow HR roles to insert employee skills
CREATE POLICY "HR roles can insert employee skills"
  ON employee_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager', 'manager', 'recruitment_manager')
    )
  );

-- Allow HR roles to update employee skills
CREATE POLICY "HR roles can update employee skills"
  ON employee_skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager', 'manager', 'recruitment_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager', 'manager', 'recruitment_manager')
    )
  );

-- Allow HR roles to delete employee skills
CREATE POLICY "HR roles can delete employee skills"
  ON employee_skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'career_manager', 'manager', 'recruitment_manager')
    )
  );
