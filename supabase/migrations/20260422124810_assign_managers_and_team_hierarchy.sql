/*
  # Assignation des managers et hiérarchie par département

  ## Changements
  - Chaque Directeur devient le manager de tous ses collaborateurs directs dans son département
  - Pour Direction Technique: le Directeur Technique manage les Chefs d'Équipe,
    et chaque Chef d'Équipe manage un sous-groupe de techniciens/opérateurs/ingénieurs
  - Le DG manage tous les Directeurs
  - Le DGA manage les Directeurs en l'absence du DG (manager_id = DG)

  ## Résultat
  - manager_id renseigné sur tous les employés actifs
  - Arborescence hiérarchique complète pour l'organigramme
*/

-- DGA rapporte au DG
UPDATE employees
SET manager_id = '05fbe4ed-0a17-4eee-b040-1da4bf7284bb'  -- Jean-Pierre Mbarga (DG)
WHERE id = '78531901-cc2d-40d0-b679-6ce7c1053851';        -- Marie-Claire Fotso (DGA)

-- Tous les Directeurs de département rapportent au DG
UPDATE employees e
SET manager_id = '05fbe4ed-0a17-4eee-b040-1da4bf7284bb'  -- DG
FROM positions p
WHERE e.position_id = p.id
  AND p.title ILIKE '%Directeur%'
  AND p.title NOT ILIKE '%Directeur Général%'
  AND e.employment_status = 'active'
  AND e.id != '05fbe4ed-0a17-4eee-b040-1da4bf7284bb';

-- Direction Commerciale: tous rapportent au Directeur Commercial
UPDATE employees e
SET manager_id = '69fcb373-5e0c-42b3-b2c3-488725cbef9c'  -- Ulrich Foe (Dir Commercial)
FROM departments d
WHERE e.department_id = d.id
  AND d.name = 'Direction Commerciale'
  AND e.employment_status = 'active'
  AND e.id != '69fcb373-5e0c-42b3-b2c3-488725cbef9c';

-- Direction RH: Gestionnaires/Assistants rapportent au Chef Service du Personnel
-- Chef Service du Personnel rapporte au DRH (déjà set par la règle Directeur)
UPDATE employees e
SET manager_id = '7321171c-8235-4a9d-ae2f-45ebde6ac032'  -- Françoise Tchouake (Chef Service)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction des Ressources Humaines'
  AND p.title IN ('Assistant RH', 'Gestionnaire RH')
  AND e.employment_status = 'active';

-- DRH manage le Chef Service du Personnel
UPDATE employees
SET manager_id = 'a4593f7d-482a-472d-abe4-6c388b53cbc2'  -- Paul Nkotto (DRH)
WHERE id = '7321171c-8235-4a9d-ae2f-45ebde6ac032';

-- Direction Financière: tous rapportent au Directeur Financier
UPDATE employees e
SET manager_id = '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1'  -- Alain Kamga (Dir Financier)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Financière'
  AND p.title IN ('Chef Comptable','Comptable','Assistant Comptable')
  AND e.employment_status = 'active';

-- Direction HSE: Agent HSE et Responsable Sécurité rapportent au Directeur HSE
UPDATE employees e
SET manager_id = '076d5c44-a1a0-4912-b884-a9f09f1bb44e'  -- Charles Owona (Dir HSE)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction HSE'
  AND p.title IN ('Agent HSE','Responsable Sécurité')
  AND e.employment_status = 'active';

-- Direction Juridique: tous rapportent au Directeur Juridique
UPDATE employees e
SET manager_id = '0d9e09bf-6dcf-45f9-8ac5-032b50b67477'  -- Hervé Nkolo Foe (Dir Juridique)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Juridique'
  AND p.title IN ('Juriste','Juriste Senior')
  AND e.employment_status = 'active';

-- Direction Logistique: Agent Logistique et Acheteur rapportent au Responsable Achats
-- Responsable Achats rapporte au Directeur Logistique
UPDATE employees e
SET manager_id = '601d21ef-0cd0-4592-acce-ab222ad652dc'  -- Oscar Ngako (Resp Achats)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Logistique'
  AND p.title IN ('Agent Logistique','Acheteur')
  AND e.employment_status = 'active';

UPDATE employees
SET manager_id = 'e5520598-71ad-455e-9a78-a66e5fe415c7'  -- Nadine Ebang (Dir Logistique)
WHERE id = '601d21ef-0cd0-4592-acce-ab222ad652dc';

-- Direction Technique: Directeur Technique manage les Chefs d'Équipe et Ingénieurs
UPDATE employees e
SET manager_id = 'b1334b2b-99da-4af4-bf8c-522605f425c2'  -- Quentin Fofana (Dir Technique)
FROM departments d, positions p
WHERE e.department_id = d.id
  AND e.position_id = p.id
  AND d.name = 'Direction Technique'
  AND (p.title ILIKE '%Chef d%quipe%' OR p.title = 'Ingénieur Production')
  AND e.employment_status = 'active';

-- Chefs d'équipe managent les techniciens et opérateurs
-- Attribution round-robin des techniciens/opérateurs aux 4 chefs d'équipe
DO $$
DECLARE
  chefs uuid[] := ARRAY[
    'f1cc565e-75dc-41ee-a486-4184d12ff321',  -- William Abega
    '92da1834-aa71-4826-9544-d6c806d5c30b',  -- Zacharie Eba'a
    '0b11134d-c9b6-43b4-8661-80771ac3d424',  -- Xavier Nguini
    '80ae4c9b-aa21-4ac7-af62-64651078addd'   -- Yvette Song
  ];
  emp RECORD;
  counter int := 0;
BEGIN
  FOR emp IN
    SELECT e.id FROM employees e
    JOIN departments d ON d.id = e.department_id
    JOIN positions p ON p.id = e.position_id
    WHERE e.employment_status = 'active'
      AND d.name = 'Direction Technique'
      AND p.title IN ('Technicien','Opérateur')
    ORDER BY e.id
  LOOP
    UPDATE employees
    SET manager_id = chefs[(counter % 4) + 1]
    WHERE id = emp.id;
    counter := counter + 1;
  END LOOP;
END $$;
