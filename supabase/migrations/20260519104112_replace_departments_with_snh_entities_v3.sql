/*
  # Structure organisationnelle réelle SNH — Version finale

  ## Résumé
  - Renommage + recodage des 8 départements existants
  - Création des 12 nouvelles entités SNH avec codes officiels
  - Ajout de 25 postes adaptés à la réalité SNH (avec code, level)
  - Redistribution équilibrée des profils fictifs (3-4 agents/entité)
  - Chaque entité reçoit un responsable de rang Directeur/Chef
*/

-- ============================================================
-- 1. RENOMMER + RECODER LES DÉPARTEMENTS EXISTANTS
-- ============================================================
UPDATE departments SET name = 'Direction des Affaires Générales (DAG)', code = 'DAG'
  WHERE id = 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9';
UPDATE departments SET name = 'Direction de la Production (DPR)', code = 'DPR'
  WHERE id = 'ba06f8b4-5dd6-468a-ba7e-1be84da16c6b';
UPDATE departments SET name = 'Direction de la Maintenance et de la Sécurité (DMS)', code = 'DMS'
  WHERE id = 'f01837f7-8835-4667-a73e-5eeee7a1e58b';
UPDATE departments SET name = 'Division Juridique (JUR)', code = 'JUR'
  WHERE id = '040b3433-3949-4ef4-a849-78eb6ab9cc95';
UPDATE departments SET name = 'Direction Commerciale (DCO)', code = 'DCO'
  WHERE id = '69c34d8f-16d3-4fcf-b21b-fb06f6a14b2c';
UPDATE departments SET name = 'Direction des Ressources Humaines (DRH)', code = 'DRH'
  WHERE id = '4b54f692-e074-47c2-b12d-3c5568ba4fce';
UPDATE departments SET name = 'Direction Financière (DFI)', code = 'DFI'
  WHERE id = '54f457e3-a16e-47d4-aabe-98a6505b9795';
UPDATE departments SET name = 'Direction Générale (DG)', code = 'DG'
  WHERE id = '7536b61b-3289-4a51-b706-d1063677a284';

-- ============================================================
-- 2. CRÉER LES 12 NOUVELLES ENTITÉS SNH
-- ============================================================
INSERT INTO departments (id, name, code, manager_id) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Centre d''Informations Pétrolières (CIP)',             'CIP',  NULL),
  ('a1000002-0000-0000-0000-000000000002', 'Division de la Communication (COM)',                   'COM',  NULL),
  ('a1000003-0000-0000-0000-000000000003', 'Comité de Pilotage et de Suivi des Pipelines (CPSP)',  'CPSP', NULL),
  ('a1000004-0000-0000-0000-000000000004', 'Direction du Budget et du Contrôle (DBC)',             'DBC',  NULL),
  ('a1000005-0000-0000-0000-000000000005', 'Direction de l''Exploration (DEX)',                    'DEX',  NULL),
  ('a1000006-0000-0000-0000-000000000006', 'Direction du Gaz (DGZ)',                               'DGZ',  NULL),
  ('a1000007-0000-0000-0000-000000000007', 'Division Informatique (DI)',                           'DI',   NULL),
  ('a1000008-0000-0000-0000-000000000008', 'Direction de la Stratégie et du Développement (DSD)', 'DSD',  NULL),
  ('a1000009-0000-0000-0000-000000000009', 'Chargé de Mission N°1 (CDM1)',                         'CDM1', NULL),
  ('a1000010-0000-0000-0000-000000000010', 'Chargé de Mission N°2 (CDM2)',                         'CDM2', NULL),
  ('a1000011-0000-0000-0000-000000000011', 'Cellule des Marchés (CMA)',                            'CMA',  NULL),
  ('a1000012-0000-0000-0000-000000000012', 'Représentation SNH à Douala (RSNH)',                   'RSNH', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. AJOUTER LES POSTES SNH (avec code + level obligatoires)
-- ============================================================
INSERT INTO positions (id, title, code, level) VALUES
  ('b2000001-0000-0000-0000-000000000001', 'Directeur du Centre d''Informations Pétrolières', 'DIR-CIP',  'Direction'),
  ('b2000002-0000-0000-0000-000000000002', 'Chef de la Division Communication',               'CDV-COM',  'Direction'),
  ('b2000003-0000-0000-0000-000000000003', 'Directeur du CPSP',                               'DIR-CPSP', 'Direction'),
  ('b2000004-0000-0000-0000-000000000004', 'Directeur du Budget et du Contrôle',              'DIR-DBC',  'Direction'),
  ('b2000005-0000-0000-0000-000000000005', 'Directeur de l''Exploration',                     'DIR-DEX',  'Direction'),
  ('b2000006-0000-0000-0000-000000000006', 'Directeur du Gaz',                                'DIR-DGZ',  'Direction'),
  ('b2000007-0000-0000-0000-000000000007', 'Chef de la Division Informatique',                'CDV-DI',   'Direction'),
  ('b2000008-0000-0000-0000-000000000008', 'Directeur de la Stratégie et du Développement',  'DIR-DSD',  'Direction'),
  ('b2000009-0000-0000-0000-000000000009', 'Chargé de Mission',                               'CDM',      'Direction'),
  ('b2000010-0000-0000-0000-000000000010', 'Chef de la Cellule des Marchés',                  'CCM',      'Direction'),
  ('b2000011-0000-0000-0000-000000000011', 'Directeur des Affaires Générales',                'DIR-DAG',  'Direction'),
  ('b2000012-0000-0000-0000-000000000012', 'Directeur de la Production',                      'DIR-DPR',  'Direction'),
  ('b2000013-0000-0000-0000-000000000013', 'Directeur de la Maintenance et de la Sécurité',  'DIR-DMS',  'Direction'),
  ('b2000014-0000-0000-0000-000000000014', 'Représentant SNH à Douala',                       'REP-RSNH', 'Direction'),
  ('b2000015-0000-0000-0000-000000000015', 'Ingénieur Pétrolier',                             'ING-PET',  'Cadre'),
  ('b2000016-0000-0000-0000-000000000016', 'Ingénieur Exploration',                           'ING-EXP',  'Cadre'),
  ('b2000017-0000-0000-0000-000000000017', 'Ingénieur Gaz',                                   'ING-GAZ',  'Cadre'),
  ('b2000018-0000-0000-0000-000000000018', 'Ingénieur Pipeline',                              'ING-PPL',  'Cadre'),
  ('b2000019-0000-0000-0000-000000000019', 'Analyste Budgétaire',                             'ANA-BUD',  'Cadre'),
  ('b2000020-0000-0000-0000-000000000020', 'Contrôleur de Gestion',                           'CTR-GES',  'Cadre'),
  ('b2000021-0000-0000-0000-000000000021', 'Informaticien',                                   'INF',      'Cadre'),
  ('b2000022-0000-0000-0000-000000000022', 'Analyste Stratégique',                            'ANA-STR',  'Cadre'),
  ('b2000023-0000-0000-0000-000000000023', 'Chargé de Communication',                         'CHG-COM',  'Cadre'),
  ('b2000024-0000-0000-0000-000000000024', 'Documentaliste Pétrolier',                        'DOC-PET',  'Cadre'),
  ('b2000025-0000-0000-0000-000000000025', 'Juriste Marchés Publics',                         'JUR-MRK',  'Cadre')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. DIRECTEURS DES ENTITÉS EXISTANTES RENOMMÉES
-- ============================================================
UPDATE employees SET position_id = 'b2000011-0000-0000-0000-000000000011'
  WHERE id = 'e5520598-71ad-455e-9a78-a66e5fe415c7'; -- Nadine Ebang → DIR-DAG
UPDATE departments SET manager_id = 'e5520598-71ad-455e-9a78-a66e5fe415c7'
  WHERE id = 'fb7e8d6c-ce35-4874-b23f-075b8e1b52a9';

UPDATE employees SET position_id = 'b2000013-0000-0000-0000-000000000013'
  WHERE id = '076d5c44-a1a0-4912-b884-a9f09f1bb44e'; -- Charles Owona → DIR-DMS
UPDATE departments SET manager_id = '076d5c44-a1a0-4912-b884-a9f09f1bb44e'
  WHERE id = 'f01837f7-8835-4667-a73e-5eeee7a1e58b';

-- ============================================================
-- 5. CIP — Nathan Ngo Um (dir) + Honoré Manga Bell + René Ndongo
-- ============================================================
UPDATE employees SET department_id='a1000001-0000-0000-0000-000000000001', position_id='b2000001-0000-0000-0000-000000000001', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='ad97d390-0717-4ff1-acfa-5f700e3454f7';
UPDATE employees SET department_id='a1000001-0000-0000-0000-000000000001', position_id='b2000024-0000-0000-0000-000000000024', manager_id='ad97d390-0717-4ff1-acfa-5f700e3454f7' WHERE id IN ('83e913dd-e820-4d21-9f60-1278c64d3f62','015158f6-6f5f-42d0-97f2-21625554361a');
UPDATE departments SET manager_id='ad97d390-0717-4ff1-acfa-5f700e3454f7' WHERE id='a1000001-0000-0000-0000-000000000001';

-- ============================================================
-- 6. COM — Bernard Eboko (chef) + Pascal Zambo + Monique Ebode + Olivia Nguema
-- ============================================================
UPDATE employees SET department_id='a1000002-0000-0000-0000-000000000002', position_id='b2000002-0000-0000-0000-000000000002', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='a0190f52-2756-41bb-87af-1dca3a581ccb';
UPDATE employees SET department_id='a1000002-0000-0000-0000-000000000002', position_id='b2000023-0000-0000-0000-000000000023', manager_id='a0190f52-2756-41bb-87af-1dca3a581ccb' WHERE id IN ('2389a2c8-350b-46dc-938e-407686a2ec0f','4944e51a-7447-4167-8a9c-6f456375cecd','9863908a-12d3-49e3-9211-1c8dd9740ed4');
UPDATE departments SET manager_id='a0190f52-2756-41bb-87af-1dca3a581ccb' WHERE id='a1000002-0000-0000-0000-000000000002';

-- ============================================================
-- 7. CPSP — William Abega (dir) + Xavier Nguini + Quitterie Ambassa
-- ============================================================
UPDATE employees SET department_id='a1000003-0000-0000-0000-000000000003', position_id='b2000003-0000-0000-0000-000000000003', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='f1cc565e-75dc-41ee-a486-4184d12ff321';
UPDATE employees SET department_id='a1000003-0000-0000-0000-000000000003', position_id='b2000018-0000-0000-0000-000000000018', manager_id='f1cc565e-75dc-41ee-a486-4184d12ff321' WHERE id IN ('0b11134d-c9b6-43b4-8661-80771ac3d424','2c9931b3-a77a-4e95-bd25-d9f0f842ae8c');
UPDATE departments SET manager_id='f1cc565e-75dc-41ee-a486-4184d12ff321' WHERE id='a1000003-0000-0000-0000-000000000003';

-- ============================================================
-- 8. DBC — Christine Ngo Biyong (dir) + Daniel Njoya + Isabelle Fouda + Joseph Talla
-- ============================================================
UPDATE employees SET department_id='a1000004-0000-0000-0000-000000000004', position_id='b2000004-0000-0000-0000-000000000004', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='f1dd7d29-db05-4d94-b203-3bbcd4712a68';
UPDATE employees SET department_id='a1000004-0000-0000-0000-000000000004', position_id='b2000020-0000-0000-0000-000000000020', manager_id='f1dd7d29-db05-4d94-b203-3bbcd4712a68' WHERE id IN ('c3d48de1-ebbc-49ad-87c3-5bcf96139961','ba8b549a-ee7f-4a04-a6b6-6d759e21b8b1','a4c3880e-0d6e-4ade-bf6f-801bf5bc72d7');
UPDATE departments SET manager_id='f1dd7d29-db05-4d94-b203-3bbcd4712a68' WHERE id='a1000004-0000-0000-0000-000000000004';

-- ============================================================
-- 9. DEX — Quentin Fofana (dir) + Rachel Kom + Samuel Njike + Urbain Bella
-- ============================================================
UPDATE employees SET department_id='a1000005-0000-0000-0000-000000000005', position_id='b2000005-0000-0000-0000-000000000005', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='b1334b2b-99da-4af4-bf8c-522605f425c2';
UPDATE employees SET department_id='a1000005-0000-0000-0000-000000000005', position_id='b2000016-0000-0000-0000-000000000016', manager_id='b1334b2b-99da-4af4-bf8c-522605f425c2' WHERE id IN ('20641e16-1d27-4eba-a046-3bd611a86b48','6ae425a5-349e-4c6c-b280-92ee2a537904','c9abd7e5-fce8-4594-a42a-8e1f12f97c50');
UPDATE departments SET manager_id='b1334b2b-99da-4af4-bf8c-522605f425c2' WHERE id='a1000005-0000-0000-0000-000000000005';

-- ============================================================
-- 10. DGZ — Thierry Mbassi (dir) + Valérie Ntsama + Thérèse Makongo + Valérie Biwole
-- ============================================================
UPDATE employees SET department_id='a1000006-0000-0000-0000-000000000006', position_id='b2000006-0000-0000-0000-000000000006', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='10b5657e-2b90-43ae-a8b0-9ddac6688969';
UPDATE employees SET department_id='a1000006-0000-0000-0000-000000000006', position_id='b2000017-0000-0000-0000-000000000017', manager_id='10b5657e-2b90-43ae-a8b0-9ddac6688969' WHERE id IN ('45812691-bd55-4795-9264-7318312114f3','902d56c0-27cf-43df-b02b-fcdb66279cfc','0ab31e9c-eb2f-4183-986c-4cbe0befa127');
UPDATE departments SET manager_id='10b5657e-2b90-43ae-a8b0-9ddac6688969' WHERE id='a1000006-0000-0000-0000-000000000006';

-- ============================================================
-- 11. DI — Lambert Zang (chef) + Jules Mvondo + Élise Abanda + Xavière Ngo Likeng
-- ============================================================
UPDATE employees SET department_id='a1000007-0000-0000-0000-000000000007', position_id='b2000007-0000-0000-0000-000000000007', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='0c4a9c34-29ae-4c8c-9473-1d0e85daaf07';
UPDATE employees SET department_id='a1000007-0000-0000-0000-000000000007', position_id='b2000021-0000-0000-0000-000000000021', manager_id='0c4a9c34-29ae-4c8c-9473-1d0e85daaf07' WHERE id IN ('78ccf842-4c90-423a-a0d1-574b1a411c2a','dc97f0cd-0835-4258-a602-744fd7ee4e4b','87012c91-7769-4ea3-8405-9c5fa94b9a14');
UPDATE departments SET manager_id='0c4a9c34-29ae-4c8c-9473-1d0e85daaf07' WHERE id='a1000007-0000-0000-0000-000000000007';

-- ============================================================
-- 12. DSD — Karine Owona (dir) + Solange Bile + Irène Ngo Batoum + Wilson Nana
-- ============================================================
UPDATE employees SET department_id='a1000008-0000-0000-0000-000000000008', position_id='b2000008-0000-0000-0000-000000000008', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='0b17f5e2-de96-4b11-8b13-9b43c3eb6d12';
UPDATE employees SET department_id='a1000008-0000-0000-0000-000000000008', position_id='b2000022-0000-0000-0000-000000000022', manager_id='0b17f5e2-de96-4b11-8b13-9b43c3eb6d12' WHERE id IN ('ef8ef3a3-e8ef-4dce-9641-9f56d7e26f6c','7a529031-c9a7-4990-93ad-f5b6b11a3f10','b9eeb6c7-4b24-4ca7-9e83-c32f272909df');
UPDATE departments SET manager_id='0b17f5e2-de96-4b11-8b13-9b43c3eb6d12' WHERE id='a1000008-0000-0000-0000-000000000008';

-- ============================================================
-- 13. CDM1 — Gisèle Tongo
-- ============================================================
UPDATE employees SET department_id='a1000009-0000-0000-0000-000000000009', position_id='b2000009-0000-0000-0000-000000000009', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='91d12bee-19af-45bb-9b87-5bd06e427473';
UPDATE departments SET manager_id='91d12bee-19af-45bb-9b87-5bd06e427473' WHERE id='a1000009-0000-0000-0000-000000000009';

-- ============================================================
-- 14. CDM2 — Ferdinand Messi
-- ============================================================
UPDATE employees SET department_id='a1000010-0000-0000-0000-000000000010', position_id='b2000009-0000-0000-0000-000000000009', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='b00a7dde-9ffc-4cf5-9816-74cba171e2b7';
UPDATE departments SET manager_id='b00a7dde-9ffc-4cf5-9816-74cba171e2b7' WHERE id='a1000010-0000-0000-0000-000000000010';

-- ============================================================
-- 15. CMA — Inès Mekoulou (chef) + Joël Tagne + Marc Feudjio
-- ============================================================
UPDATE employees SET department_id='a1000011-0000-0000-0000-000000000011', position_id='b2000010-0000-0000-0000-000000000010', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='943ae9d2-8a7d-4220-ae13-bb8dc53f00eb';
UPDATE employees SET department_id='a1000011-0000-0000-0000-000000000011', position_id='b2000025-0000-0000-0000-000000000025', manager_id='943ae9d2-8a7d-4220-ae13-bb8dc53f00eb' WHERE id IN ('703ddc44-ea74-4f98-b65c-9add7aacc1dd','8ff40cb4-2239-46c2-968e-0120c3753aa5');
UPDATE departments SET manager_id='943ae9d2-8a7d-4220-ae13-bb8dc53f00eb' WHERE id='a1000011-0000-0000-0000-000000000011';

-- ============================================================
-- 16. RSNH — Cécile Ngatchou (rep.) + David Owono + Alice Momo + Ulrich Mbede
-- ============================================================
UPDATE employees SET department_id='a1000012-0000-0000-0000-000000000012', position_id='b2000014-0000-0000-0000-000000000014', manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb' WHERE id='61a7ff31-9c9e-4f58-92d6-8182447b3ec8';
UPDATE employees SET department_id='a1000012-0000-0000-0000-000000000012', position_id='b2000015-0000-0000-0000-000000000015', manager_id='61a7ff31-9c9e-4f58-92d6-8182447b3ec8' WHERE id IN ('40e90d93-b249-4689-b4ec-4a220d7cd45b','27445972-5c9a-4674-a441-1366e7ae3a16','2ae0c24d-5ead-49ad-b00d-dda29db037f7');
UPDATE departments SET manager_id='61a7ff31-9c9e-4f58-92d6-8182447b3ec8' WHERE id='a1000012-0000-0000-0000-000000000012';

-- ============================================================
-- 17. DPR : manager = DG par intérim (Quentin parti à DEX)
-- ============================================================
UPDATE departments SET manager_id='05fbe4ed-0a17-4eee-b040-1da4bf7284bb'
  WHERE id='ba06f8b4-5dd6-468a-ba7e-1be84da16c6b';
