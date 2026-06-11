-- Remove duplicate skills, keeping originals
UPDATE candidate_candidate_skills
SET skill_id = 'a1000001-0000-0000-0000-000000000012'
WHERE skill_id = '55e07fe9-f9dc-443b-852d-3fea4aa6ca35';

UPDATE candidate_candidate_skills
SET skill_id = 'a1000001-0000-0000-0000-000000000002'
WHERE skill_id = 'bf806f5d-2359-408d-8c83-e4f82de58f4f';

UPDATE employee_skills
SET skill_id = 'a1000001-0000-0000-0000-000000000012'
WHERE skill_id = '55e07fe9-f9dc-443b-852d-3fea4aa6ca35';

UPDATE employee_skills
SET skill_id = 'a1000001-0000-0000-0000-000000000002'
WHERE skill_id = 'bf806f5d-2359-408d-8c83-e4f82de58f4f';

DELETE FROM skills WHERE id = '55e07fe9-f9dc-443b-852d-3fea4aa6ca35';
DELETE FROM skills WHERE id = 'bf806f5d-2359-408d-8c83-e4f82de58f4f';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skills_name_unique') THEN
    ALTER TABLE skills ADD CONSTRAINT skills_name_unique UNIQUE (name);
  END IF;
END $$;
