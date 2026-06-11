DO $$
DECLARE
  v_cand_id  uuid := 'c0000001-0000-0000-0000-000000000001';
  v_app_id   uuid := 'a0000001-0000-0000-0000-000000000001';
  v_job_id   uuid := 'f0d69104-c239-437a-89d6-6fc7289c7afd';
BEGIN

-- 1. Candidate record
INSERT INTO candidates (
  id, first_name, last_name, email, phone, phone2,
  location, region, nationality, national_id,
  professional_title, desired_position,
  desired_salary_min, desired_salary_max,
  availability_date, mobility,
  linkedin_url, summary,
  profile_completed, source, status,
  birth_date, gender
) VALUES (
  v_cand_id,
  'Jean-Marie', 'ESSOMBA',
  'jm.essomba@example.cm',
  '+237 699 123 456', '+237 677 654 321',
  'Douala, Cameroun', 'Littoral', 'Camerounaise', 'CM123456789',
  'Ingénieur de Production Pétrolière',
  'Ingénieur Production Senior',
  800000, 1200000,
  '2026-07-01', 'national',
  'https://linkedin.com/in/jm-essomba',
  'Ingénieur de production pétrolière avec 9 ans d''expérience au sein de grandes compagnies pétrolières en Afrique centrale. Expert en optimisation des opérations de production, gestion des installations offshore/onshore, et supervision d''équipes pluridisciplinaires. Solide maîtrise des normes HSE et des outils de simulation de réservoir.',
  true, 'direct', 'active',
  '1990-03-15', 'M'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Experiences
INSERT INTO candidate_experiences (candidate_id, job_title, company, sector, contract_type, location, start_date, end_date, is_current, description)
VALUES
  (v_cand_id, 'Ingénieur de Production', 'Total Energies E&P Cameroun', 'Pétrole & Gaz', 'CDI', 'Douala, Cameroun', '2020-01-01', NULL, true,
   'Supervision des opérations de production sur le champ pétrolier de Lokélé. Optimisation des taux de production (+12 %). Gestion d''une équipe de 15 techniciens. Suivi des indicateurs HSE et rédaction des rapports de performance mensuelle.'),
  (v_cand_id, 'Ingénieur Production Junior', 'Perenco Cameroun', 'Pétrole & Gaz', 'CDI', 'Kribi, Cameroun', '2017-06-01', '2019-12-31', false,
   'Participation aux opérations d''extraction sur le bloc Bomana. Maintenance préventive des équipements de surface. Analyse des données de production et établissement des rapports hebdomadaires.'),
  (v_cand_id, 'Stagiaire Ingénieur Production', 'SNH — Société Nationale des Hydrocarbures', 'Pétrole & Gaz', 'Stage', 'Yaoundé, Cameroun', '2016-03-01', '2016-08-31', false,
   'Stage de fin d''études : étude de faisabilité pour l''optimisation de la récupération assistée du pétrole sur un champ mature. Rédaction du rapport technique et présentation aux équipes de direction.')
ON CONFLICT DO NOTHING;

-- 3. Educations
INSERT INTO candidate_educations (candidate_id, education_level, degree, institution, field_of_study, country, location, start_date, end_date, is_current, grade, description)
VALUES
  (v_cand_id, 'BAC+5 (Master)', 'Diplôme d''Ingénieur — Génie Pétrolier', 'ENSP — École Nationale Supérieure Polytechnique de Yaoundé', 'Génie Pétrolier et Gazier', 'Cameroun', 'Yaoundé', '2011-09-01', '2016-07-31', false, 'Très bien', 'Major de promotion 2016. Mémoire de fin d''études sur l''optimisation de la récupération assistée du pétrole (EOR).'),
  (v_cand_id, 'BAC', 'Baccalauréat Scientifique — Série C', 'Lycée Général Leclerc', 'Mathématiques et Sciences Physiques', 'Cameroun', 'Yaoundé', '2007-09-01', '2011-06-30', false, 'Mention Bien', NULL)
ON CONFLICT DO NOTHING;

-- 4. Skills (linked to master skills table)
INSERT INTO candidate_candidate_skills (candidate_id, skill_id, name, category, level)
VALUES
  (v_cand_id, 'a1000001-0000-0000-0000-000000000002', 'Production hydrocarbures',  'technical', 'expert'),
  (v_cand_id, 'a1000001-0000-0000-0000-000000000005', 'Géologie appliquée',         'technical', 'advanced'),
  (v_cand_id, 'a1000001-0000-0000-0000-000000000001', 'Forage pétrolier',           'technical', 'advanced'),
  (v_cand_id, 'a1000001-0000-0000-0000-000000000004', 'Sécurité industrielle HSE',  'technical', 'advanced'),
  (v_cand_id, 'a1000001-0000-0000-0000-000000000012', 'Gestion de projet',          'technical', 'intermediate'),
  (v_cand_id, 'a1000001-0000-0000-0000-000000000013', 'Management d''équipe',       'soft',      'intermediate'),
  (v_cand_id, 'a1000001-0000-0000-0000-000000000019', 'Anglais professionnel B2',   'language',  'advanced')
ON CONFLICT DO NOTHING;

-- 5. Languages
INSERT INTO candidate_languages (candidate_id, name, level)
VALUES
  (v_cand_id, 'Français', 'excellent'),
  (v_cand_id, 'Anglais',  'good'),
  (v_cand_id, 'Espagnol', 'beginner')
ON CONFLICT DO NOTHING;

-- 6. Application — status: integrated (all pipeline stages passed)
INSERT INTO candidate_applications (
  id, candidate_id, job_opening_id, desired_position,
  cover_letter, status, internal_notes,
  interview_date, rating,
  offer_date, offer_salary, offer_contract_type, offer_start_date,
  trial_period_months, trial_end_date,
  hiring_decision_date, hiring_manager_notes,
  created_at, updated_at
) VALUES (
  v_app_id,
  v_cand_id,
  v_job_id,
  'Ingénieur Production Senior',
  'Madame, Monsieur,

Je vous soumets ma candidature pour le poste d''Ingénieur Production Senior au sein de la SNH. Fort de 9 années d''expérience dans le secteur pétrolier en Afrique centrale, notamment chez Total Energies E&P Cameroun et Perenco Cameroun, je dispose d''une expertise solide en production d''hydrocarbures, optimisation des opérations et management d''équipes techniques.

Mon passage à la SNH en tant que stagiaire m''a confirmé l''excellence des pratiques de cette institution. J''aspire à y contribuer pleinement à la hauteur des enjeux stratégiques du secteur.

Dans l''attente de votre réponse, je reste disponible pour tout entretien.

Veuillez agréer, Madame, Monsieur, l''expression de mes salutations distinguées.

Jean-Marie ESSOMBA',
  'integrated',
  'Excellent candidat. Très bon profil technique, bonne présentation lors des entretiens. Panel RH unanime. Offre CDI signée le 05/06/2026. Intégration prévue le 01/07/2026. Salaire retenu : 1 050 000 FCFA/mois + avantages.',
  '2026-05-20 09:00:00+01',
  5,
  '2026-06-05', 1050000, 'CDI', '2026-07-01',
  3, '2026-09-30',
  '2026-06-05',
  'Candidat retenu à l''unanimité par le panel RH. Profil exceptionnel — major de promotion ENSP 2016, 9 ans d''expérience terrain chez Total et Perenco. Prise de poste le 1er juillet 2026 dans la Direction Exploration & Production.',
  '2026-04-10 08:30:00+01',
  '2026-06-10 14:00:00+01'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'integrated',
  updated_at = now();

END $$;
