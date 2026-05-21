/*
  # Creation d'enregistrements employes pour les comptes role speciaux

  1. Contexte
    - Plusieurs comptes utilisateurs (admin, director, manager, managers metiers)
      n'ont pas d'enregistrement correspondant dans la table employees.
    - Cela empeche ces utilisateurs d'interagir dans les discussions QVCT
      (et tout autre module qui requiert un employee_id), car les policies RLS
      exigent une correspondance entre auth.uid() et employees.user_id.

  2. Changements
    - Backfill: creation d'un enregistrement employees pour chaque user_profile
      ne disposant pas encore d'employe associe.
    - Les champs obligatoires sont renseignes avec des valeurs coherentes :
      employee_number unique, email, nom, date d'embauche courante,
      statut actif, contrat CDI par defaut.

  3. Securite
    - Ne modifie aucune policy RLS existante.
    - Ne supprime aucune donnee.
    - Utilise INSERT...SELECT avec WHERE NOT EXISTS pour eviter les doublons.
*/

INSERT INTO employees (
  user_id,
  employee_number,
  first_name,
  last_name,
  email,
  hire_date,
  employment_status,
  contract_type
)
SELECT
  up.id,
  'SNH-' || UPPER(LEFT(up.role, 3)) || '-' || LPAD((
    ROW_NUMBER() OVER (ORDER BY up.email)
  )::text, 4, '0') || '-' || LEFT(REPLACE(up.id::text, '-', ''), 6),
  COALESCE(NULLIF(up.first_name, ''), 'Utilisateur'),
  COALESCE(NULLIF(up.last_name, ''), up.role),
  up.email,
  CURRENT_DATE,
  'active',
  'CDI'
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.user_id = up.id
);
