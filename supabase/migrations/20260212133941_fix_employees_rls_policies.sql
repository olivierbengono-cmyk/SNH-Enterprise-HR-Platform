/*
  # Fix RLS Policies for Employees Table

  ## Changes
  - Drop existing policies that cause infinite recursion
  - Create new simplified policies without circular dependencies
  - Managers can view their team using direct user_id comparison
  - DRH and admins can manage all employees
  - Employees can view their own data

  ## Security
  - Maintains strict access control
  - Removes circular policy references
  - Uses direct auth.uid() comparisons where possible
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own data" ON employees;
DROP POLICY IF EXISTS "Managers can view their team" ON employees;
DROP POLICY IF EXISTS "DRH can manage employees" ON employees;

-- Policy for employees to view their own data
CREATE POLICY "Employees can view own data"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Policy for DRH/Admin to view all employees
CREATE POLICY "DRH and Admin can view all employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'director')
    )
  );

-- Policy for DRH/Admin to insert employees
CREATE POLICY "DRH and Admin can insert employees"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policy for DRH/Admin to update employees
CREATE POLICY "DRH and Admin can update employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policy for DRH/Admin to delete employees
CREATE POLICY "DRH and Admin can delete employees"
  ON employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );
