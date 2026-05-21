/*
  # Notifications automatiques pour les discussions QVCT

  1. Contexte
    - Objectif: permettre a tous les utilisateurs de recevoir des notifications
      lors d'activites dans les discussions QVCT (nouvelle discussion ouverte,
      nouvelle reponse dans une discussion a laquelle ils participent).
    - Les notifications doivent pointer vers la discussion concernee afin que
      tout utilisateur puisse y acceder par simple clic.

  2. Changements
    - Ajout de deux fonctions `notify_new_qvct_thread` et `notify_qvct_thread_reply`,
      en SECURITY DEFINER pour pouvoir inserer des notifications pour tous
      les utilisateurs (les policies RLS de la table notifications limitent
      la lecture/mise-a-jour a son propre user_id, mais n'autorisent pas
      l'insertion depuis un client).
    - Creation des triggers correspondants sur qvct_discussion_threads
      (AFTER INSERT) et qvct_discussion_messages (AFTER INSERT).
    - Le champ action_url est renseigne avec `qvct-discussions:<thread_id>`
      afin que le front puisse ouvrir directement la discussion cible.

  3. Securite
    - Les fonctions sont declarees SECURITY DEFINER mais recherchent
      explicitement dans le schema public.
    - Aucune policy existante n'est modifiee ou supprimee.
    - Pas de purge de donnees.

  4. Notes
    - Les notifications sont destinees a tous les user_profiles actifs, a
      l'exception de l'auteur de l'evenement declencheur.
    - Le titre/message sont localises en francais.
*/

CREATE OR REPLACE FUNCTION public.notify_new_qvct_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_user_id uuid;
  v_author_name text;
BEGIN
  SELECT e.user_id, COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
    INTO v_author_user_id, v_author_name
  FROM employees e
  WHERE e.id = NEW.created_by;

  INSERT INTO notifications (user_id, title, message, type, category, action_url)
  SELECT
    up.id,
    'Nouvelle discussion QVCT',
    COALESCE(NULLIF(TRIM(v_author_name), ''), 'Un collegue')
      || ' a ouvert la discussion: ' || NEW.title,
    'info',
    'qvct_discussion',
    'qvct-discussions:' || NEW.id::text
  FROM user_profiles up
  WHERE up.id IS DISTINCT FROM v_author_user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_qvct_thread_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_title text;
  v_thread_creator_user_id uuid;
  v_author_user_id uuid;
  v_author_name text;
BEGIN
  SELECT t.title, c.user_id
    INTO v_thread_title, v_thread_creator_user_id
  FROM qvct_discussion_threads t
  LEFT JOIN employees c ON c.id = t.created_by
  WHERE t.id = NEW.thread_id;

  SELECT e.user_id, COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
    INTO v_author_user_id, v_author_name
  FROM employees e
  WHERE e.id = NEW.author_id;

  INSERT INTO notifications (user_id, title, message, type, category, action_url)
  SELECT DISTINCT target_user_id,
    'Nouvelle reponse dans une discussion QVCT',
    CASE
      WHEN NEW.is_anonymous THEN 'Un message anonyme a ete publie dans: ' || COALESCE(v_thread_title, 'discussion')
      ELSE COALESCE(NULLIF(TRIM(v_author_name), ''), 'Un collegue')
           || ' a repondu dans: ' || COALESCE(v_thread_title, 'discussion')
    END,
    'info',
    'qvct_discussion_reply',
    'qvct-discussions:' || NEW.thread_id::text
  FROM (
    SELECT v_thread_creator_user_id AS target_user_id
    UNION
    SELECT DISTINCT e.user_id
    FROM qvct_discussion_messages m
    JOIN employees e ON e.id = m.author_id
    WHERE m.thread_id = NEW.thread_id AND e.user_id IS NOT NULL
  ) participants
  WHERE target_user_id IS NOT NULL
    AND target_user_id IS DISTINCT FROM v_author_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_qvct_thread ON qvct_discussion_threads;
CREATE TRIGGER trg_notify_new_qvct_thread
AFTER INSERT ON qvct_discussion_threads
FOR EACH ROW EXECUTE FUNCTION public.notify_new_qvct_thread();

DROP TRIGGER IF EXISTS trg_notify_qvct_thread_reply ON qvct_discussion_messages;
CREATE TRIGGER trg_notify_qvct_thread_reply
AFTER INSERT ON qvct_discussion_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_qvct_thread_reply();
