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
