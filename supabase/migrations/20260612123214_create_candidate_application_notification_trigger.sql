/*
# Trigger de notifications pour les candidats — mises à jour de dossier

## Problème
Quand un RH fait évoluer le statut d'un dossier dans la CVthèque (ex. passage en
pré-intégration), le candidat ne voyait aucune notification dans son espace. Les
notifications affichées dans le portail étaient synthétiques et générées côté client
à partir de l'historique des candidatures, sans persistance en base.

## Solution

### 1. Fonction trigger SECURITY DEFINER
Crée automatiquement une notification dans la table `notifications` :
- Sur INSERT dans `candidate_applications` → "Candidature reçue"
- Sur UPDATE quand le statut change → message spécifique au nouveau statut
La fonction est SECURITY DEFINER pour contourner les policies RLS lors de l'INSERT
(seul le déclencheur système doit pouvoir insérer pour n'importe quel user_id).

### 2. Trigger AFTER INSERT OR UPDATE
Déclenche la fonction pour chaque ligne modifiée, uniquement si le candidat
possède un compte (user_id non nul dans la table candidates).

## Tables concernées
- `candidate_applications` : table source du trigger
- `notifications` : table cible (insertion de nouvelles notifications)
- `candidates` : jointure pour récupérer le user_id et le nom du candidat
- `job_openings` : jointure pour récupérer le titre du poste
*/

-- ── Fonction trigger ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_candidate_on_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_position    text;
  v_title       text;
  v_message     text;
  v_status_label text;
BEGIN
  -- Récupère le user_id du candidat (peut être null si pas de compte portail)
  SELECT c.user_id
  INTO v_user_id
  FROM candidates c
  WHERE c.id = NEW.candidate_id;

  -- Pas de compte portail → pas de notification
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Titre du poste visé
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
    -- Pas un changement de statut pertinent
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, category, is_read)
  VALUES (v_user_id, v_title, v_message, 'application_update', 'recruitment', false);

  RETURN NEW;
END;
$$;

-- ── Trigger ───────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_candidate_application_notify ON candidate_applications;
CREATE TRIGGER trg_candidate_application_notify
  AFTER INSERT OR UPDATE ON candidate_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_candidate_on_application_change();
