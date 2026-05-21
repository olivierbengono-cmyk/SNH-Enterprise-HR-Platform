import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Search, X, Eye, Star, Trash2, Briefcase, MapPin,
  Mail, Phone, Linkedin, Globe, Calendar, GraduationCap, Zap,
  FileText, CheckCircle, Clock, UserCheck, XCircle, MessageSquare,
  TrendingUp, Download, ChevronRight, AlertCircle, Sparkles,
  ChevronDown, ChevronUp, Building2, RefreshCw, ArrowRight,
  ClipboardList, UserPlus, Award, Send, History
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Candidate {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; location: string | null; linkedin_url: string | null;
  portfolio_url: string | null; summary: string | null; desired_position: string | null;
  desired_salary_min: number | null; desired_salary_max: number | null;
  availability_date: string | null; mobility: string | null; status: string;
  source: string; created_at: string; profile_completed: boolean;
  candidate_applications?: Application[]; candidate_experiences?: Experience[];
  candidate_educations?: Education[]; candidate_candidate_skills?: CandSkill[];
  candidate_documents?: CandDoc[];
}
interface Application {
  id: string; desired_position: string | null; cover_letter: string | null;
  status: string; rejection_reason: string | null; internal_notes: string | null;
  interview_date: string | null; rating: number | null; created_at: string;
  offer_date: string | null; offer_salary: number | null; offer_contract_type: string | null;
  offer_start_date: string | null; trial_period_months: number | null; trial_end_date: string | null;
  hiring_decision_date: string | null; hiring_manager_notes: string | null;
  hired_as_employee_id: string | null; onboarding_checklist: OnboardingItem[];
  job_opening?: { id: string; title: string } | null;
}
interface OnboardingItem { id: string; label: string; done: boolean; }
interface Experience { id: string; job_title: string; company: string; location: string | null; start_date: string; end_date: string | null; is_current: boolean; description: string | null; }
interface Education { id: string; degree: string; field_of_study: string | null; institution: string; end_date: string | null; grade: string | null; }
interface CandSkill { id: string; name: string; category: string; level: string; }
interface CandDoc { id: string; type: string; file_name: string; file_url: string; file_size: number | null; }
interface JobOpening { id: string; title: string; reference: string; contract_type: string; location: string; status: string; publication_date: string; closing_date: string; required_skills: string[]; nice_to_have_skills: string[]; min_experience_years: number; }
interface JobMatch {
  id: string; candidate_id: string; job_opening_id: string; match_score: number;
  skill_match_score: number; experience_match_score: number; education_match_score: number;
  matched_skills: string[]; missing_skills: string[]; ai_summary: string | null; computed_at: string;
  candidate?: Candidate;
}
interface PipelineEvent { id: string; from_status: string | null; to_status: string; notes: string | null; created_at: string; }

// ── Pipeline stages ────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { value: 'new',            label: 'Candidature',    color: 'bg-blue-100 text-blue-800',    border: 'border-blue-300',    dot: 'bg-blue-500',    icon: FileText },
  { value: 'reviewing',      label: 'Présélection',   color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-300',  dot: 'bg-yellow-500',  icon: Eye },
  { value: 'interview',      label: 'Entretien',      color: 'bg-orange-100 text-orange-800', border: 'border-orange-300',  dot: 'bg-orange-500',  icon: Calendar },
  { value: 'offer',          label: 'Offre',          color: 'bg-teal-100 text-teal-800',    border: 'border-teal-300',    dot: 'bg-teal-500',    icon: Send },
  { value: 'pre_onboarding', label: 'Pré-intégration',color: 'bg-cyan-100 text-cyan-800',    border: 'border-cyan-300',    dot: 'bg-cyan-500',    icon: ClipboardList },
  { value: 'onboarding',     label: 'Intégration',    color: 'bg-green-100 text-green-800',  border: 'border-green-300',   dot: 'bg-green-500',   icon: UserPlus },
  { value: 'integrated',     label: 'Intégré(e)',     color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-600', icon: Award },
];
const REJECTED_STAGES = [
  { value: 'rejected',  label: 'Refusé(e)', color: 'bg-red-100 text-red-800',     icon: XCircle },
  { value: 'withdrawn', label: 'Retiré(e)', color: 'bg-slate-100 text-slate-600', icon: X },
];
const ALL_STATUSES = [...PIPELINE_STAGES, ...REJECTED_STAGES];

const STAGE_ORDER = PIPELINE_STAGES.map(s => s.value);

const DEFAULT_CHECKLIST: OnboardingItem[] = [
  { id: '1', label: 'Contrat signé', done: false },
  { id: '2', label: 'Badge et accès créés', done: false },
  { id: '3', label: 'Poste de travail configuré', done: false },
  { id: '4', label: 'Présentation à l\'équipe', done: false },
  { id: '5', label: 'Formation sécurité', done: false },
  { id: '6', label: 'Accès SI accordés', done: false },
  { id: '7', label: 'Visite médicale', done: false },
  { id: '8', label: 'Dossier administratif complet', done: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-slate-100 text-slate-600', intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-orange-100 text-orange-700', expert: 'bg-green-100 text-green-700',
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', expert: 'Expert',
};
const CAT_LABELS: Record<string, string> = {
  technical: 'Technique', soft: 'Savoir-être', language: 'Langue', certification: 'Certification', other: 'Autre',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function getStageInfo(value: string) {
  return ALL_STATUSES.find(s => s.value === value) || ALL_STATUSES[0];
}

function StatusBadge({ status }: { status: string }) {
  const s = getStageInfo(status);
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      <Icon size={11} />{s.label}
    </span>
  );
}
function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)} className={onChange ? 'cursor-pointer' : 'cursor-default'}>
          <Star size={15} className={i <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
type MainView = 'candidates' | 'by-job';

export default function CandidateManagement() {
  const [mainView, setMainView] = useState<MainView>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showPortalInfo, setShowPortalInfo] = useState(false);
  const [computingMatch, setComputingMatch] = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (selectedJob) loadJobMatches(selectedJob.id); }, [selectedJob]);

  const loadAll = async () => {
    setLoading(true);
    const [candRes, jobRes] = await Promise.all([
      supabase.from('candidates').select(`
        *,
        candidate_applications(*,job_opening:job_openings(id,title)),
        candidate_experiences(*),
        candidate_educations(*),
        candidate_candidate_skills(*),
        candidate_documents(*)
      `).order('created_at', { ascending: false }),
      supabase.from('job_openings').select('*').eq('status', 'open').order('publication_date', { ascending: false }),
    ]);
    if (candRes.data) setCandidates(candRes.data as Candidate[]);
    if (jobRes.data) {
      setJobs(jobRes.data as JobOpening[]);
      if (!selectedJob && jobRes.data.length > 0) setSelectedJob(jobRes.data[0] as JobOpening);
    }
    setLoading(false);
  };

  const loadJobMatches = async (jobId: string) => {
    const { data } = await supabase
      .from('candidate_job_matches')
      .select('*, candidate:candidates(*,candidate_candidate_skills(*),candidate_experiences(*),candidate_educations(*))')
      .eq('job_opening_id', jobId)
      .order('match_score', { ascending: false });
    if (data) setJobMatches(data as unknown as JobMatch[]);
  };

  const computeAndSaveMatch = async (candidateId: string, job: JobOpening) => {
    const cand = candidates.find(c => c.id === candidateId);
    if (!cand) return;
    const candSkills = (cand.candidate_candidate_skills || []).map(s => s.name.toLowerCase());
    const required = (job.required_skills || []).map(s => s.toLowerCase());
    const niceToHave = (job.nice_to_have_skills || []).map(s => s.toLowerCase());
    const matchedReq = required.filter(r => candSkills.some(s => s.includes(r) || r.includes(s)));
    const matchedNth = niceToHave.filter(r => candSkills.some(s => s.includes(r) || r.includes(s)));
    const missingReq = required.filter(r => !candSkills.some(s => s.includes(r) || r.includes(s)));
    const skillScore = required.length > 0
      ? Math.round(((matchedReq.length / required.length) * 0.8 + (matchedNth.length / Math.max(niceToHave.length, 1)) * 0.2) * 100)
      : 50;
    const expYears = (cand.candidate_experiences || []).reduce((acc, e) => {
      const start = new Date(e.start_date).getFullYear();
      const end = e.is_current ? new Date().getFullYear() : (e.end_date ? new Date(e.end_date).getFullYear() : start);
      return acc + (end - start);
    }, 0);
    const expScore = Math.min(100, Math.round((expYears / Math.max(job.min_experience_years, 1)) * 100));
    const hasMaster = (cand.candidate_educations || []).some(e => e.degree.toLowerCase().includes('master') || e.degree.toLowerCase().includes('mastère'));
    const eduScore = hasMaster ? 90 : 65;
    const overall = Math.round(skillScore * 0.6 + expScore * 0.25 + eduScore * 0.15);
    const matchedDisplay = [...new Set([...matchedReq, ...matchedNth].map(s => job.required_skills.find(r => r.toLowerCase() === s) || s))];
    const missingDisplay = missingReq.map(s => job.required_skills.find(r => r.toLowerCase() === s) || s);
    const summary = overall >= 80
      ? `Profil fortement recommandé. Maîtrise de ${matchedDisplay.length}/${required.length} compétences requises${missingDisplay.length === 0 ? ' sans lacune majeure' : `, avec ${missingDisplay.length} compétence(s) à développer`}.`
      : overall >= 60
      ? `Profil partiellement adéquat. Maîtrise de ${matchedDisplay.length}/${required.length} compétences. Lacunes à combler : ${missingDisplay.slice(0, 3).join(', ')}.`
      : `Adéquation limitée. Seulement ${matchedDisplay.length}/${required.length} compétences requises présentes.`;
    await supabase.from('candidate_job_matches').upsert({
      candidate_id: candidateId, job_opening_id: job.id,
      match_score: overall, skill_match_score: skillScore,
      experience_match_score: Math.min(100, expScore), education_match_score: eduScore,
      matched_skills: matchedDisplay, missing_skills: missingDisplay, ai_summary: summary,
    }, { onConflict: 'candidate_id,job_opening_id' });
    await loadJobMatches(job.id);
  };

  const computeAllMatchesForJob = async () => {
    if (!selectedJob) return;
    setComputingMatch(true);
    for (const c of candidates) await computeAndSaveMatch(c.id, selectedJob);
    setComputingMatch(false);
  };

  const openCandidate = (c: Candidate) => setSelectedCandidate(c);

  const refreshCandidate = async (id: string) => {
    const { data } = await supabase.from('candidates').select(`
      *,
      candidate_applications(*,job_opening:job_openings(id,title)),
      candidate_experiences(*), candidate_educations(*),
      candidate_candidate_skills(*), candidate_documents(*)
    `).eq('id', id).maybeSingle();
    if (data) {
      setSelectedCandidate(data as Candidate);
      setCandidates(prev => prev.map(c => c.id === id ? data as Candidate : c));
    }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm('Supprimer définitivement ce candidat ?')) return;
    await supabase.from('candidates').delete().eq('id', id);
    setSelectedCandidate(null);
    await loadAll();
  };

  const downloadDoc = async (doc: CandDoc) => {
    const { data } = await supabase.storage.from('candidate-documents').download(doc.file_url);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = doc.file_name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const portalUrl = `${window.location.origin}?view=candidature`;

  const filteredCandidates = candidates.filter(c => {
    const txt = `${c.first_name} ${c.last_name} ${c.email} ${c.desired_position || ''}`.toLowerCase();
    const appStatus = c.candidate_applications?.[0]?.status || 'new';
    return (!search || txt.includes(search.toLowerCase())) && (filterStatus === 'all' || appStatus === filterStatus);
  });

  const stats = {
    total: candidates.length,
    active: candidates.filter(c => {
      const s = c.candidate_applications?.[0]?.status;
      return s && !['rejected', 'withdrawn', 'integrated'].includes(s);
    }).length,
    offer: candidates.filter(c => ['offer', 'pre_onboarding', 'onboarding'].includes(c.candidate_applications?.[0]?.status || '')).length,
    integrated: candidates.filter(c => c.candidate_applications?.[0]?.status === 'integrated').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CVthèque & Recrutement</h1>
          <p className="text-slate-500 text-sm mt-1">Suivi complet du candidat jusqu'à son intégration</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPortalInfo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-medium">
            <Globe size={15} /> Portail candidats
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: Users },
          { label: 'En cours', value: stats.active, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', icon: Clock },
          { label: 'Offre / Intégration', value: stats.offer, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-100', icon: Send },
          { label: 'Intégrés', value: stats.integrated, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', icon: Award },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">{s.label}</p>
                <Icon size={14} className={s.color} />
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setMainView('candidates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainView === 'candidates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Users size={15} /> Tous les candidats
        </button>
        <button onClick={() => setMainView('by-job')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainView === 'by-job' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Sparkles size={15} /> Adéquation IA par offre
        </button>
      </div>

      {/* ── VIEW: All candidates ── */}
      {mainView === 'candidates' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white">
              <option value="all">Tous les statuts</option>
              <optgroup label="En cours">
                {PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </optgroup>
              <optgroup label="Clôturés">
                {REJECTED_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </optgroup>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" /></div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
              <Users size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Aucun candidat trouvé</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Candidat</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Poste visé</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Étape</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Note</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCandidates.map(c => {
                      const app = c.candidate_applications?.[0];
                      const stageIdx = STAGE_ORDER.indexOf(app?.status || 'new');
                      const progress = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => openCandidate(c)}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {c.first_name[0]}{c.last_name[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{c.first_name} {c.last_name}</p>
                                <p className="text-xs text-slate-500">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <p className="text-sm text-slate-700">{c.desired_position || app?.job_opening?.title || '—'}</p>
                            {c.location && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{c.location}</p>}
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            {stageIdx >= 0 && (
                              <div className="w-32">
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Étape {stageIdx + 1}/{STAGE_ORDER.length}</p>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4"><StatusBadge status={app?.status || 'new'} /></td>
                          <td className="py-3 px-4 hidden md:table-cell"><StarRating value={app?.rating || null} /></td>
                          <td className="py-3 px-4"><ChevronRight size={15} className="text-slate-400" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VIEW: IA matching ── */}
      {mainView === 'by-job' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Offres ouvertes</p>
            {jobs.map(job => (
              <button key={job.id} onClick={() => setSelectedJob(job)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedJob?.id === job.id ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                <p className="font-semibold text-sm leading-tight">{job.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={10} />{job.location}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3">
            {selectedJob && (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedJob.title}</h3>
                    <p className="text-sm text-slate-500">{selectedJob.reference} · {selectedJob.location} · {selectedJob.contract_type}</p>
                    {selectedJob.required_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedJob.required_skills.map(s => <span key={s} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border">{s}</span>)}
                      </div>
                    )}
                  </div>
                  <button onClick={computeAllMatchesForJob} disabled={computingMatch}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 text-sm font-medium transition disabled:opacity-60">
                    {computingMatch ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={15} />}
                    Calculer l'adéquation IA
                  </button>
                </div>
                {jobMatches.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
                    <Sparkles size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Aucun score calculé</p>
                    <p className="text-slate-400 text-sm mt-1">Cliquez sur "Calculer l'adéquation IA" pour analyser tous les candidats</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobMatches.map(match => {
                      const cand = match.candidate;
                      if (!cand) return null;
                      return (
                        <MatchCard key={match.id} match={match} candidate={cand}
                          onViewCandidate={() => { setMainView('candidates'); openCandidate(cand); }} />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Candidate detail modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onRefresh={refreshCandidate}
          onDelete={deleteCandidate}
          onDownloadDoc={downloadDoc}
        />
      )}

      {/* Portal info modal */}
      {showPortalInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Portail candidats</h3>
              <button onClick={() => setShowPortalInfo(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-teal-700 uppercase mb-2">Lien public</p>
                <p className="font-mono text-sm text-teal-900 break-all">{portalUrl}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-600" /> Inscription avec email / mot de passe</p>
                <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-600" /> Dashboard personnalisé avec offres recommandées par IA</p>
                <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-600" /> Score d'adéquation en temps réel</p>
                <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-600" /> Profil modifiable à tout moment</p>
              </div>
              <button onClick={() => window.open(portalUrl, '_blank', 'noopener,noreferrer')}
                className="w-full py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-medium">
                Ouvrir le portail candidats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────────────────
function MatchCard({ match, candidate, onViewCandidate }: { match: JobMatch; candidate: Candidate; onViewCandidate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const score = match.match_score;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ea580c' : '#dc2626';
  const bgClass = score >= 80 ? 'border-green-200 bg-green-50/30' : score >= 60 ? 'border-orange-200 bg-orange-50/30' : 'border-red-100 bg-red-50/20';
  return (
    <div className={`rounded-2xl border overflow-hidden ${bgClass}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
                  strokeDasharray={`${score} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black" style={{ color }}>{score}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Match</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-bold text-slate-900">{candidate.first_name} {candidate.last_name}</p>
                <p className="text-sm text-slate-500">{candidate.desired_position || candidate.email}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-white transition">
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Analyse IA
                </button>
                <button onClick={onViewCandidate}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition">
                  <Eye size={12} /> Voir profil
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-3 flex-wrap">
              {[
                { label: 'Compétences', value: match.skill_match_score },
                { label: 'Expérience', value: match.experience_match_score },
                { label: 'Formation', value: match.education_match_score },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className="text-xs font-bold" style={{ color: s.value >= 80 ? '#16a34a' : s.value >= 60 ? '#ea580c' : '#dc2626' }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            {match.ai_summary && (
              <div className="flex gap-2 bg-white/60 rounded-xl p-3">
                <Sparkles size={14} className="text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 leading-relaxed">{match.ai_summary}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {match.matched_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1.5 flex items-center gap-1"><CheckCircle size={10} />Matchées</p>
                  <div className="flex flex-wrap gap-1">
                    {match.matched_skills.map(s => <span key={s} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">{s}</span>)}
                  </div>
                </div>
              )}
              {match.missing_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase mb-1.5 flex items-center gap-1"><X size={10} />Manquantes</p>
                  <div className="flex flex-wrap gap-1">
                    {match.missing_skills.map(s => <span key={s} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Candidate Detail Modal ────────────────────────────────────────────────
function CandidateDetailModal({ candidate: c, onClose, onRefresh, onDelete, onDownloadDoc }: {
  candidate: Candidate; onClose: () => void;
  onRefresh: (id: string) => Promise<void>;
  onDelete: (id: string) => void; onDownloadDoc: (doc: CandDoc) => void;
}) {
  type Tab = 'profile' | 'experiences' | 'education' | 'skills' | 'documents' | 'pipeline' | 'onboarding';
  const [tab, setTab] = useState<Tab>('pipeline');
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);

  const app = c.candidate_applications?.[0];
  const currentStageIdx = STAGE_ORDER.indexOf(app?.status || 'new');

  useEffect(() => {
    setNoteText(app?.internal_notes || '');
    if (app) loadPipelineEvents(app.id);
  }, [c.id, app?.id]);

  const loadPipelineEvents = async (appId: string) => {
    const { data } = await supabase
      .from('hiring_pipeline_events')
      .select('*')
      .eq('application_id', appId)
      .order('created_at', { ascending: false });
    if (data) setPipelineEvents(data as PipelineEvent[]);
  };

  const moveToStage = async (newStatus: string) => {
    if (!app) return;
    setSaving(true);
    const from = app.status;
    await supabase.from('candidate_applications').update({ status: newStatus }).eq('id', app.id);
    await supabase.from('hiring_pipeline_events').insert({
      candidate_id: c.id, application_id: app.id,
      from_status: from, to_status: newStatus,
      notes: `Passage de "${getStageInfo(from).label}" à "${getStageInfo(newStatus).label}"`,
    });
    if (newStatus === 'pre_onboarding' && (!app.onboarding_checklist || app.onboarding_checklist.length === 0)) {
      await supabase.from('candidate_applications').update({ onboarding_checklist: DEFAULT_CHECKLIST }).eq('id', app.id);
    }
    await onRefresh(c.id);
    if (app) await loadPipelineEvents(app.id);
    setSaving(false);
  };

  const saveNote = async () => {
    if (!app) return;
    setSaving(true);
    await supabase.from('candidate_applications').update({ internal_notes: noteText }).eq('id', app.id);
    await supabase.from('hiring_pipeline_events').insert({
      candidate_id: c.id, application_id: app.id,
      from_status: app.status, to_status: app.status,
      notes: `Note RH ajoutée`,
    });
    setSaving(false);
    await onRefresh(c.id);
    if (app) await loadPipelineEvents(app.id);
  };

  const updateRating = async (rating: number) => {
    if (!app) return;
    await supabase.from('candidate_applications').update({ rating }).eq('id', app.id);
    await onRefresh(c.id);
  };

  const toggleChecklist = async (itemId: string) => {
    if (!app) return;
    const list = (app.onboarding_checklist || []).map((item: OnboardingItem) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await supabase.from('candidate_applications').update({ onboarding_checklist: list }).eq('id', app.id);
    await onRefresh(c.id);
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'pipeline', label: 'Suivi pipeline', icon: TrendingUp },
    { id: 'onboarding', label: 'Intégration', icon: ClipboardList },
    { id: 'profile', label: 'Profil', icon: Users },
    { id: 'experiences', label: 'Expériences', icon: Briefcase },
    { id: 'education', label: 'Formations', icon: GraduationCap },
    { id: 'skills', label: 'Compétences', icon: Zap },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-4 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-teal-800 rounded-t-2xl p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {c.first_name[0]}{c.last_name[0]}
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">{c.first_name} {c.last_name}</h2>
              <p className="text-white/70 text-sm">{c.desired_position || app?.job_opening?.title || 'Candidat'}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-white/50 text-xs flex items-center gap-1"><Mail size={10} />{c.email}</span>
                {c.location && <span className="text-white/50 text-xs flex items-center gap-1"><MapPin size={10} />{c.location}</span>}
                {app && <span className="ml-2"><StatusBadge status={app.status} /></span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={22} /></button>
        </div>

        {/* Visual pipeline stepper */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isActive = app?.status === stage.value;
              const isPast = currentStageIdx > idx;
              const isRejected = app?.status === 'rejected' || app?.status === 'withdrawn';
              const Icon = stage.icon;
              return (
                <div key={stage.value} className="flex items-center">
                  <button
                    onClick={() => !saving && moveToStage(stage.value)}
                    disabled={saving}
                    title={stage.label}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all group relative ${
                      isActive ? 'bg-teal-700 text-white shadow-md' :
                      isPast && !isRejected ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' :
                      isRejected && idx <= currentStageIdx ? 'opacity-40 cursor-not-allowed' :
                      'bg-white border border-slate-200 text-slate-400 hover:border-teal-300 hover:text-teal-600'
                    }`}>
                    <Icon size={16} />
                    <span className="text-xs font-medium whitespace-nowrap">{stage.label}</span>
                    {isPast && !isRejected && !isActive && (
                      <CheckCircle size={10} className="absolute -top-1 -right-1 text-teal-600 bg-white rounded-full" />
                    )}
                  </button>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`w-6 h-0.5 ${isPast && !isRejected ? 'bg-teal-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
            <div className="flex items-center ml-3 gap-2">
              {REJECTED_STAGES.map(stage => {
                const isActive = app?.status === stage.value;
                const Icon = stage.icon;
                return (
                  <button key={stage.value} onClick={() => !saving && moveToStage(stage.value)} disabled={saving}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition text-xs font-medium ${
                      isActive ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500'
                    }`}>
                    <Icon size={16} />{stage.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Offer & Hire quick actions */}
          {app && ['interview', 'offer', 'pre_onboarding', 'onboarding'].includes(app.status) && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowOfferModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition">
                <Send size={12} /> Renseigner l'offre
              </button>
              {(app.status === 'onboarding' || app.status === 'pre_onboarding') && (
                <button onClick={() => setShowHireModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition">
                  <UserPlus size={12} /> Finaliser l'intégration
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100">
          <div className="flex overflow-x-auto">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 min-h-72">
          {/* Pipeline tab */}
          {tab === 'pipeline' && (
            <div className="space-y-6">
              {/* Offer summary */}
              {app && (app.offer_salary || app.offer_start_date) && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div><p className="text-xs text-teal-600 font-semibold uppercase mb-1">Type de contrat</p><p className="font-bold text-teal-900">{app.offer_contract_type || '—'}</p></div>
                  <div><p className="text-xs text-teal-600 font-semibold uppercase mb-1">Salaire proposé</p><p className="font-bold text-teal-900">{app.offer_salary ? `${app.offer_salary.toLocaleString()} XAF` : '—'}</p></div>
                  <div><p className="text-xs text-teal-600 font-semibold uppercase mb-1">Date de prise de poste</p><p className="font-bold text-teal-900">{fmtDate(app.offer_start_date)}</p></div>
                  <div><p className="text-xs text-teal-600 font-semibold uppercase mb-1">Période d'essai</p><p className="font-bold text-teal-900">{app.trial_period_months ? `${app.trial_period_months} mois` : '—'}</p></div>
                </div>
              )}

              {/* Rating */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Évaluation globale</p>
                <StarRating value={app?.rating || null} onChange={updateRating} />
              </div>

              {/* Cover letter */}
              {app?.cover_letter && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Lettre de motivation</p>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">{app.cover_letter}</div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notes RH (confidentielles)</p>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Retours d'entretien, observations, points forts / faibles..." />
                <button onClick={saveNote} disabled={saving}
                  className="mt-2 px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 disabled:opacity-60 transition">
                  {saving ? 'Sauvegarde...' : 'Sauvegarder la note'}
                </button>
              </div>

              {/* Timeline */}
              {pipelineEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><History size={12} />Historique du dossier</p>
                  <div className="space-y-2">
                    {pipelineEvents.map(ev => (
                      <div key={ev.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-slate-700">{ev.notes || `Statut → ${getStageInfo(ev.to_status).label}`}</p>
                          <p className="text-xs text-slate-400">{fmtDate(ev.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onboarding checklist tab */}
          {tab === 'onboarding' && (
            <div className="space-y-4">
              {!['pre_onboarding', 'onboarding', 'integrated'].includes(app?.status || '') ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Checklist disponible à partir de l'étape "Pré-intégration"</p>
                  <button onClick={() => moveToStage('pre_onboarding')}
                    className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-xl text-sm hover:bg-teal-800 transition">
                    Passer en pré-intégration
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Checklist d'intégration</p>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                      {(app?.onboarding_checklist || []).filter((i: OnboardingItem) => i.done).length} / {(app?.onboarding_checklist || []).length} complétés
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(app?.onboarding_checklist || DEFAULT_CHECKLIST).map((item: OnboardingItem) => (
                      <button key={item.id} onClick={() => toggleChecklist(item.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${item.done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                          {item.done && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                  {app?.hired_as_employee_id && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                      <Award size={20} className="text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-800">Candidat intégré dans l'effectif SNH</p>
                        <p className="text-sm text-emerald-600">Date d'intégration : {fmtDate(app.hiring_decision_date)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="space-y-5">
              {c.summary && <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">{c.summary}</div>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {c.phone && <InfoItem icon={<Phone size={13} />} label="Téléphone" value={c.phone} />}
                {c.location && <InfoItem icon={<MapPin size={13} />} label="Localisation" value={c.location} />}
                {c.availability_date && <InfoItem icon={<Calendar size={13} />} label="Disponible" value={fmtDate(c.availability_date)} />}
                {c.desired_salary_min && <InfoItem icon={<TrendingUp size={13} />} label="Prétentions" value={`${c.desired_salary_min?.toLocaleString()} — ${c.desired_salary_max?.toLocaleString() || '?'} XAF`} />}
                {c.mobility && <InfoItem icon={<MapPin size={13} />} label="Mobilité" value={{ local: 'Local', regional: 'Régional', national: 'National', international: 'International' }[c.mobility] || c.mobility} />}
                {c.source && <InfoItem icon={<Globe size={13} />} label="Source" value={c.source} />}
              </div>
              <div className="flex gap-3 flex-wrap">
                {c.linkedin_url && <a href={`https://${c.linkedin_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100"><Linkedin size={13} />LinkedIn</a>}
                {c.portfolio_url && <a href={`https://${c.portfolio_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200"><Globe size={13} />Portfolio</a>}
              </div>
            </div>
          )}

          {/* Experiences tab */}
          {tab === 'experiences' && (
            <div className="space-y-3">
              {!c.candidate_experiences?.length ? <EmptyState label="Aucune expérience" /> :
                c.candidate_experiences.map(exp => (
                  <div key={exp.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex justify-between mb-1">
                      <div><p className="font-semibold text-slate-800">{exp.job_title}</p><p className="text-teal-700 text-sm">{exp.company}</p></div>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-4">{fmtDate(exp.start_date)} — {exp.is_current ? 'Présent' : fmtDate(exp.end_date)}</span>
                    </div>
                    {exp.description && <p className="text-sm text-slate-600 leading-relaxed mt-2">{exp.description}</p>}
                  </div>
                ))}
            </div>
          )}

          {/* Education tab */}
          {tab === 'education' && (
            <div className="space-y-3">
              {!c.candidate_educations?.length ? <EmptyState label="Aucune formation" /> :
                c.candidate_educations.map(edu => (
                  <div key={edu.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{edu.degree}</p>
                        {edu.field_of_study && <p className="text-sm text-slate-600">{edu.field_of_study}</p>}
                        <p className="text-teal-700 text-sm">{edu.institution}</p>
                      </div>
                      <div className="text-right ml-4">
                        {edu.end_date && <p className="text-xs text-slate-500">{new Date(edu.end_date).getFullYear()}</p>}
                        {edu.grade && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{edu.grade}</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Skills tab */}
          {tab === 'skills' && (
            <div>
              {!c.candidate_candidate_skills?.length ? <EmptyState label="Aucune compétence" /> : (
                <div className="space-y-4">
                  {Object.entries(CAT_LABELS).map(([cat, catLabel]) => {
                    const catSkills = c.candidate_candidate_skills!.filter(s => s.category === cat);
                    if (!catSkills.length) return null;
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{catLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {catSkills.map(sk => (
                            <span key={sk.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-sm text-slate-700">
                              {sk.name}
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[sk.level]}`}>{LEVEL_LABELS[sk.level]}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Documents tab */}
          {tab === 'documents' && (
            <div className="space-y-2">
              {!c.candidate_documents?.length ? <EmptyState label="Aucun document" /> :
                c.candidate_documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{doc.file_name}</p>
                        <p className="text-xs text-slate-400">{doc.type}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => onDownloadDoc(doc)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"><Download size={14} /></button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <button onClick={() => onDelete(c.id)} className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm"><Trash2 size={14} />Supprimer le dossier</button>
          <button onClick={onClose} className="px-5 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm">Fermer</button>
        </div>
      </div>

      {/* Offer modal */}
      {showOfferModal && app && (
        <OfferModal
          app={app}
          candidateName={`${c.first_name} ${c.last_name}`}
          onClose={() => setShowOfferModal(false)}
          onSave={async (data) => {
            await supabase.from('candidate_applications').update(data).eq('id', app.id);
            await supabase.from('hiring_pipeline_events').insert({
              candidate_id: c.id, application_id: app.id,
              from_status: app.status, to_status: 'offer',
              notes: `Offre renseignée : ${data.offer_contract_type} — ${data.offer_salary?.toLocaleString()} XAF, prise de poste ${fmtDate(data.offer_start_date)}`,
            });
            await moveToStage('offer');
            setShowOfferModal(false);
          }}
        />
      )}

      {/* Hire modal */}
      {showHireModal && app && (
        <HireModal
          app={app}
          candidate={c}
          onClose={() => setShowHireModal(false)}
          onHire={async (employeeData) => {
            // Create employee record
            const { data: newEmployee } = await supabase.from('employees').insert(employeeData).select().maybeSingle();
            if (newEmployee) {
              await supabase.from('candidate_applications').update({
                status: 'integrated',
                hired_as_employee_id: newEmployee.id,
                hiring_decision_date: new Date().toISOString().split('T')[0],
              }).eq('id', app.id);
              await supabase.from('hiring_pipeline_events').insert({
                candidate_id: c.id, application_id: app.id,
                from_status: app.status, to_status: 'integrated',
                notes: `Candidat intégré dans l'effectif SNH en ${employeeData.contract_type}`,
              });
            }
            await onRefresh(c.id);
            setShowHireModal(false);
          }}
        />
      )}
    </div>
  );
}

// ── Offer Modal ────────────────────────────────────────────────────────────
function OfferModal({ app, candidateName, onClose, onSave }: {
  app: Application; candidateName: string;
  onClose: () => void;
  onSave: (data: Partial<Application>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    offer_contract_type: app.offer_contract_type || 'CDI',
    offer_salary: app.offer_salary || '',
    offer_start_date: app.offer_start_date || '',
    trial_period_months: app.trial_period_months || 0,
    offer_date: app.offer_date || new Date().toISOString().split('T')[0],
    hiring_manager_notes: app.hiring_manager_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const trialEnd = form.offer_start_date && form.trial_period_months
      ? new Date(new Date(form.offer_start_date).setMonth(new Date(form.offer_start_date).getMonth() + Number(form.trial_period_months))).toISOString().split('T')[0]
      : null;
    await onSave({
      offer_contract_type: form.offer_contract_type,
      offer_salary: Number(form.offer_salary) || null,
      offer_start_date: form.offer_start_date || null,
      trial_period_months: Number(form.trial_period_months) || 0,
      trial_end_date: trialEnd,
      offer_date: form.offer_date,
      hiring_manager_notes: form.hiring_manager_notes || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Renseigner l'offre</h3>
            <p className="text-sm text-slate-500">{candidateName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Type de contrat</label>
              <select value={form.offer_contract_type} onChange={e => setForm(f => ({ ...f, offer_contract_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Salaire mensuel (XAF)</label>
              <input type="number" value={form.offer_salary} onChange={e => setForm(f => ({ ...f, offer_salary: e.target.value }))}
                placeholder="Ex: 500000"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Prise de poste</label>
              <input type="date" value={form.offer_start_date} onChange={e => setForm(f => ({ ...f, offer_start_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Période d'essai (mois)</label>
              <input type="number" min={0} max={12} value={form.trial_period_months} onChange={e => setForm(f => ({ ...f, trial_period_months: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          {form.offer_start_date && form.trial_period_months > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
              <Clock size={14} />
              Fin de période d'essai : {fmtDate(
                new Date(new Date(form.offer_start_date).setMonth(
                  new Date(form.offer_start_date).getMonth() + Number(form.trial_period_months)
                )).toISOString()
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Notes du responsable du recrutement</label>
            <textarea value={form.hiring_manager_notes} onChange={e => setForm(f => ({ ...f, hiring_manager_notes: e.target.value }))} rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none"
              placeholder="Conditions particulières, avantages spécifiques..." />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-60 text-sm font-medium transition">
            {saving ? 'Enregistrement...' : 'Enregistrer l\'offre'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hire Modal ─────────────────────────────────────────────────────────────
function HireModal({ app, candidate, onClose, onHire }: {
  app: Application; candidate: Candidate;
  onClose: () => void;
  onHire: (employeeData: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email,
    phone: candidate.phone || '',
    job_title: app.desired_position || candidate.desired_position || '',
    department: '',
    location: candidate.location || 'Yaoundé',
    contract_type: app.offer_contract_type || 'CDI',
    hire_date: app.offer_start_date || new Date().toISOString().split('T')[0],
    salary: app.offer_salary || '',
    manager_notes: app.hiring_manager_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('employees').select('department').not('department', 'is', null).then(({ data }) => {
      if (data) {
        const unique = [...new Set(data.map(d => d.department as string).filter(Boolean))];
        setDepartments(unique.sort());
      }
    });
  }, []);

  const handleHire = async () => {
    setSaving(true);
    await onHire({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || null,
      job_title: form.job_title,
      department: form.department || null,
      location: form.location || null,
      contract_type: form.contract_type,
      hire_date: form.hire_date,
      current_salary: Number(form.salary) || null,
      status: 'active',
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Finaliser l'intégration</h3>
            <p className="text-sm text-slate-500">Créer la fiche employé dans l'effectif SNH</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <UserPlus size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800 text-sm">Intégration dans l'effectif SNH</p>
              <p className="text-emerald-700 text-xs mt-0.5">Une fiche employé sera créée et le candidat sera marqué comme intégré dans le SIRH.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Prénom</label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Nom</label>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Email professionnel</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Téléphone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Poste / Intitulé</label>
              <input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Département</label>
              <input list="dept-list" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="Sélectionner ou saisir"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              <datalist id="dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Type de contrat</label>
              <select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Prestation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Date de prise de poste</label>
              <input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Salaire mensuel (XAF)</label>
              <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Lieu de travail</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm">Annuler</button>
          <button onClick={handleHire} disabled={saving || !form.first_name || !form.last_name || !form.job_title}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 text-sm font-medium transition flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={15} />}
            {saving ? 'Intégration en cours...' : 'Intégrer dans l\'effectif SNH'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">{icon}{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-slate-400">
      <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
