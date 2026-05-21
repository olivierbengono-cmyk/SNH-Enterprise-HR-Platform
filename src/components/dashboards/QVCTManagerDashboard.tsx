import { useState, useEffect } from 'react';
import {
  Heart, Activity, Shield, AlertTriangle, TrendingUp, Users, Calendar, Award,
  ChevronRight, CheckCircle, Clock, MessageSquare, BarChart2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QVCTManagerDashboardProps {
  onNavigate?: (tab: string) => void;
}

interface QVCTIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  incident_date: string;
  reporter?: { first_name: string; last_name: string } | null;
}

interface QVCTSurvey {
  id: string;
  title: string;
  status: string;
  response_count?: number;
  target_count?: number;
}

interface QVCTEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Eleve',
  critical: 'Critique',
};

export default function QVCTManagerDashboard({ onNavigate }: QVCTManagerDashboardProps = {}) {
  const [stats, setStats] = useState({
    activeSurveys: 0,
    upcomingEvents: 0,
    activeIncidents: 0,
    benefitsEnrolled: 0,
    wellnessScore: 72,
    resolvedIncidents: 0,
  });
  const [recentIncidents, setRecentIncidents] = useState<QVCTIncident[]>([]);
  const [activeSurveys, setActiveSurveys] = useState<QVCTSurvey[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<QVCTEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [surveysResult, eventsResult, incidentsResult, resolvedResult, surveysDetailResult, incidentsDetailResult, eventsDetailResult] = await Promise.all([
        supabase.from('qvct_surveys').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('qvct_events').select('id', { count: 'exact' }).gte('event_date', today),
        supabase.from('qvct_health_incidents').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('qvct_health_incidents').select('id', { count: 'exact' }).eq('status', 'resolved'),
        supabase
          .from('qvct_surveys')
          .select('id, title, status')
          .eq('status', 'active')
          .limit(3),
        supabase
          .from('qvct_health_incidents')
          .select('id, title, severity, status, incident_date')
          .eq('status', 'open')
          .order('incident_date', { ascending: false })
          .limit(4),
        supabase
          .from('qvct_events')
          .select('id, title, event_date, event_type')
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(4),
      ]);

      setActiveSurveys((surveysDetailResult.data || []) as QVCTSurvey[]);
      setRecentIncidents((incidentsDetailResult.data || []) as unknown as QVCTIncident[]);
      setUpcomingEvents((eventsDetailResult.data || []) as unknown as QVCTEvent[]);

      setStats({
        activeSurveys: surveysResult.count || 0,
        upcomingEvents: eventsResult.count || 0,
        activeIncidents: incidentsResult.count || 0,
        benefitsEnrolled: 0,
        wellnessScore: 72,
        resolvedIncidents: resolvedResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const getWellnessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWellnessBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getWellnessLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Satisfaisant';
    return 'A ameliorer';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-600 to-teal-900 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Qualite de Vie au Travail</h1>
            <p className="text-teal-200">Bien-etre et securite des employes SNH</p>
          </div>
          <div className="text-right text-sm text-teal-300">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Enquetes actives', value: stats.activeSurveys, icon: Activity, route: 'qvct' },
            { label: 'Evenements a venir', value: stats.upcomingEvents, icon: Calendar, route: 'qvct' },
            { label: 'Incidents ouverts', value: stats.activeIncidents, icon: AlertTriangle, route: 'qvct' },
            { label: 'Score bien-etre', value: `${stats.wellnessScore}%`, icon: Heart, route: 'analytics' },
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
                  <Icon className="w-4 h-4 text-teal-200" />
                  <span className="text-xs text-teal-200">{item.label}</span>
                </div>
                <p className="text-2xl font-bold">{item.value}</p>
              </button>
            );
          })}
        </div>
      </div>

      {stats.activeIncidents > 0 && (
        <button
          type="button"
          onClick={() => onNavigate?.('qvct')}
          className="w-full flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition text-left"
        >
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {stats.activeIncidents} incident{stats.activeIncidents > 1 ? 's' : ''} sante ouvert{stats.activeIncidents > 1 ? 's' : ''} en attente de resolution
            </p>
            <p className="text-xs text-red-600 mt-0.5">Traitement requis</p>
          </div>
          <span className="text-xs font-bold text-red-700 bg-red-200 px-3 py-1 rounded-full">
            {stats.activeIncidents}
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => onNavigate?.('analytics')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-teal-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Score bien-etre global</p>
            <Heart className="w-4 h-4 text-red-400" />
          </div>
          <p className={`text-3xl font-bold ${getWellnessColor(stats.wellnessScore)}`}>
            {stats.wellnessScore}%
          </p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getWellnessBarColor(stats.wellnessScore)}`}
              style={{ width: `${stats.wellnessScore}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{getWellnessLabel(stats.wellnessScore)}</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('qvct')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Incidents resolus</p>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.resolvedIncidents}</p>
          <p className="text-xs text-slate-400 mt-2">
            {stats.resolvedIncidents + stats.activeIncidents > 0
              ? `${Math.round((stats.resolvedIncidents / (stats.resolvedIncidents + stats.activeIncidents)) * 100)}% taux de resolution`
              : 'aucun incident'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('qvct')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-amber-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Avantages sociaux</p>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.benefitsEnrolled}</p>
          <p className="text-xs text-slate-400 mt-2">inscriptions actives</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Incidents recents</h2>
            </div>
            {stats.activeIncidents > 0 && (
              <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                {stats.activeIncidents} ouverts
              </span>
            )}
          </div>
          <div className="p-5">
            {recentIncidents.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-10 h-10 text-green-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Aucun incident ouvert</p>
                <p className="text-xs text-slate-400 mt-1">Tout va bien !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => onNavigate?.('qvct')}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${SEVERITY_STYLES[incident.severity] || 'bg-slate-100'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{incident.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(incident.incident_date)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${SEVERITY_STYLES[incident.severity] || 'bg-slate-100 text-slate-700'}`}>
                      {SEVERITY_LABELS[incident.severity] || incident.severity}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-600" />
                <h2 className="text-base font-bold text-slate-900">Enquetes actives</h2>
              </div>
              <button
                onClick={() => onNavigate?.('qvct')}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-5">
              {activeSurveys.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Aucune enquete en cours</p>
              ) : (
                <div className="space-y-2">
                  {activeSurveys.map((survey) => (
                    <button
                      key={survey.id}
                      type="button"
                      onClick={() => onNavigate?.('qvct')}
                      className="w-full flex items-center gap-3 p-3 bg-teal-50 rounded-lg hover:bg-teal-100 transition text-left"
                    >
                      <Activity className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-slate-900 flex-1 truncate">{survey.title}</p>
                      <span className="text-xs font-medium px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full flex-shrink-0">
                        Active
                      </span>
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
                <h2 className="text-base font-bold text-slate-900">Prochains evenements</h2>
              </div>
            </div>
            <div className="p-5">
              {upcomingEvents.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Aucun evenement programme</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onNavigate?.('qvct')}
                      className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left"
                    >
                      <div className="p-1.5 bg-teal-100 rounded-lg flex-shrink-0">
                        <Calendar className="w-3 h-3 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(event.event_date)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Modules QVCT</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'surveys', name: 'Enquetes', icon: Activity, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { id: 'events', name: 'Evenements', icon: Calendar, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
            { id: 'benefits', name: 'Avantages', icon: Award, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
            { id: 'incidents', name: 'Incidents', icon: AlertTriangle, color: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { id: 'wellness', name: 'Bien-etre', icon: Heart, color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
            { id: 'safety', name: 'Securite', icon: Shield, color: 'bg-teal-50 text-teal-600 hover:bg-teal-100' },
          ].map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => onNavigate?.('qvct')}
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
