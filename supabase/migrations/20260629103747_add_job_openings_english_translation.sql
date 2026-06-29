ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS title_en        text,
  ADD COLUMN IF NOT EXISTS description_en  text,
  ADD COLUMN IF NOT EXISTS requirements_en text,
  ADD COLUMN IF NOT EXISTS translation_status text DEFAULT 'none'
    CHECK (translation_status IN ('none', 'ai_generated', 'validated'));
