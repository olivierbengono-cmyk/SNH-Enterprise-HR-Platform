-- Ajout des politiques RLS manquantes pour que les RH puissent gérer les langues des candidats

-- HR : INSERT
CREATE POLICY "hr_insert_candidate_languages"
  ON candidate_languages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- HR : DELETE
CREATE POLICY "hr_delete_candidate_languages"
  ON candidate_languages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- HR : UPDATE (cohérence avec les autres tables candidats)
CREATE POLICY "hr_update_candidate_languages"
  ON candidate_languages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager'])
    )
  );

-- Même correctif pour candidate_experiences (UPDATE HR manquant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'candidate_experiences' AND policyname = 'hr_update_candidate_experiences'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "hr_update_candidate_experiences"
        ON candidate_experiences FOR UPDATE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager']))
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager']))
        );
    $policy$;
  END IF;
END $$;

-- Même correctif pour candidate_educations (UPDATE HR manquant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'candidate_educations' AND policyname = 'hr_update_candidate_educations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "hr_update_candidate_educations"
        ON candidate_educations FOR UPDATE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager']))
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = ANY(ARRAY['drh','admin','recruitment_manager','career_manager']))
        );
    $policy$;
  END IF;
END $$;