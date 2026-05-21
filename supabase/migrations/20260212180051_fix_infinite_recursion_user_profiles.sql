/*
  # Fix Infinite Recursion in User Profiles RLS

  1. Problem
    - Policies checking user_profiles.role create infinite recursion
    - Users cannot login because profile loading fails

  2. Solution
    - Drop problematic policies that query user_profiles within user_profiles policies
    - Create SECURITY DEFINER functions to bypass RLS
    - Recreate policies using helper functions

  3. Security
    - Maintain secure access control
    - DRH and admin can still manage roles through functions
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "DRH and admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "DRH and admin can update user roles" ON user_profiles;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$;

-- Create security definer function to check if user is admin or drh
CREATE OR REPLACE FUNCTION is_admin_or_drh()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('drh', 'admin')
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "DRH and admin can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin_or_drh());

CREATE POLICY "DRH and admin can update user roles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_drh())
  WITH CHECK (is_admin_or_drh());
