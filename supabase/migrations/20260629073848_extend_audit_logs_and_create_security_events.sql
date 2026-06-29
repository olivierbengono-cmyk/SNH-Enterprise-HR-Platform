
-- Étendre la table audit_logs existante avec les colonnes manquantes
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_email    text,
  ADD COLUMN IF NOT EXISTS user_role     text,
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_id   text,
  ADD COLUMN IF NOT EXISTS resource_label text,
  ADD COLUMN IF NOT EXISTS old_data      jsonb,
  ADD COLUMN IF NOT EXISTS new_data      jsonb,
  ADD COLUMN IF NOT EXISTS details       text;

-- Remplir resource_type depuis entity_type si vide
UPDATE audit_logs SET resource_type = entity_type WHERE resource_type IS NULL AND entity_type IS NOT NULL;

-- Créer les index si inexistants
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs(created_at DESC);

-- Activer RLS si pas déjà fait
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer d'éventuelles politiques conflictuelles et recréer proprement
DROP POLICY IF EXISTS "audit_logs_select_admin"  ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_any"    ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update"     ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete"     ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;

CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'drh')
    )
  );

CREATE POLICY "audit_logs_insert_any" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "audit_logs_no_update" ON audit_logs FOR UPDATE
  TO authenticated USING (false);

CREATE POLICY "audit_logs_no_delete" ON audit_logs FOR DELETE
  TO authenticated USING (false);


-- ─── TABLE security_events (nouvelle) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    text,
  ip_address    text,
  user_agent    text,
  details       jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id    ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip         ON security_events(ip_address);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_select_admin" ON security_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'drh')
    )
  );

CREATE POLICY "security_events_insert_auth" ON security_events FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "security_events_insert_anon" ON security_events FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "security_events_no_update" ON security_events FOR UPDATE
  TO authenticated USING (false);

CREATE POLICY "security_events_no_delete" ON security_events FOR DELETE
  TO authenticated USING (false);
