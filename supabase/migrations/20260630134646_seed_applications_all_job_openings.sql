-- Seed candidatures for all job openings, skipping existing pairs

INSERT INTO candidate_applications (candidate_id, job_opening_id, status, created_at, cover_letter, internal_notes)
SELECT v.candidate_id, v.job_opening_id, v.status, v.created_at, v.cover_letter, v.internal_notes
FROM (VALUES
  -- Offre: Comptable (e25e861d)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, 'e25e861d-3a2d-4d56-b9d6-c46071b0490b'::uuid, 'new',        now() - interval '12 days', 'Je suis très motivée par ce poste de comptable au sein de la SNH.', null::text),
  ('b25fef90-f032-4c3e-a0d4-c1f8b289ad36'::uuid, 'e25e861d-3a2d-4d56-b9d6-c46071b0490b'::uuid, 'reviewing',  now() - interval '10 days', 'Fort de mon expérience en comptabilité générale, je postule pour ce poste.', 'Profil intéressant, à convoquer'),
  ('d9bb0e17-ede0-4dc3-83ab-7e77155b4b22'::uuid, 'e25e861d-3a2d-4d56-b9d6-c46071b0490b'::uuid, 'interview',  now() - interval '7 days',  'Diplômée en finance, je souhaite intégrer la SNH comme comptable.', 'Entretien RH passé, favorable'),
  ('1b3dad40-6efb-4d1d-a0e9-4d94a535b207'::uuid, 'e25e861d-3a2d-4d56-b9d6-c46071b0490b'::uuid, 'rejected',   now() - interval '15 days', 'Candidature spontanée pour le poste de comptable.', 'Expérience insuffisante'),

  -- Offre: Ingénieur Production Senior (f0d69104)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, 'f0d69104-c239-437a-89d6-6fc7289c7afd'::uuid, 'new',        now() - interval '8 days',  'Ma spécialisation en production pétrolière correspond parfaitement à ce profil.', null::text),
  ('b25fef90-f032-4c3e-a0d4-c1f8b289ad36'::uuid, 'f0d69104-c239-437a-89d6-6fc7289c7afd'::uuid, 'interview',  now() - interval '6 days',  'Ingénieur de production avec 8 ans d''expérience en milieu pétrolier.', 'Entretien technique planifié'),
  ('96609625-003e-472f-92cf-22447de6981e'::uuid, 'f0d69104-c239-437a-89d6-6fc7289c7afd'::uuid, 'offer',       now() - interval '4 days',  'Je souhaite intégrer les équipes production de la SNH.', 'Offre envoyée, en attente retour'),
  ('51f0371d-990b-4d18-b960-fe345bca2fe9'::uuid, 'f0d69104-c239-437a-89d6-6fc7289c7afd'::uuid, 'reviewing',  now() - interval '9 days',  'Profil senior en ingénierie pétrolière, disponible immédiatement.', null::text),

  -- Offre: Agent HSE (059ba032)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, '059ba032-96ad-46c2-a69a-8ac709885179'::uuid, 'new',        now() - interval '5 days',  'Passionnée par la sécurité industrielle, je postule pour ce poste HSE.', null::text),
  ('b25fef90-f032-4c3e-a0d4-c1f8b289ad36'::uuid, '059ba032-96ad-46c2-a69a-8ac709885179'::uuid, 'reviewing',  now() - interval '7 days',  'Certifié NEBOSH, 5 ans d''expérience en HSE dans le secteur pétrolier.', 'Certifications à vérifier'),
  ('cafd2e2e-ed0a-4e7b-9d50-ed97e628889f'::uuid, '059ba032-96ad-46c2-a69a-8ac709885179'::uuid, 'interview',  now() - interval '3 days',  'Ingénieur HSE, je souhaite contribuer à la sécurité des opérations SNH.', 'Entretien prévu vendredi'),
  ('8a4fea8e-42f0-4ce3-8df7-e0b028caad6a'::uuid, '059ba032-96ad-46c2-a69a-8ac709885179'::uuid, 'new',        now() - interval '2 days',  'Formation en hygiène sécurité environnement, disponible dès juillet.', null::text),
  ('85d2be1f-f36e-4919-bb48-469f1bed728b'::uuid, '059ba032-96ad-46c2-a69a-8ac709885179'::uuid, 'rejected',   now() - interval '14 days', 'Candidature pour le poste Agent HSE.', 'Ne répond pas aux critères minimaux'),

  -- Offre: Commercial (654e4e22)
  ('cafd2e2e-ed0a-4e7b-9d50-ed97e628889f'::uuid, '654e4e22-ca49-4059-b72e-8a403ad600c4'::uuid, 'new',        now() - interval '4 days',  'Commercial expérimenté, je postule pour rejoindre la direction commerciale SNH.', null::text),
  ('d9bb0e17-ede0-4dc3-83ab-7e77155b4b22'::uuid, '654e4e22-ca49-4059-b72e-8a403ad600c4'::uuid, 'reviewing',  now() - interval '6 days',  'MBA en commerce international, 7 ans d''expérience B2B.', null::text),
  ('51f0371d-990b-4d18-b960-fe345bca2fe9'::uuid, '654e4e22-ca49-4059-b72e-8a403ad600c4'::uuid, 'interview',  now() - interval '3 days',  'Spécialiste développement commercial, secteur énergie.', 'Excellent entretien, très motivé'),
  ('8d8690c2-0c46-408a-af93-2c4de7a3d4f5'::uuid, '654e4e22-ca49-4059-b72e-8a403ad600c4'::uuid, 'new',        now() - interval '1 day',   'Responsable commerciale avec réseau établi dans le secteur pétrolier.', null::text),
  ('5014f3fb-88d4-4627-8024-b466e34113a6'::uuid, '654e4e22-ca49-4059-b72e-8a403ad600c4'::uuid, 'rejected',   now() - interval '11 days', 'Candidature pour poste commercial SNH.', 'Profil trop junior'),

  -- Offre: Assistant RH (efeeedee)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, 'efeeedee-e52f-4863-8f02-cf237242b365'::uuid, 'new',        now() - interval '3 days',  'Diplômée en GRH, je souhaite intégrer la DRH de la SNH.', null::text),
  ('b25fef90-f032-4c3e-a0d4-c1f8b289ad36'::uuid, 'efeeedee-e52f-4863-8f02-cf237242b365'::uuid, 'reviewing',  now() - interval '5 days',  'Assistant RH avec expérience en paie et recrutement.', 'Bon dossier, à approfondir'),
  ('96609625-003e-472f-92cf-22447de6981e'::uuid, 'efeeedee-e52f-4863-8f02-cf237242b365'::uuid, 'interview',  now() - interval '2 days',  'Maîtrise des outils SIRH, disponible sous préavis d''un mois.', 'Entretien DRH demain'),
  ('1b3dad40-6efb-4d1d-a0e9-4d94a535b207'::uuid, 'efeeedee-e52f-4863-8f02-cf237242b365'::uuid, 'new',        now() - interval '1 day',   'Passionné par les ressources humaines, je postule pour ce poste.', null::text),
  ('8a4fea8e-42f0-4ce3-8df7-e0b028caad6a'::uuid, 'efeeedee-e52f-4863-8f02-cf237242b365'::uuid, 'rejected',   now() - interval '13 days', 'Candidature pour Assistant RH.', 'Profil non retenu'),

  -- Offre: Géologue de Bassin (f3a68a34)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, 'f3a68a34-813c-405c-98a9-d107d8ba3297'::uuid, 'new',        now() - interval '9 days',  'Géologue spécialisée sédimentologie, 6 ans en exploration pétrolière.', null::text),
  ('cafd2e2e-ed0a-4e7b-9d50-ed97e628889f'::uuid, 'f3a68a34-813c-405c-98a9-d107d8ba3297'::uuid, 'reviewing',  now() - interval '7 days',  'Doctorat en géologie de bassin, publications internationales.', 'Profil académique excellent'),
  ('d9bb0e17-ede0-4dc3-83ab-7e77155b4b22'::uuid, 'f3a68a34-813c-405c-98a9-d107d8ba3297'::uuid, 'interview',  now() - interval '4 days',  'Géologue de bassin, expérience terrain en Afrique subsaharienne.', 'Connaît bien le contexte camerounais'),
  ('96609625-003e-472f-92cf-22447de6981e'::uuid, 'f3a68a34-813c-405c-98a9-d107d8ba3297'::uuid, 'offer',       now() - interval '2 days',  'Spécialiste interprétation sismique et modélisation géologique.', 'Offre soumise, très bon profil'),
  ('51f0371d-990b-4d18-b960-fe345bca2fe9'::uuid, 'f3a68a34-813c-405c-98a9-d107d8ba3297'::uuid, 'new',        now() - interval '1 day',   'Géologue junior avec formation en géologie structurale.', null::text),

  -- Offre: Ingénieur Informatique / SI (79ed187f)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, '79ed187f-c550-4029-ab75-ceef93943c5c'::uuid, 'new',        now() - interval '6 days',  'Ingénieure en systèmes d''information, spécialisation ERP et cybersécurité.', null::text),
  ('d9bb0e17-ede0-4dc3-83ab-7e77155b4b22'::uuid, '79ed187f-c550-4029-ab75-ceef93943c5c'::uuid, 'reviewing',  now() - interval '5 days',  'Ingénieur SI avec expertise en architecture cloud et DevOps.', null::text),
  ('96609625-003e-472f-92cf-22447de6981e'::uuid, '79ed187f-c550-4029-ab75-ceef93943c5c'::uuid, 'interview',  now() - interval '3 days',  'Certifié AWS et Azure, 5 ans en développement et intégration SI.', 'Entretien technique très positif'),
  ('8a4fea8e-42f0-4ce3-8df7-e0b028caad6a'::uuid, '79ed187f-c550-4029-ab75-ceef93943c5c'::uuid, 'offer',       now() - interval '1 day',   'Expert en transformation digitale, disponible immédiatement.', 'Offre en cours de validation'),
  ('85d2be1f-f36e-4919-bb48-469f1bed728b'::uuid, '79ed187f-c550-4029-ab75-ceef93943c5c'::uuid, 'rejected',   now() - interval '10 days', 'Développeur web souhaitant évoluer vers les systèmes d''information.', 'Pas suffisamment senior'),

  -- Offre: Technicien Informatique (6845d734)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, '6845d734-cb20-41be-8090-260650ea4596'::uuid, 'new',        now() - interval '4 days',  'Technicien réseaux et systèmes, expérience en maintenance parc informatique.', null::text),
  ('b25fef90-f032-4c3e-a0d4-c1f8b289ad36'::uuid, '6845d734-cb20-41be-8090-260650ea4596'::uuid, 'reviewing',  now() - interval '3 days',  'BTS informatique, certifié CompTIA A+, disponible immédiatement.', null::text),
  ('cafd2e2e-ed0a-4e7b-9d50-ed97e628889f'::uuid, '6845d734-cb20-41be-8090-260650ea4596'::uuid, 'interview',  now() - interval '2 days',  'Technicien support N2, expérience helpdesk en environnement Windows/Linux.', 'Bon test technique'),
  ('d9bb0e17-ede0-4dc3-83ab-7e77155b4b22'::uuid, '6845d734-cb20-41be-8090-260650ea4596'::uuid, 'new',        now() - interval '1 day',   'Passionné d''informatique, 3 ans en maintenance et support technique.', null::text),
  ('8d8690c2-0c46-408a-af93-2c4de7a3d4f5'::uuid, '6845d734-cb20-41be-8090-260650ea4596'::uuid, 'rejected',   now() - interval '8 days',  'Candidature pour Technicien Informatique SNH.', 'Profil ne correspond pas'),
  ('5014f3fb-88d4-4627-8024-b466e34113a6'::uuid, '6845d734-cb20-41be-8090-260650ea4596'::uuid, 'reviewing',  now() - interval '4 days',  'Ingénieur réseaux junior, à la recherche d''un premier poste structurant.', 'À présélectionner'),

  -- Offre: Ingénieur Exploration (e4085adf)
  ('0ed29ec6-3f47-4433-961a-57a16c762c3d'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'new',        now() - interval '7 days',  'Ingénieure en géophysique, spécialisée en interprétation sismique 3D.', null::text),
  ('b25fef90-f032-4c3e-a0d4-c1f8b289ad36'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'reviewing',  now() - interval '6 days',  'Ingénieur exploration avec 4 ans d''expérience au Gabon et en Côte d''Ivoire.', 'Références à contacter'),
  ('cafd2e2e-ed0a-4e7b-9d50-ed97e628889f'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'interview',  now() - interval '4 days',  'Pétrophyscien senior, maîtrise Petrel et Kingdom.', 'Entretien technique excellent'),
  ('d9bb0e17-ede0-4dc3-83ab-7e77155b4b22'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'offer',       now() - interval '2 days',  'Géophysicien exploration, expérience en bassin sédimentaire africain.', 'Offre signée, intégration juillet'),
  ('51f0371d-990b-4d18-b960-fe345bca2fe9'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'new',        now() - interval '1 day',   'Ingénieur géologue cherchant à rejoindre une major nationale.', null::text),
  ('8d8690c2-0c46-408a-af93-2c4de7a3d4f5'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'rejected',   now() - interval '12 days', 'Candidature pour le poste d''ingénieur exploration.', 'Niveau insuffisant'),
  ('5014f3fb-88d4-4627-8024-b466e34113a6'::uuid, 'e4085adf-79ca-4708-84d5-03ff02887531'::uuid, 'reviewing',  now() - interval '5 days',  'Géologue explorationniste, 10 ans d''expérience offshore.', 'Profil senior très intéressant')
) AS v(candidate_id, job_opening_id, status, created_at, cover_letter, internal_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM candidate_applications ca
  WHERE ca.candidate_id = v.candidate_id
    AND ca.job_opening_id = v.job_opening_id
);
