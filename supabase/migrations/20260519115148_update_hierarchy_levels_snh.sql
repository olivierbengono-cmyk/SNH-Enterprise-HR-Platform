/*
  # Mise à jour des niveaux hiérarchiques SNH

  ## Résumé
  1. Departments : la colonne org_level existante reçoit les 4 niveaux d'entité
     (Direction, Sous Direction, Service, Section)
  2. Positions : la colonne level reçoit les 9 niveaux de classification du titulaire
     (Employé, Agent de Maîtrise, Cadre, Chef de Section, Chef de Service Adjoint,
      Chef de Service, Sous Directeur, Directeur Adjoint, Directeur)
  3. Normalisation des valeurs existantes et mise à jour des postes créés
*/

-- ── 1. Normaliser les valeurs existantes dans positions.level ──────────────
-- "Agent de Maîtrise" et "Cadre" restent, on normalise les anciens niveaux
UPDATE positions SET level = 'Directeur'
  WHERE level IN ('Direction');

UPDATE positions SET level = 'Agent de Maîtrise'
  WHERE level IN ('Agent de maîtrise');

-- ── 2. Mise à jour des postes créés lors des migrations SNH ───────────────

-- Rang Directeur
UPDATE positions SET level = 'Directeur'
  WHERE code IN (
    'DIR-CIP','CDV-COM','DIR-CPSP','DIR-DBC','DIR-DEX','DIR-DGZ',
    'CDV-DI','DIR-DSD','DIR-DAG','DIR-DPR','DIR-DMS','REP-RSNH',
    'DIR-DRH', -- DRH
    'Directeur Commercial','Directeur Général','Directeur Financier',
    'Directeur Général Adjoint'
  );

-- Rang Chargé de Mission = Directeur (rang équivalent à la SNH)
UPDATE positions SET level = 'Directeur'
  WHERE code = 'CDM';

-- Chef de la Cellule des Marchés = Directeur
UPDATE positions SET level = 'Directeur'
  WHERE code = 'CCM';

-- Cadre (ingénieurs, analystes, informaticien, juristes)
UPDATE positions SET level = 'Cadre'
  WHERE code IN (
    'ING-PET','ING-EXP','ING-GAZ','ING-PPL',
    'CTR-GES','ANA-BUD','INF','ANA-STR',
    'CHG-COM','DOC-PET','JUR-MRK'
  );

-- Postes existants par titre
UPDATE positions SET level = 'Directeur'
  WHERE title IN (
    'Directeur Commercial','Directeur des Ressources Humaines',
    'Directeur Financier','Directeur Général','Directeur Général Adjoint',
    'Directeur HSE','Directeur Juridique','Directeur Logistique',
    'Directeur Technique'
  );

UPDATE positions SET level = 'Chef de Service'
  WHERE title IN ('Chef Service du Personnel','Chef des Ventes','Chef d''Équipe');

UPDATE positions SET level = 'Cadre'
  WHERE title IN (
    'Juriste','Juriste Senior','Ingénieur Production',
    'Gestionnaire RH','Responsable Achats','Responsable Sécurité'
  );

UPDATE positions SET level = 'Agent de Maîtrise'
  WHERE title IN (
    'Chef Comptable','Chef Comptable',
    'Acheteur','Technicien'
  );

UPDATE positions SET level = 'Employé'
  WHERE title IN (
    'Agent HSE','Agent Logistique','Assistant Commercial',
    'Assistant Comptable','Assistant RH','Commercial',
    'Comptable','Opérateur'
  );
