/*
  # Ajout du flag de changement de mot de passe
  
  1. Modifications
    - Ajouter le champ `password_changed` à user_profiles pour tracker si l'utilisateur a changé son mot de passe initial
    - Par défaut à false pour forcer le changement lors de la première connexion
    
  2. Notes
    - Les utilisateurs existants auront password_changed = true (déjà connectés)
    - Les nouveaux comptes créés auront password_changed = false
*/

-- Ajouter le champ password_changed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'password_changed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_changed boolean DEFAULT false;
  END IF;
END $$;

-- Mettre à true pour les utilisateurs existants (déjà connectés)
UPDATE user_profiles 
SET password_changed = true 
WHERE password_changed IS NULL OR password_changed = false;
