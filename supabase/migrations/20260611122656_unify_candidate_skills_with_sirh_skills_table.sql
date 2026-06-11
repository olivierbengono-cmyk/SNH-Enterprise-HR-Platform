-- Add skill_id FK to candidate_candidate_skills so both portal and SIRH share the same skills master table.
-- skill_id is nullable: candidates can still add custom (free-text) skills not in the master list.
ALTER TABLE candidate_candidate_skills
  ADD COLUMN IF NOT EXISTS skill_id uuid REFERENCES skills(id) ON DELETE SET NULL;

-- Backfill skill_id for existing rows that match by name (case-insensitive)
UPDATE candidate_candidate_skills ccs
SET skill_id = s.id
FROM skills s
WHERE lower(ccs.name) = lower(s.name)
  AND ccs.skill_id IS NULL;

-- Add soft skills that exist in the portal catalogue but not yet in the skills master table
INSERT INTO skills (name, category, description) VALUES
  ('Gestion de projet',            'technical', 'Planification, suivi et pilotage de projets')
ON CONFLICT DO NOTHING;

INSERT INTO skills (name, category, description) VALUES
  ('Ingénierie de réservoir',      'technical', 'Modélisation et gestion des réservoirs pétroliers'),
  ('Sismique & Exploration',       'technical', 'Acquisition et interprétation de données sismiques'),
  ('Production hydrocarbures',     'technical', 'Opérations de production et exploitation pétrolière'),
  ('Pétrophysique',                'technical', 'Analyse des propriétés pétrophysiques des réservoirs'),
  ('Modélisation de réservoir',    'technical', 'Simulation numérique des réservoirs pétroliers'),
  ('AutoCAD',                      'technical', 'Conception et dessin assisté par ordinateur'),
  ('MATLAB',                       'technical', 'Calcul numérique et simulation'),
  ('Génie civil',                  'technical', 'Conception et réalisation d''ouvrages civils'),
  ('Mécanique des fluides',        'technical', 'Étude du comportement des fluides'),
  ('Hydraulique',                  'technical', 'Systèmes et équipements hydrauliques'),
  ('Thermodynamique',              'technical', 'Transferts d''énergie et thermique industrielle'),
  ('Python',                       'technical', 'Programmation Python et data science'),
  ('SQL',                          'technical', 'Bases de données relationnelles et requêtes SQL'),
  ('Java',                         'technical', 'Développement Java'),
  ('JavaScript',                   'technical', 'Développement web JavaScript'),
  ('Réseaux informatiques',        'technical', 'Administration et sécurité des réseaux'),
  ('Comptabilité générale',        'technical', 'Tenue de la comptabilité générale OHADA/SYSCOHADA'),
  ('Analyse financière',           'technical', 'Analyse des états financiers et performance'),
  ('ISO 14001',                    'technical', 'Management environnemental (certification ISO 14001)'),
  ('ISO 45001',                    'technical', 'Santé et sécurité au travail'),
  ('Audit HSE',                    'technical', 'Audit Hygiène, Sécurité et Environnement'),
  ('Analyse des risques (HAZOP)',  'technical', 'Méthode d''analyse des risques industriels'),
  ('Droit des affaires',           'technical', 'Droit des sociétés et commerce'),
  ('Droit pétrolier',              'technical', 'Réglementation et contrats pétroliers'),
  ('Contrats OHADA',               'technical', 'Droit des contrats dans l''espace OHADA'),
  ('Communication',                'soft', 'Communication orale et écrite professionnelle'),
  ('Travail en équipe',            'soft', 'Collaboration et esprit d''équipe'),
  ('Rigueur',                      'soft', 'Précision et sens du détail'),
  ('Autonomie',                    'soft', 'Capacité à travailler de façon indépendante'),
  ('Adaptabilité',                 'soft', 'Flexibilité face aux changements'),
  ('Esprit d''analyse',            'soft', 'Capacité d''analyse et de synthèse'),
  ('Leadership',                   'soft', 'Capacité à mobiliser et diriger une équipe'),
  ('Agile / Scrum',                'technical', 'Méthodes agiles de gestion de projet'),
  ('Gestion des risques',          'technical', 'Identification et gestion des risques')
ON CONFLICT DO NOTHING;

-- Second backfill pass after new insertions
UPDATE candidate_candidate_skills ccs
SET skill_id = s.id
FROM skills s
WHERE lower(ccs.name) = lower(s.name)
  AND ccs.skill_id IS NULL;
