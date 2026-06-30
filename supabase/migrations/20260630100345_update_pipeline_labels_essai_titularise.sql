
-- Update the candidate application notification trigger to use SNH terminology
CREATE OR REPLACE FUNCTION notify_candidate_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
  v_candidate_email text;
  v_candidate_name text;
  v_job_title text;
  v_status_label text;
  v_notification_user_id uuid;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get candidate info
  SELECT c.id, c.email, c.first_name || ' ' || c.last_name
  INTO v_candidate_id, v_candidate_email, v_candidate_name
  FROM candidates c WHERE c.id = NEW.candidate_id;

  -- Get job title if linked
  IF NEW.job_opening_id IS NOT NULL THEN
    SELECT title INTO v_job_title FROM job_openings WHERE id = NEW.job_opening_id;
  END IF;

  -- Map status to human-readable label (SNH terminology)
  v_status_label := CASE NEW.status
    WHEN 'reviewing'      THEN 'En cours d''étude'
    WHEN 'interview'      THEN 'Entretien planifié'
    WHEN 'offer'          THEN 'Offre reçue'
    WHEN 'pre_onboarding' THEN 'En essai'
    WHEN 'onboarding'     THEN 'Intégration en cours'
    WHEN 'integrated'     THEN 'Titularisé(e) — félicitations !'
    WHEN 'rejected'       THEN 'Non retenu(e) à ce stade'
    WHEN 'withdrawn'      THEN 'Candidature retirée'
    ELSE NEW.status
  END;

  -- Find the user account linked to this candidate email
  SELECT id INTO v_notification_user_id
  FROM user_profiles
  WHERE email = v_candidate_email
  LIMIT 1;

  IF v_notification_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, category, action_url)
    VALUES (
      v_notification_user_id,
      'Mise à jour de votre candidature',
      'Votre candidature' ||
        CASE WHEN v_job_title IS NOT NULL THEN ' pour le poste "' || v_job_title || '"' ELSE '' END ||
        ' est maintenant : ' || v_status_label,
      'recruitment',
      'my-applications'
    );
  END IF;

  RETURN NEW;
END;
$$;
