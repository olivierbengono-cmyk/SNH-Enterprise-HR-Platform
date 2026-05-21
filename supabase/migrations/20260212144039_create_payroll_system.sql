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
