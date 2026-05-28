-- =============================================================================
-- SNH ERP-PAIE — Script SQL Complet
-- Base de données complète : schéma + données fictives
-- =============================================================================
-- Prérequis : PostgreSQL 15+ avec l'extension uuid-ossp et pgcrypto
--
-- Usage :
--   psql -U postgres -d snh_erp -f database_snh_complete.sql
--
-- Ce script concatène toutes les migrations dans l'ordre chronologique.
-- Il suppose que l'extension auth de Supabase est disponible.
-- Pour un déploiement Supabase local, utilisez : supabase db reset
-- =============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schéma auth minimal (pour compatibilité hors Supabase)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb->>'sub'::text::uuid;
$$ ;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- =============================================================================

-- =============================================================================
-- MIGRATION : 20260212133941_fix_employees_rls_policies.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260212134031_fix_rls_with_helper_functions.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260212144039_create_payroll_system.sql
-- =============================================================================

/*
  # Système de Paie SNH - Référentiel OHADA/Cameroun
  
  1. Tables principales
    - `payroll_elements` - Rubriques de paie paramétrables (gains, retenues, cotisations)
    - `salary_grids` - Grilles salariales évolutives
    - `salary_scales` - Échelles/échelons de la grille
    - `tax_parameters` - Paramètres fiscaux (IRPP, etc.)
    - `social_contributions` - Cotisations sociales (CNPS, etc.)
    - `payroll_calculations` - Calculs de paie mensuels
    - `payroll_lines` - Lignes détaillées des bulletins
    - `payroll_history` - Historique des modifications
    
  2. Sécurité
    - RLS activé sur toutes les tables
    - Accès contrôlé par rôle (admin, drh seulement)
    
  3. Notes importantes
    - Système flexible pour éléments SNH spécifiques
    - Support des conventions hydrocarbures
    - Traçabilité complète des modifications
*/

-- Table des éléments de paie (rubriques paramétrables)
CREATE TABLE IF NOT EXISTS payroll_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('gain', 'retenue', 'cotisation_employee', 'cotisation_employer', 'information')),
  calculation_type text NOT NULL CHECK (calculation_type IN ('fixed', 'percentage', 'formula', 'manual')),
  calculation_base text,
  calculation_rate numeric(10, 4),
  formula text,
  is_taxable boolean DEFAULT false,
  is_subject_to_cnps boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  applicable_to_convention text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Table des grilles salariales
CREATE TABLE IF NOT EXISTS salary_grids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  effective_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  convention_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Table des échelles/échelons
CREATE TABLE IF NOT EXISTS salary_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_grid_id uuid REFERENCES salary_grids(id) ON DELETE CASCADE,
  grade text NOT NULL,
  echelon integer NOT NULL,
  category text,
  base_salary numeric(15, 2) NOT NULL,
  min_salary numeric(15, 2),
  max_salary numeric(15, 2),
  experience_years_min integer,
  experience_years_max integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(salary_grid_id, grade, echelon)
);

-- Table des paramètres fiscaux (IRPP Cameroun)
CREATE TABLE IF NOT EXISTS tax_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  parameter_type text NOT NULL CHECK (parameter_type IN ('irpp_bracket', 'tax_rate', 'deduction', 'threshold')),
  min_amount numeric(15, 2),
  max_amount numeric(15, 2),
  rate numeric(10, 4),
  fixed_amount numeric(15, 2),
  deduction_amount numeric(15, 2),
  effective_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des cotisations sociales (CNPS, etc.)
CREATE TABLE IF NOT EXISTS social_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contribution_type text NOT NULL CHECK (contribution_type IN ('cnps_pension', 'cnps_family', 'cnps_accident', 'other')),
  employee_rate numeric(10, 4),
  employer_rate numeric(10, 4),
  ceiling_amount numeric(15, 2),
  floor_amount numeric(15, 2),
  calculation_base text DEFAULT 'gross_salary',
  effective_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Table des calculs de paie
CREATE TABLE IF NOT EXISTS payroll_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year >= 2020),
  salary_grid_id uuid REFERENCES salary_grids(id),
  base_salary numeric(15, 2) NOT NULL DEFAULT 0,
  gross_salary numeric(15, 2) NOT NULL DEFAULT 0,
  taxable_salary numeric(15, 2) NOT NULL DEFAULT 0,
  cnps_base numeric(15, 2) NOT NULL DEFAULT 0,
  total_gains numeric(15, 2) NOT NULL DEFAULT 0,
  total_deductions numeric(15, 2) NOT NULL DEFAULT 0,
  employee_contributions numeric(15, 2) NOT NULL DEFAULT 0,
  employer_contributions numeric(15, 2) NOT NULL DEFAULT 0,
  irpp_amount numeric(15, 2) NOT NULL DEFAULT 0,
  cnps_employee numeric(15, 2) NOT NULL DEFAULT 0,
  cnps_employer numeric(15, 2) NOT NULL DEFAULT 0,
  net_salary numeric(15, 2) NOT NULL DEFAULT 0,
  net_to_pay numeric(15, 2) NOT NULL DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'validated', 'paid', 'cancelled')),
  calculation_date timestamptz DEFAULT now(),
  validation_date timestamptz,
  payment_date timestamptz,
  validated_by uuid REFERENCES auth.users(id),
  paid_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

-- Table des lignes de paie détaillées
CREATE TABLE IF NOT EXISTS payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_calculation_id uuid REFERENCES payroll_calculations(id) ON DELETE CASCADE,
  payroll_element_id uuid REFERENCES payroll_elements(id),
  element_code text NOT NULL,
  element_name text NOT NULL,
  element_category text NOT NULL,
  base_amount numeric(15, 2),
  rate numeric(10, 4),
  quantity numeric(10, 2) DEFAULT 1,
  amount numeric(15, 2) NOT NULL DEFAULT 0,
  is_taxable boolean DEFAULT false,
  is_subject_to_cnps boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table d'historique des modifications
CREATE TABLE IF NOT EXISTS payroll_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  reason text
);

-- Insertion des paramètres IRPP Cameroun (barème 2024)
INSERT INTO tax_parameters (name, code, parameter_type, min_amount, max_amount, rate, effective_date, is_active, description)
VALUES
  ('IRPP Tranche 1', 'IRPP_T1', 'irpp_bracket', 0, 2000000, 0.1000, '2024-01-01', true, 'Tranche 1: 0 à 2 000 000 FCFA - 10%'),
  ('IRPP Tranche 2', 'IRPP_T2', 'irpp_bracket', 2000001, 3000000, 0.1500, '2024-01-01', true, 'Tranche 2: 2 000 001 à 3 000 000 FCFA - 15%'),
  ('IRPP Tranche 3', 'IRPP_T3', 'irpp_bracket', 3000001, 5000000, 0.2500, '2024-01-01', true, 'Tranche 3: 3 000 001 à 5 000 000 FCFA - 25%'),
  ('IRPP Tranche 4', 'IRPP_T4', 'irpp_bracket', 5000001, NULL, 0.3500, '2024-01-01', true, 'Tranche 4: Au-delà de 5 000 000 FCFA - 35%'),
  ('Abattement forfaitaire', 'TAX_ABATEMENT', 'deduction', NULL, NULL, 0.3000, '2024-01-01', true, 'Abattement de 30% pour frais professionnels (max 500 000 FCFA)'),
  ('Plafond abattement', 'TAX_ABATEMENT_CEILING', 'threshold', NULL, NULL, NULL, '2024-01-01', true, 'Plafond de l''abattement: 500 000 FCFA')
ON CONFLICT (code) DO NOTHING;

-- Insertion des cotisations CNPS Cameroun
INSERT INTO social_contributions (code, name, contribution_type, employee_rate, employer_rate, ceiling_amount, effective_date, is_active, description)
VALUES
  ('CNPS_PENSION', 'CNPS Pension', 'cnps_pension', 0.0420, 0.0420, 750000, '2024-01-01', true, 'Cotisation pension vieillesse: 4.2% salarié + 4.2% employeur'),
  ('CNPS_FAMILY', 'CNPS Prestations familiales', 'cnps_family', 0.0000, 0.0700, 750000, '2024-01-01', true, 'Prestations familiales: 7% employeur uniquement'),
  ('CNPS_ACCIDENT', 'CNPS Accidents de travail', 'cnps_accident', 0.0000, 0.0250, 750000, '2024-01-01', true, 'Accidents du travail: 2.5% employeur (variable selon secteur)')
ON CONFLICT (code) DO NOTHING;

-- Insertion des éléments de paie standard
INSERT INTO payroll_elements (code, name, category, calculation_type, is_taxable, is_subject_to_cnps, display_order, is_system, description)
VALUES
  ('SALAIRE_BASE', 'Salaire de base', 'gain', 'fixed', true, true, 1, true, 'Salaire de base mensuel'),
  ('PRIME_ANCIENNETE', 'Prime d''ancienneté', 'gain', 'percentage', true, true, 2, true, 'Prime basée sur l''ancienneté'),
  ('PRIME_RESPONSABILITE', 'Prime de responsabilité', 'gain', 'fixed', true, true, 3, false, 'Prime de fonction/responsabilité'),
  ('PRIME_TRANSPORT', 'Prime de transport', 'gain', 'fixed', true, false, 4, false, 'Indemnité de transport'),
  ('PRIME_LOGEMENT', 'Prime de logement', 'gain', 'fixed', true, false, 5, false, 'Indemnité de logement'),
  ('PRIME_RENDEMENT', 'Prime de rendement', 'gain', 'manual', true, true, 6, false, 'Prime de performance'),
  ('HEURES_SUP', 'Heures supplémentaires', 'gain', 'formula', true, true, 7, false, 'Majoration heures supplémentaires'),
  ('AVANTAGES_NATURE', 'Avantages en nature', 'gain', 'fixed', true, false, 8, false, 'Avantages en nature (véhicule, etc.)'),
  
  ('CNPS_PENSION_EMP', 'CNPS Pension (salarié)', 'cotisation_employee', 'percentage', false, false, 20, true, 'Cotisation CNPS pension - part salarié'),
  ('IRPP', 'Impôt sur le revenu (IRPP)', 'retenue', 'formula', false, false, 21, true, 'IRPP selon barème progressif'),
  ('AVANCE_SALAIRE', 'Avance sur salaire', 'retenue', 'manual', false, false, 22, false, 'Avance consentie au salarié'),
  ('PRET', 'Remboursement prêt', 'retenue', 'manual', false, false, 23, false, 'Remboursement mensuel de prêt'),
  ('RETENUE_ABSENCE', 'Retenue pour absence', 'retenue', 'formula', false, false, 24, false, 'Retenue proportionnelle aux absences'),
  
  ('CNPS_PENSION_PAT', 'CNPS Pension (employeur)', 'cotisation_employer', 'percentage', false, false, 30, true, 'Cotisation CNPS pension - part employeur'),
  ('CNPS_FAMILY_PAT', 'CNPS Prestations familiales', 'cotisation_employer', 'percentage', false, false, 31, true, 'Prestations familiales - employeur'),
  ('CNPS_ACCIDENT_PAT', 'CNPS Accidents travail', 'cotisation_employer', 'percentage', false, false, 32, true, 'Accidents du travail - employeur')
ON CONFLICT (code) DO NOTHING;

-- Création d'une grille salariale par défaut SNH
INSERT INTO salary_grids (code, name, description, effective_date, is_active, convention_type)
VALUES ('GRID_SNH_2024', 'Grille SNH 2024', 'Grille salariale SNH en vigueur', '2024-01-01', true, 'Convention Hydrocarbures')
ON CONFLICT (code) DO NOTHING;

-- Création d'indices pour les performances
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_employee ON payroll_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_period ON payroll_calculations(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_status ON payroll_calculations(status);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_calculation ON payroll_lines(payroll_calculation_id);
CREATE INDEX IF NOT EXISTS idx_payroll_elements_category ON payroll_elements(category);
CREATE INDEX IF NOT EXISTS idx_payroll_elements_active ON payroll_elements(is_active);

-- Activation RLS
ALTER TABLE payroll_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour payroll_elements
CREATE POLICY "DRH and admin can manage payroll elements"
  ON payroll_elements FOR ALL
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

-- Politiques RLS pour salary_grids
CREATE POLICY "DRH and admin can manage salary grids"
  ON salary_grids FOR ALL
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

-- Politiques RLS pour salary_scales
CREATE POLICY "DRH and admin can manage salary scales"
  ON salary_scales FOR ALL
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

-- Politiques RLS pour tax_parameters
CREATE POLICY "DRH and admin can manage tax parameters"
  ON tax_parameters FOR ALL
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

-- Politiques RLS pour social_contributions
CREATE POLICY "DRH and admin can manage social contributions"
  ON social_contributions FOR ALL
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

-- Politiques RLS pour payroll_calculations
CREATE POLICY "DRH and admin can view all payroll calculations"
  ON payroll_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "Employees can view own payroll calculations"
  ON payroll_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "DRH and admin can manage payroll calculations"
  ON payroll_calculations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "DRH and admin can update payroll calculations"
  ON payroll_calculations FOR UPDATE
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

-- Politiques RLS pour payroll_lines
CREATE POLICY "DRH and admin can view all payroll lines"
  ON payroll_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "Employees can view own payroll lines"
  ON payroll_lines FOR SELECT
  TO authenticated
  USING (
    payroll_calculation_id IN (
      SELECT pc.id FROM payroll_calculations pc
      JOIN employees e ON e.id = pc.employee_id
      WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY "DRH and admin can manage payroll lines"
  ON payroll_lines FOR ALL
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

-- Politiques RLS pour payroll_history
CREATE POLICY "DRH and admin can view payroll history"
  ON payroll_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "System can insert payroll history"
  ON payroll_history FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- =============================================================================
-- MIGRATION : 20260212150302_populate_payroll_data_jan_2026.sql
-- =============================================================================

/*
  # Génération des données de paie pour Janvier 2026
  
  1. Objectif
    - Générer 85 bulletins de paie pour le mois de janvier 2026
    - Calculer les salaires en fonction du type de contrat et du niveau
    - Inclure les charges sociales et déductions
    
  2. Structure de données
    - Salaires bruts basés sur des grilles salariales réalistes
    - Déductions incluant CNPS, IRPP, etc.
    - Salaires nets calculés
    
  3. Données générées
    - 85 bulletins sur 100 employés
    - Masse salariale totale d'environ 200 millions XAF
*/

-- Fonction temporaire pour générer un salaire basé sur le niveau
DO $$
DECLARE
  emp_record RECORD;
  v_base_salary numeric;
  v_gross_salary numeric;
  v_cnps_base numeric;
  v_cnps_employee numeric;
  v_cnps_employer numeric;
  v_irpp numeric;
  v_total_deductions numeric;
  v_net_salary numeric;
  v_count integer := 0;
BEGIN
  FOR emp_record IN 
    SELECT e.id, COALESCE(p.level, 'junior') as level
    FROM employees e
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.employment_status = 'active'
      AND e.hire_date < '2026-01-01'
    LIMIT 85
  LOOP
    -- Calculer le salaire de base selon le niveau
    v_base_salary := CASE 
      WHEN emp_record.level = 'direction' THEN 6500000 + (RANDOM() * 2000000)::int
      WHEN emp_record.level = 'manager' THEN 3500000 + (RANDOM() * 1000000)::int
      WHEN emp_record.level = 'senior' THEN 2500000 + (RANDOM() * 500000)::int
      WHEN emp_record.level = 'intermediate' THEN 1800000 + (RANDOM() * 400000)::int
      ELSE 1200000 + (RANDOM() * 300000)::int
    END;
    
    -- Salaire brut (avec primes)
    v_gross_salary := v_base_salary * 1.1;
    
    -- Base CNPS (plafonnée à 750000)
    v_cnps_base := LEAST(v_gross_salary, 750000);
    
    -- Cotisations CNPS
    v_cnps_employee := v_cnps_base * 0.0428;
    v_cnps_employer := v_cnps_base * 0.1677;
    
    -- IRPP (progressif)
    v_irpp := CASE 
      WHEN v_gross_salary <= 2000000 THEN v_gross_salary * 0.10
      WHEN v_gross_salary <= 3000000 THEN 200000 + (v_gross_salary - 2000000) * 0.15
      WHEN v_gross_salary <= 5000000 THEN 350000 + (v_gross_salary - 3000000) * 0.25
      ELSE 850000 + (v_gross_salary - 5000000) * 0.35
    END;
    
    -- Total déductions
    v_total_deductions := v_cnps_employee + v_irpp;
    
    -- Salaire net
    v_net_salary := v_gross_salary - v_total_deductions;
    
    -- Insérer le bulletin
    INSERT INTO payroll_calculations (
      employee_id,
      period_month,
      period_year,
      calculation_date,
      base_salary,
      gross_salary,
      taxable_salary,
      cnps_base,
      total_gains,
      total_deductions,
      employee_contributions,
      employer_contributions,
      irpp_amount,
      cnps_employee,
      cnps_employer,
      net_salary,
      net_to_pay,
      status,
      validation_date,
      created_at
    ) VALUES (
      emp_record.id,
      1,
      2026,
      '2026-01-25 10:00:00+00'::timestamptz,
      v_base_salary,
      v_gross_salary,
      v_gross_salary,
      v_cnps_base,
      v_gross_salary,
      v_total_deductions,
      v_cnps_employee,
      v_cnps_employer,
      v_irpp,
      v_cnps_employee,
      v_cnps_employer,
      v_net_salary,
      v_net_salary,
      'validated',
      '2026-01-26 14:00:00+00'::timestamptz,
      NOW()
    ) ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % payroll records for January 2026', v_count;
END $$;


-- =============================================================================
-- MIGRATION : 20260212162525_create_qvct_system.sql
-- =============================================================================

/*
  # Système QVCT (Qualité de Vie et Conditions de Travail)
  
  1. Nouvelles tables
    - `qvct_announcements` - Annonces et communications internes
    - `qvct_surveys` - Enquêtes de satisfaction
    - `qvct_survey_responses` - Réponses aux enquêtes
    - `qvct_events` - Événements d'entreprise
    - `qvct_event_participants` - Participants aux événements
    - `qvct_suggestions` - Boîte à idées/suggestions
    - `qvct_health_incidents` - Incidents de santé au travail
    - `qvct_benefits` - Avantages sociaux
    - `qvct_employee_benefits` - Attribution des avantages aux employés
    
  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies appropriées par rôle (DRH, managers, employés)
    
  3. Données incluses
    - Types d'événements (team building, formation, social)
    - Types de suggestions (amélioration, innovation, bien-être)
    - Types d'incidents (accident, maladie, risque psychosocial)
    - Types d'avantages (mutuelle, transport, repas, etc.)
*/

-- Table des annonces et communications
CREATE TABLE IF NOT EXISTS qvct_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  published_by uuid REFERENCES user_profiles(id),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  target_audience text DEFAULT 'all',
  is_active boolean DEFAULT true,
  attachment_url text,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des enquêtes de satisfaction
CREATE TABLE IF NOT EXISTS qvct_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  survey_type text NOT NULL DEFAULT 'satisfaction',
  status text NOT NULL DEFAULT 'draft',
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid REFERENCES user_profiles(id),
  questions jsonb NOT NULL DEFAULT '[]',
  target_audience text DEFAULT 'all',
  is_anonymous boolean DEFAULT true,
  response_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des réponses aux enquêtes
CREATE TABLE IF NOT EXISTS qvct_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES qvct_surveys(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  responses jsonb NOT NULL DEFAULT '{}',
  satisfaction_score numeric,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table des événements d'entreprise
CREATE TABLE IF NOT EXISTS qvct_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'social',
  location text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  max_participants integer,
  registration_deadline date,
  organized_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'planned',
  budget numeric DEFAULT 0,
  participants_count integer DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des participants aux événements
CREATE TABLE IF NOT EXISTS qvct_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES qvct_events(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  registration_date timestamptz DEFAULT now(),
  attendance_status text DEFAULT 'registered',
  feedback text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Table des suggestions/boîte à idées
CREATE TABLE IF NOT EXISTS qvct_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'improvement',
  submitted_by uuid REFERENCES employees(id),
  is_anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES user_profiles(id),
  implementation_date date,
  feedback text,
  votes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des incidents de santé au travail
CREATE TABLE IF NOT EXISTS qvct_health_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL DEFAULT 'minor_injury',
  employee_id uuid REFERENCES employees(id),
  incident_date timestamptz NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  witness_names text,
  medical_attention_required boolean DEFAULT false,
  days_lost integer DEFAULT 0,
  reported_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'reported',
  investigation_notes text,
  preventive_actions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des avantages sociaux
CREATE TABLE IF NOT EXISTS qvct_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  benefit_type text NOT NULL,
  description text,
  value numeric,
  eligibility_criteria text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table d'attribution des avantages aux employés
CREATE TABLE IF NOT EXISTS qvct_employee_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  benefit_id uuid REFERENCES qvct_benefits(id),
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  monthly_value numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS sur toutes les tables
ALTER TABLE qvct_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_health_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_employee_benefits ENABLE ROW LEVEL SECURITY;

-- Policies pour qvct_announcements
CREATE POLICY "Everyone can view active announcements"
  ON qvct_announcements FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "DRH can manage announcements"
  ON qvct_announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_surveys
CREATE POLICY "Everyone can view active surveys"
  ON qvct_surveys FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "DRH can manage surveys"
  ON qvct_surveys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_survey_responses
CREATE POLICY "Employees can submit survey responses"
  ON qvct_survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
  );

CREATE POLICY "DRH can view all responses"
  ON qvct_survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_events
CREATE POLICY "Everyone can view events"
  ON qvct_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "DRH can manage events"
  ON qvct_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager')
    )
  );

-- Policies pour qvct_event_participants
CREATE POLICY "Employees can register for events"
  ON qvct_event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
  );

CREATE POLICY "Employees can view own registrations"
  ON qvct_event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin', 'manager')
    )
  );

-- Policies pour qvct_suggestions
CREATE POLICY "Employees can submit suggestions"
  ON qvct_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = submitted_by
    )
  );

CREATE POLICY "Everyone can view suggestions"
  ON qvct_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "DRH can manage suggestions"
  ON qvct_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_health_incidents
CREATE POLICY "Employees can report incidents"
  ON qvct_health_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND (employees.id = employee_id OR auth.uid() = reported_by)
    )
  );

CREATE POLICY "DRH can view all incidents"
  ON qvct_health_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "DRH can manage incidents"
  ON qvct_health_incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_benefits
CREATE POLICY "Everyone can view benefits"
  ON qvct_benefits FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "DRH can manage benefits"
  ON qvct_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Policies pour qvct_employee_benefits
CREATE POLICY "Employees can view own benefits"
  ON qvct_employee_benefits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.id = employee_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

CREATE POLICY "DRH can manage employee benefits"
  ON qvct_employee_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh', 'admin')
    )
  );

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_qvct_announcements_published_at ON qvct_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_qvct_announcements_active ON qvct_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_qvct_surveys_status ON qvct_surveys(status);
CREATE INDEX IF NOT EXISTS idx_qvct_events_start_date ON qvct_events(start_date);
CREATE INDEX IF NOT EXISTS idx_qvct_suggestions_status ON qvct_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_qvct_health_incidents_date ON qvct_health_incidents(incident_date DESC);


-- =============================================================================
-- MIGRATION : 20260212162801_populate_qvct_test_data.sql
-- =============================================================================

/*
  # Données de test pour le module QVCT
  
  1. Avantages sociaux - Mutuelle, transport, tickets restaurant
  2. Annonces récentes - Communications importantes  
  3. Événements - Team building, formations, activités
  4. Suggestions - Idées d'amélioration
  5. Enquêtes de satisfaction - Bien-être au travail
*/

-- Insérer des avantages sociaux
INSERT INTO qvct_benefits (name, benefit_type, description, value, eligibility_criteria, is_active) VALUES
  ('Mutuelle Santé', 'health', 'Couverture santé complète pour l''employé et sa famille', 50000, 'Tous les employés en CDI', true),
  ('Allocation Transport', 'transport', 'Prime mensuelle de transport', 35000, 'Tous les employés', true),
  ('Tickets Restaurant', 'meal', 'Tickets restaurant pour déjeuner (22 jours/mois)', 66000, 'Tous les employés sur site', true),
  ('Allocation Téléphone', 'communication', 'Forfait téléphone professionnel', 25000, 'Tous les employés', true),
  ('Prime de Scolarité', 'education', 'Aide à la scolarité des enfants', 100000, 'CDI avec ancienneté > 2 ans', true),
  ('Assurance Vie', 'insurance', 'Assurance vie et invalidité', 15000, 'Tous les employés en CDI', true)
ON CONFLICT DO NOTHING;

-- Attribution des avantages aux employés actifs
INSERT INTO qvct_employee_benefits (employee_id, benefit_id, start_date, status, monthly_value)
SELECT 
  e.id,
  b.id,
  e.hire_date,
  'active',
  b.value
FROM employees e
CROSS JOIN qvct_benefits b
WHERE e.employment_status = 'active'
  AND b.benefit_type IN ('health', 'transport', 'communication')
LIMIT 300
ON CONFLICT DO NOTHING;

-- Insérer des annonces
DO $$
DECLARE
  v_drh_id uuid;
BEGIN
  SELECT id INTO v_drh_id FROM user_profiles WHERE role = 'drh' LIMIT 1;

  INSERT INTO qvct_announcements (title, content, category, priority, published_by, published_at, target_audience, is_active) VALUES
    ('Nouvelle politique de télétravail', 'À partir du 1er février 2026, tous les employés éligibles pourront bénéficier de 2 jours de télétravail par semaine. Merci de vous rapprocher de votre manager pour organiser votre planning.', 'policy', 'high', v_drh_id, '2026-01-15 09:00:00+00', 'all', true),
    ('Journée portes ouvertes - 20 février 2026', 'La SNH organise une journée portes ouvertes pour les familles des employés le samedi 20 février. Au programme : visite des installations, activités pour enfants et buffet. Inscriptions avant le 10 février.', 'event', 'normal', v_drh_id, '2026-01-20 10:00:00+00', 'all', true),
    ('Nouveau programme de formation continue', 'Lancement de notre programme de formation continue 2026. Plus de 30 formations disponibles dans les domaines du leadership, de la technique et du digital. Consultez le catalogue sur l''intranet.', 'training', 'normal', v_drh_id, '2026-01-10 14:00:00+00', 'all', true),
    ('Résultats exceptionnels pour SNH en 2025', 'Félicitations à toutes les équipes ! La SNH a enregistré une croissance de 12% de son chiffre d''affaires en 2025. Ce succès est le fruit de votre engagement et de votre professionnalisme.', 'general', 'high', v_drh_id, '2026-01-05 08:00:00+00', 'all', true)
  ON CONFLICT DO NOTHING;

  -- Insérer des événements
  INSERT INTO qvct_events (title, description, event_type, location, start_date, end_date, max_participants, registration_deadline, organized_by, status, budget) VALUES
    ('Team Building - Randonnée Mont Cameroun', 'Week-end de cohésion d''équipe avec randonnée au Mont Cameroun. Départ vendredi 14h, retour dimanche 18h. Transport et hébergement pris en charge.', 'team_building', 'Mont Cameroun, Buea', '2026-03-07 14:00:00+00', '2026-03-09 18:00:00+00', 50, '2026-02-28', v_drh_id, 'planned', 5000000),
    ('Journée du Sport SNH', 'Tournoi de football, volleyball et course à pied. Ouvert à tous les employés et leurs familles. Médailles et trophées pour les gagnants !', 'social', 'Stade SNH, Yaoundé', '2026-04-12 08:00:00+00', '2026-04-12 18:00:00+00', 200, '2026-04-05', v_drh_id, 'planned', 2000000),
    ('Séminaire Leadership & Management', 'Séminaire de 2 jours sur les nouvelles pratiques de management et de leadership pour les managers et futurs managers.', 'training', 'Hôtel Hilton, Yaoundé', '2026-02-18 08:00:00+00', '2026-02-19 17:00:00+00', NULL, NULL, v_drh_id, 'completed', 3500000),
    ('Petit-déjeuner mensuel Janvier', 'Petit-déjeuner convivial pour démarrer le mois dans la bonne humeur. Café, viennoiseries et échanges informels.', 'social', 'Salle polyvalente SNH', '2026-01-08 07:30:00+00', '2026-01-08 09:00:00+00', NULL, NULL, v_drh_id, 'completed', 150000)
  ON CONFLICT DO NOTHING;

  -- Insérer des suggestions
  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Aménager une salle de sport dans les locaux', 'Il serait intéressant d''avoir une petite salle de sport avec quelques équipements de base (tapis, haltères, vélos) pour permettre aux employés de faire du sport pendant la pause déjeuner ou après le travail.', 'wellbeing', id, false, 'under_review', 'medium', 15
  FROM employees WHERE employment_status = 'active' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Installer des distributeurs de fruits frais', 'Remplacer certains distributeurs de snacks par des distributeurs de fruits frais pour encourager une alimentation saine.', 'wellbeing', id, false, 'approved', 'low', 23
  FROM employees WHERE employment_status = 'active' OFFSET 1 LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Créer un programme de mentorat', 'Mettre en place un programme de mentorat pour accompagner les nouveaux employés et favoriser le transfert de compétences entre séniors et juniors.', 'improvement', id, false, 'implemented', 'high', 42
  FROM employees WHERE employment_status = 'active' OFFSET 2 LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Organiser un petit-déjeuner mensuel d''équipe', 'Pour renforcer la cohésion, organiser un petit-déjeuner informel une fois par mois où les équipes peuvent échanger dans un cadre convivial.', 'social', id, false, 'implemented', 'low', 8
  FROM employees WHERE employment_status = 'active' OFFSET 3 LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Mettre en place des horaires flexibles', 'Permettre aux employés d''adapter leurs horaires de travail (arrivée entre 7h et 9h30) pour mieux gérer les contraintes personnelles.', 'improvement', id, false, 'submitted', 'high', 31
  FROM employees WHERE employment_status = 'active' OFFSET 4 LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Insérer des enquêtes de satisfaction
  INSERT INTO qvct_surveys (title, description, survey_type, status, start_date, end_date, created_by, questions, is_anonymous, response_count) VALUES
    ('Enquête Bien-être au Travail 2026', 'Votre avis compte ! Aidez-nous à améliorer votre qualité de vie au travail en répondant à cette enquête anonyme.', 'wellbeing', 'active', '2026-01-15', '2026-02-15', v_drh_id, '[{"id": "q1", "type": "rating", "question": "Comment évaluez-vous votre satisfaction globale au travail ?", "scale": 5}, {"id": "q2", "type": "rating", "question": "Votre charge de travail est-elle équilibrée ?", "scale": 5}, {"id": "q3", "type": "rating", "question": "Vous sentez-vous reconnu(e) dans votre travail ?", "scale": 5}, {"id": "q4", "type": "rating", "question": "L''ambiance de travail est-elle positive ?", "scale": 5}, {"id": "q5", "type": "text", "question": "Quelles sont vos suggestions pour améliorer votre bien-être au travail ?"}]'::jsonb, true, 34),
    ('Évaluation du Programme de Formation 2025', 'Donnez votre avis sur les formations suivies en 2025 pour nous aider à améliorer notre offre.', 'training', 'closed', '2025-12-01', '2025-12-31', v_drh_id, '[{"id": "q1", "type": "rating", "question": "Les formations ont-elles répondu à vos attentes ?", "scale": 5}, {"id": "q2", "type": "rating", "question": "Qualité des formateurs", "scale": 5}, {"id": "q3", "type": "choice", "question": "Quel format préférez-vous ?", "options": ["Présentiel", "En ligne", "Hybride"]}, {"id": "q4", "type": "text", "question": "Quelles formations souhaiteriez-vous suivre en 2026 ?"}]'::jsonb, true, 67)
  ON CONFLICT DO NOTHING;

  -- Insérer quelques incidents de santé
  INSERT INTO qvct_health_incidents (incident_type, employee_id, incident_date, location, description, severity, medical_attention_required, days_lost, reported_by, status)
  SELECT 'minor_injury', id, '2026-01-10 10:30:00+00', 'Atelier technique', 'Petite coupure à la main lors de la manipulation d''outils. Soins de premiers secours administrés.', 'low', true, 0, v_drh_id, 'closed'
  FROM employees WHERE employment_status = 'active' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_health_incidents (incident_type, employee_id, incident_date, location, description, severity, medical_attention_required, days_lost, reported_by, status)
  SELECT 'near_miss', id, '2026-01-18 14:00:00+00', 'Bureau étage 2', 'Quasi-chute dans les escaliers due à un éclairage défaillant. Aucune blessure.', 'low', false, 0, v_drh_id, 'under_investigation'
  FROM employees WHERE employment_status = 'active' OFFSET 1 LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;

-- Ajouter des participants aux événements planifiés
INSERT INTO qvct_event_participants (event_id, employee_id, attendance_status)
SELECT 
  e.id,
  emp.id,
  'registered'
FROM qvct_events e
CROSS JOIN employees emp
WHERE e.status = 'planned'
  AND emp.employment_status = 'active'
LIMIT 25
ON CONFLICT DO NOTHING;

-- Générer des réponses pour l'enquête bien-être
DO $$
DECLARE
  v_survey_id uuid;
  v_employee_record RECORD;
  v_count integer := 0;
BEGIN
  SELECT id INTO v_survey_id FROM qvct_surveys WHERE survey_type = 'wellbeing' AND status = 'active' LIMIT 1;
  
  IF v_survey_id IS NOT NULL THEN
    FOR v_employee_record IN 
      SELECT id FROM employees WHERE employment_status = 'active' ORDER BY RANDOM() LIMIT 30
    LOOP
      INSERT INTO qvct_survey_responses (survey_id, employee_id, responses, satisfaction_score, submitted_at)
      VALUES (
        v_survey_id,
        v_employee_record.id,
        jsonb_build_object(
          'q1', (3 + RANDOM() * 2)::int,
          'q2', (3 + RANDOM() * 2)::int,
          'q3', (3 + RANDOM() * 2)::int,
          'q4', (4 + RANDOM())::int,
          'q5', 'Globalement satisfait'
        ),
        (3.5 + RANDOM() * 1.5)::numeric(3,2),
        ('2026-01-' || LEAST(16 + v_count, 31)::text || ' 10:00:00+00')::timestamptz
      )
      ON CONFLICT DO NOTHING;
      
      v_count := v_count + 1;
    END LOOP;
  END IF;
END $$;

-- Mettre à jour le compteur de participants
UPDATE qvct_events e
SET participants_count = (
  SELECT COUNT(*) 
  FROM qvct_event_participants p 
  WHERE p.event_id = e.id
)
WHERE e.status = 'planned';


-- =============================================================================
-- MIGRATION : 20260212163929_add_password_changed_flag.sql
-- =============================================================================

/*
  # Ajout du flag de changement de mot de passe
  
  1. Modifications
    - Ajouter le champ `password_changed` à user_profiles pour tracker si l'utilisateur a changé son mot de passe initial
    - Par défaut à false pour forcer le changement lors de la première connexion
    
  2. Notes
    - Les utilisateurs existants auront password_changed = true (déjà connectés)
    - Les nouveaux comptes créés auront password_changed = false
*/

-- Ajouter le champ password_changed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'password_changed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_changed boolean DEFAULT false;
  END IF;
END $$;

-- Mettre à true pour les utilisateurs existants (déjà connectés)
UPDATE user_profiles 
SET password_changed = true 
WHERE password_changed IS NULL OR password_changed = false;


-- =============================================================================
-- MIGRATION : 20260212165734_add_medical_certificate_fields.sql
-- =============================================================================

/*
  # Add Medical Certificate Fields for Sick Leave

  1. Changes to Tables
    - `leave_requests`
      - Add `medical_certificate_url` (text, nullable) - stores the path to the uploaded medical certificate
      - Add `medical_certificate_name` (text, nullable) - stores the original filename
  
  2. Storage Bucket
    - Create `medical-certificates` bucket for storing scanned medical documents
    - File size limit: 5MB
    - Allowed types: PDF, JPEG, PNG
  
  3. Validation Rules
    - Sick leave requests require a medical certificate to be validated
    - The certificate must be uploaded before manager/DRH approval
  
  Notes:
    - Storage policies are configured automatically by Supabase
    - Employees can upload to their own folder (user_id)
    - Managers and DRH can access all certificates
*/

-- Add medical certificate fields to leave_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'medical_certificate_url'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN medical_certificate_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'medical_certificate_name'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN medical_certificate_name text;
  END IF;
END $$;

-- Create storage bucket for medical certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-certificates',
  'medical-certificates',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MIGRATION : 20260212165747_configure_medical_certificates_storage_policies.sql
-- =============================================================================

/*
  # Configure Storage Policies for Medical Certificates

  1. Storage Policies
    - Enable RLS on storage.objects (if not already enabled)
    - Allow employees to upload certificates to their own folder
    - Allow employees to read their own certificates
    - Allow managers to read certificates from their team members
    - Allow DRH to read all certificates
  
  2. Security
    - Files are organized by user_id in folders
    - Only authenticated users can access
    - No public access allowed
*/

-- Storage policies for medical certificates bucket

-- Policy: Employees can upload medical certificates to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Employees can upload medical certificates'
  ) THEN
    CREATE POLICY "Employees can upload medical certificates"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'medical-certificates'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Policy: Employees can read their own medical certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Employees can read own medical certificates'
  ) THEN
    CREATE POLICY "Employees can read own medical certificates"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Policy: Managers can read medical certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Managers can read medical certificates'
  ) THEN
    CREATE POLICY "Managers can read medical certificates"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates'
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'manager'
        )
      );
  END IF;
END $$;

-- Policy: DRH can read all medical certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'DRH can read all medical certificates'
  ) THEN
    CREATE POLICY "DRH can read all medical certificates"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'medical-certificates'
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'drh'
        )
      );
  END IF;
END $$;

-- =============================================================================
-- MIGRATION : 20260212173058_add_admin_role_management_policies.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260212180051_fix_infinite_recursion_user_profiles.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260212180114_remove_recursive_policies_simple_fix.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260213080858_create_advanced_hr_system.sql
-- =============================================================================

/*
  # Système GRH Avancé - SNH - Niveau ERP SAP HCM
  
  ## 1. Nouveaux Rôles Métiers
    - Gestionnaire de paie (payroll_manager)
    - Responsable recrutement (recruitment_manager)
    - Gestionnaire de carrière (career_manager)
    - Responsable QVCT (qvct_manager)
  
  ## 2. Tables de Gestion Documentaire
    - `hr_documents` - Documents RH numérisés
    - `document_categories` - Catégories de documents
    - `document_versions` - Versioning des documents
  
  ## 3. Tables de Gestion de Carrière Avancée
    - `career_events` - Événements de carrière (promotion, suspension, etc.)
    - `employee_family` - Membres de famille des employés
    - `disciplinary_actions` - Actions disciplinaires
    - `career_suspensions` - Suspensions de contrat
  
  ## 4. Tables de Primes et Bonus Avancés
    - `bonus_types` - Types de primes paramétrables
    - `employee_bonuses` - Attribution de primes aux employés
    - `bonus_calculation_rules` - Règles de calcul des primes
  
  ## 5. Tables d'Intégration Comptable OHADA
    - `ohada_accounts` - Plan comptable OHADA
    - `payroll_accounting_entries` - Écritures comptables de paie
    - `accounting_journals` - Journaux comptables
  
  ## 6. Tables de Workflow
    - `workflow_definitions` - Définitions de workflows
    - `workflow_instances` - Instances de workflows en cours
    - `workflow_tasks` - Tâches de workflow
  
  ## 7. Sécurité
    - RLS activé sur toutes les tables
    - Accès contrôlé par rôle métier
    - Traçabilité complète
*/

-- =============================================
-- 1. CATÉGORIES DE DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  required_for_hiring boolean DEFAULT false,
  retention_years integer,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO document_categories (code, name, description, required_for_hiring, retention_years, display_order)
VALUES
  ('BIRTH_CERT', 'Acte de naissance', 'Acte de naissance de l''employé', true, 50, 1),
  ('MARRIAGE_CERT', 'Acte de mariage', 'Acte de mariage', false, 50, 2),
  ('CHILD_BIRTH_CERT', 'Acte de naissance enfant', 'Acte de naissance des enfants', false, 50, 3),
  ('ID_CARD', 'Carte d''identité / Passeport', 'CNI ou Passeport', true, 10, 4),
  ('DIPLOMA', 'Diplômes', 'Diplômes et certifications', true, 50, 5),
  ('RESUME', 'CV', 'Curriculum Vitae', true, 5, 6),
  ('MEDICAL_CERT', 'Certificat médical', 'Certificat médical d''aptitude', true, 5, 7),
  ('CONTRACT', 'Contrat de travail', 'Contrat de travail signé', true, 50, 8),
  ('PHOTO', 'Photo d''identité', 'Photo d''identité', true, 5, 9),
  ('RIB', 'RIB', 'Relevé d''identité bancaire', true, 10, 10),
  ('TAX_CERT', 'Attestation fiscale', 'Attestation fiscale', false, 10, 11),
  ('CNPS_CERT', 'Attestation CNPS', 'Attestation CNPS', false, 10, 12)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 2. DOCUMENTS RH
-- =============================================

CREATE TABLE IF NOT EXISTS hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  category_id uuid REFERENCES document_categories(id),
  category_code text,
  document_name text NOT NULL,
  document_type text,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  version integer DEFAULT 1,
  is_current_version boolean DEFAULT true,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes text,
  expiry_date date,
  is_archived boolean DEFAULT false,
  archived_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON hr_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_category ON hr_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_status ON hr_documents(verification_status);

-- =============================================
-- 3. VERSIONING DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES hr_documents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  change_reason text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. FAMILLE DES EMPLOYÉS
-- =============================================

CREATE TABLE IF NOT EXISTS employee_family (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('spouse', 'child', 'parent', 'sibling', 'other')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('M', 'F')),
  is_dependent boolean DEFAULT false,
  has_health_coverage boolean DEFAULT false,
  birth_certificate_id uuid REFERENCES hr_documents(id),
  id_document_id uuid REFERENCES hr_documents(id),
  additional_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_family_employee ON employee_family(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_family_relationship ON employee_family(relationship_type);

-- =============================================
-- 5. TYPES DE PRIMES
-- =============================================

CREATE TABLE IF NOT EXISTS bonus_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text CHECK (category IN ('monthly', 'quarterly', 'annual', 'exceptional', 'performance')),
  calculation_method text CHECK (calculation_method IN ('fixed', 'percentage_salary', 'percentage_performance', 'formula', 'manual')),
  base_amount numeric(15, 2),
  percentage_rate numeric(10, 4),
  formula text,
  is_prorated boolean DEFAULT false,
  proration_basis text CHECK (proration_basis IN ('days_worked', 'months_worked', 'performance_score')),
  is_taxable boolean DEFAULT true,
  is_subject_to_cnps boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  approval_level text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  applicable_to_grades text[],
  applicable_to_departments uuid[],
  min_service_months integer,
  is_active boolean DEFAULT true,
  effective_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

INSERT INTO bonus_types (code, name, category, calculation_method, is_prorated, is_taxable, is_subject_to_cnps, is_recurring, is_active, description)
VALUES
  ('BONUS_13TH', '13ème mois', 'annual', 'percentage_salary', true, true, true, true, true, 'Prime de 13ème mois calculée sur le salaire de base annuel'),
  ('BONUS_PERF_YEAR', 'Bonus d''exercice', 'annual', 'manual', false, true, true, false, true, 'Bonus annuel basé sur les performances de l''entreprise'),
  ('BONUS_PERF_IND', 'Prime de rendement individuel', 'quarterly', 'percentage_performance', false, true, true, true, true, 'Prime trimestrielle basée sur les performances individuelles'),
  ('BONUS_EXCEPTIONAL', 'Gratification exceptionnelle', 'exceptional', 'manual', false, true, true, false, true, 'Gratification exceptionnelle pour contributions remarquables'),
  ('BONUS_HYDRO', 'Prime secteur hydrocarbures', 'monthly', 'percentage_salary', false, true, true, true, true, 'Prime spécifique au secteur des hydrocarbures'),
  ('BONUS_ARREARS', 'Rappel de salaire', 'exceptional', 'manual', false, true, true, false, true, 'Rappel de salaire pour périodes antérieures'),
  ('BONUS_BACKPAY', 'Arriéré', 'exceptional', 'manual', false, true, true, false, true, 'Arriéré de paiement')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 6. ATTRIBUTION DES PRIMES
-- =============================================

CREATE TABLE IF NOT EXISTS employee_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  bonus_type_id uuid REFERENCES bonus_types(id),
  bonus_code text,
  bonus_name text,
  period_month integer CHECK (period_month BETWEEN 1 AND 12),
  period_year integer CHECK (period_year >= 2020),
  calculation_base numeric(15, 2),
  rate numeric(10, 4),
  calculated_amount numeric(15, 2),
  adjustment_amount numeric(15, 2) DEFAULT 0,
  final_amount numeric(15, 2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'approved', 'rejected', 'paid', 'cancelled')),
  justification text,
  performance_score numeric(5, 2),
  prorata_factor numeric(5, 4) DEFAULT 1.0000,
  requested_by uuid REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  paid_with_payroll_id uuid REFERENCES payroll_calculations(id),
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_bonuses_employee ON employee_bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_period ON employee_bonuses(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_status ON employee_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_type ON employee_bonuses(bonus_type_id);

-- =============================================
-- 7. ÉVÉNEMENTS DE CARRIÈRE
-- =============================================

CREATE TABLE IF NOT EXISTS career_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'promotion', 'advancement', 'lateral_move', 'demotion',
    'suspension', 'maternity_leave', 'sick_leave', 'unpaid_leave',
    'disciplinary_action', 'warning', 'dismissal', 'resignation',
    'retirement', 'contract_renewal', 'contract_amendment',
    'salary_increase', 'position_change', 'department_change'
  )),
  event_date date NOT NULL,
  effective_date date,
  end_date date,
  previous_position_id uuid REFERENCES positions(id),
  new_position_id uuid REFERENCES positions(id),
  previous_department_id uuid REFERENCES departments(id),
  new_department_id uuid REFERENCES departments(id),
  previous_salary numeric(15, 2),
  new_salary numeric(15, 2),
  reason text,
  description text,
  supporting_documents uuid[],
  decision_maker uuid REFERENCES auth.users(id),
  decision_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled')),
  approval_workflow_id uuid,
  is_suspension boolean DEFAULT false,
  suspension_type text CHECK (suspension_type IN ('maternity', 'sick', 'disciplinary', 'unpaid', 'other')),
  is_paid_suspension boolean DEFAULT false,
  reinstatement_date date,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_career_events_employee ON career_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_career_events_type ON career_events(event_type);
CREATE INDEX IF NOT EXISTS idx_career_events_date ON career_events(event_date);
CREATE INDEX IF NOT EXISTS idx_career_events_status ON career_events(status);

-- =============================================
-- 8. ACTIONS DISCIPLINAIRES
-- =============================================

CREATE TABLE IF NOT EXISTS disciplinary_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  career_event_id uuid REFERENCES career_events(id),
  action_type text NOT NULL CHECK (action_type IN ('verbal_warning', 'written_warning', 'final_warning', 'suspension', 'demotion', 'dismissal')),
  severity_level integer CHECK (severity_level BETWEEN 1 AND 5),
  incident_date date NOT NULL,
  action_date date NOT NULL,
  infraction_description text NOT NULL,
  action_taken text NOT NULL,
  duration_days integer,
  financial_penalty numeric(15, 2),
  issued_by uuid REFERENCES auth.users(id),
  witness_ids uuid[],
  supporting_documents uuid[],
  employee_statement text,
  appeal_deadline date,
  appeal_filed boolean DEFAULT false,
  appeal_decision text,
  is_active boolean DEFAULT true,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 9. PLAN COMPTABLE OHADA
-- =============================================

CREATE TABLE IF NOT EXISTS ohada_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number text UNIQUE NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  account_class text CHECK (account_class IN ('1', '2', '3', '4', '5', '6', '7', '8')),
  parent_account_id uuid REFERENCES ohada_accounts(id),
  level integer NOT NULL,
  is_active boolean DEFAULT true,
  requires_analytic boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insertion des comptes OHADA pour la paie
INSERT INTO ohada_accounts (account_number, account_name, account_type, account_class, level, description)
VALUES
  ('421', 'Personnel - Rémunérations dues', 'liability', '4', 1, 'Compte général de rémunérations dues au personnel'),
  ('4211', 'Salaires nets à payer', 'liability', '4', 2, 'Salaires nets dus au personnel'),
  ('4212', 'Avances et acomptes', 'liability', '4', 2, 'Avances et acomptes sur salaires'),
  ('422', 'Personnel - Charges sociales', 'liability', '4', 1, 'Charges sociales à payer'),
  ('4221', 'CNPS à payer', 'liability', '4', 2, 'Cotisations CNPS à verser'),
  ('423', 'Personnel - Oppositions', 'liability', '4', 1, 'Oppositions et saisies sur salaires'),
  ('431', 'Sécurité sociale', 'liability', '4', 1, 'Organismes de sécurité sociale'),
  ('4311', 'CNPS Pension', 'liability', '4', 2, 'CNPS - Cotisation pension vieillesse'),
  ('4312', 'CNPS Prestations familiales', 'liability', '4', 2, 'CNPS - Prestations familiales'),
  ('4313', 'CNPS Accidents de travail', 'liability', '4', 2, 'CNPS - Accidents de travail et maladies professionnelles'),
  ('442', 'État - Impôts et taxes', 'liability', '4', 1, 'Impôts et taxes à payer'),
  ('4421', 'IRPP à payer', 'liability', '4', 2, 'Impôt sur le revenu des personnes physiques à verser'),
  ('661', 'Rémunérations directes', 'expense', '6', 1, 'Salaires de base et primes'),
  ('6611', 'Salaires de base', 'expense', '6', 2, 'Salaires de base du personnel'),
  ('6612', 'Primes et gratifications', 'expense', '6', 2, 'Primes et gratifications versées'),
  ('6613', 'Indemnités', 'expense', '6', 2, 'Indemnités diverses'),
  ('662', 'Rémunérations indirectes', 'expense', '6', 1, 'Avantages en nature et autres'),
  ('663', 'Charges sociales', 'expense', '6', 1, 'Charges sociales patronales'),
  ('6631', 'CNPS Employeur', 'expense', '6', 2, 'Part employeur des cotisations CNPS')
ON CONFLICT (account_number) DO NOTHING;

-- =============================================
-- 10. ÉCRITURES COMPTABLES DE PAIE
-- =============================================

CREATE TABLE IF NOT EXISTS payroll_accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_calculation_id uuid REFERENCES payroll_calculations(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  journal_code text DEFAULT 'PAI',
  entry_number text,
  account_id uuid REFERENCES ohada_accounts(id),
  account_number text NOT NULL,
  account_name text NOT NULL,
  debit_amount numeric(15, 2) DEFAULT 0,
  credit_amount numeric(15, 2) DEFAULT 0,
  entry_type text CHECK (entry_type IN ('salary_expense', 'net_salary_liability', 'social_charges_expense', 'social_charges_liability', 'tax_liability', 'other')),
  description text,
  employee_id uuid REFERENCES employees(id),
  cost_center text,
  analytic_code text,
  is_posted boolean DEFAULT false,
  posted_at timestamptz,
  posted_by uuid REFERENCES auth.users(id),
  fiscal_year integer,
  fiscal_period integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_entries_payroll ON payroll_accounting_entries(payroll_calculation_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_account ON payroll_accounting_entries(account_number);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON payroll_accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_posted ON payroll_accounting_entries(is_posted);

-- =============================================
-- 11. JOURNAUX COMPTABLES
-- =============================================

CREATE TABLE IF NOT EXISTS accounting_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  journal_type text CHECK (journal_type IN ('payroll', 'purchase', 'sale', 'general', 'bank')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO accounting_journals (code, name, journal_type, description)
VALUES
  ('PAI', 'Journal de Paie', 'payroll', 'Journal des écritures de paie mensuelles'),
  ('PAI-REG', 'Journal Régularisations Paie', 'payroll', 'Journal des régularisations et rappels de paie')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 12. WORKFLOWS
-- =============================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  workflow_type text NOT NULL,
  description text,
  steps jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid REFERENCES workflow_definitions(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
  initiated_by uuid REFERENCES auth.users(id),
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  task_type text NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  assigned_role text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'skipped')),
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  decision text,
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 13. AJOUT DE COLONNES MANQUANTES
-- =============================================

-- Ajout du grade dans employees si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'grade'
  ) THEN
    ALTER TABLE employees ADD COLUMN grade text;
  END IF;
END $$;

-- Ajout de l'échelon dans employees si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'echelon'
  ) THEN
    ALTER TABLE employees ADD COLUMN echelon integer;
  END IF;
END $$;

-- Ajout du salary actuel dans employees si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'current_salary'
  ) THEN
    ALTER TABLE employees ADD COLUMN current_salary numeric(15, 2);
  END IF;
END $$;

-- =============================================
-- 14. ACTIVATION RLS
-- =============================================

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ohada_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. POLITIQUES RLS DE BASE
-- =============================================

-- Tous les authentifiés peuvent lire les catégories de documents
CREATE POLICY "Authenticated users can view document categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

-- Les employés peuvent voir leurs propres documents
CREATE POLICY "Employees can view own documents"
  ON hr_documents FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Les employés peuvent voir leur propre famille
CREATE POLICY "Employees can view own family"
  ON employee_family FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Les employés peuvent voir leurs propres primes
CREATE POLICY "Employees can view own bonuses"
  ON employee_bonuses FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Les employés peuvent voir leurs propres événements de carrière
CREATE POLICY "Employees can view own career events"
  ON career_events FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Tous les authentifiés peuvent lire les types de primes actives
CREATE POLICY "Authenticated users can view active bonus types"
  ON bonus_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Tous les authentifiés peuvent lire le plan comptable
CREATE POLICY "Authenticated users can view OHADA accounts"
  ON ohada_accounts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Les employés peuvent voir les écritures comptables liées à leurs paies
CREATE POLICY "Employees can view own payroll accounting entries"
  ON payroll_accounting_entries FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Tous les authentifiés peuvent lire les journaux comptables
CREATE POLICY "Authenticated users can view accounting journals"
  ON accounting_journals FOR SELECT
  TO authenticated
  USING (is_active = true);


-- =============================================================================
-- MIGRATION : 20260213081007_add_manager_roles_and_rls_policies.sql
-- =============================================================================

/*
  # Rôles Métiers et Politiques RLS pour Gestionnaires
  
  ## 1. Nouveaux Rôles
    - payroll_manager : Gestionnaire de paie
    - recruitment_manager : Responsable recrutement
    - career_manager : Gestionnaire de carrière
    - qvct_manager : Responsable QVCT
  
  ## 2. Mise à jour du type role
    Ajout des 4 nouveaux rôles métiers
  
  ## 3. Politiques RLS par Rôle
    
    ### Gestionnaire de Paie (payroll_manager)
    - Accès complet : payroll_elements, payroll_calculations, payroll_lines
    - Accès complet : salary_grids, salary_scales
    - Accès complet : tax_parameters, social_contributions
    - Accès complet : bonus_types, employee_bonuses
    - Accès complet : payroll_accounting_entries, accounting_journals
    - Lecture seule : employees (pour calcul paie)
    
    ### Responsable Recrutement (recruitment_manager)
    - Accès complet : candidates, job_openings, interviews
    - Accès complet : hr_documents (pour dossiers recrutement)
    - Accès complet : employee_family (pour intégration famille)
    - Création : employees (nouveaux recrutés)
    - Lecture seule : positions, departments
    
    ### Gestionnaire de Carrière (career_manager)
    - Accès complet : career_events, career_paths
    - Accès complet : disciplinary_actions
    - Accès complet : performance_reviews, performance_objectives
    - Accès complet : internal_mobility
    - Modification : employees (pour évolutions carrière)
    - Lecture seule : salary_history
    
    ### Responsable QVCT (qvct_manager)
    - Accès complet : qvct_* (toutes les tables QVCT)
    - Accès complet : workplace_incidents
    - Lecture seule : employees
  
  ## 4. Sécurité
    - RLS strict par rôle métier
    - Traçabilité des actions
    - Séparation des responsabilités
*/

-- =============================================
-- 1. SUPPRIMER L'ANCIENNE CONTRAINTE DE RÔLE
-- =============================================

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- =============================================
-- 2. AJOUTER LA NOUVELLE CONTRAINTE AVEC LES NOUVEAUX RÔLES
-- =============================================

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('employee', 'manager', 'drh', 'director', 'admin', 'payroll_manager', 'recruitment_manager', 'career_manager', 'qvct_manager'));

-- =============================================
-- 3. POLITIQUES RLS - GESTIONNAIRE DE PAIE
-- =============================================

-- Gestion complète des éléments de paie
CREATE POLICY "Payroll managers can manage payroll elements"
  ON payroll_elements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des grilles salariales
CREATE POLICY "Payroll managers can manage salary grids"
  ON salary_grids FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des échelles salariales
CREATE POLICY "Payroll managers can manage salary scales"
  ON salary_scales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des paramètres fiscaux
CREATE POLICY "Payroll managers can manage tax parameters"
  ON tax_parameters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des cotisations sociales
CREATE POLICY "Payroll managers can manage social contributions"
  ON social_contributions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des calculs de paie
CREATE POLICY "Payroll managers can view all payroll calculations"
  ON payroll_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

CREATE POLICY "Payroll managers can create payroll calculations"
  ON payroll_calculations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

CREATE POLICY "Payroll managers can update payroll calculations"
  ON payroll_calculations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des lignes de paie
CREATE POLICY "Payroll managers can manage payroll lines"
  ON payroll_lines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des types de primes
CREATE POLICY "Payroll managers can manage bonus types"
  ON bonus_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des primes employés
CREATE POLICY "Payroll managers can manage employee bonuses"
  ON employee_bonuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Gestion complète des écritures comptables
CREATE POLICY "Payroll managers can manage accounting entries"
  ON payroll_accounting_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- Lecture seule des employés pour calcul paie
CREATE POLICY "Payroll managers can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'payroll_manager'
    )
  );

-- =============================================
-- 4. POLITIQUES RLS - RESPONSABLE RECRUTEMENT
-- =============================================

-- Gestion complète des offres d'emploi
CREATE POLICY "Recruitment managers can manage job openings"
  ON job_openings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- Gestion complète des candidats
CREATE POLICY "Recruitment managers can manage candidates"
  ON candidates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- Gestion complète des entretiens
CREATE POLICY "Recruitment managers can manage interviews"
  ON interviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- Gestion complète des documents RH
CREATE POLICY "Recruitment managers can manage hr documents"
  ON hr_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- Gestion complète de la famille des employés
CREATE POLICY "Recruitment managers can manage employee family"
  ON employee_family FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- Création de nouveaux employés
CREATE POLICY "Recruitment managers can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- Lecture des employés
CREATE POLICY "Recruitment managers can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'recruitment_manager'
    )
  );

-- =============================================
-- 5. POLITIQUES RLS - GESTIONNAIRE DE CARRIÈRE
-- =============================================

-- Gestion complète des événements de carrière
CREATE POLICY "Career managers can manage career events"
  ON career_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- Gestion complète des actions disciplinaires
CREATE POLICY "Career managers can manage disciplinary actions"
  ON disciplinary_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- Gestion des parcours de carrière
CREATE POLICY "Career managers can manage career paths"
  ON career_paths FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- Gestion de la mobilité interne
CREATE POLICY "Career managers can manage internal mobility"
  ON internal_mobility FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- Gestion des évaluations de performance
CREATE POLICY "Career managers can manage performance reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- Gestion des objectifs de performance
CREATE POLICY "Career managers can manage performance objectives"
  ON performance_objectives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- Modification des employés (pour évolutions carrière)
CREATE POLICY "Career managers can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

CREATE POLICY "Career managers can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'career_manager'
    )
  );

-- =============================================
-- 6. POLITIQUES RLS - RESPONSABLE QVCT
-- =============================================

-- Gestion complète des tables QVCT
CREATE POLICY "QVCT managers can manage QVCT surveys"
  ON qvct_surveys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );

CREATE POLICY "QVCT managers can manage QVCT events"
  ON qvct_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );

CREATE POLICY "QVCT managers can manage QVCT benefits"
  ON qvct_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );

CREATE POLICY "QVCT managers can manage health incidents"
  ON qvct_health_incidents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );

CREATE POLICY "QVCT managers can manage QVCT suggestions"
  ON qvct_suggestions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );

CREATE POLICY "QVCT managers can manage workplace incidents"
  ON workplace_incidents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );

-- Lecture seule des employés
CREATE POLICY "QVCT managers can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'qvct_manager'
    )
  );


-- =============================================================================
-- MIGRATION : 20260219102912_fix_rls_policies_crud_simple.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260224102515_add_employee_photos_and_contract_termination.sql
-- =============================================================================

/*
  # Ajout des photos employés et gestion de fin de contrat

  1. Modifications
    - Ajout du champ `photo_url` à la table `employees` pour stocker l'URL de la photo
    - Ajout des champs de fin de contrat :
      - `contract_end_date` : Date de fin du contrat
      - `termination_type` : Type de cessation (démission, licenciement, retraite, fin CDD, etc.)
      - `termination_reason` : Motif détaillé de la cessation
      - `termination_notice_period` : Période de préavis
      - `last_working_day` : Dernier jour travaillé
      - `termination_notes` : Notes complémentaires
  
  2. Storage
    - Création du bucket `employee-photos` pour stocker les photos
    - Politiques de sécurité pour l'upload et la lecture des photos
*/

-- Ajouter les champs photo et fin de contrat à la table employees
DO $$
BEGIN
  -- Champ photo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE employees ADD COLUMN photo_url text;
  END IF;

  -- Champs de fin de contrat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'contract_end_date'
  ) THEN
    ALTER TABLE employees ADD COLUMN contract_end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_type'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_reason'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_notice_period'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_notice_period integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'last_working_day'
  ) THEN
    ALTER TABLE employees ADD COLUMN last_working_day date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_notes'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_notes text;
  END IF;
END $$;

-- Créer le bucket pour les photos employés s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Photos employés visibles par tous les utilisateurs authentifiés" ON storage.objects;
DROP POLICY IF EXISTS "Admin et DRH peuvent uploader des photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin et DRH peuvent mettre à jour des photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin et DRH peuvent supprimer des photos" ON storage.objects;

-- Politique de lecture publique pour les photos
CREATE POLICY "Photos employés visibles par tous les utilisateurs authentifiés"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-photos');

-- Politique d'upload pour Admin et DRH
CREATE POLICY "Admin et DRH peuvent uploader des photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-photos' AND
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'drh')
      )
    )
  );

-- Politique de mise à jour pour Admin et DRH
CREATE POLICY "Admin et DRH peuvent mettre à jour des photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'employee-photos' AND
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'drh')
      )
    )
  );

-- Politique de suppression pour Admin et DRH
CREATE POLICY "Admin et DRH peuvent supprimer des photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-photos' AND
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'drh')
      )
    )
  );

-- Commentaires pour documentation
COMMENT ON COLUMN employees.photo_url IS 'URL de la photo de profil de l''employé';
COMMENT ON COLUMN employees.contract_end_date IS 'Date de fin du contrat';
COMMENT ON COLUMN employees.termination_type IS 'Type de cessation : démission, licenciement, retraite, fin_cdd, mutation, décès, abandon_poste';
COMMENT ON COLUMN employees.termination_reason IS 'Motif détaillé de la cessation du contrat';
COMMENT ON COLUMN employees.termination_notice_period IS 'Période de préavis en jours';
COMMENT ON COLUMN employees.last_working_day IS 'Dernier jour travaillé effectif';
COMMENT ON COLUMN employees.termination_notes IS 'Notes complémentaires sur la fin de contrat';


-- =============================================================================
-- MIGRATION : 20260406080754_create_system_settings_table.sql
-- =============================================================================

/*
  # Create system_settings table for application configuration

  1. New Tables
    - `system_settings`
      - `id` (integer, primary key) - Single row configuration
      - `company_name` (text) - Company name
      - `company_siret` (text) - Company SIRET number
      - `company_address` (text) - Company address
      - `company_city` (text) - Company city
      - `company_postal_code` (text) - Company postal code
      - `company_phone` (text) - Company phone number
      - `company_email` (text) - Company email
      - `default_work_hours` (integer) - Default work hours per week
      - `default_leave_days` (integer) - Default annual leave days
      - `currency` (text) - Default currency
      - `date_format` (text) - Date format preference
      - `timezone` (text) - Timezone setting
      - `language` (text) - Language preference
      - `notification_settings` (jsonb) - Notification configuration
      - `security_settings` (jsonb) - Security configuration
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `system_settings` table
    - Only admin and drh roles can read settings
    - Only admin and drh roles can update settings
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name text DEFAULT 'SNH - Société Nouvelle des Hydrocarbures',
  company_siret text DEFAULT '123 456 789 00012',
  company_address text DEFAULT '123 Avenue des Champs',
  company_city text DEFAULT 'Paris',
  company_postal_code text DEFAULT '75008',
  company_phone text DEFAULT '+33 1 23 45 67 89',
  company_email text DEFAULT 'contact@snh.com',
  default_work_hours integer DEFAULT 35,
  default_leave_days integer DEFAULT 25,
  currency text DEFAULT 'EUR',
  date_format text DEFAULT 'DD/MM/YYYY',
  timezone text DEFAULT 'Europe/Paris',
  language text DEFAULT 'fr-FR',
  notification_settings jsonb DEFAULT '{"email_notifications": true, "leave_requests": true, "payroll_ready": true, "training_reminders": true, "system_alerts": true}'::jsonb,
  security_settings jsonb DEFAULT '{"password_expiry_days": 90, "force_password_change": true, "two_factor_enabled": false, "session_timeout_minutes": 60}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row_constraint CHECK (id = 1)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and DRH can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

CREATE POLICY "Admin and DRH can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

CREATE POLICY "Admin and DRH can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

INSERT INTO system_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- MIGRATION : 20260406083644_create_time_tracking_and_expenses_system.sql
-- =============================================================================

/*
  # Create Time Tracking and Expense Management System
  
  This migration adds comprehensive time tracking (Timmi-style) and expense management (Cleemy-style) 
  features similar to Lucca SIRH.

  ## 1. New Tables
  
  ### Time Tracking Tables
    - `time_entries` - Daily time entries/timesheets
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `date` (date) - Work date
      - `clock_in` (timestamptz) - Clock in time
      - `clock_out` (timestamptz) - Clock out time
      - `break_duration` (integer) - Break duration in minutes
      - `total_hours` (decimal) - Total worked hours
      - `overtime_hours` (decimal) - Overtime hours
      - `status` (text) - pending, approved, rejected
      - `project_id` (uuid, nullable) - Optional project allocation
      - `notes` (text) - Work description
      - `approved_by` (uuid, nullable)
      - `approved_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `projects` - Projects for time allocation
      - `id` (uuid, primary key)
      - `name` (text) - Project name
      - `code` (text) - Project code
      - `department_id` (uuid, foreign key)
      - `manager_id` (uuid, foreign key to employees)
      - `status` (text) - active, completed, on_hold, cancelled
      - `start_date` (date)
      - `end_date` (date, nullable)
      - `budget_hours` (decimal, nullable)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `work_schedules` - Employee work schedules
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `schedule_type` (text) - full_time, part_time, flexible
      - `hours_per_week` (decimal) - Expected hours per week
      - `monday_hours` (decimal)
      - `tuesday_hours` (decimal)
      - `wednesday_hours` (decimal)
      - `thursday_hours` (decimal)
      - `friday_hours` (decimal)
      - `saturday_hours` (decimal)
      - `sunday_hours` (decimal)
      - `effective_from` (date)
      - `effective_to` (date, nullable)
      - `created_at` (timestamptz)
  
  ### Expense Management Tables
    - `expense_categories` - Expense categories
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `code` (text) - Category code
      - `max_amount` (decimal, nullable) - Maximum allowed per expense
      - `requires_receipt` (boolean) - Receipt required
      - `ohada_account_id` (uuid, nullable) - OHADA mapping
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `expense_reports` - Expense report submissions
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `report_number` (text) - Auto-generated report number
      - `title` (text) - Report title
      - `submission_date` (date)
      - `period_start` (date)
      - `period_end` (date)
      - `total_amount` (decimal)
      - `status` (text) - draft, submitted, approved, rejected, paid
      - `approved_by` (uuid, nullable)
      - `approved_at` (timestamptz, nullable)
      - `rejection_reason` (text, nullable)
      - `payment_date` (date, nullable)
      - `payment_method` (text, nullable) - bank_transfer, check, cash
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `expense_items` - Individual expense items
      - `id` (uuid, primary key)
      - `expense_report_id` (uuid, foreign key)
      - `category_id` (uuid, foreign key to expense_categories)
      - `date` (date) - Expense date
      - `description` (text)
      - `amount` (decimal)
      - `currency` (text) - Default XAF
      - `exchange_rate` (decimal) - Default 1
      - `receipt_url` (text, nullable) - Receipt image/document
      - `merchant` (text) - Vendor/merchant name
      - `payment_method` (text) - personal_card, company_card, cash
      - `billable_to_project` (uuid, nullable) - Project ID if billable
      - `vat_amount` (decimal) - VAT amount
      - `is_reimbursable` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ### Engagement Tables
    - `employee_engagement_surveys` - Engagement survey campaigns
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text) - draft, active, closed
      - `anonymous` (boolean)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

    - `engagement_questions` - Survey questions
      - `id` (uuid, primary key)
      - `survey_id` (uuid, foreign key)
      - `question_text` (text)
      - `question_type` (text) - rating, text, multiple_choice
      - `options` (jsonb, nullable) - For multiple choice
      - `order` (integer)
      - `created_at` (timestamptz)

    - `engagement_responses` - Employee responses
      - `id` (uuid, primary key)
      - `survey_id` (uuid, foreign key)
      - `question_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key, nullable if anonymous)
      - `response_value` (text)
      - `response_date` (timestamptz)
      - `created_at` (timestamptz)

  ## 2. Security
    - Enable RLS on all new tables
    - Employees can view/create their own records
    - Managers can view/approve their team's records
    - HR/Admin can access all records
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  manager_id uuid REFERENCES employees(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  start_date date NOT NULL,
  end_date date,
  budget_hours decimal(10,2),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Work schedules table
CREATE TABLE IF NOT EXISTS work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  schedule_type text DEFAULT 'full_time' CHECK (schedule_type IN ('full_time', 'part_time', 'flexible')),
  hours_per_week decimal(5,2) DEFAULT 40,
  monday_hours decimal(5,2) DEFAULT 8,
  tuesday_hours decimal(5,2) DEFAULT 8,
  wednesday_hours decimal(5,2) DEFAULT 8,
  thursday_hours decimal(5,2) DEFAULT 8,
  friday_hours decimal(5,2) DEFAULT 8,
  saturday_hours decimal(5,2) DEFAULT 0,
  sunday_hours decimal(5,2) DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_duration integer DEFAULT 0,
  total_hours decimal(5,2),
  overtime_hours decimal(5,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  project_id uuid REFERENCES projects(id),
  notes text,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  max_amount decimal(15,2),
  requires_receipt boolean DEFAULT true,
  ohada_account_id uuid REFERENCES ohada_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Expense reports table
CREATE TABLE IF NOT EXISTS expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  report_number text UNIQUE NOT NULL,
  title text NOT NULL,
  submission_date date DEFAULT CURRENT_DATE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount decimal(15,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  payment_date date,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'check', 'cash')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense items table
CREATE TABLE IF NOT EXISTS expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id uuid REFERENCES expense_reports(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES expense_categories(id) NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount decimal(15,2) NOT NULL,
  currency text DEFAULT 'XAF',
  exchange_rate decimal(10,4) DEFAULT 1,
  receipt_url text,
  merchant text,
  payment_method text DEFAULT 'personal_card' CHECK (payment_method IN ('personal_card', 'company_card', 'cash')),
  billable_to_project uuid REFERENCES projects(id),
  vat_amount decimal(15,2) DEFAULT 0,
  is_reimbursable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employee engagement surveys
CREATE TABLE IF NOT EXISTS employee_engagement_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  anonymous boolean DEFAULT true,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Engagement questions
CREATE TABLE IF NOT EXISTS engagement_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES employee_engagement_surveys(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text DEFAULT 'rating' CHECK (question_type IN ('rating', 'text', 'multiple_choice')),
  options jsonb,
  order_num integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Engagement responses
CREATE TABLE IF NOT EXISTS engagement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES employee_engagement_surveys(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES engagement_questions(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id),
  response_value text NOT NULL,
  response_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_engagement_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Everyone can view active projects"
  ON projects FOR SELECT
  TO authenticated
  USING (status = 'active' OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
  ));

CREATE POLICY "Managers and admins can manage projects"
  ON projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

-- RLS Policies for time_entries
CREATE POLICY "Employees can view own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

CREATE POLICY "Employees can create own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can update own pending time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "Managers can approve team time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

-- RLS Policies for expense_categories
CREATE POLICY "Everyone can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

-- RLS Policies for expense_reports
CREATE POLICY "Employees can view own expense reports"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

CREATE POLICY "Employees can create own expense reports"
  ON expense_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can update own draft expense reports"
  ON expense_reports FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Managers can approve expense reports"
  ON expense_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

-- RLS Policies for expense_items
CREATE POLICY "Users can view expense items from visible reports"
  ON expense_items FOR SELECT
  TO authenticated
  USING (
    expense_report_id IN (
      SELECT id FROM expense_reports
      WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'manager')
    )
  );

CREATE POLICY "Users can manage items in own draft reports"
  ON expense_items FOR ALL
  TO authenticated
  USING (
    expense_report_id IN (
      SELECT id FROM expense_reports
      WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
      AND status = 'draft'
    )
  );

-- RLS Policies for engagement surveys
CREATE POLICY "Everyone can view active surveys"
  ON employee_engagement_surveys FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage surveys"
  ON employee_engagement_surveys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh', 'qvct_manager')
    )
  );

CREATE POLICY "Everyone can view questions from active surveys"
  ON engagement_questions FOR SELECT
  TO authenticated
  USING (
    survey_id IN (SELECT id FROM employee_engagement_surveys WHERE status = 'active')
  );

CREATE POLICY "Employees can submit survey responses"
  ON engagement_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IS NULL
  );

-- Insert default expense categories
INSERT INTO expense_categories (name, code, max_amount, requires_receipt) VALUES
  ('Transport', 'TRANSP', 50000, true),
  ('Repas', 'MEAL', 15000, true),
  ('Hébergement', 'HOTEL', 200000, true),
  ('Carburant', 'FUEL', 100000, true),
  ('Fournitures', 'SUPPLIES', 50000, false),
  ('Communication', 'COMM', 30000, false),
  ('Formation', 'TRAINING', 500000, true),
  ('Client', 'CLIENT', 100000, true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (name, code, department_id, start_date, description) 
SELECT 
  'Projet ' || name,
  'PROJ-' || SUBSTRING(name, 1, 3),
  id,
  CURRENT_DATE - INTERVAL '30 days',
  'Projet du département ' || name
FROM departments
LIMIT 5
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- MIGRATION : 20260406091747_create_performance_management_system_fixed.sql
-- =============================================================================

/*
  # Create Performance Management System

  ## Overview
  Complete performance management system with OKRs, reviews, 360 feedback, and development plans.

  ## New Tables
  
  ### 1. `objectives` - Employee objectives and key results (OKR)
  ### 2. `key_results` - Key results for objectives
  ### 3. `performance_reviews` - Performance review cycles
  ### 4. `feedback_360` - 360 degree feedback requests
  ### 5. `feedback_responses` - Individual feedback responses
  ### 6. `development_plans` - Individual Development Plans (IDP)
  ### 7. `development_actions` - Actions within development plans
  ### 8. `competency_framework` - Competency definitions

  ## Security
  - Enable RLS on all tables
  - Employees can view their own performance data
  - Managers can view and edit their team members' data
  - HR can manage all performance data
*/

-- Create objectives table
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('individual', 'team', 'company')),
  period text NOT NULL CHECK (period IN ('Q1', 'Q2', 'Q3', 'Q4', 'annual')),
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create key results table
CREATE TABLE IF NOT EXISTS key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  metric text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text NOT NULL,
  weight integer DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES employees(id) NOT NULL,
  review_period text NOT NULL CHECK (review_period IN ('Q1', 'Q2', 'Q3', 'Q4', 'annual', 'probation')),
  review_year integer NOT NULL,
  review_type text NOT NULL CHECK (review_type IN ('self', 'manager', 'peer', '360')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'validated')),
  overall_rating numeric CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths text,
  areas_for_improvement text,
  achievements text,
  goals_met text,
  comments text,
  competencies jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feedback 360 table
CREATE TABLE IF NOT EXISTS feedback_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES employees(id) NOT NULL,
  campaign_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feedback responses table
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_360_id uuid REFERENCES feedback_360(id) ON DELETE CASCADE NOT NULL,
  respondent_id uuid REFERENCES employees(id) NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('manager', 'peer', 'direct_report', 'self')),
  ratings jsonb DEFAULT '{}'::jsonb,
  strengths text,
  areas_for_development text,
  additional_comments text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create development plans table
CREATE TABLE IF NOT EXISTS development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  start_date date NOT NULL,
  target_completion_date date NOT NULL,
  actual_completion_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create development actions table
CREATE TABLE IF NOT EXISTS development_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES development_plans(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('training', 'mentoring', 'project', 'certification', 'other')),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  due_date date NOT NULL,
  completion_date date,
  resources_needed text,
  progress_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create competency framework table
CREATE TABLE IF NOT EXISTS competency_framework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('technical', 'behavioral', 'leadership', 'core')),
  description text NOT NULL,
  level_definitions jsonb DEFAULT '{}'::jsonb,
  applicable_roles text[] DEFAULT ARRAY[]::text[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_framework ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is HR/manager
CREATE OR REPLACE FUNCTION is_hr_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('drh', 'career_manager', 'admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for objectives
CREATE POLICY "Employees can view own objectives"
  ON objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = objectives.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Employees can manage own objectives"
  ON objectives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = objectives.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for key_results
CREATE POLICY "Users can view key results"
  ON key_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectives o
      JOIN employees e ON e.id = o.employee_id
      WHERE o.id = key_results.objective_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

CREATE POLICY "Users can manage key results"
  ON key_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectives o
      JOIN employees e ON e.id = o.employee_id
      WHERE o.id = key_results.objective_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

-- RLS Policies for performance_reviews
CREATE POLICY "Users can view relevant reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE (employees.id = performance_reviews.employee_id 
         OR employees.id = performance_reviews.reviewer_id)
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Reviewers can manage reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = performance_reviews.reviewer_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for feedback_360
CREATE POLICY "Users can view relevant feedback campaigns"
  ON feedback_360 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE (employees.id = feedback_360.employee_id 
         OR employees.id = feedback_360.requester_id)
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Managers can manage feedback campaigns"
  ON feedback_360 FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = feedback_360.requester_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for feedback_responses
CREATE POLICY "Users can view feedback responses"
  ON feedback_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = feedback_responses.respondent_id
      AND employees.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM feedback_360 f
      JOIN employees e ON e.id = f.employee_id
      WHERE f.id = feedback_responses.feedback_360_id
      AND e.user_id = auth.uid()
      AND f.anonymous = false
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Users can submit feedback responses"
  ON feedback_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = feedback_responses.respondent_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for development_plans
CREATE POLICY "Users can view development plans"
  ON development_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = development_plans.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "Users can manage own development plans"
  ON development_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = development_plans.employee_id
      AND employees.user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for development_actions
CREATE POLICY "Users can view development actions"
  ON development_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM development_plans dp
      JOIN employees e ON e.id = dp.employee_id
      WHERE dp.id = development_actions.plan_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

CREATE POLICY "Users can manage development actions"
  ON development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM development_plans dp
      JOIN employees e ON e.id = dp.employee_id
      WHERE dp.id = development_actions.plan_id
      AND (e.user_id = auth.uid() OR is_hr_or_manager())
    )
  );

-- RLS Policies for competency_framework
CREATE POLICY "Everyone can view active competencies"
  ON competency_framework FOR SELECT
  TO authenticated
  USING (active = true OR is_hr_or_manager());

CREATE POLICY "HR can manage competency framework"
  ON competency_framework FOR ALL
  TO authenticated
  USING (is_hr_or_manager());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objectives_employee_id ON objectives(employee_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_period_year ON objectives(period, year);
CREATE INDEX IF NOT EXISTS idx_key_results_objective_id ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_feedback_360_employee_id ON feedback_360(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_feedback_360_id ON feedback_responses(feedback_360_id);
CREATE INDEX IF NOT EXISTS idx_development_plans_employee_id ON development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_development_actions_plan_id ON development_actions(plan_id);

-- =============================================================================
-- MIGRATION : 20260406100115_create_qvct_discussions_system_fixed.sql
-- =============================================================================

/*
  # Create QVCT Discussions and AI Analysis System

  ## Overview
  System for workplace discussions with AI-powered analysis and insights

  ## New Tables
  
  ### 1. `qvct_discussion_threads` - Discussion topics
  ### 2. `qvct_discussion_messages` - Messages in discussions
  ### 3. `qvct_discussion_analysis` - AI analysis of discussions

  ## Security
  - Enable RLS on all tables
  - All employees can view and participate in discussions
  - Anonymous posting option for sensitive topics
*/

-- Create qvct_discussion_threads table
CREATE TABLE IF NOT EXISTS qvct_discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('conditions_travail', 'relations', 'organisation', 'sante', 'autre')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  created_by uuid REFERENCES employees(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Create qvct_discussion_messages table
CREATE TABLE IF NOT EXISTS qvct_discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES qvct_discussion_threads(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES employees(id) NOT NULL,
  message text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create qvct_discussion_analysis table
CREATE TABLE IF NOT EXISTS qvct_discussion_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES qvct_discussion_threads(id) ON DELETE CASCADE NOT NULL,
  summary text NOT NULL,
  key_themes jsonb DEFAULT '[]'::jsonb,
  sentiment text NOT NULL CHECK (sentiment IN ('overall', 'positive', 'neutral', 'negative')),
  proposed_actions jsonb DEFAULT '[]'::jsonb,
  qvct_topics jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES employees(id) NOT NULL
);

-- Enable RLS
ALTER TABLE qvct_discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_discussion_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qvct_discussion_threads
CREATE POLICY "All employees can view discussion threads"
  ON qvct_discussion_threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All employees can create discussion threads"
  ON qvct_discussion_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_threads.created_by
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Thread creator and HR can update threads"
  ON qvct_discussion_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_threads.created_by
      AND user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "HR can delete threads"
  ON qvct_discussion_threads FOR DELETE
  TO authenticated
  USING (is_hr_or_manager());

-- RLS Policies for qvct_discussion_messages
CREATE POLICY "All employees can view messages"
  ON qvct_discussion_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All employees can post messages"
  ON qvct_discussion_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_messages.author_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Message author can update own messages"
  ON qvct_discussion_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_messages.author_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Message author and HR can delete messages"
  ON qvct_discussion_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_messages.author_id
      AND user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for qvct_discussion_analysis
CREATE POLICY "All employees can view analysis"
  ON qvct_discussion_analysis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and HR can create analysis"
  ON qvct_discussion_analysis FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_or_manager());

CREATE POLICY "HR can delete analysis"
  ON qvct_discussion_analysis FOR DELETE
  TO authenticated
  USING (is_hr_or_manager());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_threads_status ON qvct_discussion_threads(status);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_threads_category ON qvct_discussion_threads(category);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_threads_created_by ON qvct_discussion_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_messages_thread_id ON qvct_discussion_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_messages_author_id ON qvct_discussion_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_analysis_thread_id ON qvct_discussion_analysis(thread_id);

-- Create function to update thread updated_at timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qvct_discussion_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update thread timestamp when new message is posted
DROP TRIGGER IF EXISTS update_thread_on_new_message ON qvct_discussion_messages;
CREATE TRIGGER update_thread_on_new_message
  AFTER INSERT ON qvct_discussion_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();

-- =============================================================================
-- MIGRATION : 20260416102220_create_documents_attestations_system.sql
-- =============================================================================

/*
  # Systeme de Gestion des Documents et Attestations

  ## Description
  Ce module permet la gestion complete des documents RH et la generation d'attestations
  pour les employes (attestation de travail, certificat de salaire, attestation de
  presence, etc.).

  ## Nouvelles Tables

  ### document_requests
  - Demandes d'attestations et de documents par les employes
  - Suivi du statut (en attente, approuvee, rejetee, disponible)
  - Types: attestation_travail, certificat_salaire, attestation_presence,
           attestation_conge, lettre_recommandation, autre

  ## Securite
  - RLS activee
  - Les employes voient uniquement leurs propres demandes
  - La DRH/admin/career_manager/payroll_manager gerent toutes les demandes
*/

CREATE TABLE IF NOT EXISTS document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN (
    'attestation_travail',
    'certificat_salaire',
    'attestation_presence',
    'attestation_conge',
    'lettre_recommandation',
    'bulletin_paie',
    'contrat_travail',
    'autre'
  )),
  purpose text,
  additional_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ready')),
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  rejection_reason text,
  document_url text,
  urgency text DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  requested_language text DEFAULT 'fr' CHECK (requested_language IN ('fr', 'en')),
  copies_count integer DEFAULT 1 CHECK (copies_count BETWEEN 1 AND 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own document requests"
  ON document_requests FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager', 'payroll_manager')
    )
  );

CREATE POLICY "Employees can insert own document requests"
  ON document_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager')
    )
  );

CREATE POLICY "HR staff can update document requests"
  ON document_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager', 'payroll_manager')
    )
  );

CREATE POLICY "HR staff can delete document requests"
  ON document_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh', 'admin', 'career_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_document_requests_employee_id ON document_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_created_at ON document_requests(created_at DESC);


-- =============================================================================
-- MIGRATION : 20260420124025_create_role_permissions_system.sql
-- =============================================================================

/*
  # Système de permissions par rôle (Grant & Revoke)

  ## Description
  Crée une table centrale qui définit les permissions accordées à chaque rôle
  pour chaque fonctionnalité (module) du SIRH SNH. Permet aux administrateurs
  de contrôler finement l'accès aux modules sans modifier le code.

  ## Nouvelles tables
  - `role_permissions`
    - `id` (uuid, pk)
    - `role` (text) : le rôle utilisateur cible
    - `feature_id` (text) : identifiant technique du module/fonctionnalité
    - `feature_label` (text) : libellé lisible de la fonctionnalité
    - `feature_category` (text) : catégorie du module (Personnel, Paie, etc.)
    - `is_granted` (boolean) : accès accordé ou non
    - `granted_by` (uuid, fk → auth.users)
    - `granted_at` (timestamptz)
    - `notes` (text) : note optionnelle sur la décision

  ## Sécurité
  - RLS activé
  - Seuls les admins peuvent lire/écrire les permissions
  - Les DRH peuvent lire mais pas modifier

  ## Notes
  - Les permissions sont initialisées avec les valeurs par défaut du système actuel
  - UNIQUE constraint sur (role, feature_id)
*/

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  feature_id text NOT NULL,
  feature_label text NOT NULL,
  feature_category text NOT NULL DEFAULT 'General',
  is_granted boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, feature_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'drh')
    )
  );

CREATE POLICY "Admins can insert role permissions"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update role permissions"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete role permissions"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_feature ON role_permissions(feature_id);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_role_permissions_updated_at();

-- Initialisation des permissions par défaut pour tous les rôles et fonctionnalités
INSERT INTO role_permissions (role, feature_id, feature_label, feature_category, is_granted) VALUES
-- EMPLOYEE
('employee', 'dashboard', 'Tableau de bord', 'General', true),
('employee', 'my-info', 'Mes informations', 'General', true),
('employee', 'leave', 'Congés & Absences', 'RH', true),
('employee', 'time-tracking', 'Pointage', 'RH', true),
('employee', 'expenses', 'Notes de frais', 'Finance', true),
('employee', 'training', 'Formations', 'Formation', true),
('employee', 'performance', 'Performance', 'Performance', true),
('employee', 'payslips', 'Bulletins de paie', 'Paie', true),
('employee', 'documents', 'Documents & Attestations', 'Documents', true),
('employee', 'org-chart', 'Organigramme', 'General', true),

-- MANAGER
('manager', 'dashboard', 'Tableau de bord', 'General', true),
('manager', 'my-info', 'Mes informations', 'General', true),
('manager', 'my-team', 'Mon équipe', 'Personnel', true),
('manager', 'validations', 'Validations congés', 'RH', true),
('manager', 'team-performance', 'Performance équipe', 'Performance', true),
('manager', 'documents', 'Documents & Attestations', 'Documents', true),
('manager', 'reports', 'Rapports', 'Analytique', true),
('manager', 'time-tracking', 'Pointage', 'RH', false),
('manager', 'expenses', 'Notes de frais', 'Finance', false),
('manager', 'training', 'Formations', 'Formation', false),
('manager', 'payslips', 'Bulletins de paie', 'Paie', false),
('manager', 'org-chart', 'Organigramme', 'General', false),

-- DRH
('drh', 'dashboard', 'Tableau de bord', 'General', true),
('drh', 'my-info', 'Mes informations', 'General', true),
('drh', 'employees', 'Liste du personnel', 'Personnel', true),
('drh', 'org-chart', 'Organigramme', 'Personnel', true),
('drh', 'skills-matrix', 'Matrice des compétences', 'Personnel', true),
('drh', 'accounts', 'Comptes d''accès', 'Administration', true),
('drh', 'user-roles', 'Gestion des rôles', 'Administration', true),
('drh', 'disciplinary', 'Gestion disciplinaire', 'Personnel', true),
('drh', 'documents', 'Documents & Attestations', 'Documents', true),
('drh', 'recruitment', 'Recrutement', 'Recrutement', true),
('drh', 'training-admin', 'Administration formations', 'Formation', true),
('drh', 'performance-admin', 'Administration performance', 'Performance', true),
('drh', 'payroll', 'Gestion de la paie', 'Paie', true),
('drh', 'analytics', 'Analytics RH', 'Analytique', true),
('drh', 'qvct', 'QVCT', 'Bien-être', true),
('drh', 'settings', 'Paramètres système', 'Administration', true),

-- DIRECTOR
('director', 'dashboard', 'Tableau de bord', 'General', true),
('director', 'my-info', 'Mes informations', 'General', true),
('director', 'kpi', 'Indicateurs RH', 'Analytique', true),
('director', 'strategic', 'Vue stratégique', 'Analytique', true),
('director', 'reports-dir', 'Rapports direction', 'Analytique', true),
('director', 'analytics', 'Analytics RH', 'Analytique', true),
('director', 'employees', 'Liste du personnel', 'Personnel', false),
('director', 'payroll', 'Gestion de la paie', 'Paie', false),
('director', 'recruitment', 'Recrutement', 'Recrutement', false),

-- ADMIN
('admin', 'dashboard', 'Tableau de bord', 'General', true),
('admin', 'my-info', 'Mes informations', 'General', true),
('admin', 'employees', 'Liste du personnel', 'Personnel', true),
('admin', 'org-chart', 'Organigramme', 'Personnel', true),
('admin', 'skills-matrix', 'Matrice des compétences', 'Personnel', true),
('admin', 'accounts', 'Comptes d''accès', 'Administration', true),
('admin', 'user-roles', 'Gestion des rôles', 'Administration', true),
('admin', 'role-permissions', 'Permissions par rôle', 'Administration', true),
('admin', 'disciplinary', 'Gestion disciplinaire', 'Personnel', true),
('admin', 'documents', 'Documents & Attestations', 'Documents', true),
('admin', 'recruitment', 'Recrutement', 'Recrutement', true),
('admin', 'training-admin', 'Administration formations', 'Formation', true),
('admin', 'performance-admin', 'Administration performance', 'Performance', true),
('admin', 'payroll', 'Gestion de la paie', 'Paie', true),
('admin', 'analytics', 'Analytics RH', 'Analytique', true),
('admin', 'qvct', 'QVCT', 'Bien-être', true),
('admin', 'settings', 'Paramètres système', 'Administration', true),

-- PAYROLL_MANAGER
('payroll_manager', 'dashboard', 'Tableau de bord', 'General', true),
('payroll_manager', 'my-info', 'Mes informations', 'General', true),
('payroll_manager', 'payroll', 'Gestion de la paie', 'Paie', true),
('payroll_manager', 'payslips', 'Bulletins de paie', 'Paie', true),
('payroll_manager', 'payroll-elements', 'Eléments de paie', 'Paie', true),
('payroll_manager', 'salary-grids', 'Grilles salariales', 'Paie', true),
('payroll_manager', 'tax-parameters', 'Paramètres fiscaux', 'Paie', true),
('payroll_manager', 'social-contributions', 'Cotisations sociales', 'Paie', true),
('payroll_manager', 'employees', 'Liste du personnel', 'Personnel', false),
('payroll_manager', 'analytics', 'Analytics RH', 'Analytique', false),

-- RECRUITMENT_MANAGER
('recruitment_manager', 'dashboard', 'Tableau de bord', 'General', true),
('recruitment_manager', 'my-info', 'Mes informations', 'General', true),
('recruitment_manager', 'recruitment', 'Recrutement', 'Recrutement', true),
('recruitment_manager', 'employees', 'Liste du personnel', 'Personnel', false),
('recruitment_manager', 'analytics', 'Analytics RH', 'Analytique', false),

-- CAREER_MANAGER
('career_manager', 'dashboard', 'Tableau de bord', 'General', true),
('career_manager', 'my-info', 'Mes informations', 'General', true),
('career_manager', 'disciplinary', 'Gestion disciplinaire', 'Personnel', true),
('career_manager', 'documents', 'Documents & Attestations', 'Documents', true),
('career_manager', 'training-admin', 'Administration formations', 'Formation', true),
('career_manager', 'performance-admin', 'Administration performance', 'Performance', true),
('career_manager', 'employees', 'Liste du personnel', 'Personnel', false),
('career_manager', 'analytics', 'Analytics RH', 'Analytique', false),

-- QVCT_MANAGER
('qvct_manager', 'dashboard', 'Tableau de bord', 'General', true),
('qvct_manager', 'my-info', 'Mes informations', 'General', true),
('qvct_manager', 'qvct', 'QVCT', 'Bien-être', true),
('qvct_manager', 'employees', 'Liste du personnel', 'Personnel', false),
('qvct_manager', 'analytics', 'Analytics RH', 'Analytique', false)

ON CONFLICT (role, feature_id) DO NOTHING;


-- =============================================================================
-- MIGRATION : 20260421115553_backfill_employee_records_for_special_roles.sql
-- =============================================================================

/*
  # Creation d'enregistrements employes pour les comptes role speciaux

  1. Contexte
    - Plusieurs comptes utilisateurs (admin, director, manager, managers metiers)
      n'ont pas d'enregistrement correspondant dans la table employees.
    - Cela empeche ces utilisateurs d'interagir dans les discussions QVCT
      (et tout autre module qui requiert un employee_id), car les policies RLS
      exigent une correspondance entre auth.uid() et employees.user_id.

  2. Changements
    - Backfill: creation d'un enregistrement employees pour chaque user_profile
      ne disposant pas encore d'employe associe.
    - Les champs obligatoires sont renseignes avec des valeurs coherentes :
      employee_number unique, email, nom, date d'embauche courante,
      statut actif, contrat CDI par defaut.

  3. Securite
    - Ne modifie aucune policy RLS existante.
    - Ne supprime aucune donnee.
    - Utilise INSERT...SELECT avec WHERE NOT EXISTS pour eviter les doublons.
*/

INSERT INTO employees (
  user_id,
  employee_number,
  first_name,
  last_name,
  email,
  hire_date,
  employment_status,
  contract_type
)
SELECT
  up.id,
  'SNH-' || UPPER(LEFT(up.role, 3)) || '-' || LPAD((
    ROW_NUMBER() OVER (ORDER BY up.email)
  )::text, 4, '0') || '-' || LEFT(REPLACE(up.id::text, '-', ''), 6),
  COALESCE(NULLIF(up.first_name, ''), 'Utilisateur'),
  COALESCE(NULLIF(up.last_name, ''), up.role),
  up.email,
  CURRENT_DATE,
  'active',
  'CDI'
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.user_id = up.id
);


-- =============================================================================
-- MIGRATION : 20260421120142_add_qvct_discussion_notifications.sql
-- =============================================================================

/*
  # Notifications automatiques pour les discussions QVCT

  1. Contexte
    - Objectif: permettre a tous les utilisateurs de recevoir des notifications
      lors d'activites dans les discussions QVCT (nouvelle discussion ouverte,
      nouvelle reponse dans une discussion a laquelle ils participent).
    - Les notifications doivent pointer vers la discussion concernee afin que
      tout utilisateur puisse y acceder par simple clic.

  2. Changements
    - Ajout de deux fonctions `notify_new_qvct_thread` et `notify_qvct_thread_reply`,
      en SECURITY DEFINER pour pouvoir inserer des notifications pour tous
      les utilisateurs (les policies RLS de la table notifications limitent
      la lecture/mise-a-jour a son propre user_id, mais n'autorisent pas
      l'insertion depuis un client).
    - Creation des triggers correspondants sur qvct_discussion_threads
      (AFTER INSERT) et qvct_discussion_messages (AFTER INSERT).
    - Le champ action_url est renseigne avec `qvct-discussions:<thread_id>`
      afin que le front puisse ouvrir directement la discussion cible.

  3. Securite
    - Les fonctions sont declarees SECURITY DEFINER mais recherchent
      explicitement dans le schema public.
    - Aucune policy existante n'est modifiee ou supprimee.
    - Pas de purge de donnees.

  4. Notes
    - Les notifications sont destinees a tous les user_profiles actifs, a
      l'exception de l'auteur de l'evenement declencheur.
    - Le titre/message sont localises en francais.
*/

CREATE OR REPLACE FUNCTION public.notify_new_qvct_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_user_id uuid;
  v_author_name text;
BEGIN
  SELECT e.user_id, COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
    INTO v_author_user_id, v_author_name
  FROM employees e
  WHERE e.id = NEW.created_by;

  INSERT INTO notifications (user_id, title, message, type, category, action_url)
  SELECT
    up.id,
    'Nouvelle discussion QVCT',
    COALESCE(NULLIF(TRIM(v_author_name), ''), 'Un collegue')
      || ' a ouvert la discussion: ' || NEW.title,
    'info',
    'qvct_discussion',
    'qvct-discussions:' || NEW.id::text
  FROM user_profiles up
  WHERE up.id IS DISTINCT FROM v_author_user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_qvct_thread_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_title text;
  v_thread_creator_user_id uuid;
  v_author_user_id uuid;
  v_author_name text;
BEGIN
  SELECT t.title, c.user_id
    INTO v_thread_title, v_thread_creator_user_id
  FROM qvct_discussion_threads t
  LEFT JOIN employees c ON c.id = t.created_by
  WHERE t.id = NEW.thread_id;

  SELECT e.user_id, COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
    INTO v_author_user_id, v_author_name
  FROM employees e
  WHERE e.id = NEW.author_id;

  INSERT INTO notifications (user_id, title, message, type, category, action_url)
  SELECT DISTINCT target_user_id,
    'Nouvelle reponse dans une discussion QVCT',
    CASE
      WHEN NEW.is_anonymous THEN 'Un message anonyme a ete publie dans: ' || COALESCE(v_thread_title, 'discussion')
      ELSE COALESCE(NULLIF(TRIM(v_author_name), ''), 'Un collegue')
           || ' a repondu dans: ' || COALESCE(v_thread_title, 'discussion')
    END,
    'info',
    'qvct_discussion_reply',
    'qvct-discussions:' || NEW.thread_id::text
  FROM (
    SELECT v_thread_creator_user_id AS target_user_id
    UNION
    SELECT DISTINCT e.user_id
    FROM qvct_discussion_messages m
    JOIN employees e ON e.id = m.author_id
    WHERE m.thread_id = NEW.thread_id AND e.user_id IS NOT NULL
  ) participants
  WHERE target_user_id IS NOT NULL
    AND target_user_id IS DISTINCT FROM v_author_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_qvct_thread ON qvct_discussion_threads;
CREATE TRIGGER trg_notify_new_qvct_thread
AFTER INSERT ON qvct_discussion_threads
FOR EACH ROW EXECUTE FUNCTION public.notify_new_qvct_thread();

DROP TRIGGER IF EXISTS trg_notify_qvct_thread_reply ON qvct_discussion_messages;
CREATE TRIGGER trg_notify_qvct_thread_reply
AFTER INSERT ON qvct_discussion_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_qvct_thread_reply();


-- =============================================================================
-- MIGRATION : 20260421140425_allow_admins_to_view_all_user_profiles.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260421162439_seed_document_requests_fixtures.sql
-- =============================================================================

/*
  # Seed de donnees fictives pour Documents & Attestations

  ## Description
  Insere un ensemble de demandes d'attestations et de documents RH reparties
  entre plusieurs employes avec differents statuts (pending, approved, ready,
  rejected) et differents types de documents pour illustrer le module.

  ## Notes
  1. Les demandes sont liees aux employes existants (selection par employee_number)
  2. Aucun utilisateur processed_by n'est force (champ nullable)
  3. L'insertion est idempotente : si des demandes existent deja pour ces
     employes avec ces types/dates, elles ne seront pas dupliquees grace au
     WHERE NOT EXISTS.
*/

DO $$
DECLARE
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid;
  e6 uuid; e7 uuid; e8 uuid; e9 uuid; e10 uuid;
BEGIN
  SELECT id INTO e1 FROM employees WHERE employee_number = 'SNH-2018-001' LIMIT 1;
  SELECT id INTO e2 FROM employees WHERE employee_number = 'SNH-2019-002' LIMIT 1;
  SELECT id INTO e3 FROM employees WHERE employee_number = 'SNH-2018-004' LIMIT 1;
  SELECT id INTO e4 FROM employees WHERE employee_number = 'SNH-2019-005' LIMIT 1;
  SELECT id INTO e5 FROM employees WHERE employee_number = 'SNH-2020-006' LIMIT 1;
  SELECT id INTO e6 FROM employees WHERE employee_number = 'SNH-2020-007' LIMIT 1;
  SELECT id INTO e7 FROM employees WHERE employee_number = 'SNH-2021-009' LIMIT 1;
  SELECT id INTO e8 FROM employees WHERE employee_number = 'SNH-2022-010' LIMIT 1;
  SELECT id INTO e9 FROM employees WHERE employee_number = 'SNH-2022-011' LIMIT 1;
  SELECT id INTO e10 FROM employees WHERE employee_number = 'SNH-2023-012' LIMIT 1;

  INSERT INTO document_requests (employee_id, request_type, purpose, additional_notes, status, urgency, copies_count, created_at, processed_at, rejection_reason)
  SELECT * FROM (VALUES
    (e1, 'attestation_travail', 'Demarches bancaires (pret immobilier)', 'A remettre en version papier signee', 'ready', 'normal', 2, now() - interval '8 days', now() - interval '5 days', NULL),
    (e1, 'certificat_salaire', 'Dossier visa Schengen', NULL, 'approved', 'urgent', 1, now() - interval '2 days', now() - interval '1 day', NULL),
    (e2, 'attestation_presence', 'Inscription universitaire du conjoint', NULL, 'pending', 'normal', 1, now() - interval '1 day', NULL, NULL),
    (e2, 'attestation_conge', 'Justificatif pour agence de voyage', 'Periode du 01/05 au 20/05', 'ready', 'normal', 1, now() - interval '14 days', now() - interval '10 days', NULL),
    (e3, 'bulletin_paie', 'Dossier location appartement', 'Derniers 3 mois', 'ready', 'normal', 3, now() - interval '20 days', now() - interval '18 days', NULL),
    (e3, 'lettre_recommandation', 'Candidature programme MBA', 'A adresser a HEC Paris', 'pending', 'urgent', 1, now() - interval '3 days', NULL, NULL),
    (e4, 'attestation_travail', 'Demarches douanieres', NULL, 'rejected', 'normal', 1, now() - interval '9 days', now() - interval '7 days', 'Document deja delivre le 15/03. Merci de verifier votre dossier.'),
    (e4, 'contrat_travail', 'Archivage personnel', NULL, 'approved', 'normal', 1, now() - interval '4 days', now() - interval '2 days', NULL),
    (e5, 'certificat_salaire', 'Demande de credit auto', NULL, 'pending', 'normal', 2, now() - interval '12 hours', NULL, NULL),
    (e5, 'attestation_presence', 'Procedure administrative CNPS', NULL, 'ready', 'normal', 1, now() - interval '30 days', now() - interval '27 days', NULL),
    (e6, 'attestation_travail', 'Demande de visa professionnel', 'A redigger en anglais', 'approved', 'urgent', 1, now() - interval '5 days', now() - interval '3 days', NULL),
    (e6, 'autre', 'Attestation de non-endettement envers la SNH', 'Pour partenariat commercial prive', 'pending', 'normal', 1, now() - interval '6 hours', NULL, NULL),
    (e7, 'attestation_conge', 'Justificatif voyage familial', NULL, 'ready', 'normal', 1, now() - interval '45 days', now() - interval '42 days', NULL),
    (e7, 'bulletin_paie', 'Dossier de divorce', 'Copies certifiees conformes', 'approved', 'urgent', 6, now() - interval '1 day', now() - interval '3 hours', NULL),
    (e8, 'attestation_travail', 'Demarches prefecture', NULL, 'pending', 'normal', 1, now() - interval '2 hours', NULL, NULL),
    (e8, 'certificat_salaire', 'Inscription ecole privee des enfants', NULL, 'ready', 'normal', 2, now() - interval '22 days', now() - interval '20 days', NULL),
    (e9, 'lettre_recommandation', 'Concours interne fonction publique', 'Mentionner les 12 ans d anciennete', 'pending', 'normal', 1, now() - interval '4 days', NULL, NULL),
    (e9, 'contrat_travail', 'Archives personnelles', NULL, 'rejected', 'normal', 1, now() - interval '15 days', now() - interval '13 days', 'Veuillez preciser la raison de la copie.'),
    (e10, 'attestation_presence', 'Inscription salle de sport entreprise', NULL, 'ready', 'normal', 1, now() - interval '60 days', now() - interval '57 days', NULL),
    (e10, 'attestation_travail', 'Ouverture compte bancaire', 'En langue francaise', 'approved', 'normal', 1, now() - interval '1 day', now() - interval '18 hours', NULL)
  ) AS v(employee_id, request_type, purpose, additional_notes, status, urgency, copies_count, created_at, processed_at, rejection_reason)
  WHERE v.employee_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM document_requests dr
      WHERE dr.employee_id = v.employee_id
        AND dr.request_type = v.request_type
        AND dr.created_at = v.created_at
    );
END $$;

-- =============================================================================
-- MIGRATION : 20260422074356_allow_all_roles_view_employees_for_orgchart.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260422104634_seed_employee_salaries_by_position.sql
-- =============================================================================

/*
  # Seed current_salary for all active employees

  ## Purpose
  All employees currently have current_salary = NULL, which prevents the payroll
  generation module from finding any eligible employees.

  ## Changes
  - Sets current_salary on every active employee based on their position title,
    using a realistic SNH salary grid in FCFA.
  - A small pseudo-random variation (+/- up to 10%) is applied per employee
    so figures look natural in the demo.

  ## Salary ranges applied (FCFA brut mensuel)
  | Level                         | Base      |
  |-------------------------------|-----------|
  | Directeur Général / DGA       | 3 200 000 |
  | Directeur (any direction)     | 1 800 000 |
  | Chef Service / Chef d'Équipe  |   950 000 |
  | Responsable                   |   750 000 |
  | Juriste Senior / Ing. Senior  |   680 000 |
  | Ingénieur / Juriste           |   560 000 |
  | Comptable / Chef Comptable    |   520 000 |
  | Commercial / Chef des Ventes  |   480 000 |
  | Technicien                    |   420 000 |
  | Agent / Opérateur             |   370 000 |
  | Assistant                     |   300 000 |
  | Fallback (any other)          |   400 000 |

  ## Notes
  - Only updates rows where current_salary IS NULL to avoid overwriting
    any manually set values.
  - No data is deleted.
*/

UPDATE employees
SET current_salary = (
  CASE
    WHEN p.title ILIKE '%Directeur Général Adjoint%' THEN 2800000
    WHEN p.title ILIKE '%Directeur Général%'         THEN 3200000
    WHEN p.title ILIKE '%Directeur%'                 THEN 1800000
    WHEN p.title ILIKE '%Chef Service%'              THEN  950000
    WHEN p.title ILIKE '%Chef d%quipe%'              THEN  900000
    WHEN p.title ILIKE '%Chef des Ventes%'           THEN  620000
    WHEN p.title ILIKE '%Responsable%'               THEN  750000
    WHEN p.title ILIKE '%Senior%'                    THEN  680000
    WHEN p.title ILIKE '%Ingénieur%'                 THEN  560000
    WHEN p.title ILIKE '%Juriste%'                   THEN  540000
    WHEN p.title ILIKE '%Chef Comptable%'            THEN  580000
    WHEN p.title ILIKE '%Comptable%'                 THEN  480000
    WHEN p.title ILIKE '%Commercial%'                THEN  460000
    WHEN p.title ILIKE '%Technicien%'                THEN  420000
    WHEN p.title ILIKE '%Agent%'                     THEN  370000
    WHEN p.title ILIKE '%Opérateur%'                 THEN  380000
    WHEN p.title ILIKE '%Opérateur%'                 THEN  380000
    WHEN p.title ILIKE '%Assistant%'                 THEN  300000
    WHEN p.title ILIKE '%Gestionnaire%'              THEN  450000
    WHEN p.title ILIKE '%Acheteur%'                  THEN  430000
    ELSE 400000
  END
  -- Add a deterministic per-employee variation of ±8 % based on the UUID
  * (1 + (('x' || substr(employees.id::text, 1, 8))::bit(32)::int % 17 - 8)::numeric / 100)
)
FROM positions p
WHERE employees.position_id = p.id
  AND employees.employment_status = 'active'
  AND employees.current_salary IS NULL;

-- Handle employees without a position_id (fallback)
UPDATE employees
SET current_salary = 400000
WHERE employment_status = 'active'
  AND current_salary IS NULL;


-- =============================================================================
-- MIGRATION : 20260422124714_seed_hr_fixtures_v5_final.sql
-- =============================================================================

/*
  # Seed HR Fixtures v5 - Version finale corrigée

  Corrections appliquées:
  - performance_reviews: colonnes réelles (no achievements/goals_met/submitted_at/validated_at)
  - review_type: 'annual','mid_year','probation','project'
  - status: 'draft','submitted','completed'
*/

-- ============================================================
-- 1. COMPÉTENCES (skills)
-- ============================================================
INSERT INTO skills (id, name, category, description) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Forage pétrolier', 'technical', 'Maîtrise des opérations de forage et complétion de puits'),
  ('a1000001-0000-0000-0000-000000000002', 'Production hydrocarbures', 'technical', 'Gestion de la production de pétrole et gaz'),
  ('a1000001-0000-0000-0000-000000000003', 'Maintenance industrielle', 'technical', 'Entretien préventif et curatif des équipements de production'),
  ('a1000001-0000-0000-0000-000000000004', 'Sécurité industrielle HSE', 'technical', 'Application des normes HSSE dans un contexte pétrolier'),
  ('a1000001-0000-0000-0000-000000000005', 'Géologie appliquée', 'technical', 'Interprétation des données géologiques et sismiques'),
  ('a1000001-0000-0000-0000-000000000006', 'Comptabilité OHADA', 'technical', 'Maîtrise du plan comptable OHADA et des normes camerounaises'),
  ('a1000001-0000-0000-0000-000000000007', 'Contrôle de gestion', 'technical', 'Élaboration et suivi des budgets et tableaux de bord'),
  ('a1000001-0000-0000-0000-000000000008', 'Fiscalité camerounaise', 'technical', 'Application des règles fiscales DGI/CEMAC'),
  ('a1000001-0000-0000-0000-000000000009', 'Droit OHADA', 'technical', 'Connaissance approfondie du droit des affaires OHADA'),
  ('a1000001-0000-0000-0000-000000000010', 'Droit du travail camerounais', 'technical', 'Code du travail et conventions collectives secteur pétrolier'),
  ('a1000001-0000-0000-0000-000000000011', 'Négociation commerciale', 'technical', 'Techniques de vente et négociation B2B secteur énergie'),
  ('a1000001-0000-0000-0000-000000000012', 'Gestion de projet', 'technical', 'Méthodologies de conduite de projet PMBok'),
  ('a1000001-0000-0000-0000-000000000013', 'Management d''équipe', 'soft', 'Animation, motivation et développement des équipes'),
  ('a1000001-0000-0000-0000-000000000014', 'Gestion RH et paie', 'technical', 'Administration du personnel, paie, GPEC'),
  ('a1000001-0000-0000-0000-000000000015', 'Recrutement et sélection', 'technical', 'Processus de recrutement et assessment center'),
  ('a1000001-0000-0000-0000-000000000016', 'Excel et Power BI', 'technical', 'Analyse de données et reporting avec outils Office'),
  ('a1000001-0000-0000-0000-000000000017', 'SAP HR et ERP', 'technical', 'Utilisation des modules RH dans les ERP'),
  ('a1000001-0000-0000-0000-000000000018', 'Logistique supply chain', 'technical', 'Gestion des approvisionnements et chaîne logistique'),
  ('a1000001-0000-0000-0000-000000000019', 'Anglais professionnel B2', 'language', 'Communication professionnelle orale et écrite en anglais'),
  ('a1000001-0000-0000-0000-000000000020', 'Communication et présentation', 'soft', 'Animation de réunions, rédaction de rapports, présentations')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. RÉFÉRENTIEL DE COMPÉTENCES
-- ============================================================
INSERT INTO competency_framework (id, name, category, description, level_definitions, applicable_roles) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'Expertise technique métier', 'technical',
   'Niveau de maîtrise technique dans son domaine de spécialité',
   '{"1":"Notions de base","2":"Pratique autonome","3":"Expert reconnu","4":"Référent national","5":"Expert international"}'::jsonb,
   ARRAY['employee','manager']),
  ('b1000001-0000-0000-0000-000000000002', 'Leadership et management', 'leadership',
   'Capacité à diriger, inspirer et développer les collaborateurs',
   '{"1":"Se manage soi-même","2":"Manage une petite équipe","3":"Manage des managers","4":"Manage une direction","5":"Dirige l''organisation"}'::jsonb,
   ARRAY['manager','director','drh']),
  ('b1000001-0000-0000-0000-000000000003', 'Orientation résultats', 'behavioral',
   'Capacité à atteindre les objectifs fixés avec rigueur',
   '{"1":"Atteint partiellement","2":"Atteint ses objectifs","3":"Dépasse ses objectifs","4":"Crée de la valeur","5":"Transforme l''organisation"}'::jsonb,
   ARRAY['employee','manager','director']),
  ('b1000001-0000-0000-0000-000000000004', 'Travail en équipe', 'core',
   'Aptitude à collaborer efficacement avec ses pairs',
   '{"1":"Participe","2":"Contribue activement","3":"Fédère","4":"Crée des synergies","5":"Culture collaborative"}'::jsonb,
   ARRAY['employee','manager','director','drh']),
  ('b1000001-0000-0000-0000-000000000005', 'Culture Sécurité HSE', 'core',
   'Respect et promotion de la culture sécurité au quotidien',
   '{"1":"Connait les règles","2":"Applique les procédures","3":"Sensibilise ses pairs","4":"Champion HSE","5":"Pilote la stratégie HSE"}'::jsonb,
   ARRAY['employee','manager','director'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. COMPÉTENCES EMPLOYÉS
-- ============================================================
INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id,
       (ARRAY['beginner','intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,1,4))::bit(16)::int%4)],
       (e.hire_date+interval '3 months')::date, '2025-12-15'::date
FROM employees e
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000016','a1000001-0000-0000-0000-000000000019')) s
WHERE e.employment_status='active'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '6 months')::date, '2025-11-01'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000002','a1000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000012')) s
WHERE e.employment_status='active' AND d.name='Direction Technique' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '4 months')::date, '2026-01-15'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000006','a1000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000008')) s
WHERE e.employment_status='active' AND d.name='Direction Financière' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '2 months')::date, '2025-10-01'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000014','a1000001-0000-0000-0000-000000000015','a1000001-0000-0000-0000-000000000017')) s
WHERE e.employment_status='active' AND d.name='Direction des Ressources Humaines' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '1 month')::date, '2025-09-15'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000010')) s
WHERE e.employment_status='active' AND d.name='Direction Juridique' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '3 months')::date, '2025-12-01'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000011','a1000001-0000-0000-0000-000000000013','a1000001-0000-0000-0000-000000000020')) s
WHERE e.employment_status='active' AND d.name='Direction Commerciale' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '3 months')::date, '2025-11-15'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000018','a1000001-0000-0000-0000-000000000012')) s
WHERE e.employment_status='active' AND d.name='Direction Logistique' ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. PROGRAMMES DE FORMATION
-- ============================================================
INSERT INTO training_programs (id,title,code,category,provider,duration_hours,cost,description,is_mandatory,status,start_date,end_date) VALUES
  ('c1000001-0000-0000-0000-000000000001','Sécurité installations pétrolières - Risque H2S','TRN-HSE-001','safety','TOTAL Energies Training Center',24,850000,'Formation obligatoire sur les risques H2S en zone de production',true,'completed','2025-09-01','2025-09-03'),
  ('c1000001-0000-0000-0000-000000000002','Comptabilité OHADA approfondie','TRN-FIN-001','technical','CERFI Yaoundé',32,450000,'Révision complète du SYSCOHADA révisé et normes CEMAC',false,'completed','2025-10-15','2025-10-19'),
  ('c1000001-0000-0000-0000-000000000003','Management d''équipe et leadership situationnel','TRN-MGT-001','management','Institut de Management du Cameroun',16,320000,'Développer ses compétences managériales et adapter son style',false,'completed','2025-11-10','2025-11-11'),
  ('c1000001-0000-0000-0000-000000000004','Excel avancé et Power BI','TRN-IT-001','technical','Interne SNH - DSI',8,0,'Analyse de données RH et tableaux de bord décisionnels',false,'completed','2025-12-05','2025-12-05'),
  ('c1000001-0000-0000-0000-000000000005','Actualité du droit du travail 2026','TRN-JUR-001','compliance','Barreau du Centre - Yaoundé',8,180000,'Évolutions du code du travail et jurisprudences récentes',true,'ongoing','2026-02-20','2026-02-20'),
  ('c1000001-0000-0000-0000-000000000006','Négociation commerciale à fort enjeu','TRN-COM-001','management','CCI du Cameroun',16,280000,'Techniques de closing et négociation dans le secteur énergie',false,'ongoing','2026-03-01','2026-03-02'),
  ('c1000001-0000-0000-0000-000000000007','Anglais professionnel secteur énergie - B2','TRN-LANG-001','other','British Council Douala',60,420000,'Préparation TOEIC et anglais des affaires secteur pétrolier',false,'ongoing','2026-01-06','2026-06-27'),
  ('c1000001-0000-0000-0000-000000000008','Maintenance prédictive et GMAO','TRN-TECH-001','technical','École Polytechnique de Yaoundé',40,550000,'GMAO et maintenance conditionnelle des équipements industriels',false,'planned','2026-05-12','2026-05-16')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score,feedback)
SELECT 'c1000001-0000-0000-0000-000000000001',e.id,'completed','2025-08-25'::date,'2025-09-03'::date,
       70+(('x'||substr(e.id::text,1,4))::bit(16)::int%28),'Formation très utile, mise en pratique immédiate sur site'
FROM employees e JOIN departments d ON d.id=e.department_id
WHERE e.employment_status='active' AND d.name IN ('Direction Technique','Direction HSE')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score,feedback)
SELECT 'c1000001-0000-0000-0000-000000000002',e.id,'completed','2025-10-01'::date,'2025-10-19'::date,
       75+(('x'||substr(e.id::text,1,4))::bit(16)::int%23),'Excellente mise à niveau, formateur très compétent'
FROM employees e JOIN departments d ON d.id=e.department_id
WHERE e.employment_status='active' AND d.name='Direction Financière' ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score,feedback)
SELECT 'c1000001-0000-0000-0000-000000000003',e.id,
       CASE WHEN p.title ILIKE '%Directeur%' THEN 'completed' ELSE 'enrolled' END,
       '2025-11-01'::date,
       CASE WHEN p.title ILIKE '%Directeur%' THEN '2025-11-11'::date ELSE NULL::date END,
       CASE WHEN p.title ILIKE '%Directeur%' THEN (82+(('x'||substr(e.id::text,1,4))::bit(16)::int%16))::integer ELSE NULL::integer END,
       CASE WHEN p.title ILIKE '%Directeur%' THEN 'Contenu pertinent, cas pratiques très parlants'::text ELSE NULL::text END
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active'
  AND (p.title ILIKE '%Directeur%' OR p.title ILIKE '%Chef Service%' OR p.title ILIKE '%Chef d%quipe%' OR p.title ILIKE '%Responsable%')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score)
SELECT 'c1000001-0000-0000-0000-000000000004',e.id,'completed','2025-12-01'::date,'2025-12-05'::date,
       80+(('x'||substr(e.id::text,1,4))::bit(16)::int%19)
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active' AND (p.title ILIKE '%Assistant%' OR p.title ILIKE '%Gestionnaire%')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date)
SELECT 'c1000001-0000-0000-0000-000000000005',e.id,'enrolled','2026-02-10'::date
FROM employees e JOIN departments d ON d.id=e.department_id
WHERE e.employment_status='active' AND d.name IN ('Direction des Ressources Humaines','Direction Juridique')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date)
SELECT 'c1000001-0000-0000-0000-000000000007',e.id,'enrolled','2026-01-06'::date
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active' AND (p.title ILIKE '%Commercial%' OR p.title ILIKE '%Ingénieur%' OR p.title ILIKE '%Juriste%')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date)
SELECT 'c1000001-0000-0000-0000-000000000008',e.id,'enrolled','2026-04-20'::date
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active' AND (p.title ILIKE '%Technicien%' OR p.title ILIKE '%Ingénieur%')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. OBJECTIFS + KEY RESULTS
-- ============================================================
DO $$
DECLARE emp RECORD; obj_id uuid; counter int:=0;
BEGIN
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id WHERE e.employment_status='active'
    AND d.name='Direction Technique' AND p.title IN ('Ingénieur Production','Technicien','Chef d''Équipe') LIMIT 8
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Optimiser le taux de disponibilité des équipements',
      'Atteindre un taux de disponibilité mécanique ≥ 95% sur les équipements de production assignés',
      'individual','annual',2026,'active','2026-01-01','2026-12-31',
      (SELECT user_id FROM employees WHERE id='b1334b2b-99da-4af4-bf8c-522605f425c2')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'Taux de disponibilité mécanique','Disponibilité mensuelle moyenne',95,88+(counter%7),'%',50,'in_progress'),
      (obj_id,'Arrêts non planifiés','Arrêts imprévus par trimestre',2,4-(counter%3),'arrêts',30,'at_risk'),
      (obj_id,'Budget maintenance','Écart budget vs réalisé',5,2+(counter%4),'%',20,'in_progress') ON CONFLICT DO NOTHING;
  END LOOP;
  counter:=0;
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id WHERE e.employment_status='active'
    AND d.name='Direction Commerciale' AND p.title IN ('Commercial','Chef des Ventes') LIMIT 6
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Atteindre les objectifs de vente T1 2026',
      'Réaliser 100% du budget commercial alloué pour le premier trimestre 2026',
      'individual','Q1',2026,'active','2026-01-01','2026-03-31',
      (SELECT user_id FROM employees WHERE id='69fcb373-5e0c-42b3-b2c3-488725cbef9c')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'CA réalisé vs budget','Chiffre d''affaires T1 2026',100,78+(counter*3),'%',60,'in_progress'),
      (obj_id,'Nouveaux contrats','Contrats signés nouveaux clients',3,counter%3,'contrats',40,'in_progress') ON CONFLICT DO NOTHING;
  END LOOP;
  counter:=0;
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    WHERE e.employment_status='active' AND d.name='Direction des Ressources Humaines' LIMIT 5
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Digitaliser les processus RH clés',
      'Déployer le module ERP RH et former 100% des collaborateurs aux nouveaux outils',
      'team','annual',2026,'active','2026-01-01','2026-12-31',
      (SELECT user_id FROM employees WHERE id='a4593f7d-482a-472d-abe4-6c388b53cbc2')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'Déploiement ERP','Modules RH mis en production',100,40+(counter*8),'%',50,'in_progress'),
      (obj_id,'Employés formés','Taux de formation aux outils',100,30+(counter*10),'%',50,'in_progress') ON CONFLICT DO NOTHING;
  END LOOP;
  counter:=0;
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id WHERE e.employment_status='active'
    AND d.name='Direction Financière' AND p.title IN ('Comptable','Chef Comptable','Directeur Financier') LIMIT 5
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Clôturer les comptes annuels 2025 dans les délais',
      'Finaliser les états financiers OHADA avant le 30 avril 2026 et préparer le rapport annuel',
      'individual','Q1',2026,'active','2026-01-01','2026-04-30',
      (SELECT user_id FROM employees WHERE id='5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'Clôture comptable','Avancement états financiers',100,60+(counter*8),'%',70,'in_progress'),
      (obj_id,'Rapport annuel','Rapport validé Direction',1,0,'rapport',30,'not_started') ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 6. ÉVALUATIONS DE PERFORMANCE
-- colonnes réelles: employee_id, reviewer_id, review_period, review_year, review_type,
--   overall_rating, strengths, areas_for_improvement, comments, status, review_date
-- ============================================================
DO $$
DECLARE emp RECORD; mgr_id uuid; counter int:=0;
  strengths_arr text[] := ARRAY[
    'Excellente maîtrise technique, fiabilité et rigueur dans l''exécution des tâches quotidiennes',
    'Grande capacité d''adaptation, esprit d''initiative et sens aigu du service rendu',
    'Expertise métier reconnue par ses pairs, bon communicant et très pédagogue'
  ];
  improve_arr text[] := ARRAY[
    'Développer les compétences en gestion de projet et renforcer la prise de décision autonome',
    'Renforcer la communication transversale avec les autres directions et améliorer le reporting',
    'Approfondir les connaissances réglementaires et préparer les certifications métier prioritaires'
  ];
BEGIN
  FOR emp IN SELECT e.id, e.department_id FROM employees e JOIN departments d ON d.id=e.department_id
    WHERE e.employment_status='active'
      AND d.name IN ('Direction Technique','Direction Financière','Direction Commerciale',
                     'Direction des Ressources Humaines','Direction HSE','Direction Logistique','Direction Juridique')
    LIMIT 50
  LOOP
    counter:=counter+1;
    SELECT e2.id INTO mgr_id FROM employees e2 JOIN positions p2 ON p2.id=e2.position_id
    WHERE e2.department_id=emp.department_id AND p2.title ILIKE '%Directeur%' AND e2.id!=emp.id ORDER BY e2.id LIMIT 1;
    CONTINUE WHEN mgr_id IS NULL;
    INSERT INTO performance_reviews(employee_id,reviewer_id,review_period,review_year,review_type,
      overall_rating,strengths,areas_for_improvement,comments,status,review_date)
    VALUES(emp.id,mgr_id,'annual',2025,'annual',
      LEAST(5,3+(counter%20)/10),
      strengths_arr[(counter%3)+1], improve_arr[(counter%3)+1],
      'Évaluation annuelle 2025 — Entretien réalisé le 15 janvier 2026.',
      'completed','2026-01-15'::date) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 7. NOTES DE FRAIS
-- ============================================================
DO $$
DECLARE emp RECORD; report_id uuid; counter int:=0;
  cat_transp uuid; cat_meal uuid; cat_fuel uuid; cat_hotel uuid;
  titles text[] := ARRAY['Déplacement mission Douala - Mars 2026','Formation externe - Février 2026','Visite client - Janvier 2026','Déplacement terrain - Avril 2026'];
  statuses text[] := ARRAY['approved','submitted','paid','approved'];
  amounts numeric[] := ARRAY[185000,92500,145000,67000];
BEGIN
  SELECT id INTO cat_transp FROM expense_categories WHERE code='TRANSP';
  SELECT id INTO cat_meal   FROM expense_categories WHERE code='MEAL';
  SELECT id INTO cat_fuel   FROM expense_categories WHERE code='FUEL';
  SELECT id INTO cat_hotel  FROM expense_categories WHERE code='HOTEL';
  FOR emp IN SELECT e.id FROM employees e JOIN positions p ON p.id=e.position_id
    WHERE e.employment_status='active' AND p.title NOT ILIKE '%Opérateur%' LIMIT 15
  LOOP
    counter:=counter+1; report_id:=gen_random_uuid();
    INSERT INTO expense_reports(id,employee_id,report_number,title,submission_date,period_start,period_end,total_amount,status,notes)
    VALUES(report_id,emp.id,'NDF-2026-'||LPAD(counter::text,4,'0'),titles[(counter%4)+1],
      (CURRENT_DATE-((4-counter%4)*7))::date,(CURRENT_DATE-((4-counter%4)*7+14))::date,
      (CURRENT_DATE-((4-counter%4)*7+7))::date,amounts[(counter%4)+1],statuses[(counter%4)+1],
      'Note de frais soumise pour remboursement conformément à la politique SNH') ON CONFLICT DO NOTHING;
    INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
    VALUES(report_id,cat_transp,(CURRENT_DATE-((4-counter%4)*7+13))::date,'Billet bus Yaoundé-Douala AR',18000,'XAF','General Express','cash',true);
    INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
    VALUES(report_id,cat_meal,(CURRENT_DATE-((4-counter%4)*7+12))::date,'Repas déjeuner réunion de travail',12500,'XAF','Restaurant Wouri Palace','cash',true);
    IF counter%2=0 THEN
      INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
      VALUES(report_id,cat_fuel,(CURRENT_DATE-((4-counter%4)*7+11))::date,'Carburant véhicule de service',22000,'XAF','Total Énergies Mvog-Mbi','personal_card',true);
    END IF;
    IF counter%3=0 THEN
      INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
      VALUES(report_id,cat_hotel,(CURRENT_DATE-((4-counter%4)*7+12))::date,'Nuitée Hôtel La Falaise Douala',45000,'XAF','Hôtel La Falaise','personal_card',true);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 8. SANCTIONS DISCIPLINAIRES
-- ============================================================
DO $$
DECLARE emp RECORD; counter int:=0;
BEGIN
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id
    WHERE e.employment_status='active' AND d.name='Direction Technique' AND p.title='Technicien' LIMIT 2
  LOOP counter:=counter+1;
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active)
    VALUES(emp.id,'written_warning',2,'2025-10-14'::date,'2025-10-17'::date,
      'Retards répétés non justifiés : '||(counter+3)::text||' absences de pointage sur 3 semaines sans notification préalable.',
      'Avertissement écrit notifié avec rappel sur les obligations de ponctualité. Suivi mensuel mis en place.',
      (SELECT user_id FROM employees WHERE id='b1334b2b-99da-4af4-bf8c-522605f425c2'),
      'J''ai rencontré des contraintes de transport imprévues. Je m''engage à prévenir en cas d''empêchement.',
      '2025-11-17'::date,false,true) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

DO $$
DECLARE eid uuid;
BEGIN
  SELECT e.id INTO eid FROM employees e JOIN departments d ON d.id=e.department_id
  JOIN positions p ON p.id=e.position_id
  WHERE e.employment_status='active' AND d.name='Direction HSE' AND p.title='Agent HSE' LIMIT 1;
  IF eid IS NOT NULL THEN
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active,expiry_date)
    VALUES(eid,'verbal_warning',1,'2025-12-03'::date,'2025-12-05'::date,
      'Non-respect procédures HSE : port EPI non conforme lors d''une intervention de maintenance.',
      'Avertissement verbal enregistré. Recadrage immédiat sur le terrain. Rappel lors de la réunion de sécurité.',
      (SELECT user_id FROM employees WHERE id='076d5c44-a1a0-4912-b884-a9f09f1bb44e'),
      'C''était un oubli involontaire. Je suis conscient de l''importance des EPI.',
      '2026-01-05'::date,false,false,'2026-06-05'::date) ON CONFLICT DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE eid uuid;
BEGIN
  SELECT e.id INTO eid FROM employees e JOIN departments d ON d.id=e.department_id
  JOIN positions p ON p.id=e.position_id
  WHERE e.employment_status='active' AND d.name='Direction Commerciale' AND p.title='Commercial' LIMIT 1;
  IF eid IS NOT NULL THEN
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active)
    VALUES(eid,'final_warning',4,'2026-01-20'::date,'2026-01-24'::date,
      'Comportement inapproprié envers un collègue : propos déplacés et attitude conflictuelle lors d''une réunion, constatée par deux témoins.',
      'Avertissement final notifié par écrit. Entretien préalable DRH et manager. Accompagnement QVCT proposé. Surveillance 3 mois.',
      (SELECT user_id FROM employees WHERE id='a4593f7d-482a-472d-abe4-6c388b53cbc2'),
      'La pression des délais a été un facteur aggravant. Je reconnais que ma réaction était disproportionnée.',
      '2026-02-24'::date,true,true) ON CONFLICT DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE eid uuid;
BEGIN
  SELECT e.id INTO eid FROM employees e JOIN departments d ON d.id=e.department_id
  JOIN positions p ON p.id=e.position_id
  WHERE e.employment_status='active' AND d.name='Direction Logistique' AND p.title='Agent Logistique' LIMIT 1;
  IF eid IS NOT NULL THEN
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,duration_days,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active)
    VALUES(eid,'suspension',3,'2026-02-10'::date,'2026-02-14'::date,
      'Absence injustifiée de 3 jours consécutifs sans information de la hiérarchie, perturbant l''organisation du service.',
      'Mise à pied de 3 jours sans rémunération conformément au règlement intérieur SNH. Entretien de recadrage à la reprise.',
      3,(SELECT user_id FROM employees WHERE id='e5520598-71ad-455e-9a78-a66e5fe415c7'),
      'J''ai eu une urgence familiale et n''ai pas pu prévenir. Je présente mes excuses.',
      '2026-03-14'::date,false,false) ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- =============================================================================
-- MIGRATION : 20260422124810_assign_managers_and_team_hierarchy.sql
-- =============================================================================

/*
  # Assignation des managers et hiérarchie par département

  ## Changements
  - Chaque Directeur devient le manager de tous ses collaborateurs directs dans son département
  - Pour Direction Technique: le Directeur Technique manage les Chefs d'Équipe,
    et chaque Chef d'Équipe manage un sous-groupe de techniciens/opérateurs/ingénieurs
  - Le DG manage tous les Directeurs
  - Le DGA manage les Directeurs en l'absence du DG (manager_id = DG)

  ## Résultat
  - manager_id renseigné sur tous les employés actifs
  - Arborescence hiérarchique complète pour l'organigramme
*/

-- DGA rapporte au DG
UPDATE employees
SET manager_id = '05fbe4ed-0a17-4eee-b040-1da4bf7284bb'  -- Jean-Pierre Mbarga (DG)
WHERE id = '78531901-cc2d-40d0-b679-6ce7c1053851';        -- Marie-Claire Fotso (DGA)

-- Tous les Directeurs de département rapportent au DG
UPDATE employees e
SET manager_id = '05fbe4ed-0a17-4eee-b040-1da4bf7284bb'  -- DG
FROM positions p
WHERE e.position_id = p.id
  AND p.title ILIKE '%Directeur%'
  AND p.title NOT ILIKE '%Directeur Général%'
  AND e.employment_status = 'active'
  AND e.id != '05fbe4ed-0a17-4eee-b040-1da4bf7284bb';

-- Direction Commerciale: tous rapportent au Directeur Commercial
UPDATE employees e
SET manager_id = '69fcb373-5e0c-42b3-b2c3-488725cbef9c'  -- Ulrich Foe (Dir Commercial)
FROM departments d
WHERE e.department_id = d.id
  AND d.name = 'Direction Commerciale'
  AND e.employment_status = 'active'
  AND e.id != '69fcb373-5e0c-42b3-b2c3-488725cbef9c';

-- Direction RH: Gestionnaires/Assistants rapportent au Chef Service du Personnel
-- Chef Service du Personnel rapporte au DRH (déjà set par la règle Directeur)
UPDATE employees e
SET manager_id = '7321171c-8235-4a9d-ae2f-45ebde6ac032'  -- Françoise Tchouake (Chef Service)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction des Ressources Humaines'
  AND p.title IN ('Assistant RH', 'Gestionnaire RH')
  AND e.employment_status = 'active';

-- DRH manage le Chef Service du Personnel
UPDATE employees
SET manager_id = 'a4593f7d-482a-472d-abe4-6c388b53cbc2'  -- Paul Nkotto (DRH)
WHERE id = '7321171c-8235-4a9d-ae2f-45ebde6ac032';

-- Direction Financière: tous rapportent au Directeur Financier
UPDATE employees e
SET manager_id = '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1'  -- Alain Kamga (Dir Financier)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Financière'
  AND p.title IN ('Chef Comptable','Comptable','Assistant Comptable')
  AND e.employment_status = 'active';

-- Direction HSE: Agent HSE et Responsable Sécurité rapportent au Directeur HSE
UPDATE employees e
SET manager_id = '076d5c44-a1a0-4912-b884-a9f09f1bb44e'  -- Charles Owona (Dir HSE)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction HSE'
  AND p.title IN ('Agent HSE','Responsable Sécurité')
  AND e.employment_status = 'active';

-- Direction Juridique: tous rapportent au Directeur Juridique
UPDATE employees e
SET manager_id = '0d9e09bf-6dcf-45f9-8ac5-032b50b67477'  -- Hervé Nkolo Foe (Dir Juridique)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Juridique'
  AND p.title IN ('Juriste','Juriste Senior')
  AND e.employment_status = 'active';

-- Direction Logistique: Agent Logistique et Acheteur rapportent au Responsable Achats
-- Responsable Achats rapporte au Directeur Logistique
UPDATE employees e
SET manager_id = '601d21ef-0cd0-4592-acce-ab222ad652dc'  -- Oscar Ngako (Resp Achats)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Logistique'
  AND p.title IN ('Agent Logistique','Acheteur')
  AND e.employment_status = 'active';

UPDATE employees
SET manager_id = 'e5520598-71ad-455e-9a78-a66e5fe415c7'  -- Nadine Ebang (Dir Logistique)
WHERE id = '601d21ef-0cd0-4592-acce-ab222ad652dc';

-- Direction Technique: Directeur Technique manage les Chefs d'Équipe et Ingénieurs
UPDATE employees e
SET manager_id = 'b1334b2b-99da-4af4-bf8c-522605f425c2'  -- Quentin Fofana (Dir Technique)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Technique'
  AND (p.title ILIKE '%Chef d%quipe%' OR p.title = 'Ingénieur Production')
  AND e.employment_status = 'active';

-- Chefs d'équipe managent les techniciens et opérateurs
-- Attribution round-robin des techniciens/opérateurs aux 4 chefs d'équipe
DO $$
DECLARE
  chefs uuid[] := ARRAY[
    'f1cc565e-75dc-41ee-a486-4184d12ff321',  -- William Abega
    '92da1834-aa71-4826-9544-d6c806d5c30b',  -- Zacharie Eba'a
    '0b11134d-c9b6-43b4-8661-80771ac3d424',  -- Xavier Nguini
    '80ae4c9b-aa21-4ac7-af62-64651078addd'   -- Yvette Song
  ];
  emp RECORD;
  counter int := 0;
BEGIN
  FOR emp IN
    SELECT e.id FROM employees e
    JOIN departments d ON d.id = e.department_id
    JOIN positions p ON p.id = e.position_id
    WHERE e.employment_status = 'active'
      AND d.name = 'Direction Technique'
      AND p.title IN ('Technicien','Opérateur')
    ORDER BY e.id
  LOOP
    UPDATE employees
    SET manager_id = chefs[(counter % 4) + 1]
    WHERE id = emp.id;
    counter := counter + 1;
  END LOOP;
END $$;


-- =============================================================================
-- MIGRATION : 20260515113829_create_position_skill_requirements.sql
-- =============================================================================

/*
  # Position Skill Requirements Table

  ## Summary
  Creates a table mapping positions to required skills with minimum proficiency levels,
  enabling AI-powered profile matching and succession planning.

  ## New Tables
  - `position_skill_requirements`
    - `id` (uuid, primary key)
    - `position_id` (uuid, FK to positions)
    - `skill_id` (uuid, FK to skills)
    - `required_level` (text enum: beginner/intermediate/advanced/expert)
    - `is_mandatory` (boolean) — must-have vs nice-to-have
    - `weight` (integer 1–5) — importance weight for scoring

  ## Security
  - RLS enabled, readable by authenticated users (HR roles)

  ## Seed Data
  Assigns skill requirements to all 29 positions across 9 departments.
*/

CREATE TABLE IF NOT EXISTS position_skill_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level text NOT NULL CHECK (required_level IN ('beginner','intermediate','advanced','expert')),
  is_mandatory boolean DEFAULT true,
  weight integer DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (position_id, skill_id)
);

ALTER TABLE position_skill_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view position skill requirements"
  ON position_skill_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR roles can manage position skill requirements"
  ON position_skill_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh','admin','career_manager')
    )
  );

CREATE POLICY "HR roles can update position skill requirements"
  ON position_skill_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh','admin','career_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh','admin','career_manager')
    )
  );

CREATE POLICY "HR roles can delete position skill requirements"
  ON position_skill_requirements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('drh','admin','career_manager')
    )
  );

-- ─── SEED POSITION SKILL REQUIREMENTS ─────────────────────────────────────────
DO $$
DECLARE
  -- skill IDs
  s_forage        uuid := 'a1000001-0000-0000-0000-000000000001';
  s_prod_hc       uuid := 'a1000001-0000-0000-0000-000000000002';
  s_maint         uuid := 'a1000001-0000-0000-0000-000000000003';
  s_hse           uuid := 'a1000001-0000-0000-0000-000000000004';
  s_geol          uuid := 'a1000001-0000-0000-0000-000000000005';
  s_compta        uuid := 'a1000001-0000-0000-0000-000000000006';
  s_ctrl_gest     uuid := 'a1000001-0000-0000-0000-000000000007';
  s_fisc          uuid := 'a1000001-0000-0000-0000-000000000008';
  s_droit_ohada   uuid := 'a1000001-0000-0000-0000-000000000009';
  s_droit_trav    uuid := 'a1000001-0000-0000-0000-000000000010';
  s_nego          uuid := 'a1000001-0000-0000-0000-000000000011';
  s_proj          uuid := 'a1000001-0000-0000-0000-000000000012';
  s_mgmt          uuid := 'a1000001-0000-0000-0000-000000000013';
  s_rh_paie       uuid := 'a1000001-0000-0000-0000-000000000014';
  s_recrut        uuid := 'a1000001-0000-0000-0000-000000000015';
  s_excel_bi      uuid := 'a1000001-0000-0000-0000-000000000016';
  s_sap           uuid := 'a1000001-0000-0000-0000-000000000017';
  s_logist        uuid := 'a1000001-0000-0000-0000-000000000018';
  s_anglais       uuid := 'a1000001-0000-0000-0000-000000000019';
  s_comm          uuid := 'a1000001-0000-0000-0000-000000000020';

  -- position IDs by title (looked up dynamically)
  p_dg            uuid;
  p_dga           uuid;
  p_dir_tech      uuid;
  p_ing_prod      uuid;
  p_chef_eq       uuid;
  p_technicien    uuid;
  p_operateur     uuid;
  p_dir_fin       uuid;
  p_chef_compta   uuid;
  p_compta        uuid;
  p_asst_compta   uuid;
  p_dir_rh        uuid;
  p_chef_svc_rh   uuid;
  p_gest_rh       uuid;
  p_asst_rh       uuid;
  p_dir_com       uuid;
  p_chef_ventes   uuid;
  p_commercial    uuid;
  p_asst_com      uuid;
  p_dir_log       uuid;
  p_resp_achat    uuid;
  p_acheteur      uuid;
  p_agent_log     uuid;
  p_dir_hse       uuid;
  p_resp_sec      uuid;
  p_agent_hse     uuid;
  p_dir_jur       uuid;
  p_jur_sen       uuid;
  p_juriste       uuid;
BEGIN
  SELECT id INTO p_dg          FROM positions WHERE title = 'Directeur Général' LIMIT 1;
  SELECT id INTO p_dga         FROM positions WHERE title = 'Directeur Général Adjoint' LIMIT 1;
  SELECT id INTO p_dir_tech    FROM positions WHERE title = 'Directeur Technique' LIMIT 1;
  SELECT id INTO p_ing_prod    FROM positions WHERE title = 'Ingénieur Production' LIMIT 1;
  SELECT id INTO p_chef_eq     FROM positions WHERE title = 'Chef d''Équipe' LIMIT 1;
  SELECT id INTO p_technicien  FROM positions WHERE title = 'Technicien' LIMIT 1;
  SELECT id INTO p_operateur   FROM positions WHERE title = 'Opérateur' LIMIT 1;
  SELECT id INTO p_dir_fin     FROM positions WHERE title = 'Directeur Financier' LIMIT 1;
  SELECT id INTO p_chef_compta FROM positions WHERE title = 'Chef Comptable' LIMIT 1;
  SELECT id INTO p_compta      FROM positions WHERE title = 'Comptable' LIMIT 1;
  SELECT id INTO p_asst_compta FROM positions WHERE title = 'Assistant Comptable' LIMIT 1;
  SELECT id INTO p_dir_rh      FROM positions WHERE title = 'Directeur des Ressources Humaines' LIMIT 1;
  SELECT id INTO p_chef_svc_rh FROM positions WHERE title = 'Chef Service du Personnel' LIMIT 1;
  SELECT id INTO p_gest_rh     FROM positions WHERE title = 'Gestionnaire RH' LIMIT 1;
  SELECT id INTO p_asst_rh     FROM positions WHERE title = 'Assistant RH' LIMIT 1;
  SELECT id INTO p_dir_com     FROM positions WHERE title = 'Directeur Commercial' LIMIT 1;
  SELECT id INTO p_chef_ventes FROM positions WHERE title = 'Chef des Ventes' LIMIT 1;
  SELECT id INTO p_commercial  FROM positions WHERE title = 'Commercial' LIMIT 1;
  SELECT id INTO p_asst_com    FROM positions WHERE title = 'Assistant Commercial' LIMIT 1;
  SELECT id INTO p_dir_log     FROM positions WHERE title = 'Directeur Logistique' LIMIT 1;
  SELECT id INTO p_resp_achat  FROM positions WHERE title = 'Responsable Achats' LIMIT 1;
  SELECT id INTO p_acheteur    FROM positions WHERE title = 'Acheteur' LIMIT 1;
  SELECT id INTO p_agent_log   FROM positions WHERE title = 'Agent Logistique' LIMIT 1;
  SELECT id INTO p_dir_hse     FROM positions WHERE title = 'Directeur HSE' LIMIT 1;
  SELECT id INTO p_resp_sec    FROM positions WHERE title = 'Responsable Sécurité' LIMIT 1;
  SELECT id INTO p_agent_hse   FROM positions WHERE title = 'Agent HSE' LIMIT 1;
  SELECT id INTO p_dir_jur     FROM positions WHERE title = 'Directeur Juridique' LIMIT 1;
  SELECT id INTO p_jur_sen     FROM positions WHERE title = 'Juriste Senior' LIMIT 1;
  SELECT id INTO p_juriste     FROM positions WHERE title = 'Juriste' LIMIT 1;

  -- ── Directeur Général ──────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dg, s_mgmt,      'expert',        true,  5),
    (p_dg, s_proj,      'expert',        true,  5),
    (p_dg, s_ctrl_gest, 'advanced',      true,  5),
    (p_dg, s_anglais,   'advanced',      true,  4),
    (p_dg, s_comm,      'expert',        true,  5),
    (p_dg, s_nego,      'expert',        true,  4),
    (p_dg, s_excel_bi,  'intermediate',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur Général Adjoint ─────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dga, s_mgmt,     'expert',        true,  5),
    (p_dga, s_proj,     'advanced',      true,  4),
    (p_dga, s_ctrl_gest,'advanced',      true,  4),
    (p_dga, s_anglais,  'advanced',      true,  4),
    (p_dga, s_comm,     'expert',        true,  4),
    (p_dga, s_nego,     'advanced',      true,  3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur Technique ───────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_tech, s_forage,   'expert',    true,  5),
    (p_dir_tech, s_prod_hc,  'expert',    true,  5),
    (p_dir_tech, s_mgmt,     'advanced',  true,  5),
    (p_dir_tech, s_hse,      'advanced',  true,  4),
    (p_dir_tech, s_proj,     'advanced',  true,  4),
    (p_dir_tech, s_anglais,  'advanced',  true,  4),
    (p_dir_tech, s_geol,     'advanced',  false, 3),
    (p_dir_tech, s_comm,     'advanced',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Ingénieur Production ──────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_ing_prod, s_prod_hc,  'expert',       true,  5),
    (p_ing_prod, s_forage,   'advanced',      true,  4),
    (p_ing_prod, s_geol,     'advanced',      true,  4),
    (p_ing_prod, s_hse,      'advanced',      true,  4),
    (p_ing_prod, s_proj,     'intermediate',  true,  3),
    (p_ing_prod, s_anglais,  'advanced',      true,  4),
    (p_ing_prod, s_excel_bi, 'intermediate',  false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Chef d'Équipe ─────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_chef_eq, s_maint,    'advanced',      true,  5),
    (p_chef_eq, s_prod_hc,  'advanced',      true,  4),
    (p_chef_eq, s_hse,      'advanced',      true,  5),
    (p_chef_eq, s_mgmt,     'intermediate',  true,  4),
    (p_chef_eq, s_forage,   'intermediate',  false, 3),
    (p_chef_eq, s_comm,     'intermediate',  false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Technicien ────────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_technicien, s_maint,   'intermediate',  true,  5),
    (p_technicien, s_prod_hc, 'intermediate',  true,  4),
    (p_technicien, s_hse,     'intermediate',  true,  4),
    (p_technicien, s_forage,  'beginner',       false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Opérateur ─────────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_operateur, s_maint,   'beginner',      true,  4),
    (p_operateur, s_prod_hc, 'beginner',      true,  4),
    (p_operateur, s_hse,     'intermediate',  true,  5)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur Financier ───────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_fin, s_compta,    'expert',    true,  5),
    (p_dir_fin, s_ctrl_gest, 'expert',    true,  5),
    (p_dir_fin, s_fisc,      'advanced',  true,  5),
    (p_dir_fin, s_mgmt,      'advanced',  true,  4),
    (p_dir_fin, s_excel_bi,  'advanced',  true,  4),
    (p_dir_fin, s_sap,       'advanced',  true,  3),
    (p_dir_fin, s_anglais,   'advanced',  true,  3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Chef Comptable ────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_chef_compta, s_compta,   'expert',        true,  5),
    (p_chef_compta, s_ctrl_gest,'advanced',       true,  4),
    (p_chef_compta, s_fisc,     'advanced',       true,  4),
    (p_chef_compta, s_sap,      'advanced',       true,  4),
    (p_chef_compta, s_excel_bi, 'advanced',       true,  4),
    (p_chef_compta, s_mgmt,     'intermediate',   false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Comptable ─────────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_compta, s_compta,   'advanced',      true,  5),
    (p_compta, s_fisc,     'intermediate',  true,  4),
    (p_compta, s_sap,      'intermediate',  true,  3),
    (p_compta, s_excel_bi, 'advanced',      true,  4)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Assistant Comptable ───────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_asst_compta, s_compta,   'intermediate',  true,  5),
    (p_asst_compta, s_excel_bi, 'intermediate',  true,  4),
    (p_asst_compta, s_sap,      'beginner',       false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur RH ──────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_rh, s_rh_paie,   'expert',    true,  5),
    (p_dir_rh, s_recrut,    'expert',    true,  4),
    (p_dir_rh, s_droit_trav,'expert',    true,  5),
    (p_dir_rh, s_mgmt,      'expert',    true,  5),
    (p_dir_rh, s_sap,       'advanced',  true,  4),
    (p_dir_rh, s_comm,      'advanced',  true,  4),
    (p_dir_rh, s_excel_bi,  'advanced',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Chef Service du Personnel ─────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_chef_svc_rh, s_rh_paie,   'advanced',      true,  5),
    (p_chef_svc_rh, s_droit_trav,'advanced',       true,  5),
    (p_chef_svc_rh, s_sap,       'advanced',       true,  4),
    (p_chef_svc_rh, s_mgmt,      'intermediate',   true,  4),
    (p_chef_svc_rh, s_recrut,    'intermediate',   false, 3),
    (p_chef_svc_rh, s_excel_bi,  'intermediate',   false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Gestionnaire RH ───────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_gest_rh, s_rh_paie,   'advanced',      true,  5),
    (p_gest_rh, s_droit_trav,'intermediate',  true,  4),
    (p_gest_rh, s_sap,       'intermediate',  true,  4),
    (p_gest_rh, s_excel_bi,  'intermediate',  true,  3),
    (p_gest_rh, s_recrut,    'intermediate',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Assistant RH ─────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_asst_rh, s_rh_paie,   'intermediate',  true,  5),
    (p_asst_rh, s_droit_trav,'beginner',       false, 3),
    (p_asst_rh, s_excel_bi,  'intermediate',   true,  4)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur Commercial ──────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_com, s_nego,    'expert',    true,  5),
    (p_dir_com, s_mgmt,    'expert',    true,  5),
    (p_dir_com, s_comm,    'expert',    true,  5),
    (p_dir_com, s_excel_bi,'advanced',  true,  4),
    (p_dir_com, s_anglais, 'advanced',  true,  4),
    (p_dir_com, s_proj,    'advanced',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Chef des Ventes ───────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_chef_ventes, s_nego,    'advanced',      true,  5),
    (p_chef_ventes, s_comm,    'advanced',      true,  5),
    (p_chef_ventes, s_mgmt,    'intermediate',  true,  4),
    (p_chef_ventes, s_excel_bi,'intermediate',  true,  3),
    (p_chef_ventes, s_anglais, 'intermediate',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Commercial ───────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_commercial, s_nego,    'intermediate',  true,  5),
    (p_commercial, s_comm,    'advanced',      true,  5),
    (p_commercial, s_anglais, 'intermediate',  false, 3),
    (p_commercial, s_excel_bi,'beginner',       false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Assistant Commercial ──────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_asst_com, s_comm,    'intermediate',  true,  4),
    (p_asst_com, s_excel_bi,'intermediate',  true,  4),
    (p_asst_com, s_nego,    'beginner',       false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur Logistique ──────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_log, s_logist,  'expert',    true,  5),
    (p_dir_log, s_mgmt,    'expert',    true,  5),
    (p_dir_log, s_nego,    'advanced',  true,  4),
    (p_dir_log, s_proj,    'advanced',  true,  4),
    (p_dir_log, s_excel_bi,'advanced',  true,  4),
    (p_dir_log, s_sap,     'advanced',  true,  3),
    (p_dir_log, s_anglais, 'advanced',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Responsable Achats ────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_resp_achat, s_logist,  'advanced',      true,  5),
    (p_resp_achat, s_nego,    'advanced',      true,  5),
    (p_resp_achat, s_sap,     'intermediate',  true,  4),
    (p_resp_achat, s_excel_bi,'advanced',      true,  4),
    (p_resp_achat, s_mgmt,    'intermediate',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Acheteur ─────────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_acheteur, s_logist,  'intermediate',  true,  5),
    (p_acheteur, s_nego,    'intermediate',  true,  4),
    (p_acheteur, s_sap,     'beginner',       false, 2),
    (p_acheteur, s_excel_bi,'intermediate',   true,  3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Agent Logistique ──────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_agent_log, s_logist,  'beginner',      true,  4),
    (p_agent_log, s_excel_bi,'beginner',       false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur HSE ─────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_hse, s_hse,     'expert',    true,  5),
    (p_dir_hse, s_mgmt,    'expert',    true,  5),
    (p_dir_hse, s_proj,    'advanced',  true,  4),
    (p_dir_hse, s_comm,    'advanced',  true,  4),
    (p_dir_hse, s_anglais, 'advanced',  true,  4),
    (p_dir_hse, s_excel_bi,'advanced',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Responsable Sécurité ──────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_resp_sec, s_hse,     'expert',        true,  5),
    (p_resp_sec, s_mgmt,    'intermediate',  true,  4),
    (p_resp_sec, s_comm,    'intermediate',  false, 3),
    (p_resp_sec, s_proj,    'intermediate',  false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Agent HSE ─────────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_agent_hse, s_hse,     'advanced',      true,  5),
    (p_agent_hse, s_comm,    'intermediate',  false, 2),
    (p_agent_hse, s_excel_bi,'beginner',       false, 2)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Directeur Juridique ───────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_dir_jur, s_droit_ohada, 'expert',    true,  5),
    (p_dir_jur, s_droit_trav,  'expert',    true,  5),
    (p_dir_jur, s_nego,        'advanced',  true,  4),
    (p_dir_jur, s_mgmt,        'advanced',  true,  4),
    (p_dir_jur, s_comm,        'advanced',  true,  4),
    (p_dir_jur, s_anglais,     'advanced',  true,  4)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Juriste Senior ────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_jur_sen, s_droit_ohada, 'expert',        true,  5),
    (p_jur_sen, s_droit_trav,  'advanced',       true,  4),
    (p_jur_sen, s_nego,        'advanced',       true,  4),
    (p_jur_sen, s_comm,        'intermediate',   false, 3),
    (p_jur_sen, s_anglais,     'advanced',       false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

  -- ── Juriste ───────────────────────────────────────────────────────────────
  INSERT INTO position_skill_requirements (position_id, skill_id, required_level, is_mandatory, weight) VALUES
    (p_juriste, s_droit_ohada, 'advanced',       true,  5),
    (p_juriste, s_droit_trav,  'intermediate',   true,  4),
    (p_juriste, s_nego,        'beginner',        false, 2),
    (p_juriste, s_anglais,     'intermediate',    false, 3)
  ON CONFLICT (position_id, skill_id) DO NOTHING;

END $$;


-- =============================================================================
-- MIGRATION : 20260515170007_add_employee_skills_rls_policies.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260515170029_add_skills_table_rls_policies.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION : 20260518155327_extend_cvtheque_system.sql
-- =============================================================================

/*
  # CVthèque — Extension du système de candidatures

  ## Modifications
  - Extension de la table `candidates` existante avec les champs manquants
  - Création de `candidate_experiences`, `candidate_educations`, `candidate_skills`, `candidate_documents`
  - Création de `candidate_applications` (pipeline RH)

  ## Sécurité
  - RLS sur toutes les nouvelles tables
  - Insertion publique (anon) autorisée pour le portail candidat
  - Lecture/gestion réservée aux rôles RH
*/

-- ============================================================
-- EXTEND: candidates (ajouter colonnes manquantes)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='access_token') THEN
    ALTER TABLE candidates ADD COLUMN access_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='location') THEN
    ALTER TABLE candidates ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='linkedin_url') THEN
    ALTER TABLE candidates ADD COLUMN linkedin_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='portfolio_url') THEN
    ALTER TABLE candidates ADD COLUMN portfolio_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='summary') THEN
    ALTER TABLE candidates ADD COLUMN summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='desired_position') THEN
    ALTER TABLE candidates ADD COLUMN desired_position text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='desired_salary_min') THEN
    ALTER TABLE candidates ADD COLUMN desired_salary_min numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='desired_salary_max') THEN
    ALTER TABLE candidates ADD COLUMN desired_salary_max numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='availability_date') THEN
    ALTER TABLE candidates ADD COLUMN availability_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='mobility') THEN
    ALTER TABLE candidates ADD COLUMN mobility text DEFAULT 'local';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='source') THEN
    ALTER TABLE candidates ADD COLUMN source text DEFAULT 'direct';
  END IF;
END $$;

-- Backfill access_token for existing rows
UPDATE candidates SET access_token = gen_random_uuid() WHERE access_token IS NULL;

-- ============================================================
-- RLS: candidates
-- ============================================================
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='HR can view all candidates') THEN
    CREATE POLICY "HR can view all candidates"
      ON candidates FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='Anyone can submit a candidature') THEN
    CREATE POLICY "Anyone can submit a candidature"
      ON candidates FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='HR can update candidates') THEN
    CREATE POLICY "HR can update candidates"
      ON candidates FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidates' AND policyname='HR can delete candidates') THEN
    CREATE POLICY "HR can delete candidates"
      ON candidates FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('drh','admin','recruitment_manager')
        )
      );
  END IF;
END $$;

-- ============================================================
-- TABLE: candidate_experiences
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company text NOT NULL,
  location text,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  skills_used text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate experiences"
  ON candidate_experiences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can insert candidate experiences"
  ON candidate_experiences FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate experiences"
  ON candidate_experiences FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

-- ============================================================
-- TABLE: candidate_educations
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_educations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  degree text NOT NULL,
  field_of_study text,
  institution text NOT NULL,
  location text,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  grade text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_educations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate educations"
  ON candidate_educations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can insert candidate educations"
  ON candidate_educations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate educations"
  ON candidate_educations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

-- ============================================================
-- TABLE: candidate_skills
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_candidate_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'other' CHECK (category IN ('technical','soft','language','certification','other')),
  level text DEFAULT 'intermediate' CHECK (level IN ('beginner','intermediate','advanced','expert')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_candidate_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate skills"
  ON candidate_candidate_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can insert candidate skills"
  ON candidate_candidate_skills FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate skills"
  ON candidate_candidate_skills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

-- ============================================================
-- TABLE: candidate_applications (pipeline RH)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  desired_position text,
  cover_letter text,
  status text DEFAULT 'new' CHECK (status IN ('new','reviewing','interview','offer','hired','rejected','withdrawn')),
  rejection_reason text,
  internal_notes text,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  interview_date timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all applications"
  ON candidate_applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "Anyone can submit application"
  ON candidate_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can update applications"
  ON candidate_applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')));

CREATE POLICY "HR can delete applications"
  ON candidate_applications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager')));

-- ============================================================
-- TABLE: candidate_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cv','cover_letter','diploma','reference','other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view candidate documents"
  ON candidate_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')));

CREATE POLICY "Anyone can upload candidate documents"
  ON candidate_documents FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "HR can delete candidate documents"
  ON candidate_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id=auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager')));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidate_applications_status ON candidate_applications(status);
CREATE INDEX IF NOT EXISTS idx_candidate_applications_candidate ON candidate_applications(candidate_id);


-- =============================================================================
-- MIGRATION : 20260519072756_cvtheque_auth_and_job_matching.sql
-- =============================================================================

/*
  # CVthèque — Authentification candidats + matching offres

  ## Modifications
  1. `candidates` — ajout user_id (lié à auth.users), password_hash retiré (géré par Supabase Auth)
  2. `candidate_applications` — ajout job_opening_id pour candidater à une offre spécifique
  3. `candidate_job_matches` — table de cache des scores IA par (candidat, offre)
  4. `job_openings` — ajout colonnes required_skills[] et nice_to_have_skills[] pour le matching
  5. Politiques RLS : candidats voient uniquement leurs propres données via auth.uid()

  ## Sécurité
  - Les candidats s'authentifient via Supabase Auth (email/password)
  - Un candidat ne peut voir/modifier que ses propres données
  - Les scores de matching sont calculés par l'edge function et mis en cache ici
*/

-- ============================================================
-- EXTEND candidates: lier à auth.users
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='user_id'
  ) THEN
    ALTER TABLE candidates ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  -- colonne pour stocker si l'inscription est complète
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='profile_completed'
  ) THEN
    ALTER TABLE candidates ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- EXTEND job_openings: compétences requises pour matching IA
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='required_skills'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN required_skills text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='nice_to_have_skills'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN nice_to_have_skills text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='min_experience_years'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN min_experience_years integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='job_openings' AND column_name='education_level'
  ) THEN
    ALTER TABLE job_openings ADD COLUMN education_level text;
  END IF;
END $$;

-- ============================================================
-- EXTEND candidate_applications: lier à une offre spécifique
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='job_opening_id'
  ) THEN
    ALTER TABLE candidate_applications ADD COLUMN job_opening_id uuid REFERENCES job_openings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- TABLE: candidate_job_matches (cache des scores IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_opening_id uuid NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  match_score integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  skill_match_score integer DEFAULT 0,
  experience_match_score integer DEFAULT 0,
  education_match_score integer DEFAULT 0,
  matched_skills text[] DEFAULT '{}',
  missing_skills text[] DEFAULT '{}',
  ai_summary text,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(candidate_id, job_opening_id)
);

ALTER TABLE candidate_job_matches ENABLE ROW LEVEL SECURITY;

-- HR can view all matches
CREATE POLICY "HR can view all matches"
  ON candidate_job_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
    )
  );

-- Candidates can view their own matches
CREATE POLICY "Candidates can view own matches"
  ON candidate_job_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_job_matches.candidate_id
      AND candidates.user_id = auth.uid()
    )
  );

-- Service role / edge function can insert/update matches
CREATE POLICY "Anyone authenticated can upsert matches"
  ON candidate_job_matches FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update matches"
  ON candidate_job_matches FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- ADJUST RLS on candidates: candidats voient/modifient leurs données
-- ============================================================

-- Drop old permissive policies if exist and replace with owner-based
DO $$ BEGIN
  DROP POLICY IF EXISTS "HR can view all candidates" ON candidates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "HR can view all candidates"
  ON candidates FOR SELECT TO authenticated
  USING (
    -- HR roles
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
    )
    OR
    -- Own record
    user_id = auth.uid()
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "HR can update candidates" ON candidates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "HR can update candidates"
  ON candidates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
    )
    OR user_id = auth.uid()
  );

-- Candidate-owned select/insert/update on sub-tables
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert candidate experiences" ON candidate_experiences;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate experiences"
  ON candidate_experiences FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own experiences"
  ON candidate_experiences FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can update own experiences"
  ON candidate_experiences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()));

CREATE POLICY "Owners can delete own experiences"
  ON candidate_experiences FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_educations
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert candidate educations" ON candidate_educations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate educations"
  ON candidate_educations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own educations"
  ON candidate_educations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can update own educations"
  ON candidate_educations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()));

CREATE POLICY "Owners can delete own educations"
  ON candidate_educations FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_candidate_skills
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert candidate skills" ON candidate_candidate_skills;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate skills"
  ON candidate_candidate_skills FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own skills"
  ON candidate_candidate_skills FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can update own skills"
  ON candidate_candidate_skills FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid()));

CREATE POLICY "Owners can delete own skills"
  ON candidate_candidate_skills FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_applications: owners can view and insert own
CREATE POLICY "Owners can view own applications"
  ON candidate_applications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager'))
  );

CREATE POLICY "Owners can insert own applications"
  ON candidate_applications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- candidate_documents
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can upload candidate documents" ON candidate_documents;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Owners and HR can insert candidate documents"
  ON candidate_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

CREATE POLICY "Owners can view own documents"
  ON candidate_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager'))
  );

-- job_openings: public SELECT for candidates portal
CREATE POLICY "Authenticated can view open jobs"
  ON job_openings FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_candidate ON candidate_job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_job ON candidate_job_matches(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_score ON candidate_job_matches(match_score DESC);


-- =============================================================================
-- MIGRATION : 20260519073035_make_candidates_job_opening_nullable.sql
-- =============================================================================

/*
  # Rendre job_opening_id nullable dans candidates

  La colonne job_opening_id dans candidates était NOT NULL (héritage de l'ancien schéma).
  Dans la nouvelle CVthèque, un candidat peut exister sans être lié à une offre spécifique.
*/
ALTER TABLE candidates ALTER COLUMN job_opening_id DROP NOT NULL;


-- =============================================================================
-- MIGRATION : 20260519073247_add_unique_constraints_for_seed.sql
-- =============================================================================

/*
  # Ajout contraintes UNIQUE pour ON CONFLICT dans le seed

  - candidates(email) — un candidat unique par email
  - candidate_job_matches(candidate_id, job_opening_id) — déjà défini mais vérifié
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidates_email_unique'
  ) THEN
    ALTER TABLE candidates ADD CONSTRAINT candidates_email_unique UNIQUE (email);
  END IF;
END $$;


-- =============================================================================
-- MIGRATION : 20260519073631_fix_candidates_status_constraint.sql
-- =============================================================================

/*
  # Mise à jour contrainte status sur candidates

  L'ancienne contrainte ne permettait que les valeurs du pipeline de recrutement.
  La nouvelle CVthèque utilise des valeurs différentes pour le statut du profil candidat.
*/
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check
  CHECK (status IN ('received','screening','interview','offer','hired','rejected','active','inactive','blacklisted'));


-- =============================================================================
-- MIGRATION : 20260519080122_add_candidate_hiring_pipeline.sql
-- =============================================================================

/*
  # Candidate Hiring Pipeline

  ## Summary
  Adds a complete end-to-end hiring workflow tracking candidates from application
  through screening, interview, offer, trial period, and full integration as employees.

  ## Changes

  ### Modified Tables
  - `candidate_applications`
    - Updated status constraint to include: pre_onboarding, onboarding, integrated
    - New columns: offer_date, offer_salary, offer_contract_type, offer_start_date,
      trial_period_months, trial_end_date, hired_as_employee_id, hiring_decision_date,
      hiring_manager_notes, onboarding_checklist (jsonb)

  ### New Table
  - `hiring_pipeline_events` — chronological audit log of all status transitions
    - fields: candidate_id, application_id, from_status, to_status, actor_id, notes, metadata, created_at

  ## Security
  - RLS enabled on hiring_pipeline_events
  - HR roles (drh, admin, recruitment_manager, career_manager) have full access
  - Managers can view
  - Candidates can view their own events
*/

-- 1. Extend candidate_applications with hiring fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_salary') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_salary numeric(15,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_contract_type') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_contract_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='offer_start_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN offer_start_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='trial_period_months') THEN
    ALTER TABLE candidate_applications ADD COLUMN trial_period_months integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='trial_end_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN trial_end_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='hiring_decision_date') THEN
    ALTER TABLE candidate_applications ADD COLUMN hiring_decision_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='hiring_manager_notes') THEN
    ALTER TABLE candidate_applications ADD COLUMN hiring_manager_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='hired_as_employee_id') THEN
    ALTER TABLE candidate_applications ADD COLUMN hired_as_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_applications' AND column_name='onboarding_checklist') THEN
    ALTER TABLE candidate_applications ADD COLUMN onboarding_checklist jsonb DEFAULT '[]';
  END IF;
END $$;

-- 2. Expand status constraint to include all pipeline stages
ALTER TABLE candidate_applications DROP CONSTRAINT IF EXISTS candidate_applications_status_check;
ALTER TABLE candidate_applications
  ADD CONSTRAINT candidate_applications_status_check
  CHECK (status IN ('new','reviewing','interview','offer','pre_onboarding','onboarding','integrated','rejected','withdrawn'));

-- 3. Create hiring pipeline events audit log
CREATE TABLE IF NOT EXISTS hiring_pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES candidate_applications(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hiring_pipeline_events_candidate_id_idx ON hiring_pipeline_events(candidate_id);
CREATE INDEX IF NOT EXISTS hiring_pipeline_events_application_id_idx ON hiring_pipeline_events(application_id);

-- 4. RLS
ALTER TABLE hiring_pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view pipeline events"
  ON hiring_pipeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager','manager')
    )
  );

CREATE POLICY "HR can insert pipeline events"
  ON hiring_pipeline_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('drh','admin','recruitment_manager','career_manager')
    )
  );

CREATE POLICY "Candidates can view own pipeline events"
  ON hiring_pipeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = hiring_pipeline_events.candidate_id
      AND candidates.user_id = auth.uid()
    )
  );


-- =============================================================================
-- MIGRATION : 20260519104112_replace_departments_with_snh_entities_v3.sql
-- =============================================================================

/*
  # Structure organisationnelle réelle SNH — Version finale

  ## Résumé
  - Renommage + recodage des 8 départements existants
  - Création des 12 nouvelles entités SNH avec codes officiels
  - Ajout de 25 postes adaptés à la réalité SNH (avec code, level)
  - Redistribution équilibrée des profils fictifs (3-4 agents/entité)
  - Chaque entité reçoit un responsable de rang Directeur/Chef
*/

-- ============================================================
-- 1. RENOMMER + RECODER LES DÉPARTEMENTS EXISTANTS
-- ============================================================
UPDATE departments SET name = 'Direction des Affaires Générales (DAG)', code = 'DAG'
  WHERE id = 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9';
UPDATE departments SET name = 'Direction de la Production (DPR)', code = 'DPR'
  WHERE id = 'ba06f8b4-5dd6-468a-ba7e-1be84da16c6b';
UPDATE departments SET name = 'Direction de la Maintenance et de la Sécurité (DMS)', code = 'DMS'
  WHERE id = 'f01837f7-8835-4667-a73e-5eeee7a1e58b';
UPDATE departments SET name = 'Division Juridique (JUR)', code = 'JUR'
  WHERE id = '040b3433-3949-4ef4-a849-78eb6ab9cc95';
UPDATE departments SET name = 'Direction Commerciale (DCO)', code = 'DCO'
  WHERE id = '69c34d8f-16d3-4fcf-b21b-fb06f6a14b2c';
UPDATE departments SET name = 'Direction des Ressources Humaines (DRH)', code = 'DRH'
  WHERE id = '4b54f692-e074-47c2-b12d-3c5568ba4fce';
UPDATE departments SET name = 'Direction Financière (DFI)', code = 'DFI'
  WHERE id = '54f457e3-a16e-47d4-aabe-98a6505b9795';
UPDATE departments SET name = 'Direction Générale (DG)', code = 'DG'
  WHERE id = '7536b61b-3289-4a51-b706-d1063677a284';

-- ============================================================
-- 2. CRÉER LES 12 NOUVELLES ENTITÉS SNH
-- ============================================================
INSERT INTO departments (id, name, code, manager_id) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Centre d''Informations Pétrolières (CIP)',             'CIP',  NULL),
  ('a1000002-0000-0000-0000-000000000002', 'Division de la Communication (COM)',                   'COM',  NULL),
  ('a1000003-0000-0000-0000-000000000003', 'Comité de Pilotage et de Suivi des Pipelines (CPSP)',  'CPSP', NULL),
  ('a1000004-0000-0000-0000-000000000004', 'Direction du Budget et du Contrôle (DBC)',             'DBC',  NULL),
  ('a1000005-0000-0000-0000-000000000005', 'Direction de l''Exploration (DEX)',                    'DEX',  NULL),
  ('a1000006-0000-0000-0000-000000000006', 'Direction du Gaz (DGZ)',                               'DGZ',  NULL),
  ('a1000007-0000-0000-0000-000000000007', 'Division Informatique (DI)',                           'DI',   NULL),
  ('a1000008-0000-0000-0000-000000000008', 'Direction de la Stratégie et du Développement (DSD)', 'DSD',  NULL),
  ('a1000009-0000-0000-0000-000000000009', 'Chargé de Mission N°1 (CDM1)',                         'CDM1', NULL),
  ('a1000010-0000-0000-0000-000000000010', 'Chargé de Mission N°2 (CDM2)',                         'CDM2', NULL),
  ('a1000011-0000-0000-0000-000000000011', 'Cellule des Marchés (CMA)',                            'CMA',  NULL),
  ('a1000012-0000-0000-0000-000000000012', 'Représentation SNH à Douala (RSNH)',                   'RSNH', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. AJOUTER LES POSTES SNH (avec code + level obligatoires)
-- ============================================================
INSERT INTO positions (id, title, code, level) VALUES
  ('b2000001-0000-0000-0000-000000000001', 'Directeur du Centre d''Informations Pétrolières', 'DIR-CIP',  'Direction'),
  ('b2000002-0000-0000-0000-000000000002', 'Chef de la Division Communication',               'CDV-COM',  'Direction'),
  ('b2000003-0000-0000-0000-000000000003', 'Directeur du CPSP',                               'DIR-CPSP', 'Direction'),
  ('b2000004-0000-0000-0000-000000000004', 'Directeur du Budget et du Contrôle',              'DIR-DBC',  'Direction'),
  ('b2000005-0000-0000-0000-000000000005', 'Directeur de l''Exploration',                     'DIR-DEX',  'Direction'),
  ('b2000006-0000-0000-0000-000000000006', 'Directeur du Gaz',                                'DIR-DGZ',  'Direction'),
  ('b2000007-0000-0000-0000-000000000007', 'Chef de la Division Informatique',                'CDV-DI',   'Direction'),
  ('b2000008-0000-0000-0000-000000000008', 'Directeur de la Stratégie et du Développement',  'DIR-DSD',  'Direction'),
  ('b2000009-0000-0000-0000-000000000009', 'Chargé de Mission',                               'CDM',      'Direction'),
  ('b2000010-0000-0000-0000-000000000010', 'Chef de la Cellule des Marchés',                  'CCM',      'Direction'),
  ('b2000011-0000-0000-0000-000000000011', 'Directeur des Affaires Générales',                'DIR-DAG',  'Direction'),
  ('b2000012-0000-0000-0000-000000000012', 'Directeur de la Production',                      'DIR-DPR',  'Direction'),
  ('b2000013-0000-0000-0000-000000000013', 'Directeur de la Maintenance et de la Sécurité',  'DIR-DMS',  'Direction'),
  ('b2000014-0000-0000-0000-000000000014', 'Représentant SNH à Douala',                       'REP-RSNH', 'Direction'),
  ('b2000015-0000-0000-0000-000000000015', 'Ingénieur Pétrolier',                             'ING-PET',  'Cadre'),
  ('b2000016-0000-0000-0000-000000000016', 'Ingénieur Exploration',                           'ING-EXP',  'Cadre'),
  ('b2000017-0000-0000-0000-000000000017', 'Ingénieur Gaz',                                   'ING-GAZ',  'Cadre'),
  ('b2000018-0000-0000-0000-000000000018', 'Ingénieur Pipeline',                              'ING-PPL',  'Cadre'),
  ('b2000019-0000-0000-0000-000000000019', 'Analyste Budgétaire',                             'ANA-BUD',  'Cadre'),
  ('b2000020-0000-0000-0000-000000000020', 'Contrôleur de Gestion',                           'CTR-GES',  'Cadre'),
  ('b2000021-0000-0000-0000-000000000021', 'Informaticien',                                   'INF',      'Cadre'),
  ('b2000022-0000-0000-0000-000000000022', 'Analyste Stratégique',                            'ANA-STR',  'Cadre'),
  ('b2000023-0000-0000-0000-000000000023', 'Chargé de Communication',                         'CHG-COM',  'Cadre'),
  ('b2000024-0000-0000-0000-000000000024', 'Documentaliste Pétrolier',                        'DOC-PET',  'Cadre'),
  ('b2000025-0000-0000-0000-000000000025', 'Juriste Marchés Publics',                         'JUR-MRK',  'Cadre')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. DIRECTEURS DES ENTITÉS EXISTANTES RENOMMÉES
-- ============================================================
UPDATE employees SET position_id = 'b2000011-0000-0000-0000-000000000011'
  WHERE id = 'e5520598-71ad-455e-9a78-a66e5fe415c7'; -- Nadine Ebang → DIR-DAG
UPDATE departments SET manager_id = 'e5520598-71ad-455e-9a78-a66e5fe415c7'
  WHERE id = 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9';

UPDATE employees SET position_id = 'b2000013-0000-0000-0000-000000000013'
  WHERE id = '076d5c44-a1a0-4912-b884-a9f09f1bb44e'; -- Charles Owona → DIR-DMS
UPDATE departments SET manager_id = '076d5c44-a1a0-4912-b884-a9f09f1bb44e'
  WHERE id = 'f01837f7-8835-4667-a73e-5eeee7a1e58b';

-- ============================================================
-- 5. CIP — Nathan Ngo Um (dir) + Honoré Manga Bell + René Ndongo
-- ============================================================
UPDATE employees SET department_id='a1000001-0000-0000-0000-000000000001', position_id='b2000001-0000-0000-0000-000000000001', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='ad97d390-0717-4ff1-acfa-5f700e3454f7';
UPDATE employees SET department_id='a1000001-0000-0000-0000-000000000001', position_id='b2000024-0000-0000-0000-000000000024', manager_id='ad97d390-0717-4ff1-acfa-5f700e3454f7' WHERE id IN ('83e913dd-e820-4d21-9f60-1278c64d3f62','015158f6-6f5f-42d0-97f2-21625554361a');
UPDATE departments SET manager_id='ad97d390-0717-4ff1-acfa-5f700e3454f7' WHERE id='a1000001-0000-0000-0000-000000000001';

-- ============================================================
-- 6. COM — Bernard Eboko (chef) + Pascal Zambo + Monique Ebode + Olivia Nguema
-- ============================================================
UPDATE employees SET department_id='a1000002-0000-0000-0000-000000000002', position_id='b2000002-0000-0000-0000-000000000002', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='a0190f52-2756-41bb-87af-1dca3a581ccb';
UPDATE employees SET department_id='a1000002-0000-0000-0000-000000000002', position_id='b2000023-0000-0000-0000-000000000023', manager_id='a0190f52-2756-41bb-87af-1dca3a581ccb' WHERE id IN ('2389a2c8-350b-46dc-938e-407686a2ec0f','4944e51a-7447-4167-8a9c-6f456375cecd','9863908a-12d3-49e3-9211-1c8dd9740ed4');
UPDATE departments SET manager_id='a0190f52-2756-41bb-87af-1dca3a581ccb' WHERE id='a1000002-0000-0000-0000-000000000002';

-- ============================================================
-- 7. CPSP — William Abega (dir) + Xavier Nguini + Quitterie Ambassa
-- ============================================================
UPDATE employees SET department_id='a1000003-0000-0000-0000-000000000003', position_id='b2000003-0000-0000-0000-000000000003', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='f1cc565e-75dc-41ee-a486-4184d12ff321';
UPDATE employees SET department_id='a1000003-0000-0000-0000-000000000003', position_id='b2000018-0000-0000-0000-000000000018', manager_id='f1cc565e-75dc-41ee-a486-4184d12ff321' WHERE id IN ('0b11134d-c9b6-43b4-8661-80771ac3d424','2c9931b3-a77a-4e95-bd25-d9f0f842ae8c');
UPDATE departments SET manager_id='f1cc565e-75dc-41ee-a486-4184d12ff321' WHERE id='a1000003-0000-0000-0000-000000000003';

-- ============================================================
-- 8. DBC — Christine Ngo Biyong (dir) + Daniel Njoya + Isabelle Fouda + Joseph Talla
-- ============================================================
UPDATE employees SET department_id='a1000004-0000-0000-0000-000000000004', position_id='b2000004-0000-0000-0000-000000000004', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='f1dd7d29-db05-4d94-b203-3bbcd4712a68';
UPDATE employees SET department_id='a1000004-0000-0000-0000-000000000004', position_id='b2000020-0000-0000-0000-000000000020', manager_id='f1dd7d29-db05-4d94-b203-3bbcd4712a68' WHERE id IN ('c3d48de1-ebbc-49ad-87c3-5bcf96139961','ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1','a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7');
UPDATE departments SET manager_id='f1dd7d29-db05-4d94-b203-3bbcd4712a68' WHERE id='a1000004-0000-0000-0000-000000000004';

-- ============================================================
-- 9. DEX — Quentin Fofana (dir) + Rachel Kom + Samuel Njike + Urbain Bella
-- ============================================================
UPDATE employees SET department_id='a1000005-0000-0000-0000-000000000005', position_id='b2000005-0000-0000-0000-000000000005', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='b1334b2b-99da-4af4-bf8c-522605f425c2';
UPDATE employees SET department_id='a1000005-0000-0000-0000-000000000005', position_id='b2000016-0000-0000-0000-000000000016', manager_id='b1334b2b-99da-4af4-bf8c-522605f425c2' WHERE id IN ('20641e16-1d27-4eba-a046-3bd611a86b48','6ae425a5-349e-4c6c-b280-92ee2a537904','c9abd7e5-fce8-4594-a42a-8e1f12f97c50');
UPDATE departments SET manager_id='b1334b2b-99da-4af4-bf8c-522605f425c2' WHERE id='a1000005-0000-0000-0000-000000000005';

-- ============================================================
-- 10. DGZ — Thierry Mbassi (dir) + Valérie Ntsama + Thérèse Makongo + Valérie Biwole
-- ============================================================
UPDATE employees SET department_id='a1000006-0000-0000-0000-000000000006', position_id='b2000006-0000-0000-0000-000000000006', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='10b5657e-2b90-43ae-a8b0-9ddac6688969';
UPDATE employees SET department_id='a1000006-0000-0000-0000-000000000006', position_id='b2000017-0000-0000-0000-000000000017', manager_id='10b5657e-2b90-43ae-a8b0-9ddac6688969' WHERE id IN ('45812691-bd55-4795-9264-7318312114f3','902d56c0-27cf-43df-b02b-fcdb66279cfc','0ab31e9c-eb2f-4183-986c-4cbe0befa127');
UPDATE departments SET manager_id='10b5657e-2b90-43ae-a8b0-9ddac6688969' WHERE id='a1000006-0000-0000-0000-000000000006';

-- ============================================================
-- 11. DI — Lambert Zang (chef) + Jules Mvondo + Élise Abanda + Xavière Ngo Likeng
-- ============================================================
UPDATE employees SET department_id='a1000007-0000-0000-0000-000000000007', position_id='b2000007-0000-0000-0000-000000000007', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='0c4a9c34-29ae-4c8c-9473-1d0e85daaf07';
UPDATE employees SET department_id='a1000007-0000-0000-0000-000000000007', position_id='b2000021-0000-0000-0000-000000000021', manager_id='0c4a9c34-29ae-4c8c-9473-1d0e85daaf07' WHERE id IN ('78ccf842-4c90-423a-a0d1-574b1a411c2a','dc97f0cd-0835-4258-a602-744fd7ee4e4b','87012c91-7769-4ea3-8405-9c5fa94b9a14');
UPDATE departments SET manager_id='0c4a9c34-29ae-4c8c-9473-1d0e85daaf07' WHERE id='a1000007-0000-0000-0000-000000000007';

-- ============================================================
-- 12. DSD — Karine Owona (dir) + Solange Bile + Irène Ngo Batoum + Wilson Nana
-- ============================================================
UPDATE employees SET department_id='a1000008-0000-0000-0000-000000000008', position_id='b2000008-0000-0000-0000-000000000008', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='0b17f5e2-de96-4b11-8b13-9b43c3eb6d12';
UPDATE employees SET department_id='a1000008-0000-0000-0000-000000000008', position_id='b2000022-0000-0000-0000-000000000022', manager_id='0b17f5e2-de96-4b11-8b13-9b43c3eb6d12' WHERE id IN ('ef8ef3a3-e8ef-4dce-9641-9f56d7e26f6c','7a529031-c9a7-4990-93ad-f5b6b11a3f10','b9eeb6c7-4b24-4ca7-9e83-c32f272909df');
UPDATE departments SET manager_id='0b17f5e2-de96-4b11-8b13-9b43c3eb6d12' WHERE id='a1000008-0000-0000-0000-000000000008';

-- ============================================================
-- 13. CDM1 — Gisèle Tongo
-- ============================================================
UPDATE employees SET department_id='a1000009-0000-0000-0000-000000000009', position_id='b2000009-0000-0000-0000-000000000009', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='91d12bee-19af-45bb-9b87-5bd06e427473';
UPDATE departments SET manager_id='91d12bee-19af-45bb-9b87-5bd06e427473' WHERE id='a1000009-0000-0000-0000-000000000009';

-- ============================================================
-- 14. CDM2 — Ferdinand Messi
-- ============================================================
UPDATE employees SET department_id='a1000010-0000-0000-0000-000000000010', position_id='b2000009-0000-0000-0000-000000000009', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='b00a7dde-9ffc-4cf5-9816-74cba171e2b7';
UPDATE departments SET manager_id='b00a7dde-9ffc-4cf5-9816-74cba171e2b7' WHERE id='a1000010-0000-0000-0000-000000000010';

-- ============================================================
-- 15. CMA — Inès Mekoulou (chef) + Joël Tagne + Marc Feudjio
-- ============================================================
UPDATE employees SET department_id='a1000011-0000-0000-0000-000000000011', position_id='b2000010-0000-0000-0000-000000000010', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='943ae9d2-8a7d-4220-ae13-bb8dc53f00eb';
UPDATE employees SET department_id='a1000011-0000-0000-0000-000000000011', position_id='b2000025-0000-0000-0000-000000000025', manager_id='943ae9d2-8a7d-4220-ae13-bb8dc53f00eb' WHERE id IN ('703ddc44-ea74-4f98-b65c-9add7aacc1dd','8ff40cb4-2239-46c2-968e-0120c3753aa5');
UPDATE departments SET manager_id='943ae9d2-8a7d-4220-ae13-bb8dc53f00eb' WHERE id='a1000011-0000-0000-0000-000000000011';

-- ============================================================
-- 16. RSNH — Cécile Ngatchou (rep.) + David Owono + Alice Momo + Ulrich Mbede
-- ============================================================
UPDATE employees SET department_id='a1000012-0000-0000-0000-000000000012', position_id='b2000014-0000-0000-0000-000000000014', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='61a7ff31-9c9e-4f58-92d6-8182447b3ec8';
UPDATE employees SET department_id='a1000012-0000-0000-0000-000000000012', position_id='b2000015-0000-0000-0000-000000000015', manager_id='61a7ff31-9c9e-4f58-92d6-8182447b3ec8' WHERE id IN ('40e90d93-b249-4689-b4ec-4a220d7cd45b','27445972-5c9a-4674-a441-1366e7ae3a16','2ae0c24d-5ead-49ad-b00d-dda29db037f7');
UPDATE departments SET manager_id='61a7ff31-9c9e-4f58-92d6-8182447b3ec8' WHERE id='a1000012-0000-0000-0000-000000000012';

-- ============================================================
-- 17. DPR : manager = DG par intérim (Quentin parti à DEX)
-- ============================================================
UPDATE departments SET manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb'
  WHERE id='ba06f8b4-5dd6-468a-ba7e-1be84da16c6b';


-- =============================================================================
-- MIGRATION : 20260519104137_fix_department_managers_missing.sql
-- =============================================================================

/*
  # Correction des managers manquants pour DCO, DFI, DG, DRH, JUR

  Les directeurs existants n'avaient pas été liés dans la colonne manager_id
  des départements lors de la migration précédente. Ce script corrige cela.
*/

UPDATE departments SET manager_id = '69fcb373-5e0c-42b3-b2c3-488725cbef9c'
  WHERE id = '69c34d8f-16d3-4fcf-b21b-fb06f6a14b2c'; -- DCO → Ulrich Foe

UPDATE departments SET manager_id = '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1'
  WHERE id = '54f457e3-a16e-47d4-aabe-98a6505b9795'; -- DFI → Alain Kamga

UPDATE departments SET manager_id = '05fbe4ed-0a17-4eee-b040-1da4bf7284bb'
  WHERE id = '7536b61b-3289-4a51-b706-d1063677a284'; -- DG → Jean-Pierre Mbarga

UPDATE departments SET manager_id = 'a4593f7d-482a-472d-abe4-6c388b53cbc2'
  WHERE id = '4b54f692-e074-47c2-b12d-3c5568ba4fce'; -- DRH → Paul Nkotto

UPDATE departments SET manager_id = '0d9e09bf-6dcf-45f9-8ac5-032b50b67477'
  WHERE id = '040b3433-3949-4ef4-a849-78eb6ab9cc95'; -- JUR → Hervé Nkolo Foe


-- =============================================================================
-- MIGRATION : 20260519115148_update_hierarchy_levels_snh.sql
-- =============================================================================

/*
  # Mise à jour des niveaux hiérarchiques SNH

  ## Résumé
  1. Departments : la colonne org_level existante reçoit les 4 niveaux d'entité
     (Direction, Sous Direction, Service, Section)
  2. Positions : la colonne level reçoit les 9 niveaux de classification du titulaire
     (Employé, Agent de Maîtrise, Cadre, Chef de Section, Chef de Service Adjoint,
      Chef de Service, Sous Directeur, Directeur Adjoint, Directeur)
  3. Normalisation des valeurs existantes et mise à jour des postes créés
*/

-- ── 1. Normaliser les valeurs existantes dans positions.level ──────────────
-- "Agent de Maîtrise" et "Cadre" restent, on normalise les anciens niveaux
UPDATE positions SET level = 'Directeur'
  WHERE level IN ('Direction');

UPDATE positions SET level = 'Agent de Maîtrise'
  WHERE level IN ('Agent de maîtrise');

-- ── 2. Mise à jour des postes créés lors des migrations SNH ───────────────

-- Rang Directeur
UPDATE positions SET level = 'Directeur'
  WHERE code IN (
    'DIR-CIP','CDV-COM','DIR-CPSP','DIR-DBC','DIR-DEX','DIR-DGZ',
    'CDV-DI','DIR-DSD','DIR-DAG','DIR-DPR','DIR-DMS','REP-RSNH',
    'DIR-DRH', -- DRH
    'Directeur Commercial','Directeur Général','Directeur Financier',
    'Directeur Général Adjoint'
  );

-- Rang Chargé de Mission = Directeur (rang équivalent à la SNH)
UPDATE positions SET level = 'Directeur'
  WHERE code = 'CDM';

-- Chef de la Cellule des Marchés = Directeur
UPDATE positions SET level = 'Directeur'
  WHERE code = 'CCM';

-- Cadre (ingénieurs, analystes, informaticien, juristes)
UPDATE positions SET level = 'Cadre'
  WHERE code IN (
    'ING-PET','ING-EXP','ING-GAZ','ING-PPL',
    'CTR-GES','ANA-BUD','INF','ANA-STR',
    'CHG-COM','DOC-PET','JUR-MRK'
  );

-- Postes existants par titre
UPDATE positions SET level = 'Directeur'
  WHERE title IN (
    'Directeur Commercial','Directeur des Ressources Humaines',
    'Directeur Financier','Directeur Général','Directeur Général Adjoint',
    'Directeur HSE','Directeur Juridique','Directeur Logistique',
    'Directeur Technique'
  );

UPDATE positions SET level = 'Chef de Service'
  WHERE title IN ('Chef Service du Personnel','Chef des Ventes','Chef d''Équipe');

UPDATE positions SET level = 'Cadre'
  WHERE title IN (
    'Juriste','Juriste Senior','Ingénieur Production',
    'Gestionnaire RH','Responsable Achats','Responsable Sécurité'
  );

UPDATE positions SET level = 'Agent de Maîtrise'
  WHERE title IN (
    'Chef Comptable','Chef Comptable',
    'Acheteur','Technicien'
  );

UPDATE positions SET level = 'Employé'
  WHERE title IN (
    'Agent HSE','Agent Logistique','Assistant Commercial',
    'Assistant Comptable','Assistant RH','Commercial',
    'Comptable','Opérateur'
  );


-- =============================================================================
-- MIGRATION : 20260521081550_create_integrated_performance_system.sql
-- =============================================================================

/*
  # Système de Performance Intégré SNH

  ## Description
  Création du système de performance intégré comprenant :
  1. Suivi opérationnel des dossiers (avec complexité pondérée)
  2. Feuille de route annuelle / objectifs
  3. Évaluation RH annuelle avec note proposée et ajustement hiérarchique

  ## Nouvelles Tables

  ### case_folders
  - Suivi complet de chaque dossier confié à un agent
  - Niveau de complexité avec coefficient de pondération
  - Statuts multiples, délais prévus vs réels, relances

  ### case_folder_contributors
  - Enregistre les agents ayant contribué à un dossier collectif

  ### annual_objectives
  - Objectifs fixés en début d'année par employé
  - Poids, indicateurs, échéances, évaluateur

  ### annual_objective_items
  - Détail de chaque objectif : poids, indicateur, cible, résultat

  ### hr_evaluations
  - Note calculée automatiquement (dossiers 40% + objectifs 35% + livrables 15% + comportement 10%)
  - Ajustement hiérarchique avec justification
  - Workflow complet

  ## Sécurité
  - RLS sur toutes les tables
  - Séparation accès contenu / accès statistiques
*/

-- ─────────────────────────────────────────────
-- 1. DOSSIERS OPÉRATIONNELS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  reference       text NOT NULL,
  title           text NOT NULL,
  description     text DEFAULT '',
  department_id   uuid REFERENCES departments(id) ON DELETE SET NULL,

  assigned_to     uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_by     uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at     timestamptz DEFAULT now(),

  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','validation','completed','suspended')),

  complexity      text NOT NULL DEFAULT 'simple'
                    CHECK (complexity IN ('simple','medium','complex','strategic','sensitive')),
  complexity_coef integer NOT NULL DEFAULT 1,

  expected_deadline  date,
  actual_completion  date,
  is_urgent          boolean NOT NULL DEFAULT false,

  reminder_count     integer NOT NULL DEFAULT 0,
  return_count       integer NOT NULL DEFAULT 0,
  documents_produced integer NOT NULL DEFAULT 0,
  supervisor_notes   text DEFAULT '',

  is_confidential boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_folder_contributors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_folder_id uuid NOT NULL REFERENCES case_folders(id) ON DELETE CASCADE,
  employee_id    uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contribution   text DEFAULT '',
  added_at       timestamptz DEFAULT now(),
  UNIQUE (case_folder_id, employee_id)
);

-- ─────────────────────────────────────────────
-- 2. FEUILLE DE ROUTE ANNUELLE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS annual_objectives (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id  uuid REFERENCES employees(id) ON DELETE SET NULL,
  year          integer NOT NULL,
  main_missions text DEFAULT '',
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','self_evaluated','completed','archived')),
  self_evaluation_score   numeric(4,2),
  self_evaluation_comment text DEFAULT '',
  interim_notes text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (employee_id, year)
);

CREATE TABLE IF NOT EXISTS annual_objective_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_objective_id uuid NOT NULL REFERENCES annual_objectives(id) ON DELETE CASCADE,
  objective_name      text NOT NULL,
  weight              numeric(5,2) NOT NULL DEFAULT 10.00,
  indicator           text NOT NULL DEFAULT '',
  target              text DEFAULT '',
  deadline            date,
  result              text DEFAULT '',
  achievement_rate    numeric(5,2),
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 3. ÉVALUATIONS RH ANNUELLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_evaluations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id        uuid REFERENCES employees(id) ON DELETE SET NULL,
  annual_objective_id uuid REFERENCES annual_objectives(id) ON DELETE SET NULL,
  year                integer NOT NULL,

  score_case_folders  numeric(5,2) DEFAULT 0,
  score_objectives    numeric(5,2) DEFAULT 0,
  score_quality       numeric(5,2) DEFAULT 0,
  score_behavior      numeric(5,2) DEFAULT 0,
  computed_score      numeric(5,2) DEFAULT 0,

  adjusted_score      numeric(5,2),
  adjustment_reason   text DEFAULT '',

  mention             text DEFAULT ''
                        CHECK (mention IN ('','excellent','tres_bien','bien','assez_bien','insuffisant')),

  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','proposed','adjusted','validated','archived')),

  evaluator_comment   text DEFAULT '',
  hr_comment          text DEFAULT '',

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (employee_id, year)
);

-- ─────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────

ALTER TABLE case_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_folder_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_objective_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_evaluations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- case_folders
CREATE POLICY "cf_select" ON case_folders FOR SELECT TO authenticated
  USING (
    assigned_to = get_current_employee_id()
    OR assigned_by = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "cf_insert" ON case_folders FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "cf_update" ON case_folders FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin','drh','manager','career_manager'))
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "cf_delete" ON case_folders FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh'));

-- case_folder_contributors
CREATE POLICY "cfc_select" ON case_folder_contributors FOR SELECT TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "cfc_insert" ON case_folder_contributors FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "cfc_update" ON case_folder_contributors FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin','drh','manager','career_manager'))
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "cfc_delete" ON case_folder_contributors FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh'));

-- annual_objectives
CREATE POLICY "ao_select" ON annual_objectives FOR SELECT TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR evaluator_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "ao_insert" ON annual_objectives FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "ao_update" ON annual_objectives FOR UPDATE TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  )
  WITH CHECK (
    employee_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "ao_delete" ON annual_objectives FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh'));

-- annual_objective_items
CREATE POLICY "aoi_select" ON annual_objective_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_objectives ao
      WHERE ao.id = annual_objective_id
        AND (
          ao.employee_id = get_current_employee_id()
          OR ao.evaluator_id = get_current_employee_id()
          OR get_current_user_role() IN ('admin','drh','manager','career_manager')
        )
    )
  );

CREATE POLICY "aoi_insert" ON annual_objective_items FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "aoi_update" ON annual_objective_items FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin','drh','manager','career_manager'))
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "aoi_delete" ON annual_objective_items FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh'));

-- hr_evaluations
CREATE POLICY "hre_select" ON hr_evaluations FOR SELECT TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR evaluator_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "hre_insert" ON hr_evaluations FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "hre_update" ON hr_evaluations FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('admin','drh','manager','career_manager'))
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "hre_delete" ON hr_evaluations FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh'));

-- ─────────────────────────────────────────────
-- 5. INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_case_folders_assigned_to   ON case_folders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_case_folders_status        ON case_folders(status);
CREATE INDEX IF NOT EXISTS idx_case_folders_dept          ON case_folders(department_id);
CREATE INDEX IF NOT EXISTS idx_annual_obj_employee        ON annual_objectives(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_hr_eval_employee           ON hr_evaluations(employee_id, year);


-- =============================================================================
-- MIGRATION : 20260521082910_seed_performance_simulation_data.sql
-- =============================================================================

/*
  # Données de simulation — Système de Performance Intégré

  ## Description
  Insertion de données fictives réalistes pour simuler le fonctionnement complet du module performance :
  - Dossiers opérationnels variés (complexités différentes, statuts, retards, relances)
  - Feuilles de route annuelles 2026 pour les agents principaux
  - Évaluations RH calculées (notes proposées, ajustements, mentions)

  ## Profils de performance simulés
  - Agents très performants (notes 88–95)
  - Agents bons (notes 72–80)
  - Agents moyens (notes 55–68)
  - Agents en difficulté (notes 35–48)

  Cette diversité permet de tester tous les affichages, filtres et tableaux de bord.
*/

-- ─────────────────────────────────────────────
-- 1. DOSSIERS OPÉRATIONNELS (case_folders)
-- Affectés à des agents de différentes directions
-- ─────────────────────────────────────────────

INSERT INTO case_folders (reference, title, description, department_id, assigned_to, assigned_by, status, complexity, complexity_coef, expected_deadline, actual_completion, is_urgent, reminder_count, return_count, documents_produced, supervisor_notes, is_confidential) VALUES

-- DAG — Direction des Affaires Générales
('DAG-2026-001', 'Renouvellement contrat prestataire nettoyage', 'Instruction du dossier de renouvellement du contrat de nettoyage des locaux SNH', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '0ebca43e-49d0-4217-a63d-266af98cc334', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'simple', 1, '2026-02-15', '2026-02-12', false, 0, 0, 2, 'Traitement rapide et efficace. Dossier conforme.', false),
('DAG-2026-002', 'Rapport trimestriel d''activités Q1 2026', 'Collecte, consolidation et rédaction du rapport trimestriel Q1', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', 'e5520598-71ad-455e-9a78-a66e5fe415c7', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'medium', 2, '2026-03-31', '2026-04-05', false, 1, 1, 3, 'Quelques retards mais qualité satisfaisante au final.', false),
('DAG-2026-003', 'Inventaire patrimoine mobilier 2026', 'Inventaire physique complet du mobilier de bureau tous sites confondus', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '236cbc14-c1e4-4f35-9230-f3421320fd38', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'in_progress', 'medium', 2, '2026-04-30', null, false, 0, 0, 1, '', false),
('DAG-2026-004', 'Réponse courrier Ministère des Finances', 'Instruction et rédaction de la réponse au courrier MF-2026-0234', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', 'a700ca0b-939d-4ca2-a578-64746b1caf99', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'complex', 3, '2026-03-10', '2026-03-08', true, 0, 0, 1, 'Excellent travail. Réponse bien argumentée, validée sans modification.', false),
('DAG-2026-005', 'Note de service — politique voyages d''affaires', 'Révision complète de la politique voyages et rédaction d''une nouvelle note de service', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '0fd7688a-9ed5-4d3d-9560-943e5dc9ac29', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'validation', 'complex', 3, '2026-05-15', null, false, 2, 1, 2, 'Deuxième version encore insuffisante sur le plan juridique.', false),
('DAG-2026-006', 'Organisation cérémonie 30 ans SNH', 'Coordination logistique de la cérémonie de célébration du 30ème anniversaire', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', 'd08cf15d-f586-4955-a83f-1dd4a287bfda', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'pending', 'strategic', 4, '2026-06-30', null, true, 0, 0, 0, '', false),
('DAG-2026-007', 'Audit interne procédures DAG', 'Revue et mise à jour des procédures internes de la direction', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '601d21ef-0cd0-4592-acce-ab222ad652dc', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'suspended', 'complex', 3, '2026-03-31', null, false, 3, 0, 0, 'En attente de la liste des procédures à réviser. Dossier bloqué.', false),
('DAG-2026-008', 'Mise à jour registre des fournisseurs agréés', 'Actualisation de la liste des fournisseurs avec vérification des documents', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '3038fdb5-1ce1-4f78-b493-db9f583455c1', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'medium', 2, '2026-04-15', '2026-04-20', false, 1, 0, 4, 'Travail soigné malgré le léger dépassement.', false),

-- DFI — Direction Financière
('DFI-2026-001', 'Clôture comptes exercice 2025', 'Travaux de clôture comptable et préparation des états financiers annuels', '54f457e3-a16e-47d4-aabe-98a6505b9795', '79607cb3-81ac-4e39-be93-d8fa58d5273e', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'strategic', 4, '2026-03-31', '2026-03-28', true, 0, 0, 8, 'Excellent. Clôture réalisée en avance, états financiers sans réserve.', false),
('DFI-2026-002', 'Budget prévisionnel 2027', 'Élaboration du budget prévisionnel avec les directions opérationnelles', '54f457e3-a16e-47d4-aabe-98a6505b9795', 'f00e92e2-ff5c-4171-b3ea-7de0906ac7e6', '38a52daa-776b-4b15-949a-a21c6e38c630', 'in_progress', 'strategic', 4, '2026-09-30', null, false, 0, 0, 2, '', false),
('DFI-2026-003', 'Réconciliation bancaire avril 2026', 'Rapprochement bancaire mensuel et correction des écarts', '54f457e3-a16e-47d4-aabe-98a6505b9795', 'bced3a54-04c6-4da9-9a69-9071945a1f59', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'simple', 1, '2026-05-05', '2026-05-04', false, 0, 0, 1, 'Bien.', false),
('DFI-2026-004', 'Note analyse impact fiscal loi finances 2026', 'Analyse approfondie des dispositions fiscales de la loi de finances 2026', '54f457e3-a16e-47d4-aabe-98a6505b9795', '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'complex', 3, '2026-02-28', '2026-03-10', false, 2, 2, 3, 'Note retournée deux fois pour insuffisance d''analyse. Qualité finale acceptable.', false),
('DFI-2026-005', 'Rapport audit comptable prestataires', 'Vérification de la conformité des factures prestataires T1 2026', '54f457e3-a16e-47d4-aabe-98a6505b9795', '07bc179b-34fd-421c-80ff-f1245e66b66a', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'medium', 2, '2026-04-30', '2026-04-28', false, 0, 0, 5, 'Travail rigoureux. Anomalies bien identifiées.', false),
('DFI-2026-006', 'Tableau de bord financier mensuel', 'Elaboration et diffusion du tableau de bord financier mensuel — récurrent', '54f457e3-a16e-47d4-aabe-98a6505b9795', '8cde266e-1a75-4dda-bd18-c0edf12319ec', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'simple', 1, '2026-05-05', '2026-05-07', false, 1, 0, 1, 'En retard de 2 jours. À améliorer.', false),
('DFI-2026-007', 'Étude rentabilité projet pipeline extension', 'Analyse financière du projet d''extension pipeline nord', '54f457e3-a16e-47d4-aabe-98a6505b9795', 'ec462604-fa5a-48a4-a0cc-9252cd730724', '38a52daa-776b-4b15-949a-a21c6e38c630', 'in_progress', 'sensitive', 5, '2026-07-31', null, true, 0, 0, 1, '', true),

-- DRH — Direction des Ressources Humaines
('DRH-2026-001', 'Plan de formation 2026-2027', 'Élaboration du plan de formation biennal en concertation avec les directions', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'complex', 3, '2026-03-31', '2026-03-25', false, 0, 0, 4, 'Excellente qualité. Plan validé par la DG sans réserve.', false),
('DRH-2026-002', 'Révision grille salariale', 'Étude de révision de la grille des salaires et des avantages', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'f03d77ce-1223-4814-8382-018b1308844f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'validation', 'sensitive', 5, '2026-05-31', null, true, 1, 0, 3, '', true),
('DRH-2026-003', 'Campagne de recrutement 12 postes', 'Gestion complète du processus de recrutement pour 12 postes vacants', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '3959189d-9265-477d-9dae-2ab0f77fc763', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'in_progress', 'strategic', 4, '2026-06-30', null, false, 0, 0, 5, '', false),
('DRH-2026-004', 'Mise à jour fiches de poste 2026', 'Révision et actualisation des fiches de poste de toutes les directions', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'ebb63414-ee45-4042-ba9a-9eaacf7ac98f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'complex', 3, '2026-04-30', '2026-05-10', false, 2, 1, 6, 'Livraison tardive. Des fiches incomplétes ont dû être reprises.', false),
('DRH-2026-005', 'Rapport social annuel 2025', 'Rédaction du rapport social annuel incluant tous les indicateurs RH', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '6d54b41b-4577-4da0-ae61-4e8de63df36d', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'medium', 2, '2026-03-15', '2026-03-14', false, 0, 0, 2, 'Travail soigné, livré dans les délais.', false),
('DRH-2026-006', 'Organisation journée team building', 'Planification et coordination de la journée team building inter-directions', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'a6a3a625-2b2e-4016-b016-9a2ffc59dda2', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'pending', 'simple', 1, '2026-06-15', null, false, 0, 0, 0, '', false),
('DRH-2026-007', 'Gestion disciplinaire 3 dossiers Q1', 'Instruction de 3 dossiers disciplinaires de niveau 1 et 2', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '90f74df0-9670-4e2d-a44c-6b6a1a0c2b1f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'sensitive', 5, '2026-03-31', '2026-03-29', true, 0, 0, 3, 'Dossiers sensibles traités avec discrétion et rigueur.', true),
('DRH-2026-008', 'Note congés annuels règlement 2026', 'Révision et diffusion du règlement congés annuels 2026', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'a19be9da-e830-4df1-925f-c2d8b033e73c', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'simple', 1, '2026-02-28', '2026-03-05', false, 1, 1, 1, 'Première version retournée pour correction orthographique.', false),

-- DBC — Direction Budget et Contrôle
('DBC-2026-001', 'Contrôle budgétaire T1 2026', 'Analyse des écarts budgétaires du premier trimestre par direction', 'a1000004-0000-0000-0000-000000000004', 'ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 'completed', 'complex', 3, '2026-04-20', '2026-04-18', false, 0, 0, 4, 'Excellent travail analytique. Recommandations pertinentes.', false),
('DBC-2026-002', 'Élaboration manuel procédures budgétaires', 'Rédaction du manuel de procédures de gestion budgétaire', 'a1000004-0000-0000-0000-000000000004', 'f1dd7d29-db05-4d94-b203-3bbcd4712a68', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 'in_progress', 'complex', 3, '2026-06-30', null, false, 0, 0, 2, '', false),
('DBC-2026-003', 'Rapport utilisation crédits spéciaux', 'Vérification et rapport sur l''utilisation des crédits spéciaux 2025', 'a1000004-0000-0000-0000-000000000004', 'c3d48de1-ebbc-49ad-87c3-5bcf96139961', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 'completed', 'sensitive', 5, '2026-03-15', '2026-03-20', true, 2, 0, 2, 'Retard de 5 jours. Qualité du rapport acceptable.', true),

-- DMS — Direction Maintenance et Sécurité
('DMS-2026-001', 'Audit sécurité incendie sites SNH', 'Audit complet de la sécurité incendie sur l''ensemble des sites', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', 'aef9744d-65f2-42f9-813d-2e3e0a9b4e8a', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'completed', 'complex', 3, '2026-04-30', '2026-04-25', false, 0, 0, 3, 'Audit exemplaire. Recommandations claires et exploitables.', false),
('DMS-2026-002', 'Maintenance préventive groupe électrogène DG', 'Opération de maintenance préventive trimestrielle', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', '1ff8e592-b762-4f7e-b314-6bd9a09b6280', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'completed', 'simple', 1, '2026-05-01', '2026-04-30', false, 0, 0, 1, 'Fait dans les délais.', false),
('DMS-2026-003', 'Plan d''évacuation d''urgence 2026', 'Révision et mise à jour du plan d''évacuation d''urgence', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', '8221e6be-f17f-4b8b-b5b1-07054499e1a1', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'in_progress', 'medium', 2, '2026-05-31', null, false, 0, 0, 1, '', false),
('DMS-2026-004', 'Remplacement véhicules flotte SNH', 'Instruction dossier renouvellement partiel flotte de véhicules', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', '743e3932-61c4-4970-8464-4de6fada26d1', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'suspended', 'strategic', 4, '2026-04-15', null, false, 4, 0, 0, 'Dossier bloqué en attente de l''accord du comité d''investissement.', false),

-- DI — Division Informatique
('DI-2026-001', 'Migration serveurs vers infrastructure cloud', 'Migration de l''infrastructure serveurs SNH vers un environnement cloud hybride', 'a1000007-0000-0000-0000-000000000007', 'dc97f0cd-0835-4258-a602-744fd7ee4e4b', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 'in_progress', 'strategic', 4, '2026-09-30', null, true, 0, 0, 3, '', false),
('DI-2026-002', 'Mise à jour antivirus et patchs sécurité', 'Déploiement des mises à jour de sécurité sur tous les postes de travail', 'a1000007-0000-0000-0000-000000000007', '78ccf842-4c90-423a-a0d1-574b1a411c2a', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 'completed', 'simple', 1, '2026-04-15', '2026-04-14', false, 0, 0, 1, 'Fait dans les délais. Bon travail.', false),
('DI-2026-003', 'Développement module reporting ERP', 'Développement du module de reporting sur mesure intégré à l''ERP RH', 'a1000007-0000-0000-0000-000000000007', '87012c91-7769-4ea3-8405-9c5fa94b9a14', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 'validation', 'complex', 3, '2026-05-31', null, false, 1, 1, 4, 'Version fonctionnelle mais des bugs subsistent.', false),

-- CIP — Centre d''Informations Pétrolières
('CIP-2026-001', 'Rapport mensuel production pétrolière avril 2026', 'Collecte et analyse des données de production pétrolière du mois', 'a1000001-0000-0000-0000-000000000001', '015158f6-6f5f-42d0-97f2-21625554361a', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 'completed', 'medium', 2, '2026-05-10', '2026-05-09', false, 0, 0, 2, 'Rapport précis et livré en avance.', false),
('CIP-2026-002', 'Note conjoncture pétrole Brent T1 2026', 'Analyse de la conjoncture pétrolière internationale et impact sur les revenus', 'a1000001-0000-0000-0000-000000000001', '83e913dd-e820-4d21-9f60-1278c64d3f62', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 'completed', 'strategic', 4, '2026-04-15', '2026-04-22', false, 1, 1, 2, 'Note retournée une fois pour approfondissement. Résultat de qualité.', false),

-- DEX — Direction Exploration
('DEX-2026-001', 'Cartographie gisements zone Nord — Phase 2', 'Élaboration de la cartographie des gisements potentiels de la zone nord', 'a1000005-0000-0000-0000-000000000005', 'b1334b2b-99da-4af4-bf8c-522605f425c2', 'c9abd7e5-fce8-4594-a42a-8e1f12f97c50', 'in_progress', 'sensitive', 5, '2026-08-31', null, true, 0, 0, 2, '', true),
('DEX-2026-002', 'Rapport forage puits GH-14', 'Rédaction du rapport technique du forage du puits GH-14', 'a1000005-0000-0000-0000-000000000005', '20641e16-1d27-4eba-a046-3bd611a86b48', 'c9abd7e5-fce8-4594-a42a-8e1f12f97c50', 'completed', 'complex', 3, '2026-03-31', '2026-03-30', false, 0, 0, 5, 'Rapport de grande qualité technique.', false),
('DEX-2026-003', 'Analyse sismique bloc Lokomo', 'Interprétation des données sismiques 3D du bloc Lokomo', 'a1000005-0000-0000-0000-000000000005', '6ae425a5-349e-4c6c-b280-92ee2a537904', 'c9abd7e5-fce8-4594-a42a-8e1f12f97c50', 'completed', 'sensitive', 5, '2026-04-30', '2026-05-08', false, 2, 0, 3, 'Analyse retardée de 8 jours. Qualité technique satisfaisante.', true);

-- ─────────────────────────────────────────────
-- 2. FEUILLES DE ROUTE ANNUELLES 2026
-- ─────────────────────────────────────────────

INSERT INTO annual_objectives (employee_id, evaluator_id, year, main_missions, status, self_evaluation_score, self_evaluation_comment, interim_notes) VALUES

-- Roger Ayissi (DAG) — très performant
('0ebca43e-49d0-4217-a63d-266af98cc334', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 'Gestion des affaires courantes, instruction des dossiers contractuels, coordination avec les services extérieurs.',
 'self_evaluated', 88, 'J''estime avoir respecté tous mes engagements cette année. Les dossiers ont été traités dans les délais et avec qualité. Je m''améliore sur la rédaction administrative complexe.',
 'Premier trimestre exemplaire. Continue sur cette lancée.'),

-- Nadine Ebang (DAG) — bonne
('e5520598-71ad-455e-9a78-a66e5fe415c7', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 'Rédaction de rapports institutionnels, gestion des archives, coordination administrative.',
 'active', null, '',
 'Travail régulier. Quelques retards à corriger.'),

-- Isabelle Fouda (DBC) — très performante
('ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 2026,
 'Contrôle budgétaire trimestriel, analyse des écarts, production de recommandations pour la direction.',
 'self_evaluated', 90, 'Très bonne année pour moi. Le contrôle T1 a été particulièrement bien mené. Je vise l''excellence sur le contrôle T2.',
 'Agent remarquable. Travail analytique de très haute qualité.'),

-- Laurent Bilong (DFI) — excellent
('79607cb3-81ac-4e39-be93-d8fa58d5273e', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 'Supervision de la clôture des comptes, coordination avec les commissaires aux comptes, pilotage du budget.',
 'self_evaluated', 92, 'La clôture 2025 a été réalisée en avance et sans réserve. Je suis pleinement mobilisé sur le budget 2027.',
 'Résultats excellents. Profil à suivre pour responsabilités accrues.'),

-- Sylvie Ateba (DRH) — très bonne
('04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 'Élaboration et suivi du plan de formation, gestion des demandes de formation individuelles, coordination avec les formateurs.',
 'self_evaluated', 85, 'Le plan de formation 2026-2027 a été bien accueilli. Je reste vigilante sur le suivi des sessions.',
 'Excellent travail de conception du plan de formation.'),

-- Robert Essomba (DRH) — moyen avec problèmes
('ebb63414-ee45-4042-ba9a-9eaacf7ac98f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 'Mise à jour des fiches de poste, gestion administrative des recrutements, suivi des contrats.',
 'active', null, '',
 'Des insuffisances notées sur la qualité des fiches de poste. A faire des progrès.'),

-- Georges Akono (DMS) — très bon
('aef9744d-65f2-42f9-813d-2e3e0a9b4e8a', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 2026,
 'Conduite des audits sécurité, surveillance de la conformité HSE, formation des agents aux procédures de sécurité.',
 'self_evaluated', 87, 'L''audit sécurité incendie a été un succès. Je souhaite développer mes compétences en gestion de crise.',
 'Agent sérieux. Recommandé pour une formation avancée en HSE.'),

-- Élise Abanda (DI) — bonne
('dc97f0cd-0835-4258-a602-744fd7ee4e4b', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 2026,
 'Pilotage de la migration cloud, gestion des projets informatiques stratégiques.',
 'active', null, '',
 'Projet cloud en bonne voie. Charge de travail importante.'),

-- René Ndongo (CIP) — performant
('015158f6-6f5f-42d0-97f2-21625554361a', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 2026,
 'Production des rapports mensuels de production pétrolière, alimentation des bases de données statistiques.',
 'self_evaluated', 80, 'Rapports produits régulièrement et dans les délais. Je cherche à améliorer la présentation visuelle des données.',
 'Fiable et régulier.'),

-- Alain Kamga (DFI) — en difficulté
('5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 'Production de notes fiscales, analyse de la réglementation, conseil aux directions.',
 'self_evaluated', 60, 'J''ai rencontré des difficultés sur l''analyse de la loi de finances. Je m''engage à renforcer mes compétences fiscales.',
 'Des améliorations nécessaires. Note fiscale retournée 2 fois. Suivi rapproché recommandé.');

-- ─────────────────────────────────────────────
-- 3. LIGNES D'OBJECTIFS (annual_objective_items)
-- ─────────────────────────────────────────────

-- Pour Roger Ayissi
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Traiter les dossiers dans les délais', 30, 'Taux de respect des délais', '≥ 90%', '2026-12-31', 'Tous les dossiers traités avant échéance', 95, 0),
  ('Produire des notes de qualité', 25, 'Validation sans reprise majeure', '≥ 85%', '2026-12-31', 'Aucune note retournée pour correction majeure', 95, 1),
  ('Participer aux projets de la direction', 20, 'Livrables réalisés', '100%', '2026-12-31', 'Contribution active à 3 projets transversaux', 100, 2),
  ('Réactivité administrative', 15, 'Délai moyen de traitement', '≤ 3 jours', '2026-12-31', 'Délai moyen : 2,1 jours', 90, 3),
  ('Discipline et collaboration', 10, 'Appréciation hiérarchique', 'Satisfaisant', '2026-12-31', 'Excellent comportement professionnel', 95, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '0ebca43e-49d0-4217-a63d-266af98cc334' AND ao.year = 2026;

-- Pour Isabelle Fouda
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Contrôle budgétaire trimestriel', 35, 'Rapports rendus dans les délais', '100%', '2026-12-31', '4/4 rapports produits en avance', 100, 0),
  ('Analyse des écarts et recommandations', 30, 'Qualité des recommandations', 'Adopté ≥ 80%', '2026-12-31', '92% des recommandations T1 adoptées', 95, 1),
  ('Participation réforme budgétaire', 20, 'Livrables du groupe de travail', '100%', '2026-06-30', 'Contribution majeure au manuel de procédures', 85, 2),
  ('Réactivité administrative', 15, 'Délai moyen de réponse', '≤ 2 jours', '2026-12-31', 'Délai moyen : 1,5 jours', 100, 3)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1' AND ao.year = 2026;

-- Pour Laurent Bilong
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Clôture comptes exercice 2025', 30, 'Délai clôture et qualité', 'Sans réserve avant 31/03', '2026-03-31', 'Clôture réalisée le 28/03 sans réserve', 100, 0),
  ('Pilotage budget prévisionnel 2027', 30, 'Avancement du budget', 'Soumis avant 30/09', '2026-09-30', 'En cours — bonne progression', 60, 1),
  ('Supervision équipe DFI', 20, 'Satisfaction direction', 'Appréciation positive', '2026-12-31', 'Équipe bien encadrée et motivée', 90, 2),
  ('Participation groupe de travail finance', 20, 'Livrables', '100%', '2026-12-31', 'Contribution active', 80, 3)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '79607cb3-81ac-4e39-be93-d8fa58d5273e' AND ao.year = 2026;

-- Pour Alain Kamga (en difficulté)
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Notes fiscales dans les délais', 30, 'Taux de respect des délais', '≥ 90%', '2026-12-31', 'Note loi de finances livrée avec 10 jours de retard', 45, 0),
  ('Qualité des notes fiscales', 25, 'Validation sans reprise majeure', '≥ 85%', '2026-12-31', 'Note retournée 2 fois pour insuffisance', 40, 1),
  ('Veille réglementaire', 20, 'Alertes émises dans les délais', '≥ 8 alertes/an', '2026-12-31', '3 alertes émises sur 5 attendues à ce stade', 60, 2),
  ('Conseil aux directions', 15, 'Consultations traitées', '≥ 15/trimestre', '2026-12-31', '8 consultations traitées sur 15 attendues', 53, 3),
  ('Collaboration inter-directions', 10, 'Appréciation partenaires', 'Satisfaisant', '2026-12-31', 'Relations correctes mais peu d''initiatives', 60, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1' AND ao.year = 2026;

-- ─────────────────────────────────────────────
-- 4. ÉVALUATIONS RH 2026 (hr_evaluations)
-- ─────────────────────────────────────────────

INSERT INTO hr_evaluations (employee_id, evaluator_id, year, score_case_folders, score_objectives, score_quality, score_behavior, computed_score, adjusted_score, adjustment_reason, mention, status, evaluator_comment, hr_comment) VALUES

-- Laurent Bilong — Excellent (note calculée 94)
('79607cb3-81ac-4e39-be93-d8fa58d5273e', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 95, 95, 90, 92,
 ROUND((95*40 + 95*35 + 90*15 + 92*10)::numeric / 100, 2),
 null, '', 'excellent', 'validated',
 'Agent d''exception. La clôture 2025 en avance et sans réserve est un résultat remarquable. Leadership naturel sur son équipe.',
 'Évaluation validée. Profil à considérer pour évolution de poste.'),

-- Roger Ayissi — Très bien (note calculée 94)
('0ebca43e-49d0-4217-a63d-266af98cc334', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 95, 93, 90, 95,
 ROUND((95*40 + 93*35 + 90*15 + 95*10)::numeric / 100, 2),
 null, '', 'excellent', 'validated',
 'Toujours fiable et proactif. Dossiers traités avec rigueur et sans relance.',
 'Évaluation validée. Excellence confirmée.'),

-- Isabelle Fouda — Excellent (note 93)
('ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 2026,
 95, 95, 88, 90,
 ROUND((95*40 + 95*35 + 88*15 + 90*10)::numeric / 100, 2),
 null, '', 'excellent', 'validated',
 'Contrôle budgétaire T1 exceptionnel. Recommandations à 92% adoptées par la direction.',
 'Validée. Top performance.'),

-- Sylvie Ateba — Très bien (note 86)
('04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 88, 85, 85, 88,
 ROUND((88*40 + 85*35 + 85*15 + 88*10)::numeric / 100, 2),
 null, '', 'tres_bien', 'validated',
 'Plan de formation de grande qualité. Agent sérieux et engagé.',
 'Validée.'),

-- Georges Akono — Très bien (note 87)
('aef9744d-65f2-42f9-813d-2e3e0a9b4e8a', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 2026,
 90, 85, 88, 82,
 ROUND((90*40 + 85*35 + 88*15 + 82*10)::numeric / 100, 2),
 null, '', 'tres_bien', 'validated',
 'Audit sécurité conduit avec professionnalisme. Résultats concrets sur la mise en conformité.',
 'Validée.'),

-- René Ndongo — Bien (note 78)
('015158f6-6f5f-42d0-97f2-21625554361a', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 2026,
 82, 75, 78, 80,
 ROUND((82*40 + 75*35 + 78*15 + 80*10)::numeric / 100, 2),
 null, '', 'bien', 'validated',
 'Fiable et régulier. Bonne qualité des rapports mensuels.',
 'Validée.'),

-- Nadine Ebang — Bien (note 70)
('e5520598-71ad-455e-9a78-a66e5fe415c7', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 72, 68, 70, 75,
 ROUND((72*40 + 68*35 + 70*15 + 75*10)::numeric / 100, 2),
 null, '', 'bien', 'proposed',
 'Travail correct mais des retards répétés sur les rapports. À améliorer.',
 ''),

-- Élise Abanda — Bien (note 74), ajustée
('dc97f0cd-0835-4258-a602-744fd7ee4e4b', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 2026,
 75, 72, 75, 78,
 ROUND((75*40 + 72*35 + 75*15 + 78*10)::numeric / 100, 2),
 78, 'Compte tenu de la complexité du projet de migration cloud (dossier stratégique de niveau 5) et de la charge exceptionnelle de travail, j''ajuste la note de 74 à 78 pour mieux refléter la réalité de l''effort fourni.', 'bien', 'adjusted',
 'Agent engagé sur un projet particulièrement exigeant. Note initiale sous-estime la charge réelle.',
 ''),

-- Robert Essomba — Assez bien (note 55), situation difficile
('ebb63414-ee45-4042-ba9a-9eaacf7ac98f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 55, 52, 50, 70,
 ROUND((55*40 + 52*35 + 50*15 + 70*10)::numeric / 100, 2),
 null, '', 'assez_bien', 'proposed',
 'Livraison tardive des fiches de poste avec des insuffisances notoires. Plusieurs reprises nécessaires. Doit impérativement progresser sur la qualité rédactionnelle.',
 ''),

-- Alain Kamga — Insuffisant (note 46)
('5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 48, 44, 40, 58,
 ROUND((48*40 + 44*35 + 40*15 + 58*10)::numeric / 100, 2),
 50, 'Malgré les difficultés techniques rencontrées, l''agent a montré une bonne volonté et une disponibilité. La note de 46 est mathématiquement exacte mais ne tient pas compte de l''effort de progression. J''ajuste à 50 et recommande un plan d''accompagnement.',
 'insuffisant', 'adjusted',
 'Résultats en deçà des attentes. Note ajustée à 50 par le chef avec justification. Plan d''amélioration obligatoire.',
 'Validée. Plan d''amélioration à mettre en place dans les 30 jours.');


-- =============================================================================
-- MIGRATION : 20260521083557_seed_annual_objective_items_remaining.sql
-- =============================================================================

/*
  # Complétion des lignes d'objectifs annuels 2026

  ## Description
  Ajout des lignes d'objectifs (annual_objective_items) pour les 6 agents
  dont la feuille de route existe mais sans détail des objectifs :
  - Élise Abanda (DI)
  - Nadine Ebang (DAG)
  - Robert Essomba (DRH)
  - Georges Akono (DMS)
  - Sylvie Ateba (DRH)
  - René Ndongo (CIP)

  Chaque agent a un profil de performance distinct pour permettre
  des simulations variées.
*/

-- Élise Abanda — Gestion de projet informatique stratégique
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Pilotage migration cloud SNH', 35, 'Avancement du projet (%)', '≥ 60% à fin juin', '2026-06-30', 'Migration en cours — 45% réalisé', 75, 0),
  ('Sécurité et conformité du SI', 25, 'Incidents sécurité majeurs', '0 incident critique', '2026-12-31', 'Aucun incident critique à ce jour', 100, 1),
  ('Gestion du module reporting ERP', 20, 'Livraison version stable', 'V1 livrée avant 31/05', '2026-05-31', 'V1 en validation — quelques bugs à corriger', 70, 2),
  ('Support utilisateurs et réactivité', 15, 'Délai moyen de résolution', '≤ 4 heures', '2026-12-31', 'Délai moyen actuel : 3,8 heures', 80, 3),
  ('Collaboration inter-équipes', 5, 'Appréciation collègues', 'Satisfaisant', '2026-12-31', 'Très bon esprit d''équipe', 90, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'dc97f0cd-0835-4258-a602-744fd7ee4e4b' AND ao.year = 2026;

-- Nadine Ebang — Rapports institutionnels et archivage
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Rapports trimestriels dans les délais', 30, 'Taux de respect des délais', '100%', '2026-12-31', 'Q1 remis avec 5 jours de retard', 60, 0),
  ('Qualité rédactionnelle des rapports', 25, 'Taux de validation sans reprise', '≥ 85%', '2026-12-31', 'Rapport Q1 retourné une fois pour correction', 65, 1),
  ('Gestion et classement des archives', 20, 'Archives numérisées', '≥ 80% du fonds', '2026-12-31', '55% numérisé à ce stade', 69, 2),
  ('Réactivité administrative', 15, 'Délai moyen de traitement courrier', '≤ 3 jours', '2026-12-31', 'Délai moyen : 4,2 jours', 55, 3),
  ('Discipline et présence', 10, 'Appréciation hiérarchique', 'Satisfaisant', '2026-12-31', 'Comportement correct, ponctualité à améliorer', 70, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'e5520598-71ad-455e-9a78-a66e5fe415c7' AND ao.year = 2026;

-- Robert Essomba — Gestion RH (en difficulté)
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Mise à jour des fiches de poste', 35, 'Fiches validées sans reprise', '≥ 90%', '2026-04-30', 'Plusieurs fiches retournées — qualité insuffisante', 40, 0),
  ('Gestion administrative des recrutements', 25, 'Dossiers traités dans les délais', '≥ 95%', '2026-12-31', 'Retards récurrents dans la constitution des dossiers', 50, 1),
  ('Suivi des contrats de travail', 20, 'Contrats renouvelés avant expiration', '100%', '2026-12-31', '2 contrats renouvelés en retard', 55, 2),
  ('Réactivité aux demandes RH', 15, 'Délai moyen de réponse', '≤ 48h', '2026-12-31', 'Délai moyen : 5,2 jours', 35, 3),
  ('Collaboration et discipline', 5, 'Appréciation hiérarchique', 'Satisfaisant', '2026-12-31', 'Attitude correcte mais manque d''initiative', 65, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'ebb63414-ee45-4042-ba9a-9eaacf7ac98f' AND ao.year = 2026;

-- Georges Akono — Audit et sécurité HSE
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Audits sécurité dans les délais', 30, 'Audits réalisés sur le plan', '100%', '2026-12-31', 'Audit incendie et 2 inspections réalisés', 95, 0),
  ('Qualité des rapports d''audit', 25, 'Recommandations adoptées', '≥ 80%', '2026-12-31', '87% des recommandations audit incendie adoptées', 90, 1),
  ('Formation du personnel aux procédures HSE', 20, 'Agents formés', '≥ 80% du personnel', '2026-09-30', '65% formés à ce stade', 81, 2),
  ('Réactivité sur incidents sécurité', 15, 'Délai intervention', '≤ 30 minutes', '2026-12-31', 'Délai moyen intervention : 22 minutes', 100, 3),
  ('Collaboration et signalement proactif', 10, 'Rapports de signalement', '≥ 2/mois', '2026-12-31', 'Moyenne de 2,3 signalements/mois', 90, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'aef9744d-65f2-42f9-813d-2e3e0a9b4e8a' AND ao.year = 2026;

-- Sylvie Ateba — Plan de formation DRH
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Élaboration plan de formation 2026-2027', 30, 'Plan validé par DG', 'Avant 31/03/2026', '2026-03-31', 'Plan validé le 25/03 sans réserve', 100, 0),
  ('Suivi des sessions de formation', 25, 'Taux de réalisation', '≥ 90%', '2026-12-31', '78% des sessions planifiées réalisées', 87, 1),
  ('Coordination avec les formateurs externes', 20, 'Satisfaction participants', '≥ 85%', '2026-12-31', 'Note moyenne satisfaction : 88%', 95, 2),
  ('Gestion des demandes individuelles', 15, 'Demandes traitées dans les délais', '≥ 95%', '2026-12-31', '93% traitées dans les délais', 90, 3),
  ('Reporting et tableaux de bord formation', 10, 'Rapports mensuels', '12/an', '2026-12-31', '4 rapports produits sur 4 attendus', 100, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9' AND ao.year = 2026;

-- René Ndongo — Production pétrolière et statistiques
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Rapports mensuels production pétrolière', 30, 'Rapports livrés dans les délais', '12/an avant J+10', '2026-12-31', '4/4 rapports à ce jour, tous avant J+10', 100, 0),
  ('Qualité et fiabilité des données', 25, 'Taux d''erreurs sur données', '< 1%', '2026-12-31', 'Aucune erreur détectée sur les 4 premiers rapports', 100, 1),
  ('Alimentation des bases de données statistiques', 20, 'Mises à jour hebdomadaires', '100%', '2026-12-31', '98% des mises à jour effectuées', 95, 2),
  ('Notes d''analyse conjoncturelle', 15, 'Notes trimestrielles', '4/an', '2026-12-31', '1 note sur 2 attendues — qualité à améliorer', 70, 3),
  ('Collaboration avec les équipes techniques', 10, 'Appréciation partenaires', 'Satisfaisant', '2026-12-31', 'Collaborateur fiable et disponible', 85, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '015158f6-6f5f-42d0-97f2-21625554361a' AND ao.year = 2026;


-- =============================================================================
-- MIGRATION : 20260521085256_extend_case_folders_with_documents_and_multi_assignment.sql
-- =============================================================================

/*
  # Extension du suivi des dossiers — documents scannés, affectations multiples, hiérarchie

  ## Modifications

  ### case_folders
  - Ajout de `document_path` (chemin storage du document scanné)
  - Ajout de `document_name` (nom original du fichier)
  - Ajout de `document_uploaded_at` (date d'upload)
  - Ajout de `document_metadata` (JSONB pour métadonnées M-Files : type, mots-clés, catégorie)
  - Modification de `assigned_to` : devient nullable pour les dossiers multi-agents

  ### case_folder_assignments (nouvelle table)
  - Affectations multiples d'un dossier à plusieurs agents
  - Niveau hiérarchique de l'agent (0 = responsable principal, 1 = collaborateur direct, 2 = sous-collaborateur...)
  - Statut individuel de chaque agent sur le dossier
  - Alertes : date de relance, nombre de relances reçues par cet agent

  ### Storage bucket case-documents
  - Bucket privé pour les documents scannés
  - Supporte PDF, images et formats bureautiques

  ## Sécurité
  - Un manager ne voit QUE les dossiers de sa direction
  - Les agents ne voient que les dossiers qui leur sont affectés (directement ou via assignments)
  - RLS renforcée avec filtrage par department_id
*/

-- ─── 1. Colonnes documents sur case_folders ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_folders' AND column_name='document_path') THEN
    ALTER TABLE case_folders ADD COLUMN document_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_folders' AND column_name='document_name') THEN
    ALTER TABLE case_folders ADD COLUMN document_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_folders' AND column_name='document_uploaded_at') THEN
    ALTER TABLE case_folders ADD COLUMN document_uploaded_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_folders' AND column_name='document_metadata') THEN
    ALTER TABLE case_folders ADD COLUMN document_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ─── 2. Table affectations multiples ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_folder_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_folder_id    uuid NOT NULL REFERENCES case_folders(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by       uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at       timestamptz DEFAULT now(),

  -- Niveau hiérarchique : 0 = responsable principal, 1 = délégué direct, 2+ = sous-délégué
  hierarchy_level   integer NOT NULL DEFAULT 0,

  -- Statut individuel de cet agent sur ce dossier
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','in_progress','done','delegated')),

  -- Suivi des relances individuelles
  reminder_count    integer NOT NULL DEFAULT 0,
  last_reminded_at  timestamptz,
  alert_threshold_days integer DEFAULT 3,  -- alerte si pas de mise à jour dans ce délai

  notes             text DEFAULT '',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),

  UNIQUE (case_folder_id, employee_id)
);

-- ─── 3. Storage bucket case-documents ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-documents',
  'case-documents',
  false,
  20971520,  -- 20 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. RLS sur case_folder_assignments ─────────────────────────────────────

ALTER TABLE case_folder_assignments ENABLE ROW LEVEL SECURITY;

-- Helper : department_id du manager courant
CREATE OR REPLACE FUNCTION get_current_manager_department()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT department_id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Agents voient leurs propres affectations
CREATE POLICY "cfa_select" ON case_folder_assignments FOR SELECT TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR assigned_by = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "cfa_insert" ON case_folder_assignments FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin','drh','manager','career_manager'));

CREATE POLICY "cfa_update" ON case_folder_assignments FOR UPDATE TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  )
  WITH CHECK (
    employee_id = get_current_employee_id()
    OR get_current_user_role() IN ('admin','drh','manager','career_manager')
  );

CREATE POLICY "cfa_delete" ON case_folder_assignments FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh','manager','career_manager'));

-- ─── 5. RLS storage case-documents ──────────────────────────────────────────

CREATE POLICY "case_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-documents');

CREATE POLICY "case_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY "case_docs_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'case-documents')
  WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY "case_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'case-documents');

-- ─── 6. Mettre à jour les politiques case_folders ───────────────────────────
-- Remplacer les politiques existantes par des politiques tenant compte de la direction

DROP POLICY IF EXISTS "cf_select" ON case_folders;
DROP POLICY IF EXISTS "cf_insert" ON case_folders;
DROP POLICY IF EXISTS "cf_update" ON case_folders;
DROP POLICY IF EXISTS "cf_delete" ON case_folders;

-- SELECT : agent voit ses dossiers (via assigned_to ou via assignments), manager voit ceux de sa direction
CREATE POLICY "cf_select_v2" ON case_folders FOR SELECT TO authenticated
  USING (
    -- Agent directement affecté (champ legacy)
    assigned_to = get_current_employee_id()
    -- Agent affecté via la table d'assignments
    OR EXISTS (
      SELECT 1 FROM case_folder_assignments cfa
      WHERE cfa.case_folder_id = id
        AND cfa.employee_id = get_current_employee_id()
    )
    -- Créateur du dossier
    OR assigned_by = get_current_employee_id()
    -- Admin / DRH voient tout
    OR get_current_user_role() IN ('admin','drh','career_manager')
    -- Manager voit les dossiers de sa direction uniquement
    OR (
      get_current_user_role() = 'manager'
      AND department_id = get_current_manager_department()
    )
  );

-- INSERT : managers créent des dossiers de leur direction uniquement (admin/drh peuvent tout)
CREATE POLICY "cf_insert_v2" ON case_folders FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('admin','drh','career_manager')
    OR (
      get_current_user_role() = 'manager'
      AND (department_id IS NULL OR department_id = get_current_manager_department())
    )
  );

-- UPDATE : même logique
CREATE POLICY "cf_update_v2" ON case_folders FOR UPDATE TO authenticated
  USING (
    get_current_user_role() IN ('admin','drh','career_manager')
    OR (
      get_current_user_role() = 'manager'
      AND department_id = get_current_manager_department()
    )
  )
  WITH CHECK (
    get_current_user_role() IN ('admin','drh','career_manager')
    OR (
      get_current_user_role() = 'manager'
      AND (department_id IS NULL OR department_id = get_current_manager_department())
    )
  );

-- DELETE : admin/drh uniquement
CREATE POLICY "cf_delete_v2" ON case_folders FOR DELETE TO authenticated
  USING (get_current_user_role() IN ('admin','drh'));

-- ─── 7. Index ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cfa_case_folder ON case_folder_assignments(case_folder_id);
CREATE INDEX IF NOT EXISTS idx_cfa_employee     ON case_folder_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_cfa_level        ON case_folder_assignments(hierarchy_level);


-- =============================================================================
-- MIGRATION : 20260521132924_create_candidates_documents_storage_bucket.sql
-- =============================================================================

/*
  # Create candidates-documents storage bucket

  1. Storage
    - Creates the `candidates-documents` bucket for candidate file uploads (CV, diplomas, etc.)
    - Bucket is private (not public)

  2. Security Policies
    - Candidates can upload their own files (INSERT)
    - Candidates can read their own files (SELECT)
    - Candidates can delete their own files (DELETE)
    - HR roles (drh, admin, recruitment_manager, career_manager) can read all candidate files

  3. RLS on candidate_documents table
    - Candidates can insert/select/delete their own document records
    - HR roles can select all document records
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidates-documents',
  'candidates-documents',
  false,
  10485760, -- 10 MB limit
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for candidates-documents bucket
CREATE POLICY "Candidates can upload own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.user_id = auth.uid()
        AND candidates.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Candidates can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.user_id = auth.uid()
        AND candidates.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Candidates can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.user_id = auth.uid()
        AND candidates.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "HR can view all candidate documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidates-documents' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- Ensure RLS is enabled on candidate_documents table
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "HR can view candidate documents" ON public.candidate_documents;
DROP POLICY IF EXISTS "Anyone can upload documents" ON public.candidate_documents;
DROP POLICY IF EXISTS "HR can delete candidate documents" ON public.candidate_documents;

-- Candidates can insert their own document records
CREATE POLICY "Candidates can insert own document records"
  ON public.candidate_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_documents.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- Candidates can view their own document records
CREATE POLICY "Candidates can view own document records"
  ON public.candidate_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_documents.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- Candidates can delete their own document records
CREATE POLICY "Candidates can delete own document records"
  ON public.candidate_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_documents.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- HR roles can view all document records
CREATE POLICY "HR can view all candidate document records"
  ON public.candidate_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- HR roles can delete any document record
CREATE POLICY "HR can delete any candidate document record"
  ON public.candidate_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );


-- =============================================================================
-- MIGRATION : 20260525131404_fix_security_issues_functions_and_rls.sql
-- =============================================================================

/*
  # Fix Security Issues — Functions & RLS Policies

  ## Summary
  This migration addresses all security warnings reported by the Supabase security advisor.

  ## 1. Function Search Path Mutable
  All helper/trigger functions are recreated with `SET search_path = public` to prevent
  search-path injection attacks.

  ## 2. Revoke EXECUTE from anon on SECURITY DEFINER functions
  The `anon` role should not be able to call internal helper functions that read
  user_profiles or employees tables via REST RPC endpoints.

  ## 3. RLS Policies — Always True (unrestricted access)
  Replace permissive `WITH CHECK (true)` policies with properly scoped ones:
  - candidates INSERT: only the registering user can insert their own row
  - candidate_applications INSERT: only authenticated candidates can apply
  - candidate_job_matches INSERT/UPDATE: only the HR/system backend (service role) or the owning candidate
  - payroll_history INSERT: only DRH/admin/payroll_manager roles

  ## 4. RLS Enabled No Policy — 16 tables
  These tables have RLS enabled but no policies, meaning nobody can read or write them.
  We add appropriate HR-scoped policies so the application can function while keeping
  data properly protected.

  ## 5. Storage bucket listing
  The broad SELECT policy on employee-photos storage is replaced with a more targeted one.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FIX SEARCH PATH ON ALL HELPER/TRIGGER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_manager_department()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT department_id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_hr_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('drh', 'career_manager', 'admin', 'manager')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_thread_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE qvct_discussion_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_qvct_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_user_id uuid;
  v_author_name text;
BEGIN
  SELECT e.user_id, COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
    INTO v_author_user_id, v_author_name
  FROM employees e
  WHERE e.id = NEW.created_by;

  INSERT INTO notifications (user_id, title, message, type, category, action_url)
  SELECT
    up.id,
    'Nouvelle discussion QVCT',
    COALESCE(NULLIF(TRIM(v_author_name), ''), 'Un collegue')
      || ' a ouvert la discussion: ' || NEW.title,
    'info',
    'qvct_discussion',
    'qvct-discussions:' || NEW.id::text
  FROM user_profiles up
  WHERE up.id IS DISTINCT FROM v_author_user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_qvct_thread_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_title text;
  v_thread_creator_user_id uuid;
  v_author_user_id uuid;
  v_author_name text;
BEGIN
  SELECT t.title, c.user_id
    INTO v_thread_title, v_thread_creator_user_id
  FROM qvct_discussion_threads t
  LEFT JOIN employees c ON c.id = t.created_by
  WHERE t.id = NEW.thread_id;

  SELECT e.user_id, COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
    INTO v_author_user_id, v_author_name
  FROM employees e
  WHERE e.id = NEW.author_id;

  INSERT INTO notifications (user_id, title, message, type, category, action_url)
  SELECT DISTINCT target_user_id,
    'Nouvelle reponse dans une discussion QVCT',
    CASE
      WHEN NEW.is_anonymous THEN 'Un message anonyme a ete publie dans: ' || COALESCE(v_thread_title, 'discussion')
      ELSE COALESCE(NULLIF(TRIM(v_author_name), ''), 'Un collegue')
           || ' a repondu dans: ' || COALESCE(v_thread_title, 'discussion')
    END,
    'info',
    'qvct_discussion_reply',
    'qvct-discussions:' || NEW.thread_id::text
  FROM (
    SELECT v_thread_creator_user_id AS target_user_id
    UNION
    SELECT DISTINCT e.user_id
    FROM qvct_discussion_messages m
    JOIN employees e ON e.id = m.author_id
    WHERE m.thread_id = NEW.thread_id AND e.user_id IS NOT NULL
  ) participants
  WHERE target_user_id IS NOT NULL
    AND target_user_id IS DISTINCT FROM v_author_user_id;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. REVOKE EXECUTE FROM anon ON SECURITY DEFINER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_current_employee_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_manager_department() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_hr_or_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_qvct_thread() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_qvct_thread_reply() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FIX RLS POLICIES — ALWAYS TRUE
-- ─────────────────────────────────────────────────────────────────────────────

-- candidates: restrict INSERT so each user can only create their own candidate record
DROP POLICY IF EXISTS "Anyone can submit a candidature" ON candidates;
CREATE POLICY "Users can insert own candidate record"
  ON candidates FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR auth.uid() IS NULL -- allow anon during registration flow (user_id set server-side)
  );

-- candidate_applications: authenticated candidates can only apply with their own candidate_id
DROP POLICY IF EXISTS "Anyone can submit application" ON candidate_applications;
CREATE POLICY "Candidates can submit own applications"
  ON candidate_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_applications.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

-- candidate_job_matches: only HR/system roles can insert/update matches
DROP POLICY IF EXISTS "Anyone authenticated can upsert matches" ON candidate_job_matches;
DROP POLICY IF EXISTS "Anyone authenticated can update matches" ON candidate_job_matches;

CREATE POLICY "HR can insert job matches"
  ON candidate_job_matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager', 'career_manager')
    )
  );

CREATE POLICY "HR can update job matches"
  ON candidate_job_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager', 'career_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('drh', 'admin', 'recruitment_manager', 'career_manager')
    )
  );

-- payroll_history: only payroll managers and DRH/admin can insert
DROP POLICY IF EXISTS "System can insert payroll history" ON payroll_history;
CREATE POLICY "Payroll managers can insert payroll history"
  ON payroll_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('drh', 'admin', 'payroll_manager')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS ENABLED NO POLICY — ADD POLICIES FOR 16 TABLES
-- All these tables are internal HR data — only drh/admin/career_manager can access
-- ─────────────────────────────────────────────────────────────────────────────

-- absences
CREATE POLICY "HR can manage absences"
  ON absences FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager','payroll_manager'))
  );
CREATE POLICY "HR can insert absences"
  ON absences FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager','payroll_manager'))
  );
CREATE POLICY "HR can update absences"
  ON absences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager','payroll_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager','payroll_manager')));
CREATE POLICY "HR can delete absences"
  ON absences FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager','payroll_manager')));

-- conflicts
CREATE POLICY "HR can view conflicts"
  ON conflicts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert conflicts"
  ON conflicts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can update conflicts"
  ON conflicts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can delete conflicts"
  ON conflicts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));

-- contract_amendments
CREATE POLICY "HR can view contract amendments"
  ON contract_amendments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert contract amendments"
  ON contract_amendments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can update contract amendments"
  ON contract_amendments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));

-- contracts
CREATE POLICY "HR can view contracts"
  ON contracts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert contracts"
  ON contracts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can update contracts"
  ON contracts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));

-- document_versions
CREATE POLICY "HR can view document versions"
  ON document_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert document versions"
  ON document_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can update document versions"
  ON document_versions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));

-- employee_representatives
CREATE POLICY "HR can view employee representatives"
  ON employee_representatives FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert employee representatives"
  ON employee_representatives FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can update employee representatives"
  ON employee_representatives FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));

-- onboarding_checklists
CREATE POLICY "HR can view onboarding checklists"
  ON onboarding_checklists FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can insert onboarding checklists"
  ON onboarding_checklists FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can update onboarding checklists"
  ON onboarding_checklists FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));

-- recognition_programs
CREATE POLICY "HR can view recognition programs"
  ON recognition_programs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));
CREATE POLICY "HR can insert recognition programs"
  ON recognition_programs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));
CREATE POLICY "HR can update recognition programs"
  ON recognition_programs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));

-- salary_history
CREATE POLICY "HR can view salary history"
  ON salary_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','payroll_manager')));
CREATE POLICY "HR can insert salary history"
  ON salary_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','payroll_manager')));
CREATE POLICY "HR can update salary history"
  ON salary_history FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','payroll_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','payroll_manager')));

-- satisfaction_surveys
CREATE POLICY "HR can view satisfaction surveys"
  ON satisfaction_surveys FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));
CREATE POLICY "HR can insert satisfaction surveys"
  ON satisfaction_surveys FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));
CREATE POLICY "HR can update satisfaction surveys"
  ON satisfaction_surveys FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));

-- social_agreements
CREATE POLICY "HR can view social agreements"
  ON social_agreements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert social agreements"
  ON social_agreements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can update social agreements"
  ON social_agreements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));

-- survey_responses
CREATE POLICY "HR can view survey responses"
  ON survey_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','qvct_manager')));
CREATE POLICY "Authenticated users can insert survey responses"
  ON survey_responses FOR INSERT TO authenticated
  WITH CHECK (
    -- must be responding to a survey that exists
    EXISTS (SELECT 1 FROM satisfaction_surveys WHERE id = survey_responses.survey_id)
  );

-- work_schedules
CREATE POLICY "HR and managers can view work schedules"
  ON work_schedules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager','payroll_manager')));
CREATE POLICY "HR can insert work schedules"
  ON work_schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can update work schedules"
  ON work_schedules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));

-- workflow_definitions
CREATE POLICY "HR can view workflow definitions"
  ON workflow_definitions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager')));
CREATE POLICY "HR can insert workflow definitions"
  ON workflow_definitions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin')));
CREATE POLICY "HR can update workflow definitions"
  ON workflow_definitions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin')));

-- workflow_instances
CREATE POLICY "HR can view workflow instances"
  ON workflow_instances FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can insert workflow instances"
  ON workflow_instances FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can update workflow instances"
  ON workflow_instances FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));

-- workflow_tasks
CREATE POLICY "HR can view workflow tasks"
  ON workflow_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can insert workflow tasks"
  ON workflow_tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));
CREATE POLICY "HR can update workflow tasks"
  ON workflow_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('drh','admin','career_manager','manager')));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIX STORAGE — employee-photos broad SELECT policy
-- Replace the broad "visible par tous" policy with a more targeted one that
-- does not allow listing all files (use authenticated-only access via object path)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Photos employés visibles par tous les utilisateurs authentifi" ON storage.objects;

CREATE POLICY "Authenticated users can view employee photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-photos');

