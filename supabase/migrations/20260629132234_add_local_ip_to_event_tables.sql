-- Add local_ip column (detected from browser via WebRTC) to both event tables
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS local_ip text;
ALTER TABLE audit_logs      ADD COLUMN IF NOT EXISTS local_ip text;

CREATE INDEX IF NOT EXISTS idx_security_events_local_ip ON security_events(local_ip);
CREATE INDEX IF NOT EXISTS idx_audit_logs_local_ip      ON audit_logs(local_ip);
