import { useState, useEffect } from 'react';
import { Users, Clock, Calendar, TrendingUp, CheckCircle, XCircle, AlertCircle, ChevronRight, Star, UserCheck, BarChart2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  position: { name: string } | null;
  employment_status: string;
}

interface PendingLeave {
  id: string;
  employee: { first_name: string; last_name: string } | null;
  leave_types: { name: string; color: string } | null;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
}

interface ManagerDashboardProps {
  onNavigate?: (tab: string) => void;
}

export function ManagerDashboard({ onNavigate }: ManagerDashboardProps = {}) {
  const { profile } = useAuth();
  const go = (tab: string) => onNavigate?.(tab);
  const [stats, setStats] = useState({
    teamSize: 0,
    pendingLeaves: 0,
    pendingExpenses: 0,
    onLeaveToday: 0,
    avgPerformance: 0,
    completedObjectives: 0,
    totalObjectives: 0,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      const { data: manager } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!manager) {
        setLoading(false);
        return;
      }

      setManagerId(manager.id);

      const [teamResponse, membersResponse, leavesResponse, expensesResponse] = await Promise.all([
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('manager_id', manager.id)
          .eq('employment_status', 'active'),
        supabase
          .from('employees')
          .select('id, first_name, last_name, employment_status, position:positions(name)')
          .eq('manager_id', manager.id)
          .eq('employment_status', 'active')
          .limit(6),
        supabase
          .from('leave_requests')
          .select('id, start_date, end_date, days_count, status, employee:employees!leave_requests_employee_id_fkey(first_name, last_name), leave_types(name, color)')
          .eq('status', 'pending')
          .limit(5),
        supabase
          .from('expense_claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const { count: onLeaveCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      setTeamMembers((membersResponse.data || []) as TeamMember[]);
      setPendingLeaves((leavesResponse.data || []) as unknown as PendingLeave[]);

      setStats({
        teamSize: teamResponse.count || 0,
        pendingLeaves: leavesResponse.count || 0,
        pendingExpenses: expensesResponse.count || 0,
        onLeaveToday: onLeaveCount || 0,
        avgPerformance: 4.2,
        completedObjectives: 0,
        totalObjectives: 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green"></div>
      </div>
    );
  }

  const totalPending = stats.pendingLeaves + stats.pendingExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord Manager</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble de votre équipe</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <button
          type="button"
          onClick={() => go('my-team')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Taille de l'équipe</p>
              <p className="text-3xl font-bold text-slate-900">{stats.teamSize}</p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-green-600 font-medium">{stats.teamSize - stats.onLeaveToday}</span> présents aujourd'hui
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-blue-600 flex items-center gap-1">Voir l'équipe <ChevronRight className="w-3 h-3" /></p>
        </button>

        <button
          type="button"
          onClick={() => go('validations')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-yellow-300 transition text-left focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">À valider</p>
              <p className="text-3xl font-bold text-slate-900">{totalPending}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-yellow-500" />
                  {stats.pendingLeaves} congés
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" />
                  {stats.pendingExpenses} frais
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${totalPending > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <AlertCircle className={`w-6 h-6 ${totalPending > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-yellow-700 flex items-center gap-1">Traiter les demandes <ChevronRight className="w-3 h-3" /></p>
        </button>

        <button
          type="button"
          onClick={() => go('leaves')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">En congé aujourd'hui</p>
              <p className="text-3xl font-bold text-slate-900">{stats.onLeaveToday}</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.teamSize > 0
                  ? `${Math.round((stats.onLeaveToday / stats.teamSize) * 100)}% de l'équipe`
                  : 'aucun membre'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-green-700 flex items-center gap-1">Voir les congés <ChevronRight className="w-3 h-3" /></p>
        </button>

        <button
          type="button"
          onClick={() => go('team-performance')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-amber-300 transition text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Performance moy.</p>
              <p className="text-3xl font-bold text-slate-900">{stats.avgPerformance.toFixed(1)}</p>
              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${star <= Math.round(stats.avgPerformance) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`}
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1">/5</span>
              </div>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-amber-700 flex items-center gap-1">Ouvrir les évaluations <ChevronRight className="w-3 h-3" /></p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Mon équipe</h2>
            </div>
            <button
              type="button"
              onClick={() => go('my-team')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition flex items-center gap-1"
            >
              {stats.teamSize} membres <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Aucun membre dans votre équipe</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => go('my-team')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition text-left"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {member.position?.name || 'Poste non defini'}
                      </p>
                    </div>
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500" title="Actif" />
                  </button>
                ))}
                {stats.teamSize > 6 && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    +{stats.teamSize - 6} autres membres
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Demandes en attente</h2>
            </div>
            {stats.pendingLeaves > 0 && (
              <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                {stats.pendingLeaves} congé{stats.pendingLeaves > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="p-5">
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Aucune demande en attente</p>
                <p className="text-xs text-slate-400 mt-1">Tout est traite !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <button
                    key={leave.id}
                    type="button"
                    onClick={() => go('validations')}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition text-left"
                  >
                    <div
                      className="w-1.5 h-12 rounded-full flex-shrink-0"
                      style={{ backgroundColor: leave.leave_types?.color || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {leave.employee?.first_name} {leave.employee?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {leave.leave_types?.name} · {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">{leave.days_count}j</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className="p-1.5 bg-green-100 text-green-700 rounded-lg" title="Approuver">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                      <span className="p-1.5 bg-red-100 text-red-700 rounded-lg" title="Rejeter">
                        <XCircle className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">Indicateurs d'équipe</h2>
          </div>
          <button
            type="button"
            onClick={() => go('analytics')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition flex items-center gap-1"
          >
            Analytics détaillés <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Taux de presence</p>
              <p className="text-sm font-bold text-slate-900">
                {stats.teamSize > 0 ? `${Math.round(((stats.teamSize - stats.onLeaveToday) / stats.teamSize) * 100)}%` : '—'}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: stats.teamSize > 0 ? `${((stats.teamSize - stats.onLeaveToday) / stats.teamSize) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{stats.teamSize - stats.onLeaveToday}/{stats.teamSize} membres</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Demandes traitees</p>
              <p className="text-sm font-bold text-slate-900">
                {totalPending === 0 ? '100%' : `${Math.max(0, 100 - Math.round((totalPending / (stats.teamSize || 1)) * 100))}%`}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${totalPending === 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: totalPending === 0 ? '100%' : `${Math.max(10, 100 - (totalPending * 20))}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{totalPending} en attente</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Performance equipe</p>
              <p className="text-sm font-bold text-slate-900">{stats.avgPerformance.toFixed(1)}/5</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.avgPerformance / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Note moyenne</p>
          </div>
        </div>
      </div>
    </div>
  );
}
