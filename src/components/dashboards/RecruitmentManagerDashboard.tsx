import { useState, useEffect } from 'react';
import {
  Users, Briefcase, Calendar, FileText, CheckCircle, Clock, UserPlus,
  TrendingUp, AlertCircle, Search, ChevronRight, X, ArrowRight,
  BarChart2, Target, Award, ClipboardList
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
  closing_date?: string | null;
  publication_date?: string | null;
  contract_type?: string | null;
  department?: { name: string } | null;
}

type PanelKey =
  | 'open-jobs'
  | 'interviews'
  | 'hired'
  | 'conversion'
  | 'interviews-today'
  | 'extended'
  | null;

const STATUS_LABELS: Record<string, string> = {
  new: 'Candidature',
  technical_tests: 'Tests techniques',
  interview: 'Entretien',
  psycho_tests: 'Tests psy.',
  medical_visit: 'Visite médicale',
  morality_inquiry: 'Enquête moralité',
  diploma_check: 'Auth. diplômes',
  trial: 'Engagement essai',
  assignment: 'Affectation',
  integrated: 'Titularisé(e)',
  rejected: 'Refusé(e)',
  withdrawn: 'Retiré(e)',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  technical_tests: 'bg-amber-100 text-amber-700',
  interview: 'bg-orange-100 text-orange-700',
  psycho_tests: 'bg-violet-100 text-violet-700',
  medical_visit: 'bg-teal-100 text-teal-700',
  morality_inquiry: 'bg-cyan-100 text-cyan-700',
  diploma_check: 'bg-indigo-100 text-indigo-700',
  trial: 'bg-lime-100 text-lime-700',
  assignment: 'bg-emerald-100 text-emerald-700',
  integrated: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

const PANEL_TITLES: Record<string, string> = {
  'open-jobs': 'Postes ouverts',
  'interviews': 'Entretiens programmés',
  'hired': 'Embauches ce mois',
  'conversion': 'Taux de conversion',
  'interviews-today': 'Entretiens aujourd\'hui',
  'extended': 'Offres avec date limite',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function RecruitmentManagerDashboard({ onNavigate }: RecruitmentManagerDashboardProps = {}) {
  const [stats, setStats] = useState({
    openPositions: 0,
    totalCandidates: 0,
    pendingInterviews: 0,
    offersExtended: 0,
    hiredThisMonth: 0,
    conversionRate: 0,
    totalHired: 0,
    pendingRequests: 0,
  });
  const [recentCandidates, setRecentCandidates] = useState<RecentApplication[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});

  // Panel state
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [panelData, setPanelData] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(); monthStart.setDate(1);

      const [jobsRes, candidatesRes, jobsDetailRes, recentRes] = await Promise.all([
        supabase.from('job_openings').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('candidates').select('id', { count: 'exact' }),
        supabase.from('job_openings')
          .select('id, title, status, closing_date, publication_date, contract_type, department:departments(name)')
          .eq('status', 'open').limit(5),
        supabase.from('candidate_applications')
          .select('id, status, created_at, desired_position, candidate:candidates(id, first_name, last_name), job_opening:job_openings(title)')
          .order('created_at', { ascending: false }).limit(8),
      ]);

      const [interviewRes, hiredRes, extendedRes, totalHiredRes, allAppsRes, pendingReqRes] = await Promise.all([
        supabase.from('candidate_applications').select('id', { count: 'exact' }).eq('status', 'interview'),
        supabase.from('candidate_applications').select('id', { count: 'exact' })
          .in('status', ['integrated', 'trial', 'assignment'])
          .gte('updated_at', monthStart.toISOString()),
        supabase.from('job_openings').select('id', { count: 'exact' })
          .eq('status', 'open').not('closing_date', 'is', null),
        supabase.from('candidate_applications').select('id', { count: 'exact' })
          .in('status', ['integrated', 'trial', 'assignment']),
        supabase.from('candidate_applications').select('status'),
        supabase.from('recruitment_requests').select('id', { count: 'exact' })
          .in('status', ['submitted', 'drh_review']),
      ]);

      // Build pipeline map
      const pipelineMap: Record<string, number> = {};
      (allAppsRes.data || []).forEach((a: any) => { pipelineMap[a.status] = (pipelineMap[a.status] || 0) + 1; });
      setPipeline(pipelineMap);

      const totalCandidates = candidatesRes.count || 0;
      const totalHired = totalHiredRes.count || 0;
      const conversionRate = totalCandidates > 0 ? Math.round((totalHired / totalCandidates) * 100) : 0;

      setRecentCandidates((recentRes.data || []) as unknown as RecentApplication[]);
      setActiveJobs((jobsDetailRes.data || []) as unknown as JobOpening[]);
      setStats({
        openPositions: jobsRes.count || 0,
        totalCandidates,
        pendingInterviews: interviewRes.count || 0,
        offersExtended: extendedRes.count || 0,
        hiredThisMonth: hiredRes.count || 0,
        conversionRate,
        totalHired,
        pendingRequests: pendingReqRes.count || 0,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = async (key: PanelKey) => {
    if (!key) return;
    setActivePanel(key);
    setPanelLoading(true);
    setPanelData([]);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(); monthStart.setDate(1);

      if (key === 'open-jobs') {
        const { data } = await supabase.from('job_openings')
          .select('id, title, status, closing_date, contract_type, department:departments(name)')
          .eq('status', 'open').order('publication_date', { ascending: false });
        setPanelData(data || []);

      } else if (key === 'interviews') {
        const { data } = await supabase.from('candidate_applications')
          .select('id, status, created_at, desired_position, candidate:candidates(id, first_name, last_name), job_opening:job_openings(title)')
          .eq('status', 'interview').order('created_at', { ascending: false });
        setPanelData(data || []);

      } else if (key === 'hired') {
        const { data } = await supabase.from('candidate_applications')
          .select('id, status, updated_at, desired_position, candidate:candidates(id, first_name, last_name), job_opening:job_openings(title)')
          .in('status', ['integrated', 'trial', 'assignment'])
          .gte('updated_at', monthStart.toISOString())
          .order('updated_at', { ascending: false });
        setPanelData(data || []);

      } else if (key === 'conversion') {
        // Load full pipeline breakdown
        const { data } = await supabase.from('candidate_applications')
          .select('status');
        setPanelData(data || []);

      } else if (key === 'interviews-today') {
        const { data } = await supabase.from('candidate_applications')
          .select('id, status, created_at, desired_position, candidate:candidates(id, first_name, last_name), job_opening:job_openings(title)')
          .eq('status', 'interview').order('created_at', { ascending: false });
        setPanelData(data || []);

      } else if (key === 'extended') {
        const { data } = await supabase.from('job_openings')
          .select('id, title, status, closing_date, contract_type, department:departments(name)')
          .eq('status', 'open').not('closing_date', 'is', null)
          .order('closing_date', { ascending: true });
        setPanelData(data || []);
      }
    } catch (err) {
      console.error('Panel load error:', err);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setActivePanel(null);
    setPanelData([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const renderPanelContent = () => {
    if (panelLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      );
    }

    if (activePanel === 'conversion') {
      const total = panelData.length;
      const byStatus: Record<string, number> = {};
      panelData.forEach((a: any) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
      const hired = (byStatus['integrated'] || 0) + (byStatus['trial'] || 0) + (byStatus['assignment'] || 0);
      const rate = total > 0 ? Math.round((hired / stats.totalCandidates) * 100) : 0;

      const stagesOrder = ['new', 'technical_tests', 'interview', 'psycho_tests', 'medical_visit', 'morality_inquiry', 'diploma_check', 'trial', 'assignment', 'integrated', 'rejected', 'withdrawn'];
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Candidats total</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalCandidates}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Embauches totales</p>
              <p className="text-3xl font-bold text-emerald-700">{stats.totalHired}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
              <p className="text-xs text-slate-500 mb-1">Taux de conversion</p>
              <p className="text-3xl font-bold text-green-700">{rate}%</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-4 rounded-full transition-all"
              style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 mb-3">Répartition par étape du pipeline</p>
            {stagesOrder.map(s => {
              const count = byStatus[s] || 0;
              if (!count) return null;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-32 text-center ${STATUS_STYLES[s] || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABELS[s] || s}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-slate-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (activePanel === 'open-jobs' || activePanel === 'extended') {
      if (!panelData.length) {
        return <p className="text-center text-slate-500 py-12 text-sm">Aucun poste à afficher</p>;
      }
      const today = new Date().toISOString().split('T')[0];
      return (
        <div className="space-y-2">
          {panelData.map((job: any) => {
            const isExpired = job.closing_date && job.closing_date < today;
            return (
              <button key={job.id} type="button"
                onClick={() => { closePanel(); onNavigate?.(`recruitment:job:${job.id}`); }}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left group">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate group-hover:text-green-700">{job.title}</p>
                  <p className="text-xs text-slate-500">
                    {job.department?.name || 'Département non spécifié'}
                    {job.closing_date && (
                      <span className={`ml-2 ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                        · Clôture : {fmtDate(job.closing_date)}{isExpired ? ' (expirée)' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full flex-shrink-0">Ouvert</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-green-600 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      );
    }

    // Application list panels: interviews, hired, interviews-today
    if (!panelData.length) {
      return <p className="text-center text-slate-500 py-12 text-sm">Aucune candidature à afficher</p>;
    }
    return (
      <div className="space-y-2">
        {panelData.map((app: any) => (
          <button key={app.id} type="button"
            onClick={() => { closePanel(); onNavigate?.(`recruitment:app:${app.id}`); }}
            className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left group">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {app.candidate?.first_name?.[0]}{app.candidate?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-green-700">
                {app.candidate?.first_name} {app.candidate?.last_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {app.job_opening?.title || app.desired_position || 'Candidature spontanée'}
                {app.updated_at && ` · ${fmtShort(app.updated_at)}`}
                {!app.updated_at && app.created_at && ` · ${fmtShort(app.created_at)}`}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-700'}`}>
              {STATUS_LABELS[app.status] || app.status}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-green-600 flex-shrink-0" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Panel overlay ─────────────────────────────────── */}
      {activePanel && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                {activePanel === 'open-jobs' && <Briefcase className="w-4 h-4 text-green-600" />}
                {activePanel === 'interviews' && <Calendar className="w-4 h-4 text-orange-500" />}
                {activePanel === 'hired' && <UserPlus className="w-4 h-4 text-emerald-600" />}
                {activePanel === 'conversion' && <TrendingUp className="w-4 h-4 text-green-600" />}
                {activePanel === 'interviews-today' && <Clock className="w-4 h-4 text-orange-500" />}
                {activePanel === 'extended' && <FileText className="w-4 h-4 text-blue-500" />}
                <h2 className="font-bold text-slate-900">{PANEL_TITLES[activePanel]}</h2>
                {!panelLoading && activePanel !== 'conversion' && (
                  <span className="text-xs text-slate-400 font-medium ml-1">({panelData.length})</span>
                )}
              </div>
              <button onClick={closePanel}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-5">
              {renderPanelContent()}
            </div>
            {/* Panel footer action (for job/candidate lists) */}
            {!panelLoading && activePanel !== 'conversion' && panelData.length > 0 && (
              <div className="flex-shrink-0 border-t border-slate-200 p-4">
                <button
                  onClick={() => { closePanel(); onNavigate?.('recruitment'); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
                  Voir dans Offres & Candidats <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
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
            { label: 'Postes ouverts',       value: stats.openPositions,    icon: Briefcase, panel: 'open-jobs' as PanelKey },
            { label: 'Candidats actifs',     value: stats.totalCandidates,  icon: Users,     panel: null,          route: 'cvtheque' },
            { label: 'Entretiens programmés',value: stats.pendingInterviews,icon: Calendar,  panel: 'interviews' as PanelKey },
            { label: 'Embauches ce mois',    value: stats.hiredThisMonth,   icon: UserPlus,  panel: 'hired' as PanelKey },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button"
                onClick={() => item.panel ? openPanel(item.panel) : onNavigate?.(item.route!)}
                className="bg-white/10 rounded-xl p-4 backdrop-blur-sm text-left hover:bg-white/20 transition">
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

      {/* ── Metric cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <button type="button" onClick={() => openPanel('conversion')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-green-300 transition text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Taux de conversion</p>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.conversionRate}%</p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.conversionRate}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">candidats convertis</p>
        </button>

        <button type="button" onClick={() => openPanel('interviews-today')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-orange-300 transition text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Entretiens programmés</p>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.pendingInterviews}</p>
          <p className="text-xs text-slate-400 mt-2">en attente</p>
          {stats.pendingInterviews > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-orange-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              Action requise
            </div>
          )}
        </button>

        <button type="button" onClick={() => openPanel('extended')}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Offres avec clôture</p>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.offersExtended}</p>
          <p className="text-xs text-slate-400 mt-2">date limite définie</p>
        </button>

        <button type="button" onClick={() => onNavigate?.('recruitment-requests')}
          className={`bg-white rounded-xl p-5 border hover:shadow-lg transition text-left ${
            stats.pendingRequests > 0 ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200 hover:border-slate-300'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">Demandes en attente</p>
            <ClipboardList className={`w-4 h-4 ${stats.pendingRequests > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-3xl font-bold ${stats.pendingRequests > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {stats.pendingRequests}
          </p>
          <p className="text-xs text-slate-400 mt-2">demandes NS193 soumises</p>
          {stats.pendingRequests > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              A traiter
            </div>
          )}
        </button>
      </div>

      {/* ── Pipeline funnel ─────────────────────────────────── */}
      {Object.keys(pipeline).length > 0 && (() => {
        const FUNNEL_STEPS = ['new', 'technical_tests', 'interview', 'psycho_tests', 'medical_visit', 'morality_inquiry', 'diploma_check', 'trial', 'assignment', 'integrated'];
        const maxCount = Math.max(...FUNNEL_STEPS.map(s => pipeline[s] || 0), 1);
        const rejected = (pipeline['rejected'] || 0) + (pipeline['withdrawn'] || 0);
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-slate-500" />
                <h2 className="text-base font-bold text-slate-900">Pipeline de recrutement</h2>
              </div>
              {rejected > 0 && (
                <span className="text-xs text-slate-400">{rejected} refusé(s) / retiré(s)</span>
              )}
            </div>
            <div className="space-y-2">
              {FUNNEL_STEPS.map((step, i) => {
                const count = pipeline[step] || 0;
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const colors = [
                  'bg-blue-400', 'bg-amber-400', 'bg-orange-400',
                  'bg-teal-400', 'bg-cyan-400', 'bg-emerald-500',
                ];
                const textColors = [
                  'text-blue-700', 'text-amber-700', 'text-orange-700',
                  'text-teal-700', 'text-cyan-700', 'text-emerald-700',
                ];
                return (
                  <div key={step} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-28 flex-shrink-0 text-right">{STATUS_LABELS[step]}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={`h-5 rounded-full ${colors[i]} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-6 text-right ${count > 0 ? textColors[i] : 'text-slate-300'}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Lists ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières candidatures */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Dernieres candidatures</h2>
            </div>
            <button onClick={() => onNavigate?.('cvtheque')}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
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
                  <button key={app.id} type="button"
                    onClick={() => onNavigate?.(`recruitment:app:${app.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left">
                    <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {app.candidate?.first_name?.[0]}{app.candidate?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {app.candidate?.first_name} {app.candidate?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {app.job_opening?.title || app.desired_position || 'Candidature spontanée'} · {fmtShort(app.created_at)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Postes ouverts */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Postes ouverts</h2>
            </div>
            <button onClick={() => onNavigate?.('recruitment')}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
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
                  <button key={job.id} type="button"
                    onClick={() => onNavigate?.(`recruitment:job:${job.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-left">
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

    </div>
  );
}
