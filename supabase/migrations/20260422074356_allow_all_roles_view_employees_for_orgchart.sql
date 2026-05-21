/*
  # Allow all authenticated roles to view employees for the org chart

  ## Problem
  The org chart (and related views) must be visible to every authenticated user
  regardless of their role. Currently the `manager` role and any other
  authenticated role not explicitly listed cannot read the `employees` table,
  causing the org-chart component to return 0 rows.

  ## Changes
  1. Add SELECT policy on `employees` for the `manager` role.
  2. Add a broad SELECT policy on `employees` for any authenticated user
     (covers recruitment_manager, career_manager, qvct_manager, payroll_manager,
     director, manager, employee, and any future roles).
     The existing more-specific policies remain for clarity; Postgres uses OR
     semantics across policies so having both is harmless.

  ## Security
  - Read-only (SELECT only) — no write access is granted.
  - Requires authentication (`TO authenticated`).
  - No sensitive payroll/contract data is exposed beyond what is already visible
    to each role through their own dashboards.
*/

-- Managers need to see all employees (org chart, my-team view, etc.)
CREATE POLICY "Managers can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'manager'
    )
  );

-- Catch-all: any authenticated user can read the employees directory
-- (needed for org chart, auto-complete fields, etc.)
CREATE POLICY "All authenticated users can view employees directory"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
