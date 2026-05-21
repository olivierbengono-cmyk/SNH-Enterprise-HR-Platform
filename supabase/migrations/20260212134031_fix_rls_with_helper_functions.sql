/*
  # Fix RLS Policies with Helper Functions

  ## Changes
  - Create helper functions in public schema
  - Fix leave_requests policies to avoid recursion
  - Fix payslips policies to avoid recursion
  - Add missing policies for all tables
  - Simplify all policies to use helper functions

  ## Security
  - Maintains strict access control
  - Removes all circular policy references
  - Uses security definer functions for complex checks
*/

-- Create a security definer function to get employee_id from user_id
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create a security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
$$;

-- Fix leave_requests policies
DROP POLICY IF EXISTS "Employees can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can create leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can approve leave requests" ON leave_requests;

CREATE POLICY "Employees can view own leave requests"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    employee_id = public.get_current_employee_id()
    OR public.has_role(ARRAY['drh', 'manager', 'admin', 'director'])
  );

CREATE POLICY "Employees can create own leave requests"
  ON leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = public.get_current_employee_id()
  );

CREATE POLICY "Managers and DRH can update leave requests"
  ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(ARRAY['drh', 'manager', 'admin'])
  )
  WITH CHECK (
    public.has_role(ARRAY['drh', 'manager', 'admin'])
  );

-- Fix payslips policies
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;

CREATE POLICY "Employees can view own payslips"
  ON payslips
  FOR SELECT
  TO authenticated
  USING (
    employee_id = public.get_current_employee_id()
    OR public.has_role(ARRAY['drh', 'admin'])
  );

CREATE POLICY "DRH can manage payslips"
  ON payslips
  FOR ALL
  TO authenticated
  USING (
    public.has_role(ARRAY['drh', 'admin'])
  )
  WITH CHECK (
    public.has_role(ARRAY['drh', 'admin'])
  );

-- Fix training_programs policies
DROP POLICY IF EXISTS "Anyone can view training programs" ON training_programs;

CREATE POLICY "Employees can view training programs"
  ON training_programs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "DRH can manage training programs"
  ON training_programs
  FOR ALL
  TO authenticated
  USING (
    public.has_role(ARRAY['drh', 'admin'])
  )
  WITH CHECK (
    public.has_role(ARRAY['drh', 'admin'])
  );

-- Add policies for job_openings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_openings' AND policyname = 'Everyone can view job openings'
  ) THEN
    CREATE POLICY "Everyone can view job openings"
      ON job_openings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_openings' AND policyname = 'DRH can manage job openings'
  ) THEN
    CREATE POLICY "DRH can manage job openings"
      ON job_openings
      FOR ALL
      TO authenticated
      USING (
        public.has_role(ARRAY['drh', 'admin'])
      )
      WITH CHECK (
        public.has_role(ARRAY['drh', 'admin'])
      );
  END IF;
END $$;

-- Add policies for candidates if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'candidates' AND policyname = 'DRH can view candidates'
  ) THEN
    CREATE POLICY "DRH can view candidates"
      ON candidates
      FOR SELECT
      TO authenticated
      USING (
        public.has_role(ARRAY['drh', 'admin'])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'candidates' AND policyname = 'DRH can manage candidates'
  ) THEN
    CREATE POLICY "DRH can manage candidates"
      ON candidates
      FOR ALL
      TO authenticated
      USING (
        public.has_role(ARRAY['drh', 'admin'])
      )
      WITH CHECK (
        public.has_role(ARRAY['drh', 'admin'])
      );
  END IF;
END $$;

-- Add policies for departments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'Everyone can view departments'
  ) THEN
    CREATE POLICY "Everyone can view departments"
      ON departments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'DRH can manage departments'
  ) THEN
    CREATE POLICY "DRH can manage departments"
      ON departments
      FOR ALL
      TO authenticated
      USING (
        public.has_role(ARRAY['drh', 'admin'])
      )
      WITH CHECK (
        public.has_role(ARRAY['drh', 'admin'])
      );
  END IF;
END $$;

-- Add policies for positions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'positions' AND policyname = 'Everyone can view positions'
  ) THEN
    CREATE POLICY "Everyone can view positions"
      ON positions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'positions' AND policyname = 'DRH can manage positions'
  ) THEN
    CREATE POLICY "DRH can manage positions"
      ON positions
      FOR ALL
      TO authenticated
      USING (
        public.has_role(ARRAY['drh', 'admin'])
      )
      WITH CHECK (
        public.has_role(ARRAY['drh', 'admin'])
      );
  END IF;
END $$;

-- Add policies for leave_types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leave_types' AND policyname = 'Everyone can view leave types'
  ) THEN
    CREATE POLICY "Everyone can view leave types"
      ON leave_types
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leave_types' AND policyname = 'DRH can manage leave types'
  ) THEN
    CREATE POLICY "DRH can manage leave types"
      ON leave_types
      FOR ALL
      TO authenticated
      USING (
        public.has_role(ARRAY['drh', 'admin'])
      )
      WITH CHECK (
        public.has_role(ARRAY['drh', 'admin'])
      );
  END IF;
END $$;
