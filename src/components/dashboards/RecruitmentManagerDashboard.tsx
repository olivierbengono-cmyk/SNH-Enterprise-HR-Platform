import { useState, useEffect } from 'react';
import {
  Users, Briefcase, Calendar, FileText, CheckCircle, Clock, UserPlus,
  TrendingUp, AlertCircle, Search, Star, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RecruitmentManagerDashboardProps {
  onNavigate?: (tab: string) => void;
}

interface RecentApplication {
  id: string;
  status: string;
  created_at: string;
  desired_position: string | null;
  candidate: { id: string; first_name: string; last_name: string } | null;
  job_opening: { title: string } | null;
}

interface JobOpening {
  id: string;
  title: string;
  status: string;
  department?: { name: string } | null;
  applications_count?: number;
}

const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  new: 'Soumise',
  reviewing: 'En examen',
  interview: 'Entretien',
  offer: 'Offre',
  integrated: 'Intégré(e)',
  rejected: 'Refusé(e)',
  withdrawn: 'Retirée',
};

const CANDIDATE_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-amber-100 text-amber-700',
  interview: 'bg-orange-100 text-orange-700',
  offer: 'bg-teal-100 text-teal-700',
  integrated: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

export default function RecruitmentManagerDashboard({ onNavigate }: RecruitmentManagerDashboardProps = {}) {
  const [stats, setStats] = useState({
    openPositions: 0,
    totalCandidates: 0,
    pendingInterviews: 0,
    offersExtended: 0,
    hiredThisMonth: 0,
    conversionRate: 0,
  });
  const [recentCandidates, setRecentCandidates] = useState<RecentApplication[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [jobsResult, candidatesResult, jobsDetailResult, recentCandidatesResult] = await Promise.all([
        supabase.from('job_openings').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('candidates').select('id', { count: 'exact' }),
        supabase
          .from('job_openings')
          .select('id, title, status, department:departments(name)')
          .eq('status', 'open')
          .limit(5),
        supabase
          .from('candidate_applications')
          .select('id, status, created_at, desired_position, candidate:candidates(id, first_name, last_name), job_opening:job_openings(title)')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: hiredCount } = await supabase
        .from('candidate_applications')
        .select('id', { count: 'exact' })
        .eq('status', 'integrated')
        .gte('created_at', thisMonth.toISOString());

      const { count: interviewCount } = await supabase
        .from('candidate_applications')
        .select('id', { count: 'exact' })
        .eq('status', 'interview');

      const totalCandidates = candidatesResult.count || 0;
      const hired = hiredCount || 0;
      const conversionRate = totalCandidates > 0 ? Math.round((hired / totalCandidates) * 100) : 0;

      setRecentCandidates((recentCandidatesResult.data || []) as unknown as RecentApplication[]);
      setActiveJobs((jobsDetailResult.data || []) as unknown as JobOpening[]);

      setStats({
        openPositions: jobsResult.count || 0,
        totalCandidates,
        pendingInterviews: interviewCount || 0,
        offersExtended: 0,
        hiredThisMonth: hired,
        conversionRate,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Gestion du Recrutement</h1>
            <p className="text-green-200">Acquisition et integration des talents SNH</p>
          </div>
          <div className="text-right text-sm text-green-300">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Postes ouverts', value: stats.openPositions, icon: Briefcase, route: 'recruitment' },
            { label: 'Candidats actifs', value: stats.totalCandidates, icon: Users, route: 'recruitment' },
            { label: 'Entretiens programmes', value: stats.pendingInterviews, icon: Calendar, route: 'recruitment' },
            { label: 'Embauches ce mois', value: stats.hiredThisMonth, icon: UserPlus, route: 'employees' },
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
                  <Icon className="w-4 h-4 text-green-200" />
                  <span className="text-xs text-green-200">{item.label}</span>
                </div>
                <p className="text-2xl font-bold">{item.value}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => onNavigate?.('analytics')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Taux de conversion</p>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.conversionRate}%</p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.conversionRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">candidats convertis en embauches</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('recruitment')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-orange-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Entretiens aujourd'hui</p>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.pendingInterviews}</p>
          <p className="text-xs text-slate-400 mt-2">programmes au total</p>
          {stats.pendingInterviews > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-orange-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              Action requise
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('recruitment')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Offres etendues</p>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.offersExtended}</p>
          <p className="text-xs text-slate-400 mt-2">en attente de reponse</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Dernieres candidatures</h2>
            </div>
            <button
              onClick={() => onNavigate?.('recruitment')}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              Tout voir <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {recentCandidates.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Aucune candidature recente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCandidates.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => onNavigate?.(`recruitment:app:${app.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {app.candidate?.first_name?.[0]}{app.candidate?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {app.candidate?.first_name} {app.candidate?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {app.job_opening?.title || app.desired_position || 'Candidature spontanée'} · {formatDate(app.created_at)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${CANDIDATE_STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-700'}`}>
                      {CANDIDATE_STATUS_LABELS[app.status] || app.status}
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
              <Briefcase className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Postes ouverts</h2>
            </div>
            <button
              onClick={() => onNavigate?.('recruitment')}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              Gerer <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {activeJobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Aucun poste ouvert</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => onNavigate?.(`recruitment:job:${job.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                      <p className="text-xs text-slate-500">{job.department?.name || 'Departement non specifie'}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full flex-shrink-0">
                      Ouvert
                    </span>
                  </button>
                ))}
                {stats.openPositions > 5 && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    +{stats.openPositions - 5} autres postes
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Acces rapide</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'jobs', name: "Offres d'emploi", icon: Briefcase, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', route: 'recruitment' },
            { id: 'candidates', name: 'Candidats', icon: Users, color: 'bg-green-50 text-green-600 hover:bg-green-100', route: 'recruitment' },
            { id: 'interviews', name: 'Entretiens', icon: Calendar, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100', route: 'recruitment' },
            { id: 'documents', name: 'Dossiers RH', icon: FileText, color: 'bg-slate-50 text-slate-600 hover:bg-slate-100', route: 'employees' },
            { id: 'onboarding', name: 'Integration', icon: UserPlus, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', route: 'recruitment' },
            { id: 'analytics', name: 'Statistiques', icon: TrendingUp, color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100', route: 'analytics' },
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
