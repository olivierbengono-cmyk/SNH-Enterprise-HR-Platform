/*
  # Seed current_salary for all active employees

  ## Purpose
  All employees currently have current_salary = NULL, which prevents the payroll
  generation module from finding any eligible employees.

  ## Changes
  - Sets current_salary on every active employee based on their position title,
    using a realistic SNH salary grid in FCFA.
  - A small pseudo-random variation (+/- up to 10%) is applied per employee
    so figures look natural in the demo.

  ## Salary ranges applied (FCFA brut mensuel)
  | Level                         | Base      |
  |-------------------------------|-----------|
  | Directeur Général / DGA       | 3 200 000 |
  | Directeur (any direction)     | 1 800 000 |
  | Chef Service / Chef d'Équipe  |   950 000 |
  | Responsable                   |   750 000 |
  | Juriste Senior / Ing. Senior  |   680 000 |
  | Ingénieur / Juriste           |   560 000 |
  | Comptable / Chef Comptable    |   520 000 |
  | Commercial / Chef des Ventes  |   480 000 |
  | Technicien                    |   420 000 |
  | Agent / Opérateur             |   370 000 |
  | Assistant                     |   300 000 |
  | Fallback (any other)          |   400 000 |

  ## Notes
  - Only updates rows where current_salary IS NULL to avoid overwriting
    any manually set values.
  - No data is deleted.
*/

UPDATE employees
SET current_salary = (
  CASE
    WHEN p.title ILIKE '%Directeur Général Adjoint%' THEN 2800000
    WHEN p.title ILIKE '%Directeur Général%'         THEN 3200000
    WHEN p.title ILIKE '%Directeur%'                 THEN 1800000
    WHEN p.title ILIKE '%Chef Service%'              THEN  950000
    WHEN p.title ILIKE '%Chef d%quipe%'              THEN  900000
    WHEN p.title ILIKE '%Chef des Ventes%'           THEN  620000
    WHEN p.title ILIKE '%Responsable%'               THEN  750000
    WHEN p.title ILIKE '%Senior%'                    THEN  680000
    WHEN p.title ILIKE '%Ingénieur%'                 THEN  560000
    WHEN p.title ILIKE '%Juriste%'                   THEN  540000
    WHEN p.title ILIKE '%Chef Comptable%'            THEN  580000
    WHEN p.title ILIKE '%Comptable%'                 THEN  480000
    WHEN p.title ILIKE '%Commercial%'                THEN  460000
    WHEN p.title ILIKE '%Technicien%'                THEN  420000
    WHEN p.title ILIKE '%Agent%'                     THEN  370000
    WHEN p.title ILIKE '%Opérateur%'                 THEN  380000
    WHEN p.title ILIKE '%Opérateur%'                 THEN  380000
    WHEN p.title ILIKE '%Assistant%'                 THEN  300000
    WHEN p.title ILIKE '%Gestionnaire%'              THEN  450000
    WHEN p.title ILIKE '%Acheteur%'                  THEN  430000
    ELSE 400000
  END
  -- Add a deterministic per-employee variation of ±8 % based on the UUID
  * (1 + (('x' || substr(employees.id::text, 1, 8))::bit(32)::int % 17 - 8)::numeric / 100)
)
FROM positions p
WHERE employees.position_id = p.id
  AND employees.employment_status = 'active'
  AND employees.current_salary IS NULL;

-- Handle employees without a position_id (fallback)
UPDATE employees
SET current_salary = 400000
WHERE employment_status = 'active'
  AND current_salary IS NULL;
