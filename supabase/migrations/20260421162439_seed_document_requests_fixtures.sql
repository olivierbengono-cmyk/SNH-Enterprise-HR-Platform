/*
  # Seed de donnees fictives pour Documents & Attestations

  ## Description
  Insere un ensemble de demandes d'attestations et de documents RH reparties
  entre plusieurs employes avec differents statuts (pending, approved, ready,
  rejected) et differents types de documents pour illustrer le module.

  ## Notes
  1. Les demandes sont liees aux employes existants (selection par employee_number)
  2. Aucun utilisateur processed_by n'est force (champ nullable)
  3. L'insertion est idempotente : si des demandes existent deja pour ces
     employes avec ces types/dates, elles ne seront pas dupliquees grace au
     WHERE NOT EXISTS.
*/

DO $$
DECLARE
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid;
  e6 uuid; e7 uuid; e8 uuid; e9 uuid; e10 uuid;
BEGIN
  SELECT id INTO e1 FROM employees WHERE employee_number = 'SNH-2018-001' LIMIT 1;
  SELECT id INTO e2 FROM employees WHERE employee_number = 'SNH-2019-002' LIMIT 1;
  SELECT id INTO e3 FROM employees WHERE employee_number = 'SNH-2018-004' LIMIT 1;
  SELECT id INTO e4 FROM employees WHERE employee_number = 'SNH-2019-005' LIMIT 1;
  SELECT id INTO e5 FROM employees WHERE employee_number = 'SNH-2020-006' LIMIT 1;
  SELECT id INTO e6 FROM employees WHERE employee_number = 'SNH-2020-007' LIMIT 1;
  SELECT id INTO e7 FROM employees WHERE employee_number = 'SNH-2021-009' LIMIT 1;
  SELECT id INTO e8 FROM employees WHERE employee_number = 'SNH-2022-010' LIMIT 1;
  SELECT id INTO e9 FROM employees WHERE employee_number = 'SNH-2022-011' LIMIT 1;
  SELECT id INTO e10 FROM employees WHERE employee_number = 'SNH-2023-012' LIMIT 1;

  INSERT INTO document_requests (employee_id, request_type, purpose, additional_notes, status, urgency, copies_count, created_at, processed_at, rejection_reason)
  SELECT * FROM (VALUES
    (e1, 'attestation_travail', 'Demarches bancaires (pret immobilier)', 'A remettre en version papier signee', 'ready', 'normal', 2, now() - interval '8 days', now() - interval '5 days', NULL),
    (e1, 'certificat_salaire', 'Dossier visa Schengen', NULL, 'approved', 'urgent', 1, now() - interval '2 days', now() - interval '1 day', NULL),
    (e2, 'attestation_presence', 'Inscription universitaire du conjoint', NULL, 'pending', 'normal', 1, now() - interval '1 day', NULL, NULL),
    (e2, 'attestation_conge', 'Justificatif pour agence de voyage', 'Periode du 01/05 au 20/05', 'ready', 'normal', 1, now() - interval '14 days', now() - interval '10 days', NULL),
    (e3, 'bulletin_paie', 'Dossier location appartement', 'Derniers 3 mois', 'ready', 'normal', 3, now() - interval '20 days', now() - interval '18 days', NULL),
    (e3, 'lettre_recommandation', 'Candidature programme MBA', 'A adresser a HEC Paris', 'pending', 'urgent', 1, now() - interval '3 days', NULL, NULL),
    (e4, 'attestation_travail', 'Demarches douanieres', NULL, 'rejected', 'normal', 1, now() - interval '9 days', now() - interval '7 days', 'Document deja delivre le 15/03. Merci de verifier votre dossier.'),
    (e4, 'contrat_travail', 'Archivage personnel', NULL, 'approved', 'normal', 1, now() - interval '4 days', now() - interval '2 days', NULL),
    (e5, 'certificat_salaire', 'Demande de credit auto', NULL, 'pending', 'normal', 2, now() - interval '12 hours', NULL, NULL),
    (e5, 'attestation_presence', 'Procedure administrative CNPS', NULL, 'ready', 'normal', 1, now() - interval '30 days', now() - interval '27 days', NULL),
    (e6, 'attestation_travail', 'Demande de visa professionnel', 'A redigger en anglais', 'approved', 'urgent', 1, now() - interval '5 days', now() - interval '3 days', NULL),
    (e6, 'autre', 'Attestation de non-endettement envers la SNH', 'Pour partenariat commercial prive', 'pending', 'normal', 1, now() - interval '6 hours', NULL, NULL),
    (e7, 'attestation_conge', 'Justificatif voyage familial', NULL, 'ready', 'normal', 1, now() - interval '45 days', now() - interval '42 days', NULL),
    (e7, 'bulletin_paie', 'Dossier de divorce', 'Copies certifiees conformes', 'approved', 'urgent', 6, now() - interval '1 day', now() - interval '3 hours', NULL),
    (e8, 'attestation_travail', 'Demarches prefecture', NULL, 'pending', 'normal', 1, now() - interval '2 hours', NULL, NULL),
    (e8, 'certificat_salaire', 'Inscription ecole privee des enfants', NULL, 'ready', 'normal', 2, now() - interval '22 days', now() - interval '20 days', NULL),
    (e9, 'lettre_recommandation', 'Concours interne fonction publique', 'Mentionner les 12 ans d anciennete', 'pending', 'normal', 1, now() - interval '4 days', NULL, NULL),
    (e9, 'contrat_travail', 'Archives personnelles', NULL, 'rejected', 'normal', 1, now() - interval '15 days', now() - interval '13 days', 'Veuillez preciser la raison de la copie.'),
    (e10, 'attestation_presence', 'Inscription salle de sport entreprise', NULL, 'ready', 'normal', 1, now() - interval '60 days', now() - interval '57 days', NULL),
    (e10, 'attestation_travail', 'Ouverture compte bancaire', 'En langue francaise', 'approved', 'normal', 1, now() - interval '1 day', now() - interval '18 hours', NULL)
  ) AS v(employee_id, request_type, purpose, additional_notes, status, urgency, copies_count, created_at, processed_at, rejection_reason)
  WHERE v.employee_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM document_requests dr
      WHERE dr.employee_id = v.employee_id
        AND dr.request_type = v.request_type
        AND dr.created_at = v.created_at
    );
END $$;