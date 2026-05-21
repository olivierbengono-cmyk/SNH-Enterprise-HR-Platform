import { useState, useEffect } from 'react';
import { Calendar, FileText, GraduationCap, Target, Clock, CheckCircle, DollarSign, Users, MessageCircle, Bell, TrendingUp, Award, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveRequestForm } from '../modules/LeaveRequestForm';

interface EmployeeDashboardProps {
  onTabChange: (tab: string) => void;
}

export function EmployeeDashboard({ onTabChange }: EmployeeDashboardProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    leaveBalance: 0,
    leaveTaken: 0,
    pendingRequests: 0,
    upcomingTrainings: 0,
    completedTrainings: 0,
    lastReview: null as string | null,
    newDiscussions: 0,
    activeObjectives: 0,
    pendingExpenses: 0,
    recentPayslip: null as any,
  });
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<any[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);
  const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  useEffect(() => {
    loadDashboardData();

    const channel = supabase
      .channel('employee-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qvct_discussion_threads',
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('*, department:departments(*), position:positions(*)')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!employee) {
        setLoading(false);
        return;
      }

      setEmployeeData(employee);

      const today = new Date();
      const currentYear = today.getFullYear();

      const [
        { data: allLeaves },
        { data: upcomingLeavesData },
        { data: discussions },
        { data: trainings },
        { data: enrollments },
        { data: objectivesData },
        { data: expenses },
        { data: payslip }
      ] = await Promise.all([
        supabase
          .from('leave_requests')
          .select(`*, leave_types (name, color)`)
          .eq('employee_id', employee.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('leave_requests')
          .select(`*, leave_types (name, color)`)
          .eq('employee_id', employee.id)
          .eq('status', 'approved')
          .gte('start_date', today.toISOString().split('T')[0])
          .order('start_date', { ascending: true })
          .limit(3),

        supabase
          .from('qvct_discussion_threads')
          .select(`*, creator:employees!qvct_discussion_threads_created_by_fkey(first_name, last_name)`)
          .eq('status', 'open')
          .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('training_programs')
          .select('*')
          .gte('end_date', today.toISOString().split('T')[0])
          .order('start_date', { ascending: true }),

        supabase
          .from('training_enrollments')
          .select('*, training:training_programs(*)')
          .eq('employee_id', employee.id),

        supabase
          .from('performance_objectives')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false }),

        supabase
          .from('expense_claims')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),

        supabase
          .from('payslips')
          .select('*')
          .eq('employee_id', employee.id)
          .order('pay_period_start', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const approvedLeaves = (allLeaves || []).filter(l => l.status === 'approved');
      const leaveTaken = approvedLeaves.reduce((sum, leave) => {
        const start = new Date(leave.start_date);
        if (start.getFullYear() === currentYear && new Date(leave.end_date) < today) {
          return sum + (leave.days_count || 0);
        }
        return sum;
      }, 0);

      const leaveBalance = 22 - leaveTaken;

      const enrolledTrainingIds = (enrollments || []).map(e => e.training_id);
      const upcomingTrainingsData = (trainings || [])
        .filter(t => enrolledTrainingIds.includes(t.id))
        .slice(0, 3);

      const completedEnrollments = (enrollments || []).filter(e => e.status === 'completed');

      const activities: any[] = [];

      (allLeaves || []).slice(0, 3).forEach(leave => {
        activities.push({
          type: 'leave',
          date: leave.created_at,
          title: `Demande de ${leave.leave_types?.name || 'congé'}`,
          status: leave.status,
          icon: Calendar,
          color: 'blue',
          data: leave
        });
      });

      (enrollments || []).slice(0, 2).forEach(enrollment => {
        if (enrollment.training) {
          activities.push({
            type: 'training',
            date: enrollment.enrolled_at,
            title: `Formation: ${enrollment.training.title}`,
            status: enrollment.status,
            icon: GraduationCap,
            color: 'green',
            data: enrollment
          });
        }
      });

      (objectivesData || []).slice(0, 2).forEach(obj => {
        activities.push({
          type: 'objective',
          date: obj.created_at,
          title: obj.title,
          status: obj.status,
          icon: Target,
          color: 'purple',
          data: obj
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentLeaves(allLeaves?.slice(0, 5) || []);
      setUpcomingLeaves(upcomingLeavesData || []);
      setRecentDiscussions(discussions || []);
      setUpcomingTrainings(upcomingTrainingsData);
      setObjectives(objectivesData || []);
      setRecentActivities(activities.slice(0, 8));

      setStats({
        leaveBalance,
        leaveTaken,
        pendingRequests: (allLeaves || []).filter(l => l.status === 'pending').length,
        upcomingTrainings: upcomingTrainingsData.length,
        completedTrainings: completedEnrollments.length,
        lastReview: null,
        newDiscussions: (discussions || []).length,
        activeObjectives: (objectivesData || []).length,
        pendingExpenses: (expenses || []).length,
        recentPayslip: payslip
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-slate-100 text-slate-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      enrolled: 'bg-blue-100 text-blue-800',
    };

    const labels: Record<string, string> = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      cancelled: 'Annulé',
      in_progress: 'En cours',
      completed: 'Terminé',
      enrolled: 'Inscrit',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
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
          <h1 className="text-3xl font-bold text-slate-900">Bonjour, {profile?.first_name} !</h1>
          <p className="text-slate-600 mt-1">
            {employeeData?.position?.name} - {employeeData?.department?.name}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {stats.recentPayslip && (
          <button
            onClick={() => onTabChange('payslips')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <FileText size={18} />
            <span>Dernier bulletin disponible</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onTabChange('leaves')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            {stats.pendingRequests > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {stats.pendingRequests} en attente
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-1">Solde de congés</p>
          <p className="text-3xl font-bold text-slate-900">{stats.leaveBalance}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">{stats.leaveTaken} jours pris</span>
            <span className="text-blue-600 font-medium group-hover:underline">Voir détails →</span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('training')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            {stats.upcomingTrainings > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {stats.upcomingTrainings} à venir
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-1">Formations</p>
          <p className="text-3xl font-bold text-slate-900">{stats.completedTrainings}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">cette année</span>
            <span className="text-green-600 font-medium group-hover:underline">Voir catalogue →</span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('performance')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            {stats.activeObjectives > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                {stats.activeObjectives} actifs
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-1">Objectifs</p>
          <p className="text-3xl font-bold text-slate-900">{stats.activeObjectives}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">en cours</span>
            <span className="text-purple-600 font-medium group-hover:underline">Gérer →</span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('qvct')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition relative">
              <MessageCircle className="w-5 h-5 text-orange-600" />
              {stats.newDiscussions > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {stats.newDiscussions}
                </span>
              )}
            </div>
            {stats.newDiscussions > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                <Bell size={12} />
                Nouveau
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-1">Discussions QVCT</p>
          <p className="text-3xl font-bold text-slate-900">{stats.newDiscussions}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">3 derniers jours</span>
            <span className="text-orange-600 font-medium group-hover:underline">Participer →</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Congés à venir</h2>
              <button
                onClick={() => setShowLeaveForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Nouvelle demande
              </button>
            </div>
            <div className="p-5">
              {upcomingLeaves.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-3">Aucun congé prévu</p>
                  <button
                    onClick={() => setShowLeaveForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Planifier des congés
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      onClick={() => onTabChange('leaves')}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-12 rounded-full"
                          style={{ backgroundColor: leave.leave_types?.color || '#3b82f6' }}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{leave.leave_types?.name}</p>
                          <p className="text-sm text-slate-600">
                            {formatDate(leave.start_date)} - {new Date(leave.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{leave.days_count}</p>
                        <p className="text-xs text-slate-500">jours</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Activités récentes</h2>
              <button
                onClick={() => onTabChange('leaves')}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Tout voir
              </button>
            </div>
            <div className="p-5">
              {recentActivities.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Aucune activité récente</p>
              ) : (
                <div className="space-y-1">
                  {recentActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={index}
                        onClick={() => onTabChange(activity.type === 'leave' ? 'leaves' : activity.type === 'training' ? 'training' : 'performance')}
                        className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                      >
                        <div className={`p-2 bg-${activity.color}-50 rounded-lg mt-0.5`}>
                          <Icon className={`w-4 h-4 text-${activity.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {getStatusBadge(activity.status)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Formations à venir</h2>
              {stats.upcomingTrainings > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  {stats.upcomingTrainings}
                </span>
              )}
            </div>
            <div className="p-5">
              {upcomingTrainings.length === 0 ? (
                <div className="text-center py-6">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-3">Aucune formation planifiée</p>
                  <button
                    onClick={() => onTabChange('training')}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Explorer le catalogue
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTrainings.map((training) => (
                    <div
                      key={training.id}
                      onClick={() => onTabChange('training')}
                      className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                    >
                      <p className="font-medium text-slate-900 text-sm mb-1">{training.title}</p>
                      <p className="text-xs text-slate-600 mb-2">{training.category}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {formatDate(training.start_date)}
                        </span>
                        <span className="text-green-600 font-medium">{training.duration_hours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Discussions QVCT</h2>
              {stats.newDiscussions > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                  <Bell size={12} />
                  {stats.newDiscussions}
                </span>
              )}
            </div>
            <div className="p-5">
              {recentDiscussions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Aucune nouvelle discussion</p>
              ) : (
                <div className="space-y-3">
                  {recentDiscussions.slice(0, 3).map((discussion) => (
                    <div
                      key={discussion.id}
                      onClick={() => onTabChange('qvct')}
                      className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition"
                    >
                      <p className="font-medium text-slate-900 text-sm mb-1 line-clamp-1">{discussion.title}</p>
                      <p className="text-xs text-slate-600 mb-2">
                        Par {discussion.creator?.first_name} {discussion.creator?.last_name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-0.5 bg-white text-slate-700 rounded">
                          {discussion.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(discussion.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {objectives.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Mes objectifs</h2>
                <span className="text-xs text-slate-500">{objectives.length} actifs</span>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {objectives.slice(0, 3).map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => onTabChange('performance')}
                      className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                    >
                      <p className="font-medium text-slate-900 text-sm mb-2 line-clamp-1">{obj.title}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${obj.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{obj.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Accès rapide</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setShowLeaveForm(true)}
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition">
                <Calendar className="w-5 h-5 text-blue-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Demander un congé</span>
            </button>
            <button
              onClick={() => onTabChange('payslips')}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition group"
            >
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Bulletins de paie</span>
            </button>
            <button
              onClick={() => onTabChange('training')}
              className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition group"
            >
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition">
                <GraduationCap className="w-5 h-5 text-green-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Formations</span>
            </button>
            <button
              onClick={() => onTabChange('performance')}
              className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition group"
            >
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition">
                <Target className="w-5 h-5 text-purple-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Objectifs</span>
            </button>
            <button
              onClick={() => onTabChange('time-tracking')}
              className="flex flex-col items-center gap-2 p-4 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition group"
            >
              <div className="p-2 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition">
                <Clock className="w-5 h-5 text-cyan-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Pointage</span>
            </button>
            <button
              onClick={() => onTabChange('expenses')}
              className="flex flex-col items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition group"
            >
              <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition">
                <DollarSign className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Notes de frais</span>
            </button>
            <button
              onClick={() => onTabChange('org-chart')}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition group"
            >
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition">
                <Users className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Organigramme</span>
            </button>
            <button
              onClick={() => onTabChange('profile')}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition group"
            >
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition">
                <Info className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center">Mon profil</span>
            </button>
          </div>
        </div>
      </div>

      {stats.pendingExpenses > 0 && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Notes de frais en attente</h3>
                <p className="text-orange-100 text-sm">
                  Vous avez {stats.pendingExpenses} note{stats.pendingExpenses > 1 ? 's' : ''} de frais en attente de validation
                </p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('expenses')}
              className="bg-white text-orange-600 px-5 py-2 rounded-lg font-medium hover:bg-orange-50 transition"
            >
              Voir
            </button>
          </div>
        </div>
      )}

      {showLeaveForm && (
        <LeaveRequestForm
          onClose={() => setShowLeaveForm(false)}
          onSuccess={() => {
            setShowLeaveForm(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
