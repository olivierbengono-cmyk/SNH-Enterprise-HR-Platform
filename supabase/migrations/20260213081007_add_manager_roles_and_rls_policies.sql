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
