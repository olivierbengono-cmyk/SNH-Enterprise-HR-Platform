/*
  # Simple Fix: Remove Recursive Policies

  1. Problem
    - Policies and functions checking user_profiles create infinite recursion
    - Need alternative approach for admin access

  2. Solution
    - Drop all problematic policies and functions
    - Keep only basic user self-access policies
    - Will use service role for admin operations in Edge Functions

  3. Security
    - Users can only access their own profiles via RLS
    - Admin operations will go through secure Edge Functions
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "DRH and admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "DRH and admin can update user roles" ON user_profiles;

-- Drop the helper functions
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS is_admin_or_drh();
