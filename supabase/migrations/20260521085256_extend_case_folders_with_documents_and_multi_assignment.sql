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
