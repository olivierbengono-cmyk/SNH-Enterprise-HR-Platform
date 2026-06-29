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

// Cache the detected local LAN IP for the session
let localIPCache: string | null | undefined = undefined;

async function getLocalIP(): Promise<string | null> {
  if (localIPCache !== undefined) return localIPCache;
  localIPCache = null;

  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .catch(() => {});

      const found: string[] = [];

      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          const ip = pickBestIP(found);
          localIPCache = ip;
          resolve(ip);
          return;
        }
        const m = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/.exec(e.candidate.candidate);
        if (m) found.push(m[1]);
      };

      // Fallback timeout in case ICE gathering stalls
      setTimeout(() => {
        try { pc.close(); } catch { /* */ }
        const ip = pickBestIP(found);
        localIPCache = ip;
        resolve(ip);
      }, 1500);
    } catch {
      localIPCache = null;
      resolve(null);
    }
  });
}

function pickBestIP(ips: string[]): string | null {
  if (ips.length === 0) return null;
  // Prefer private network ranges (LAN addresses)
  const privateIP = ips.find((ip) =>
    /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(ip)
  );
  return privateIP ?? ips[0];
}

async function postLogEvent(payload: Record<string, unknown>): Promise<void> {
  try {
    const local_ip = await getLocalIP();
    await supabase.functions.invoke('log-event', {
      body: { ...payload, local_ip },
    });
  } catch {
    // Logs must never fail the main action
  }
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  await postLogEvent({
    type: 'audit',
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
  });
}

export async function logSecurityEvent(entry: SecurityEventEntry): Promise<void> {
  await postLogEvent({
    type: 'security',
    event_type: entry.event_type,
    user_id: entry.user_id,
    user_email: entry.user_email,
    details: entry.details ?? {},
  });
}
