-- Champs recommandeur sur la table candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recommender_type text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recommender_name text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recommender_contact text;

-- Contrainte souple : interne ou externe
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_recommender_type_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_recommender_type_check
  CHECK (recommender_type IS NULL OR recommender_type = ANY(ARRAY['internal', 'external']));