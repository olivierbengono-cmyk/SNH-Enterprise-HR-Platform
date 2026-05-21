/*
  # Allow administrators to view and manage all user profiles

  1. Problem
    - The `user_profiles` table only had RLS policies letting each user see/update their own profile.
    - As a consequence, the "Comptes d'acces" and "Gestion des roles" modules returned zero rows for
      administrators and DRH, preventing them from managing users.

  2. Changes
    - Add a non-recursive SELECT policy authorizing users with role `admin` or `drh` to view every
      profile. The check uses the SECURITY DEFINER helper `has_role()` which bypasses RLS on
      `user_profiles` internally, so there is no risk of infinite recursion.
    - Add a matching UPDATE policy so administrators can change roles directly (the edge function is
      still the primary path, but this enables direct client updates as a safety net).
    - Add a DELETE policy so administrators can remove profiles when needed.

  3. Security
    - Policies are strictly restricted to authenticated users holding the `admin` or `drh` role.
    - The existing "Users can view/update own profile" policies remain unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'Admins can view all user profiles'
  ) THEN
    CREATE POLICY "Admins can view all user profiles"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (has_role(ARRAY['drh'::text, 'admin'::text]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'Admins can update all user profiles'
  ) THEN
    CREATE POLICY "Admins can update all user profiles"
      ON public.user_profiles
      FOR UPDATE
      TO authenticated
      USING (has_role(ARRAY['drh'::text, 'admin'::text]))
      WITH CHECK (has_role(ARRAY['drh'::text, 'admin'::text]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'Admins can delete user profiles'
  ) THEN
    CREATE POLICY "Admins can delete user profiles"
      ON public.user_profiles
      FOR DELETE
      TO authenticated
      USING (has_role(ARRAY['drh'::text, 'admin'::text]));
  END IF;
END $$;
