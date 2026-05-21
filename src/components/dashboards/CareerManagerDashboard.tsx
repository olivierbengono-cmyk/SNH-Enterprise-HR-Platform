import { useState, useEffect } from 'react';
import {
  TrendingUp, Award, AlertTriangle, Calendar, Users, Target,
  ArrowRight, Clock, CheckCircle, ChevronRight, Briefcase, Star
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CareerManagerDashboardProps {
  onNavigate?: (tab: string) => void;
}

interface CareerEvent {
  id: string;
  event_type: string;
  status: string;
  effective_date: string;
  employee: { first_name: string; last_name: string } | null;
  description?: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  promotion: 'Promotion',
  transfer: 'Transfert',
  suspension: 'Suspension',
  maternity_leave: 'Conge maternite',
  sick_leave: 'Conge maladie',
  disciplinary: 'Disciplinaire',
  retirement: 'Retraite',
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  promotion: 'bg-green-100 text-green-700',
  transfer: 'bg-blue-100 text-blue-700',
  suspension: 'bg-orange-100 text-orange-700',
  maternity_leave: 'bg-pink-100 text-pink-700',
  sick_leave: 'bg-yellow-100 text-yellow-700',
  disciplinary: 'bg-red-100 text-red-700',
  retirement: 'bg-slate-100 text-slate-700',
};

const EVENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-600',
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  completed: 'Complete',
  cancelled: 'Annule',
};

export default function CareerManagerDashboard({ onNavigate }: CareerManagerDashboardProps = {}) {
  const [stats, setStats] = useState({
    activeEmployees: 0,
    pendingPromotions: 0,
    activeSuspensions: 0,
    upcomingRetirements: 0,
    recentTransfers: 0,
    disciplinaryActions: 0,
  });
  const [recentEvents, setRecentEvents] = useState<CareerEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [employeesResult, allEventsResult, recentEventsResult] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact' }).eq('employment_status', 'active'),
        supabase.from('career_events').select('event_type, status'),
        supabase
          .from('career_events')
          .select('id, event_type, status, effective_date, description, employee:employees!career_events_employee_id_fkey(first_name, last_name)')
          .order('effective_date', { ascending: false })
          .limit(6),
      ]);

      const events = allEventsResult.data || [];
      const pendingPromotions = events.filter(e => e.event_type === 'promotion' && e.status === 'pending').length;
      const activeSuspensions = events.filter(e =>
        ['suspension', 'maternity_leave', 'sick_leave'].includes(e.event_type) && e.status === 'active'
      ).length;
      const recentTransfers = events.filter(e => e.event_type === 'transfer').length;
      const disciplinaryActions = events.filter(e => e.event_type === 'disciplinary').length;

      setRecentEvents((recentEventsResult.data || []) as unknown as CareerEvent[]);

      setStats({
        activeEmployees: employeesResult.count || 0,
        pendingPromotions,
        activeSuspensions,
        upcomingRetirements: 0,
        recentTransfers,
        disciplinaryActions,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Gestion des Carrieres</h1>
            <p className="text-slate-300">Evolution et developpement professionnel SNH</p>
          </div>
          <div className="text-right text-sm text-slate-400">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Employes actifs', value: stats.activeEmployees, icon: Users, route: 'employees' },
            { label: 'Promotions en attente', value: stats.pendingPromotions, icon: TrendingUp, route: 'performance-admin' },
            { label: 'Suspensions actives', value: stats.activeSuspensions, icon: AlertTriangle, route: 'disciplinary' },
            { label: 'Transferts recents', value: stats.recentTransfers, icon: ArrowRight, route: 'employees' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate?.(item.route)}
                className="bg-white/10 rounded-xl p-4 backdrop-blur-sm text-left hover:bg-white/20 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span className="text-xs text-slate-300">{item.label}</span>
                </div>
                <p className="text-2xl font-bold">{item.value}</p>
              </button>
            );
          })}
        </div>
      </div>

      {(stats.pendingPromotions > 0 || stats.activeSuspensions > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.pendingPromotions > 0 && (
            <button
              type="button"
              onClick={() => onNavigate?.('performance-admin')}
              className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition text-left"
            >
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {stats.pendingPromotions} promotion{stats.pendingPromotions > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-xs text-green-600 mt-0.5">Action requise</p>
              </div>
            </button>
          )}
          {stats.activeSuspensions > 0 && (
            <button
              type="button"
              onClick={() => onNavigate?.('disciplinary')}
              className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition text-left"
            >
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  {stats.activeSuspensions} suspension{stats.activeSuspensions > 1 ? 's' : ''} en cours
                </p>
                <p className="text-xs text-orange-600 mt-0.5">A suivre</p>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => onNavigate?.('performance-admin')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Taux de promotion</p>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {stats.activeEmployees > 0
              ? `${((stats.pendingPromotions / stats.activeEmployees) * 100).toFixed(1)}%`
              : '—'}
          </p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: stats.activeEmployees > 0 ? `${Math.min(100, (stats.pendingPromotions / stats.activeEmployees) * 100 * 10)}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.pendingPromotions} en attente</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('disciplinary')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-red-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Actions disciplinaires</p>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.disciplinaryActions}</p>
          <p className="text-xs text-slate-400 mt-2">au total</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('employees')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-slate-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Retraites prevues</p>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.upcomingRetirements}</p>
          <p className="text-xs text-slate-400 mt-2">cette annee</p>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">Evenements carriere recents</h2>
          </div>
          <button
            onClick={() => onNavigate?.('training-admin')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            Tout voir <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-5">
          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Aucun evenement recent</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onNavigate?.(event.event_type === 'disciplinary' ? 'disciplinary' : 'employees')}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {event.employee?.first_name?.[0]}{event.employee?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {event.employee?.first_name} {event.employee?.last_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_TYPE_STYLES[event.event_type] || 'bg-slate-100 text-slate-700'}`}>
                        {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(event.effective_date)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${EVENT_STATUS_STYLES[event.status] || 'bg-slate-100 text-slate-700'}`}>
                    {EVENT_STATUS_LABELS[event.status] || event.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Modules de gestion</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'events', name: 'Evenements', icon: Calendar, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', route: 'training-admin' },
            { id: 'promotions', name: 'Promotions', icon: TrendingUp, color: 'bg-green-50 text-green-600 hover:bg-green-100', route: 'training-admin' },
            { id: 'suspensions', name: 'Suspensions', icon: AlertTriangle, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100', route: 'employees' },
            { id: 'disciplinary', name: 'Disciplinaire', icon: AlertTriangle, color: 'bg-red-50 text-red-600 hover:bg-red-100', route: 'disciplinary' },
            { id: 'performance', name: 'Evaluations', icon: Target, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100', route: 'performance-admin' },
            { id: 'mobility', name: 'Mobilite', icon: ArrowRight, color: 'bg-slate-50 text-slate-600 hover:bg-slate-100', route: 'employees' },
          ].map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => onNavigate?.(module.route)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition ${module.color}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium text-center text-slate-900">{module.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
