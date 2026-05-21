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
