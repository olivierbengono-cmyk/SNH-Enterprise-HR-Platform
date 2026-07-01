
-- Migration NS571 en 2 phases : d'abord supprimer la contrainte, migrer, puis recréer

-- Phase 1 : Supprimer l'ancienne contrainte
ALTER TABLE candidate_applications
  DROP CONSTRAINT IF EXISTS candidate_applications_status_check;

-- Phase 2 : Migrer tous les anciens statuts vers les nouveaux
UPDATE candidate_applications SET status = 'technical_tests'  WHERE status = 'reviewing';
UPDATE candidate_applications SET status = 'psycho_tests'     WHERE status = 'offer';
UPDATE candidate_applications SET status = 'trial'            WHERE status = 'pre_onboarding';
UPDATE candidate_applications SET status = 'assignment'       WHERE status = 'onboarding';

-- Phase 3 : Appliquer la nouvelle contrainte
ALTER TABLE candidate_applications
  ADD CONSTRAINT candidate_applications_status_check
    CHECK (status IN (
      'new',
      'technical_tests',
      'interview',
      'psycho_tests',
      'medical_visit',
      'morality_inquiry',
      'diploma_check',
      'trial',
      'assignment',
      'integrated',
      'rejected',
      'withdrawn'
    ));

-- Phase 4 : Table des notes par étape
CREATE TABLE IF NOT EXISTS pipeline_stage_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
  stage          text NOT NULL,
  notes          text,
  score          numeric(5,2),
  score_max      numeric(5,2),
  evaluator_name text,
  evaluator_role text,
  passed         boolean,
  decision_date  date,
  extra_data     jsonb,
  created_by     text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (application_id, stage)
);

ALTER TABLE pipeline_stage_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_all_stage_notes" ON pipeline_stage_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lecture par le candidat propriétaire
CREATE POLICY "candidate_read_own_stage_notes" ON pipeline_stage_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidate_applications ca
      JOIN candidates c ON c.id = ca.candidate_id
      WHERE ca.id = pipeline_stage_notes.application_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_notes_app ON pipeline_stage_notes(application_id);

-- Phase 5 : Trigger notification mis à jour
CREATE OR REPLACE FUNCTION notify_candidate_on_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title   text;
  v_message text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT c.user_id INTO v_user_id
    FROM candidates c WHERE c.id = NEW.candidate_id;

    IF v_user_id IS NULL THEN RETURN NEW; END IF;

    v_title := CASE NEW.status
      WHEN 'new'              THEN 'Candidature reçue'
      WHEN 'technical_tests'  THEN 'Convocation aux tests techniques'
      WHEN 'interview'        THEN 'Entretien d''embauche planifié'
      WHEN 'psycho_tests'     THEN 'Tests professionnels & psychotechniques'
      WHEN 'medical_visit'    THEN 'Visite médicale d''embauche'
      WHEN 'morality_inquiry' THEN 'Enquête de moralité'
      WHEN 'diploma_check'    THEN 'Vérification des diplômes & actes d''état civil'
      WHEN 'trial'            THEN 'Engagement à l''essai'
      WHEN 'assignment'       THEN 'Affectation et prise de service'
      WHEN 'integrated'       THEN 'Titularisation — félicitations !'
      WHEN 'rejected'         THEN 'Décision finale sur votre candidature'
      WHEN 'withdrawn'        THEN 'Candidature retirée'
      ELSE 'Mise à jour de votre dossier'
    END;

    v_message := CASE NEW.status
      WHEN 'new'              THEN 'Votre dossier a bien été reçu et est en cours d''étude par la DRH.'
      WHEN 'technical_tests'  THEN 'Vous êtes convoqué(e) aux tests techniques organisés par le Jury SNH. Présentez-vous muni(e) de vos pièces d''identité.'
      WHEN 'interview'        THEN 'Votre dossier a été présélectionné. Vous êtes convoqué(e) à un entretien d''embauche avec la DRH.'
      WHEN 'psycho_tests'     THEN 'Vous êtes convoqué(e) aux tests professionnels et psychotechniques réalisés par un cabinet spécialisé.'
      WHEN 'medical_visit'    THEN 'Vous êtes convoqué(e) pour la visite médicale d''embauche auprès du service médical SNH.'
      WHEN 'morality_inquiry' THEN 'Une enquête de moralité est en cours dans le cadre de votre dossier de recrutement.'
      WHEN 'diploma_check'    THEN 'L''authentification de vos diplômes et actes d''état civil est en cours de traitement.'
      WHEN 'trial'            THEN 'Félicitations ! Vous êtes engagé(e) à l''essai à la SNH. Bienvenue dans notre équipe.'
      WHEN 'assignment'       THEN 'Votre affectation et prise de service ont été officialisées. Contactez votre hiérarchie pour les modalités.'
      WHEN 'integrated'       THEN 'Félicitations ! Vous êtes officiellement titularisé(e) à la Société Nationale des Hydrocarbures.'
      WHEN 'rejected'         THEN 'Après examen attentif de votre dossier, votre candidature n''a pas été retenue. Nous vous remercions de l''intérêt porté à la SNH.'
      WHEN 'withdrawn'        THEN 'Votre candidature a été retirée.'
      ELSE 'Votre dossier de candidature a été mis à jour.'
    END;

    INSERT INTO notifications (user_id, title, message, type, category, is_read)
    VALUES (v_user_id, v_title, v_message, 'application_update', 'recruitment', false);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_status_change ON candidate_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON candidate_applications
  FOR EACH ROW EXECUTE FUNCTION notify_candidate_on_application_change();
