-- ─── TABLE recruitment_requests (NS193 - Besoins en recrutement) ──────────────
CREATE TABLE IF NOT EXISTS recruitment_requests (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                text        NOT NULL DEFAULT '',
  direction                text        NOT NULL,
  service                  text,
  position_title           text        NOT NULL,
  required_education       text,
  required_experience_years integer    DEFAULT 0,
  required_skills          text[]      DEFAULT '{}',
  contract_type            text        DEFAULT 'CDI',
  positions_count          integer     DEFAULT 1,
  budget_validated         boolean     DEFAULT false,
  justification            text,
  job_description          text,
  desired_start_date       date,
  status                   text        DEFAULT 'submitted'
    CHECK (status IN ('submitted','drh_review','approved','published','rejected','cancelled')),
  requested_by_email       text,
  reviewed_by_email        text,
  review_comment           text,
  job_opening_id           uuid        REFERENCES job_openings(id) ON DELETE SET NULL,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE recruitment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_select" ON recruitment_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','drh','recruitment_manager')));

CREATE POLICY "rr_insert" ON recruitment_requests FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "rr_update" ON recruitment_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','drh','recruitment_manager')));

CREATE POLICY "rr_delete" ON recruitment_requests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','drh')));

-- ─── TABLE jury_evaluations (NS199 - Jury de recrutement) ─────────────────────
CREATE TABLE IF NOT EXISTS jury_evaluations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id        uuid        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id      uuid        REFERENCES candidate_applications(id) ON DELETE CASCADE,
  job_opening_id      uuid        REFERENCES job_openings(id) ON DELETE SET NULL,
  evaluator_email     text        NOT NULL,
  evaluator_name      text,
  evaluation_phase    text        DEFAULT 'interview'
    CHECK (evaluation_phase IN ('preselection','written_test','interview','final')),
  score_presentation  integer     DEFAULT 0 CHECK (score_presentation  BETWEEN 0 AND 10),
  score_communication integer     DEFAULT 0 CHECK (score_communication BETWEEN 0 AND 10),
  score_technical     integer     DEFAULT 0 CHECK (score_technical     BETWEEN 0 AND 10),
  score_leadership    integer     DEFAULT 0 CHECK (score_leadership    BETWEEN 0 AND 10),
  score_behavior      integer     DEFAULT 0 CHECK (score_behavior      BETWEEN 0 AND 10),
  score_motivation    integer     DEFAULT 0 CHECK (score_motivation    BETWEEN 0 AND 10),
  score_teamwork      integer     DEFAULT 0 CHECK (score_teamwork      BETWEEN 0 AND 10),
  score_vision        integer     DEFAULT 0 CHECK (score_vision        BETWEEN 0 AND 10),
  score_availability  integer     DEFAULT 0 CHECK (score_availability  BETWEEN 0 AND 10),
  comment             text,
  recommendation      text
    CHECK (recommendation IN ('strongly_recommend','recommend','neutral','not_recommend','strongly_not_recommend')),
  average_score       numeric(4,1) GENERATED ALWAYS AS (
    ROUND((
      score_presentation + score_communication + score_technical +
      score_leadership   + score_behavior      + score_motivation +
      score_teamwork     + score_vision        + score_availability
    )::numeric / 9, 1)
  ) STORED,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE jury_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "je_select" ON jury_evaluations FOR SELECT TO authenticated USING (true);

CREATE POLICY "je_insert" ON jury_evaluations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "je_update" ON jury_evaluations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','drh','recruitment_manager')));

CREATE POLICY "je_delete" ON jury_evaluations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','drh')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jury_eval_candidate ON jury_evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_jury_eval_application ON jury_evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_rr_status ON recruitment_requests(status);
CREATE INDEX IF NOT EXISTS idx_rr_direction ON recruitment_requests(direction);

-- ─── SEED: Recruitment requests ───────────────────────────────────────────────
INSERT INTO recruitment_requests
  (reference, direction, service, position_title, required_education, required_experience_years,
   required_skills, contract_type, positions_count, budget_validated, justification,
   desired_start_date, status, requested_by_email, reviewed_by_email)
VALUES
  ('DR-2026-001', 'Direction de l''Exploration', 'Service Géologie',
   'Ingénieur Géologue Senior', 'Bac+5/Master', 10,
   ARRAY['Géologie pétrolière','Interprétation sismique','Pétrel SIG'],
   'CDI', 1, true,
   'Départ à la retraite du titulaire. Renforcement indispensable des équipes d''exploration.',
   '2026-09-01', 'approved', 'drh@snh.cm', 'drh@snh.cm'),

  ('DR-2026-002', 'Direction Financière', 'Service Comptabilité',
   'Contrôleur de Gestion', 'Bac+5/Master', 5,
   ARRAY['Contrôle de gestion','Excel avancé','Normes OHADA','Reporting financier'],
   'CDI', 2, true,
   'Augmentation du volume d''activités suite à la croissance du groupe SNH.',
   '2026-08-01', 'drh_review', 'recrutement@snh.cm', NULL),

  ('DR-2026-003', 'Direction des Ressources Humaines', 'Service Formation',
   'Chargé de Formation et Développement', 'Bac+3/Licence', 3,
   ARRAY['Ingénierie pédagogique','E-learning','Gestion de projet RH'],
   'CDD', 1, false,
   'Développement et déploiement du plan de formation 2026-2027.',
   '2026-07-15', 'submitted', 'drh@snh.cm', NULL),

  ('DR-2026-004', 'Direction Technique', 'Service Maintenance & Intégrité',
   'Technicien HSE Senior', 'Bac+2', 4,
   ARRAY['HSE','Sécurité industrielle','Audit sécurité','ATEX'],
   'CDI', 3, true,
   'Renforcement des équipes HSE sur les sites de production onshore et offshore.',
   '2026-10-01', 'published', 'recrutement@snh.cm', 'drh@snh.cm'),

  ('DR-2026-005', 'Direction Juridique', NULL,
   'Juriste Senior – Droit des Affaires Pétrolier', 'Bac+5/Master', 7,
   ARRAY['Droit des sociétés','Droit pétrolier international','Négociation contractuelle'],
   'CDI', 1, true,
   'Appui stratégique au service juridique pour les contrats de partenariat et PSC.',
   '2026-09-15', 'rejected', 'drh@snh.cm', 'drh@snh.cm');

-- ─── SEED: Jury evaluations ───────────────────────────────────────────────────
DO $$
DECLARE
  r          RECORD;
  evaluations integer[][] := ARRAY[
    ARRAY[8,7,9,7,8,9,7,7,8],
    ARRAY[6,8,7,5,7,7,8,6,7],
    ARRAY[9,9,10,8,9,9,9,8,9],
    ARRAY[5,6,6,4,6,5,6,5,6],
    ARRAY[7,8,8,7,8,8,7,8,7]
  ];
  i integer := 1;
  tot integer;
  rec_label text;
BEGIN
  FOR r IN (
    SELECT ca.id AS app_id, ca.candidate_id, ca.job_opening_id
    FROM candidate_applications ca
    ORDER BY ca.created_at DESC
    LIMIT 5
  ) LOOP
    tot := evaluations[i][1]+evaluations[i][2]+evaluations[i][3]+evaluations[i][4]+evaluations[i][5]+
           evaluations[i][6]+evaluations[i][7]+evaluations[i][8]+evaluations[i][9];

    rec_label := CASE
      WHEN tot >= 72 THEN 'strongly_recommend'
      WHEN tot >= 58 THEN 'recommend'
      WHEN tot >= 45 THEN 'neutral'
      ELSE 'not_recommend'
    END;

    INSERT INTO jury_evaluations (
      candidate_id, application_id, job_opening_id,
      evaluator_email, evaluator_name, evaluation_phase,
      score_presentation, score_communication, score_technical,
      score_leadership, score_behavior, score_motivation,
      score_teamwork, score_vision, score_availability,
      comment, recommendation
    ) VALUES (
      r.candidate_id, r.app_id, r.job_opening_id,
      'drh@snh.cm', 'Jury DRH – SNH', 'interview',
      evaluations[i][1], evaluations[i][2], evaluations[i][3],
      evaluations[i][4], evaluations[i][5], evaluations[i][6],
      evaluations[i][7], evaluations[i][8], evaluations[i][9],
      'Évaluation complète lors de l''entretien de présélection.', rec_label
    ) ON CONFLICT DO NOTHING;

    i := i + 1;
  END LOOP;
END $$;
