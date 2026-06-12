-- Rebuild the trigger function with EXCEPTION handling so a notification
-- failure never prevents the application from being inserted/updated.
CREATE OR REPLACE FUNCTION notify_candidate_on_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_position     text;
  v_title        text;
  v_message      text;
  v_status_label text;
BEGIN
  -- Get the candidate's portal user_id (null = no account → skip)
  SELECT c.user_id
  INTO v_user_id
  FROM candidates c
  WHERE c.id = NEW.candidate_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_position := COALESCE(
    (SELECT j.title FROM job_openings j WHERE j.id = NEW.job_opening_id),
    NEW.desired_position,
    'ce poste'
  );

  IF TG_OP = 'INSERT' THEN
    v_title   := 'Candidature reçue';
    v_message := 'Votre candidature pour "' || v_position
                 || '" a bien été reçue. L''équipe RH SNH la traitera dans les meilleurs délais.';

  ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    v_status_label := CASE NEW.status
      WHEN 'reviewing'      THEN 'En cours d''étude'
      WHEN 'interview'      THEN 'Entretien planifié'
      WHEN 'offer'          THEN 'Offre reçue'
      WHEN 'pre_onboarding' THEN 'Pré-intégration'
      WHEN 'onboarding'     THEN 'Intégration en cours'
      WHEN 'integrated'     THEN 'Intégré(e) — félicitations !'
      WHEN 'rejected'       THEN 'Non retenu(e) à ce stade'
      WHEN 'withdrawn'      THEN 'Candidature retirée'
      ELSE NEW.status
    END;
    v_title   := 'Mise à jour de votre dossier';
    v_message := 'Votre candidature pour "' || v_position
                 || '" a été mise à jour. Nouveau statut : ' || v_status_label || '.';
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO notifications (user_id, title, message, type, category, is_read)
    VALUES (v_user_id, v_title, v_message, 'application_update', 'recruitment', false);
  EXCEPTION WHEN OTHERS THEN
    -- Notification failure must never block the application transaction
    NULL;
  END;

  RETURN NEW;
END;
$$;