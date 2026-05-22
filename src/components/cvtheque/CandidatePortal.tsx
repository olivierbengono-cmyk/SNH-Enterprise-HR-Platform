import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Briefcase, GraduationCap, Zap, FileText, CheckCircle, Plus, Trash2, ChevronRight, ChevronLeft, Upload, MapPin, Phone, Mail, Linkedin, Globe, Calendar, Building2, Award, ArrowRight, X, LogIn, UserPlus, LogOut, CreditCard as Edit3, Sparkles, TrendingUp, Clock, Star, AlertCircle, ChevronDown, ChevronUp, Lock, Eye, EyeOff, MessageSquare, BookOpen, Users, ExternalLink } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface CandidateProfile {
  id: string;
  first_name: string; last_name: string; email: string; phone: string | null;
  location: string | null; linkedin_url: string | null; portfolio_url: string | null;
  summary: string | null; desired_position: string | null;
  desired_salary_min: number | null; desired_salary_max: number | null;
  availability_date: string | null; mobility: string | null;
  profile_completed: boolean;
}
interface JobOpening {
  id: string; title: string; reference: string; contract_type: string;
  location: string; description: string; requirements: string;
  required_skills: string[]; nice_to_have_skills: string[];
  min_experience_years: number; education_level: string | null;
  publication_date: string; closing_date: string;
}
interface JobMatch {
  id: string; job_opening_id: string; match_score: number;
  skill_match_score: number; experience_match_score: number; education_match_score: number;
  matched_skills: string[]; missing_skills: string[]; ai_summary: string | null;
  job_opening: JobOpening;
}
interface Experience {
  id?: string; job_title: string; company: string; location: string;
  start_date: string; end_date: string; is_current: boolean; description: string;
}
interface Education {
  id?: string; degree: string; field_of_study: string; institution: string;
  location: string; start_date: string; end_date: string; is_current: boolean; grade: string;
}
interface Skill {
  id?: string; name: string;
  category: 'technical' | 'soft' | 'language' | 'certification' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
interface CandidateDoc {
  id: string;
  candidate_id: string;
  type: 'cv' | 'cover_letter' | 'diploma' | 'reference' | 'other';
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_at: string;
}
interface QVCTThread {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'closed' | 'archived';
  created_at: string;
  message_count?: number;
}
interface TrainingProgram {
  id: string;
  title: string;
  code: string;
  category: string | null;
  provider: string | null;
  duration_hours: number | null;
  description: string | null;
  is_mandatory: boolean;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
];
const SKILL_CATEGORIES = [
  { value: 'technical', label: 'Technique' },
  { value: 'soft', label: 'Savoir-être' },
  { value: 'language', label: 'Langue' },
  { value: 'certification', label: 'Certification' },
  { value: 'other', label: 'Autre' },
];
const MOBILITY_OPTIONS = [
  { value: 'local', label: 'Local (même ville)' },
  { value: 'regional', label: 'Régional' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
];
const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-slate-100 text-slate-600',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-orange-100 text-orange-700',
  expert: 'bg-green-100 text-green-700',
};
const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-green-600' : s >= 60 ? 'text-orange-500' : 'text-red-500';
const SCORE_BG = (s: number) =>
  s >= 80 ? 'bg-green-50 border-green-200' : s >= 60 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-100';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}
function inp(err?: string) {
  return `w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${err ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`;
}
function Field({ label, children, error, icon, className = '' }: { label: string; children: React.ReactNode; error?: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}{label}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CandidatePortal() {
  const [view, setView] = useState<'auth' | 'dashboard' | 'profile-edit' | 'apply'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [openJobs, setOpenJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(false);

  // On mount, check if already logged in as a candidate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadCandidateProfile(session.user.id);
      }
    });
  }, []);

  const loadCandidateProfile = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase.from('candidates').select('*').eq('user_id', userId).maybeSingle();
    if (data) {
      setCandidateId(data.id);
      setProfile(data as CandidateProfile);
      await loadMatches(data.id);
      setView('dashboard');
    }
    setLoading(false);
  };

  const loadMatches = async (cid: string) => {
    const { data } = await supabase
      .from('candidate_job_matches')
      .select('*, job_opening:job_openings(*)')
      .eq('candidate_id', cid)
      .order('match_score', { ascending: false });
    if (data) setMatches(data as unknown as JobMatch[]);

    // Also load all open jobs
    const { data: jobs } = await supabase
      .from('job_openings')
      .select('*')
      .eq('status', 'open')
      .order('publication_date', { ascending: false });
    if (jobs) setOpenJobs(jobs as JobOpening[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCandidateId(null); setProfile(null); setMatches([]); setOpenJobs([]);
    setView('auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoSNH.png" alt="SNH" className="h-9 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <p className="text-white font-bold text-base leading-tight">Portail Candidats</p>
              <p className="text-white/50 text-xs">SNH — Société Nationale des Hydrocarbures</p>
            </div>
          </div>
          {profile && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                {[
                  { id: 'dashboard', label: 'Accueil' },
                  { id: 'profile-edit', label: 'Mon profil' },
                ].map(v => (
                  <button key={v.id} onClick={() => setView(v.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v.id ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                  {profile.first_name[0]}{profile.last_name[0]}
                </div>
                <span className="text-white text-sm hidden sm:block">{profile.first_name}</span>
              </div>
              <button onClick={handleLogout} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
                <LogOut size={17} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {view === 'auth' && <AuthView onAuth={loadCandidateProfile} authMode={authMode} setAuthMode={setAuthMode} />}
        {view === 'dashboard' && profile && <DashboardView profile={profile} matches={matches} openJobs={openJobs} onEditProfile={() => setView('profile-edit')} candidateId={candidateId!} reloadMatches={() => loadMatches(candidateId!)} />}
        {view === 'profile-edit' && profile && candidateId && <ProfileEditView candidateId={candidateId} profile={profile} onSaved={(p) => { setProfile(p); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
      </div>
    </div>
  );
}

// ── Auth View ─────────────────────────────────────────────────────────────────
function AuthView({ onAuth, authMode, setAuthMode }: { onAuth: (uid: string) => void; authMode: 'login' | 'register'; setAuthMode: (m: 'login' | 'register') => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (authMode === 'register') {
        if (!firstName.trim() || !lastName.trim()) { setError('Prénom et nom requis'); setLoading(false); return; }
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        if (data.user) {
          // Create candidate record linked to this user
          const { error: candErr } = await supabase.from('candidates').insert({
            user_id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email,
            profile_completed: false,
            status: 'active',
            source: 'direct',
          });
          if (candErr) throw candErr;
          onAuth(data.user.id);
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        if (data.user) onAuth(data.user.id);
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-center pt-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-teal-800 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {authMode === 'login' ? <LogIn size={28} className="text-white" /> : <UserPlus size={28} className="text-white" />}
          </div>
          <h2 className="text-white text-xl font-bold">{authMode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
          <p className="text-white/60 text-sm mt-1">{authMode === 'login' ? 'Accédez à votre espace candidat' : 'Rejoignez la CVthèque SNH'}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {authMode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom *">
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inp()} placeholder="Jean" required />
              </Field>
              <Field label="Nom *">
                <input value={lastName} onChange={e => setLastName(e.target.value)} className={inp()} placeholder="Dupont" required />
              </Field>
            </div>
          )}
          <Field label="Email" icon={<Mail size={14} />}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp()} placeholder="votre@email.cm" required />
          </Field>
          <Field label="Mot de passe" icon={<Lock size={14} />}>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className={inp() + ' pr-10'} placeholder="••••••••" required minLength={6} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {authMode === 'register' && <p className="text-xs text-slate-400 mt-1">Minimum 6 caractères</p>}
          </Field>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-60 transition font-semibold flex items-center justify-center gap-2 mt-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
              authMode === 'login' ? <><LogIn size={17} /> Se connecter</> : <><UserPlus size={17} /> Créer mon compte</>}
          </button>
          <div className="text-center pt-2">
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm text-teal-700 hover:text-teal-900 font-medium">
              {authMode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard View ────────────────────────────────────────────────────────────
function DashboardView({ profile, matches, openJobs, onEditProfile, candidateId, reloadMatches }: {
  profile: CandidateProfile; matches: JobMatch[]; openJobs: JobOpening[];
  onEditProfile: () => void; candidateId: string; reloadMatches: () => void;
}) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [profileCounts, setProfileCounts] = useState({ experiences: 0, educations: 0, skills: 0, documents: 0 });
  const [qvctThreads, setQvctThreads] = useState<QVCTThread[]>([]);
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  useEffect(() => {
    const loadCounts = async () => {
      const [expRes, eduRes, skRes, docRes] = await Promise.all([
        supabase.from('candidate_experiences').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
        supabase.from('candidate_educations').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
        supabase.from('candidate_candidate_skills').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
        supabase.from('candidate_documents').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
      ]);
      setProfileCounts({
        experiences: expRes.count ?? 0,
        educations: eduRes.count ?? 0,
        skills: skRes.count ?? 0,
        documents: docRes.count ?? 0,
      });
    };
    const loadQVCT = async () => {
      const { data } = await supabase
        .from('qvct_discussion_threads')
        .select('id, title, description, category, status, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setQvctThreads(data as QVCTThread[]);
    };
    const loadTrainings = async () => {
      const { data } = await supabase
        .from('training_programs')
        .select('id, title, code, category, provider, duration_hours, description, is_mandatory, status, start_date, end_date')
        .in('status', ['planned', 'ongoing'])
        .order('start_date', { ascending: true })
        .limit(6);
      if (data) setTrainings(data as TrainingProgram[]);
    };
    loadCounts();
    loadQVCT();
    loadTrainings();
  }, [candidateId]);

  // jobs without a match score
  const topMatches = matches.filter(m => m.match_score >= 60).slice(0, 5);

  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplying(jobId);
    await supabase.from('candidate_applications').insert({
      candidate_id: candidateId,
      job_opening_id: jobId,
      desired_position: jobTitle,
      status: 'new',
    });
    setApplied(prev => new Set([...prev, jobId]));
    setApplying(null);
    reloadMatches();
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white font-bold text-xl">
              {profile.first_name[0]}{profile.last_name[0]}
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Bonjour, {profile.first_name} !</h1>
              <p className="text-white/60 text-sm">{profile.desired_position || 'Complétez votre profil pour recevoir des recommandations'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProfileCompletion
              profile={profile}
              hasExperiences={profileCounts.experiences > 0}
              hasEducations={profileCounts.educations > 0}
              hasSkills={profileCounts.skills > 0}
              hasDocuments={profileCounts.documents > 0}
            />
            <button onClick={onEditProfile}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-xl hover:bg-slate-50 transition text-sm font-medium">
              <Edit3 size={15} /> Modifier mon profil
            </button>
          </div>
        </div>
      </div>

      {!profile.profile_completed && (
        <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-200 font-semibold text-sm">Profil incomplet</p>
            <p className="text-amber-300/80 text-xs mt-0.5">Complétez vos expériences, formations et compétences pour obtenir vos scores de matching IA avec les offres.</p>
          </div>
        </div>
      )}

      {/* IA Matching section */}
      {topMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Offres recommandées par l'IA</h2>
              <p className="text-white/50 text-xs">Analysées en fonction de vos compétences et expériences</p>
            </div>
          </div>
          <div className="space-y-3">
            {topMatches.map(match => {
              const job = match.job_opening;
              const isOpen = expandedMatch === match.id;
              const alreadyApplied = applied.has(job.id);
              return (
                <div key={match.id} className={`rounded-2xl border overflow-hidden transition-all ${SCORE_BG(match.match_score)}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-slate-900">{job.title}</h3>
                          <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">{job.contract_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                          <span className="flex items-center gap-1"><Calendar size={11} />Clôture {fmtDate(job.closing_date)}</span>
                        </div>
                      </div>
                      {/* Score ring */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative w-16 h-16">
                          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.9" fill="none"
                              stroke={match.match_score >= 80 ? '#16a34a' : match.match_score >= 60 ? '#ea580c' : '#dc2626'}
                              strokeWidth="3" strokeDasharray={`${match.match_score} 100`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-black ${SCORE_COLOR(match.match_score)}`}>{match.match_score}%</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">Adéquation</span>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {[
                        { label: 'Compétences', value: match.skill_match_score },
                        { label: 'Expérience', value: match.experience_match_score },
                        { label: 'Formation', value: match.education_match_score },
                      ].map(s => (
                        <div key={s.label} className="bg-white/60 rounded-lg p-2 text-center">
                          <p className={`text-base font-black ${SCORE_COLOR(s.value)}`}>{s.value}%</p>
                          <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4">
                      <button onClick={() => setExpandedMatch(isOpen ? null : match.id)}
                        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        {isOpen ? 'Moins de détails' : 'Voir l\'analyse IA'}
                      </button>
                      {alreadyApplied ? (
                        <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                          <CheckCircle size={15} /> Candidature envoyée
                        </span>
                      ) : (
                        <button onClick={() => handleApply(job.id, job.title)} disabled={applying === job.id}
                          className="flex items-center gap-2 px-4 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 text-sm font-medium transition disabled:opacity-60">
                          {applying === job.id ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={14} />}
                          Postuler
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded IA analysis */}
                  {isOpen && (
                    <div className="border-t border-current/10 bg-white/50 p-5 space-y-4">
                      {match.ai_summary && (
                        <div className="flex gap-3">
                          <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles size={13} className="text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Analyse IA</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{match.ai_summary}</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {match.matched_skills.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 uppercase mb-2 flex items-center gap-1">
                              <CheckCircle size={11} /> Compétences matchées
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {match.matched_skills.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {match.missing_skills.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1">
                              <X size={11} /> Compétences manquantes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {match.missing_skills.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Profil du poste</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
                        {job.required_skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.required_skills.map(s => (
                              <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full border">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All open jobs */}
      <section>
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Briefcase size={18} className="text-teal-400" />
          Toutes les offres ouvertes
          <span className="text-sm font-normal text-white/50">({openJobs.length} offres)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {openJobs.map(job => {
            const m = matches.find(x => x.job_opening_id === job.id);
            const alreadyApplied = applied.has(job.id);
            return (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded-full">{job.contract_type}</span>
                    </div>
                  </div>
                  {m && (
                    <span className={`text-sm font-black ml-2 ${SCORE_COLOR(m.match_score)}`}>{m.match_score}%</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">{job.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {job.required_skills?.slice(0, 3).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">{s}</span>
                  ))}
                  {(job.required_skills?.length || 0) > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">+{job.required_skills.length - 3}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={10} />Clôture {fmtDate(job.closing_date)}
                  </span>
                  {alreadyApplied ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                      <CheckCircle size={12} /> Postulé
                    </span>
                  ) : (
                    <button onClick={() => handleApply(job.id, job.title)} disabled={applying === job.id}
                      className="text-xs px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition font-medium flex items-center gap-1 disabled:opacity-60">
                      {applying === job.id ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={11} />}
                      Postuler
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Formations SNH disponibles ────────────────────────────────────── */}
      {trainings.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Formations disponibles</h2>
              <p className="text-white/50 text-xs">Programmes de formation ouverts par la SNH</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map(tr => (
              <div key={tr.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug flex-1">{tr.title}</h3>
                  {tr.is_mandatory && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Obligatoire</span>
                  )}
                </div>
                {tr.code && <p className="text-xs text-slate-400 mb-2 font-mono">{tr.code}</p>}
                {tr.description && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3 flex-1">{tr.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {tr.category && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full capitalize">{tr.category}</span>
                  )}
                  {tr.duration_hours && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
                      <Clock size={10} />{tr.duration_hours}h
                    </span>
                  )}
                  {tr.provider && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{tr.provider}</span>
                  )}
                </div>
                {(tr.start_date || tr.end_date) && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <Calendar size={10} />
                    {tr.start_date ? fmtDate(tr.start_date) : '—'}
                    {tr.end_date ? <> → {fmtDate(tr.end_date)}</> : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Discussions QVCT ─────────────────────────────────────────────── */}
      {qvctThreads.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Discussions QVCT</h2>
              <p className="text-white/50 text-xs">Qualité de vie et conditions de travail — discussions ouvertes</p>
            </div>
          </div>
          <div className="space-y-3">
            {qvctThreads.map(thread => {
              const isOpen = expandedThread === thread.id;
              const catColors: Record<string, string> = {
                conditions_travail: 'bg-orange-100 text-orange-700',
                relations: 'bg-blue-100 text-blue-700',
                organisation: 'bg-teal-100 text-teal-700',
                sante: 'bg-green-100 text-green-700',
                autre: 'bg-slate-100 text-slate-600',
              };
              const catLabels: Record<string, string> = {
                conditions_travail: 'Conditions de travail',
                relations: 'Relations',
                organisation: 'Organisation',
                sante: 'Santé',
                autre: 'Autre',
              };
              return (
                <div key={thread.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedThread(isOpen ? null : thread.id)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare size={16} className="text-orange-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white font-semibold text-sm">{thread.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColors[thread.category] ?? 'bg-slate-100 text-slate-600'}`}>
                          {catLabels[thread.category] ?? thread.category}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs">{fmtDate(thread.created_at)}</p>
                    </div>
                    {isOpen ? <ChevronUp size={15} className="text-white/40 mt-1 flex-shrink-0" /> : <ChevronDown size={15} className="text-white/40 mt-1 flex-shrink-0" />}
                  </button>
                  {isOpen && thread.description && (
                    <div className="px-4 pb-4 pt-0 border-t border-white/10">
                      <p className="text-white/70 text-sm leading-relaxed mt-3">{thread.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Profile completion indicator ───────────────────────────────────────────────
function ProfileCompletion({ profile, hasExperiences, hasEducations, hasSkills, hasDocuments }: {
  profile: CandidateProfile;
  hasExperiences: boolean;
  hasEducations: boolean;
  hasSkills: boolean;
  hasDocuments: boolean;
}) {
  const score = [
    profile.phone,
    profile.location,
    profile.summary,
    profile.desired_position,
    profile.availability_date,
    hasExperiences ? 'ok' : null,
    hasEducations ? 'ok' : null,
    hasSkills ? 'ok' : null,
    hasDocuments ? 'ok' : null,
  ].filter(Boolean).length;
  const pct = Math.round((score / 9) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-teal-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white/60 text-xs">{pct}% profil</span>
    </div>
  );
}

// ── Profile Edit View ─────────────────────────────────────────────────────────
function ProfileEditView({ candidateId, profile: initialProfile, onSaved, onCancel }: {
  candidateId: string; profile: CandidateProfile; onSaved: (p: CandidateProfile) => void; onCancel: () => void;
}) {
  const STEPS = ['Infos personnelles', 'Expériences', 'Mon parcours', 'Compétences', 'Documents'];
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ ...initialProfile });
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [documents, setDocuments] = useState<CandidateDoc[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [expRes, eduRes, skRes, docRes] = await Promise.all([
        supabase.from('candidate_experiences').select('*').eq('candidate_id', candidateId).order('start_date', { ascending: false }),
        supabase.from('candidate_educations').select('*').eq('candidate_id', candidateId).order('end_date', { ascending: false }),
        supabase.from('candidate_candidate_skills').select('*').eq('candidate_id', candidateId),
        supabase.from('candidate_documents').select('*').eq('candidate_id', candidateId).order('uploaded_at', { ascending: false }),
      ]);
      setExperiences((expRes.data || []) as Experience[]);
      setEducations((eduRes.data || []) as Education[]);
      setSkills((skRes.data || []) as Skill[]);
      setDocuments((docRes.data || []) as CandidateDoc[]);
      setLoadingData(false);
    };
    load();
  }, [candidateId]);

  const saveAll = async () => {
    setSaving(true);
    setSaveError(null);

    // Update candidate profile using user_id for RLS compatibility
    const { error: profileErr } = await supabase.from('candidates').update({
      first_name: profile.first_name, last_name: profile.last_name,
      phone: profile.phone || null, location: profile.location || null,
      linkedin_url: profile.linkedin_url || null, portfolio_url: profile.portfolio_url || null,
      summary: profile.summary || null, desired_position: profile.desired_position || null,
      desired_salary_min: profile.desired_salary_min || null, desired_salary_max: profile.desired_salary_max || null,
      availability_date: profile.availability_date || null, mobility: profile.mobility || null,
      profile_completed: true,
    }).eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '');

    if (profileErr) {
      setSaveError('Erreur lors de la mise à jour du profil : ' + profileErr.message);
      setSaving(false);
      return;
    }

    // Replace experiences
    const { error: delExpErr } = await supabase.from('candidate_experiences').delete().eq('candidate_id', candidateId);
    if (delExpErr) { setSaveError('Erreur expériences : ' + delExpErr.message); setSaving(false); return; }
    const validExps = experiences.filter(e => e.job_title && e.company && e.start_date);
    if (validExps.length) {
      const { error: insExpErr } = await supabase.from('candidate_experiences').insert(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validExps.map(({ id: _id, ...e }) => ({ ...e, candidate_id: candidateId, end_date: e.is_current ? null : (e.end_date || null) }))
      );
      if (insExpErr) { setSaveError('Erreur insertion expériences : ' + insExpErr.message); setSaving(false); return; }
    }

    // Replace educations
    const { error: delEduErr } = await supabase.from('candidate_educations').delete().eq('candidate_id', candidateId);
    if (delEduErr) { setSaveError('Erreur formations : ' + delEduErr.message); setSaving(false); return; }
    const validEdus = educations.filter(e => e.degree && e.institution);
    if (validEdus.length) {
      const { error: insEduErr } = await supabase.from('candidate_educations').insert(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validEdus.map(({ id: _id, ...e }) => ({ ...e, candidate_id: candidateId, end_date: e.is_current ? null : (e.end_date || null) }))
      );
      if (insEduErr) { setSaveError('Erreur insertion formations : ' + insEduErr.message); setSaving(false); return; }
    }

    // Replace skills
    const { error: delSkErr } = await supabase.from('candidate_candidate_skills').delete().eq('candidate_id', candidateId);
    if (delSkErr) { setSaveError('Erreur compétences : ' + delSkErr.message); setSaving(false); return; }
    const validSk = skills.filter(s => s.name);
    if (validSk.length) {
      const { error: insSkErr } = await supabase.from('candidate_candidate_skills').insert(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validSk.map(({ id: _id, ...s }) => ({ ...s, candidate_id: candidateId }))
      );
      if (insSkErr) { setSaveError('Erreur insertion compétences : ' + insSkErr.message); setSaving(false); return; }
    }

    setSaving(false);
    const { data } = await supabase.from('candidates').select('*').eq('id', candidateId).maybeSingle();
    if (data) onSaved(data as CandidateProfile);
  };

  if (loadingData) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step tabs */}
      <div className="flex gap-1 bg-white/10 rounded-xl p-1 mb-6">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${step === i ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-teal-800 px-8 py-5">
          <h2 className="text-white text-xl font-bold">{STEPS[step]}</h2>
        </div>
        <div className="p-8">
          {step === 0 && <PersonalInfoStep profile={profile} setProfile={setProfile} />}
          {step === 1 && <ExperiencesStep items={experiences} setItems={setExperiences} />}
          {step === 2 && <EducationsStep items={educations} setItems={setEducations} />}
          {step === 3 && <SkillsStep items={skills} setItems={setSkills} />}
          {step === 4 && <DocumentsStep candidateId={candidateId} documents={documents} setDocuments={setDocuments} />}
        </div>
        {saveError && (
          <div className="mx-8 mb-0 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
        <div className="border-t border-slate-100 px-8 py-5 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm transition">Annuler</button>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm transition"><ChevronLeft size={15} />Précédent</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={saveAll} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 disabled:opacity-60 text-sm font-medium transition">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={15} />}
              Enregistrer
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep(s => s + 1)} className="flex items-center gap-1 px-5 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 text-sm font-medium transition">Suivant <ChevronRight size={15} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalInfoStep({ profile, setProfile }: { profile: CandidateProfile; setProfile: (p: CandidateProfile) => void }) {
  const set = (k: keyof CandidateProfile, v: any) => setProfile({ ...profile, [k]: v });
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom"><input value={profile.first_name} onChange={e => set('first_name', e.target.value)} className={inp()} /></Field>
        <Field label="Nom"><input value={profile.last_name} onChange={e => set('last_name', e.target.value)} className={inp()} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Téléphone" icon={<Phone size={13} />}><input value={profile.phone || ''} onChange={e => set('phone', e.target.value)} className={inp()} placeholder="+237 6XX..." /></Field>
        <Field label="Localisation" icon={<MapPin size={13} />}><input value={profile.location || ''} onChange={e => set('location', e.target.value)} className={inp()} placeholder="Yaoundé, Cameroun" /></Field>
      </div>
      <Field label="Poste souhaité" icon={<Briefcase size={13} />}><input value={profile.desired_position || ''} onChange={e => set('desired_position', e.target.value)} className={inp()} placeholder="Ingénieur pétrolier..." /></Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Salaire min (XAF)"><input type="number" value={profile.desired_salary_min || ''} onChange={e => set('desired_salary_min', Number(e.target.value))} className={inp()} /></Field>
        <Field label="Salaire max (XAF)"><input type="number" value={profile.desired_salary_max || ''} onChange={e => set('desired_salary_max', Number(e.target.value))} className={inp()} /></Field>
        <Field label="Disponibilité" icon={<Calendar size={13} />}><input type="date" value={profile.availability_date || ''} onChange={e => set('availability_date', e.target.value)} className={inp()} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="LinkedIn" icon={<Linkedin size={13} />}><input value={profile.linkedin_url || ''} onChange={e => set('linkedin_url', e.target.value)} className={inp()} /></Field>
        <Field label="Mobilité">
          <select value={profile.mobility || 'local'} onChange={e => set('mobility', e.target.value)} className={inp()}>
            {MOBILITY_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Résumé professionnel">
        <textarea value={profile.summary || ''} onChange={e => set('summary', e.target.value)} rows={4} className={inp()} placeholder="Décrivez votre profil..." />
      </Field>
    </div>
  );
}

function ExperiencesStep({ items, setItems }: { items: Experience[]; setItems: (v: Experience[]) => void }) {
  const add = () => setItems([...items, { job_title: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' }]);
  const upd = (i: number, k: keyof Experience, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      {items.map((exp, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-slate-700 flex items-center gap-2"><Briefcase size={15} className="text-teal-600" />Expérience {i + 1}</span>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Intitulé du poste *"><input value={exp.job_title} onChange={e => upd(i, 'job_title', e.target.value)} className={inp()} placeholder="Ingénieur..." /></Field>
            <Field label="Entreprise *"><input value={exp.company} onChange={e => upd(i, 'company', e.target.value)} className={inp()} /></Field>
            <Field label="Localisation"><input value={exp.location} onChange={e => upd(i, 'location', e.target.value)} className={inp()} /></Field>
            <Field label="Date de début *"><input type="date" value={exp.start_date} onChange={e => upd(i, 'start_date', e.target.value)} className={inp()} /></Field>
            {!exp.is_current && <Field label="Date de fin"><input type="date" value={exp.end_date} onChange={e => upd(i, 'end_date', e.target.value)} className={inp()} /></Field>}
          </div>
          <label className="flex items-center gap-2 mb-3 cursor-pointer text-sm">
            <input type="checkbox" checked={exp.is_current} onChange={e => upd(i, 'is_current', e.target.checked)} className="rounded border-slate-300 text-teal-600" />
            Poste actuel
          </label>
          <Field label="Description">
            <textarea value={exp.description} onChange={e => upd(i, 'description', e.target.value)} rows={2} className={inp()} />
          </Field>
        </div>
      ))}
      <button onClick={add} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 text-sm transition">
        <Plus size={16} /> Ajouter une expérience
      </button>
    </div>
  );
}

function EducationsStep({ items, setItems }: { items: Education[]; setItems: (v: Education[]) => void }) {
  const add = () => setItems([...items, { degree: '', field_of_study: '', institution: '', location: '', start_date: '', end_date: '', is_current: false, grade: '' }]);
  const upd = (i: number, k: keyof Education, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      {items.map((edu, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-slate-700 flex items-center gap-2"><GraduationCap size={15} className="text-blue-600" />Formation {i + 1}</span>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Diplôme *"><input value={edu.degree} onChange={e => upd(i, 'degree', e.target.value)} className={inp()} placeholder="Master, Licence..." /></Field>
            <Field label="Domaine d'étude"><input value={edu.field_of_study} onChange={e => upd(i, 'field_of_study', e.target.value)} className={inp()} /></Field>
            <Field label="Établissement *"><input value={edu.institution} onChange={e => upd(i, 'institution', e.target.value)} className={inp()} /></Field>
            <Field label="Mention"><input value={edu.grade} onChange={e => upd(i, 'grade', e.target.value)} className={inp()} placeholder="Très bien..." /></Field>
            <Field label="Début"><input type="date" value={edu.start_date} onChange={e => upd(i, 'start_date', e.target.value)} className={inp()} /></Field>
            {!edu.is_current && <Field label="Fin"><input type="date" value={edu.end_date} onChange={e => upd(i, 'end_date', e.target.value)} className={inp()} /></Field>}
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm">
            <input type="checkbox" checked={edu.is_current} onChange={e => upd(i, 'is_current', e.target.checked)} className="rounded border-slate-300 text-teal-600" />
            En cours
          </label>
        </div>
      ))}
      <button onClick={add} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 text-sm transition">
        <Plus size={16} /> Ajouter une formation
      </button>
    </div>
  );
}

function SkillsStep({ items, setItems }: { items: Skill[]; setItems: (v: Skill[]) => void }) {
  const add = () => setItems([...items, { name: '', category: 'technical', level: 'intermediate' }]);
  const upd = (i: number, k: keyof Skill, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 mb-4">Listez vos compétences pour améliorer votre score de matching avec les offres.</p>
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase px-1 hidden sm:grid">
        <div className="col-span-4">Compétence</div><div className="col-span-3">Catégorie</div><div className="col-span-4">Niveau</div><div className="col-span-1" />
      </div>
      {items.map((sk, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-4"><input value={sk.name} onChange={e => upd(i, 'name', e.target.value)} className={`${inp()} text-sm`} placeholder="Python, Anglais..." /></div>
          <div className="col-span-3">
            <select value={sk.category} onChange={e => upd(i, 'category', e.target.value)} className={`${inp()} text-sm`}>
              {SKILL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-span-4">
            <div className="flex gap-1">
              {SKILL_LEVELS.map(lv => (
                <button key={lv.value} type="button" onClick={() => upd(i, 'level', lv.value)}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-all ${sk.level === lv.value ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                  {lv.label.slice(0, 3)}.
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-1 flex justify-center">
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><X size={15} /></button>
          </div>
        </div>
      ))}
      <button onClick={add} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 text-sm transition">
        <Plus size={16} /> Ajouter une compétence
      </button>
    </div>
  );
}

// ── Documents Step ─────────────────────────────────────────────────────────────
const DOC_TYPES: { value: CandidateDoc['type']; label: string; accept: string }[] = [
  { value: 'cv', label: 'CV', accept: '.pdf,.doc,.docx' },
  { value: 'cover_letter', label: 'Lettre de motivation', accept: '.pdf,.doc,.docx' },
  { value: 'diploma', label: 'Diplôme / Attestation', accept: '.pdf,.jpg,.jpeg,.png' },
  { value: 'reference', label: 'Lettre de référence', accept: '.pdf,.doc,.docx' },
  { value: 'other', label: 'Autre pièce administrative', accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx' },
];

function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function DocumentsStep({ candidateId, documents, setDocuments }: {
  candidateId: string;
  documents: CandidateDoc[];
  setDocuments: (d: CandidateDoc[]) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CandidateDoc['type']>('cv');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Fichier trop volumineux (max 10 Mo)');
      e.target.value = '';
      return;
    }

    setUploading(selectedType);
    const ext = file.name.split('.').pop();
    const path = `${candidateId}/${selectedType}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('candidates-documents')
      .upload(path, file, { upsert: false });

    if (upErr) {
      setUploadError('Erreur upload : ' + upErr.message);
      setUploading(null);
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage.from('candidates-documents').getPublicUrl(path);

    const { data: docData, error: dbErr } = await supabase.from('candidate_documents').insert({
      candidate_id: candidateId,
      type: selectedType,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
    }).select().maybeSingle();

    if (dbErr) {
      setUploadError('Erreur enregistrement : ' + dbErr.message);
    } else if (docData) {
      setDocuments([docData as CandidateDoc, ...documents]);
    }

    setUploading(null);
    e.target.value = '';
  };

  const handleDelete = async (doc: CandidateDoc) => {
    setDeleting(doc.id);
    // Extract storage path from URL
    const urlParts = doc.file_url.split('/candidates-documents/');
    if (urlParts[1]) {
      await supabase.storage.from('candidates-documents').remove([decodeURIComponent(urlParts[1])]);
    }
    await supabase.from('candidate_documents').delete().eq('id', doc.id);
    setDocuments(documents.filter(d => d.id !== doc.id));
    setDeleting(null);
  };

  const typeLabel = (t: CandidateDoc['type']) => DOC_TYPES.find(d => d.value === t)?.label ?? t;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Chargez vos pièces administratives (CNI, diplômes, CV, lettres de référence, etc.).</p>

      {/* Upload zone */}
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 space-y-4 hover:border-teal-400 transition-colors">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de document</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as CandidateDoc['type'])}
              className={inp()}
            >
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex-1 sm:pt-7">
            <label className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${uploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-teal-700 text-white hover:bg-teal-800'}`}>
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> Envoi en cours...</>
              ) : (
                <><Upload size={15} /> Choisir un fichier</>
              )}
              <input
                type="file"
                className="hidden"
                disabled={!!uploading}
                accept={DOC_TYPES.find(d => d.value === selectedType)?.accept}
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
        <p className="text-xs text-slate-400">Formats acceptés : PDF, Word, JPG, PNG — Taille max : 10 Mo</p>
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {uploadError}
          </div>
        )}
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          <FileText size={36} className="mx-auto mb-2 opacity-30" />
          Aucun document chargé
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-teal-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="px-1.5 py-0.5 bg-slate-200 rounded-full text-slate-600">{typeLabel(doc.type)}</span>
                  {doc.file_size && <span>{fmtSize(doc.file_size)}</span>}
                  <span>{fmtDate(doc.uploaded_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50 transition" title="Voir">
                  <Eye size={15} />
                </a>
                <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50" title="Supprimer">
                  {deleting === doc.id ? <div className="w-3.5 h-3.5 border border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
