import { useState, useEffect } from 'react';
import {
  Users, Briefcase, TrendingUp, Calendar, GraduationCap,
  AlertTriangle, CheckCircle, Building2, UserPlus, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DepartmentStat {
  name: string;
  count: number;
  color: string;
}

interface RecentLeave {
  id: string;
  employee: { first_name: string; last_name: string } | null;
  leave_types: { name: string } | null;
  start_date: string;
  days_count: number;
  status: string;
}

const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

interface DRHDashboardProps {
  onNavigate?: (tab: string) => void;
}

export function DRHDashboard({ onNavigate }: DRHDashboardProps = {}) {
  const go = (tab: string) => onNavigate?.(tab);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeRecruitments: 0,
    turnoverRate: 3.2,
    trainingParticipation: 78,
    pendingLeaves: 0,
    upcomingTrainings: 0,
    newHires: 0,
    totalCandidates: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<RecentLeave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        employeesResponse,
        recruitmentsResponse,
        leavesResponse,
        trainingsResponse,
        candidatesResponse,
        departmentsResponse,
        recentLeavesResponse,
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
        supabase.from('job_openings').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('training_programs').select('*', { count: 'exact', head: true }).eq('status', 'ongoing'),
        supabase.from('candidates').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('department:departments(name), employment_status').eq('employment_status', 'active'),
        supabase
          .from('leave_requests')
          .select('id, start_date, days_count, status, employee:employees!leave_requests_employee_id_fkey(first_name, last_name), leave_types(name)')
          .in('status', ['pending', 'approved'])
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const deptMap: Record<string, number> = {};
      (departmentsResponse.data || []).forEach((emp: any) => {
        const deptName = emp.department?.name || 'Non defini';
        deptMap[deptName] = (deptMap[deptName] || 0) + 1;
      });

      const totalEmp = employeesResponse.count || 1;
      const deptStats: DepartmentStat[] = Object.entries(deptMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count], i) => ({
          name,
          count,
          color: DEPT_COLORS[i % DEPT_COLORS.length],
        }));

      setDepartmentStats(deptStats);
      setRecentLeaves((recentLeavesResponse.data || []) as unknown as RecentLeave[]);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: newHires } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .gte('hire_date', thisMonth.toISOString().split('T')[0]);

      setStats({
        totalEmployees: totalEmp,
        activeRecruitments: recruitmentsResponse.count || 0,
        turnoverRate: 3.2,
        trainingParticipation: 78,
        pendingLeaves: leavesResponse.count || 0,
        upcomingTrainings: trainingsResponse.count || 0,
        newHires: newHires || 0,
        totalCandidates: candidatesResponse.count || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const getStatusStyle = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return 'Approuve';
    if (status === 'pending') return 'En attente';
    return status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord DRH</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble des ressources humaines SNH</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <button
          type="button"
          onClick={() => go('employees')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Effectif total</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalEmployees}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                +{stats.newHires} ce mois
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-blue-600 flex items-center gap-1">Ouvrir le personnel <ChevronRight className="w-3 h-3" /></p>
        </button>

        <button
          type="button"
          onClick={() => go('recruitment')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Recrutements actifs</p>
              <p className="text-3xl font-bold text-slate-900">{stats.activeRecruitments}</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.totalCandidates} candidat{stats.totalCandidates !== 1 ? 's' : ''} en cours
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-green-700 flex items-center gap-1">Gérer les recrutements <ChevronRight className="w-3 h-3" /></p>
        </button>

        <button
          type="button"
          onClick={() => go('analytics')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-yellow-300 transition text-left focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Taux de turnover</p>
              <p className="text-3xl font-bold text-slate-900">{stats.turnoverRate}%</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Objectif &lt;5% atteint
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-yellow-700 flex items-center gap-1">Analytics RH <ChevronRight className="w-3 h-3" /></p>
        </button>

        <button
          type="button"
          onClick={() => go('training-admin')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Participation formation</p>
              <p className="text-3xl font-bold text-slate-900">{stats.trainingParticipation}%</p>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats.trainingParticipation}%` }} />
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-blue-600 flex items-center gap-1">Gérer les formations <ChevronRight className="w-3 h-3" /></p>
        </button>
      </div>

      {stats.pendingLeaves > 0 && (
        <button
          type="button"
          onClick={() => go('validations')}
          className="w-full flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition text-left"
        >
          <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {stats.pendingLeaves} demande{stats.pendingLeaves > 1 ? 's' : ''} de conge en attente de validation
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">Cliquez pour traiter</p>
          </div>
          <span className="text-xs font-bold text-yellow-700 bg-yellow-200 px-3 py-1 rounded-full flex items-center gap-1">
            {stats.pendingLeaves} <ChevronRight className="w-3 h-3" />
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Repartition par departement</h2>
            </div>
            <button
              type="button"
              onClick={() => go('org-chart')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition flex items-center gap-1"
            >
              Organigramme <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {departmentStats.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">Aucune donnee disponible</p>
            ) : (
              <div className="space-y-3">
                {departmentStats.map((dept) => (
                  <button
                    key={dept.name}
                    type="button"
                    onClick={() => go('employees')}
                    className="w-full text-left rounded-lg p-2 -m-2 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 font-medium truncate max-w-[60%]">{dept.name}</span>
                      <span className="text-sm font-bold text-slate-900 ml-2">
                        {dept.count}
                        <span className="text-xs text-slate-400 font-normal ml-1">
                          ({Math.round((dept.count / stats.totalEmployees) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(dept.count / stats.totalEmployees) * 100}%`,
                          backgroundColor: dept.color,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Conges recents</h2>
            </div>
            <button
              type="button"
              onClick={() => go('leave')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition flex items-center gap-1"
            >
              {stats.pendingLeaves > 0 ? `${stats.pendingLeaves} en attente` : 'Voir tout'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {recentLeaves.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">Aucune demande recente</p>
            ) : (
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <button
                    key={leave.id}
                    type="button"
                    onClick={() => go('leave')}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition text-left"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {leave.employee?.first_name?.[0]}{leave.employee?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {leave.employee?.first_name} {leave.employee?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {leave.leave_types?.name} · {formatDate(leave.start_date)} · {leave.days_count}j
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${getStatusStyle(leave.status)}`}>
                      {getStatusLabel(leave.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => go('training-admin')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Formations actives</h3>
            <GraduationCap className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{stats.upcomingTrainings}</p>
          <p className="text-sm text-slate-600">programmes en cours</p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {stats.trainingParticipation}% de participation globale
            </p>
            <ChevronRight className="w-4 h-4 text-blue-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => go('recruitment')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Postes ouverts</h3>
            <Briefcase className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{stats.activeRecruitments}</p>
          <p className="text-sm text-slate-600">offres publiees</p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {stats.totalCandidates} candidat{stats.totalCandidates !== 1 ? 's' : ''} en évaluation
            </p>
            <ChevronRight className="w-4 h-4 text-green-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => go('employees')}
          className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-emerald-300 transition text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Nouvelles embauches</h3>
            <UserPlus className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{stats.newHires}</p>
          <p className="text-sm text-slate-600">ce mois-ci</p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Turnover: {stats.turnoverRate}% (cible &lt;5%)
            </p>
            <ChevronRight className="w-4 h-4 text-emerald-500" />
          </div>
        </button>
      </div>
    </div>
  );
}
