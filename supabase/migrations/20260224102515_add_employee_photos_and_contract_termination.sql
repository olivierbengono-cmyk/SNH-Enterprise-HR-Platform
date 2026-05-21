/*
  # Ajout des photos employés et gestion de fin de contrat

  1. Modifications
    - Ajout du champ `photo_url` à la table `employees` pour stocker l'URL de la photo
    - Ajout des champs de fin de contrat :
      - `contract_end_date` : Date de fin du contrat
      - `termination_type` : Type de cessation (démission, licenciement, retraite, fin CDD, etc.)
      - `termination_reason` : Motif détaillé de la cessation
      - `termination_notice_period` : Période de préavis
      - `last_working_day` : Dernier jour travaillé
      - `termination_notes` : Notes complémentaires
  
  2. Storage
    - Création du bucket `employee-photos` pour stocker les photos
    - Politiques de sécurité pour l'upload et la lecture des photos
*/

-- Ajouter les champs photo et fin de contrat à la table employees
DO $$
BEGIN
  -- Champ photo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE employees ADD COLUMN photo_url text;
  END IF;

  -- Champs de fin de contrat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'contract_end_date'
  ) THEN
    ALTER TABLE employees ADD COLUMN contract_end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_type'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_reason'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_notice_period'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_notice_period integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'last_working_day'
  ) THEN
    ALTER TABLE employees ADD COLUMN last_working_day date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'termination_notes'
  ) THEN
    ALTER TABLE employees ADD COLUMN termination_notes text;
  END IF;
END $$;

-- Créer le bucket pour les photos employés s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Photos employés visibles par tous les utilisateurs authentifiés" ON storage.objects;
DROP POLICY IF EXISTS "Admin et DRH peuvent uploader des photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin et DRH peuvent mettre à jour des photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin et DRH peuvent supprimer des photos" ON storage.objects;

-- Politique de lecture publique pour les photos
CREATE POLICY "Photos employés visibles par tous les utilisateurs authentifiés"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-photos');

-- Politique d'upload pour Admin et DRH
CREATE POLICY "Admin et DRH peuvent uploader des photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-photos' AND
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'drh')
      )
    )
  );

-- Politique de mise à jour pour Admin et DRH
CREATE POLICY "Admin et DRH peuvent mettre à jour des photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'employee-photos' AND
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'drh')
      )
    )
  );

-- Politique de suppression pour Admin et DRH
CREATE POLICY "Admin et DRH peuvent supprimer des photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-photos' AND
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'drh')
      )
    )
  );

-- Commentaires pour documentation
COMMENT ON COLUMN employees.photo_url IS 'URL de la photo de profil de l''employé';
COMMENT ON COLUMN employees.contract_end_date IS 'Date de fin du contrat';
COMMENT ON COLUMN employees.termination_type IS 'Type de cessation : démission, licenciement, retraite, fin_cdd, mutation, décès, abandon_poste';
COMMENT ON COLUMN employees.termination_reason IS 'Motif détaillé de la cessation du contrat';
COMMENT ON COLUMN employees.termination_notice_period IS 'Période de préavis en jours';
COMMENT ON COLUMN employees.last_working_day IS 'Dernier jour travaillé effectif';
COMMENT ON COLUMN employees.termination_notes IS 'Notes complémentaires sur la fin de contrat';
