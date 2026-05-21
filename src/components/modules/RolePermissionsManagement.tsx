import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, Unlock, ChevronDown, ChevronRight, Search,
  CheckCircle, AlertCircle, Users, RefreshCw, Filter, Info,
  UserCheck, Eye, EyeOff, Copy, CheckSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../lib/database.types';

interface RolePermission {
  id: string;
  role: string;
  feature_id: string;
  feature_label: string;
  feature_category: string;
  is_granted: boolean;
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  employee_id: string | null;
  password_changed: boolean;
}

interface FeatureGroup {
  category: string;
  features: RolePermission[];
}

const ROLES: { value: UserRole; label: string; color: string; bg: string; border: string; dot: string }[] = [
  { value: 'admin',              label: 'Administrateur',       color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500' },
  { value: 'drh',                label: 'DRH',                  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500' },
  { value: 'director',           label: 'Directeur',            color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  { value: 'manager',            label: 'Manager',              color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  { value: 'payroll_manager',    label: 'Gest. Paie',           color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   dot: 'bg-cyan-500' },
  { value: 'recruitment_manager',label: 'Gest. Recrutement',    color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500' },
  { value: 'career_manager',     label: 'Gest. Carrieres',      color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  { value: 'qvct_manager',       label: 'Gest. QVCT',           color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200',   dot: 'bg-teal-500' },
  { value: 'employee',           label: 'Employe',              color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200',  dot: 'bg-slate-400' },
];

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@snh.cm':         'Admin@SNH2026',
  'director@snh.cm':      'Director@SNH2026',
  'manager@snh.cm':       'Manager@SNH2026',
  'paie@snh.cm':          'Paie@SNH2026',
  'recrutement@snh.cm':   'Recrutement@SNH2026',
  'carrieres@snh.cm':     'Carrieres@SNH2026',
  'qvct@snh.cm':          'Qvct@SNH2026',
  'drh@snh.cm':           'SNH-2017-003',
  'jp.mbarga@snh.cm':     'SNH-2018-001',
  'mc.fotso@snh.cm':      'SNH-2019-002',
};

const CATEGORY_ORDER = ['General', 'Personnel', 'RH', 'Paie', 'Finance', 'Recrutement', 'Formation', 'Performance', 'Analytique', 'Documents', 'Bien-être', 'Administration'];

function groupByCategory(permissions: RolePermission[]): FeatureGroup[] {
  const map: Record<string, RolePermission[]> = {};
  for (const p of permissions) {
    if (!map[p.feature_category]) map[p.feature_category] = [];
    map[p.feature_category].push(p);
  }
  return CATEGORY_ORDER
    .filter((cat) => map[cat])
    .map((cat) => ({ category: cat, features: map[cat] }))
    .concat(
      Object.keys(map)
        .filter((k) => !CATEGORY_ORDER.includes(k))
        .map((k) => ({ category: k, features: map[k] }))
    );
}

type Tab = 'by-role' | 'matrix' | 'accounts';

export function RolePermissionsManagement() {
  const [permissions, setPermissions] = useState<Record<string, RolePermission[]>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterGranted, setFilterGranted] = useState<'all' | 'granted' | 'denied'>('all');
  const [activeTab, setActiveTab] = useState<Tab>('accounts');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [permRes, userRes] = await Promise.all([
        supabase.from('role_permissions').select('*').order('feature_category').order('feature_label'),
        supabase.from('user_profiles').select('id,email,first_name,last_name,role,employee_id,password_changed').order('role').order('last_name'),
      ]);

      if (permRes.error) throw permRes.error;

      const grouped: Record<string, RolePermission[]> = {};
      for (const p of (permRes.data || [])) {
        if (!grouped[p.role]) grouped[p.role] = [];
        grouped[p.role].push(p as RolePermission);
      }
      setPermissions(grouped);

      const cats = [...new Set((permRes.data || []).map((p: any) => p.feature_category))];
      const expanded: Record<string, boolean> = {};
      cats.forEach((c) => { expanded[c] = true; });
      setExpandedCategories(expanded);

      if (!userRes.error) setUsers((userRes.data || []) as UserProfile[]);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des donnees' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const togglePermission = async (permission: RolePermission) => {
    const key = `${permission.role}-${permission.feature_id}`;
    setToggling(key);
    setMessage(null);
    const newValue = !permission.is_granted;
    try {
      const { error } = await supabase
        .from('role_permissions')
        .update({ is_granted: newValue, granted_at: new Date().toISOString() })
        .eq('id', permission.id);
      if (error) throw error;
      setPermissions((prev) => ({
        ...prev,
        [permission.role]: (prev[permission.role] || []).map((p) =>
          p.id === permission.id ? { ...p, is_granted: newValue } : p
        ),
      }));
      setMessage({
        type: 'success',
        text: `Acces ${newValue ? 'accorde' : 'retire'} : "${permission.feature_label}" pour ${ROLES.find(r => r.value === permission.role)?.label}`,
      });
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la mise a jour' });
    } finally {
      setToggling(null);
    }
  };

  const grantAll = async (role: string) => {
    setMessage(null);
    try {
      const { error } = await supabase.from('role_permissions')
        .update({ is_granted: true, granted_at: new Date().toISOString() })
        .eq('role', role).eq('is_granted', false);
      if (error) throw error;
      setPermissions((prev) => ({ ...prev, [role]: (prev[role] || []).map((p) => ({ ...p, is_granted: true })) }));
      setMessage({ type: 'success', text: `Tous les acces accordes pour ${ROLES.find(r => r.value === role)?.label}` });
    } catch { setMessage({ type: 'error', text: 'Erreur lors de la mise a jour groupee' }); }
  };

  const revokeAll = async (role: string) => {
    setMessage(null);
    const protected_ = ['dashboard', 'my-info'];
    try {
      const { error } = await supabase.from('role_permissions')
        .update({ is_granted: false, granted_at: new Date().toISOString() })
        .eq('role', role).eq('is_granted', true)
        .not('feature_id', 'in', `(${protected_.join(',')})`);
      if (error) throw error;
      setPermissions((prev) => ({
        ...prev,
        [role]: (prev[role] || []).map((p) => protected_.includes(p.feature_id) ? p : { ...p, is_granted: false }),
      }));
      setMessage({ type: 'success', text: `Acces retires pour ${ROLES.find(r => r.value === role)?.label} (acces de base conserves)` });
    } catch { setMessage({ type: 'error', text: 'Erreur lors de la mise a jour groupee' }); }
  };

  const currentPerms = permissions[selectedRole] || [];
  const filteredPerms = currentPerms.filter((p) => {
    const matchSearch = p.feature_label.toLowerCase().includes(searchTerm.toLowerCase()) || p.feature_category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterGranted === 'all' || (filterGranted === 'granted' && p.is_granted) || (filterGranted === 'denied' && !p.is_granted);
    return matchSearch && matchFilter;
  });
  const grouped = groupByCategory(filteredPerms);
  const grantedCount = currentPerms.filter((p) => p.is_granted).length;
  const totalCount = currentPerms.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-snh-green mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Permissions & Acces par Role</h2>
          <p className="text-slate-500 mt-1 text-sm">Definissez les droits d'acces aux fonctionnalites du SIRH pour chaque role utilisateur</p>
        </div>
        <button onClick={loadData} className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition" title="Actualiser">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: 'accounts', label: 'Comptes & Roles', icon: UserCheck },
          { id: 'by-role',  label: 'Permissions par role', icon: Shield },
          { id: 'matrix',   label: 'Matrice globale', icon: Filter },
        ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</p>
        </div>
      )}

      {activeTab === 'accounts' && (
        <AccountsView users={users} permissions={permissions} />
      )}

      {activeTab === 'by-role' && (
        <ByRoleView
          permissions={permissions}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterGranted={filterGranted}
          setFilterGranted={setFilterGranted}
          expandedCategories={expandedCategories}
          setExpandedCategories={setExpandedCategories}
          grouped={grouped}
          grantedCount={grantedCount}
          totalCount={totalCount}
          toggling={toggling}
          togglePermission={togglePermission}
          grantAll={grantAll}
          revokeAll={revokeAll}
        />
      )}

      {activeTab === 'matrix' && (
        <MatrixView permissions={permissions} onToggle={togglePermission} toggling={toggling} />
      )}
    </div>
  );
}

function AccountsView({ users, permissions }: { users: UserProfile[]; permissions: Record<string, RolePermission[]> }) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const byRole: Record<string, UserProfile[]> = {};
  for (const u of users) {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  }

  const filteredRoles = ROLES.filter((r) => byRole[r.value]?.length > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
        {ROLES.map((r) => {
          const count = byRole[r.value]?.length || 0;
          const granted = (permissions[r.value] || []).filter(p => p.is_granted).length;
          const total = (permissions[r.value] || []).length;
          return (
            <div key={r.value} className={`rounded-xl border p-3 text-center ${r.bg} ${r.border}`}>
              <div className={`w-2 h-2 rounded-full ${r.dot} mx-auto mb-2`} />
              <p className={`text-xs font-semibold ${r.color} leading-tight`}>{r.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
              <p className="text-[10px] text-slate-400 mt-1">{total > 0 ? `${granted}/${total} droits` : 'N/A'}</p>
            </div>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
        />
      </div>

      {filteredRoles.map((roleInfo) => {
        const roleUsers = (byRole[roleInfo.value] || []).filter((u) =>
          searchUser === '' ||
          u.first_name.toLowerCase().includes(searchUser.toLowerCase()) ||
          u.last_name.toLowerCase().includes(searchUser.toLowerCase()) ||
          u.email.toLowerCase().includes(searchUser.toLowerCase())
        );
        if (roleUsers.length === 0) return null;

        const rolePerms = permissions[roleInfo.value] || [];
        const grantedPerms = rolePerms.filter(p => p.is_granted);
        const deniedPerms = rolePerms.filter(p => !p.is_granted);

        return (
          <div key={roleInfo.value} className={`bg-white rounded-xl border ${roleInfo.border} overflow-hidden`}>
            <div className={`px-5 py-4 ${roleInfo.bg} border-b ${roleInfo.border} flex items-center justify-between flex-wrap gap-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${roleInfo.dot}`} />
                <h3 className={`font-bold text-lg ${roleInfo.color}`}>{roleInfo.label}</h3>
                <span className="bg-white/70 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {roleUsers.length} utilisateur{roleUsers.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-green-700 font-medium">
                  <Unlock className="w-3.5 h-3.5" />
                  {grantedPerms.length} acces accordes
                </span>
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  {deniedPerms.length} acces refuses
                </span>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Utilisateurs ({roleUsers.length})</h4>
                <div className="space-y-2">
                  {roleUsers.map((u) => {
                    const pwdKey = `${u.id}-pwd`;
                    const showPwd = showPasswords[pwdKey];
                    const demoPwd = DEMO_PASSWORDS[u.email];

                    return (
                      <div key={u.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              u.password_changed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {u.password_changed ? 'Actif' : 'Init.'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 font-mono text-xs text-slate-600">
                            {showPwd ? (demoPwd || u.employee_id || '—') : '••••••••••••'}
                          </div>
                          <button
                            onClick={() => setShowPasswords(p => ({ ...p, [pwdKey]: !showPwd }))}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                            title={showPwd ? 'Masquer' : 'Afficher'}
                          >
                            {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {(demoPwd || u.employee_id) && (
                            <button
                              onClick={() => copyToClipboard(demoPwd || u.employee_id || '', `${u.id}-copy`)}
                              className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                              title="Copier le mot de passe"
                            >
                              {copied === `${u.id}-copy` ? <CheckSquare className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Connexion : <span className="font-mono">{u.email}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fonctionnalites accessibles</h4>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {grantedPerms.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun acces accorde</p>
                  ) : (
                    grantedPerms.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-slate-700">{p.feature_label}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{p.feature_category}</span>
                      </div>
                    ))
                  )}
                  {deniedPerms.length > 0 && (
                    <>
                      <div className="border-t border-slate-100 my-2" />
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Acces refuses</p>
                      {deniedPerms.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 py-0.5 opacity-50">
                          <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-400 line-through">{p.feature_label}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ByRoleViewProps {
  permissions: Record<string, RolePermission[]>;
  selectedRole: UserRole;
  setSelectedRole: (r: UserRole) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  filterGranted: 'all' | 'granted' | 'denied';
  setFilterGranted: (f: 'all' | 'granted' | 'denied') => void;
  expandedCategories: Record<string, boolean>;
  setExpandedCategories: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  grouped: FeatureGroup[];
  grantedCount: number;
  totalCount: number;
  toggling: string | null;
  togglePermission: (p: RolePermission) => void;
  grantAll: (role: string) => void;
  revokeAll: (role: string) => void;
}

function ByRoleView({
  permissions, selectedRole, setSelectedRole, searchTerm, setSearchTerm,
  filterGranted, setFilterGranted, expandedCategories, setExpandedCategories,
  grouped, grantedCount, totalCount, toggling, togglePermission, grantAll, revokeAll,
}: ByRoleViewProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="xl:col-span-1">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roles</p>
          </div>
          <div className="divide-y divide-slate-100">
            {ROLES.map((role) => {
              const rolePerms = permissions[role.value] || [];
              const granted = rolePerms.filter((p) => p.is_granted).length;
              const total = rolePerms.length;
              const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
              return (
                <button
                  key={role.value}
                  onClick={() => { setSelectedRole(role.value); setSearchTerm(''); setFilterGranted('all'); }}
                  className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${selectedRole === role.value ? 'bg-slate-50 border-l-2 border-snh-green' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${role.dot}`} />
                      <span className={`text-sm font-medium ${role.color}`}>{role.label}</span>
                    </div>
                    <span className="text-xs text-slate-400">{granted}/{total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-snh-green rounded-full h-1.5 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{pct}% accordes</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="xl:col-span-3 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une fonctionnalite..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(['all', 'granted', 'denied'] as const).map((f) => (
                <button key={f} onClick={() => setFilterGranted(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filterGranted === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f === 'all' ? 'Tous' : f === 'granted' ? 'Accordes' : 'Refuses'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => grantAll(selectedRole)} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
                <Unlock className="w-3.5 h-3.5" /> Tout accorder
              </button>
              <button onClick={() => revokeAll(selectedRole)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition">
                <Lock className="w-3.5 h-3.5" /> Tout retirer
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className={`px-5 py-4 border-b ${ROLES.find(r => r.value === selectedRole)?.border} flex items-center justify-between ${ROLES.find(r => r.value === selectedRole)?.bg}`}>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-600" />
              <div>
                <h3 className="font-semibold text-slate-900">{ROLES.find(r => r.value === selectedRole)?.label}</h3>
                <p className="text-xs text-slate-500">{grantedCount} / {totalCount} fonctionnalites actives</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-white/60 rounded-full h-2">
                <div className="bg-snh-green rounded-full h-2 transition-all duration-500" style={{ width: `${totalCount > 0 ? (grantedCount / totalCount) * 100 : 0}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-700">{totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0}%</span>
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucune permission trouvee</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map(({ category, features }) => (
                <div key={category}>
                  <button
                    onClick={() => setExpandedCategories((p) => ({ ...p, [category]: !p[category] }))}
                    className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCategories[category] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span className="text-sm font-semibold text-slate-700">{category}</span>
                      <span className="text-xs text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">
                        {features.filter(f => f.is_granted).length}/{features.length}
                      </span>
                    </div>
                  </button>
                  {expandedCategories[category] && (
                    <div className="divide-y divide-slate-50">
                      {features.map((perm) => {
                        const key = `${perm.role}-${perm.feature_id}`;
                        const isToggling = toggling === key;
                        const isProtected = ['dashboard', 'my-info'].includes(perm.feature_id);
                        return (
                          <div key={perm.id} className={`flex items-center justify-between px-5 py-3.5 transition ${perm.is_granted ? 'hover:bg-green-50/50' : 'hover:bg-red-50/30'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${perm.is_granted ? 'bg-green-500' : 'bg-slate-300'}`} />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{perm.feature_label}</p>
                                <p className="text-xs text-slate-400">{perm.feature_id}</p>
                              </div>
                              {isProtected && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-600">
                                  <Info className="w-3 h-3" /> Acces de base
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${perm.is_granted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {perm.is_granted ? 'Accorde' : 'Refuse'}
                              </span>
                              <button
                                onClick={() => !isProtected && togglePermission(perm)}
                                disabled={isToggling || isProtected}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isProtected ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${perm.is_granted ? 'bg-snh-green' : 'bg-slate-300'}`}
                              >
                                {isToggling ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3 h-3 border border-white/60 border-t-white rounded-full animate-spin" />
                                  </div>
                                ) : (
                                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${perm.is_granted ? 'translate-x-5' : 'translate-x-0'}`} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MatrixViewProps {
  permissions: Record<string, RolePermission[]>;
  onToggle: (p: RolePermission) => void;
  toggling: string | null;
}

function MatrixView({ permissions, onToggle, toggling }: MatrixViewProps) {
  const allFeatureIds = [...new Set(Object.values(permissions).flat().map((p) => p.feature_id))];
  const featureMap: Record<string, { label: string; category: string }> = {};
  Object.values(permissions).flat().forEach((p) => { featureMap[p.feature_id] = { label: p.feature_label, category: p.feature_category }; });

  const featuresByCategory: Record<string, string[]> = {};
  allFeatureIds.forEach((fid) => {
    const cat = featureMap[fid]?.category || 'General';
    if (!featuresByCategory[cat]) featuresByCategory[cat] = [];
    featuresByCategory[cat].push(fid);
  });

  const getPermission = (role: string, featureId: string): RolePermission | undefined =>
    permissions[role]?.find((p) => p.feature_id === featureId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Users className="w-5 h-5 text-snh-green" />
        <h3 className="font-semibold text-slate-900">Matrice des permissions</h3>
        <span className="text-xs text-slate-400 ml-auto">Cliquez sur une cellule pour basculer l'acces</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 min-w-48 border-r border-slate-200">Fonctionnalite</th>
              {ROLES.map((role) => (
                <th key={role.value} className="px-3 py-3 font-semibold text-center min-w-24">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${role.dot}`} />
                    <span className={`text-xs ${role.color}`}>{role.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CATEGORY_ORDER.filter((cat) => featuresByCategory[cat]).map((cat) => (
              <>
                <tr key={`cat-${cat}`} className="bg-slate-50">
                  <td colSpan={ROLES.length + 1} className="px-4 py-2 font-semibold text-slate-500 uppercase tracking-wider text-[10px] sticky left-0 bg-slate-50">
                    {cat}
                  </td>
                </tr>
                {featuresByCategory[cat].map((featureId) => (
                  <tr key={featureId} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-2.5 sticky left-0 bg-white border-r border-slate-100">
                      <p className="font-medium text-slate-700">{featureMap[featureId]?.label}</p>
                      <p className="text-slate-400 text-[10px]">{featureId}</p>
                    </td>
                    {ROLES.map((role) => {
                      const perm = getPermission(role.value, featureId);
                      const key = `${role.value}-${featureId}`;
                      const isToggling = toggling === key;
                      const isProtected = ['dashboard', 'my-info'].includes(featureId);
                      if (!perm) return <td key={role.value} className="px-3 py-2.5 text-center"><span className="text-slate-200">—</span></td>;
                      return (
                        <td key={role.value} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => !isProtected && onToggle(perm)}
                            disabled={isToggling || isProtected}
                            className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition ${
                              isProtected ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
                            } ${perm.is_granted ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            {isToggling
                              ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              : perm.is_granted ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
