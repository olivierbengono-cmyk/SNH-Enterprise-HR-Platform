import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Briefcase, GraduationCap, FileText, CheckCircle, Plus, Trash2, Upload, MapPin, Phone, Mail, Linkedin, Globe, Calendar, Building2, ArrowRight, X, LogIn, UserPlus, LogOut, Sparkles, Clock, Star, AlertCircle, ChevronDown, ChevronUp, Lock, Eye, EyeOff, MessageSquare, BookOpen, Bell, LayoutDashboard, Send, Search, Plane as PaperPlane, ChevronRight, Home, Folder, BarChart3, Settings } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface CandidateProfile {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; location: string | null; linkedin_url: string | null;
  portfolio_url: string | null; summary: string | null; desired_position: string | null;
  desired_salary_min: number | null; desired_salary_max: number | null;
  availability_date: string | null; mobility: string | null;
  profile_completed: boolean; birth_date?: string | null; gender?: string | null;
  nationality?: string | null; region?: string | null; professional_title?: string | null;
  national_id?: string | null; phone2?: string | null;
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
interface Application {
  id: string; job_opening_id: string | null; desired_position: string | null;
  cover_letter: string | null; status: string; created_at: string;
  spontaneous_type?: string | null;
  job_opening?: { id: string; title: string } | null;
}
interface Experience {
  id?: string; job_title: string; company: string; location: string;
  start_date: string; end_date: string; is_current: boolean; description: string;
  contract_type?: string; sector?: string;
}
interface Education {
  id?: string; degree: string; field_of_study: string; institution: string;
  location: string; start_date: string; end_date: string; is_current: boolean;
  grade: string; education_level?: string; country?: string;
}
interface Skill {
  id?: string; name: string;
  category: 'technical' | 'soft' | 'language' | 'certification' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
interface Language { id?: string; name: string; level: string; }
interface CandidateDoc {
  id: string; candidate_id: string;
  type: 'cv' | 'cover_letter' | 'diploma' | 'reference' | 'other';
  file_name: string; file_url: string; file_size: number | null; uploaded_at: string;
}
interface Notification {
  id: string; title: string; body: string; read: boolean; created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SNH_GREEN = '#006B3C';
const SNH_RED   = '#CE1126';
const SNH_GOLD  = '#FCD116';
/** @deprecated use SNH_GREEN */
const SNH_BLUE  = SNH_GREEN;
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
const LANG_LEVELS = ['A1','A2','B1','B2','C1','C2','Natif'];
const REGIONS_CM = ['Centre','Littoral','Ouest','Nord','Extrême-Nord','Adamaoua','Est','Sud','Nord-Ouest','Sud-Ouest'];
const SNH_DIRECTIONS = [
  'Direction Exploration & Production',
  'Direction Financière',
  'Direction Informatique & Systèmes d\'Information',
  'Direction Juridique',
  'Direction des Ressources Humaines',
  'Direction HSE (Hygiène, Sécurité, Environnement)',
  'Direction Logistique & Approvisionnement',
  'Direction des Relations Extérieures & Coopération',
  'Direction Commerciale',
  'Direction Générale',
  'Sans préférence — Au choix de la SNH',
];
const DOC_TYPES = [
  { value: 'cv', label: 'CV / Curriculum Vitae' },
  { value: 'cover_letter', label: 'Lettre de motivation' },
  { value: 'diploma', label: 'Diplôme / Attestation de diplôme' },
  { value: 'reference', label: 'Lettre de recommandation' },
  { value: 'other', label: 'Autre document' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// ── UI primitives ──────────────────────────────────────────────────────────────
function inp(err?: boolean) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white ${err ? 'border-red-300 bg-red-50' : 'border-gray-300'}`;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>;
}
function Tag({ children, variant = 'blue' }: { children: React.ReactNode; variant?: 'blue'|'green'|'amber'|'purple'|'gray'|'red' }) {
  const cls: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls[variant]}`}>{children}</span>;
}
function AppStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new:          { label: 'Soumis',         cls: 'bg-blue-50 text-blue-700' },
    reviewing:    { label: 'En examen',      cls: 'bg-amber-50 text-amber-700' },
    interview:    { label: 'Entretien',      cls: 'bg-purple-50 text-purple-700' },
    offer:        { label: 'Offre',          cls: 'bg-teal-50 text-teal-700' },
    integrated:   { label: 'Intégré(e)',     cls: 'bg-emerald-50 text-emerald-700' },
    rejected:     { label: 'Refusé(e)',      cls: 'bg-red-50 text-red-700' },
    withdrawn:    { label: 'Retiré(e)',      cls: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status] ?? map.new;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

// ── Sidebar nav item ───────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, badge, onClick }: {
  icon: React.FC<any>; label: string; active?: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${active ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span> : null}
    </button>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'bg-blue-600' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

type Section = 'dashboard' | 'profile' | 'documents' | 'jobs' | 'spontaneous' | 'applications' | 'notifications';

// ── Main component ─────────────────────────────────────────────────────────────
export default function CandidatePortal() {
  const [view, setView] = useState<'public' | 'auth' | 'portal'>('public');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [section, setSection] = useState<Section>('dashboard');
  const [loading, setLoading] = useState(false);
  const [openJobs, setOpenJobs] = useState<JobOpening[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<CandidateDoc[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  // job to apply to after auth
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  useEffect(() => {
    // Load public jobs immediately — no auth required
    supabase.from('job_openings').select('*').eq('status', 'open').order('publication_date', { ascending: false })
      .then(({ data }) => { if (data) setOpenJobs(data as JobOpening[]); });
    // Check session silently — if logged in, transition to portal view without spinner
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadPortal(session.user.id, false);
    });
  }, []);

  const loadPortal = async (userId: string, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    const { data: cand } = await supabase.from('candidates').select('*').eq('user_id', userId).maybeSingle();
    if (!cand) { setLoading(false); setView('public'); return; }
    setCandidateId(cand.id);
    setProfile(cand as CandidateProfile);

    const [expRes, eduRes, skRes, docRes, appRes, matchRes, jobRes] = await Promise.all([
      supabase.from('candidate_experiences').select('*').eq('candidate_id', cand.id).order('start_date', { ascending: false }),
      supabase.from('candidate_educations').select('*').eq('candidate_id', cand.id).order('end_date', { ascending: false }),
      supabase.from('candidate_candidate_skills').select('*').eq('candidate_id', cand.id),
      supabase.from('candidate_documents').select('*').eq('candidate_id', cand.id).order('uploaded_at', { ascending: false }),
      supabase.from('candidate_applications').select('*,job_opening:job_openings(id,title)').eq('candidate_id', cand.id).order('created_at', { ascending: false }),
      supabase.from('candidate_job_matches').select('*, job_opening:job_openings(*)').eq('candidate_id', cand.id).order('match_score', { ascending: false }),
      supabase.from('job_openings').select('*').eq('status', 'open').order('publication_date', { ascending: false }),
    ]);
    setExperiences((expRes.data || []) as Experience[]);
    setEducations((eduRes.data || []) as Education[]);
    setSkills((skRes.data || []) as Skill[]);
    setDocuments((docRes.data || []) as CandidateDoc[]);
    setApplications((appRes.data || []) as Application[]);
    setMatches((matchRes.data || []) as unknown as JobMatch[]);
    setOpenJobs((jobRes.data || []) as JobOpening[]);

    // Notifications from application history
    const notifs: Notification[] = (appRes.data || []).slice(0, 5).map((a: any, i: number) => ({
      id: String(i),
      title: i === 0 ? 'Candidature reçue' : 'Mise à jour de statut',
      body: i === 0
        ? `Votre candidature pour "${a.desired_position || a.job_opening?.title || 'ce poste'}" a bien été reçue.`
        : `Le statut de votre candidature pour "${a.desired_position || a.job_opening?.title || 'ce poste'}" a été mis à jour.`,
      read: i > 1,
      created_at: a.created_at,
    }));
    setNotifications(notifs);
    setUnreadNotifs(notifs.filter(n => !n.read).length);

    setView('portal');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('public');
    setCandidateId(null); setProfile(null);
    setApplications([]); setExperiences([]); setEducations([]);
    setSkills([]); setDocuments([]); setMatches([]); setNotifications([]);
  };

  const openAuth = (mode: 'login' | 'register' = 'login', jobId?: string) => {
    setAuthMode(mode);
    if (jobId) setPendingJobId(jobId);
    setView('auth');
  };

  const profilePct = () => {
    if (!profile) return 0;
    const checks = [
      profile.phone, profile.location, profile.summary, profile.desired_position,
      profile.availability_date, profile.professional_title,
      experiences.length > 0 ? 'ok' : null,
      educations.length > 0 ? 'ok' : null,
      skills.length > 0 ? 'ok' : null,
      documents.length > 0 ? 'ok' : null,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden p-1">
        <img src="/logoSNH.png" alt="SNH" className="h-full w-auto object-contain" />
      </div>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: SNH_GREEN }} />
      <p className="text-sm text-gray-500">Chargement de votre espace…</p>
    </div>
  );

  // ── Public landing ──
  if (view === 'public' || view === 'auth') return (
    <>
      <PublicLanding
        openJobs={openJobs}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
        onApply={(jobId) => openAuth('login', jobId)}
        loadingJobs={loading}
      />
      {view === 'auth' && (
        <AuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          onClose={() => setView('public')}
          onAuth={async (uid) => {
            setPendingJobId(null);
            await loadPortal(uid);
          }}
        />
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 sticky top-0 h-screen">
        {/* Tricolor top accent */}
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_GOLD} 50%, ${SNH_RED} 67%)` }} />
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 shadow-sm">
            <img src="/logoSNH.png" alt="SNH" className="h-7 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">SNH Cameroun</p>
            <p className="text-xs text-gray-400">Portail Recrutement</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">Mon espace</p>
          <NavItem icon={LayoutDashboard} label="Tableau de bord" active={section==='dashboard'} onClick={() => setSection('dashboard')} />
          <NavItem icon={User} label="Mon profil" active={section==='profile'} onClick={() => setSection('profile')} />
          <NavItem icon={Folder} label="Mes documents" active={section==='documents'} onClick={() => setSection('documents')} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 mt-2">Recrutement SNH</p>
          <NavItem icon={Briefcase} label="Offres d'emploi" active={section==='jobs'} onClick={() => setSection('jobs')} />
          <NavItem icon={Send} label="Candidature spontanée" active={section==='spontaneous'} onClick={() => setSection('spontaneous')} />
          <NavItem icon={FileText} label="Mes candidatures" active={section==='applications'} badge={applications.length} onClick={() => setSection('applications')} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 mt-2">Compte</p>
          <NavItem icon={Bell} label="Notifications" active={section==='notifications'} badge={unreadNotifs || undefined} onClick={() => { setSection('notifications'); setUnreadNotifs(0); }} />
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all mt-0.5">
            <LogOut size={16} /> Déconnexion
          </button>
          <button onClick={() => setView('public')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all mt-0.5">
            <Globe size={16} /> Voir les offres
          </button>
        </nav>

        {/* Footer user */}
        {profile && (
          <div className="p-3 border-t border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
              {initials(profile.first_name, profile.last_name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{profile.first_name} {profile.last_name}</p>
              <p className="text-xs text-gray-400">Candidat</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <p className="text-base font-semibold text-gray-900">{SECTION_TITLES[section]}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
              <BarChart3 size={13} className="text-green-700" />
              <span className="text-xs font-semibold text-green-800">Profil : {profilePct()}%</span>
            </div>
            {profile && (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-800">
                {initials(profile.first_name, profile.last_name)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {section === 'dashboard' && profile && (
            <DashboardSection
              profile={profile} experiences={experiences} educations={educations}
              skills={skills} documents={documents} applications={applications}
              openJobs={openJobs} matches={matches} pct={profilePct()}
              onNav={setSection} candidateId={candidateId!}
              onApplied={(app) => setApplications(prev => [app, ...prev])}
            />
          )}
          {section === 'profile' && profile && (
            <ProfileSection
              profile={profile} setProfile={setProfile}
              experiences={experiences} setExperiences={setExperiences}
              educations={educations} setEducations={setEducations}
              skills={skills} setSkills={setSkills}
              languages={languages} setLanguages={setLanguages}
              candidateId={candidateId!}
            />
          )}
          {section === 'documents' && candidateId && (
            <DocumentsSection candidateId={candidateId} documents={documents} setDocuments={setDocuments} />
          )}
          {section === 'jobs' && (
            <JobsSection openJobs={openJobs} matches={matches} candidateId={candidateId!}
              onApplied={(app) => setApplications(prev => [app, ...prev])} applications={applications} />
          )}
          {section === 'spontaneous' && profile && candidateId && (
            <SpontaneousSection candidateId={candidateId} profile={profile}
              onApplied={(app) => { setApplications(prev => [app, ...prev]); setSection('applications'); }} />
          )}
          {section === 'applications' && (
            <ApplicationsSection applications={applications} />
          )}
          {section === 'notifications' && (
            <NotificationsSection notifications={notifications} />
          )}
        </div>
      </div>
    </div>
  );
}

const SECTION_TITLES: Record<Section, string> = {
  dashboard: 'Tableau de bord',
  profile: 'Mon profil',
  documents: 'Mes documents',
  jobs: 'Offres d\'emploi SNH',
  spontaneous: 'Candidature spontanée',
  applications: 'Mes candidatures',
  notifications: 'Notifications',
};

// ── Public Landing ─────────────────────────────────────────────────────────────
function PublicLanding({ openJobs, onLogin, onRegister, onApply, loadingJobs }: {
  openJobs: JobOpening[];
  onLogin: () => void;
  onRegister: () => void;
  onApply: (jobId: string) => void;
  loadingJobs: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const filtered = openJobs.filter(j => {
    const txt = `${j.title} ${j.location} ${j.contract_type} ${j.description ?? ''}`.toLowerCase();
    return (!search || txt.includes(search.toLowerCase())) &&
           (!filterContract || j.contract_type === filterContract);
  });

  const contracts = [...new Set(openJobs.map(j => j.contract_type).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Header / Hero ── */}
      <header className="text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, #004d2b 100%)` }}>
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Gold accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${SNH_GREEN}, ${SNH_GOLD}, ${SNH_RED})` }} />

        {/* Navbar */}
        <div className="relative max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden p-1">
              <img src="/logoSNH.png" alt="SNH" className="h-full w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
            <div>
              <p className="font-extrabold text-base leading-tight tracking-wide">SNH Cameroun</p>
              <p className="text-white/60 text-xs">Société Nationale des Hydrocarbures</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 rounded-lg text-sm font-medium transition">
              <LogIn size={15} /> Connexion
            </button>
            <button onClick={onRegister}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition hover:opacity-90"
              style={{ background: SNH_GOLD, color: '#1a1a1a' }}>
              <UserPlus size={15} /> Créer un compte
            </button>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative max-w-5xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-5"
            style={{ background: `${SNH_GOLD}22`, color: SNH_GOLD, border: `1px solid ${SNH_GOLD}44` }}>
            <Sparkles size={12} /> {openJobs.length} offre{openJobs.length !== 1 ? 's' : ''} disponible{openJobs.length !== 1 ? 's' : ''}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Rejoignez la SNH<br />
            <span className="font-light text-2xl" style={{ color: `${SNH_GOLD}CC` }}>et participez à l'avenir énergétique du Cameroun</span>
          </h1>
          <p className="text-white/70 text-base max-w-2xl mx-auto mb-8">
            Découvrez nos opportunités de carrière, de stage et déposez votre candidature en quelques étapes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Poste, mot-clé, lieu..."
                className="w-full pl-9 pr-4 py-3 rounded-xl text-gray-900 text-sm outline-none shadow-sm focus:ring-2 focus:ring-green-400"
              />
            </div>
            <select value={filterContract} onChange={e => setFilterContract(e.target.value)}
              className="px-4 py-3 rounded-xl text-gray-900 text-sm outline-none bg-white shadow-sm min-w-[140px]">
              <option value="">Tous les contrats</option>
              {contracts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-8 flex-wrap">
          {[
            { label: 'Offres publiées', value: openJobs.length },
            { label: 'Types de contrats', value: contracts.length },
            { label: 'Localisation', value: 'Cameroun' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={14} style={{ color: SNH_GREEN }} />
              <span><strong className="text-gray-900">{s.value}</strong> {s.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <span>Déjà candidat ?</span>
            <button onClick={onLogin} className="font-bold hover:underline" style={{ color: SNH_GREEN }}>
              Accéder à mon espace
            </button>
          </div>
        </div>
      </div>

      {/* ── Job list ── */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {search || filterContract ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}` : 'Toutes les offres'}
          </h2>
        </div>

        {loadingJobs ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: SNH_GREEN }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucune offre ne correspond à votre recherche</p>
            <button onClick={() => { setSearch(''); setFilterContract(''); }} className="mt-3 text-sm font-semibold hover:underline" style={{ color: SNH_GREEN }}>
              Réinitialiser
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${SNH_GREEN}18` }}>
                      <Briefcase size={18} style={{ color: SNH_GREEN }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight">{job.title}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />Clôture : {fmtDate(job.closing_date)}</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: `${SNH_RED}12`, color: SNH_RED }}>{job.contract_type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                            {expandedJob === job.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            Détails
                          </button>
                          <button onClick={() => onApply(job.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-white rounded-lg text-xs font-bold transition hover:opacity-90"
                            style={{ background: SNH_GREEN }}>
                            <Send size={13} /> Postuler
                          </button>
                        </div>
                      </div>

                      {/* Skills preview */}
                      {job.required_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.required_skills.slice(0, 5).map(s => (
                            <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{s}</span>
                          ))}
                          {job.required_skills.length > 5 && (
                            <span className="text-xs text-gray-400">+{job.required_skills.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedJob === job.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                    {job.description && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase mb-1.5">Description du poste</p>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                      </div>
                    )}
                    {job.requirements && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase mb-1.5">Profil recherché</p>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.requirements}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {job.min_experience_years > 0 && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <p className="text-gray-500 mb-0.5">Expérience</p>
                          <p className="font-semibold text-gray-900">{job.min_experience_years} an{job.min_experience_years > 1 ? 's' : ''} min.</p>
                        </div>
                      )}
                      {job.education_level && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <p className="text-gray-500 mb-0.5">Formation</p>
                          <p className="font-semibold text-gray-900">{job.education_level}</p>
                        </div>
                      )}
                      <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                        <p className="text-gray-500 mb-0.5">Référence</p>
                        <p className="font-semibold text-gray-900">{job.reference}</p>
                      </div>
                    </div>
                    <button onClick={() => onApply(job.id)}
                      className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold transition hover:opacity-90"
                      style={{ background: SNH_GREEN }}>
                      <Send size={15} /> Postuler à cette offre
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Spontaneous CTA */}
        <div className="mt-8 rounded-2xl overflow-hidden border border-green-200 bg-white">
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${SNH_GREEN}, ${SNH_GOLD}, ${SNH_RED})` }} />
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${SNH_GREEN}18` }}>
              <Send size={22} style={{ color: SNH_GREEN }} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Vous ne trouvez pas votre bonheur ?</h3>
            <p className="text-gray-500 text-sm mb-5">Envoyez une candidature spontanée ou recommandée — nous la garderons dans notre vivier de talents.</p>
            <button onClick={onRegister}
              className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold text-sm transition hover:opacity-90"
              style={{ background: SNH_GREEN }}>
              <UserPlus size={16} /> Déposer une candidature spontanée
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-white" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, #004d2b 100%)` }}>
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${SNH_GREEN}, ${SNH_GOLD}, ${SNH_RED})` }} />
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-white/60 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logoSNH.png" alt="SNH" className="h-5 w-auto" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
            <p>© {new Date().getFullYear()} Société Nationale des Hydrocarbures — Tous droits réservés</p>
          </div>
          <p className="text-white/40">Portail de recrutement officiel</p>
        </div>
      </footer>
    </div>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────────────────
function AuthModal({ onAuth, authMode, setAuthMode, onClose }: {
  onAuth: (uid: string) => void;
  authMode: 'login' | 'register';
  setAuthMode: (m: 'login' | 'register') => void;
  onClose: () => void;
}) {
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
          const { error: candErr } = await supabase.from('candidates').insert({
            user_id: data.user.id, first_name: firstName, last_name: lastName,
            email, profile_completed: false, status: 'active', source: 'direct',
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        {/* Tricolor top bar */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_GOLD} 50%, ${SNH_RED} 67%)` }} />
        {/* Header */}
        <div className="px-6 pt-6 pb-5 text-center relative" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, #004d2b 100%)` }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
            <X size={14} className="text-white" />
          </button>
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md overflow-hidden">
            <img src="/logoSNH.png" alt="SNH" className="h-10 w-auto" onError={e => {
              const el = e.target as HTMLImageElement;
              el.style.display = 'none';
              el.parentElement!.innerHTML = authMode === 'login'
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006B3C" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006B3C" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>';
            }} />
          </div>
          <h2 className="text-white text-base font-bold">{authMode === 'login' ? 'Connexion à mon espace' : 'Créer mon compte candidat'}</h2>
          <p className="text-white/60 text-xs mt-0.5">Portail Recrutement SNH Cameroun</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {authMode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl>Prénom *</Lbl><input value={firstName} onChange={e => setFirstName(e.target.value)} className={inp()} placeholder="Jean" required /></div>
              <div><Lbl>Nom *</Lbl><input value={lastName} onChange={e => setLastName(e.target.value)} className={inp()} placeholder="Dupont" required /></div>
            </div>
          )}
          <div><Lbl>Email</Lbl><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp()} placeholder="votre@email.cm" required /></div>
          <div>
            <Lbl>Mot de passe</Lbl>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={inp() + ' pr-10'} placeholder="••••••••" required minLength={6} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {authMode === 'register' && (
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Lock size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
              Vos données sont traitées de manière confidentielle conformément à la politique de recrutement SNH.
            </p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition text-sm"
            style={{ background: SNH_GREEN }}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
              authMode === 'login' ? <><LogIn size={15} /> Se connecter</> : <><UserPlus size={15} /> Créer mon compte</>}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm font-semibold transition hover:underline" style={{ color: SNH_GREEN }}>
              {authMode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardSection({ profile, experiences, educations, skills, documents, applications, openJobs, matches, pct, onNav, candidateId, onApplied }: {
  profile: CandidateProfile; experiences: Experience[]; educations: Education[];
  skills: Skill[]; documents: CandidateDoc[]; applications: Application[];
  openJobs: JobOpening[]; matches: JobMatch[]; pct: number; onNav: (s: Section) => void;
  candidateId: string; onApplied: (app: Application) => void;
}) {
  const completionItems = [
    { label: 'Informations personnelles', done: !!(profile.phone && profile.location), pct: profile.phone && profile.location ? 100 : 50 },
    { label: 'Formations académiques', done: educations.length > 0, pct: educations.length > 0 ? 100 : 0 },
    { label: 'Expériences professionnelles', done: experiences.length > 0, pct: experiences.length > 0 ? 100 : 0 },
    { label: 'Compétences', done: skills.length >= 5, pct: Math.min(100, (skills.length / 5) * 100) },
    { label: 'Documents justificatifs', done: documents.length > 0, pct: documents.length > 0 ? 100 : 0 },
  ];

  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set(applications.map(a => a.job_opening_id || '').filter(Boolean)));

  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplying(jobId);
    const { data } = await supabase.from('candidate_applications').insert({
      candidate_id: candidateId, job_opening_id: jobId,
      desired_position: jobTitle, status: 'new',
    }).select().maybeSingle();
    if (data) { onApplied(data as Application); setApplied(prev => new Set([...prev, jobId])); }
    setApplying(null);
  };

  const recentActivities = applications.slice(0, 4).map(a => ({
    title: a.status === 'new' ? 'Candidature soumise' : 'Mise à jour de statut',
    sub: a.desired_position || a.job_opening?.title || '—',
    date: fmtDate(a.created_at),
  }));

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📋', value: applications.length, label: 'Candidatures soumises' },
          { icon: '💼', value: openJobs.length, label: 'Offres disponibles' },
          { icon: '📅', value: applications.filter(a => a.status === 'interview').length, label: 'Entretiens planifiés' },
          { icon: '⭐', value: `${pct}%`, label: 'Profil complété' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile completion */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Complétion du profil</h3>
          <div className="space-y-3">
            {completionItems.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`flex items-center gap-1.5 ${item.done ? 'text-green-700' : 'text-gray-600'}`}>
                    {item.done ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-amber-500" />}
                    {item.label}
                  </span>
                  <span className={`font-semibold ${item.done ? 'text-green-700' : item.pct > 0 ? 'text-amber-600' : 'text-red-500'}`}>{item.pct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={item.pct} color={item.pct === 100 ? 'bg-green-500' : item.pct > 0 ? 'bg-amber-400' : 'bg-red-400'} />
              </div>
            ))}
          </div>
          <button onClick={() => onNav('profile')} className="mt-4 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg text-white transition" style={{ background: SNH_GREEN }}>
            Compléter mon profil <ChevronRight size={14} />
          </button>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Activité récente</h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune activité récente</p>
          ) : (
            <div className="relative border-l-2 border-gray-200 pl-4 ml-2 space-y-4">
              {recentActivities.map((a, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: SNH_GREEN }} />
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.sub}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} />{a.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top matching offers */}
      {matches.filter(m => m.match_score >= 60).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: SNH_GOLD }} />
            <h3 className="text-sm font-semibold text-gray-900">Offres recommandées</h3>
          </div>
          <div className="space-y-3">
            {matches.filter(m => m.match_score >= 60).slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{m.job_opening.title}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <Tag variant="gray">{m.job_opening.contract_type}</Tag>
                    <Tag variant="gray">{m.job_opening.location}</Tag>
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className={`text-lg font-black ${m.match_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{m.match_score}%</p>
                  <p className="text-xs text-gray-400">Adéquation</p>
                </div>
                {applied.has(m.job_opening_id) ? (
                  <span className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle size={12} />Postulé</span>
                ) : (
                  <button onClick={() => handleApply(m.job_opening.id, m.job_opening.title)} disabled={applying === m.job_opening.id}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1 disabled:opacity-60"
                    style={{ background: SNH_BLUE }}>
                    {applying === m.job_opening.id ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={11} />}
                    Postuler
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile Section ───────────────────────────────────────────────────────────
type ProfileTab = 'infos' | 'formations' | 'experiences' | 'competences' | 'langues';

function ProfileSection({ profile, setProfile, experiences, setExperiences, educations, setEducations, skills, setSkills, languages, setLanguages, candidateId }: {
  profile: CandidateProfile; setProfile: (p: CandidateProfile) => void;
  experiences: Experience[]; setExperiences: (v: Experience[]) => void;
  educations: Education[]; setEducations: (v: Education[]) => void;
  skills: Skill[]; setSkills: (v: Skill[]) => void;
  languages: Language[]; setLanguages: (v: Language[]) => void;
  candidateId: string;
}) {
  const [tab, setTab] = useState<ProfileTab>('infos');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const TABS: { value: ProfileTab; label: string; icon: React.FC<any> }[] = [
    { value: 'infos', label: 'Infos personnelles', icon: User },
    { value: 'formations', label: 'Formations', icon: GraduationCap },
    { value: 'experiences', label: 'Expériences', icon: Briefcase },
    { value: 'competences', label: 'Compétences', icon: Star },
    { value: 'langues', label: 'Langues', icon: Globe },
  ];

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from('candidates').update({
      first_name: profile.first_name, last_name: profile.last_name,
      phone: profile.phone || null, location: profile.location || null,
      linkedin_url: profile.linkedin_url || null, portfolio_url: profile.portfolio_url || null,
      summary: profile.summary || null, desired_position: profile.desired_position || null,
      desired_salary_min: profile.desired_salary_min || null,
      desired_salary_max: profile.desired_salary_max || null,
      availability_date: profile.availability_date || null,
      mobility: profile.mobility || null, profile_completed: true,
    }).eq('user_id', user.id);

    if (tab === 'experiences') {
      await supabase.from('candidate_experiences').delete().eq('candidate_id', candidateId);
      const valid = experiences.filter(e => e.job_title && e.company && e.start_date);
      if (valid.length) await supabase.from('candidate_experiences').insert(
        valid.map(({ id: _id, ...e }) => ({ ...e, candidate_id: candidateId, end_date: e.is_current ? null : (e.end_date || null) }))
      );
    }
    if (tab === 'formations') {
      await supabase.from('candidate_educations').delete().eq('candidate_id', candidateId);
      const valid = educations.filter(e => e.degree && e.institution);
      if (valid.length) await supabase.from('candidate_educations').insert(
        valid.map(({ id: _id, ...e }) => ({ ...e, candidate_id: candidateId, end_date: e.is_current ? null : (e.end_date || null) }))
      );
    }
    if (tab === 'competences') {
      await supabase.from('candidate_candidate_skills').delete().eq('candidate_id', candidateId);
      const valid = skills.filter(s => s.name);
      if (valid.length) await supabase.from('candidate_candidate_skills').insert(
        valid.map(({ id: _id, ...s }) => ({ ...s, candidate_id: candidateId }))
      );
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={13} />{t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {tab === 'infos' && <InfosTab profile={profile} setProfile={setProfile} />}
        {tab === 'formations' && <FormationsTab items={educations} setItems={setEducations} />}
        {tab === 'experiences' && <ExperiencesTab items={experiences} setItems={setExperiences} />}
        {tab === 'competences' && <CompetencesTab items={skills} setItems={setSkills} />}
        {tab === 'langues' && <LanguesTab items={languages} setItems={setLanguages} />}

        <div className="mt-5 pt-5 border-t border-gray-100 flex justify-end">
          <button onClick={save} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 ${saved ? 'bg-green-600' : ''}`}
            style={!saved ? { background: SNH_BLUE } : {}}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
              saved ? <><CheckCircle size={15} /> Sauvegardé</> : <><CheckCircle size={15} /> Sauvegarder</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfosTab({ profile, setProfile }: { profile: CandidateProfile; setProfile: (p: CandidateProfile) => void }) {
  const s = (k: keyof CandidateProfile, v: any) => setProfile({ ...profile, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Prénom *</Lbl><input value={profile.first_name} onChange={e => s('first_name', e.target.value)} className={inp()} /></div>
        <div><Lbl>Nom *</Lbl><input value={profile.last_name} onChange={e => s('last_name', e.target.value)} className={inp()} /></div>
      </div>
      <div><Lbl>Titre professionnel</Lbl><input value={profile.professional_title || ''} onChange={e => s('professional_title', e.target.value)} className={inp()} placeholder="Ex: Ingénieur Pétrole & Gaz Senior" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Téléphone principal</Lbl><input value={profile.phone || ''} onChange={e => s('phone', e.target.value)} className={inp()} placeholder="+237 6XX XXX XXX" /></div>
        <div><Lbl>Téléphone secondaire</Lbl><input value={profile.phone2 || ''} onChange={e => s('phone2', e.target.value)} className={inp()} placeholder="+237 6XX XXX XXX" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Ville de résidence</Lbl><input value={profile.location || ''} onChange={e => s('location', e.target.value)} className={inp()} placeholder="Yaoundé" /></div>
        <div><Lbl>Région</Lbl>
          <select value={profile.region || ''} onChange={e => s('region', e.target.value)} className={inp()}>
            <option value="">— Sélectionner —</option>
            {REGIONS_CM.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Nationalité</Lbl><input value={profile.nationality || ''} onChange={e => s('nationality', e.target.value)} className={inp()} placeholder="Camerounaise" /></div>
        <div><Lbl>N° CNI / Passeport</Lbl><input value={profile.national_id || ''} onChange={e => s('national_id', e.target.value)} className={inp()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Poste souhaité</Lbl><input value={profile.desired_position || ''} onChange={e => s('desired_position', e.target.value)} className={inp()} placeholder="Ingénieur Réservoir..." /></div>
        <div><Lbl>Disponibilité à partir du</Lbl><input type="date" value={profile.availability_date || ''} onChange={e => s('availability_date', e.target.value)} className={inp()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Prétention salariale min (FCFA)</Lbl><input type="number" value={profile.desired_salary_min || ''} onChange={e => s('desired_salary_min', Number(e.target.value))} className={inp()} /></div>
        <div><Lbl>Prétention salariale max (FCFA)</Lbl><input type="number" value={profile.desired_salary_max || ''} onChange={e => s('desired_salary_max', Number(e.target.value))} className={inp()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Profil LinkedIn</Lbl><input value={profile.linkedin_url || ''} onChange={e => s('linkedin_url', e.target.value)} className={inp()} placeholder="https://linkedin.com/in/..." /></div>
        <div><Lbl>Site / Portfolio</Lbl><input value={profile.portfolio_url || ''} onChange={e => s('portfolio_url', e.target.value)} className={inp()} placeholder="https://..." /></div>
      </div>
      <div><Lbl>Résumé / À propos de vous</Lbl>
        <textarea value={profile.summary || ''} onChange={e => s('summary', e.target.value)} rows={4} className={inp()} placeholder="Décrivez votre parcours, vos expertises et vos ambitions professionnelles..." />
      </div>
    </div>
  );
}

function FormationsTab({ items, setItems }: { items: Education[]; setItems: (v: Education[]) => void }) {
  const add = () => setItems([...items, { degree: '', field_of_study: '', institution: '', location: '', start_date: '', end_date: '', is_current: false, grade: '', country: 'Cameroun' }]);
  const upd = (i: number, k: keyof Education, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Formations académiques</h3>
        <button onClick={add} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: SNH_BLUE }}>
          <Plus size={13} /> Ajouter une formation
        </button>
      </div>
      {items.map((edu, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Formation {i + 1}</span>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Lbl>Diplôme obtenu *</Lbl><input value={edu.degree} onChange={e => upd(i,'degree',e.target.value)} className={inp()} placeholder="Master, Licence, BTS..." /></div>
            <div><Lbl>Établissement *</Lbl><input value={edu.institution} onChange={e => upd(i,'institution',e.target.value)} className={inp()} placeholder="ENSP, Université de Yaoundé..." /></div>
            <div><Lbl>Domaine d'études</Lbl><input value={edu.field_of_study} onChange={e => upd(i,'field_of_study',e.target.value)} className={inp()} placeholder="Génie Pétrolier, Finance..." /></div>
            <div><Lbl>Pays</Lbl><input value={edu.country || ''} onChange={e => upd(i,'country',e.target.value)} className={inp()} /></div>
            <div><Lbl>Ville</Lbl><input value={edu.location} onChange={e => upd(i,'location',e.target.value)} className={inp()} /></div>
            <div><Lbl>Année de début</Lbl><input type="number" value={edu.start_date} onChange={e => upd(i,'start_date',e.target.value)} className={inp()} placeholder="Ex: 2018" /></div>
            {!edu.is_current && <div><Lbl>Année de fin</Lbl><input type="number" value={edu.end_date} onChange={e => upd(i,'end_date',e.target.value)} className={inp()} placeholder="Ex: 2022" /></div>}
            <div><Lbl>Mention</Lbl><input value={edu.grade} onChange={e => upd(i,'grade',e.target.value)} className={inp()} placeholder="Très bien, Bien..." /></div>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={edu.is_current} onChange={e => upd(i,'is_current',e.target.checked)} className="rounded border-gray-300" />
            Formation en cours
          </label>
        </div>
      ))}
      {items.length === 0 && (
        <button onClick={add} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-4 text-sm text-gray-400 hover:border-green-500 hover:text-green-700 flex items-center justify-center gap-2 transition">
          <Plus size={16} /> Ajouter une formation
        </button>
      )}
    </div>
  );
}

function ExperiencesTab({ items, setItems }: { items: Experience[]; setItems: (v: Experience[]) => void }) {
  const add = () => setItems([...items, { job_title: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '', contract_type: 'CDI', sector: '' }]);
  const upd = (i: number, k: keyof Experience, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Expériences professionnelles</h3>
        <button onClick={add} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: SNH_BLUE }}>
          <Plus size={13} /> Ajouter une expérience
        </button>
      </div>
      {items.map((exp, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Expérience {i + 1}</span>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Poste occupé *</Lbl><input value={exp.job_title} onChange={e => upd(i,'job_title',e.target.value)} className={inp()} placeholder="Ingénieur Réservoir..." /></div>
            <div><Lbl>Entreprise *</Lbl><input value={exp.company} onChange={e => upd(i,'company',e.target.value)} className={inp()} /></div>
            <div><Lbl>Secteur d'activité</Lbl><input value={exp.sector || ''} onChange={e => upd(i,'sector',e.target.value)} className={inp()} placeholder="Pétrole & Gaz, Finance..." /></div>
            <div><Lbl>Type de contrat</Lbl>
              <select value={exp.contract_type || 'CDI'} onChange={e => upd(i,'contract_type',e.target.value)} className={inp()}>
                {['CDI','CDD','Stage','Freelance','Alternance','Autre'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><Lbl>Ville</Lbl><input value={exp.location} onChange={e => upd(i,'location',e.target.value)} className={inp()} /></div>
            <div><Lbl>Date de début *</Lbl><input type="date" value={exp.start_date} onChange={e => upd(i,'start_date',e.target.value)} className={inp()} /></div>
            {!exp.is_current && <div><Lbl>Date de fin</Lbl><input type="date" value={exp.end_date} onChange={e => upd(i,'end_date',e.target.value)} className={inp()} /></div>}
          </div>
          <label className="flex items-center gap-2 my-3 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={exp.is_current} onChange={e => upd(i,'is_current',e.target.checked)} className="rounded border-gray-300" />
            Poste actuel
          </label>
          <div><Lbl>Description des missions</Lbl>
            <textarea value={exp.description} onChange={e => upd(i,'description',e.target.value)} rows={3} className={inp()} placeholder="Vos principales responsabilités et réalisations..." />
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <button onClick={add} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-4 text-sm text-gray-400 hover:border-green-500 hover:text-green-700 flex items-center justify-center gap-2 transition">
          <Plus size={16} /> Ajouter une expérience
        </button>
      )}
    </div>
  );
}

const COMP_CATALOGUE: Record<string, string[]> = {
  'Hydrocarbures / Pétrole': ['Géologie pétrolière','Ingénierie de réservoir','Forage pétrolier','Sismique & Exploration','Production & Exploitation','Pétrophysique','Modélisation de réservoir'],
  'Ingénierie': ['AutoCAD','MATLAB','Génie civil','Mécanique des fluides','Hydraulique','Thermodynamique'],
  'Informatique / SI': ['Python','SQL','Java','JavaScript','Réseaux informatiques','ERP (SAP / Oracle)','Power BI'],
  'Finance / Comptabilité': ['Comptabilité générale','Contrôle de gestion','SYSCOHADA','Analyse financière','Fiscalité camerounaise'],
  'Gestion / Management': ['Gestion de projet','Management d\'équipe','Agile / Scrum','Gestion des risques','Leadership'],
  'HSE / Sécurité': ['ISO 14001','ISO 45001','Audit HSE','Analyse des risques (HAZOP)'],
  'Droit / Juridique': ['Droit des affaires','Droit pétrolier','Contrats OHADA','Droit du travail'],
  'Soft Skills': ['Communication','Travail en équipe','Rigueur','Autonomie','Adaptabilité','Esprit d\'analyse'],
};

function CompetencesTab({ items, setItems }: { items: Skill[]; setItems: (v: Skill[]) => void }) {
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');

  const selectedNames = new Set(items.map(s => s.name));

  const toggle = (name: string) => {
    if (selectedNames.has(name)) {
      setItems(items.filter(s => s.name !== name));
    } else {
      setItems([...items, { name, category: 'technical', level: 'intermediate' }]);
    }
  };

  const addCustom = () => {
    if (!newName.trim() || selectedNames.has(newName.trim())) return;
    setItems([...items, { name: newName.trim(), category: 'other', level: 'intermediate' }]);
    setNewName('');
  };

  const updateLevel = (name: string, level: Skill['level']) => {
    setItems(items.map(s => s.name === name ? { ...s, level } : s));
  };

  const f = search.toLowerCase();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Compétences</h3>
        <span className="text-xs text-gray-500">{items.length} sélectionnée{items.length > 1 ? 's' : ''}</span>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} className={inp()} placeholder="🔍 Rechercher une compétence..." />

      {Object.entries(COMP_CATALOGUE).map(([cat, tags]) => {
        const filtered = !f ? tags : tags.filter(t => t.toLowerCase().includes(f));
        if (!filtered.length) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {filtered.map(tag => (
                <button key={tag} onClick={() => toggle(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedNames.has(tag) ? 'bg-green-50 border-green-500 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Selected skills with levels */}
      {items.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">Niveaux des compétences sélectionnées</p>
          <div className="space-y-2">
            {items.map(sk => (
              <div key={sk.name} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-700 flex-1 min-w-0 truncate">{sk.name}</span>
                <div className="flex gap-1">
                  {SKILL_LEVELS.map(lv => (
                    <button key={lv.value} onClick={() => updateLevel(sk.name, lv.value as Skill['level'])}
                      className={`px-2 py-1 text-xs rounded border transition ${sk.level === lv.value ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 hover:border-green-400'}`}
                        style={sk.level === lv.value ? { background: SNH_GREEN } : {}}>
                      {lv.label.slice(0, 3)}.
                    </button>
                  ))}
                </div>
                <button onClick={() => toggle(sk.name)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input value={newName} onChange={e => setNewName(e.target.value)} className={inp() + ' flex-1'} placeholder="Ajouter une compétence personnalisée..." onKeyDown={e => e.key === 'Enter' && addCustom()} />
        <button onClick={addCustom} className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: SNH_BLUE }}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function LanguesTab({ items, setItems }: { items: Language[]; setItems: (v: Language[]) => void }) {
  const add = () => setItems([...items, { name: '', level: 'B2' }]);
  const upd = (i: number, k: keyof Language, v: string) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  const LEVEL_PCT: Record<string, number> = { A1:10, A2:20, B1:40, B2:60, C1:80, C2:95, Natif:100 };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Langues parlées</h3>
        <button onClick={add} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: SNH_BLUE }}>
          <Plus size={13} /> Ajouter une langue
        </button>
      </div>
      {items.map((lang, i) => (
        <div key={i} className="flex items-center gap-3">
          <input value={lang.name} onChange={e => upd(i,'name',e.target.value)} className={`${inp()} flex-1`} placeholder="Français, Anglais..." />
          <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${LEVEL_PCT[lang.level] ?? 50}%`, background: SNH_BLUE }} />
          </div>
          <select value={lang.level} onChange={e => upd(i,'level',e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-xs w-20">
            {LANG_LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <button onClick={() => del(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
        </div>
      ))}
      {items.length === 0 && (
        <button onClick={add} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-4 text-sm text-gray-400 hover:border-green-500 hover:text-green-700 flex items-center justify-center gap-2 transition">
          <Plus size={16} /> Ajouter une langue
        </button>
      )}
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────
function DocumentsSection({ candidateId, documents, setDocuments }: {
  candidateId: string; documents: CandidateDoc[]; setDocuments: (d: CandidateDoc[]) => void;
}) {
  const [selectedType, setSelectedType] = useState<CandidateDoc['type']>('cv');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

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
    }).select().maybeSingle();
    if (docData) setDocuments([docData as CandidateDoc, ...documents]);
    setUploading(false); e.target.value = '';
  };

  const handleDelete = async (doc: CandidateDoc) => {
    setDeleting(doc.id);
    const parts = doc.file_url.split('/candidates-documents/');
    if (parts[1]) await supabase.storage.from('candidates-documents').remove([decodeURIComponent(parts[1])]);
    await supabase.from('candidate_documents').delete().eq('id', doc.id);
    setDocuments(documents.filter(d => d.id !== doc.id));
    setDeleting(null);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Documents requis par la SNH</p>
          <p className="text-xs text-amber-700 mt-1">Assurez-vous d'avoir téléversé au minimum : votre CV, vos diplômes, votre CNI ou Passeport, et vos attestations d'emploi.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Téléverser un document</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Lbl>Type de document *</Lbl>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value as CandidateDoc['type'])} className={inp()}>
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{ background: SNH_BLUE }}>
              {uploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi...</> : <><Upload size={14} />Choisir un fichier</>}
              <input type="file" className="hidden" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFile} />
            </label>
          </div>
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400">
          <Upload size={28} className="mx-auto mb-2 opacity-40" />
          <p>Glissez-déposez votre fichier ici</p>
          <p className="text-xs mt-1">PDF, Word, JPG, PNG — max 10 Mo</p>
        </div>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Mes documents ({documents.length})</h3>
        </div>
        {documents.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm"><FileText size={32} className="mx-auto mb-2 opacity-30" />Aucun document téléversé</div>
        ) : (
          <div>
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${SNH_GREEN}15` }}>
                  <FileText size={16} style={{ color: SNH_GREEN }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{DOC_TYPES.find(d => d.value === doc.type)?.label} · {fmtSize(doc.file_size)} · {fmtDate(doc.uploaded_at)}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded transition hover:bg-green-50" style={{ color: SNH_GREEN }}>
                  <Eye size={14} />
                </a>
                <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition disabled:opacity-50">
                  {deleting === doc.id ? <div className="w-3.5 h-3.5 border border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
function JobsSection({ openJobs, matches, candidateId, onApplied, applications }: {
  openJobs: JobOpening[]; matches: JobMatch[]; candidateId: string;
  onApplied: (app: Application) => void; applications: Application[];
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [applying, setApplying] = useState<string | null>(null);
  const applied = new Set(applications.map(a => a.job_opening_id || '').filter(Boolean));

  const filtered = openJobs.filter(j => {
    const txt = `${j.title} ${j.location} ${j.description}`.toLowerCase();
    return (!search || txt.includes(search.toLowerCase())) && (filterType === 'all' || j.contract_type === filterType);
  });

  const handleApply = async (job: JobOpening) => {
    setApplying(job.id);
    const { data } = await supabase.from('candidate_applications').insert({
      candidate_id: candidateId, job_opening_id: job.id,
      desired_position: job.title, status: 'new',
    }).select().maybeSingle();
    if (data) onApplied(data as Application);
    setApplying(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 flex items-start gap-3 border" style={{ background: `${SNH_GREEN}0D`, borderColor: `${SNH_GREEN}30` }}>
        <Building2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: SNH_GREEN }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: SNH_GREEN }}>Offres de la Société Nationale des Hydrocarbures</p>
          <p className="text-xs mt-0.5" style={{ color: `${SNH_GREEN}CC` }}>Toutes les offres ci-dessous sont publiées exclusivement par la SNH. Assurez-vous que votre profil est complet avant de postuler.</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className={inp() + ' pl-9'} placeholder="Rechercher un poste..." />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`${inp()} w-48`}>
          <option value="all">Tous types de contrat</option>
          {['CDI','CDD','Stage académique','Stage professionnel'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Briefcase size={40} className="mx-auto mb-2 opacity-20" />Aucune offre trouvée</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const m = matches.find(x => x.job_opening_id === job.id);
            const isStage = job.contract_type?.toLowerCase().includes('stage');
            return (
              <div key={job.id} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-4 items-start transition hover:shadow-md ${isStage ? 'border-l-4 border-l-green-400 border-gray-200' : 'border-l-4 border-l-blue-500 border-gray-200'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${isStage ? 'bg-amber-50' : ''}`}
                  style={!isStage ? { background: `${SNH_GREEN}15` } : {}}>
                  {isStage ? '🎓' : '💼'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{job.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">SNH · {job.location}</p>
                    </div>
                    {m && <span className={`text-sm font-black ${m.match_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{m.match_score}%</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Tag variant={isStage ? 'amber' : 'green'}>{job.contract_type}</Tag>
                    {job.required_skills?.slice(0, 3).map(s => <Tag key={s} variant="blue">{s}</Tag>)}
                    {(job.required_skills?.length || 0) > 3 && <Tag variant="gray">+{job.required_skills.length - 3}</Tag>}
                    <Tag variant="gray"><Clock size={10} className="mr-1" />Clôture {fmtDate(job.closing_date)}</Tag>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {applied.has(job.id) ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle size={12} />Postulé</span>
                  ) : (
                    <button onClick={() => handleApply(job)} disabled={applying === job.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg text-white font-semibold disabled:opacity-60 transition"
                      style={{ background: SNH_BLUE }}>
                      {applying === job.id ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={12} />}
                      Postuler
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Spontaneous Application ───────────────────────────────────────────────────
function SpontaneousSection({ candidateId, profile, onApplied }: {
  candidateId: string; profile: CandidateProfile; onApplied: (app: Application) => void;
}) {
  const [type, setType] = useState<'emploi' | 'stage_academique' | 'stage_professionnel'>('emploi');
  const [direction, setDirection] = useState('');
  const [poste, setPoste] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [stageTopic, setStageTopic] = useState('');
  const [stageDuration, setStageDuration] = useState('3 mois');
  const [stageStart, setStageStart] = useState('');
  const [stageSchool, setStageSchool] = useState('');
  const [availability, setAvailability] = useState('Immédiatement');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isStage = type !== 'emploi';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direction || !poste || !coverLetter.trim()) return;
    setSubmitting(true);
    const desiredPos = `[${type === 'emploi' ? 'Emploi' : type === 'stage_academique' ? 'Stage académique' : 'Stage pro'}] ${poste} — ${direction}`;
    const notes = isStage ? `Thème : ${stageTopic}\nDurée : ${stageDuration}\nDébut souhaité : ${stageStart}\nÉcole : ${stageSchool}` : '';
    const { data } = await supabase.from('candidate_applications').insert({
      candidate_id: candidateId,
      job_opening_id: null,
      desired_position: desiredPos,
      cover_letter: coverLetter,
      status: 'new',
      internal_notes: notes || null,
      spontaneous_type: type,
    }).select().maybeSingle();
    setSubmitting(false);
    if (data) { setDone(true); onApplied(data as Application); }
  };

  if (done) return (
    <div className="max-w-lg mx-auto mt-12 text-center bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Candidature envoyée !</h2>
      <p className="text-gray-500 text-sm">Votre candidature spontanée a été transmise aux services de la SNH. Vous serez contacté(e) prochainement.</p>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl p-4 flex items-start gap-3 mb-5 border" style={{ background: `${SNH_GREEN}0D`, borderColor: `${SNH_GREEN}30` }}>
        <Send size={16} className="flex-shrink-0 mt-0.5" style={{ color: SNH_GREEN }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: SNH_GREEN }}>Candidature spontanée à la SNH</p>
          <p className="text-xs mt-0.5" style={{ color: `${SNH_GREEN}CC` }}>Soumettez votre dossier directement même en l'absence d'une offre publiée. Précisez le type de candidature et la direction que vous visez.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Type de candidature *</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'emploi', icon: '💼', label: 'Emploi', sub: 'CDI ou CDD à la SNH' },
              { value: 'stage_academique', icon: '🎓', label: 'Stage académique', sub: 'Fin d\'études / mémoire' },
              { value: 'stage_professionnel', icon: '🔄', label: 'Stage professionnel', sub: 'Perfectionnement / insertion pro' },
            ].map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value as any)}
                className={`p-4 rounded-xl border-2 text-center transition cursor-pointer ${type === t.value ? 'bg-green-50' : 'border-gray-200 bg-white hover:border-green-400'}`}
                style={type === t.value ? { borderColor: SNH_GREEN } : {}}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <p className="text-xs font-semibold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Direction & poste */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Direction visée à la SNH *</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Lbl>Direction / Service *</Lbl>
              <select value={direction} onChange={e => setDirection(e.target.value)} className={inp(!direction && submitting)} required>
                <option value="">— Choisir une direction —</option>
                {SNH_DIRECTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Poste / Fonction visé(e) *</Lbl>
              <input value={poste} onChange={e => setPoste(e.target.value)} className={inp()} placeholder="Ex: Ingénieur Réservoir, Comptable..." required />
            </div>
          </div>
        </div>

        {/* Stage-specific fields */}
        {isStage && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap size={15} /> Informations sur le stage
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Lbl>Thème / Sujet du stage *</Lbl><input value={stageTopic} onChange={e => setStageTopic(e.target.value)} className={inp()} placeholder="Ex: Optimisation de la récupération assistée du pétrole..." /></div>
              <div>
                <Lbl>Durée souhaitée</Lbl>
                <select value={stageDuration} onChange={e => setStageDuration(e.target.value)} className={inp()}>
                  {['1 mois','2 mois','3 mois','4 mois','6 mois','À définir avec la SNH'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div><Lbl>Date de début souhaitée</Lbl><input type="date" value={stageStart} onChange={e => setStageStart(e.target.value)} className={inp()} /></div>
              <div className="col-span-2"><Lbl>École / Université actuelle</Lbl><input value={stageSchool} onChange={e => setStageSchool(e.target.value)} className={inp()} placeholder="ENSP, Université de Yaoundé I, IUT..." /></div>
            </div>
          </div>
        )}

        {/* Cover letter */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Votre dossier de candidature</h3>
          <div className="space-y-3">
            <div>
              <Lbl>Lettre de motivation *</Lbl>
              <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={8} className={inp()} required
                placeholder={`Madame, Monsieur le Directeur des Ressources Humaines,\n\nJe me permets de vous adresser ma candidature spontanée auprès de la Société Nationale des Hydrocarbures du Cameroun (SNH) pour un poste de [poste visé] au sein de la [Direction visée].\n\n[Développez vos motivations et votre valeur ajoutée pour la SNH]\n\nDans l'espoir d'une réponse favorable, je reste disponible pour tout entretien à votre convenance.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${profile.first_name} ${profile.last_name}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl>Disponibilité</Lbl>
                <select value={availability} onChange={e => setAvailability(e.target.value)} className={inp()}>
                  {['Immédiatement','Dans 1 mois','Dans 2 mois','Dans 3 mois'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Prétention salariale (FCFA/mois, optionnel)</Lbl>
                <input type="number" value={salaryExpectation} onChange={e => setSalaryExpectation(e.target.value)} className={inp()} placeholder="Ex: 600000" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={submitting || !coverLetter.trim() || !direction || !poste}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition"
              style={{ background: SNH_BLUE }}>
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
              Envoyer ma candidature à la SNH
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────
function ApplicationsSection({ applications }: { applications: Application[] }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)} className={`${inp()} w-52`}>
          <option value="all">Tous les statuts</option>
          {['new','reviewing','interview','offer','integrated','rejected','withdrawn'].map(s => (
            <option key={s} value={s}>{['Soumis','En examen','Entretien','Offre','Intégré(e)','Refusé(e)','Retiré(e)'][['new','reviewing','interview','offer','integrated','rejected','withdrawn'].indexOf(s)]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Mes candidatures SNH ({filtered.length})</h3>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><FileText size={36} className="mx-auto mb-2 opacity-20" />Aucune candidature</div>
        ) : (
          <div>
            {filtered.map(app => (
              <div key={app.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{app.desired_position || app.job_opening?.title || '—'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Building2 size={10} />SNH</span>
                    {app.job_opening_id ? (
                      <Tag variant="blue">Offre publiée</Tag>
                    ) : (
                      <Tag variant="purple">Candidature spontanée</Tag>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{fmtDate(app.created_at)}</span>
                  </div>
                </div>
                <AppStatus status={app.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
function NotificationsSection({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><Bell size={32} className="mx-auto mb-2 opacity-20" />Aucune notification</div>
        ) : (
          <div>
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 ${n.read ? '' : 'bg-green-50/40'}`}>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}><span className="font-semibold">{n.title}</span> — {n.body}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} />{fmtDate(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
