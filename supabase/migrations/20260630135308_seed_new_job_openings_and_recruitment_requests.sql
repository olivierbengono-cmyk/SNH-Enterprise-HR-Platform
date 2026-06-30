-- ─── New job openings with varied statuses ────────────────────────────────────

INSERT INTO job_openings (id, title, reference, status, contract_type, location, description, requirements,
  education_level, min_experience_years, required_skills, openings_count, publication_date, closing_date,
  department_id, is_internal)
VALUES
  -- Open offers
  (gen_random_uuid(), 'Juriste d''Affaires', 'SNH-2026-110', 'open', 'CDI', 'Yaoundé',
   'Le/la juriste d''affaires aura en charge le suivi des contrats commerciaux, des contentieux et la veille juridique dans le domaine pétrolier et gazier.',
   'Maîtrise en droit des affaires ou droit pétrolier. Capacité à rédiger des actes juridiques complexes. Expérience en droit OHADA appréciée.',
   'BAC+5 (Master)', 5, ARRAY['Droit OHADA', 'Droit pétrolier', 'Rédaction juridique', 'Contentieux'], 1,
   CURRENT_DATE - 10, CURRENT_DATE + 30, 'a1000001-0000-0000-0000-000000000001', false),

  (gen_random_uuid(), 'Responsable Paie', 'SNH-2026-111', 'open', 'CDI', 'Yaoundé',
   'Gestion complète de la paie pour l''ensemble du personnel SNH (environ 400 collaborateurs). Coordination avec la DRH et la Direction Financière.',
   'Maîtrise du logiciel de paie SAGE ou équivalent. Connaissance approfondie du Code du Travail camerounais et de la réglementation sociale.',
   'BAC+3 (Licence)', 4, ARRAY['Gestion de la paie', 'SAGE Paie', 'Droit social', 'CNPS'], 1,
   CURRENT_DATE - 5, CURRENT_DATE + 45, 'a1000001-0000-0000-0000-000000000001', false),

  (gen_random_uuid(), 'Ingénieur Forage', 'SNH-2026-112', 'open', 'CDI', 'Kribi',
   'Supervision et planification des opérations de forage sur les puits offshore de la SNH. Coordination avec les prestataires et le service géologie.',
   'Ingénieur de forage avec expérience en environnement offshore. Maîtrise des logiciels de simulation de forage (WellPlan, Landmark).',
   'BAC+5 (Master)', 6, ARRAY['Forage pétrolier', 'WellPlan', 'Offshore', 'Mud engineering', 'HSE'], 2,
   CURRENT_DATE - 8, CURRENT_DATE + 30, 'a1000009-0000-0000-0000-000000000009', false),

  (gen_random_uuid(), 'Chargé de Communication', 'SNH-2026-113', 'open', 'CDI', 'Yaoundé',
   'Pilotage de la stratégie de communication interne et externe de la SNH. Gestion des réseaux sociaux institutionnels et des relations presse.',
   'Expérience en communication institutionnelle. Maîtrise des outils PAO (Photoshop, InDesign). Excellentes capacités rédactionnelles en français et anglais.',
   'BAC+3 (Licence)', 3, ARRAY['Communication institutionnelle', 'PAO', 'Réseaux sociaux', 'Relations presse'], 1,
   CURRENT_DATE - 3, CURRENT_DATE + 60, 'a1000003-0000-0000-0000-000000000003', false),

  (gen_random_uuid(), 'Analyste Financier', 'SNH-2026-114', 'open', 'CDI', 'Yaoundé',
   'Analyse des performances financières de la SNH, préparation des reportings et participation à l''élaboration du budget annuel.',
   'Solide formation en finance et comptabilité. Maîtrise d''Excel avancé et des outils de Business Intelligence. Expérience en audit ou contrôle de gestion souhaitée.',
   'BAC+5 (Master)', 4, ARRAY['Analyse financière', 'Excel avancé', 'Contrôle de gestion', 'Power BI'], 1,
   CURRENT_DATE - 6, CURRENT_DATE + 30, 'a1000010-0000-0000-0000-000000000010', false),

  -- Draft offers (brouillons)
  (gen_random_uuid(), 'Chef de Projet DSI', 'SNH-2026-115', 'draft', 'CDI', 'Yaoundé',
   'Pilotage des projets de transformation digitale de la SNH. Coordination des équipes techniques et des parties prenantes métiers.',
   'Certifications PMP ou Prince2 appréciées. Expérience en gestion de projet IT dans un environnement industriel.',
   'BAC+5 (Master)', 5, ARRAY['Gestion de projet', 'Méthodes agiles', 'ITIL', 'ERP'], 1,
   CURRENT_DATE, CURRENT_DATE + 60, 'a1000005-0000-0000-0000-000000000005', false),

  (gen_random_uuid(), 'Ingénieur Réservoir', 'SNH-2026-116', 'draft', 'CDI', 'Yaoundé',
   'Modélisation et gestion des réservoirs pétroliers et gaziers de la SNH. Évaluation des ressources en place et des réserves récupérables.',
   'Ingénieur réservoir avec maîtrise des logiciels Eclipse ou CMG. Expérience en simulation numérique de réservoirs.',
   'BAC+5 (Master)', 5, ARRAY['Simulation de réservoir', 'Eclipse', 'CMG', 'Pétrophysique'], 1,
   CURRENT_DATE, CURRENT_DATE + 45, 'a1000009-0000-0000-0000-000000000009', false),

  -- Closed offer
  (gen_random_uuid(), 'Technicien Maintenance', 'SNH-2026-090', 'closed', 'CDI', 'Limbé',
   'Maintenance préventive et corrective des équipements de production sur le terminal de Limbé.',
   'BTS en maintenance industrielle ou mécanique. Expérience en milieu pétrolier appréciée.',
   'BAC+2 (BTS/DUT)', 2, ARRAY['Maintenance industrielle', 'Hydraulique', 'Pneumatique'], 2,
   CURRENT_DATE - 60, CURRENT_DATE - 5, 'a1000009-0000-0000-0000-000000000009', false),

  -- Internal offer
  (gen_random_uuid(), 'Responsable Formation RH', 'SNH-2026-117', 'open', 'CDI', 'Yaoundé',
   'Coordination du plan de formation annuel, identification des besoins en compétences et gestion des organismes partenaires.',
   'Expérience confirmée en ingénierie de la formation. Connaissance des dispositifs de formation professionnelle au Cameroun.',
   'BAC+3 (Licence)', 4, ARRAY['Ingénierie de formation', 'GPEC', 'Plan de formation'], 1,
   CURRENT_DATE - 2, CURRENT_DATE + 30, 'a1000001-0000-0000-0000-000000000001', true);


-- ─── New recruitment requests at different workflow stages ────────────────────

INSERT INTO recruitment_requests
  (reference, direction, service, position_title, required_education, required_experience_years,
   required_skills, contract_type, positions_count, budget_validated, justification,
   desired_start_date, status, requested_by_email, reviewed_by_email, review_comment)
VALUES
  -- Submitted (en attente)
  ('DR-2026-0710', 'Direction de l''Exploration', 'Division Géosciences',
   'Ingénieur Réservoir', 'Bac+5/Master', 5,
   ARRAY['Simulation de réservoir', 'Eclipse', 'CMG', 'Pétrophysique'],
   'CDI', 1, false,
   'Départ à la retraite de l''ingénieur réservoir principal en septembre 2026. Remplacement impératif pour assurer la continuité des opérations.',
   '2026-09-01', 'submitted', 'exploration@snh.cm', null, null),

  ('DR-2026-0711', 'Direction Financière', 'Service Trésorerie',
   'Analyste Budgétaire', 'Bac+5/Master', 3,
   ARRAY['Analyse financière', 'Excel avancé', 'SAP', 'Power BI'],
   'CDI', 1, true,
   'Croissance du volume d''activité de la direction financière suite à l''expansion du portefeuille de projets SNH. Renforcement de l''équipe budgétaire nécessaire.',
   '2026-08-01', 'submitted', 'finance@snh.cm', null, null),

  ('DR-2026-0712', 'Direction HSE', 'Cellule Sécurité Industrielle',
   'Agent HSE Senior', 'Bac+5/Master', 6,
   ARRAY['ISO 14001', 'OHSAS 18001', 'Audit HSE', 'HAZOP', 'Gestion des risques'],
   'CDI', 1, false,
   'Renforcement de l''équipe HSE dans le cadre des nouvelles exigences réglementaires liées à l''opération du terminal gazier.',
   '2026-10-01', 'submitted', 'hse@snh.cm', null, null),

  -- DRH review (en examen)
  ('DR-2026-0706', 'Direction des Systèmes d''Information', 'Division Infrastructure',
   'Chef de Projet DSI', 'Bac+5/Master', 5,
   ARRAY['Gestion de projet IT', 'Méthodes agiles', 'ITIL', 'Architecture SI'],
   'CDI', 1, true,
   'Migration du système ERP prévue pour 2027. Recrutement d''un chef de projet pour piloter ce chantier critique.',
   '2026-09-15', 'drh_review', 'dsi@snh.cm', 'drh@snh.cm', null),

  ('DR-2026-0707', 'Direction Juridique', 'Service Contrats',
   'Juriste d''Affaires', 'Bac+5/Master', 5,
   ARRAY['Droit OHADA', 'Droit pétrolier', 'Contentieux', 'Négociation contractuelle'],
   'CDI', 1, true,
   'Augmentation significative du nombre de contentieux et de contrats à gérer. Le service juridique est en sous-effectif depuis 18 mois.',
   '2026-08-15', 'drh_review', 'juridique@snh.cm', 'drh@snh.cm', null),

  -- Approved
  ('DR-2026-0701', 'Direction de la Production', 'Division Forage',
   'Ingénieur Forage', 'Bac+5/Master', 6,
   ARRAY['Forage pétrolier', 'WellPlan', 'Offshore', 'Mud engineering'],
   'CDI', 2, true,
   'Programme de forage 2026-2027 nécessite le renforcement de l''équipe forage avec deux ingénieurs supplémentaires pour les puits Sanaga et Dissoni.',
   '2026-08-01', 'approved', 'production@snh.cm', 'drh@snh.cm',
   'Demande validée. Budget approuvé en CODIR du 15 juin 2026. Lancement du recrutement autorisé.'),

  ('DR-2026-0702', 'Direction des Ressources Humaines', 'Service Formation',
   'Responsable Formation RH', 'Bac+3/Licence', 4,
   ARRAY['Ingénierie de formation', 'GPEC', 'Plan de formation', 'E-learning'],
   'CDI', 1, true,
   'Création d''un poste de responsable formation pour structurer la politique de développement des compétences interne à la SNH.',
   '2026-07-15', 'approved', 'rh@snh.cm', 'drh@snh.cm',
   'Demande approuvée. Priorité haute — recrutement interne privilégié.'),

  -- Rejected
  ('DR-2026-0698', 'Direction Commerciale', 'Service Export',
   'Commercial Export', 'Bac+5/Master', 3,
   ARRAY['Négoce pétrolier', 'Anglais', 'Finance internationale', 'Trading'],
   'CDI', 1, false,
   'Développement des ventes d''hydrocarbures à l''export. Recrutement d''un commercial spécialisé.',
   '2026-06-01', 'rejected', 'commercial@snh.cm', 'drh@snh.cm',
   'Demande non retenue à ce stade. La priorité budgétaire est donnée aux postes techniques. Renvoyée à l''exercice 2027.');
