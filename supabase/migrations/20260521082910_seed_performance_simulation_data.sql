/*
  # Données de simulation — Système de Performance Intégré

  ## Description
  Insertion de données fictives réalistes pour simuler le fonctionnement complet du module performance :
  - Dossiers opérationnels variés (complexités différentes, statuts, retards, relances)
  - Feuilles de route annuelles 2026 pour les agents principaux
  - Évaluations RH calculées (notes proposées, ajustements, mentions)

  ## Profils de performance simulés
  - Agents très performants (notes 88–95)
  - Agents bons (notes 72–80)
  - Agents moyens (notes 55–68)
  - Agents en difficulté (notes 35–48)

  Cette diversité permet de tester tous les affichages, filtres et tableaux de bord.
*/

-- ─────────────────────────────────────────────
-- 1. DOSSIERS OPÉRATIONNELS (case_folders)
-- Affectés à des agents de différentes directions
-- ─────────────────────────────────────────────

INSERT INTO case_folders (reference, title, description, department_id, assigned_to, assigned_by, status, complexity, complexity_coef, expected_deadline, actual_completion, is_urgent, reminder_count, return_count, documents_produced, supervisor_notes, is_confidential) VALUES

-- DAG — Direction des Affaires Générales
('DAG-2026-001', 'Renouvellement contrat prestataire nettoyage', 'Instruction du dossier de renouvellement du contrat de nettoyage des locaux SNH', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '0ebca43e-49d0-4217-a63d-266af98cc334', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'simple', 1, '2026-02-15', '2026-02-12', false, 0, 0, 2, 'Traitement rapide et efficace. Dossier conforme.', false),
('DAG-2026-002', 'Rapport trimestriel d''activités Q1 2026', 'Collecte, consolidation et rédaction du rapport trimestriel Q1', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', 'e5520598-71ad-455e-9a78-a66e5fe415c7', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'medium', 2, '2026-03-31', '2026-04-05', false, 1, 1, 3, 'Quelques retards mais qualité satisfaisante au final.', false),
('DAG-2026-003', 'Inventaire patrimoine mobilier 2026', 'Inventaire physique complet du mobilier de bureau tous sites confondus', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '236cbc14-c1e4-4f35-9230-f3421320fd38', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'in_progress', 'medium', 2, '2026-04-30', null, false, 0, 0, 1, '', false),
('DAG-2026-004', 'Réponse courrier Ministère des Finances', 'Instruction et rédaction de la réponse au courrier MF-2026-0234', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', 'a700ca0b-939d-4ca2-a578-64746b1caf99', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'complex', 3, '2026-03-10', '2026-03-08', true, 0, 0, 1, 'Excellent travail. Réponse bien argumentée, validée sans modification.', false),
('DAG-2026-005', 'Note de service — politique voyages d''affaires', 'Révision complète de la politique voyages et rédaction d''une nouvelle note de service', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '0fd7688a-9ed5-4d3d-9560-943e5dc9ac29', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'validation', 'complex', 3, '2026-05-15', null, false, 2, 1, 2, 'Deuxième version encore insuffisante sur le plan juridique.', false),
('DAG-2026-006', 'Organisation cérémonie 30 ans SNH', 'Coordination logistique de la cérémonie de célébration du 30ème anniversaire', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', 'd08cf15d-f586-4955-a83f-1dd4a287bfda', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'pending', 'strategic', 4, '2026-06-30', null, true, 0, 0, 0, '', false),
('DAG-2026-007', 'Audit interne procédures DAG', 'Revue et mise à jour des procédures internes de la direction', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '601d21ef-0cd0-4592-acce-ab222ad652dc', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'suspended', 'complex', 3, '2026-03-31', null, false, 3, 0, 0, 'En attente de la liste des procédures à réviser. Dossier bloqué.', false),
('DAG-2026-008', 'Mise à jour registre des fournisseurs agréés', 'Actualisation de la liste des fournisseurs avec vérification des documents', 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9', '3038fdb5-1ce1-4f78-b493-db9f583455c1', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 'completed', 'medium', 2, '2026-04-15', '2026-04-20', false, 1, 0, 4, 'Travail soigné malgré le léger dépassement.', false),

-- DFI — Direction Financière
('DFI-2026-001', 'Clôture comptes exercice 2025', 'Travaux de clôture comptable et préparation des états financiers annuels', '54f457e3-a16e-47d4-aabe-98a6505b9795', '79607cb3-81ac-4e39-be93-d8fa58d5273e', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'strategic', 4, '2026-03-31', '2026-03-28', true, 0, 0, 8, 'Excellent. Clôture réalisée en avance, états financiers sans réserve.', false),
('DFI-2026-002', 'Budget prévisionnel 2027', 'Élaboration du budget prévisionnel avec les directions opérationnelles', '54f457e3-a16e-47d4-aabe-98a6505b9795', 'f00e92e2-ff5c-4171-b3ea-7de0906ac7e6', '38a52daa-776b-4b15-949a-a21c6e38c630', 'in_progress', 'strategic', 4, '2026-09-30', null, false, 0, 0, 2, '', false),
('DFI-2026-003', 'Réconciliation bancaire avril 2026', 'Rapprochement bancaire mensuel et correction des écarts', '54f457e3-a16e-47d4-aabe-98a6505b9795', 'bced3a54-04c6-4da9-9a69-9071945a1f59', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'simple', 1, '2026-05-05', '2026-05-04', false, 0, 0, 1, 'Bien.', false),
('DFI-2026-004', 'Note analyse impact fiscal loi finances 2026', 'Analyse approfondie des dispositions fiscales de la loi de finances 2026', '54f457e3-a16e-47d4-aabe-98a6505b9795', '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'complex', 3, '2026-02-28', '2026-03-10', false, 2, 2, 3, 'Note retournée deux fois pour insuffisance d''analyse. Qualité finale acceptable.', false),
('DFI-2026-005', 'Rapport audit comptable prestataires', 'Vérification de la conformité des factures prestataires T1 2026', '54f457e3-a16e-47d4-aabe-98a6505b9795', '07bc179b-34fd-421c-80ff-f1245e66b66a', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'medium', 2, '2026-04-30', '2026-04-28', false, 0, 0, 5, 'Travail rigoureux. Anomalies bien identifiées.', false),
('DFI-2026-006', 'Tableau de bord financier mensuel', 'Elaboration et diffusion du tableau de bord financier mensuel — récurrent', '54f457e3-a16e-47d4-aabe-98a6505b9795', '8cde266e-1a75-4dda-bd18-c0edf12319ec', '38a52daa-776b-4b15-949a-a21c6e38c630', 'completed', 'simple', 1, '2026-05-05', '2026-05-07', false, 1, 0, 1, 'En retard de 2 jours. À améliorer.', false),
('DFI-2026-007', 'Étude rentabilité projet pipeline extension', 'Analyse financière du projet d''extension pipeline nord', '54f457e3-a16e-47d4-aabe-98a6505b9795', 'ec462604-fa5a-48a4-a0cc-9252cd730724', '38a52daa-776b-4b15-949a-a21c6e38c630', 'in_progress', 'sensitive', 5, '2026-07-31', null, true, 0, 0, 1, '', true),

-- DRH — Direction des Ressources Humaines
('DRH-2026-001', 'Plan de formation 2026-2027', 'Élaboration du plan de formation biennal en concertation avec les directions', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'complex', 3, '2026-03-31', '2026-03-25', false, 0, 0, 4, 'Excellente qualité. Plan validé par la DG sans réserve.', false),
('DRH-2026-002', 'Révision grille salariale', 'Étude de révision de la grille des salaires et des avantages', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'f03d77ce-1223-4814-8382-018b1308844f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'validation', 'sensitive', 5, '2026-05-31', null, true, 1, 0, 3, '', true),
('DRH-2026-003', 'Campagne de recrutement 12 postes', 'Gestion complète du processus de recrutement pour 12 postes vacants', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '3959189d-9265-477d-9dae-2ab0f77fc763', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'in_progress', 'strategic', 4, '2026-06-30', null, false, 0, 0, 5, '', false),
('DRH-2026-004', 'Mise à jour fiches de poste 2026', 'Révision et actualisation des fiches de poste de toutes les directions', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'ebb63414-ee45-4042-ba9a-9eaacf7ac98f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'complex', 3, '2026-04-30', '2026-05-10', false, 2, 1, 6, 'Livraison tardive. Des fiches incomplétes ont dû être reprises.', false),
('DRH-2026-005', 'Rapport social annuel 2025', 'Rédaction du rapport social annuel incluant tous les indicateurs RH', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '6d54b41b-4577-4da0-ae61-4e8de63df36d', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'medium', 2, '2026-03-15', '2026-03-14', false, 0, 0, 2, 'Travail soigné, livré dans les délais.', false),
('DRH-2026-006', 'Organisation journée team building', 'Planification et coordination de la journée team building inter-directions', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'a6a3a625-2b2e-4016-b016-9a2ffc59dda2', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'pending', 'simple', 1, '2026-06-15', null, false, 0, 0, 0, '', false),
('DRH-2026-007', 'Gestion disciplinaire 3 dossiers Q1', 'Instruction de 3 dossiers disciplinaires de niveau 1 et 2', '4b54f692-e074-47c2-b12d-3c5568ba4fce', '90f74df0-9670-4e2d-a44c-6b6a1a0c2b1f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'sensitive', 5, '2026-03-31', '2026-03-29', true, 0, 0, 3, 'Dossiers sensibles traités avec discrétion et rigueur.', true),
('DRH-2026-008', 'Note congés annuels règlement 2026', 'Révision et diffusion du règlement congés annuels 2026', '4b54f692-e074-47c2-b12d-3c5568ba4fce', 'a19be9da-e830-4df1-925f-c2d8b033e73c', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 'completed', 'simple', 1, '2026-02-28', '2026-03-05', false, 1, 1, 1, 'Première version retournée pour correction orthographique.', false),

-- DBC — Direction Budget et Contrôle
('DBC-2026-001', 'Contrôle budgétaire T1 2026', 'Analyse des écarts budgétaires du premier trimestre par direction', 'a1000004-0000-0000-0000-000000000004', 'ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 'completed', 'complex', 3, '2026-04-20', '2026-04-18', false, 0, 0, 4, 'Excellent travail analytique. Recommandations pertinentes.', false),
('DBC-2026-002', 'Élaboration manuel procédures budgétaires', 'Rédaction du manuel de procédures de gestion budgétaire', 'a1000004-0000-0000-0000-000000000004', 'f1dd7d29-db05-4d94-b203-3bbcd4712a68', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 'in_progress', 'complex', 3, '2026-06-30', null, false, 0, 0, 2, '', false),
('DBC-2026-003', 'Rapport utilisation crédits spéciaux', 'Vérification et rapport sur l''utilisation des crédits spéciaux 2025', 'a1000004-0000-0000-0000-000000000004', 'c3d48de1-ebbc-49ad-87c3-5bcf96139961', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 'completed', 'sensitive', 5, '2026-03-15', '2026-03-20', true, 2, 0, 2, 'Retard de 5 jours. Qualité du rapport acceptable.', true),

-- DMS — Direction Maintenance et Sécurité
('DMS-2026-001', 'Audit sécurité incendie sites SNH', 'Audit complet de la sécurité incendie sur l''ensemble des sites', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', 'aef9744d-65f2-42f9-813d-2e3e0a9b4e8a', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'completed', 'complex', 3, '2026-04-30', '2026-04-25', false, 0, 0, 3, 'Audit exemplaire. Recommandations claires et exploitables.', false),
('DMS-2026-002', 'Maintenance préventive groupe électrogène DG', 'Opération de maintenance préventive trimestrielle', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', '1ff8e592-b762-4f7e-b314-6bd9a09b6280', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'completed', 'simple', 1, '2026-05-01', '2026-04-30', false, 0, 0, 1, 'Fait dans les délais.', false),
('DMS-2026-003', 'Plan d''évacuation d''urgence 2026', 'Révision et mise à jour du plan d''évacuation d''urgence', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', '8221e6be-f17f-4b8b-b5b1-07054499e1a1', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'in_progress', 'medium', 2, '2026-05-31', null, false, 0, 0, 1, '', false),
('DMS-2026-004', 'Remplacement véhicules flotte SNH', 'Instruction dossier renouvellement partiel flotte de véhicules', 'f01837f7-8835-4667-a73e-5eeee7a1e58b', '743e3932-61c4-4970-8464-4de6fada26d1', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 'suspended', 'strategic', 4, '2026-04-15', null, false, 4, 0, 0, 'Dossier bloqué en attente de l''accord du comité d''investissement.', false),

-- DI — Division Informatique
('DI-2026-001', 'Migration serveurs vers infrastructure cloud', 'Migration de l''infrastructure serveurs SNH vers un environnement cloud hybride', 'a1000007-0000-0000-0000-000000000007', 'dc97f0cd-0835-4258-a602-744fd7ee4e4b', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 'in_progress', 'strategic', 4, '2026-09-30', null, true, 0, 0, 3, '', false),
('DI-2026-002', 'Mise à jour antivirus et patchs sécurité', 'Déploiement des mises à jour de sécurité sur tous les postes de travail', 'a1000007-0000-0000-0000-000000000007', '78ccf842-4c90-423a-a0d1-574b1a411c2a', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 'completed', 'simple', 1, '2026-04-15', '2026-04-14', false, 0, 0, 1, 'Fait dans les délais. Bon travail.', false),
('DI-2026-003', 'Développement module reporting ERP', 'Développement du module de reporting sur mesure intégré à l''ERP RH', 'a1000007-0000-0000-0000-000000000007', '87012c91-7769-4ea3-8405-9c5fa94b9a14', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 'validation', 'complex', 3, '2026-05-31', null, false, 1, 1, 4, 'Version fonctionnelle mais des bugs subsistent.', false),

-- CIP — Centre d''Informations Pétrolières
('CIP-2026-001', 'Rapport mensuel production pétrolière avril 2026', 'Collecte et analyse des données de production pétrolière du mois', 'a1000001-0000-0000-0000-000000000001', '015158f6-6f5f-42d0-97f2-21625554361a', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 'completed', 'medium', 2, '2026-05-10', '2026-05-09', false, 0, 0, 2, 'Rapport précis et livré en avance.', false),
('CIP-2026-002', 'Note conjoncture pétrole Brent T1 2026', 'Analyse de la conjoncture pétrolière internationale et impact sur les revenus', 'a1000001-0000-0000-0000-000000000001', '83e913dd-e820-4d21-9f60-1278c64d3f62', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 'completed', 'strategic', 4, '2026-04-15', '2026-04-22', false, 1, 1, 2, 'Note retournée une fois pour approfondissement. Résultat de qualité.', false),

-- DEX — Direction Exploration
('DEX-2026-001', 'Cartographie gisements zone Nord — Phase 2', 'Élaboration de la cartographie des gisements potentiels de la zone nord', 'a1000005-0000-0000-0000-000000000005', 'b1334b2b-99da-4af4-bf8c-522605f425c2', 'c9abd7e5-fce8-4594-a42a-8e1f12f97c50', 'in_progress', 'sensitive', 5, '2026-08-31', null, true, 0, 0, 2, '', true),
('DEX-2026-002', 'Rapport forage puits GH-14', 'Rédaction du rapport technique du forage du puits GH-14', 'a1000005-0000-0000-0000-000000000005', '20641e16-1d27-4eba-a046-3bd611a86b48', 'c9abd7e5-fce8-4594-a42a-8e1f12f97c50', 'completed', 'complex', 3, '2026-03-31', '2026-03-30', false, 0, 0, 5, 'Rapport de grande qualité technique.', false),
('DEX-2026-003', 'Analyse sismique bloc Lokomo', 'Interprétation des données sismiques 3D du bloc Lokomo', 'a1000005-0000-0000-0000-000000000005', '6ae425a5-349e-4c6c-b280-92ee2a537904', 'c9abd7e5-fce8-4594-a42a-8e1f12f97c50', 'completed', 'sensitive', 5, '2026-04-30', '2026-05-08', false, 2, 0, 3, 'Analyse retardée de 8 jours. Qualité technique satisfaisante.', true);

-- ─────────────────────────────────────────────
-- 2. FEUILLES DE ROUTE ANNUELLES 2026
-- ─────────────────────────────────────────────

INSERT INTO annual_objectives (employee_id, evaluator_id, year, main_missions, status, self_evaluation_score, self_evaluation_comment, interim_notes) VALUES

-- Roger Ayissi (DAG) — très performant
('0ebca43e-49d0-4217-a63d-266af98cc334', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 'Gestion des affaires courantes, instruction des dossiers contractuels, coordination avec les services extérieurs.',
 'self_evaluated', 88, 'J''estime avoir respecté tous mes engagements cette année. Les dossiers ont été traités dans les délais et avec qualité. Je m''améliore sur la rédaction administrative complexe.',
 'Premier trimestre exemplaire. Continue sur cette lancée.'),

-- Nadine Ebang (DAG) — bonne
('e5520598-71ad-455e-9a78-a66e5fe415c7', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 'Rédaction de rapports institutionnels, gestion des archives, coordination administrative.',
 'active', null, '',
 'Travail régulier. Quelques retards à corriger.'),

-- Isabelle Fouda (DBC) — très performante
('ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 2026,
 'Contrôle budgétaire trimestriel, analyse des écarts, production de recommandations pour la direction.',
 'self_evaluated', 90, 'Très bonne année pour moi. Le contrôle T1 a été particulièrement bien mené. Je vise l''excellence sur le contrôle T2.',
 'Agent remarquable. Travail analytique de très haute qualité.'),

-- Laurent Bilong (DFI) — excellent
('79607cb3-81ac-4e39-be93-d8fa58d5273e', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 'Supervision de la clôture des comptes, coordination avec les commissaires aux comptes, pilotage du budget.',
 'self_evaluated', 92, 'La clôture 2025 a été réalisée en avance et sans réserve. Je suis pleinement mobilisé sur le budget 2027.',
 'Résultats excellents. Profil à suivre pour responsabilités accrues.'),

-- Sylvie Ateba (DRH) — très bonne
('04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 'Élaboration et suivi du plan de formation, gestion des demandes de formation individuelles, coordination avec les formateurs.',
 'self_evaluated', 85, 'Le plan de formation 2026-2027 a été bien accueilli. Je reste vigilante sur le suivi des sessions.',
 'Excellent travail de conception du plan de formation.'),

-- Robert Essomba (DRH) — moyen avec problèmes
('ebb63414-ee45-4042-ba9a-9eaacf7ac98f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 'Mise à jour des fiches de poste, gestion administrative des recrutements, suivi des contrats.',
 'active', null, '',
 'Des insuffisances notées sur la qualité des fiches de poste. A faire des progrès.'),

-- Georges Akono (DMS) — très bon
('aef9744d-65f2-42f9-813d-2e3e0a9b4e8a', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 2026,
 'Conduite des audits sécurité, surveillance de la conformité HSE, formation des agents aux procédures de sécurité.',
 'self_evaluated', 87, 'L''audit sécurité incendie a été un succès. Je souhaite développer mes compétences en gestion de crise.',
 'Agent sérieux. Recommandé pour une formation avancée en HSE.'),

-- Élise Abanda (DI) — bonne
('dc97f0cd-0835-4258-a602-744fd7ee4e4b', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 2026,
 'Pilotage de la migration cloud, gestion des projets informatiques stratégiques.',
 'active', null, '',
 'Projet cloud en bonne voie. Charge de travail importante.'),

-- René Ndongo (CIP) — performant
('015158f6-6f5f-42d0-97f2-21625554361a', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 2026,
 'Production des rapports mensuels de production pétrolière, alimentation des bases de données statistiques.',
 'self_evaluated', 80, 'Rapports produits régulièrement et dans les délais. Je cherche à améliorer la présentation visuelle des données.',
 'Fiable et régulier.'),

-- Alain Kamga (DFI) — en difficulté
('5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 'Production de notes fiscales, analyse de la réglementation, conseil aux directions.',
 'self_evaluated', 60, 'J''ai rencontré des difficultés sur l''analyse de la loi de finances. Je m''engage à renforcer mes compétences fiscales.',
 'Des améliorations nécessaires. Note fiscale retournée 2 fois. Suivi rapproché recommandé.');

-- ─────────────────────────────────────────────
-- 3. LIGNES D'OBJECTIFS (annual_objective_items)
-- ─────────────────────────────────────────────

-- Pour Roger Ayissi
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Traiter les dossiers dans les délais', 30, 'Taux de respect des délais', '≥ 90%', '2026-12-31', 'Tous les dossiers traités avant échéance', 95, 0),
  ('Produire des notes de qualité', 25, 'Validation sans reprise majeure', '≥ 85%', '2026-12-31', 'Aucune note retournée pour correction majeure', 95, 1),
  ('Participer aux projets de la direction', 20, 'Livrables réalisés', '100%', '2026-12-31', 'Contribution active à 3 projets transversaux', 100, 2),
  ('Réactivité administrative', 15, 'Délai moyen de traitement', '≤ 3 jours', '2026-12-31', 'Délai moyen : 2,1 jours', 90, 3),
  ('Discipline et collaboration', 10, 'Appréciation hiérarchique', 'Satisfaisant', '2026-12-31', 'Excellent comportement professionnel', 95, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '0ebca43e-49d0-4217-a63d-266af98cc334' AND ao.year = 2026;

-- Pour Isabelle Fouda
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Contrôle budgétaire trimestriel', 35, 'Rapports rendus dans les délais', '100%', '2026-12-31', '4/4 rapports produits en avance', 100, 0),
  ('Analyse des écarts et recommandations', 30, 'Qualité des recommandations', 'Adopté ≥ 80%', '2026-12-31', '92% des recommandations T1 adoptées', 95, 1),
  ('Participation réforme budgétaire', 20, 'Livrables du groupe de travail', '100%', '2026-06-30', 'Contribution majeure au manuel de procédures', 85, 2),
  ('Réactivité administrative', 15, 'Délai moyen de réponse', '≤ 2 jours', '2026-12-31', 'Délai moyen : 1,5 jours', 100, 3)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1' AND ao.year = 2026;

-- Pour Laurent Bilong
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Clôture comptes exercice 2025', 30, 'Délai clôture et qualité', 'Sans réserve avant 31/03', '2026-03-31', 'Clôture réalisée le 28/03 sans réserve', 100, 0),
  ('Pilotage budget prévisionnel 2027', 30, 'Avancement du budget', 'Soumis avant 30/09', '2026-09-30', 'En cours — bonne progression', 60, 1),
  ('Supervision équipe DFI', 20, 'Satisfaction direction', 'Appréciation positive', '2026-12-31', 'Équipe bien encadrée et motivée', 90, 2),
  ('Participation groupe de travail finance', 20, 'Livrables', '100%', '2026-12-31', 'Contribution active', 80, 3)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '79607cb3-81ac-4e39-be93-d8fa58d5273e' AND ao.year = 2026;

-- Pour Alain Kamga (en difficulté)
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Notes fiscales dans les délais', 30, 'Taux de respect des délais', '≥ 90%', '2026-12-31', 'Note loi de finances livrée avec 10 jours de retard', 45, 0),
  ('Qualité des notes fiscales', 25, 'Validation sans reprise majeure', '≥ 85%', '2026-12-31', 'Note retournée 2 fois pour insuffisance', 40, 1),
  ('Veille réglementaire', 20, 'Alertes émises dans les délais', '≥ 8 alertes/an', '2026-12-31', '3 alertes émises sur 5 attendues à ce stade', 60, 2),
  ('Conseil aux directions', 15, 'Consultations traitées', '≥ 15/trimestre', '2026-12-31', '8 consultations traitées sur 15 attendues', 53, 3),
  ('Collaboration inter-directions', 10, 'Appréciation partenaires', 'Satisfaisant', '2026-12-31', 'Relations correctes mais peu d''initiatives', 60, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1' AND ao.year = 2026;

-- ─────────────────────────────────────────────
-- 4. ÉVALUATIONS RH 2026 (hr_evaluations)
-- ─────────────────────────────────────────────

INSERT INTO hr_evaluations (employee_id, evaluator_id, year, score_case_folders, score_objectives, score_quality, score_behavior, computed_score, adjusted_score, adjustment_reason, mention, status, evaluator_comment, hr_comment) VALUES

-- Laurent Bilong — Excellent (note calculée 94)
('79607cb3-81ac-4e39-be93-d8fa58d5273e', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 95, 95, 90, 92,
 ROUND((95*40 + 95*35 + 90*15 + 92*10)::numeric / 100, 2),
 null, '', 'excellent', 'validated',
 'Agent d''exception. La clôture 2025 en avance et sans réserve est un résultat remarquable. Leadership naturel sur son équipe.',
 'Évaluation validée. Profil à considérer pour évolution de poste.'),

-- Roger Ayissi — Très bien (note calculée 94)
('0ebca43e-49d0-4217-a63d-266af98cc334', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 95, 93, 90, 95,
 ROUND((95*40 + 93*35 + 90*15 + 95*10)::numeric / 100, 2),
 null, '', 'excellent', 'validated',
 'Toujours fiable et proactif. Dossiers traités avec rigueur et sans relance.',
 'Évaluation validée. Excellence confirmée.'),

-- Isabelle Fouda — Excellent (note 93)
('ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1', 'a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7', 2026,
 95, 95, 88, 90,
 ROUND((95*40 + 95*35 + 88*15 + 90*10)::numeric / 100, 2),
 null, '', 'excellent', 'validated',
 'Contrôle budgétaire T1 exceptionnel. Recommandations à 92% adoptées par la direction.',
 'Validée. Top performance.'),

-- Sylvie Ateba — Très bien (note 86)
('04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 88, 85, 85, 88,
 ROUND((88*40 + 85*35 + 85*15 + 88*10)::numeric / 100, 2),
 null, '', 'tres_bien', 'validated',
 'Plan de formation de grande qualité. Agent sérieux et engagé.',
 'Validée.'),

-- Georges Akono — Très bien (note 87)
('aef9744d-65f2-42f9-813d-2e3e0a9b4e8a', '897bc7e7-7b9b-4c81-b21f-c21c6cc3ed16', 2026,
 90, 85, 88, 82,
 ROUND((90*40 + 85*35 + 88*15 + 82*10)::numeric / 100, 2),
 null, '', 'tres_bien', 'validated',
 'Audit sécurité conduit avec professionnalisme. Résultats concrets sur la mise en conformité.',
 'Validée.'),

-- René Ndongo — Bien (note 78)
('015158f6-6f5f-42d0-97f2-21625554361a', 'ad97d390-0717-4ff1-acfa-5f700e3454f7', 2026,
 82, 75, 78, 80,
 ROUND((82*40 + 75*35 + 78*15 + 80*10)::numeric / 100, 2),
 null, '', 'bien', 'validated',
 'Fiable et régulier. Bonne qualité des rapports mensuels.',
 'Validée.'),

-- Nadine Ebang — Bien (note 70)
('e5520598-71ad-455e-9a78-a66e5fe415c7', 'd0cc3449-a243-4c23-a078-c601e3a6b5ae', 2026,
 72, 68, 70, 75,
 ROUND((72*40 + 68*35 + 70*15 + 75*10)::numeric / 100, 2),
 null, '', 'bien', 'proposed',
 'Travail correct mais des retards répétés sur les rapports. À améliorer.',
 ''),

-- Élise Abanda — Bien (note 74), ajustée
('dc97f0cd-0835-4258-a602-744fd7ee4e4b', '0c4a9c34-29ae-4c8c-9473-1d0e85daaf07', 2026,
 75, 72, 75, 78,
 ROUND((75*40 + 72*35 + 75*15 + 78*10)::numeric / 100, 2),
 78, 'Compte tenu de la complexité du projet de migration cloud (dossier stratégique de niveau 5) et de la charge exceptionnelle de travail, j''ajuste la note de 74 à 78 pour mieux refléter la réalité de l''effort fourni.', 'bien', 'adjusted',
 'Agent engagé sur un projet particulièrement exigeant. Note initiale sous-estime la charge réelle.',
 ''),

-- Robert Essomba — Assez bien (note 55), situation difficile
('ebb63414-ee45-4042-ba9a-9eaacf7ac98f', 'd5730b13-23bb-4c2e-9a04-fd5ab5668ac5', 2026,
 55, 52, 50, 70,
 ROUND((55*40 + 52*35 + 50*15 + 70*10)::numeric / 100, 2),
 null, '', 'assez_bien', 'proposed',
 'Livraison tardive des fiches de poste avec des insuffisances notoires. Plusieurs reprises nécessaires. Doit impérativement progresser sur la qualité rédactionnelle.',
 ''),

-- Alain Kamga — Insuffisant (note 46)
('5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1', '38a52daa-776b-4b15-949a-a21c6e38c630', 2026,
 48, 44, 40, 58,
 ROUND((48*40 + 44*35 + 40*15 + 58*10)::numeric / 100, 2),
 50, 'Malgré les difficultés techniques rencontrées, l''agent a montré une bonne volonté et une disponibilité. La note de 46 est mathématiquement exacte mais ne tient pas compte de l''effort de progression. J''ajuste à 50 et recommande un plan d''accompagnement.',
 'insuffisant', 'adjusted',
 'Résultats en deçà des attentes. Note ajustée à 50 par le chef avec justification. Plan d''amélioration obligatoire.',
 'Validée. Plan d''amélioration à mettre en place dans les 30 jours.');
