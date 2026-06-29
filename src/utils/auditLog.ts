import { supabase } from '../lib/supabase';

export type AuditAction =
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  | 'EXPORT' | 'GENERATE' | 'APPROVE' | 'REJECT'
  | 'DOWNLOAD' | 'UPLOAD' | 'ASSIGN' | 'REVOKE';

export type SecurityEventType =
  | 'login_success' | 'login_failure' | 'logout'
  | 'password_changed' | 'account_locked' | 'session_expired'
  | 'unauthorized_access';

export interface AuditLogEntry {
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  resource_label?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  details?: string;
}

export interface SecurityEventEntry {
  event_type: SecurityEventType;
  user_id?: string;
  user_email?: string;
  details?: Record<string, unknown>;
}

function getBrowserMeta(): { ip_address: string; user_agent: string } {
  return {
    ip_address: 'client',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const meta = getBrowserMeta();
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      user_email: entry.user_email,
      user_role: entry.user_role,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      resource_label: entry.resource_label,
      old_data: entry.old_data,
      new_data: entry.new_data,
      details: entry.details,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    });
  } catch {
    // Les logs ne doivent jamais faire échouer l'action principale
  }
}

export async function logSecurityEvent(entry: SecurityEventEntry): Promise<void> {
  try {
    const meta = getBrowserMeta();
    await supabase.from('security_events').insert({
      event_type: entry.event_type,
      user_id: entry.user_id,
      user_email: entry.user_email,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      details: entry.details ?? {},
    });
  } catch {
    // Silencieux
  }
}
