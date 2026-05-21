/*
  # Seed HR Fixtures v5 - Version finale corrigée

  Corrections appliquées:
  - performance_reviews: colonnes réelles (no achievements/goals_met/submitted_at/validated_at)
  - review_type: 'annual','mid_year','probation','project'
  - status: 'draft','submitted','completed'
*/

-- ============================================================
-- 1. COMPÉTENCES (skills)
-- ============================================================
INSERT INTO skills (id, name, category, description) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Forage pétrolier', 'technical', 'Maîtrise des opérations de forage et complétion de puits'),
  ('a1000001-0000-0000-0000-000000000002', 'Production hydrocarbures', 'technical', 'Gestion de la production de pétrole et gaz'),
  ('a1000001-0000-0000-0000-000000000003', 'Maintenance industrielle', 'technical', 'Entretien préventif et curatif des équipements de production'),
  ('a1000001-0000-0000-0000-000000000004', 'Sécurité industrielle HSE', 'technical', 'Application des normes HSSE dans un contexte pétrolier'),
  ('a1000001-0000-0000-0000-000000000005', 'Géologie appliquée', 'technical', 'Interprétation des données géologiques et sismiques'),
  ('a1000001-0000-0000-0000-000000000006', 'Comptabilité OHADA', 'technical', 'Maîtrise du plan comptable OHADA et des normes camerounaises'),
  ('a1000001-0000-0000-0000-000000000007', 'Contrôle de gestion', 'technical', 'Élaboration et suivi des budgets et tableaux de bord'),
  ('a1000001-0000-0000-0000-000000000008', 'Fiscalité camerounaise', 'technical', 'Application des règles fiscales DGI/CEMAC'),
  ('a1000001-0000-0000-0000-000000000009', 'Droit OHADA', 'technical', 'Connaissance approfondie du droit des affaires OHADA'),
  ('a1000001-0000-0000-0000-000000000010', 'Droit du travail camerounais', 'technical', 'Code du travail et conventions collectives secteur pétrolier'),
  ('a1000001-0000-0000-0000-000000000011', 'Négociation commerciale', 'technical', 'Techniques de vente et négociation B2B secteur énergie'),
  ('a1000001-0000-0000-0000-000000000012', 'Gestion de projet', 'technical', 'Méthodologies de conduite de projet PMBok'),
  ('a1000001-0000-0000-0000-000000000013', 'Management d''équipe', 'soft', 'Animation, motivation et développement des équipes'),
  ('a1000001-0000-0000-0000-000000000014', 'Gestion RH et paie', 'technical', 'Administration du personnel, paie, GPEC'),
  ('a1000001-0000-0000-0000-000000000015', 'Recrutement et sélection', 'technical', 'Processus de recrutement et assessment center'),
  ('a1000001-0000-0000-0000-000000000016', 'Excel et Power BI', 'technical', 'Analyse de données et reporting avec outils Office'),
  ('a1000001-0000-0000-0000-000000000017', 'SAP HR et ERP', 'technical', 'Utilisation des modules RH dans les ERP'),
  ('a1000001-0000-0000-0000-000000000018', 'Logistique supply chain', 'technical', 'Gestion des approvisionnements et chaîne logistique'),
  ('a1000001-0000-0000-0000-000000000019', 'Anglais professionnel B2', 'language', 'Communication professionnelle orale et écrite en anglais'),
  ('a1000001-0000-0000-0000-000000000020', 'Communication et présentation', 'soft', 'Animation de réunions, rédaction de rapports, présentations')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. RÉFÉRENTIEL DE COMPÉTENCES
-- ============================================================
INSERT INTO competency_framework (id, name, category, description, level_definitions, applicable_roles) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'Expertise technique métier', 'technical',
   'Niveau de maîtrise technique dans son domaine de spécialité',
   '{"1":"Notions de base","2":"Pratique autonome","3":"Expert reconnu","4":"Référent national","5":"Expert international"}'::jsonb,
   ARRAY['employee','manager']),
  ('b1000001-0000-0000-0000-000000000002', 'Leadership et management', 'leadership',
   'Capacité à diriger, inspirer et développer les collaborateurs',
   '{"1":"Se manage soi-même","2":"Manage une petite équipe","3":"Manage des managers","4":"Manage une direction","5":"Dirige l''organisation"}'::jsonb,
   ARRAY['manager','director','drh']),
  ('b1000001-0000-0000-0000-000000000003', 'Orientation résultats', 'behavioral',
   'Capacité à atteindre les objectifs fixés avec rigueur',
   '{"1":"Atteint partiellement","2":"Atteint ses objectifs","3":"Dépasse ses objectifs","4":"Crée de la valeur","5":"Transforme l''organisation"}'::jsonb,
   ARRAY['employee','manager','director']),
  ('b1000001-0000-0000-0000-000000000004', 'Travail en équipe', 'core',
   'Aptitude à collaborer efficacement avec ses pairs',
   '{"1":"Participe","2":"Contribue activement","3":"Fédère","4":"Crée des synergies","5":"Culture collaborative"}'::jsonb,
   ARRAY['employee','manager','director','drh']),
  ('b1000001-0000-0000-0000-000000000005', 'Culture Sécurité HSE', 'core',
   'Respect et promotion de la culture sécurité au quotidien',
   '{"1":"Connait les règles","2":"Applique les procédures","3":"Sensibilise ses pairs","4":"Champion HSE","5":"Pilote la stratégie HSE"}'::jsonb,
   ARRAY['employee','manager','director'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. COMPÉTENCES EMPLOYÉS
-- ============================================================
INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id,
       (ARRAY['beginner','intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,1,4))::bit(16)::int%4)],
       (e.hire_date+interval '3 months')::date, '2025-12-15'::date
FROM employees e
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000016','a1000001-0000-0000-0000-000000000019')) s
WHERE e.employment_status='active'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '6 months')::date, '2025-11-01'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000002','a1000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000012')) s
WHERE e.employment_status='active' AND d.name='Direction Technique' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '4 months')::date, '2026-01-15'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000006','a1000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000008')) s
WHERE e.employment_status='active' AND d.name='Direction Financière' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '2 months')::date, '2025-10-01'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000014','a1000001-0000-0000-0000-000000000015','a1000001-0000-0000-0000-000000000017')) s
WHERE e.employment_status='active' AND d.name='Direction des Ressources Humaines' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '1 month')::date, '2025-09-15'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000010')) s
WHERE e.employment_status='active' AND d.name='Direction Juridique' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '3 months')::date, '2025-12-01'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000011','a1000001-0000-0000-0000-000000000013','a1000001-0000-0000-0000-000000000020')) s
WHERE e.employment_status='active' AND d.name='Direction Commerciale' ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date)
SELECT e.id, s.id, (ARRAY['intermediate','advanced','expert'])[1+(('x'||substr(e.id::text,5,4))::bit(16)::int%3)],
       (e.hire_date+interval '3 months')::date, '2025-11-15'::date
FROM employees e JOIN departments d ON d.id=e.department_id
CROSS JOIN (SELECT id FROM skills WHERE id IN ('a1000001-0000-0000-0000-000000000018','a1000001-0000-0000-0000-000000000012')) s
WHERE e.employment_status='active' AND d.name='Direction Logistique' ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. PROGRAMMES DE FORMATION
-- ============================================================
INSERT INTO training_programs (id,title,code,category,provider,duration_hours,cost,description,is_mandatory,status,start_date,end_date) VALUES
  ('c1000001-0000-0000-0000-000000000001','Sécurité installations pétrolières - Risque H2S','TRN-HSE-001','safety','TOTAL Energies Training Center',24,850000,'Formation obligatoire sur les risques H2S en zone de production',true,'completed','2025-09-01','2025-09-03'),
  ('c1000001-0000-0000-0000-000000000002','Comptabilité OHADA approfondie','TRN-FIN-001','technical','CERFI Yaoundé',32,450000,'Révision complète du SYSCOHADA révisé et normes CEMAC',false,'completed','2025-10-15','2025-10-19'),
  ('c1000001-0000-0000-0000-000000000003','Management d''équipe et leadership situationnel','TRN-MGT-001','management','Institut de Management du Cameroun',16,320000,'Développer ses compétences managériales et adapter son style',false,'completed','2025-11-10','2025-11-11'),
  ('c1000001-0000-0000-0000-000000000004','Excel avancé et Power BI','TRN-IT-001','technical','Interne SNH - DSI',8,0,'Analyse de données RH et tableaux de bord décisionnels',false,'completed','2025-12-05','2025-12-05'),
  ('c1000001-0000-0000-0000-000000000005','Actualité du droit du travail 2026','TRN-JUR-001','compliance','Barreau du Centre - Yaoundé',8,180000,'Évolutions du code du travail et jurisprudences récentes',true,'ongoing','2026-02-20','2026-02-20'),
  ('c1000001-0000-0000-0000-000000000006','Négociation commerciale à fort enjeu','TRN-COM-001','management','CCI du Cameroun',16,280000,'Techniques de closing et négociation dans le secteur énergie',false,'ongoing','2026-03-01','2026-03-02'),
  ('c1000001-0000-0000-0000-000000000007','Anglais professionnel secteur énergie - B2','TRN-LANG-001','other','British Council Douala',60,420000,'Préparation TOEIC et anglais des affaires secteur pétrolier',false,'ongoing','2026-01-06','2026-06-27'),
  ('c1000001-0000-0000-0000-000000000008','Maintenance prédictive et GMAO','TRN-TECH-001','technical','École Polytechnique de Yaoundé',40,550000,'GMAO et maintenance conditionnelle des équipements industriels',false,'planned','2026-05-12','2026-05-16')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score,feedback)
SELECT 'c1000001-0000-0000-0000-000000000001',e.id,'completed','2025-08-25'::date,'2025-09-03'::date,
       70+(('x'||substr(e.id::text,1,4))::bit(16)::int%28),'Formation très utile, mise en pratique immédiate sur site'
FROM employees e JOIN departments d ON d.id=e.department_id
WHERE e.employment_status='active' AND d.name IN ('Direction Technique','Direction HSE')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score,feedback)
SELECT 'c1000001-0000-0000-0000-000000000002',e.id,'completed','2025-10-01'::date,'2025-10-19'::date,
       75+(('x'||substr(e.id::text,1,4))::bit(16)::int%23),'Excellente mise à niveau, formateur très compétent'
FROM employees e JOIN departments d ON d.id=e.department_id
WHERE e.employment_status='active' AND d.name='Direction Financière' ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score,feedback)
SELECT 'c1000001-0000-0000-0000-000000000003',e.id,
       CASE WHEN p.title ILIKE '%Directeur%' THEN 'completed' ELSE 'enrolled' END,
       '2025-11-01'::date,
       CASE WHEN p.title ILIKE '%Directeur%' THEN '2025-11-11'::date ELSE NULL::date END,
       CASE WHEN p.title ILIKE '%Directeur%' THEN (82+(('x'||substr(e.id::text,1,4))::bit(16)::int%16))::integer ELSE NULL::integer END,
       CASE WHEN p.title ILIKE '%Directeur%' THEN 'Contenu pertinent, cas pratiques très parlants'::text ELSE NULL::text END
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active'
  AND (p.title ILIKE '%Directeur%' OR p.title ILIKE '%Chef Service%' OR p.title ILIKE '%Chef d%quipe%' OR p.title ILIKE '%Responsable%')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date,completion_date,score)
SELECT 'c1000001-0000-0000-0000-000000000004',e.id,'completed','2025-12-01'::date,'2025-12-05'::date,
       80+(('x'||substr(e.id::text,1,4))::bit(16)::int%19)
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active' AND (p.title ILIKE '%Assistant%' OR p.title ILIKE '%Gestionnaire%')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date)
SELECT 'c1000001-0000-0000-0000-000000000005',e.id,'enrolled','2026-02-10'::date
FROM employees e JOIN departments d ON d.id=e.department_id
WHERE e.employment_status='active' AND d.name IN ('Direction des Ressources Humaines','Direction Juridique')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date)
SELECT 'c1000001-0000-0000-0000-000000000007',e.id,'enrolled','2026-01-06'::date
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active' AND (p.title ILIKE '%Commercial%' OR p.title ILIKE '%Ingénieur%' OR p.title ILIKE '%Juriste%')
ON CONFLICT DO NOTHING;

INSERT INTO training_enrollments (training_program_id,employee_id,enrollment_status,enrollment_date)
SELECT 'c1000001-0000-0000-0000-000000000008',e.id,'enrolled','2026-04-20'::date
FROM employees e JOIN positions p ON p.id=e.position_id
WHERE e.employment_status='active' AND (p.title ILIKE '%Technicien%' OR p.title ILIKE '%Ingénieur%')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. OBJECTIFS + KEY RESULTS
-- ============================================================
DO $$
DECLARE emp RECORD; obj_id uuid; counter int:=0;
BEGIN
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id WHERE e.employment_status='active'
    AND d.name='Direction Technique' AND p.title IN ('Ingénieur Production','Technicien','Chef d''Équipe') LIMIT 8
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Optimiser le taux de disponibilité des équipements',
      'Atteindre un taux de disponibilité mécanique ≥ 95% sur les équipements de production assignés',
      'individual','annual',2026,'active','2026-01-01','2026-12-31',
      (SELECT user_id FROM employees WHERE id='b1334b2b-99da-4af4-bf8c-522605f425c2')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'Taux de disponibilité mécanique','Disponibilité mensuelle moyenne',95,88+(counter%7),'%',50,'in_progress'),
      (obj_id,'Arrêts non planifiés','Arrêts imprévus par trimestre',2,4-(counter%3),'arrêts',30,'at_risk'),
      (obj_id,'Budget maintenance','Écart budget vs réalisé',5,2+(counter%4),'%',20,'in_progress') ON CONFLICT DO NOTHING;
  END LOOP;
  counter:=0;
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id WHERE e.employment_status='active'
    AND d.name='Direction Commerciale' AND p.title IN ('Commercial','Chef des Ventes') LIMIT 6
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Atteindre les objectifs de vente T1 2026',
      'Réaliser 100% du budget commercial alloué pour le premier trimestre 2026',
      'individual','Q1',2026,'active','2026-01-01','2026-03-31',
      (SELECT user_id FROM employees WHERE id='69fcb373-5e0c-42b3-b2c3-488725cbef9c')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'CA réalisé vs budget','Chiffre d''affaires T1 2026',100,78+(counter*3),'%',60,'in_progress'),
      (obj_id,'Nouveaux contrats','Contrats signés nouveaux clients',3,counter%3,'contrats',40,'in_progress') ON CONFLICT DO NOTHING;
  END LOOP;
  counter:=0;
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    WHERE e.employment_status='active' AND d.name='Direction des Ressources Humaines' LIMIT 5
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Digitaliser les processus RH clés',
      'Déployer le module ERP RH et former 100% des collaborateurs aux nouveaux outils',
      'team','annual',2026,'active','2026-01-01','2026-12-31',
      (SELECT user_id FROM employees WHERE id='a4593f7d-482a-472d-abe4-6c388b53cbc2')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'Déploiement ERP','Modules RH mis en production',100,40+(counter*8),'%',50,'in_progress'),
      (obj_id,'Employés formés','Taux de formation aux outils',100,30+(counter*10),'%',50,'in_progress') ON CONFLICT DO NOTHING;
  END LOOP;
  counter:=0;
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id WHERE e.employment_status='active'
    AND d.name='Direction Financière' AND p.title IN ('Comptable','Chef Comptable','Directeur Financier') LIMIT 5
  LOOP counter:=counter+1; obj_id:=gen_random_uuid();
    INSERT INTO objectives(id,employee_id,title,description,type,period,year,status,start_date,end_date,created_by)
    VALUES(obj_id,emp.id,'Clôturer les comptes annuels 2025 dans les délais',
      'Finaliser les états financiers OHADA avant le 30 avril 2026 et préparer le rapport annuel',
      'individual','Q1',2026,'active','2026-01-01','2026-04-30',
      (SELECT user_id FROM employees WHERE id='5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1')) ON CONFLICT DO NOTHING;
    INSERT INTO key_results(objective_id,title,metric,target_value,current_value,unit,weight,status) VALUES
      (obj_id,'Clôture comptable','Avancement états financiers',100,60+(counter*8),'%',70,'in_progress'),
      (obj_id,'Rapport annuel','Rapport validé Direction',1,0,'rapport',30,'not_started') ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 6. ÉVALUATIONS DE PERFORMANCE
-- colonnes réelles: employee_id, reviewer_id, review_period, review_year, review_type,
--   overall_rating, strengths, areas_for_improvement, comments, status, review_date
-- ============================================================
DO $$
DECLARE emp RECORD; mgr_id uuid; counter int:=0;
  strengths_arr text[] := ARRAY[
    'Excellente maîtrise technique, fiabilité et rigueur dans l''exécution des tâches quotidiennes',
    'Grande capacité d''adaptation, esprit d''initiative et sens aigu du service rendu',
    'Expertise métier reconnue par ses pairs, bon communicant et très pédagogue'
  ];
  improve_arr text[] := ARRAY[
    'Développer les compétences en gestion de projet et renforcer la prise de décision autonome',
    'Renforcer la communication transversale avec les autres directions et améliorer le reporting',
    'Approfondir les connaissances réglementaires et préparer les certifications métier prioritaires'
  ];
BEGIN
  FOR emp IN SELECT e.id, e.department_id FROM employees e JOIN departments d ON d.id=e.department_id
    WHERE e.employment_status='active'
      AND d.name IN ('Direction Technique','Direction Financière','Direction Commerciale',
                     'Direction des Ressources Humaines','Direction HSE','Direction Logistique','Direction Juridique')
    LIMIT 50
  LOOP
    counter:=counter+1;
    SELECT e2.id INTO mgr_id FROM employees e2 JOIN positions p2 ON p2.id=e2.position_id
    WHERE e2.department_id=emp.department_id AND p2.title ILIKE '%Directeur%' AND e2.id!=emp.id ORDER BY e2.id LIMIT 1;
    CONTINUE WHEN mgr_id IS NULL;
    INSERT INTO performance_reviews(employee_id,reviewer_id,review_period,review_year,review_type,
      overall_rating,strengths,areas_for_improvement,comments,status,review_date)
    VALUES(emp.id,mgr_id,'annual',2025,'annual',
      LEAST(5,3+(counter%20)/10),
      strengths_arr[(counter%3)+1], improve_arr[(counter%3)+1],
      'Évaluation annuelle 2025 — Entretien réalisé le 15 janvier 2026.',
      'completed','2026-01-15'::date) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 7. NOTES DE FRAIS
-- ============================================================
DO $$
DECLARE emp RECORD; report_id uuid; counter int:=0;
  cat_transp uuid; cat_meal uuid; cat_fuel uuid; cat_hotel uuid;
  titles text[] := ARRAY['Déplacement mission Douala - Mars 2026','Formation externe - Février 2026','Visite client - Janvier 2026','Déplacement terrain - Avril 2026'];
  statuses text[] := ARRAY['approved','submitted','paid','approved'];
  amounts numeric[] := ARRAY[185000,92500,145000,67000];
BEGIN
  SELECT id INTO cat_transp FROM expense_categories WHERE code='TRANSP';
  SELECT id INTO cat_meal   FROM expense_categories WHERE code='MEAL';
  SELECT id INTO cat_fuel   FROM expense_categories WHERE code='FUEL';
  SELECT id INTO cat_hotel  FROM expense_categories WHERE code='HOTEL';
  FOR emp IN SELECT e.id FROM employees e JOIN positions p ON p.id=e.position_id
    WHERE e.employment_status='active' AND p.title NOT ILIKE '%Opérateur%' LIMIT 15
  LOOP
    counter:=counter+1; report_id:=gen_random_uuid();
    INSERT INTO expense_reports(id,employee_id,report_number,title,submission_date,period_start,period_end,total_amount,status,notes)
    VALUES(report_id,emp.id,'NDF-2026-'||LPAD(counter::text,4,'0'),titles[(counter%4)+1],
      (CURRENT_DATE-((4-counter%4)*7))::date,(CURRENT_DATE-((4-counter%4)*7+14))::date,
      (CURRENT_DATE-((4-counter%4)*7+7))::date,amounts[(counter%4)+1],statuses[(counter%4)+1],
      'Note de frais soumise pour remboursement conformément à la politique SNH') ON CONFLICT DO NOTHING;
    INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
    VALUES(report_id,cat_transp,(CURRENT_DATE-((4-counter%4)*7+13))::date,'Billet bus Yaoundé-Douala AR',18000,'XAF','General Express','cash',true);
    INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
    VALUES(report_id,cat_meal,(CURRENT_DATE-((4-counter%4)*7+12))::date,'Repas déjeuner réunion de travail',12500,'XAF','Restaurant Wouri Palace','cash',true);
    IF counter%2=0 THEN
      INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
      VALUES(report_id,cat_fuel,(CURRENT_DATE-((4-counter%4)*7+11))::date,'Carburant véhicule de service',22000,'XAF','Total Énergies Mvog-Mbi','personal_card',true);
    END IF;
    IF counter%3=0 THEN
      INSERT INTO expense_items(expense_report_id,category_id,date,description,amount,currency,merchant,payment_method,is_reimbursable)
      VALUES(report_id,cat_hotel,(CURRENT_DATE-((4-counter%4)*7+12))::date,'Nuitée Hôtel La Falaise Douala',45000,'XAF','Hôtel La Falaise','personal_card',true);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 8. SANCTIONS DISCIPLINAIRES
-- ============================================================
DO $$
DECLARE emp RECORD; counter int:=0;
BEGIN
  FOR emp IN SELECT e.id FROM employees e JOIN departments d ON d.id=e.department_id
    JOIN positions p ON p.id=e.position_id
    WHERE e.employment_status='active' AND d.name='Direction Technique' AND p.title='Technicien' LIMIT 2
  LOOP counter:=counter+1;
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active)
    VALUES(emp.id,'written_warning',2,'2025-10-14'::date,'2025-10-17'::date,
      'Retards répétés non justifiés : '||(counter+3)::text||' absences de pointage sur 3 semaines sans notification préalable.',
      'Avertissement écrit notifié avec rappel sur les obligations de ponctualité. Suivi mensuel mis en place.',
      (SELECT user_id FROM employees WHERE id='b1334b2b-99da-4af4-bf8c-522605f425c2'),
      'J''ai rencontré des contraintes de transport imprévues. Je m''engage à prévenir en cas d''empêchement.',
      '2025-11-17'::date,false,true) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

DO $$
DECLARE eid uuid;
BEGIN
  SELECT e.id INTO eid FROM employees e JOIN departments d ON d.id=e.department_id
  JOIN positions p ON p.id=e.position_id
  WHERE e.employment_status='active' AND d.name='Direction HSE' AND p.title='Agent HSE' LIMIT 1;
  IF eid IS NOT NULL THEN
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active,expiry_date)
    VALUES(eid,'verbal_warning',1,'2025-12-03'::date,'2025-12-05'::date,
      'Non-respect procédures HSE : port EPI non conforme lors d''une intervention de maintenance.',
      'Avertissement verbal enregistré. Recadrage immédiat sur le terrain. Rappel lors de la réunion de sécurité.',
      (SELECT user_id FROM employees WHERE id='076d5c44-a1a0-4912-b884-a9f09f1bb44e'),
      'C''était un oubli involontaire. Je suis conscient de l''importance des EPI.',
      '2026-01-05'::date,false,false,'2026-06-05'::date) ON CONFLICT DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE eid uuid;
BEGIN
  SELECT e.id INTO eid FROM employees e JOIN departments d ON d.id=e.department_id
  JOIN positions p ON p.id=e.position_id
  WHERE e.employment_status='active' AND d.name='Direction Commerciale' AND p.title='Commercial' LIMIT 1;
  IF eid IS NOT NULL THEN
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active)
    VALUES(eid,'final_warning',4,'2026-01-20'::date,'2026-01-24'::date,
      'Comportement inapproprié envers un collègue : propos déplacés et attitude conflictuelle lors d''une réunion, constatée par deux témoins.',
      'Avertissement final notifié par écrit. Entretien préalable DRH et manager. Accompagnement QVCT proposé. Surveillance 3 mois.',
      (SELECT user_id FROM employees WHERE id='a4593f7d-482a-472d-abe4-6c388b53cbc2'),
      'La pression des délais a été un facteur aggravant. Je reconnais que ma réaction était disproportionnée.',
      '2026-02-24'::date,true,true) ON CONFLICT DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE eid uuid;
BEGIN
  SELECT e.id INTO eid FROM employees e JOIN departments d ON d.id=e.department_id
  JOIN positions p ON p.id=e.position_id
  WHERE e.employment_status='active' AND d.name='Direction Logistique' AND p.title='Agent Logistique' LIMIT 1;
  IF eid IS NOT NULL THEN
    INSERT INTO disciplinary_actions(employee_id,action_type,severity_level,incident_date,action_date,
      infraction_description,action_taken,duration_days,issued_by,employee_statement,appeal_deadline,appeal_filed,is_active)
    VALUES(eid,'suspension',3,'2026-02-10'::date,'2026-02-14'::date,
      'Absence injustifiée de 3 jours consécutifs sans information de la hiérarchie, perturbant l''organisation du service.',
      'Mise à pied de 3 jours sans rémunération conformément au règlement intérieur SNH. Entretien de recadrage à la reprise.',
      3,(SELECT user_id FROM employees WHERE id='e5520598-71ad-455e-9a78-a66e5fe415c7'),
      'J''ai eu une urgence familiale et n''ai pas pu prévenir. Je présente mes excuses.',
      '2026-03-14'::date,false,false) ON CONFLICT DO NOTHING;
  END IF;
END $$;
