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
