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
