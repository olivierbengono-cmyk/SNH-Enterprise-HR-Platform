/*
  # Complétion des lignes d'objectifs annuels 2026

  ## Description
  Ajout des lignes d'objectifs (annual_objective_items) pour les 6 agents
  dont la feuille de route existe mais sans détail des objectifs :
  - Élise Abanda (DI)
  - Nadine Ebang (DAG)
  - Robert Essomba (DRH)
  - Georges Akono (DMS)
  - Sylvie Ateba (DRH)
  - René Ndongo (CIP)

  Chaque agent a un profil de performance distinct pour permettre
  des simulations variées.
*/

-- Élise Abanda — Gestion de projet informatique stratégique
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Pilotage migration cloud SNH', 35, 'Avancement du projet (%)', '≥ 60% à fin juin', '2026-06-30', 'Migration en cours — 45% réalisé', 75, 0),
  ('Sécurité et conformité du SI', 25, 'Incidents sécurité majeurs', '0 incident critique', '2026-12-31', 'Aucun incident critique à ce jour', 100, 1),
  ('Gestion du module reporting ERP', 20, 'Livraison version stable', 'V1 livrée avant 31/05', '2026-05-31', 'V1 en validation — quelques bugs à corriger', 70, 2),
  ('Support utilisateurs et réactivité', 15, 'Délai moyen de résolution', '≤ 4 heures', '2026-12-31', 'Délai moyen actuel : 3,8 heures', 80, 3),
  ('Collaboration inter-équipes', 5, 'Appréciation collègues', 'Satisfaisant', '2026-12-31', 'Très bon esprit d''équipe', 90, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'dc97f0cd-0835-4258-a602-744fd7ee4e4b' AND ao.year = 2026;

-- Nadine Ebang — Rapports institutionnels et archivage
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Rapports trimestriels dans les délais', 30, 'Taux de respect des délais', '100%', '2026-12-31', 'Q1 remis avec 5 jours de retard', 60, 0),
  ('Qualité rédactionnelle des rapports', 25, 'Taux de validation sans reprise', '≥ 85%', '2026-12-31', 'Rapport Q1 retourné une fois pour correction', 65, 1),
  ('Gestion et classement des archives', 20, 'Archives numérisées', '≥ 80% du fonds', '2026-12-31', '55% numérisé à ce stade', 69, 2),
  ('Réactivité administrative', 15, 'Délai moyen de traitement courrier', '≤ 3 jours', '2026-12-31', 'Délai moyen : 4,2 jours', 55, 3),
  ('Discipline et présence', 10, 'Appréciation hiérarchique', 'Satisfaisant', '2026-12-31', 'Comportement correct, ponctualité à améliorer', 70, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'e5520598-71ad-455e-9a78-a66e5fe415c7' AND ao.year = 2026;

-- Robert Essomba — Gestion RH (en difficulté)
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Mise à jour des fiches de poste', 35, 'Fiches validées sans reprise', '≥ 90%', '2026-04-30', 'Plusieurs fiches retournées — qualité insuffisante', 40, 0),
  ('Gestion administrative des recrutements', 25, 'Dossiers traités dans les délais', '≥ 95%', '2026-12-31', 'Retards récurrents dans la constitution des dossiers', 50, 1),
  ('Suivi des contrats de travail', 20, 'Contrats renouvelés avant expiration', '100%', '2026-12-31', '2 contrats renouvelés en retard', 55, 2),
  ('Réactivité aux demandes RH', 15, 'Délai moyen de réponse', '≤ 48h', '2026-12-31', 'Délai moyen : 5,2 jours', 35, 3),
  ('Collaboration et discipline', 5, 'Appréciation hiérarchique', 'Satisfaisant', '2026-12-31', 'Attitude correcte mais manque d''initiative', 65, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'ebb63414-ee45-4042-ba9a-9eaacf7ac98f' AND ao.year = 2026;

-- Georges Akono — Audit et sécurité HSE
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Audits sécurité dans les délais', 30, 'Audits réalisés sur le plan', '100%', '2026-12-31', 'Audit incendie et 2 inspections réalisés', 95, 0),
  ('Qualité des rapports d''audit', 25, 'Recommandations adoptées', '≥ 80%', '2026-12-31', '87% des recommandations audit incendie adoptées', 90, 1),
  ('Formation du personnel aux procédures HSE', 20, 'Agents formés', '≥ 80% du personnel', '2026-09-30', '65% formés à ce stade', 81, 2),
  ('Réactivité sur incidents sécurité', 15, 'Délai intervention', '≤ 30 minutes', '2026-12-31', 'Délai moyen intervention : 22 minutes', 100, 3),
  ('Collaboration et signalement proactif', 10, 'Rapports de signalement', '≥ 2/mois', '2026-12-31', 'Moyenne de 2,3 signalements/mois', 90, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = 'aef9744d-65f2-42f9-813d-2e3e0a9b4e8a' AND ao.year = 2026;

-- Sylvie Ateba — Plan de formation DRH
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Élaboration plan de formation 2026-2027', 30, 'Plan validé par DG', 'Avant 31/03/2026', '2026-03-31', 'Plan validé le 25/03 sans réserve', 100, 0),
  ('Suivi des sessions de formation', 25, 'Taux de réalisation', '≥ 90%', '2026-12-31', '78% des sessions planifiées réalisées', 87, 1),
  ('Coordination avec les formateurs externes', 20, 'Satisfaction participants', '≥ 85%', '2026-12-31', 'Note moyenne satisfaction : 88%', 95, 2),
  ('Gestion des demandes individuelles', 15, 'Demandes traitées dans les délais', '≥ 95%', '2026-12-31', '93% traitées dans les délais', 90, 3),
  ('Reporting et tableaux de bord formation', 10, 'Rapports mensuels', '12/an', '2026-12-31', '4 rapports produits sur 4 attendus', 100, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '04d0e490-fac2-4cfd-8179-9eaa0cf6d8a9' AND ao.year = 2026;

-- René Ndongo — Production pétrolière et statistiques
INSERT INTO annual_objective_items (annual_objective_id, objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
SELECT ao.id, obj.objective_name, obj.weight, obj.indicator, obj.target, obj.deadline::date, obj.result, obj.achievement_rate, obj.sort_order
FROM annual_objectives ao
CROSS JOIN (VALUES
  ('Rapports mensuels production pétrolière', 30, 'Rapports livrés dans les délais', '12/an avant J+10', '2026-12-31', '4/4 rapports à ce jour, tous avant J+10', 100, 0),
  ('Qualité et fiabilité des données', 25, 'Taux d''erreurs sur données', '< 1%', '2026-12-31', 'Aucune erreur détectée sur les 4 premiers rapports', 100, 1),
  ('Alimentation des bases de données statistiques', 20, 'Mises à jour hebdomadaires', '100%', '2026-12-31', '98% des mises à jour effectuées', 95, 2),
  ('Notes d''analyse conjoncturelle', 15, 'Notes trimestrielles', '4/an', '2026-12-31', '1 note sur 2 attendues — qualité à améliorer', 70, 3),
  ('Collaboration avec les équipes techniques', 10, 'Appréciation partenaires', 'Satisfaisant', '2026-12-31', 'Collaborateur fiable et disponible', 85, 4)
) AS obj(objective_name, weight, indicator, target, deadline, result, achievement_rate, sort_order)
WHERE ao.employee_id = '015158f6-6f5f-42d0-97f2-21625554361a' AND ao.year = 2026;
