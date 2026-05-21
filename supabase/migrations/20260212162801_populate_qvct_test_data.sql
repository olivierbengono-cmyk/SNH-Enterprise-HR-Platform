/*
  # Données de test pour le module QVCT
  
  1. Avantages sociaux - Mutuelle, transport, tickets restaurant
  2. Annonces récentes - Communications importantes  
  3. Événements - Team building, formations, activités
  4. Suggestions - Idées d'amélioration
  5. Enquêtes de satisfaction - Bien-être au travail
*/

-- Insérer des avantages sociaux
INSERT INTO qvct_benefits (name, benefit_type, description, value, eligibility_criteria, is_active) VALUES
  ('Mutuelle Santé', 'health', 'Couverture santé complète pour l''employé et sa famille', 50000, 'Tous les employés en CDI', true),
  ('Allocation Transport', 'transport', 'Prime mensuelle de transport', 35000, 'Tous les employés', true),
  ('Tickets Restaurant', 'meal', 'Tickets restaurant pour déjeuner (22 jours/mois)', 66000, 'Tous les employés sur site', true),
  ('Allocation Téléphone', 'communication', 'Forfait téléphone professionnel', 25000, 'Tous les employés', true),
  ('Prime de Scolarité', 'education', 'Aide à la scolarité des enfants', 100000, 'CDI avec ancienneté > 2 ans', true),
  ('Assurance Vie', 'insurance', 'Assurance vie et invalidité', 15000, 'Tous les employés en CDI', true)
ON CONFLICT DO NOTHING;

-- Attribution des avantages aux employés actifs
INSERT INTO qvct_employee_benefits (employee_id, benefit_id, start_date, status, monthly_value)
SELECT 
  e.id,
  b.id,
  e.hire_date,
  'active',
  b.value
FROM employees e
CROSS JOIN qvct_benefits b
WHERE e.employment_status = 'active'
  AND b.benefit_type IN ('health', 'transport', 'communication')
LIMIT 300
ON CONFLICT DO NOTHING;

-- Insérer des annonces
DO $$
DECLARE
  v_drh_id uuid;
BEGIN
  SELECT id INTO v_drh_id FROM user_profiles WHERE role = 'drh' LIMIT 1;

  INSERT INTO qvct_announcements (title, content, category, priority, published_by, published_at, target_audience, is_active) VALUES
    ('Nouvelle politique de télétravail', 'À partir du 1er février 2026, tous les employés éligibles pourront bénéficier de 2 jours de télétravail par semaine. Merci de vous rapprocher de votre manager pour organiser votre planning.', 'policy', 'high', v_drh_id, '2026-01-15 09:00:00+00', 'all', true),
    ('Journée portes ouvertes - 20 février 2026', 'La SNH organise une journée portes ouvertes pour les familles des employés le samedi 20 février. Au programme : visite des installations, activités pour enfants et buffet. Inscriptions avant le 10 février.', 'event', 'normal', v_drh_id, '2026-01-20 10:00:00+00', 'all', true),
    ('Nouveau programme de formation continue', 'Lancement de notre programme de formation continue 2026. Plus de 30 formations disponibles dans les domaines du leadership, de la technique et du digital. Consultez le catalogue sur l''intranet.', 'training', 'normal', v_drh_id, '2026-01-10 14:00:00+00', 'all', true),
    ('Résultats exceptionnels pour SNH en 2025', 'Félicitations à toutes les équipes ! La SNH a enregistré une croissance de 12% de son chiffre d''affaires en 2025. Ce succès est le fruit de votre engagement et de votre professionnalisme.', 'general', 'high', v_drh_id, '2026-01-05 08:00:00+00', 'all', true)
  ON CONFLICT DO NOTHING;

  -- Insérer des événements
  INSERT INTO qvct_events (title, description, event_type, location, start_date, end_date, max_participants, registration_deadline, organized_by, status, budget) VALUES
    ('Team Building - Randonnée Mont Cameroun', 'Week-end de cohésion d''équipe avec randonnée au Mont Cameroun. Départ vendredi 14h, retour dimanche 18h. Transport et hébergement pris en charge.', 'team_building', 'Mont Cameroun, Buea', '2026-03-07 14:00:00+00', '2026-03-09 18:00:00+00', 50, '2026-02-28', v_drh_id, 'planned', 5000000),
    ('Journée du Sport SNH', 'Tournoi de football, volleyball et course à pied. Ouvert à tous les employés et leurs familles. Médailles et trophées pour les gagnants !', 'social', 'Stade SNH, Yaoundé', '2026-04-12 08:00:00+00', '2026-04-12 18:00:00+00', 200, '2026-04-05', v_drh_id, 'planned', 2000000),
    ('Séminaire Leadership & Management', 'Séminaire de 2 jours sur les nouvelles pratiques de management et de leadership pour les managers et futurs managers.', 'training', 'Hôtel Hilton, Yaoundé', '2026-02-18 08:00:00+00', '2026-02-19 17:00:00+00', NULL, NULL, v_drh_id, 'completed', 3500000),
    ('Petit-déjeuner mensuel Janvier', 'Petit-déjeuner convivial pour démarrer le mois dans la bonne humeur. Café, viennoiseries et échanges informels.', 'social', 'Salle polyvalente SNH', '2026-01-08 07:30:00+00', '2026-01-08 09:00:00+00', NULL, NULL, v_drh_id, 'completed', 150000)
  ON CONFLICT DO NOTHING;

  -- Insérer des suggestions
  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Aménager une salle de sport dans les locaux', 'Il serait intéressant d''avoir une petite salle de sport avec quelques équipements de base (tapis, haltères, vélos) pour permettre aux employés de faire du sport pendant la pause déjeuner ou après le travail.', 'wellbeing', id, false, 'under_review', 'medium', 15
  FROM employees WHERE employment_status = 'active' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Installer des distributeurs de fruits frais', 'Remplacer certains distributeurs de snacks par des distributeurs de fruits frais pour encourager une alimentation saine.', 'wellbeing', id, false, 'approved', 'low', 23
  FROM employees WHERE employment_status = 'active' OFFSET 1 LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Créer un programme de mentorat', 'Mettre en place un programme de mentorat pour accompagner les nouveaux employés et favoriser le transfert de compétences entre séniors et juniors.', 'improvement', id, false, 'implemented', 'high', 42
  FROM employees WHERE employment_status = 'active' OFFSET 2 LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Organiser un petit-déjeuner mensuel d''équipe', 'Pour renforcer la cohésion, organiser un petit-déjeuner informel une fois par mois où les équipes peuvent échanger dans un cadre convivial.', 'social', id, false, 'implemented', 'low', 8
  FROM employees WHERE employment_status = 'active' OFFSET 3 LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_suggestions (title, description, category, submitted_by, is_anonymous, status, priority, votes_count)
  SELECT 'Mettre en place des horaires flexibles', 'Permettre aux employés d''adapter leurs horaires de travail (arrivée entre 7h et 9h30) pour mieux gérer les contraintes personnelles.', 'improvement', id, false, 'submitted', 'high', 31
  FROM employees WHERE employment_status = 'active' OFFSET 4 LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Insérer des enquêtes de satisfaction
  INSERT INTO qvct_surveys (title, description, survey_type, status, start_date, end_date, created_by, questions, is_anonymous, response_count) VALUES
    ('Enquête Bien-être au Travail 2026', 'Votre avis compte ! Aidez-nous à améliorer votre qualité de vie au travail en répondant à cette enquête anonyme.', 'wellbeing', 'active', '2026-01-15', '2026-02-15', v_drh_id, '[{"id": "q1", "type": "rating", "question": "Comment évaluez-vous votre satisfaction globale au travail ?", "scale": 5}, {"id": "q2", "type": "rating", "question": "Votre charge de travail est-elle équilibrée ?", "scale": 5}, {"id": "q3", "type": "rating", "question": "Vous sentez-vous reconnu(e) dans votre travail ?", "scale": 5}, {"id": "q4", "type": "rating", "question": "L''ambiance de travail est-elle positive ?", "scale": 5}, {"id": "q5", "type": "text", "question": "Quelles sont vos suggestions pour améliorer votre bien-être au travail ?"}]'::jsonb, true, 34),
    ('Évaluation du Programme de Formation 2025', 'Donnez votre avis sur les formations suivies en 2025 pour nous aider à améliorer notre offre.', 'training', 'closed', '2025-12-01', '2025-12-31', v_drh_id, '[{"id": "q1", "type": "rating", "question": "Les formations ont-elles répondu à vos attentes ?", "scale": 5}, {"id": "q2", "type": "rating", "question": "Qualité des formateurs", "scale": 5}, {"id": "q3", "type": "choice", "question": "Quel format préférez-vous ?", "options": ["Présentiel", "En ligne", "Hybride"]}, {"id": "q4", "type": "text", "question": "Quelles formations souhaiteriez-vous suivre en 2026 ?"}]'::jsonb, true, 67)
  ON CONFLICT DO NOTHING;

  -- Insérer quelques incidents de santé
  INSERT INTO qvct_health_incidents (incident_type, employee_id, incident_date, location, description, severity, medical_attention_required, days_lost, reported_by, status)
  SELECT 'minor_injury', id, '2026-01-10 10:30:00+00', 'Atelier technique', 'Petite coupure à la main lors de la manipulation d''outils. Soins de premiers secours administrés.', 'low', true, 0, v_drh_id, 'closed'
  FROM employees WHERE employment_status = 'active' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO qvct_health_incidents (incident_type, employee_id, incident_date, location, description, severity, medical_attention_required, days_lost, reported_by, status)
  SELECT 'near_miss', id, '2026-01-18 14:00:00+00', 'Bureau étage 2', 'Quasi-chute dans les escaliers due à un éclairage défaillant. Aucune blessure.', 'low', false, 0, v_drh_id, 'under_investigation'
  FROM employees WHERE employment_status = 'active' OFFSET 1 LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;

-- Ajouter des participants aux événements planifiés
INSERT INTO qvct_event_participants (event_id, employee_id, attendance_status)
SELECT 
  e.id,
  emp.id,
  'registered'
FROM qvct_events e
CROSS JOIN employees emp
WHERE e.status = 'planned'
  AND emp.employment_status = 'active'
LIMIT 25
ON CONFLICT DO NOTHING;

-- Générer des réponses pour l'enquête bien-être
DO $$
DECLARE
  v_survey_id uuid;
  v_employee_record RECORD;
  v_count integer := 0;
BEGIN
  SELECT id INTO v_survey_id FROM qvct_surveys WHERE survey_type = 'wellbeing' AND status = 'active' LIMIT 1;
  
  IF v_survey_id IS NOT NULL THEN
    FOR v_employee_record IN 
      SELECT id FROM employees WHERE employment_status = 'active' ORDER BY RANDOM() LIMIT 30
    LOOP
      INSERT INTO qvct_survey_responses (survey_id, employee_id, responses, satisfaction_score, submitted_at)
      VALUES (
        v_survey_id,
        v_employee_record.id,
        jsonb_build_object(
          'q1', (3 + RANDOM() * 2)::int,
          'q2', (3 + RANDOM() * 2)::int,
          'q3', (3 + RANDOM() * 2)::int,
          'q4', (4 + RANDOM())::int,
          'q5', 'Globalement satisfait'
        ),
        (3.5 + RANDOM() * 1.5)::numeric(3,2),
        ('2026-01-' || LEAST(16 + v_count, 31)::text || ' 10:00:00+00')::timestamptz
      )
      ON CONFLICT DO NOTHING;
      
      v_count := v_count + 1;
    END LOOP;
  END IF;
END $$;

-- Mettre à jour le compteur de participants
UPDATE qvct_events e
SET participants_count = (
  SELECT COUNT(*) 
  FROM qvct_event_participants p 
  WHERE p.event_id = e.id
)
WHERE e.status = 'planned';
