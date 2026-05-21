/*
  # Correction Politiques RLS pour Opérations CRUD - Version Simplifiée
  
  ## Objectif
  Permettre les opérations INSERT, UPDATE, DELETE pour les utilisateurs autorisés
  
  ## Tables Corrigées
  - Principales tables opérationnelles
  - Ajout des politiques manquantes
*/

-- =============================================
-- 1. LEAVE REQUESTS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Employees can create leave requests" ON leave_requests;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Employees can create leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "DRH can manage all leave requests" ON leave_requests;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "DRH can manage all leave requests"
  ON leave_requests FOR ALL
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "Managers can update leave requests" ON leave_requests;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Managers can update leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- =============================================
-- 2. TRAINING PROGRAMS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "DRH and career managers can manage training programs" ON training_programs;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "DRH and career managers can manage training programs"
  ON training_programs FOR ALL
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

-- =============================================
-- 3. TRAINING ENROLLMENTS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "DRH and career managers can manage enrollments" ON training_enrollments;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "DRH and career managers can manage enrollments"
  ON training_enrollments FOR ALL
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

-- =============================================
-- 4. PAYROLL ELEMENTS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Payroll managers can delete payroll elements" ON payroll_elements;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Payroll managers can delete payroll elements"
  ON payroll_elements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'payroll_manager')
    )
  );

-- =============================================
-- 5. PAYROLL CALCULATIONS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Payroll managers can delete payroll calculations" ON payroll_calculations;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Payroll managers can delete payroll calculations"
  ON payroll_calculations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'payroll_manager')
    )
  );

-- =============================================
-- 6. PAYSLIPS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Payroll managers can manage all payslips" ON payslips;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Payroll managers can manage all payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'payroll_manager')
    )
  );

-- =============================================
-- 7. JOB OPENINGS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "DRH and recruitment managers can manage job openings" ON job_openings;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "DRH and recruitment managers can manage job openings"
  ON job_openings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager')
    )
  );

-- =============================================
-- 8. CANDIDATES
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "DRH and recruitment managers can manage candidates" ON candidates;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "DRH and recruitment managers can manage candidates"
  ON candidates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager')
    )
  );

-- =============================================
-- 9. INTERVIEWS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "DRH and recruitment managers can manage interviews" ON interviews;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "DRH and recruitment managers can manage interviews"
  ON interviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager')
    )
  );

-- =============================================
-- 10. PERFORMANCE REVIEWS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Managers and career managers can manage reviews" ON performance_reviews;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Managers and career managers can manage reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager', 'career_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager', 'career_manager')
    )
  );

-- =============================================
-- 11. PERFORMANCE OBJECTIVES
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Managers and career managers can manage objectives" ON performance_objectives;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Managers and career managers can manage objectives"
  ON performance_objectives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager', 'career_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager', 'career_manager')
    )
  );

-- =============================================
-- 12. QVCT - EVENT PARTICIPANTS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Employees can register for events" ON qvct_event_participants;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Employees can register for events"
  ON qvct_event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "QVCT managers can manage all participants" ON qvct_event_participants;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "QVCT managers can manage all participants"
  ON qvct_event_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'qvct_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'qvct_manager')
    )
  );

-- =============================================
-- 13. QVCT - EMPLOYEE BENEFITS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "QVCT managers can manage employee benefits" ON qvct_employee_benefits;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "QVCT managers can manage employee benefits"
  ON qvct_employee_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'qvct_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'qvct_manager')
    )
  );

-- =============================================
-- 14. QVCT - SUGGESTIONS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Employees can create suggestions" ON qvct_suggestions;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Employees can create suggestions"
  ON qvct_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "QVCT managers can manage all suggestions" ON qvct_suggestions;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "QVCT managers can manage all suggestions"
  ON qvct_suggestions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'qvct_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'qvct_manager')
    )
  );

-- =============================================
-- 15. QVCT - SURVEY RESPONSES
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Employees can create survey responses" ON qvct_survey_responses;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Employees can create survey responses"
  ON qvct_survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 16. QVCT - HEALTH INCIDENTS
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Employees can report health incidents" ON qvct_health_incidents;
EXCEPTION WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Employees can report health incidents"
  ON qvct_health_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    reported_by IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );
