import { useState, useEffect, useMemo, useCallback } from 'react';
import { Pagination, paginate, PageSize } from '../shared/Pagination';
import { supabase } from '../../lib/supabase';
import {
  Users, Search, X, Eye, Star, Trash2, Briefcase, MapPin,
  Mail, Phone, Linkedin, Globe, Calendar, GraduationCap, Zap,
  FileText, CheckCircle, Clock, UserCheck, XCircle, MessageSquare,
  TrendingUp, Download, ChevronRight, AlertCircle, Sparkles,
  ChevronDown, ChevronUp, Building2, RefreshCw, ArrowRight,
  ClipboardList, UserPlus, Award, Send, History, Plus, Filter, Upload, Pencil
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Candidate {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; location: string | null; linkedin_url: string | null;
  portfolio_url: string | null; summary: string | null; desired_position: string | null;
  desired_salary_min: number | null; desired_salary_max: number | null;
  availability_date: string | null; mobility: string | null; status: string;
  source: string; created_at: string; profile_completed: boolean;
  recommender_type?: string | null; recommender_name?: string | null; recommender_contact?: string | null;
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
interface CandSkill { id: string; skill_id?: string | null; name: string; category: string; level: string; }
interface MasterSkill { id: string; name: string; category: string; description?: string | null; }
interface CandDoc { id: string; type: string; file_name: string; file_url: string; file_size: number | null; uploaded_at: string; expiration_date?: string | null; }
interface JobOpening { id: string; title: string; reference: string; contract_type: string; location: string; status: string; publication_date: string; closing_date: string; required_skills: string[]; nice_to_have_skills: string[]; min_experience_years: number; }
interface JobMatch {
  id: string; candidate_id: string; job_opening_id: string; match_score: number;
  skill_match_score: number; experience_match_score: number; education_match_score: number;
  matched_skills: string[]; missing_skills: string[]; ai_summary: string | null; computed_at: string;
  candidate?: Candidate;
}
interface PipelineEvent { id: string; from_status: string | null; to_status: string; notes: string | null; created_at: string; }

// ── Form constants ────────────────────────────────────────────────────────
const EDU_LEVELS = ['CEP','BEPC','BAC','BAC+2 (BTS/DUT)','BAC+3 (Licence)','BAC+4','BAC+5 (Master)','Doctorat','Autre'];
const SKILL_LEVELS = [{value:'beginner',label:'Débutant'},{value:'intermediate',label:'Intermédiaire'},{value:'advanced',label:'Avancé'},{value:'expert',label:'Expert'}];
const LANG_LEVELS = [{value:'beginner',label:'Débutant'},{value:'intermediate',label:'Intermédiaire'},{value:'good',label:'Bon'},{value:'excellent',label:'Excellent'}];
const REGIONS_CM = ['Centre','Littoral','Ouest','Nord','Extrême-Nord','Adamaoua','Est','Sud','Nord-Ouest','Sud-Ouest'];

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
function yr2date(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return /^\d{4}$/.test(s) ? `${s}-01-01` : (s || null);
}
function date2yr(v: string | null | undefined): string {
  if (!v) return '';
  const s = String(v).trim();
  return s.length >= 4 ? s.slice(0, 4) : s;
}
function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
const DOC_TYPES = [
  { value: 'cv',              label: 'CV / Curriculum Vitae' },
  { value: 'cover_letter',    label: 'Lettre de motivation' },
  { value: 'diploma',         label: 'Diplôme / Attestation de diplôme' },
  { value: 'cni_passport',    label: 'CNI / Passeport' },
  { value: 'employment_cert', label: "Attestation d'emploi" },
  { value: 'work_cert',       label: 'Certificat de travail' },
  { value: 'criminal_record', label: 'Extrait de casier judiciaire (n°3)' },
  { value: 'birth_cert',      label: 'Acte de naissance' },
  { value: 'residence_cert',  label: 'Certificat de résidence' },
  { value: 'medical_cert',    label: "Certificat médical d'aptitude" },
  { value: 'tax_cert',        label: 'Attestation de régularité fiscale' },
  { value: 'cnps_cert',       label: 'Attestation CNPS' },
  { value: 'reference',       label: 'Lettre de recommandation' },
  { value: 'other',           label: 'Autre document' },
];
function docExpiryStatus(expDate: string | null | undefined): 'expired' | 'soon' | 'ok' | null {
  if (!expDate) return null;
  const diffDays = Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
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

// ── Spontaneous application types ─────────────────────────────────────────
type SpontaneousType = 'emploi' | 'stage_academique' | 'stage_professionnel' | 'recommande';

interface SpontaneousForm {
  first_name: string; last_name: string; email: string; phone: string;
  desired_position: string; cover_letter: string; source: string;
  spontaneous_type: SpontaneousType; notes: string;
}

const EMPTY_SPONTANEOUS: SpontaneousForm = {
  first_name: '', last_name: '', email: '', phone: '',
  desired_position: '', cover_letter: '', source: 'spontaneous',
  spontaneous_type: 'emploi', notes: '',
};

const SPONTANEOUS_TYPE_LABELS: Record<SpontaneousType, string> = {
  emploi: 'Candidature emploi',
  stage_academique: 'Stage académique',
  stage_professionnel: 'Stage professionnel',
  recommande: 'Candidature recommandée',
};

// ── Main component ─────────────────────────────────────────────────────────
type MainView = 'candidates' | 'by-job' | 'search';

export default function CandidateManagement() {
  const [mainView, setMainView] = useState<MainView>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterJobId, setFilterJobId] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [computingMatch, setComputingMatch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesPageSize, setCandidatesPageSize] = useState<PageSize>(20);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesPageSize, setMatchesPageSize] = useState<PageSize>(20);
  const [searchPage, setSearchPage] = useState(1);
  const [searchPageSize, setSearchPageSize] = useState<PageSize>(20);
  // IA matching search
  const [matchSearch, setMatchSearch] = useState('');

  // ── Search view state ──────────────────────────────────────────────────────
  const [srchName, setSrchName] = useState('');
  const [srchSkills, setSrchSkills] = useState<string[]>([]);
  const [srchSkillInput, setSrchSkillInput] = useState('');
  const [srchShowSugg, setSrchShowSugg] = useState(false);
  const [srchMinExp, setSrchMinExp] = useState('');
  const [srchLocation, setSrchLocation] = useState('');
  const [srchEduLevel, setSrchEduLevel] = useState('');
  const [srchAvailBefore, setSrchAvailBefore] = useState('');
  const [srchStatus, setSrchStatus] = useState('active');

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

  const filteredCandidates = candidates.filter(c => {
    const txt = `${c.first_name} ${c.last_name} ${c.email} ${c.desired_position || ''}`.toLowerCase();
    const app = c.candidate_applications?.[0];
    const appStatus = app?.status || 'new';
    const appType = app?.spontaneous_type || '';
    const appYear = c.created_at ? new Date(c.created_at).getFullYear().toString() : '';
    const appJobId = app?.job_opening?.id || '';
    if (search && !txt.includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && appStatus !== filterStatus) return false;
    if (filterType !== 'all') {
      if (filterType === 'offre' && !app?.job_opening) return false;
      if (filterType === 'recommande' && appType !== 'recommande' && c.source !== 'referral') return false;
      if (filterType === 'stage' && !['stage_academique','stage_professionnel'].includes(appType)) return false;
      if (filterType === 'emploi' && appType !== 'emploi' && !app?.job_opening) return false;
    }
    if (filterJobId !== 'all' && appJobId !== filterJobId) return false;
    if (filterYear !== 'all' && appYear !== filterYear) return false;
    if (filterSource !== 'all' && c.source !== filterSource) return false;
    return true;
  });

  // Reset pages when filtered results change
  const _candidatesKey = `${search}|${filterStatus}|${filterType}|${filterJobId}|${filterYear}|${filterSource}`;
  useEffect(() => { setCandidatesPage(1); }, [_candidatesKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _resetSearchPage = useCallback(() => setSearchPage(1), []);
  useEffect(() => { _resetSearchPage(); }, [srchName, srchSkills.join(','), srchMinExp, srchLocation, srchEduLevel, srchAvailBefore, srchStatus]);
  useEffect(() => { setMatchesPage(1); }, [matchSearch]);

  const availableYears = [...new Set(candidates.map(c => new Date(c.created_at).getFullYear()))].sort((a, b) => b - a);

  const stats = {
    total: candidates.length,
    active: candidates.filter(c => {
      const s = c.candidate_applications?.[0]?.status;
      return s && !['rejected', 'withdrawn', 'integrated'].includes(s);
    }).length,
    offer: candidates.filter(c => ['offer', 'pre_onboarding', 'onboarding'].includes(c.candidate_applications?.[0]?.status || '')).length,
    integrated: candidates.filter(c => c.candidate_applications?.[0]?.status === 'integrated').length,
  };

  // ── Search: derived data ──────────────────────────────────────────────────
  const allSkillNames = useMemo(() =>
    [...new Set(candidates.flatMap(c => (c.candidate_candidate_skills || []).map(s => s.name)))].sort(),
    [candidates]
  );

  const srchSkillSuggestions = useMemo(() =>
    allSkillNames.filter(s =>
      srchSkillInput.length > 0 &&
      s.toLowerCase().includes(srchSkillInput.toLowerCase()) &&
      !srchSkills.includes(s)
    ).slice(0, 8),
    [allSkillNames, srchSkillInput, srchSkills]
  );

  const filteredMatches = useMemo(() => {
    if (!matchSearch.trim()) return jobMatches;
    const q = matchSearch.toLowerCase();
    return jobMatches.filter(m => {
      const c = m.candidate;
      if (!c) return false;
      return `${c.first_name} ${c.last_name} ${c.email || ''} ${c.desired_position || ''}`.toLowerCase().includes(q);
    });
  }, [jobMatches, matchSearch]);

  const searchResults = useMemo(() => {
    return candidates
      .filter(c => {
        if (srchName.trim()) {
          const q = srchName.toLowerCase();
          if (!`${c.first_name} ${c.last_name} ${c.email || ''} ${c.desired_position || ''}`.toLowerCase().includes(q)) return false;
        }
        const appStatus = c.candidate_applications?.[0]?.status || 'new';
        if (srchStatus === 'active' && ['rejected', 'withdrawn', 'integrated'].includes(appStatus)) return false;
        if (srchStatus !== 'all' && srchStatus !== 'active' && appStatus !== srchStatus) return false;
        if (srchLocation && !c.location?.toLowerCase().includes(srchLocation.toLowerCase())) return false;
        if (srchEduLevel) {
          const minIdx = EDU_LEVELS.indexOf(srchEduLevel);
          const hasLevel = (c.candidate_educations || []).some(e => EDU_LEVELS.indexOf(e.education_level || '') >= minIdx);
          if (!hasLevel) return false;
        }
        if (srchMinExp) {
          const minYrs = parseInt(srchMinExp) || 0;
          const expYrs = (c.candidate_experiences || []).reduce((acc, e) => {
            const s = new Date(e.start_date).getFullYear();
            const en = e.is_current ? new Date().getFullYear() : (e.end_date ? new Date(e.end_date).getFullYear() : s);
            return acc + Math.max(0, en - s);
          }, 0);
          if (expYrs < minYrs) return false;
        }
        if (srchAvailBefore && c.availability_date) {
          if (new Date(c.availability_date) > new Date(srchAvailBefore)) return false;
        }
        return true;
      })
      .map(c => {
        const candSkills = (c.candidate_candidate_skills || []).map(s => s.name.toLowerCase());
        const matched = srchSkills.filter(s => candSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs)));
        const missing = srchSkills.filter(s => !matched.includes(s));
        const skillScore = srchSkills.length > 0 ? Math.round((matched.length / srchSkills.length) * 100) : 100;
        const expYrs = (c.candidate_experiences || []).reduce((acc, e) => {
          const s = new Date(e.start_date).getFullYear();
          const en = e.is_current ? new Date().getFullYear() : (e.end_date ? new Date(e.end_date).getFullYear() : s);
          return acc + Math.max(0, en - s);
        }, 0);
        return { ...c, _matched: matched, _missing: missing, _skillScore: skillScore, _expYrs: expYrs };
      })
      .sort((a, b) => b._skillScore - a._skillScore || b._expYrs - a._expYrs);
  }, [candidates, srchSkills, srchMinExp, srchLocation, srchEduLevel, srchAvailBefore, srchStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CVthèque & Recrutement</h1>
          <p className="text-slate-500 text-sm mt-1">Suivi complet du candidat jusqu'à son intégration</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-medium">
            <UserPlus size={15} /> Ajouter un candidat
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
        <button onClick={() => setMainView('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainView === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Search size={15} /> Recherche multi-critères
        </button>
      </div>

      {/* ── VIEW: All candidates ── */}
      {mainView === 'candidates' && (
        <>
          {/* Search + filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un candidat..."
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
            <button
              onClick={() => setFilterType(f => f === 'recommande' ? 'all' : 'recommande')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium transition ${filterType === 'recommande' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700'}`}
              title="Afficher uniquement les candidats recommandés"
            >
              <UserPlus size={14} />
              Recommandés
              {filterType === 'recommande' && <X size={11} className="ml-0.5 opacity-70" />}
            </button>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm font-medium transition ${showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={14} /> Filtres avancés
              {[filterType, filterJobId, filterYear, filterSource].filter(f => f !== 'all').length > 0 && (
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">
                  {[filterType, filterJobId, filterYear, filterSource].filter(f => f !== 'all').length}
                </span>
              )}
            </button>
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type de candidature</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="all">Tous les types</option>
                  <option value="offre">Sur offre publiée</option>
                  <option value="emploi">Emploi (spontanée)</option>
                  <option value="stage">Stage (académique / pro)</option>
                  <option value="recommande">Recommandé(e)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Offre associée</label>
                <select value={filterJobId} onChange={e => setFilterJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="all">Toutes les offres</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Année</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="all">Toutes les années</option>
                  {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Source</label>
                <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="all">Toutes les sources</option>
                  <option value="spontaneous">Candidature spontanée</option>
                  <option value="referral">Recommandation interne</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="job_board">Job board</option>
                  <option value="school">Partenariat école</option>
                  <option value="portal">Portail candidats</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              {[filterType, filterJobId, filterYear, filterSource].some(f => f !== 'all') && (
                <div className="col-span-2 sm:col-span-4 flex justify-end">
                  <button onClick={() => { setFilterType('all'); setFilterJobId('all'); setFilterYear('all'); setFilterSource('all'); }}
                    className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
                    <X size={12} /> Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          {(search || filterStatus !== 'all' || filterType !== 'all' || filterJobId !== 'all' || filterYear !== 'all' || filterSource !== 'all') && (
            <p className="text-sm text-slate-500">{filteredCandidates.length} résultat{filteredCandidates.length > 1 ? 's' : ''} sur {candidates.length}</p>
          )}

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
                    {paginate(filteredCandidates, candidatesPage, candidatesPageSize).map(c => {
                      const app = c.candidate_applications?.[0];
                      const stageIdx = STAGE_ORDER.indexOf(app?.status || 'new');
                      const progress = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100) : 0;
                      const isRecommended = app?.spontaneous_type === 'recommande' || c.source === 'referral';
                      const recType = c.recommender_type; // 'internal' | 'external' | null
                      const recBadge = isRecommended
                        ? recType === 'internal'
                          ? { label: 'Recommandé (SNH)', cls: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' }
                          : recType === 'external'
                          ? { label: 'Recommandé (ext.)', cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' }
                          : { label: 'Recommandé', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' }
                        : null;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => openCandidate(c)}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                                  {c.first_name[0]}{c.last_name[0]}
                                </div>
                                {recBadge && (
                                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${recBadge.dot} border-2 border-white flex items-center justify-center`} title={recBadge.label}>
                                    <UserPlus size={8} className="text-white" />
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-slate-800 text-sm">{c.first_name} {c.last_name}</p>
                                  {recBadge && (
                                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md border font-medium leading-none ${recBadge.cls}`}>
                                      <UserPlus size={9} />{recBadge.label}
                                    </span>
                                  )}
                                </div>
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
              <Pagination
                total={filteredCandidates.length}
                page={candidatesPage}
                pageSize={candidatesPageSize}
                onPage={setCandidatesPage}
                onPageSize={setCandidatesPageSize}
              />
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
                  <>
                    {/* Search bar for match results */}
                    <div className="mb-3 flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={matchSearch}
                          onChange={e => setMatchSearch(e.target.value)}
                          placeholder="Rechercher un candidat dans les résultats..."
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        />
                        {matchSearch && (
                          <button onClick={() => setMatchSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                        {filteredMatches.length} / {jobMatches.length} candidat{jobMatches.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {filteredMatches.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-sm">Aucun candidat ne correspond à cette recherche</div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {paginate(filteredMatches, matchesPage, matchesPageSize).map(match => {
                            const cand = match.candidate;
                            if (!cand) return null;
                            return (
                              <MatchCard key={match.id} match={match} candidate={cand}
                                onViewCandidate={() => { setMainView('candidates'); openCandidate(cand); }} />
                            );
                          })}
                        </div>
                        <div className="mt-2">
                          <Pagination
                            total={filteredMatches.length}
                            page={matchesPage}
                            pageSize={matchesPageSize}
                            onPage={setMatchesPage}
                            onPageSize={setMatchesPageSize}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW: Search multi-criteria ── */}
      {mainView === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Criteria panel ── */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
              {/* Skills — hero criterion */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Compétences recherchées
                </label>
                {srchSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {srchSkills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full font-medium">
                        {s}
                        <button onClick={() => setSrchSkills(prev => prev.filter(x => x !== s))} className="hover:text-red-500 transition">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={srchSkillInput}
                    onChange={e => { setSrchSkillInput(e.target.value); setSrchShowSugg(true); }}
                    onFocus={() => setSrchShowSugg(true)}
                    onBlur={() => setTimeout(() => setSrchShowSugg(false), 150)}
                    placeholder="Ajouter une compétence..."
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  {srchShowSugg && srchSkillSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {srchSkillSuggestions.map(s => (
                        <button key={s} onMouseDown={() => { setSrchSkills(prev => [...prev, s]); setSrchSkillInput(''); setSrchShowSugg(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-800 transition text-slate-700 border-b border-slate-50 last:border-0">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {srchSkillInput && !srchSkillSuggestions.some(s => s.toLowerCase() === srchSkillInput.toLowerCase()) && (
                    <button
                      onMouseDown={() => { if (srchSkillInput.trim()) { setSrchSkills(prev => [...prev, srchSkillInput.trim()]); setSrchSkillInput(''); } }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition">
                      + Ajouter
                    </button>
                  )}
                </div>
                {allSkillNames.length > 0 && srchSkillInput.length === 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 mb-1.5">Compétences fréquentes :</p>
                    <div className="flex flex-wrap gap-1">
                      {allSkillNames.slice(0, 12).filter(s => !srchSkills.includes(s)).slice(0, 10).map(s => (
                        <button key={s} onClick={() => setSrchSkills(prev => [...prev, s])}
                          className="text-xs px-2 py-0.5 border border-slate-200 text-slate-600 rounded-full hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expérience minimum</label>
                  <select value={srchMinExp} onChange={e => setSrchMinExp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="">Indifférente</option>
                    <option value="1">1 an minimum</option>
                    <option value="2">2 ans minimum</option>
                    <option value="3">3 ans minimum</option>
                    <option value="5">5 ans minimum</option>
                    <option value="7">7 ans minimum</option>
                    <option value="10">10 ans minimum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Niveau d'études minimum</label>
                  <select value={srchEduLevel} onChange={e => setSrchEduLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="">Indifférent</option>
                    {EDU_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Localisation</label>
                  <input value={srchLocation} onChange={e => setSrchLocation(e.target.value)} placeholder="Yaoundé, Douala..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Disponible avant le</label>
                  <input type="date" value={srchAvailBefore} onChange={e => setSrchAvailBefore(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Statut</label>
                  <select value={srchStatus} onChange={e => setSrchStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="active">Actifs uniquement</option>
                    <option value="all">Tous les candidats</option>
                    {ALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {(srchSkills.length > 0 || srchMinExp || srchLocation || srchEduLevel || srchAvailBefore || srchStatus !== 'active') && (
                <button
                  onClick={() => { setSrchSkills([]); setSrchMinExp(''); setSrchLocation(''); setSrchEduLevel(''); setSrchAvailBefore(''); setSrchStatus('active'); }}
                  className="w-full text-xs py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition flex items-center justify-center gap-1.5">
                  <X size={12} /> Réinitialiser les critères
                </button>
              )}
            </div>
          </div>

          {/* ── Results panel ── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-44">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={srchName}
                  onChange={e => setSrchName(e.target.value)}
                  placeholder="Filtrer par nom, email..."
                  className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                />
                {srchName && (
                  <button onClick={() => setSrchName('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500 flex-shrink-0">
                <span className="font-semibold text-slate-800">{searchResults.length}</span> résultat{searchResults.length > 1 ? 's' : ''}
                {srchSkills.length > 0 && <span className="ml-1 text-teal-600">· {srchSkills.length} compétence{srchSkills.length > 1 ? 's' : ''}</span>}
              </p>
            </div>

            {searchResults.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
                <Users size={40} className="mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium">Aucun candidat ne correspond à ces critères</p>
                <p className="text-xs mt-1">Essayez d'assouplir les filtres</p>
              </div>
            ) : (
              <>
              <div className="space-y-3">
                {paginate(searchResults, searchPage, searchPageSize).map(c => {
                  const appStatus = c.candidate_applications?.[0]?.status || 'new';
                  const stage = getStageInfo(appStatus);
                  const hasSkillCriteria = srchSkills.length > 0;
                  const score = c._skillScore as number;
                  const matched = (c._matched as string[]) || [];
                  const missing = (c._missing as string[]) || [];
                  const expYrs = c._expYrs as number;
                  return (
                    <div key={c.id}
                      onClick={() => openCandidate(c)}
                      className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-slate-500">{c.desired_position || c.candidate_applications?.[0]?.job_opening?.title || '—'}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {hasSkillCriteria && (
                                <span className={`text-sm font-black ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                  {score}%
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.color}`}>{stage.label}</span>
                            </div>
                          </div>

                          {hasSkillCriteria && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${score}%` }} />
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {matched.map(s => (
                                  <span key={s} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-0.5">
                                    <CheckCircle size={9} className="flex-shrink-0" />{s}
                                  </span>
                                ))}
                                {missing.map(s => (
                                  <span key={s} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center gap-0.5">
                                    <XCircle size={9} className="flex-shrink-0" />{s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {!hasSkillCriteria && (c.candidate_candidate_skills || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(c.candidate_candidate_skills || []).slice(0, 5).map((sk: CandSkill) => (
                                <span key={sk.id} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">{sk.name}</span>
                              ))}
                              {(c.candidate_candidate_skills || []).length > 5 && (
                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full">+{(c.candidate_candidate_skills || []).length - 5}</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                            {c.location && <span className="flex items-center gap-1"><MapPin size={10} />{c.location}</span>}
                            {expYrs > 0 && <span className="flex items-center gap-1"><Briefcase size={10} />{expYrs} an{expYrs > 1 ? 's' : ''} d'exp.</span>}
                            {c.availability_date && <span className="flex items-center gap-1"><Calendar size={10} />Dispo. {fmtDate(c.availability_date)}</span>}
                          </div>
                        </div>
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2">
                  <Pagination
                    total={searchResults.length}
                    page={searchPage}
                    pageSize={searchPageSize}
                    onPage={setSearchPage}
                    onPageSize={setSearchPageSize}
                  />
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
          onEdit={(c) => { setEditingCandidate(c); setSelectedCandidate(null); }}
        />
      )}

      {/* Add candidate modal */}
      {showAddModal && (
        <AddCandidateModal
          jobs={jobs}
          onClose={() => setShowAddModal(false)}
          onCreated={async () => { setShowAddModal(false); await loadAll(); }}
        />
      )}

      {/* Edit candidate modal */}
      {editingCandidate && (
        <AddCandidateModal
          jobs={jobs}
          initialCandidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onCreated={async () => { setEditingCandidate(null); await loadAll(); }}
        />
      )}

    </div>
  );
}

// ── Add Candidate Modal (multi-tab, aligns with portal profile) ──────────────
type AddTab = 'infos' | 'experiences' | 'formations' | 'competences' | 'langues' | 'candidature' | 'documents';

function fi(err = false) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${err ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`;
}
function FL({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">{children}{req && <span className="text-red-500 ml-1">*</span>}</label>;
}

const ADD_TABS: { value: AddTab; label: string }[] = [
  { value: 'infos',        label: 'Infos personnelles' },
  { value: 'experiences',  label: 'Expériences' },
  { value: 'formations',   label: 'Formations' },
  { value: 'competences',  label: 'Compétences' },
  { value: 'langues',      label: 'Langues' },
  { value: 'candidature',  label: 'Candidature' },
  { value: 'documents',    label: 'Documents' },
];

interface NewExp { job_title: string; company: string; location: string; start_date: string; end_date: string; is_current: boolean; description: string; contract_type: string; sector: string; }
interface NewEdu { degree: string; institution: string; field_of_study: string; location: string; country: string; start_date: string; end_date: string; is_current: boolean; grade: string; education_level: string; description: string; }
interface NewSkill { name: string; category: string; level: string; }
interface NewLang { name: string; level: string; }

function AddCandidateModal({ jobs, onClose, onCreated, initialCandidate }: { jobs: JobOpening[]; onClose: () => void; onCreated: () => Promise<void>; initialCandidate?: Candidate }) {
  const isEdit = !!initialCandidate?.id;
  const ic = initialCandidate as any;
  const initApp = (initialCandidate?.candidate_applications?.[0] as any) ?? null;

  const [tab, setTab] = useState<AddTab>('infos');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [masterSkills, setMasterSkills] = useState<MasterSkill[]>([]);
  useEffect(() => {
    supabase.from('skills').select('id, name, category, description').order('category').order('name')
      .then(({ data }) => { if (data) setMasterSkills(data as MasterSkill[]); });
  }, []);

  // Infos personnelles
  const [firstName, setFirstName] = useState(() => ic?.first_name || '');
  const [lastName, setLastName] = useState(() => ic?.last_name || '');
  const [email, setEmail] = useState(() => ic?.email || '');
  const [phone, setPhone] = useState(() => ic?.phone || '');
  const [phone2, setPhone2] = useState(() => ic?.phone2 || '');
  const [birthDate, setBirthDate] = useState(() => ic?.birth_date || '');
  const [gender, setGender] = useState(() => ic?.gender || '');
  const [nationality, setNationality] = useState(() => ic?.nationality || 'Camerounaise');
  const [nationalId, setNationalId] = useState(() => ic?.national_id || '');
  const [location, setLocation] = useState(() => ic?.location || '');
  const [region, setRegion] = useState(() => ic?.region || '');
  const [professionalTitle, setProfessionalTitle] = useState(() => ic?.professional_title || '');
  const [desiredPosition, setDesiredPosition] = useState(() => ic?.desired_position || initApp?.desired_position || '');
  const [linkedinUrl, setLinkedinUrl] = useState(() => ic?.linkedin_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(() => ic?.portfolio_url || '');
  const [summary, setSummary] = useState(() => ic?.summary || '');
  const [desiredSalaryMin, setDesiredSalaryMin] = useState(() => ic?.desired_salary_min != null ? String(ic.desired_salary_min) : '');
  const [desiredSalaryMax, setDesiredSalaryMax] = useState(() => ic?.desired_salary_max != null ? String(ic.desired_salary_max) : '');
  const [availabilityDate, setAvailabilityDate] = useState(() => ic?.availability_date || '');

  // Expériences
  const [experiences, setExperiences] = useState<NewExp[]>(() =>
    (initialCandidate?.candidate_experiences || []).map((e: Experience) => ({
      job_title: e.job_title, company: e.company, location: e.location || '',
      start_date: date2yr(e.start_date), end_date: date2yr(e.end_date),
      is_current: e.is_current, description: e.description || '',
      contract_type: (e as any).contract_type || 'CDI', sector: (e as any).sector || '',
    }))
  );
  const addExp = () => setExperiences(p => [...p, { job_title:'', company:'', location:'', start_date:'', end_date:'', is_current:false, description:'', contract_type:'CDI', sector:'' }]);
  const updExp = (i: number, k: keyof NewExp, v: any) => setExperiences(p => { const a=[...p]; (a[i] as any)[k]=v; return a; });
  const delExp = (i: number) => setExperiences(p => p.filter((_,j)=>j!==i));

  // Formations
  const [educations, setEducations] = useState<NewEdu[]>(() =>
    (initialCandidate?.candidate_educations || []).map((e: Education) => ({
      degree: e.degree, institution: e.institution, field_of_study: e.field_of_study || '',
      location: (e as any).location || '', country: (e as any).country || 'Cameroun',
      start_date: date2yr((e as any).start_date), end_date: date2yr(e.end_date),
      is_current: (e as any).is_current ?? false, grade: e.grade || '',
      education_level: (e as any).education_level || '', description: (e as any).description || '',
    }))
  );
  const addEdu = () => setEducations(p => [...p, { degree:'', institution:'', field_of_study:'', location:'', country:'Cameroun', start_date:'', end_date:'', is_current:false, grade:'', education_level:'', description:'' }]);
  const updEdu = (i: number, k: keyof NewEdu, v: any) => setEducations(p => { const a=[...p]; (a[i] as any)[k]=v; return a; });
  const delEdu = (i: number) => setEducations(p => p.filter((_,j)=>j!==i));

  // Compétences
  const [skills, setSkills] = useState<NewSkill[]>(() =>
    (initialCandidate?.candidate_candidate_skills || []).map((s: CandSkill) => ({
      name: s.name, category: s.category, level: s.level,
    }))
  );
  const [newSkillName, setNewSkillName] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const selectedSkillNames = new Set(skills.map(s => s.name));
  const toggleSkill = (ms: MasterSkill) => {
    if (selectedSkillNames.has(ms.name)) {
      setSkills(p => p.filter(s => s.name !== ms.name));
    } else {
      setSkills(p => [...p, { name: ms.name, category: ms.category, level: 'intermediate' }]);
    }
  };
  const addSkill = () => { const n=newSkillName.trim(); if(n && !selectedSkillNames.has(n)) { setSkills(p=>[...p,{name:n,category:'other',level:'intermediate'}]); setNewSkillName(''); } };
  const updSkillLevel = (name: string, level: string) => setSkills(p => p.map(s => s.name===name ? {...s,level} : s));
  const delSkill = (name: string) => setSkills(p => p.filter(s=>s.name!==name));

  // Langues
  const [languages, setLanguages] = useState<NewLang[]>([]);
  useEffect(() => {
    if (isEdit && initialCandidate?.id) {
      supabase.from('candidate_languages').select('name, level').eq('candidate_id', initialCandidate.id)
        .then(({ data }) => { if (data) setLanguages(data as NewLang[]); });
    }
  }, []);
  const addLang = () => setLanguages(p => [...p, { name:'', level:'good' }]);
  const updLang = (i: number, k: keyof NewLang, v: string) => setLanguages(p => { const a=[...p]; (a[i] as any)[k]=v; return a; });
  const delLang = (i: number) => setLanguages(p => p.filter((_,j)=>j!==i));

  // Candidature
  const [appType, setAppType] = useState<SpontaneousType>(() => initApp?.spontaneous_type || 'emploi');
  const [jobOpeningId, setJobOpeningId] = useState(() => initApp?.job_opening?.id || '');
  const [coverLetter, setCoverLetter] = useState(() => initApp?.cover_letter || '');
  const [internalNotes, setInternalNotes] = useState(() => initApp?.internal_notes || '');
  const [source, setSource] = useState(() => ic?.source || 'spontaneous');
  // Recommandeur
  const [recommenderType, setRecommenderType] = useState<'internal' | 'external'>(() => (ic?.recommender_type as 'internal' | 'external') || 'internal');
  const [recommenderName, setRecommenderName] = useState(() => ic?.recommender_name || '');
  const [recommenderContact, setRecommenderContact] = useState(() => ic?.recommender_contact || '');

  // Documents — requires candidateId to exist first
  const [savedCandidateId, setSavedCandidateId] = useState<string | null>(() => initialCandidate?.id || null);
  const [autoSaving, setAutoSaving] = useState(false);

  const ensureCandidateSaved = async (): Promise<string | null> => {
    if (savedCandidateId) return savedCandidateId;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Remplissez prénom, nom et email avant d\'accéder aux documents.');
      setTab('infos');
      return null;
    }
    setAutoSaving(true); setError('');
    try {
      const { data: existing } = await supabase.from('candidates').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (existing) { setSavedCandidateId(existing.id); return existing.id; }
      const { data: newCand, error: candErr } = await supabase.from('candidates').insert({
        first_name: firstName.trim(), last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null, phone2: phone2.trim() || null,
        birth_date: birthDate || null, gender: gender || null,
        nationality: nationality.trim() || null, national_id: nationalId.trim() || null,
        location: location.trim() || null, region: region || null,
        professional_title: professionalTitle.trim() || null,
        desired_position: desiredPosition.trim() || null,
        linkedin_url: linkedinUrl.trim() || null, portfolio_url: portfolioUrl.trim() || null,
        summary: summary.trim() || null,
        desired_salary_min: desiredSalaryMin ? Number(desiredSalaryMin) : null,
        desired_salary_max: desiredSalaryMax ? Number(desiredSalaryMax) : null,
        availability_date: availabilityDate || null,
        source: source || 'spontaneous', status: 'active', profile_completed: false,
      }).select('id').maybeSingle();
      if (candErr) throw new Error(candErr.message);
      const id = newCand?.id ?? null;
      if (id) setSavedCandidateId(id);
      return id;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setAutoSaving(false);
    }
  };

  const handleTabClick = async (tabValue: AddTab) => {
    if (tabValue === 'documents') {
      const id = await ensureCandidateSaved();
      if (!id) return;
    }
    setTab(tabValue);
  };

  const tabIdx = ADD_TABS.findIndex(t => t.value === tab);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setTab('infos'); setError('Prénom, nom et email sont obligatoires.'); return;
    }
    setSaving(true); setError('');
    try {
      // 1. Create or update candidate
      let candidateId: string | null = savedCandidateId;
      const profileFields = {
        first_name: firstName.trim(), last_name: lastName.trim(),
        phone: phone.trim() || null, phone2: phone2.trim() || null,
        birth_date: birthDate || null, gender: gender || null,
        nationality: nationality.trim() || null, national_id: nationalId.trim() || null,
        location: location.trim() || null, region: region || null,
        professional_title: professionalTitle.trim() || null,
        desired_position: desiredPosition.trim() || null,
        linkedin_url: linkedinUrl.trim() || null, portfolio_url: portfolioUrl.trim() || null,
        summary: summary.trim() || null,
        desired_salary_min: desiredSalaryMin ? Number(desiredSalaryMin) : null,
        desired_salary_max: desiredSalaryMax ? Number(desiredSalaryMax) : null,
        availability_date: availabilityDate || null,
        source: source || 'spontaneous',
        recommender_type: appType === 'recommande' ? recommenderType : null,
        recommender_name: appType === 'recommande' && recommenderName.trim() ? recommenderName.trim() : null,
        recommender_contact: appType === 'recommande' && recommenderContact.trim() ? recommenderContact.trim() : null,
      };

      if (isEdit && candidateId) {
        // ── EDIT MODE ────────────────────────────────────────────────────────
        const { error: candErr } = await supabase.from('candidates').update(profileFields).eq('id', candidateId);
        if (candErr) throw new Error('Mise à jour candidat : ' + candErr.message);

        // Replace experiences
        await supabase.from('candidate_experiences').delete().eq('candidate_id', candidateId);
        const validExp = experiences.filter(e => e.job_title && e.company);
        if (validExp.length) {
          const { error: expErr } = await supabase.from('candidate_experiences').insert(
            validExp.map(e => ({ ...e, candidate_id: candidateId, start_date: yr2date(e.start_date), end_date: e.is_current ? null : yr2date(e.end_date) }))
          );
          if (expErr) throw new Error('Expériences : ' + expErr.message);
        }

        // Replace educations
        await supabase.from('candidate_educations').delete().eq('candidate_id', candidateId);
        const validEdu = educations.filter(e => e.degree && e.institution);
        if (validEdu.length) {
          const { error: eduErr } = await supabase.from('candidate_educations').insert(
            validEdu.map(e => ({ ...e, candidate_id: candidateId, start_date: yr2date(e.start_date), end_date: e.is_current ? null : yr2date(e.end_date) }))
          );
          if (eduErr) throw new Error('Formations : ' + eduErr.message);
        }

        // Replace skills
        await supabase.from('candidate_candidate_skills').delete().eq('candidate_id', candidateId);
        if (skills.length) {
          const masterMap = Object.fromEntries(masterSkills.map(m => [m.name, m.id]));
          const { error: skillErr } = await supabase.from('candidate_candidate_skills').insert(
            skills.map(s => ({ ...s, candidate_id: candidateId, skill_id: masterMap[s.name] ?? null }))
          );
          if (skillErr) throw new Error('Compétences : ' + skillErr.message);
        }

        // Replace languages
        await supabase.from('candidate_languages').delete().eq('candidate_id', candidateId);
        const validLangs = languages.filter(l => l.name.trim());
        if (validLangs.length) {
          const { error: langErr } = await supabase.from('candidate_languages').insert(
            validLangs.map(l => ({ ...l, candidate_id: candidateId }))
          );
          if (langErr) throw new Error('Langues : ' + langErr.message);
        }

        // Update or create application record
        const appPayload = {
          job_opening_id: jobOpeningId || null,
          desired_position: desiredPosition.trim() || null,
          cover_letter: coverLetter.trim() || null,
          internal_notes: internalNotes.trim() || null,
          spontaneous_type: appType,
        };
        if (initApp?.id) {
          const { error: appErr } = await supabase.from('candidate_applications').update(appPayload).eq('id', initApp.id);
          if (appErr) throw new Error('Application : ' + appErr.message);
        } else {
          const { error: appErr } = await supabase.from('candidate_applications').insert({
            ...appPayload, candidate_id: candidateId, status: 'new', onboarding_checklist: [],
          });
          if (appErr) throw new Error('Application : ' + appErr.message);
        }
      } else {
        // ── CREATE MODE ──────────────────────────────────────────────────────
        if (candidateId) {
          await supabase.from('candidates').update(profileFields).eq('id', candidateId);
        } else {
          const { data: existing } = await supabase.from('candidates').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
          if (existing) {
            candidateId = existing.id;
            await supabase.from('candidates').update(profileFields).eq('id', candidateId);
          } else {
            const { data: newCand, error: candErr } = await supabase.from('candidates').insert({
              ...profileFields, email: email.trim().toLowerCase(), status: 'active', profile_completed: false,
            }).select('id').maybeSingle();
            if (candErr) throw new Error(candErr.message);
            candidateId = newCand?.id ?? null;
          }
        }
        if (!candidateId) throw new Error('Impossible de créer le candidat.');

        // 2. Experiences
        if (experiences.length > 0) {
          const valid = experiences.filter(e => e.job_title && e.company);
          if (valid.length) await supabase.from('candidate_experiences').insert(
            valid.map(({...e}) => ({ ...e, candidate_id: candidateId, start_date: yr2date(e.start_date), end_date: e.is_current ? null : yr2date(e.end_date) }))
          );
        }

        // 3. Educations
        if (educations.length > 0) {
          const valid = educations.filter(e => e.degree && e.institution);
          if (valid.length) await supabase.from('candidate_educations').insert(
            valid.map(({...e}) => ({
              ...e,
              candidate_id: candidateId,
              start_date: yr2date(e.start_date),
              end_date: e.is_current ? null : yr2date(e.end_date),
            }))
          );
        }

        // 4. Skills
        if (skills.length > 0) {
          const masterMap = Object.fromEntries(masterSkills.map(m => [m.name, m.id]));
          await supabase.from('candidate_candidate_skills').insert(
            skills.map(s => ({ ...s, candidate_id: candidateId, skill_id: masterMap[s.name] ?? null }))
          );
        }

        // 5. Languages
        if (languages.filter(l => l.name.trim()).length > 0) {
          await supabase.from('candidate_languages').insert(
            languages.filter(l => l.name.trim()).map(l => ({ ...l, candidate_id: candidateId }))
          );
        }

        // 6. Application record
        const { error: appErr } = await supabase.from('candidate_applications').insert({
          candidate_id: candidateId,
          job_opening_id: jobOpeningId || null,
          desired_position: desiredPosition.trim() || null,
          cover_letter: coverLetter.trim() || null,
          internal_notes: internalNotes.trim() || null,
          status: 'new', spontaneous_type: appType, onboarding_checklist: [],
        });
        if (appErr) throw new Error(appErr.message);
      }

      await onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 pt-5 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserPlus size={18} />{isEdit ? 'Modifier le candidat' : 'Ajouter un candidat'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{isEdit ? `${firstName} ${lastName}` : 'Saisie manuelle d\'un nouveau candidat'}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto -mb-px">
            {ADD_TABS.map((t) => (
              <button key={t.value} onClick={() => handleTabClick(t.value)}
                disabled={autoSaving}
                className={`flex-shrink-0 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'} ${t.value === 'documents' && !savedCandidateId ? 'opacity-60' : ''}`}>
                {t.value === 'documents' && autoSaving ? '...' : t.label}
                {t.value === 'documents' && savedCandidateId && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-teal-500 inline-block align-middle" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* ── Tab: Infos personnelles ─── */}
          {tab === 'infos' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identité</p>
              <div className="grid grid-cols-2 gap-3">
                <div><FL req>Prénom</FL><input value={firstName} onChange={e=>setFirstName(e.target.value)} className={fi(!firstName&&!!error)} placeholder="Jean" /></div>
                <div><FL req>Nom</FL><input value={lastName} onChange={e=>setLastName(e.target.value)} className={fi(!lastName&&!!error)} placeholder="Dupont" /></div>
                <div><FL>Date de naissance</FL><input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} className={fi()} /></div>
                <div><FL>Genre</FL>
                  <select value={gender} onChange={e=>setGender(e.target.value)} className={fi()}>
                    <option value="">—</option><option value="M">Homme</option><option value="F">Femme</option>
                  </select>
                </div>
                <div><FL>Nationalité</FL><input value={nationality} onChange={e=>setNationality(e.target.value)} className={fi()} /></div>
                <div><FL>N° CNI / Passeport</FL><input value={nationalId} onChange={e=>setNationalId(e.target.value)} className={fi()} /></div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><FL req>Email</FL><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={fi(!email&&!!error)} placeholder="jean.dupont@email.com" /></div>
                <div><FL>Téléphone principal</FL><input value={phone} onChange={e=>setPhone(e.target.value)} className={fi()} placeholder="+237 6XX XXX XXX" /></div>
                <div><FL>Téléphone secondaire</FL><input value={phone2} onChange={e=>setPhone2(e.target.value)} className={fi()} placeholder="+237 6XX XXX XXX" /></div>
                <div><FL>Ville de résidence</FL><input value={location} onChange={e=>setLocation(e.target.value)} className={fi()} placeholder="Yaoundé" /></div>
                <div><FL>Région</FL>
                  <select value={region} onChange={e=>setRegion(e.target.value)} className={fi()}>
                    <option value="">—</option>{REGIONS_CM.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Profil professionnel</p>
              <div className="grid grid-cols-2 gap-3">
                <div><FL>Titre professionnel</FL><input value={professionalTitle} onChange={e=>setProfessionalTitle(e.target.value)} className={fi()} placeholder="Ingénieur Réservoir Senior" /></div>
                <div><FL>Poste souhaité</FL><input value={desiredPosition} onChange={e=>setDesiredPosition(e.target.value)} className={fi()} placeholder="Chef de projet, Analyste..." /></div>
                <div><FL>Prétention min (FCFA)</FL><input type="number" value={desiredSalaryMin} onChange={e=>setDesiredSalaryMin(e.target.value)} className={fi()} /></div>
                <div><FL>Prétention max (FCFA)</FL><input type="number" value={desiredSalaryMax} onChange={e=>setDesiredSalaryMax(e.target.value)} className={fi()} /></div>
                <div><FL>Disponible à partir du</FL><input type="date" value={availabilityDate} onChange={e=>setAvailabilityDate(e.target.value)} className={fi()} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><FL>LinkedIn</FL><input value={linkedinUrl} onChange={e=>setLinkedinUrl(e.target.value)} className={fi()} placeholder="https://linkedin.com/in/..." /></div>
                <div><FL>Site / Portfolio</FL><input value={portfolioUrl} onChange={e=>setPortfolioUrl(e.target.value)} className={fi()} placeholder="https://..." /></div>
              </div>
              <div><FL>Résumé / À propos</FL>
                <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={3} className={fi()+' resize-none'} placeholder="Décrivez le profil du candidat..." />
              </div>
            </div>
          )}

          {/* ── Tab: Expériences ─── */}
          {tab === 'experiences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Expériences professionnelles / Stages</h4>
                <button onClick={addExp} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold bg-teal-700 hover:bg-teal-800 transition">
                  <Plus size={13} /> Ajouter
                </button>
              </div>
              {experiences.map((exp,i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Expérience {i+1}</span>
                    <button onClick={()=>delExp(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><FL>Poste occupé *</FL><input value={exp.job_title} onChange={e=>updExp(i,'job_title',e.target.value)} className={fi()} placeholder="Ingénieur Réservoir..." /></div>
                    <div><FL>Entreprise *</FL><input value={exp.company} onChange={e=>updExp(i,'company',e.target.value)} className={fi()} /></div>
                    <div><FL>Secteur</FL><input value={exp.sector} onChange={e=>updExp(i,'sector',e.target.value)} className={fi()} placeholder="Pétrole & Gaz..." /></div>
                    <div><FL>Type contrat</FL>
                      <select value={exp.contract_type} onChange={e=>updExp(i,'contract_type',e.target.value)} className={fi()}>
                        {['CDI','CDD','Stage','Freelance','Alternance','Autre'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><FL>Ville</FL><input value={exp.location} onChange={e=>updExp(i,'location',e.target.value)} className={fi()} /></div>
                    <div><FL>Date de début</FL><input type="date" value={exp.start_date} onChange={e=>updExp(i,'start_date',e.target.value)} className={fi()} /></div>
                    {!exp.is_current && <div><FL>Date de fin</FL><input type="date" value={exp.end_date} onChange={e=>updExp(i,'end_date',e.target.value)} className={fi()} /></div>}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input type="checkbox" checked={exp.is_current} onChange={e=>updExp(i,'is_current',e.target.checked)} className="rounded" /> Poste actuel
                  </label>
                  <div><FL>Description des missions</FL>
                    <textarea value={exp.description} onChange={e=>updExp(i,'description',e.target.value)} rows={2} className={fi()+' resize-none'} placeholder="Responsabilités et réalisations..." />
                  </div>
                </div>
              ))}
              {experiences.length === 0 && (
                <button onClick={addExp} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 transition">
                  <Plus size={16}/> Ajouter une expérience
                </button>
              )}
            </div>
          )}

          {/* ── Tab: Formations ─── */}
          {tab === 'formations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Formations académiques</h4>
                <button onClick={addEdu} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold bg-teal-700 hover:bg-teal-800 transition">
                  <Plus size={13}/> Ajouter
                </button>
              </div>
              {educations.map((edu,i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Formation {i+1}</span>
                    <button onClick={()=>delEdu(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><FL>Niveau *</FL>
                      <select value={edu.education_level} onChange={e=>updEdu(i,'education_level',e.target.value)} className={fi()}>
                        <option value="">—</option>{EDU_LEVELS.map(l=><option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div><FL>Diplôme *</FL><input value={edu.degree} onChange={e=>updEdu(i,'degree',e.target.value)} className={fi()} placeholder="Master, Licence, BTS..." /></div>
                    <div><FL>Établissement *</FL><input value={edu.institution} onChange={e=>updEdu(i,'institution',e.target.value)} className={fi()} placeholder="ENSP, Univ. de Yaoundé..." /></div>
                    <div><FL>Domaine d'études</FL><input value={edu.field_of_study} onChange={e=>updEdu(i,'field_of_study',e.target.value)} className={fi()} placeholder="Génie Pétrolier..." /></div>
                    <div><FL>Pays</FL><input value={edu.country} onChange={e=>updEdu(i,'country',e.target.value)} className={fi()} /></div>
                    <div><FL>Ville</FL><input value={edu.location} onChange={e=>updEdu(i,'location',e.target.value)} className={fi()} /></div>
                    <div><FL>Année début</FL><input type="number" value={date2yr(edu.start_date)} onChange={e=>updEdu(i,'start_date',e.target.value)} className={fi()} placeholder="2018" min="1950" max="2030" /></div>
                    {!edu.is_current && <div><FL>Année fin</FL><input type="number" value={date2yr(edu.end_date)} onChange={e=>updEdu(i,'end_date',e.target.value)} className={fi()} placeholder="2022" min="1950" max="2030" /></div>}
                    <div><FL>Mention</FL><input value={edu.grade} onChange={e=>updEdu(i,'grade',e.target.value)} className={fi()} placeholder="Très bien, Bien..." /></div>
                    <div className="col-span-2"><FL>Description / Spécialisation</FL>
                      <textarea value={edu.description} onChange={e=>updEdu(i,'description',e.target.value)} rows={2} className={fi()+' resize-none'} placeholder="Spécialisation, mémoire, projet de fin d'études..." />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input type="checkbox" checked={edu.is_current} onChange={e=>updEdu(i,'is_current',e.target.checked)} className="rounded" /> En cours
                  </label>
                </div>
              ))}
              {educations.length === 0 && (
                <button onClick={addEdu} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 transition">
                  <Plus size={16}/> Ajouter une formation
                </button>
              )}
            </div>
          )}

          {/* ── Tab: Compétences ─── */}
          {tab === 'competences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Compétences ({skills.length} sélectionnée{skills.length > 1 ? 's' : ''})</h4>
              </div>
              <input value={skillSearch} onChange={e=>setSkillSearch(e.target.value)} className={fi()} placeholder="Rechercher dans le référentiel..." />
              {/* Master skills picker grouped by category */}
              {['technical','soft','language','certification','other'].map(cat => {
                const f = skillSearch.toLowerCase();
                const list = masterSkills.filter(m => m.category === cat && (!f || m.name.toLowerCase().includes(f)));
                if (!list.length) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{CAT_LABELS[cat] ?? cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {list.map(ms => (
                        <button key={ms.id} type="button" onClick={()=>toggleSkill(ms)}
                          title={ms.description ?? ms.name}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedSkillNames.has(ms.name) ? 'bg-teal-50 border-teal-500 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700'}`}>
                          {ms.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Selected skills with level */}
              {skills.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Niveaux des compétences sélectionnées</p>
                  <div className="space-y-2">
                    {skills.map(sk => (
                      <div key={sk.name} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{sk.name}</span>
                        <div className="flex gap-1">
                          {SKILL_LEVELS.map(lv => (
                            <button key={lv.value} type="button" onClick={()=>updSkillLevel(sk.name,lv.value)}
                              className={`px-2 py-0.5 text-xs rounded border transition ${sk.level===lv.value ? 'text-white border-transparent bg-teal-600' : 'border-slate-200 text-slate-500 hover:border-teal-400'}`}>
                              {lv.label.slice(0,3)}.
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={()=>delSkill(sk.name)} className="text-red-400 hover:text-red-600"><X size={13}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Custom skill not in referential */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <input value={newSkillName} onChange={e=>setNewSkillName(e.target.value)} className={fi()+' flex-1'}
                  placeholder="Compétence personnalisée (hors référentiel)..." onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSkill();}}} />
                <button type="button" onClick={addSkill} className="px-3 py-2.5 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition"><Plus size={16}/></button>
              </div>
            </div>
          )}

          {/* ── Tab: Langues ─── */}
          {tab === 'langues' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Langues parlées</h4>
                <button onClick={addLang} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold bg-teal-700 hover:bg-teal-800 transition">
                  <Plus size={13}/> Ajouter
                </button>
              </div>
              {languages.map((lang,i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                  <input value={lang.name} onChange={e=>updLang(i,'name',e.target.value)} className={fi()+' flex-1 bg-white'} placeholder="Français, Anglais..." />
                  <select value={lang.level} onChange={e=>updLang(i,'level',e.target.value)} className="px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white w-32">
                    {LANG_LEVELS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <button onClick={()=>delLang(i)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                </div>
              ))}
              {languages.length === 0 && (
                <button onClick={addLang} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 transition">
                  <Plus size={16}/> Ajouter une langue
                </button>
              )}
            </div>
          )}

          {/* ── Tab: Candidature ─── */}
          {tab === 'candidature' && (
            <div className="space-y-4">
              <div>
                <FL>Type de candidature</FL>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(SPONTANEOUS_TYPE_LABELS) as [SpontaneousType, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={()=>setAppType(val)}
                      className={`p-3 rounded-xl border text-sm font-medium transition text-left ${appType===val ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* ── Recommandeur (visible seulement si type = recommande) ── */}
              {appType === 'recommande' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus size={13} /> Informations du recommandeur
                  </p>
                  <div>
                    <FL>Type de recommandeur</FL>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRecommenderType('internal')}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition ${recommenderType === 'internal' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}>
                        Agent SNH (interne)
                      </button>
                      <button type="button" onClick={() => setRecommenderType('external')}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition ${recommenderType === 'external' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}>
                        Personnalité extérieure
                      </button>
                    </div>
                  </div>
                  <div>
                    <FL>{recommenderType === 'internal' ? 'Nom de l\'agent SNH' : 'Nom du recommandeur'}</FL>
                    <input value={recommenderName} onChange={e => setRecommenderName(e.target.value)} className={fi()} placeholder={recommenderType === 'internal' ? 'Ex : Jean MBELLA, Chef de service...' : 'Ex : Dr. Martin BIYA...'} />
                  </div>
                  <div>
                    <FL>{recommenderType === 'internal' ? 'Contact (email / poste)' : 'Organisation / Contact'}</FL>
                    <input value={recommenderContact} onChange={e => setRecommenderContact(e.target.value)} className={fi()} placeholder={recommenderType === 'internal' ? 'Email professionnel ou extension interne' : 'Société, titre ou téléphone'} />
                  </div>
                </div>
              )}

              <div>
                <FL>Offre d'emploi associée (optionnel)</FL>
                <select value={jobOpeningId} onChange={e=>setJobOpeningId(e.target.value)} className={fi()}>
                  <option value="">— Candidature spontanée (sans offre) —</option>
                  {jobs.map(j=><option key={j.id} value={j.id}>{j.title} ({j.reference})</option>)}
                </select>
              </div>
              <div>
                <FL>Source / Provenance</FL>
                <select value={source} onChange={e=>setSource(e.target.value)} className={fi()}>
                  <option value="spontaneous">Candidature spontanée</option>
                  <option value="referral">Recommandation interne</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="job_board">Job board</option>
                  <option value="school">Partenariat école</option>
                  <option value="portal">Portail candidats</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div><FL>Lettre de motivation / Présentation</FL>
                <textarea value={coverLetter} onChange={e=>setCoverLetter(e.target.value)} rows={5}
                  className={fi()+' resize-none'} placeholder="Résumé du profil ou lettre de motivation..." />
              </div>
              <div><FL>Notes RH internes</FL>
                <textarea value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} rows={3}
                  className={fi()+' resize-none'} placeholder="Contexte, recommandations, observations..." />
              </div>
            </div>
          )}

          {/* ── Tab: Documents ─── */}
          {tab === 'documents' && (
            savedCandidateId ? (
              <AdminDocumentsTab
                candidateId={savedCandidateId}
                initialDocs={[]}
                onRefresh={async () => {}}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                {autoSaving ? (
                  <>
                    <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-slate-500">Enregistrement du profil en cours...</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto">
                      <FileText size={24} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Enregistrement requis</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Remplissez au minimum le prénom, le nom et l'email, puis cliquez ci-dessous pour activer l'onglet documents.</p>
                    </div>
                    <button onClick={async () => { const id = await ensureCandidateSaved(); if (id) setTab('documents'); }}
                      disabled={autoSaving}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50 transition">
                      <Upload size={14} /> Enregistrer le profil et accéder aux documents
                    </button>
                  </>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-600">
            Fermer
          </button>
          <div className="flex items-center gap-2">
            {tabIdx > 0 && (
              <button onClick={() => handleTabClick(ADD_TABS[tabIdx-1].value)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-600">
                Précédent
              </button>
            )}
            {tab === 'documents' ? (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50 transition">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <CheckCircle size={15}/>}
                {saving ? 'Finalisation...' : 'Finaliser la création'}
              </button>
            ) : tabIdx < ADD_TABS.length - 1 ? (
              <button onClick={() => handleTabClick(ADD_TABS[tabIdx+1].value)} disabled={autoSaving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50 transition">
                {autoSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Suivant <ChevronRight size={15}/></>}
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50 transition">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <CheckCircle size={15}/>}
                {saving ? 'Enregistrement...' : 'Créer le candidat'}
              </button>
            )}
          </div>
        </div>
      </div>
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

// ── Admin Documents Tab ───────────────────────────────────────────────────
function AdminDocumentsTab({ candidateId, initialDocs, onRefresh }: {
  candidateId: string;
  initialDocs: CandDoc[];
  onRefresh: (id: string) => Promise<void>;
}) {
  const [docs, setDocs] = useState<CandDoc[]>(initialDocs);
  const [selectedType, setSelectedType] = useState('cv');
  const [expirationDate, setExpirationDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const expiredDocs = docs.filter(d => docExpiryStatus(d.expiration_date) === 'expired');
  const soonDocs = docs.filter(d => docExpiryStatus(d.expiration_date) === 'soon');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Fichier trop volumineux (max 10 Mo)'); e.target.value = ''; return; }
    setError(''); setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${candidateId}/${selectedType}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('candidates-documents').upload(path, file, { upsert: false });
    if (upErr) { setError('Erreur upload : ' + upErr.message); setUploading(false); e.target.value = ''; return; }
    const { data: urlData } = supabase.storage.from('candidates-documents').getPublicUrl(path);
    const { data: docData } = await supabase.from('candidate_documents').insert({
      candidate_id: candidateId, type: selectedType, file_name: file.name,
      file_url: urlData.publicUrl, file_size: file.size,
      expiration_date: expirationDate || null,
    }).select().maybeSingle();
    if (docData) setDocs([docData as CandDoc, ...docs]);
    setUploading(false); setExpirationDate(''); e.target.value = '';
    await onRefresh(candidateId);
  };

  const handleDelete = async (doc: CandDoc) => {
    setDeleting(doc.id);
    const parts = doc.file_url.split('/candidates-documents/');
    if (parts[1]) await supabase.storage.from('candidates-documents').remove([decodeURIComponent(parts[1])]);
    await supabase.from('candidate_documents').delete().eq('id', doc.id);
    setDocs(docs.filter(d => d.id !== doc.id));
    setDeleting(null);
    await onRefresh(candidateId);
  };

  return (
    <div className="space-y-4">
      {expiredDocs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700"><span className="font-semibold">Documents expirés : </span>{expiredDocs.map(d => DOC_TYPES.find(t => t.value === d.type)?.label ?? d.type).join(', ')}</p>
        </div>
      )}
      {soonDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700"><span className="font-semibold">Expirent bientôt : </span>{soonDocs.map(d => DOC_TYPES.find(t => t.value === d.type)?.label ?? d.type).join(', ')}</p>
        </div>
      )}

      {/* Required docs banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800">Documents requis par la SNH</p>
          <p className="text-xs text-amber-700 mt-0.5">Documents minimum requis : CV, diplômes, CNI ou Passeport, attestations d'emploi, certificat de travail, extrait de casier judiciaire.</p>
        </div>
      </div>

      {/* Upload form */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Ajouter un document</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type *</label>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none">
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date d'expiration</label>
            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
        </div>
        <label className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition bg-teal-700 hover:bg-teal-800 ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {uploading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi en cours...</>
            : <><Upload size={14} />Choisir un fichier et téléverser</>}
          <input type="file" className="hidden" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFile} />
        </label>
        <p className="text-xs text-slate-400 mt-1.5 text-center">PDF, Word, JPG, PNG — max 10 Mo</p>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Documents ({docs.length})</p>
        </div>
        {docs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            <FileText size={28} className="mx-auto mb-2 opacity-30" />Aucun document
          </div>
        ) : (
          docs.map(doc => {
            const expStatus = docExpiryStatus(doc.expiration_date);
            return (
              <div key={doc.id} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ${expStatus === 'expired' ? 'bg-red-50' : expStatus === 'soon' ? 'bg-amber-50' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${expStatus === 'expired' ? 'bg-red-100' : expStatus === 'soon' ? 'bg-amber-100' : 'bg-teal-50'}`}>
                  <FileText size={14} className={expStatus === 'expired' ? 'text-red-600' : expStatus === 'soon' ? 'text-amber-600' : 'text-teal-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-400">{DOC_TYPES.find(d => d.value === doc.type)?.label ?? doc.type}{doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''} · {fmtDate(doc.uploaded_at)}</p>
                  {doc.expiration_date && (
                    <p className={`text-xs font-semibold ${expStatus === 'expired' ? 'text-red-600' : expStatus === 'soon' ? 'text-amber-600' : 'text-slate-400'}`}>
                      {expStatus === 'expired' ? '⚠ Expiré le ' : expStatus === 'soon' ? '⚠ Expire le ' : 'Expire le '}{fmtDate(doc.expiration_date)}
                    </p>
                  )}
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition">
                  <Eye size={14} />
                </a>
                <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                  {deleting === doc.id ? <div className="w-3.5 h-3.5 border border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Candidate Detail Modal ────────────────────────────────────────────────
function CandidateDetailModal({ candidate: c, onClose, onRefresh, onDelete, onDownloadDoc, onEdit }: {
  candidate: Candidate; onClose: () => void;
  onRefresh: (id: string) => Promise<void>;
  onDelete: (id: string) => void; onDownloadDoc: (doc: CandDoc) => void;
  onEdit: (c: Candidate) => void;
}) {
  type Tab = 'profile' | 'experiences' | 'education' | 'skills' | 'documents' | 'pipeline' | 'onboarding';
  const [tab, setTab] = useState<Tab>('pipeline');
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      <div className="bg-white rounded-2xl w-full max-w-5xl my-4 shadow-2xl relative">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(c)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-lg transition"
            >
              <Pencil size={12} /> Modifier
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={22} /></button>
          </div>
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
                {c.source && <InfoItem icon={<Globe size={13} />} label="Source" value={
                  { spontaneous: 'Spontanée', referral: 'Recommandation', linkedin: 'LinkedIn',
                    job_board: 'Job board', school: 'École partenaire', portal: 'Portail candidats', other: 'Autre' }[c.source] || c.source
                } />}
              </div>
              {/* Bloc recommandeur */}
              {(app?.spontaneous_type === 'recommande' || c.source === 'referral') && (
                <div className={`rounded-xl border p-4 ${c.recommender_type === 'internal' ? 'bg-teal-50 border-teal-200' : c.recommender_type === 'external' ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus size={14} className={c.recommender_type === 'internal' ? 'text-teal-600' : c.recommender_type === 'external' ? 'text-orange-600' : 'text-amber-600'} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${c.recommender_type === 'internal' ? 'text-teal-700' : c.recommender_type === 'external' ? 'text-orange-700' : 'text-amber-700'}`}>
                      {c.recommender_type === 'internal' ? 'Recommandé par un Agent SNH' : c.recommender_type === 'external' ? 'Recommandé par une personnalité extérieure' : 'Candidature recommandée'}
                    </span>
                  </div>
                  {c.recommender_name && <p className="text-sm font-medium text-slate-800">{c.recommender_name}</p>}
                  {c.recommender_contact && <p className="text-xs text-slate-500 mt-0.5">{c.recommender_contact}</p>}
                  {!c.recommender_name && !c.recommender_contact && <p className="text-xs text-slate-400 italic">Aucun détail sur le recommandeur</p>}
                </div>
              )}
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
                        {edu.end_date && <p className="text-xs text-slate-500">{date2yr(edu.end_date)}</p>}
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
            <AdminDocumentsTab candidateId={c.id} initialDocs={c.candidate_documents ?? []} onRefresh={onRefresh} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm"><Trash2 size={14} />Supprimer le dossier</button>
          <button onClick={onClose} className="px-5 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm">Fermer</button>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center p-6 z-10">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><Trash2 size={18} className="text-red-600" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Supprimer ce dossier ?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold">{c.first_name} {c.last_name}</span> et toutes ses données (candidatures, expériences, documents) seront définitivement supprimés.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Annuler</button>
                <button onClick={() => { setShowDeleteConfirm(false); onDelete(c.id); }} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"><Trash2 size={13} />Supprimer</button>
              </div>
            </div>
          </div>
        )}
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
