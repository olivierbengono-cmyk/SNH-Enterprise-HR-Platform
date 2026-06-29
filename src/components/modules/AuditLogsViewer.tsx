import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Shield, Search, Download, RefreshCw, Filter, X,
  LogIn, LogOut, Key, AlertTriangle, Eye, Pencil, Trash2,
  FileText, Users, DollarSign, ChevronDown, ChevronRight,
  Clock, User, Monitor, Globe, CheckCircle, XCircle,
  Activity, Lock, List,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecurityEvent {
  id: string;
  event_type: string;
  user_email: string | null;
  user_id: string | null;
  ip_address: string | null;
  local_ip: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource_type: string | null;
  resource_label: string | null;
  resource_id: string | null;
  details: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  local_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UnifiedEvent {
  id: string;
  source: 'security' | 'audit';
  created_at: string;
  user_email: string | null;
  ip_address: string | null;
  local_ip: string | null;
  user_agent: string | null;
  // Security-specific
  event_type?: string;
  // Audit-specific
  action?: string;
  user_role?: string | null;
  resource_type?: string | null;
  resource_label?: string | null;
  details?: string | Record<string, unknown> | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

type ActiveView = 'unified' | 'security' | 'audit';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_META: Record<string, { label: string; icon: React.FC<any>; color: string; bg: string }> = {
  login_success:       { label: 'Connexion réussie',   icon: LogIn,          color: 'text-emerald-700', bg: 'bg-emerald-50' },
  login_failure:       { label: 'Échec connexion',      icon: XCircle,        color: 'text-red-700',     bg: 'bg-red-50' },
  logout:              { label: 'Déconnexion',           icon: LogOut,         color: 'text-slate-600',   bg: 'bg-slate-50' },
  password_changed:    { label: 'Mot de passe changé',  icon: Key,            color: 'text-amber-700',   bg: 'bg-amber-50' },
  account_locked:      { label: 'Compte bloqué',        icon: Lock,           color: 'text-red-700',     bg: 'bg-red-50' },
  session_expired:     { label: 'Session expirée',      icon: Clock,          color: 'text-slate-500',   bg: 'bg-slate-50' },
  unauthorized_access: { label: 'Accès non autorisé',   icon: AlertTriangle,  color: 'text-orange-700',  bg: 'bg-orange-50' },
};

const ACTION_META: Record<string, { label: string; icon: React.FC<any>; color: string; bg: string }> = {
  CREATE:   { label: 'Insertion',       icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  READ:     { label: 'Consultation',    icon: Eye,         color: 'text-blue-700',    bg: 'bg-blue-50' },
  UPDATE:   { label: 'Modification',    icon: Pencil,      color: 'text-amber-700',   bg: 'bg-amber-50' },
  DELETE:   { label: 'Suppression',     icon: Trash2,      color: 'text-red-700',     bg: 'bg-red-50' },
  EXPORT:   { label: 'Export',          icon: Download,    color: 'text-purple-700',  bg: 'bg-purple-50' },
  GENERATE: { label: 'Génération',      icon: Activity,    color: 'text-teal-700',    bg: 'bg-teal-50' },
  APPROVE:  { label: 'Approbation',     icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  REJECT:   { label: 'Rejet',           icon: XCircle,     color: 'text-red-700',     bg: 'bg-red-50' },
  DOWNLOAD: { label: 'Téléchargement',  icon: Download,    color: 'text-blue-700',    bg: 'bg-blue-50' },
  UPLOAD:   { label: 'Envoi fichier',   icon: FileText,    color: 'text-teal-700',    bg: 'bg-teal-50' },
  ASSIGN:   { label: 'Attribution',     icon: Users,       color: 'text-indigo-700',  bg: 'bg-indigo-50' },
  REVOKE:   { label: 'Révocation',      icon: XCircle,     color: 'text-orange-700',  bg: 'bg-orange-50' },
};

const RESOURCE_LABELS: Record<string, string> = {
  employee: 'Employé', payslip: 'Bulletin de paie', leave: 'Congé',
  document: 'Document', user_role: 'Rôle utilisateur', payroll: 'Paie',
  training: 'Formation', performance: 'Performance', expense: 'Note de frais',
  recruitment: 'Recrutement', candidate: 'Candidat', settings: 'Paramètres',
  skill: 'Compétence', qvct: 'QVCT', org_structure: 'Structure org.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortenAgent(agent: string | null): string {
  if (!agent) return '—';
  if (/Chrome/i.test(agent)) return 'Chrome';
  if (/Firefox/i.test(agent)) return 'Firefox';
  if (/Safari/i.test(agent) && !/Chrome/i.test(agent)) return 'Safari';
  if (/Edge/i.test(agent)) return 'Edge';
  if (/Mobile/i.test(agent)) return 'Mobile';
  return 'Navigateur';
}

/** Prefer LAN IP when available, fall back to public IP */
function effectiveIP(local_ip: string | null | undefined, ip_address: string | null | undefined): string {
  const lan = local_ip && local_ip !== 'unknown' ? local_ip : null;
  return lan ?? ip_address ?? '—';
}

function toCSVField(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCSV(headers: string[], rows: (string | null | undefined | unknown)[][], filename: string) {
  const content = [headers.map(toCSVField), ...rows.map((r) => r.map(toCSVField))]
    .map((r) => r.join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuditLogsViewer() {
  const [activeView, setActiveView] = useState<ActiveView>('unified');

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [secTotal, setSecTotal] = useState(0);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  const [unifiedEvents, setUnifiedEvents] = useState<UnifiedEvent[]>([]);
  const [unifiedTotal, setUnifiedTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 50;

  const [stats, setStats] = useState({
    loginSuccess: 0, loginFailure: 0, totalAudit: 0,
    suspiciousIPs: 0, last24hActions: 0,
  });

  const loadStats = useCallback(async () => {
    const since24h = new Date(Date.now() - 86400000).toISOString();
    const [secRes, auditRes, failRes] = await Promise.all([
      supabase.from('security_events').select('event_type', { count: 'exact' }).gte('created_at', since24h),
      supabase.from('audit_logs').select('id', { count: 'exact' }).gte('created_at', since24h),
      supabase.from('security_events').select('ip_address').eq('event_type', 'login_failure').gte('created_at', since24h),
    ]);
    const loginSuccess = (secRes.data ?? []).filter((e) => e.event_type === 'login_success').length;
    const loginFailure = (secRes.data ?? []).filter((e) => e.event_type === 'login_failure').length;
    const uniqueFailIPs = new Set((failRes.data ?? []).map((r) => r.ip_address)).size;
    setStats({ loginSuccess, loginFailure, totalAudit: auditRes.count ?? 0, suspiciousIPs: uniqueFailIPs, last24hActions: auditRes.count ?? 0 });
  }, []);

  const loadSecurityEvents = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('security_events').select('*', { count: 'exact' });
    if (search) q = q.ilike('user_email', `%${search}%`);
    if (filterType) q = q.eq('event_type', filterType);
    if (filterDateFrom) q = q.gte('created_at', filterDateFrom);
    if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59');
    const { data, count } = await q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setSecurityEvents((data as SecurityEvent[]) ?? []);
    setSecTotal(count ?? 0);
    setLoading(false);
  }, [search, filterType, filterDateFrom, filterDateTo, page]);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('audit_logs').select('*', { count: 'exact' });
    if (search) q = q.ilike('user_email', `%${search}%`);
    if (filterAction) q = q.eq('action', filterAction);
    if (filterType) q = q.ilike('resource_type', `%${filterType}%`);
    if (filterDateFrom) q = q.gte('created_at', filterDateFrom);
    if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59');
    const { data, count } = await q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setAuditLogs((data as AuditLog[]) ?? []);
    setAuditTotal(count ?? 0);
    setLoading(false);
  }, [search, filterAction, filterType, filterDateFrom, filterDateTo, page]);

  const loadUnified = useCallback(async () => {
    setLoading(true);
    const LIMIT = 300; // fetch latest 300 from each source, merge client-side

    let secQ = supabase.from('security_events').select('*', { count: 'exact' });
    let audQ = supabase.from('audit_logs').select('*', { count: 'exact' });

    if (search) {
      secQ = secQ.ilike('user_email', `%${search}%`);
      audQ = audQ.ilike('user_email', `%${search}%`);
    }
    if (filterDateFrom) {
      secQ = secQ.gte('created_at', filterDateFrom);
      audQ = audQ.gte('created_at', filterDateFrom);
    }
    if (filterDateTo) {
      secQ = secQ.lte('created_at', filterDateTo + 'T23:59:59');
      audQ = audQ.lte('created_at', filterDateTo + 'T23:59:59');
    }

    const [secRes, audRes] = await Promise.all([
      secQ.order('created_at', { ascending: false }).limit(LIMIT),
      audQ.order('created_at', { ascending: false }).limit(LIMIT),
    ]);

    const sec: UnifiedEvent[] = ((secRes.data ?? []) as SecurityEvent[]).map((e) => ({
      id: e.id, source: 'security', created_at: e.created_at,
      user_email: e.user_email, ip_address: e.ip_address, local_ip: e.local_ip,
      user_agent: e.user_agent, event_type: e.event_type, details: e.details,
    }));

    const aud: UnifiedEvent[] = ((audRes.data ?? []) as AuditLog[]).map((l) => ({
      id: l.id, source: 'audit', created_at: l.created_at,
      user_email: l.user_email, ip_address: l.ip_address, local_ip: l.local_ip,
      user_agent: l.user_agent, action: l.action, user_role: l.user_role,
      resource_type: l.resource_type, resource_label: l.resource_label,
      details: l.details, old_data: l.old_data, new_data: l.new_data,
    }));

    const merged = [...sec, ...aud].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setUnifiedEvents(merged);
    setUnifiedTotal((secRes.count ?? 0) + (audRes.count ?? 0));
    setLoading(false);
  }, [search, filterDateFrom, filterDateTo]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    setExpandedRow(null);
    if (activeView === 'security') loadSecurityEvents();
    else if (activeView === 'audit') loadAuditLogs();
    else loadUnified();
  }, [activeView, loadSecurityEvents, loadAuditLogs, loadUnified]);

  const resetFilters = () => {
    setSearch(''); setFilterType(''); setFilterAction('');
    setFilterDateFrom(''); setFilterDateTo(''); setPage(0);
  };

  const refresh = () => {
    loadStats();
    if (activeView === 'security') loadSecurityEvents();
    else if (activeView === 'audit') loadAuditLogs();
    else loadUnified();
  };

  // Export ALL rows (not just current page) as CSV
  const exportCSV = async () => {
    setLoading(true);
    try {
      if (activeView === 'security') {
        let q = supabase.from('security_events').select('*');
        if (search) q = q.ilike('user_email', `%${search}%`);
        if (filterType) q = q.eq('event_type', filterType);
        if (filterDateFrom) q = q.gte('created_at', filterDateFrom);
        if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59');
        const { data } = await q.order('created_at', { ascending: false });
        const rows = ((data ?? []) as SecurityEvent[]).map((e) => [
          formatDate(e.created_at), e.event_type,
          EVENT_META[e.event_type]?.label ?? e.event_type,
          e.user_email, effectiveIP(e.local_ip, e.ip_address),
          e.local_ip, e.ip_address, shortenAgent(e.user_agent), JSON.stringify(e.details ?? {}),
        ]);
        downloadCSV(['Date', 'Code événement', 'Libellé', 'Email', 'IP Affichée', 'IP LAN', 'IP Publique', 'Navigateur', 'Détails'], rows, 'journal_securite.csv');

      } else if (activeView === 'audit') {
        let q = supabase.from('audit_logs').select('*');
        if (search) q = q.ilike('user_email', `%${search}%`);
        if (filterAction) q = q.eq('action', filterAction);
        if (filterType) q = q.ilike('resource_type', `%${filterType}%`);
        if (filterDateFrom) q = q.gte('created_at', filterDateFrom);
        if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59');
        const { data } = await q.order('created_at', { ascending: false });
        const rows = ((data ?? []) as AuditLog[]).map((l) => [
          formatDate(l.created_at), l.action,
          ACTION_META[l.action]?.label ?? l.action,
          l.user_email, l.user_role,
          RESOURCE_LABELS[l.resource_type ?? ''] ?? l.resource_type,
          l.resource_label, l.details,
          effectiveIP(l.local_ip, l.ip_address), l.local_ip, l.ip_address,
          JSON.stringify(l.old_data ?? {}), JSON.stringify(l.new_data ?? {}),
        ]);
        downloadCSV(['Date', 'Code action', 'Libellé', 'Email', 'Rôle', 'Ressource', 'Objet', 'Détails', 'IP Affichée', 'IP LAN', 'IP Publique', 'Avant', 'Après'], rows, 'journal_audit.csv');

      } else {
        // Unified — export both tables merged
        let secQ = supabase.from('security_events').select('*');
        let audQ = supabase.from('audit_logs').select('*');
        if (search) { secQ = secQ.ilike('user_email', `%${search}%`); audQ = audQ.ilike('user_email', `%${search}%`); }
        if (filterDateFrom) { secQ = secQ.gte('created_at', filterDateFrom); audQ = audQ.gte('created_at', filterDateFrom); }
        if (filterDateTo) { secQ = secQ.lte('created_at', filterDateTo + 'T23:59:59'); audQ = audQ.lte('created_at', filterDateTo + 'T23:59:59'); }
        const [secRes, audRes] = await Promise.all([
          secQ.order('created_at', { ascending: false }),
          audQ.order('created_at', { ascending: false }),
        ]);

        const secRows = ((secRes.data ?? []) as SecurityEvent[]).map((e) => [
          formatDate(e.created_at), 'SECURITE', EVENT_META[e.event_type]?.label ?? e.event_type,
          e.user_email, '', '', '',
          effectiveIP(e.local_ip, e.ip_address), e.local_ip, e.ip_address,
          shortenAgent(e.user_agent), JSON.stringify(e.details ?? {}),
        ]);
        const audRows = ((audRes.data ?? []) as AuditLog[]).map((l) => [
          formatDate(l.created_at), 'AUDIT', ACTION_META[l.action]?.label ?? l.action,
          l.user_email, l.user_role,
          RESOURCE_LABELS[l.resource_type ?? ''] ?? l.resource_type, l.resource_label,
          effectiveIP(l.local_ip, l.ip_address), l.local_ip, l.ip_address,
          shortenAgent(l.user_agent), l.details,
        ]);

        const allRows = [...secRows.map(r => ({ date: r[0] as string, row: r })),
                          ...audRows.map(r => ({ date: r[0] as string, row: r }))]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(({ row }) => row);

        downloadCSV(['Date', 'Type', 'Événement', 'Email', 'Rôle', 'Ressource', 'Objet', 'IP Affichée', 'IP LAN', 'IP Publique', 'Navigateur', 'Détails'], allRows, 'journal_evenements_complet.csv');
      }
    } finally {
      setLoading(false);
    }
  };

  const currentTotal = activeView === 'unified' ? unifiedTotal : activeView === 'security' ? secTotal : auditTotal;
  const totalPages = activeView === 'unified'
    ? Math.ceil(unifiedEvents.length / PAGE_SIZE)
    : Math.ceil(currentTotal / PAGE_SIZE);
  const hasActiveFilters = search || filterType || filterAction || filterDateFrom || filterDateTo;

  const pagedUnified = unifiedEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-700" />
            Journal des événements & Audit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Traçabilité complète — connexions, modifications, suppressions, insertions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={exportCSV}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={LogIn}        label="Connexions réussies (24h)" value={stats.loginSuccess}     color="emerald" />
        <StatCard icon={XCircle}      label="Échecs connexion (24h)"     value={stats.loginFailure}     color="red" />
        <StatCard icon={Activity}     label="Actions audit (24h)"        value={stats.last24hActions}   color="blue" />
        <StatCard icon={AlertTriangle} label="IP suspectes (24h)"        value={stats.suspiciousIPs}    color="amber" />
        <StatCard icon={FileText}     label="Total logs audit"           value={auditTotal}             color="slate" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {([
          { id: 'unified',  label: 'Tous les événements', icon: List },
          { id: 'security', label: 'Sécurité & Connexions', icon: Key },
          { id: 'audit',    label: 'Modifications (CRUD)', icon: Activity },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveView(id); setPage(0); resetFilters(); }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-2 ${
              activeView === id
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par email utilisateur..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition ${
              hasActiveFilters ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-white text-slate-800 text-xs font-bold flex items-center justify-center">
                {[filterType, filterAction, filterDateFrom, filterDateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
              <X className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {activeView === 'security' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type d'événement</label>
                <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-300 outline-none">
                  <option value="">Tous</option>
                  {Object.entries(EVENT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
            {activeView === 'audit' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
                  <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-300 outline-none">
                    <option value="">Toutes</option>
                    {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ressource</label>
                  <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-300 outline-none">
                    <option value="">Toutes</option>
                    {Object.entries(RESOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date début</label>
              <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date fin</label>
              <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-300 outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* IP notice */}
      <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          L'adresse IP affichée est l'IP du poste sur le réseau local (LAN) quand disponible.
          Si l'accès se fait via VPN, c'est l'IP publique du point de sortie VPN qui est indiquée.
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {loading ? 'Chargement...' : (
              <><span className="font-semibold text-slate-800">{currentTotal.toLocaleString('fr-FR')}</span> entrées au total</>
            )}
          </span>
          <span className="text-xs text-slate-400">Page {page + 1} / {Math.max(1, totalPages)}</span>
        </div>

        <div className="overflow-x-auto">
          {activeView === 'unified' ? (
            <UnifiedTable events={pagedUnified} expandedRow={expandedRow} onToggleRow={setExpandedRow} loading={loading} />
          ) : activeView === 'security' ? (
            <SecurityTable events={securityEvents} expandedRow={expandedRow} onToggleRow={setExpandedRow} loading={loading} />
          ) : (
            <AuditTable logs={auditLogs} expandedRow={expandedRow} onToggleRow={setExpandedRow} loading={loading} />
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">
              Précédent
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm rounded-lg transition ${p === page ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                    {p + 1}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Unified table ────────────────────────────────────────────────────────────

function UnifiedTable({ events, expandedRow, onToggleRow, loading }: {
  events: UnifiedEvent[];
  expandedRow: string | null;
  onToggleRow: (id: string | null) => void;
  loading: boolean;
}) {
  if (loading) return <LoadingRows cols={6} />;
  if (events.length === 0) return <EmptyState message="Aucun événement trouvé" />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
          <th className="text-left px-4 py-3 font-medium">Date & Heure</th>
          <th className="text-left px-4 py-3 font-medium">Type</th>
          <th className="text-left px-4 py-3 font-medium">Événement / Action</th>
          <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
          <th className="text-left px-4 py-3 font-medium">Adresse IP</th>
          <th className="text-left px-4 py-3 font-medium w-8"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {events.map((evt) => {
          const isExpanded = expandedRow === evt.id;

          let badge: JSX.Element;
          let detail: string;

          if (evt.source === 'security') {
            const meta = EVENT_META[evt.event_type ?? ''] ?? { label: evt.event_type ?? '—', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' };
            const Icon = meta.icon;
            badge = (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />{meta.label}
              </span>
            );
            detail = '';
          } else {
            const meta = ACTION_META[evt.action ?? ''] ?? { label: evt.action ?? '—', icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' };
            const Icon = meta.icon;
            badge = (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />{meta.label}
              </span>
            );
            detail = evt.resource_label ?? (typeof evt.details === 'string' ? evt.details : '') ?? '';
          }

          const sourceTag = evt.source === 'security'
            ? <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500 mr-2">Auth</span>
            : <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-600 mr-2">{RESOURCE_LABELS[evt.resource_type ?? ''] ?? (evt.resource_type ?? 'Audit')}</span>;

          return (
            <>
              <tr
                key={evt.id}
                className="hover:bg-slate-50 transition cursor-pointer"
                onClick={() => onToggleRow(isExpanded ? null : evt.id)}
              >
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">{formatDate(evt.created_at)}</td>
                <td className="px-4 py-3">{sourceTag}</td>
                <td className="px-4 py-3">
                  {badge}
                  {detail && <span className="ml-2 text-xs text-slate-500 truncate max-w-[140px] inline-block align-middle">{detail}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-800 font-medium truncate max-w-[180px]">
                      {evt.user_email ?? <span className="text-slate-400 italic">Anonyme</span>}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <IPCell local_ip={evt.local_ip} ip_address={evt.ip_address} />
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </td>
              </tr>
              {isExpanded && (
                <tr key={`${evt.id}-detail`} className="bg-slate-50/80">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <DetailBlock title="IP LAN" value={evt.local_ip ?? '—'} mono />
                      <DetailBlock title="IP Publique" value={evt.ip_address ?? '—'} mono />
                      <DetailBlock title="Navigateur" value={evt.user_agent ?? '—'} />
                      {evt.source === 'audit' && evt.user_role && <DetailBlock title="Rôle" value={evt.user_role} />}
                      {evt.source === 'audit' && typeof evt.details === 'string' && evt.details && (
                        <DetailBlock title="Description" value={evt.details} />
                      )}
                      {evt.source === 'security' && evt.details && (
                        <DetailBlock title="Détails" value={JSON.stringify(evt.details, null, 2)} mono code />
                      )}
                      {evt.old_data && <DetailBlock title="Avant modification" value={JSON.stringify(evt.old_data, null, 2)} mono code />}
                      {evt.new_data && <DetailBlock title="Après modification" value={JSON.stringify(evt.new_data, null, 2)} mono code />}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Security table ───────────────────────────────────────────────────────────

function SecurityTable({ events, expandedRow, onToggleRow, loading }: {
  events: SecurityEvent[];
  expandedRow: string | null;
  onToggleRow: (id: string | null) => void;
  loading: boolean;
}) {
  if (loading) return <LoadingRows cols={6} />;
  if (events.length === 0) return <EmptyState message="Aucun événement de sécurité trouvé" />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
          <th className="text-left px-4 py-3 font-medium">Date & Heure</th>
          <th className="text-left px-4 py-3 font-medium">Événement</th>
          <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
          <th className="text-left px-4 py-3 font-medium">Adresse IP</th>
          <th className="text-left px-4 py-3 font-medium">Navigateur</th>
          <th className="text-left px-4 py-3 font-medium w-8"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {events.map((evt) => {
          const meta = EVENT_META[evt.event_type] ?? { label: evt.event_type, icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' };
          const Icon = meta.icon;
          const isExpanded = expandedRow === evt.id;
          return (
            <>
              <tr key={evt.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => onToggleRow(isExpanded ? null : evt.id)}>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">{formatDate(evt.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                    <Icon className="w-3.5 h-3.5" />{meta.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-800 font-medium truncate max-w-[180px]">
                      {evt.user_email ?? <span className="text-slate-400 italic">Anonyme</span>}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3"><IPCell local_ip={evt.local_ip} ip_address={evt.ip_address} /></td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Monitor className="w-3.5 h-3.5 text-slate-400" />{shortenAgent(evt.user_agent)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </td>
              </tr>
              {isExpanded && (
                <tr key={`${evt.id}-detail`} className="bg-slate-50/80">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <DetailBlock title="IP LAN (poste)" value={evt.local_ip ?? '—'} mono />
                      <DetailBlock title="IP Publique (NAT/VPN)" value={evt.ip_address ?? '—'} mono />
                      <DetailBlock title="User Agent complet" value={evt.user_agent ?? '—'} mono />
                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <DetailBlock title="Détails" value={JSON.stringify(evt.details, null, 2)} mono code />
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Audit table ──────────────────────────────────────────────────────────────

function AuditTable({ logs, expandedRow, onToggleRow, loading }: {
  logs: AuditLog[];
  expandedRow: string | null;
  onToggleRow: (id: string | null) => void;
  loading: boolean;
}) {
  if (loading) return <LoadingRows cols={7} />;
  if (logs.length === 0) return <EmptyState message="Aucun log d'audit trouvé" />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
          <th className="text-left px-4 py-3 font-medium">Date & Heure</th>
          <th className="text-left px-4 py-3 font-medium">Action</th>
          <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
          <th className="text-left px-4 py-3 font-medium">Rôle</th>
          <th className="text-left px-4 py-3 font-medium">Ressource</th>
          <th className="text-left px-4 py-3 font-medium">Adresse IP</th>
          <th className="text-left px-4 py-3 font-medium w-8"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {logs.map((log) => {
          const aMeta = ACTION_META[log.action] ?? { label: log.action, icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' };
          const AIcon = aMeta.icon;
          const isExpanded = expandedRow === log.id;
          return (
            <>
              <tr key={log.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => onToggleRow(isExpanded ? null : log.id)}>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${aMeta.bg} ${aMeta.color}`}>
                    <AIcon className="w-3.5 h-3.5" />{aMeta.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-800 font-medium truncate max-w-[160px]">{log.user_email ?? '—'}</span>
                  </span>
                </td>
                <td className="px-4 py-3"><RoleBadge role={log.user_role} /></td>
                <td className="px-4 py-3">
                  <div className="text-slate-600 text-xs">{RESOURCE_LABELS[log.resource_type ?? ''] ?? log.resource_type ?? '—'}</div>
                  {log.resource_label && <div className="text-slate-400 text-xs truncate max-w-[120px]">{log.resource_label}</div>}
                </td>
                <td className="px-4 py-3"><IPCell local_ip={log.local_ip} ip_address={log.ip_address} /></td>
                <td className="px-4 py-3 text-slate-400">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </td>
              </tr>
              {isExpanded && (
                <tr key={`${log.id}-detail`} className="bg-slate-50/80">
                  <td colSpan={7} className="px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <DetailBlock title="IP LAN (poste)" value={log.local_ip ?? '—'} mono />
                      <DetailBlock title="IP Publique (NAT/VPN)" value={log.ip_address ?? '—'} mono />
                      <DetailBlock title="Navigateur" value={log.user_agent ?? '—'} />
                      {log.details && <DetailBlock title="Description" value={log.details} />}
                      {log.old_data && <DetailBlock title="Avant modification" value={JSON.stringify(log.old_data, null, 2)} mono code />}
                      {log.new_data && <DetailBlock title="Après modification" value={JSON.stringify(log.new_data, null, 2)} mono code />}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function IPCell({ local_ip, ip_address }: { local_ip: string | null; ip_address: string | null }) {
  const display = effectiveIP(local_ip, ip_address);
  const isLAN = local_ip && local_ip !== 'unknown';
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs text-slate-600" title={isLAN ? `LAN: ${local_ip}\nPublique: ${ip_address ?? '—'}` : `Publique: ${ip_address ?? '—'}`}>
      <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isLAN ? 'text-emerald-500' : 'text-slate-400'}`} />
      {display}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.FC<any>; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colors[color]}`}><Icon className="w-4 h-4" /></div>
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString('fr-FR')}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const labels: Record<string, { label: string; cls: string }> = {
    admin:               { label: 'Admin',       cls: 'bg-red-100 text-red-700' },
    drh:                 { label: 'DRH',         cls: 'bg-purple-100 text-purple-700' },
    manager:             { label: 'Manager',     cls: 'bg-blue-100 text-blue-700' },
    employee:            { label: 'Employé',     cls: 'bg-slate-100 text-slate-600' },
    payroll_manager:     { label: 'Gest. Paie',  cls: 'bg-teal-100 text-teal-700' },
    recruitment_manager: { label: 'Recrutement', cls: 'bg-amber-100 text-amber-700' },
    career_manager:      { label: 'Carrières',   cls: 'bg-indigo-100 text-indigo-700' },
    qvct_manager:        { label: 'QVCT',        cls: 'bg-green-100 text-green-700' },
  };
  const r = labels[role ?? ''] ?? { label: role ?? '—', cls: 'bg-slate-100 text-slate-500' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.cls}`}>{r.label}</span>;
}

function DetailBlock({ title, value, mono = false, code = false }: { title: string; value: string; mono?: boolean; code?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</p>
      {code ? (
        <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 max-h-40">{value}</pre>
      ) : (
        <p className={`text-sm text-slate-800 break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
      )}
    </div>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <table className="w-full">
      <tbody>
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i} className="border-b border-slate-100">
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} className="px-4 py-3">
                <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + (j * 10) % 40}%` }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}
