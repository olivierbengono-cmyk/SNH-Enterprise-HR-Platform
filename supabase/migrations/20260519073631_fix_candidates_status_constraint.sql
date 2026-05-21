/*
  # Mise à jour contrainte status sur candidates

  L'ancienne contrainte ne permettait que les valeurs du pipeline de recrutement.
  La nouvelle CVthèque utilise des valeurs différentes pour le statut du profil candidat.
*/
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check
  CHECK (status IN ('received','screening','interview','offer','hired','rejected','active','inactive','blacklisted'));
