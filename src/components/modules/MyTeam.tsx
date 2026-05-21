import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Filter, ChevronDown, Calendar, Clock, Target,
  TrendingUp, Mail, Phone, CheckCircle, XCircle, AlertCircle,
  UserCheck, BarChart2, Award, Star, X, Eye, DollarSign,
  FileText, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type View = 'overview' | 'leaves' | 'expenses' | 'performance';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  employee_number: string;
  hire_date: string;
  employment_status: string;
  contract_type: string;
  department: { name: string } | null;
  position: { name: string } | null;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee: { first_name: string; last_name: string; photo_url: string | null } | null;
  leave_types: { name: string; color: string } | null;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  reason: string | null;
  created_at: string;
}

interface ExpenseClaim {
  id: string;
  employee_id: string;
  employee: { first_name: string; last_name: string } | null;
  title: string;
  amount: number;
  currency: string;
  status: string;
  category: string;
  claim_date: string;
  created_at: string;
}

interface MemberDetailProps {
  member: TeamMember;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  on_leave: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-slate-100 text-slate-700',
};

const statusLabels: Record<string, string> = {
  active: 'Actif',
  on_leave: 'En conge',
  suspended: 'Suspendu',
  terminated: 'Quitte',
};

const contractLabels: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  Stage: 'Stage',
  Consultant: 'Consultant',
};

function Avatar({ member, size = 'md' }: { member: { first_name: string; last_name: string; photo_url?: string | null }; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  if (member.photo_url) {
    return (
      <img
        src={member.photo_url}
        alt={`${member.first_name} ${member.last_name}`}
        className={`${dims} rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0`}
      />
    );
  }
  const colors = [
    'from-blue-500 to-blue-700',
    'from-teal-500 to-teal-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700',
    'from-emerald-500 to-emerald-700',
  ];
  const colorIndex = (member.first_name.charCodeAt(0) + member.last_name.charCodeAt(0)) % colors.length;
  return (
    <div className={`${dims} bg-gradient-to-br ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {member.first_name[0]}{member.last_name[0]}
    </div>
  );
}

function MemberDetail({ member, onClose }: MemberDetailProps) {
  const yearsOfService = Math.floor((Date.now() - new Date(member.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <Avatar member={member} size="lg" />
            <div>
              <h2 className="text-xl font-bold">{member.first_name} {member.last_name}</h2>
              <p className="text-slate-300 text-sm">{member.position?.name || 'Poste non defini'}</p>
              <p className="text-slate-400 text-xs mt-0.5">{member.department?.name || 'Departement non defini'}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[member.employment_status] || 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[member.employment_status] || member.employment_status}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 font-medium">
              {contractLabels[member.contract_type] || member.contract_type}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={<Award className="w-4 h-4 text-slate-400" />} label="Matricule" value={member.employee_number} />
            <InfoItem icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Date d'embauche" value={new Date(member.hire_date).toLocaleDateString('fr-FR')} />
            <InfoItem icon={<Clock className="w-4 h-4 text-slate-400" />} label="Anciennete" value={`${yearsOfService} an${yearsOfService > 1 ? 's' : ''}`} />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Contact</h3>
            <a href={`mailto:${member.email}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition group">
              <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition">
                <Mail className="w-4 h-4" />
              </div>
              {member.email}
            </a>
            {member.phone && (
              <a href={`tel:${member.phone}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition group">
                <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition">
                  <Phone className="w-4 h-4" />
                </div>
                {member.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function MyTeam() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveFilter, setLeaveFilter] = useState<string>('pending');
  const [expenseFilter, setExpenseFilter] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0, pendingLeaves: 0, pendingExpenses: 0 });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: managerRow } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!managerRow) { setLoading(false); return; }

      const managerId = managerRow.id;

      const [membersRes, leavesRes, expensesRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name, last_name, email, phone, photo_url, employee_number, hire_date, employment_status, contract_type, department:departments(name), position:positions(name)')
          .eq('manager_id', managerId),
        supabase
          .from('leave_requests')
          .select('id, employee_id, start_date, end_date, days_count, status, reason, created_at, employee:employees!leave_requests_employee_id_fkey(first_name, last_name, photo_url), leave_types(name, color)')
          .in('employee_id', (await supabase.from('employees').select('id').eq('manager_id', managerId)).data?.map(e => e.id) || [])
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('expense_claims')
          .select('id, employee_id, title, amount, currency, status, category, claim_date, created_at, employee:employees!expense_claims_employee_id_fkey(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const membersList = (membersRes.data || []) as TeamMember[];
      setMembers(membersList);
      setLeaves((leavesRes.data || []) as unknown as LeaveRequest[]);
      setExpenses((expensesRes.data || []) as unknown as ExpenseClaim[]);

      const activeCount = membersList.filter(m => m.employment_status === 'active').length;
      const onLeaveCount = membersList.filter(m => m.employment_status === 'on_leave').length;
      const pendingLeaves = (leavesRes.data || []).filter((l: any) => l.status === 'pending').length;
      const pendingExpenses = (expensesRes.data || []).filter((e: any) => e.status === 'pending').length;

      setStats({
        total: membersList.length,
        active: activeCount,
        onLeave: onLeaveCount,
        pendingLeaves,
        pendingExpenses,
      });
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'approved' | 'rejected') => {
    setProcessingId(leaveId);
    try {
      await supabase
        .from('leave_requests')
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq('id', leaveId);
      setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: action } : l));
      setStats(prev => ({ ...prev, pendingLeaves: Math.max(0, prev.pendingLeaves - 1) }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleExpenseAction = async (expenseId: string, action: 'approved' | 'rejected') => {
    setProcessingId(expenseId);
    try {
      await supabase
        .from('expense_claims')
        .update({ status: action })
        .eq('id', expenseId);
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status: action } : e));
      setStats(prev => ({ ...prev, pendingExpenses: Math.max(0, prev.pendingExpenses - 1) }));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchSearch = search === '' ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      m.employee_number.toLowerCase().includes(search.toLowerCase()) ||
      (m.position?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.employment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredLeaves = leaves.filter(l => leaveFilter === 'all' || l.status === leaveFilter);
  const filteredExpenses = expenses.filter(e => expenseFilter === 'all' || e.status === expenseFilter);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const views: { id: View; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <Users className="w-4 h-4" /> },
    { id: 'leaves', label: 'Conges', icon: <Calendar className="w-4 h-4" />, badge: stats.pendingLeaves },
    { id: 'expenses', label: 'Notes de frais', icon: <DollarSign className="w-4 h-4" />, badge: stats.pendingExpenses },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-snh-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon equipe</h1>
          <p className="text-slate-500 text-sm mt-0.5">{stats.total} membre{stats.total > 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Users className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" />
        <StatCard label="Actifs" value={stats.active} icon={<UserCheck className="w-5 h-5 text-green-600" />} bg="bg-green-50" />
        <StatCard label="En conge" value={stats.onLeave} icon={<Calendar className="w-5 h-5 text-amber-600" />} bg="bg-amber-50" />
        <StatCard label="Conges a valider" value={stats.pendingLeaves} icon={<AlertCircle className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" urgent={stats.pendingLeaves > 0} />
        <StatCard label="Frais a valider" value={stats.pendingExpenses} icon={<DollarSign className="w-5 h-5 text-rose-600" />} bg="bg-rose-50" urgent={stats.pendingExpenses > 0} />
      </div>

      {/* View tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition relative ${
                view === v.id
                  ? 'text-snh-green border-b-2 border-snh-green'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {v.icon}
              {v.label}
              {v.badge !== undefined && v.badge > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                  {v.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {view === 'overview' && (
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, matricule, poste..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-snh-green/30 focus:border-snh-green"
                />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-snh-green/30 focus:border-snh-green bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="on_leave">En conge</option>
                  <option value="suspended">Suspendus</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <EmptyState icon={<Users className="w-10 h-10 text-slate-200" />} title="Aucun membre trouve" desc="Modifiez vos filtres de recherche" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMembers.map(member => (
                  <MemberCard key={member.id} member={member} onClick={() => setSelectedMember(member)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaves */}
        {view === 'leaves' && (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm text-slate-500">Filtre:</span>
              {['pending', 'approved', 'rejected', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setLeaveFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                    leaveFilter === f
                      ? 'bg-snh-green text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuves' : f === 'rejected' ? 'Refuses' : 'Tous'}
                </button>
              ))}
            </div>

            {filteredLeaves.length === 0 ? (
              <EmptyState icon={<Calendar className="w-10 h-10 text-slate-200" />} title="Aucune demande" desc="Aucun conge pour ce filtre" />
            ) : (
              <div className="space-y-3">
                {filteredLeaves.map(leave => (
                  <LeaveRow
                    key={leave.id}
                    leave={leave}
                    processing={processingId === leave.id}
                    onApprove={() => handleLeaveAction(leave.id, 'approved')}
                    onReject={() => handleLeaveAction(leave.id, 'rejected')}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expenses */}
        {view === 'expenses' && (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm text-slate-500">Filtre:</span>
              {['pending', 'approved', 'rejected', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setExpenseFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                    expenseFilter === f
                      ? 'bg-snh-green text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvees' : f === 'rejected' ? 'Refusees' : 'Toutes'}
                </button>
              ))}
            </div>

            {filteredExpenses.length === 0 ? (
              <EmptyState icon={<DollarSign className="w-10 h-10 text-slate-200" />} title="Aucune note de frais" desc="Aucune note de frais pour ce filtre" />
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    processing={processingId === expense.id}
                    onApprove={() => handleExpenseAction(expense.id, 'approved')}
                    onReject={() => handleExpenseAction(expense.id, 'rejected')}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Performance */}
        {view === 'performance' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <KpiCard title="Taux de presence" value={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : '—'} sub={`${stats.active}/${stats.total} membres`} color="text-green-600" />
              <KpiCard title="En conge aujourd'hui" value={stats.onLeave.toString()} sub={stats.total > 0 ? `${Math.round((stats.onLeave / stats.total) * 100)}% de l'equipe` : '—'} color="text-amber-600" />
              <KpiCard title="Demandes en attente" value={(stats.pendingLeaves + stats.pendingExpenses).toString()} sub={`${stats.pendingLeaves} conges, ${stats.pendingExpenses} frais`} color="text-orange-600" />
            </div>

            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Repartition des membres
              </h3>
              <div className="space-y-3">
                {['active', 'on_leave', 'suspended'].map(status => {
                  const count = members.filter(m => m.employment_status === status).length;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{statusLabels[status]}</span>
                        <span className="font-medium">{count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${status === 'active' ? 'bg-green-500' : status === 'on_leave' ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Anciennete par membre</h3>
              <div className="space-y-2">
                {[...members]
                  .sort((a, b) => new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime())
                  .slice(0, 8)
                  .map(m => {
                    const years = Math.floor((Date.now() - new Date(m.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365));
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
                        <Avatar member={m} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{m.first_name} {m.last_name}</p>
                          <p className="text-xs text-slate-500">{m.position?.name || 'Poste non defini'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-900">{years} an{years > 1 ? 's' : ''}</p>
                          <p className="text-xs text-slate-400">depuis {new Date(m.hire_date).getFullYear()}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberDetail member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, bg, urgent }: { label: string; value: number; icon: React.ReactNode; bg: string; urgent?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border ${urgent ? 'border-orange-200' : 'border-slate-200'} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
        {urgent && <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function MemberCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
  const yearsOfService = Math.floor((Date.now() - new Date(member.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365));
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <Avatar member={member} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-snh-green transition truncate">
            {member.first_name} {member.last_name}
          </p>
          <p className="text-xs text-slate-500 truncate">{member.position?.name || 'Poste non defini'}</p>
          <p className="text-xs text-slate-400 truncate">{member.department?.name || ''}</p>
        </div>
        <div className="flex-shrink-0">
          <Eye className="w-4 h-4 text-slate-300 group-hover:text-snh-green transition" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[member.employment_status] || 'bg-slate-100 text-slate-600'}`}>
          {statusLabels[member.employment_status] || member.employment_status}
        </span>
        <span className="text-xs text-slate-400">{yearsOfService} an{yearsOfService > 1 ? 's' : ''} d'anciennete</span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Award className="w-3 h-3" />
          {member.employee_number}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {contractLabels[member.contract_type] || member.contract_type}
        </span>
      </div>
    </div>
  );
}

function LeaveRow({
  leave, processing, onApprove, onReject, formatDate
}: {
  leave: LeaveRequest;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  formatDate: (d: string) => string;
}) {
  const statusStyle: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const statusLabel: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuve',
    rejected: 'Refuse',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
      <div className="w-1.5 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: leave.leave_types?.color || '#3b82f6' }} />
      <Avatar member={leave.employee || { first_name: '?', last_name: '?', photo_url: null }} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {leave.employee?.first_name} {leave.employee?.last_name}
        </p>
        <p className="text-xs text-slate-500">
          {leave.leave_types?.name} · {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
        </p>
        {leave.reason && <p className="text-xs text-slate-400 truncate mt-0.5 italic">"{leave.reason}"</p>}
      </div>
      <div className="text-center flex-shrink-0">
        <p className="text-lg font-bold text-slate-900">{leave.days_count}</p>
        <p className="text-xs text-slate-400">jour{leave.days_count > 1 ? 's' : ''}</p>
      </div>
      <div className="flex-shrink-0">
        {leave.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={processing}
              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition disabled:opacity-50"
              title="Approuver"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onReject}
              disabled={processing}
              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition disabled:opacity-50"
              title="Refuser"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[leave.status] || 'bg-slate-100 text-slate-600'}`}>
            {statusLabel[leave.status] || leave.status}
          </span>
        )}
      </div>
    </div>
  );
}

function ExpenseRow({
  expense, processing, onApprove, onReject, formatDate
}: {
  expense: ExpenseClaim;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  formatDate: (d: string) => string;
}) {
  const statusStyle: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const statusLabel: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvee',
    rejected: 'Refusee',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
      <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex-shrink-0">
        <DollarSign className="w-5 h-5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {expense.employee?.first_name} {expense.employee?.last_name}
        </p>
        <p className="text-xs text-slate-500">
          {expense.title} · {expense.category} · {formatDate(expense.claim_date)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900">{Number(expense.amount).toLocaleString('fr-FR')} {expense.currency || 'FCFA'}</p>
      </div>
      <div className="flex-shrink-0">
        {expense.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={processing}
              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition disabled:opacity-50"
              title="Approuver"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onReject}
              disabled={processing}
              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition disabled:opacity-50"
              title="Refuser"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[expense.status] || 'bg-slate-100 text-slate-600'}`}>
            {statusLabel[expense.status] || expense.status}
          </span>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-slate-500 font-medium">{title}</p>
      <p className="text-slate-400 text-sm mt-1">{desc}</p>
    </div>
  );
}
