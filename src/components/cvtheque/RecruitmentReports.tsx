import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, FileText, Users, Search, ChevronDown, Printer,
  TrendingUp, Calendar, Award, Briefcase, Building2, X,
  CheckCircle, Clock, User, BookOpen, ClipboardList, Download
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const SNH_GREEN = '#006B3C';
const SNH_DARK  = '#004d2b';

const PIPELINE_STEPS = [
  { value: 'new',              label: 'Candidature',                  short: 'Candidature' },
  { value: 'technical_tests',  label: 'Tests techniques — Jury SNH',  short: 'Tests tech.' },
  { value: 'interview',        label: 'Entretien d\'embauche',         short: 'Entretien' },
  { value: 'psycho_tests',     label: 'Tests psy. & professionnels',  short: 'Tests psy.' },
  { value: 'medical_visit',    label: 'Visite médicale d\'embauche',  short: 'Visite méd.' },
  { value: 'morality_inquiry', label: 'Enquête de moralité',          short: 'Moralité' },
  { value: 'diploma_check',    label: 'Auth. diplômes & état civil',  short: 'Diplômes' },
  { value: 'trial',            label: 'Engagement à l\'essai',        short: 'Essai' },
  { value: 'assignment',       label: 'Affectation & prise de service', short: 'Affectation' },
  { value: 'integrated',       label: 'Titularisation',               short: 'Titularisé(e)' },
];

const STATUS_FR: Record<string, string> = {
  new: 'Candidature', technical_tests: 'Tests techniques', interview: 'Entretien',
  psycho_tests: 'Tests psy.', medical_visit: 'Visite médicale', morality_inquiry: 'Enquête moralité',
  diploma_check: 'Auth. diplômes', trial: 'Engagement essai', assignment: 'Affectation',
  integrated: 'Titularisé(e)', rejected: 'Refusé(e)', withdrawn: 'Retiré(e)',
};

const STATUS_COLOR: Record<string, string> = {
  new: '#3b82f6', technical_tests: '#f59e0b', interview: '#f97316', psycho_tests: '#8b5cf6',
  medical_visit: '#0d9488', morality_inquiry: '#06b6d4', diploma_check: '#6366f1',
  trial: '#22c55e', assignment: '#10b981', integrated: '#059669', rejected: '#ef4444', withdrawn: '#94a3b8',
};

const STATUS_BG: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800', technical_tests: 'bg-amber-100 text-amber-800',
  interview: 'bg-orange-100 text-orange-800', psycho_tests: 'bg-violet-100 text-violet-800',
  medical_visit: 'bg-teal-100 text-teal-800', morality_inquiry: 'bg-cyan-100 text-cyan-800',
  diploma_check: 'bg-indigo-100 text-indigo-800', trial: 'bg-lime-100 text-lime-800',
  assignment: 'bg-emerald-100 text-emerald-800', integrated: 'bg-emerald-200 text-emerald-900',
  rejected: 'bg-red-100 text-red-800', withdrawn: 'bg-slate-100 text-slate-600',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateLong(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status] ?? 'bg-slate-100 text-slate-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{STATUS_FR[status] ?? status}</span>;
}

// ── SNH Table Header ──────────────────────────────────────────────────────────
function TableHeader({ title }: { title: string }) {
  return (
    <tr>
      <th colSpan={99} className="text-left px-4 py-2 text-sm font-bold text-white"
        style={{ background: SNH_GREEN }}>
        {title}
      </th>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-semibold text-white text-center whitespace-nowrap"
      style={{ background: SNH_DARK }}>
      {children}
    </th>
  );
}

function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <td className={`px-3 py-2 text-xs text-slate-700 border-b border-slate-100 ${center ? 'text-center' : ''}`}>
      {children}
    </td>
  );
}

// ── Print utility ─────────────────────────────────────────────────────────────
function printElement(html: string, title: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;padding:24px;font-size:12px;}
    h1{font-size:18px;color:#006B3C;margin-bottom:4px;}
    h2{font-size:13px;color:#006B3C;margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#004d2b;color:#fff;padding:7px 10px;font-size:11px;text-align:left;}
    td{padding:6px 10px;font-size:11px;border-bottom:1px solid #e5e7eb;}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;}
    .green-header{background:#006B3C;color:#fff;padding:6px 10px;font-weight:700;font-size:12px;}
    .section{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;padding:12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;}
    .meta-item label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;display:block;}
    .meta-item span{font-size:12px;font-weight:600;color:#111827;}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:10px;}
    .logo-bar{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
    .logo-box{width:42px;height:42px;background:#006B3C;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900;}
    .subtitle{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;}
    @media print{body{padding:12px;}}
  </style>
  </head><body>${html}
  <div class="footer">SNH — Société Nationale des Hydrocarbures du Cameroun &nbsp;|&nbsp; recrutement.snh.cm &nbsp;|&nbsp; Généré le ${fmtDateLong(new Date().toISOString())}</div>
  </body></html>`);
  w.document.close();
  w.onload = () => w.print();
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface AppRow {
  id: string;
  status: string;
  created_at: string;
  desired_position: string | null;
  cover_letter: string | null;
  job_opening_id: string | null;
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    birth_date: string | null;
    location: string | null;
    professional_title: string | null;
    summary: string | null;
    photo_url: string | null;
    candidate_educations?: { degree: string | null; field_of_study: string | null; institution: string | null; end_year: string | null }[];
    candidate_experiences?: { company: string | null; position: string | null; duration_months: number | null; start_date: string | null; end_date: string | null }[];
  } | null;
  job_opening: { id: string; title: string } | null;
  pipeline_events?: { to_status: string; created_at: string; notes: string | null }[];
  pipeline_stage_notes?: { stage: string; score: number | null; score_max: number | null; passed: boolean | null; evaluator_name: string | null; notes: string | null }[];
}

interface JobOpening {
  id: string;
  title: string;
  status: string;
  contract_type: string | null;
  publication_date: string | null;
  closing_date: string | null;
}

type ReportView = 'dashboard' | 'candidate_synthesis' | 'candidate_fiche' | 'offer_report' | 'engagement_letter';

// ── Minibar chart (purely visual) ─────────────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-1.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-28 flex-shrink-0 text-right truncate">{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%`, background: d.color }} />
            <span className="absolute right-2 top-0 h-full flex items-center text-xs font-semibold text-slate-700">{d.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline chart ──────────────────────────────────────────────────────────
function SparkLine({ values, color = SNH_GREEN }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const w = 400, h = 80;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * (h - 10) - 5}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RecruitmentReports() {
  const [reportView, setReportView] = useState<ReportView>('dashboard');
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterJobId, setFilterJobId] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Selection
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [appRes, jobRes] = await Promise.all([
      supabase.from('candidate_applications').select(`
        id, status, created_at, desired_position, cover_letter, job_opening_id,
        candidate:candidates(
          id, first_name, last_name, email, phone, birth_date, location, professional_title, summary, photo_url,
          candidate_educations(degree, field_of_study, institution, end_year),
          candidate_experiences(company, position, duration_months, start_date, end_date)
        ),
        job_opening:job_openings(id, title),
        pipeline_events:hiring_pipeline_events(to_status, created_at, notes),
        pipeline_stage_notes(stage, score, score_max, passed, evaluator_name, notes)
      `).order('created_at', { ascending: false }),
      supabase.from('job_openings').select('id, title, status, contract_type, publication_date, closing_date').order('created_at', { ascending: false }),
    ]);
    if (appRes.error) console.error('[RecruitmentReports] applications error:', appRes.error);
    if (jobRes.error) console.error('[RecruitmentReports] jobs error:', jobRes.error);
    setApplications((appRes.data as AppRow[]) || []);
    setJobs((jobRes.data as JobOpening[]) || []);
    setLoading(false);
  };

  // Derived filtered apps
  const filteredApps = applications.filter(a => {
    if (filterJobId !== 'all' && a.job_opening_id !== filterJobId) return false;
    if (filterStage !== 'all' && a.status !== filterStage) return false;
    if (filterDateFrom && a.created_at < filterDateFrom) return false;
    if (filterDateTo && a.created_at > filterDateTo + 'T23:59:59') return false;
    return true;
  });

  const selectedApp = applications.find(a => a.id === selectedAppId) ?? null;
  const selectedJob = jobs.find(j => j.id === selectedJobId) ?? null;

  // Stats for dashboard
  const statsByStage = PIPELINE_STEPS.map(s => ({
    label: s.short,
    count: applications.filter(a => a.status === s.value).length,
    color: STATUS_COLOR[s.value] ?? SNH_GREEN,
  }));

  // Simulated 30-day trend (based on created_at)
  const trend30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return applications.filter(a => a.created_at?.slice(0, 10) === key).length;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: SNH_GREEN }} />
      </div>
    );
  }

  // ── REPORT: Dashboard ──────────────────────────────────────────────────────
  const renderDashboard = () => {
    const totalApps = applications.length;
    const totalCandidates = new Set(applications.map(a => a.candidate?.id).filter(Boolean)).size;
    const inProcess = applications.filter(a => !['rejected', 'withdrawn', 'integrated'].includes(a.status)).length;
    const integrated = applications.filter(a => a.status === 'integrated').length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, ${SNH_DARK} 100%)` }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                <BarChart3 size={28} className="text-white" />
              </div>
              <div>
                <p className="text-green-200 text-xs font-medium uppercase tracking-widest">SOCIÉTÉ NATIONALE DES HYDROCARBURES</p>
                <h1 className="text-2xl font-bold text-white mt-0.5">Tableaux de Bord — Candidatures</h1>
                <p className="text-green-200 text-sm mt-1">Des états clairs pour un suivi efficace et des décisions éclairées.</p>
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
            {[
              { label: 'Candidatures reçues', value: totalApps, icon: FileText, color: 'text-blue-600' },
              { label: 'Candidats uniques', value: totalCandidates, icon: Users, color: 'text-teal-600' },
              { label: 'En cours de traitement', value: inProcess, icon: Clock, color: 'text-amber-600' },
              { label: 'Titularisés', value: integrated, icon: Award, color: 'text-green-700' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-4 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={color} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Offre</label>
            <select value={filterJobId} onChange={e => setFilterJobId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30">
              <option value="all">Toutes les offres</option>
              <option value="">Candidatures spontanées</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Phase</label>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30">
              <option value="all">Toutes les phases</option>
              {PIPELINE_STEPS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              <option value="rejected">Refusé(e)</option>
              <option value="withdrawn">Retiré(e)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Du</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Au</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          {(filterJobId !== 'all' || filterStage !== 'all' || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterJobId('all'); setFilterStage('all'); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition">
              <X size={12} /> Réinitialiser
            </button>
          )}
          <button
            onClick={() => printDashboard(filteredApps)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition"
            style={{ background: SNH_GREEN }}>
            <Printer size={14} /> Imprimer
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table 1: Récapitulatif général */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList size={14} style={{ color: SNH_GREEN }} />
              <span className="text-sm font-semibold text-slate-800">Récapitulatif des candidatures</span>
              <span className="ml-auto text-xs text-slate-400">{filteredApps.length} résultat(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <Th>N°</Th>
                    <Th>Candidat</Th>
                    <Th>Poste visé</Th>
                    <Th>Date dépôt</Th>
                    <Th>Diplôme</Th>
                    <Th>Expérience</Th>
                    <Th>Statut</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.slice(0, 8).map((app, i) => {
                    const edu = app.candidate?.candidate_educations?.[0];
                    const expMonths = (app.candidate?.candidate_experiences || [])
                      .reduce((acc, e) => acc + (e.duration_months || 0), 0);
                    const expYears = Math.round(expMonths / 12);
                    return (
                      <tr key={app.id} className={`hover:bg-slate-50 cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                        onClick={() => { setSelectedAppId(app.id); setReportView('candidate_synthesis'); }}>
                        <Td center>{i + 1}</Td>
                        <Td>
                          <span className="font-semibold text-slate-800">
                            {app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '—'}
                          </span>
                        </Td>
                        <Td>{app.desired_position || app.job_opening?.title || '—'}</Td>
                        <Td center>{fmtDate(app.created_at)}</Td>
                        <Td>{edu ? `${edu.degree ?? ''} ${edu.field_of_study ?? ''}`.trim() || '—' : '—'}</Td>
                        <Td center>{expYears > 0 ? `${expYears} an${expYears > 1 ? 's' : ''}` : '—'}</Td>
                        <Td center><StatusBadge status={app.status} /></Td>
                      </tr>
                    );
                  })}
                  {filteredApps.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-xs">Aucune candidature</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredApps.length > 8 && (
              <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 text-center">
                {filteredApps.length - 8} candidature(s) supplémentaire(s) — imprimez pour voir tout
              </div>
            )}
          </div>

          {/* Funnel chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: SNH_GREEN }} />
              <span className="text-sm font-semibold text-slate-800">Répartition par phase du pipeline</span>
            </div>
            <MiniBarChart data={statsByStage} />
          </div>
        </div>

        {/* Table by offer */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Briefcase size={14} style={{ color: SNH_GREEN }} />
            <span className="text-sm font-semibold text-slate-800">Liste des candidats par offre</span>
          </div>
          {jobs.map(job => {
            const jobApps = filteredApps.filter(a => a.job_opening_id === job.id);
            if (jobApps.length === 0) return null;
            return (
              <div key={job.id}>
                <div className="px-4 py-2 text-xs font-bold text-white" style={{ background: SNH_GREEN }}>
                  Offre : {job.title}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <Th>N°</Th>
                        <Th>Candidat</Th>
                        <Th>Date dépôt</Th>
                        <Th>Diplôme</Th>
                        <Th>Expérience</Th>
                        <Th>Date naissance</Th>
                        <Th>Statut</Th>
                        <Th>Détail</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobApps.slice(0, 5).map((app, i) => {
                        const edu = app.candidate?.candidate_educations?.[0];
                        const expMonths = (app.candidate?.candidate_experiences || []).reduce((s, e) => s + (e.duration_months || 0), 0);
                        return (
                          <tr key={app.id} className={i % 2 === 0 ? '' : 'bg-slate-50/40'}>
                            <Td center>{i + 1}</Td>
                            <Td><span className="font-semibold">{app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '—'}</span></Td>
                            <Td center>{fmtDate(app.created_at)}</Td>
                            <Td>{edu ? `${edu.degree ?? ''} ${edu.field_of_study ?? ''}`.trim() || '—' : '—'}</Td>
                            <Td center>{expMonths > 0 ? `${Math.round(expMonths / 12)} an(s)` : '—'}</Td>
                            <Td center>{app.candidate?.birth_date ? fmtDate(app.candidate.birth_date) : '—'}</Td>
                            <Td center><StatusBadge status={app.status} /></Td>
                            <Td center>
                              <button onClick={() => { setSelectedAppId(app.id); setReportView('candidate_synthesis'); }}
                                className="px-2 py-0.5 rounded text-xs font-semibold text-white transition"
                                style={{ background: SNH_GREEN }}>
                                Voir
                              </button>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {/* Spontaneous */}
          {(() => {
            const spontApps = filteredApps.filter(a => !a.job_opening_id);
            if (spontApps.length === 0) return null;
            return (
              <div>
                <div className="px-4 py-2 text-xs font-bold text-white" style={{ background: SNH_GREEN }}>
                  Candidatures spontanées
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr><Th>N°</Th><Th>Candidat</Th><Th>Poste souhaité</Th><Th>Date dépôt</Th><Th>Statut</Th></tr>
                    </thead>
                    <tbody>
                      {spontApps.slice(0, 5).map((app, i) => (
                        <tr key={app.id} className={i % 2 === 0 ? '' : 'bg-slate-50/40'}>
                          <Td center>{i + 1}</Td>
                          <Td><span className="font-semibold">{app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '—'}</span></Td>
                          <Td>{app.desired_position || '—'}</Td>
                          <Td center>{fmtDate(app.created_at)}</Td>
                          <Td center><StatusBadge status={app.status} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 30-day trend chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: SNH_GREEN }} />
              <span className="text-sm font-semibold text-slate-800">Évolution des candidatures (30 derniers jours)</span>
            </div>
            <span className="text-xs text-slate-400">Total : {applications.length}</span>
          </div>
          <SparkLine values={trend30} />
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
            <span>J-30</span>
            <span>Aujourd'hui</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            {[
              { label: 'Candidatures reçues', value: totalApps },
              { label: 'Candidats présélectionnés', value: applications.filter(a => !['new', 'rejected', 'withdrawn'].includes(a.status)).length },
              { label: 'Entretiens programmés', value: applications.filter(a => a.status === 'interview').length },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: SNH_GREEN }}>{value.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── REPORT: Candidate Synthesis ────────────────────────────────────────────
  const renderCandidateSynthesis = () => {
    const app = selectedApp;
    if (!app) return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Users size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">Sélectionnez une candidature depuis le tableau de bord</p>
        <button onClick={() => setReportView('dashboard')} className="mt-3 text-xs font-medium underline text-green-700">
          Retour au tableau de bord
        </button>
      </div>
    );

    const cand = app.candidate;
    const fullName = cand ? `${cand.first_name} ${cand.last_name}` : '—';
    const currentIdx = PIPELINE_STEPS.findIndex(s => s.value === app.status);
    const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / PIPELINE_STEPS.length) * 100) : 0;
    const edu = cand?.candidate_educations?.[0];
    const events = (app.pipeline_events || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastUpdate = events.length > 0 ? events[events.length - 1].created_at : app.created_at;

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, ${SNH_DARK} 100%)` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-200 text-xs font-medium uppercase tracking-widest">
                <BarChart3 size={12} /> Synthèse / Évolution sur une candidature précise
              </div>
              <div className="flex gap-2">
                <button onClick={() => printCandidateSynthesis(app)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs hover:bg-white/20 transition">
                  <Printer size={12} /> Imprimer
                </button>
                <button onClick={() => { setSelectedAppId(app.id); setReportView('candidate_fiche'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs hover:bg-white/20 transition">
                  <FileText size={12} /> Fiche candidat
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
            {/* Candidate identity */}
            <div className="p-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 flex-shrink-0 border-2 border-white shadow">
                {cand ? `${cand.first_name[0]}${cand.last_name[0]}`.toUpperCase() : '?'}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">{fullName}</p>
                <p className="text-xs text-slate-400 mt-0.5">Candidat(e)</p>
                <div className="mt-2 space-y-1">
                  {[
                    { label: 'Date de dépôt', value: fmtDate(app.created_at) },
                    { label: 'Offre', value: app.job_opening?.title || app.desired_position || 'Spontanée' },
                    { label: 'Statut actuel', value: STATUS_FR[app.status] ?? app.status },
                    { label: 'Phase actuelle', value: PIPELINE_STEPS.find(s => s.value === app.status)?.label ?? app.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2 text-xs">
                      <span className="text-slate-400 w-24 flex-shrink-0">{label} :</span>
                      <span className="font-semibold text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="p-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Phase actuelle', value: PIPELINE_STEPS.find(s => s.value === app.status)?.short ?? app.status, color: STATUS_COLOR[app.status] ?? SNH_GREEN },
                { label: 'Étapes validées', value: `${Math.max(0, currentIdx)} / ${PIPELINE_STEPS.length}`, color: '#0d9488' },
                { label: 'Taux d\'avancement', value: `${pct}%`, color: SNH_GREEN },
                { label: 'Dernière mise à jour', value: fmtDate(lastUpdate), color: '#6366f1' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Avancement du dossier</p>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: SNH_GREEN }} />
              </div>
              <p className="text-xs text-slate-400 text-right mb-3">{pct}% complété</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {PIPELINE_STEPS.map((s, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={s.value} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{ background: active ? STATUS_COLOR[s.value] : done ? '#10b981' : '#e5e7eb', color: active || done ? '#fff' : '#9ca3af' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs ${active ? 'font-bold' : done ? 'text-emerald-600' : 'text-slate-400'}`}
                        style={active ? { color: STATUS_COLOR[s.value] } : {}}>
                        {s.short}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <History size={14} style={{ color: SNH_GREEN }} />
            <span className="text-sm font-semibold text-slate-800">Évolution de la candidature</span>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-slate-400">Aucun événement enregistré</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
              <div className="space-y-3">
                {events.map((ev, i) => {
                  const step = PIPELINE_STEPS.find(s => s.value === ev.to_status);
                  return (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 z-10 ring-2 ring-white"
                        style={{ background: STATUS_COLOR[ev.to_status] ?? SNH_GREEN }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{step?.label ?? ev.to_status}</span>
                          <span className="text-xs text-slate-400">{fmtDate(ev.created_at)}</span>
                        </div>
                        {ev.notes && <p className="text-xs text-slate-500 mt-1 italic">"{ev.notes}"</p>}
                      </div>
                    </div>
                  );
                })}
                {/* Current */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 z-10 ring-2 ring-white animate-pulse"
                    style={{ background: STATUS_COLOR[app.status] ?? SNH_GREEN }}>
                    {events.length + 1}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: STATUS_COLOR[app.status] }}>
                        {PIPELINE_STEPS.find(s => s.value === app.status)?.label ?? app.status} — En cours
                      </span>
                      <span className="text-xs text-slate-400">{fmtDate(lastUpdate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scores table */}
        {(app.pipeline_stage_notes || []).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Award size={14} style={{ color: SNH_GREEN }} />
              <span className="text-sm font-semibold text-slate-800">Notes & scores par étape</span>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr><Th>Phase</Th><Th>Score</Th><Th>Évaluateur</Th><Th>Décision</Th><Th>Observations</Th></tr>
              </thead>
              <tbody>
                {(app.pipeline_stage_notes || []).map((n, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/40'}>
                    <Td>{PIPELINE_STEPS.find(s => s.value === n.stage)?.label ?? n.stage}</Td>
                    <Td center>{n.score != null ? `${n.score}${n.score_max ? `/${n.score_max}` : ''}` : '—'}</Td>
                    <Td>{n.evaluator_name ?? '—'}</Td>
                    <Td center>
                      {n.passed === true ? <span className="text-emerald-600 font-bold">Admis</span>
                        : n.passed === false ? <span className="text-red-500 font-bold">Non admis</span>
                        : <span className="text-slate-400">—</span>}
                    </Td>
                    <Td>{n.notes ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── REPORT: Candidate Fiche ────────────────────────────────────────────────
  const renderCandidateFiche = () => {
    const app = selectedApp;
    if (!app) return null;
    const cand = app.candidate;
    const fullName = cand ? `${cand.first_name} ${cand.last_name}` : '—';
    const edu = cand?.candidate_educations?.[0];
    const exps = cand?.candidate_experiences ?? [];
    const events = (app.pipeline_events || []).sort((a, b) => a.created_at.localeCompare(b.created_at));

    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between text-white" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, ${SNH_DARK} 100%)` }}>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span className="font-bold">État de la candidature — {fullName}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => printCandidateFiche(app)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs hover:bg-white/20 transition">
                <Printer size={12} /> Imprimer
              </button>
              <button onClick={() => setReportView('engagement_letter')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs hover:bg-white/20 transition">
                <FileText size={12} /> Lettre d'engagement
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: SNH_GREEN }}>Identité du candidat</h2>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500 border border-slate-200 flex-shrink-0">
                  {cand ? `${cand.first_name[0]}${cand.last_name[0]}`.toUpperCase() : '?'}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1">
                  {[
                    { label: 'NOM', value: cand?.last_name ?? '—' },
                    { label: 'Prénoms', value: cand?.first_name ?? '—' },
                    { label: 'Date de naissance', value: cand?.birth_date ? fmtDate(cand.birth_date) : '—' },
                    { label: 'Lieu de résidence', value: cand?.location ?? '—' },
                    { label: 'Diplôme', value: edu?.degree ?? '—' },
                    { label: 'École', value: edu?.institution ?? '—' },
                    { label: 'Domaine', value: edu?.field_of_study ?? '—' },
                    { label: 'Expérience', value: (() => { const m = exps.reduce((s, e) => s + (e.duration_months || 0), 0); return m > 0 ? `${Math.round(m / 12)} an(s)` : '—'; })() },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className="text-xs text-slate-400">{label} : </span>
                      <span className="text-xs font-semibold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evolution table */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: SNH_GREEN }}>Évolution de la candidature</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr><Th>Phase</Th><Th>Statut</Th><Th>Date</Th><Th>Observations</Th></tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => {
                    const note = (app.pipeline_stage_notes || []).find(n => n.stage === ev.to_status);
                    return (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/40'}>
                        <Td>{PIPELINE_STEPS.find(s => s.value === ev.to_status)?.short ?? ev.to_status}</Td>
                        <Td center>
                          {note?.passed === true ? <span className="text-emerald-600 font-bold text-xs">Validé</span>
                            : note?.passed === false ? <span className="text-red-500 font-bold text-xs">Échec</span>
                            : <span className="text-slate-400">—</span>}
                        </Td>
                        <Td center>{fmtDate(ev.created_at)}</Td>
                        <Td>{note?.notes ?? ev.notes ?? '—'}</Td>
                      </tr>
                    );
                  })}
                  {events.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-400 text-xs">Aucun événement</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Experiences */}
          {exps.length > 0 && (
            <div className="px-5 pb-5">
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: SNH_GREEN }}>Expériences / Stages professionnels</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr><Th>N°</Th><Th>Structure</Th><Th>Poste</Th><Th>Durée</Th></tr>
                </thead>
                <tbody>
                  {exps.map((exp, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/40'}>
                      <Td center>{i + 1}</Td>
                      <Td>{exp.company ?? '—'}</Td>
                      <Td>{exp.position ?? '—'}</Td>
                      <Td center>{exp.duration_months ? `${exp.duration_months} mois` : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pièces jointes */}
          <div className="px-5 pb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: SNH_GREEN }}>Pièces jointes</h2>
            <div className="space-y-2">
              {[
                { label: 'CV', icon: FileText },
                { label: 'Lettre de motivation', icon: BookOpen },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 p-2 border border-slate-100 rounded-lg bg-slate-50 text-xs text-slate-600">
                  <Icon size={13} className="text-red-400" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── REPORT: Offer Report ──────────────────────────────────────────────────
  const renderOfferReport = () => {
    const job = selectedJob ?? jobs[0] ?? null;
    const jobApps = job ? applications.filter(a => a.job_opening_id === job.id) : [];
    const phaseBreakdown = PIPELINE_STEPS.map(s => ({
      phase: s.label,
      count: jobApps.filter(a => a.status === s.value).length,
    })).filter(p => p.count > 0);

    return (
      <div className="space-y-5">
        {/* Job selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <Briefcase size={16} style={{ color: SNH_GREEN }} />
          <span className="text-sm font-semibold text-slate-700">Offre sélectionnée :</span>
          <select value={selectedJobId ?? ''} onChange={e => setSelectedJobId(e.target.value || null)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="">— Sélectionner une offre —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          {job && (
            <button onClick={() => printOfferReport(job, jobApps, phaseBreakdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition"
              style={{ background: SNH_GREEN }}>
              <Printer size={14} /> Imprimer
            </button>
          )}
        </div>

        {!job ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">Sélectionnez une offre pour afficher son rapport</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Offer info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 text-white font-bold text-sm" style={{ background: SNH_GREEN }}>
                Rapport de l'offre
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: 'NOM', value: job.title },
                  { label: 'Ref Note', value: `N° — du ${fmtDateLong(job.publication_date ?? new Date().toISOString())}` },
                  { label: 'Nbre de candidatures reçues', value: jobApps.length.toString() },
                  { label: 'Contrat', value: job.contract_type ?? '—' },
                  { label: 'Clôture', value: fmtDate(job.closing_date) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-40 flex-shrink-0">{label}</span>
                    <span className="text-xs font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 mt-2" style={{ color: SNH_GREEN }}>Évolution de l'étude de dossier</h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr><Th>Phase</Th><Th>Nbre de candidats</Th><Th>Observations</Th></tr>
                  </thead>
                  <tbody>
                    {phaseBreakdown.map((p, i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/40'}>
                        <Td>{p.phase}</Td>
                        <Td center>{p.count}</Td>
                        <Td>—</Td>
                      </tr>
                    ))}
                    {phaseBreakdown.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-center text-xs text-slate-400">Aucune donnée</td></tr>
                    )}
                  </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-3 italic">
                  Annexes : Liste des candidats par phase avec les observations et les notes
                </p>
              </div>
            </div>

            {/* Candidate list for this offer */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 text-white font-bold text-sm" style={{ background: SNH_GREEN }}>
                Candidats — {job.title}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr><Th>N°</Th><Th>Candidat</Th><Th>Date dépôt</Th><Th>Diplôme</Th><Th>Exp.</Th><Th>Phase</Th></tr>
                  </thead>
                  <tbody>
                    {jobApps.map((app, i) => {
                      const edu = app.candidate?.candidate_educations?.[0];
                      const expM = (app.candidate?.candidate_experiences || []).reduce((s, e) => s + (e.duration_months || 0), 0);
                      return (
                        <tr key={app.id} className={`cursor-pointer hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                          onClick={() => { setSelectedAppId(app.id); setReportView('candidate_synthesis'); }}>
                          <Td center>{i + 1}</Td>
                          <Td><span className="font-semibold">{app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '—'}</span></Td>
                          <Td center>{fmtDate(app.created_at)}</Td>
                          <Td>{edu?.degree ?? '—'}</Td>
                          <Td center>{expM > 0 ? `${Math.round(expM / 12)}a` : '—'}</Td>
                          <Td center><StatusBadge status={app.status} /></Td>
                        </tr>
                      );
                    })}
                    {jobApps.length === 0 && (
                      <tr><td colSpan={6} className="py-4 text-center text-xs text-slate-400">Aucune candidature</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── REPORT: Engagement Letter ──────────────────────────────────────────────
  const renderEngagementLetter = () => {
    const app = selectedApp;
    const cand = app?.candidate;
    const fullName = cand ? `${cand.first_name} ${cand.last_name}` : '[NOM PRÉNOM]';
    const poste = app?.desired_position || app?.job_opening?.title || '[POSTE]';
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 30);

    return (
      <div className="space-y-5">
        {/* Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <FileText size={16} style={{ color: SNH_GREEN }} />
          <span className="text-sm font-semibold text-slate-700">Candidat :</span>
          <select value={selectedAppId ?? ''} onChange={e => setSelectedAppId(e.target.value || null)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="">— Sélectionner un candidat —</option>
            {applications.filter(a => a.status === 'trial' || a.status === 'assignment' || a.status === 'integrated')
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.candidate ? `${a.candidate.first_name} ${a.candidate.last_name}` : a.id} — {STATUS_FR[a.status]}
                </option>
              ))}
          </select>
          <button onClick={() => printEngagementLetter(fullName, poste, startDate)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition"
            style={{ background: SNH_GREEN }}>
            <Download size={14} /> Générer Word / PDF
          </button>
        </div>

        {/* Letter preview */}
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: '#2563eb' }}>W</div>
            <span className="text-sm font-semibold text-slate-700">Génération de la Lettre d'Engagement à l'Essai</span>
          </div>
          <div className="p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: SNH_GREEN }}>S</div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">SOCIÉTÉ NATIONALE DES HYDROCARBURES</p>
                  <p className="text-xs text-slate-400">(SNH)</p>
                </div>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-4">LETTRE D'ENGAGEMENT À L'ESSAI</h2>
            </div>

            <p className="text-sm text-slate-700 mb-4">Madame, Monsieur <strong>{fullName}</strong>,</p>

            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              Nous avons le plaisir de vous informer que, suite à votre candidature et aux différentes étapes du
              processus de recrutement, vous êtes retenu(e) pour le poste de{' '}
              <strong>{poste}</strong> au sein de la Société Nationale des Hydrocarbures.
            </p>

            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              Vous êtes engagé(e) à titre d'essai pour une durée de <strong>trois (03) mois</strong> à compter du{' '}
              <strong>{fmtDateLong(startDate.toISOString())}</strong>, conformément aux dispositions du Code du travail en vigueur.
            </p>

            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              Durant cette période, vos compétences professionnelles et votre intégration au sein de notre équipe
              seront évaluées.
            </p>

            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              Nous vous prions de bien vouloir nous faire parvenir les pièces nécessaires à la constitution de votre
              dossier administratif.
            </p>

            <p className="text-sm text-slate-700 mb-8">Nous vous souhaitons la bienvenue au sein de la SNH.</p>

            <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-slate-100">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Yaoundé, le {fmtDateLong(today.toISOString())}</p>
                <p className="text-xs font-semibold text-slate-700 mt-4">Le Directeur des Ressources Humaines</p>
                <div className="mt-6 border-t border-slate-300 pt-1">
                  <p className="text-xs text-slate-400">Signature</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Lu et approuvé</p>
                <p className="text-xs font-semibold text-slate-700 mt-4">{fullName}</p>
                <div className="mt-6 border-t border-slate-300 pt-1">
                  <p className="text-xs text-slate-400">Signature du candidat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Print functions ──────────────────────────────────────────────────────────
  const printDashboard = (apps: AppRow[]) => {
    const rows = apps.slice(0, 50).map((app, i) => {
      const edu = app.candidate?.candidate_educations?.[0];
      const expM = (app.candidate?.candidate_experiences || []).reduce((s, e) => s + (e.duration_months || 0), 0);
      const name = app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '—';
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${name}</td>
        <td>${app.desired_position || app.job_opening?.title || '—'}</td>
        <td style="text-align:center">${fmtDate(app.created_at)}</td>
        <td>${edu?.degree ?? '—'}</td>
        <td style="text-align:center">${expM > 0 ? `${Math.round(expM / 12)} an(s)` : '—'}</td>
        <td style="text-align:center">${STATUS_FR[app.status] ?? app.status}</td>
      </tr>`;
    }).join('');

    printElement(`
      <div class="logo-bar">
        <div class="logo-box">S</div>
        <div>
          <h1>Tableaux de Bord — Candidatures</h1>
          <p class="subtitle">Société Nationale des Hydrocarbures du Cameroun</p>
        </div>
      </div>
      <h2>Récapitulatif des candidatures (${apps.length} résultat(s))</h2>
      <table>
        <thead><tr><th>N°</th><th>Candidat</th><th>Poste visé</th><th>Date dépôt</th><th>Diplôme</th><th>Expérience</th><th>Statut</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `, 'Tableau de Bord — Candidatures SNH');
  };

  const printCandidateSynthesis = (app: AppRow) => {
    const cand = app.candidate;
    const fullName = cand ? `${cand.first_name} ${cand.last_name}` : '—';
    const currentIdx = PIPELINE_STEPS.findIndex(s => s.value === app.status);
    const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / PIPELINE_STEPS.length) * 100) : 0;
    const events = (app.pipeline_events || []).sort((a, b) => a.created_at.localeCompare(b.created_at));

    const evRows = events.map((ev, i) => `<tr>
      <td>${i + 1}</td>
      <td>${PIPELINE_STEPS.find(s => s.value === ev.to_status)?.label ?? ev.to_status}</td>
      <td style="text-align:center">${fmtDate(ev.created_at)}</td>
      <td>${ev.notes ?? '—'}</td>
    </tr>`).join('');

    printElement(`
      <div class="logo-bar">
        <div class="logo-box">S</div>
        <div>
          <h1>Synthèse — ${fullName}</h1>
          <p class="subtitle">Société Nationale des Hydrocarbures du Cameroun</p>
        </div>
      </div>
      <div class="section">
        <div class="meta">
          <div class="meta-item"><label>Candidat(e)</label><span>${fullName}</span></div>
          <div class="meta-item"><label>Poste visé</label><span>${app.desired_position || app.job_opening?.title || '—'}</span></div>
          <div class="meta-item"><label>Date de dépôt</label><span>${fmtDate(app.created_at)}</span></div>
          <div class="meta-item"><label>Phase actuelle</label><span>${STATUS_FR[app.status] ?? app.status}</span></div>
          <div class="meta-item"><label>Taux d'avancement</label><span>${pct}%</span></div>
          <div class="meta-item"><label>Étapes validées</label><span>${Math.max(0, currentIdx)} / ${PIPELINE_STEPS.length}</span></div>
        </div>
      </div>
      <h2>Évolution de la candidature</h2>
      <table>
        <thead><tr><th>N°</th><th>Phase</th><th>Date</th><th>Observations</th></tr></thead>
        <tbody>${evRows}</tbody>
      </table>
    `, `Synthèse candidature — ${fullName}`);
  };

  const printCandidateFiche = (app: AppRow) => {
    const cand = app.candidate;
    const fullName = cand ? `${cand.first_name} ${cand.last_name}` : '—';
    const edu = cand?.candidate_educations?.[0];
    const exps = cand?.candidate_experiences ?? [];
    const events = (app.pipeline_events || []).sort((a, b) => a.created_at.localeCompare(b.created_at));

    const expRows = exps.map((e, i) => `<tr>
      <td style="text-align:center">${i + 1}</td><td>${e.company ?? '—'}</td>
      <td>${e.position ?? '—'}</td><td style="text-align:center">${e.duration_months ? `${e.duration_months} mois` : '—'}</td>
    </tr>`).join('');

    const evRows = events.map((ev, i) => {
      const note = (app.pipeline_stage_notes || []).find(n => n.stage === ev.to_status);
      return `<tr>
        <td>${PIPELINE_STEPS.find(s => s.value === ev.to_status)?.short ?? ev.to_status}</td>
        <td style="text-align:center">${note?.passed === true ? 'Validé' : note?.passed === false ? 'Échec' : '—'}</td>
        <td style="text-align:center">${fmtDate(ev.created_at)}</td>
        <td>${note?.notes ?? ev.notes ?? '—'}</td>
      </tr>`;
    }).join('');

    printElement(`
      <div class="logo-bar">
        <div class="logo-box">S</div>
        <div>
          <h1>État de la Candidature — ${fullName}</h1>
          <p class="subtitle">Société Nationale des Hydrocarbures du Cameroun</p>
        </div>
      </div>
      <div class="section">
        <div class="meta">
          <div class="meta-item"><label>NOM</label><span>${cand?.last_name ?? '—'}</span></div>
          <div class="meta-item"><label>Prénoms</label><span>${cand?.first_name ?? '—'}</span></div>
          <div class="meta-item"><label>Date de naissance</label><span>${cand?.birth_date ? fmtDate(cand.birth_date) : '—'}</span></div>
          <div class="meta-item"><label>Lieu de résidence</label><span>${cand?.location ?? '—'}</span></div>
          <div class="meta-item"><label>Diplôme</label><span>${edu?.degree ?? '—'}</span></div>
          <div class="meta-item"><label>École</label><span>${edu?.institution ?? '—'}</span></div>
          <div class="meta-item"><label>Domaine</label><span>${edu?.field_of_study ?? '—'}</span></div>
          <div class="meta-item"><label>Expérience</label><span>${(() => { const m = exps.reduce((s, e) => s + (e.duration_months || 0), 0); return m > 0 ? `${Math.round(m / 12)} an(s)` : '—'; })()}</span></div>
        </div>
      </div>
      ${exps.length > 0 ? `
      <h2>Expériences / Stages professionnels</h2>
      <table>
        <thead><tr><th>N°</th><th>Structure</th><th>Poste</th><th>Durée</th></tr></thead>
        <tbody>${expRows}</tbody>
      </table>` : ''}
      <h2>Évolution de la candidature</h2>
      <table>
        <thead><tr><th>Phase</th><th>Statut</th><th>Date</th><th>Observations</th></tr></thead>
        <tbody>${evRows}</tbody>
      </table>
    `, `État candidature — ${fullName}`);
  };

  const printOfferReport = (job: JobOpening, apps: AppRow[], phaseBreakdown: { phase: string; count: number }[]) => {
    const phaseRows = phaseBreakdown.map(p => `<tr><td>${p.phase}</td><td style="text-align:center">${p.count}</td><td>—</td></tr>`).join('');
    const appRows = apps.slice(0, 50).map((app, i) => {
      const edu = app.candidate?.candidate_educations?.[0];
      const expM = (app.candidate?.candidate_experiences || []).reduce((s, e) => s + (e.duration_months || 0), 0);
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '—'}</td>
        <td style="text-align:center">${fmtDate(app.created_at)}</td>
        <td>${edu?.degree ?? '—'}</td>
        <td style="text-align:center">${expM > 0 ? `${Math.round(expM / 12)}a` : '—'}</td>
        <td style="text-align:center">${STATUS_FR[app.status] ?? app.status}</td>
      </tr>`;
    }).join('');

    printElement(`
      <div class="logo-bar">
        <div class="logo-box">S</div>
        <div>
          <h1>Rapport de l'Offre — ${job.title}</h1>
          <p class="subtitle">Société Nationale des Hydrocarbures du Cameroun</p>
        </div>
      </div>
      <div class="section">
        <div class="meta">
          <div class="meta-item"><label>NOM</label><span>${job.title}</span></div>
          <div class="meta-item"><label>Contrat</label><span>${job.contract_type ?? '—'}</span></div>
          <div class="meta-item"><label>Nbre de candidatures reçues</label><span>${apps.length}</span></div>
          <div class="meta-item"><label>Clôture</label><span>${fmtDate(job.closing_date)}</span></div>
        </div>
      </div>
      <h2>Évolution de l'étude de dossier</h2>
      <table>
        <thead><tr><th>Phase</th><th>Nombre de candidats</th><th>Observations</th></tr></thead>
        <tbody>${phaseRows}</tbody>
      </table>
      <h2>Liste des candidats</h2>
      <table>
        <thead><tr><th>N°</th><th>Candidat</th><th>Date dépôt</th><th>Diplôme</th><th>Exp.</th><th>Phase</th></tr></thead>
        <tbody>${appRows}</tbody>
      </table>
      <p style="font-size:10px;color:#9ca3af;margin-top:8px;font-style:italic;">
        Annexes : Liste des candidats par phase avec les observations et les notes
      </p>
    `, `Rapport offre — ${job.title}`);
  };

  const printEngagementLetter = (fullName: string, poste: string, startDate: Date) => {
    printElement(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
          <div class="logo-box">S</div>
          <div style="text-align:left">
            <strong>SOCIÉTÉ NATIONALE DES HYDROCARBURES</strong><br>
            <span style="font-size:10px;color:#6b7280;">(SNH)</span>
          </div>
        </div>
        <h2 style="font-size:14px;margin-top:16px;">LETTRE D'ENGAGEMENT À L'ESSAI</h2>
      </div>
      <p style="margin-bottom:12px;">Madame, Monsieur <strong>${fullName}</strong>,</p>
      <p style="margin-bottom:12px;line-height:1.6;">
        Nous avons le plaisir de vous informer que, suite à votre candidature et aux différentes étapes du processus
        de recrutement, vous êtes retenu(e) pour le poste de <strong>${poste}</strong>.
      </p>
      <p style="margin-bottom:12px;line-height:1.6;">
        Vous êtes engagé(e) à titre d'essai pour une durée de <strong>trois (03) mois</strong> à compter du
        <strong>${fmtDateLong(startDate.toISOString())}</strong>, conformément aux dispositions du Code du travail en vigueur.
      </p>
      <p style="margin-bottom:12px;line-height:1.6;">
        Durant cette période, vos compétences professionnelles et votre intégration au sein de notre équipe seront évaluées.
      </p>
      <p style="margin-bottom:12px;line-height:1.6;">
        Nous vous prions de bien vouloir nous faire parvenir les pièces nécessaires à la constitution de votre dossier administratif.
      </p>
      <p style="margin-bottom:32px;">Nous vous souhaitons la bienvenue au sein de la SNH.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
        <div style="text-align:center;">
          <p style="font-size:11px;color:#6b7280;">Yaoundé, le ${fmtDateLong(new Date().toISOString())}</p>
          <p style="margin-top:12px;font-weight:600;font-size:11px;">Le Directeur des Ressources Humaines</p>
          <div style="margin-top:40px;border-top:1px solid #9ca3af;padding-top:4px;font-size:10px;color:#9ca3af;">Signature</div>
        </div>
        <div style="text-align:center;">
          <p style="font-size:11px;color:#6b7280;">Lu et approuvé</p>
          <p style="margin-top:12px;font-weight:600;font-size:11px;">${fullName}</p>
          <div style="margin-top:40px;border-top:1px solid #9ca3af;padding-top:4px;font-size:10px;color:#9ca3af;">Signature du candidat</div>
        </div>
      </div>
    `, `Lettre engagement — ${fullName}`);
  };

  // ── History icon import ────────────────────────────────────────────────────
  const History = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const navItems: { id: ReportView; label: string; icon: React.FC<any> }[] = [
    { id: 'dashboard',           label: 'Tableau de bord',           icon: BarChart3 },
    { id: 'candidate_synthesis', label: 'Synthèse candidature',      icon: TrendingUp },
    { id: 'candidate_fiche',     label: 'État de la candidature',    icon: User },
    { id: 'offer_report',        label: 'Rapport de l\'offre',        icon: Briefcase },
    { id: 'engagement_letter',   label: 'Lettre d\'engagement',      icon: FileText },
  ];

  return (
    <div className="flex gap-5 min-h-0">
      {/* Sidebar nav */}
      <div className="w-52 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-0">
          <div className="px-3 py-3 border-b border-slate-100" style={{ background: `${SNH_GREEN}08` }}>
            <div className="flex items-center gap-2">
              <BarChart3 size={14} style={{ color: SNH_GREEN }} />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">États & Rapports</span>
            </div>
          </div>
          <div className="p-2 space-y-0.5">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setReportView(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                  reportView === id
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                style={reportView === id ? { background: SNH_GREEN } : {}}>
                <Icon size={13} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-slate-100">
            <button onClick={loadData}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 hover:bg-slate-50 transition">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {reportView === 'dashboard' && renderDashboard()}
        {reportView === 'candidate_synthesis' && renderCandidateSynthesis()}
        {reportView === 'candidate_fiche' && renderCandidateFiche()}
        {reportView === 'offer_report' && renderOfferReport()}
        {reportView === 'engagement_letter' && renderEngagementLetter()}
      </div>
    </div>
  );
}
