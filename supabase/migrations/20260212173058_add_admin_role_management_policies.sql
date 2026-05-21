/*
  # Add Admin Role Management Policies

  1. Security Updates
    - Add policy for DRH and admin to view all user profiles
    - Add policy for DRH and admin to update user roles
    - Maintain existing user self-management policies

  2. Important Notes
    - Only DRH and admin roles can modify other users' roles
    - Employees can still view and update their own non-role profile data
    - All changes are audited through updated_at timestamp
*/

-- Allow DRH and admin to view all user profiles
CREATE POLICY "DRH and admin can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('drh', 'admin')
    )
  );

-- Allow DRH and admin to update user roles
CREATE POLICY "DRH and admin can update user roles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('drh', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('drh', 'admin')
    )
  );
