import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, FileText, Users, TrendingUp, Printer,
  RefreshCw, ChevronRight, Briefcase, ClipboardList, Award, User
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cand {
  id: string; first_name: string; last_name: string; email: string;
  phone?: string|null; birth_date?: string|null; gender?: string|null;
  nationality?: string|null; location?: string|null;
  professional_title?: string|null; photo_url?: string|null;
  candidate_applications?: App[];
  candidate_educations?: { degree: string; field_of_study?: string|null; institution: string; end_date?: string|null }[];
  candidate_experiences?: { job_title?: string|null; company?: string|null; start_date?: string|null; end_date?: string|null; is_current?: boolean }[];
}
interface App {
  id: string; status: string; created_at: string;
  desired_position?: string|null; rating?: number|null;
  offer_start_date?: string|null; trial_period_months?: number|null;
  trial_end_date?: string|null; offer_salary?: number|null;
  offer_contract_type?: string|null; offer_date?: string|null;
  job_opening_id?: string|null;
  job_opening?: { id: string; title: string }|null;
}
interface Job { id: string; title: string; status: string; contract_type?: string|null; publication_date?: string|null; }

interface Props { candidates: Cand[]; }

type View = 'dashboard' | 'synthese' | 'etat' | 'offre' | 'lettre';

// ── Constants ─────────────────────────────────────────────────────────────────
const G = '#006B3C';
const GD = '#004d2b';

const STAGES = [
  { v: 'new',              l: 'Candidature',             s: 'Candidature' },
  { v: 'technical_tests',  l: 'Tests techniques',        s: 'Tests tech.' },
  { v: 'interview',        l: "Entretien d'embauche",    s: 'Entretien' },
  { v: 'psycho_tests',     l: 'Tests psy. & professionnels', s: 'Tests psy.' },
  { v: 'medical_visit',    l: "Visite médicale d'embauche", s: 'Visite méd.' },
  { v: 'morality_inquiry', l: 'Enquête de moralité',     s: 'Moralité' },
  { v: 'diploma_check',    l: 'Auth. diplômes & état civil', s: 'Diplômes' },
  { v: 'trial',            l: "Engagement à l'essai",    s: 'Essai' },
  { v: 'assignment',       l: 'Affectation & prise de service', s: 'Affectation' },
  { v: 'integrated',       l: 'Titularisation',          s: 'Titularisé(e)' },
];

const SFR: Record<string,string> = {
  new:'Candidature', technical_tests:'Tests tech.', interview:'Entretien',
  psycho_tests:'Tests psy.', medical_visit:'Visite méd.', morality_inquiry:'Moralité',
  diploma_check:'Diplômes', trial:'Eng. essai', assignment:'Affectation',
  integrated:'Titularisé(e)', rejected:'Refusé(e)', withdrawn:'Retiré(e)',
};

const SC: Record<string,string> = {
  new:'#3b82f6', technical_tests:'#f59e0b', interview:'#f97316', psycho_tests:'#8b5cf6',
  medical_visit:'#0d9488', morality_inquiry:'#06b6d4', diploma_check:'#6366f1',
  trial:'#22c55e', assignment:'#10b981', integrated:'#059669', rejected:'#ef4444', withdrawn:'#94a3b8',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d?: string|null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtLong = (d?: string|null) => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : '—';
const fullName = (c: Cand) => `${c.first_name} ${c.last_name}`;
const topDegree = (c: Cand) => {
  const eds = c.candidate_educations ?? [];
  return eds.length ? eds[eds.length-1].degree : '—';
};
const expMonths = (c: Cand) => {
  return (c.candidate_experiences ?? []).reduce((sum, e) => {
    if (!e.start_date) return sum;
    const end = e.end_date ? new Date(e.end_date) : new Date();
    const s = new Date(e.start_date);
    return sum + Math.max(0,(end.getFullYear()-s.getFullYear())*12+end.getMonth()-s.getMonth());
  }, 0);
};
const expStr = (m: number) => m >= 12 ? `${Math.floor(m/12)} an(s)` : `${m} mois`;

function getRows(candidates: Cand[]) {
  const rows: {app: App; cand: Cand}[] = [];
  for (const c of candidates)
    for (const a of (c.candidate_applications ?? []))
      rows.push({app: a, cand: c});
  return rows.sort((a,b) => b.app.created_at.localeCompare(a.app.created_at));
}

// ── Print helper ──────────────────────────────────────────────────────────────
const BASE_STYLE = `
  *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}
  body{padding:20px;font-size:11px;color:#111}
  .hdr{background:#006B3C;color:#fff;padding:14px 20px;margin:-20px -20px 18px}
  .hdr h1{font-size:18px;margin:4px 0 0}
  .hdr small{font-size:10px;opacity:.8;text-transform:uppercase;letter-spacing:1px}
  .meta{font-size:10px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#006B3C;color:#fff;padding:6px 8px;font-size:10px;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;vertical-align:top}
  tr:nth-child(even) td{background:#f0fdf4}
  h2{font-size:13px;color:#004d2b;margin:14px 0 6px;border-left:3px solid #006B3C;padding-left:8px}
  .kpi{display:inline-block;border:1px solid #d1fae5;border-radius:6px;padding:10px 18px;margin:0 6px 10px 0;text-align:center}
  .kv{font-size:22px;font-weight:700;color:#006B3C}
  .kl{font-size:10px;color:#555;margin-top:2px}
  p{margin:4px 0;font-size:11px}
  .sig{margin-top:40px;display:flex;justify-content:space-between}
  .sig div{text-align:center;width:45%}
  .sig .line{border-top:1px solid #000;margin-top:40px;padding-top:6px;font-size:10px}
  @media print{body{padding:12px}}
`;

function printHtml(html: string, title: string) {
  const fullHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title><style>${BASE_STYLE}</style></head><body>
  <div class="hdr"><small>Société Nationale des Hydrocarbures — Direction des Ressources Humaines</small><h1>${title}</h1></div>
  <div class="meta">Généré le ${fmtLong(new Date().toISOString())}</div>
  ${html}
  <script>window.onload=function(){window.focus();window.print();}<\/script>
  </body></html>`;
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ s }: { s: string }) {
  const c = SC[s] ?? '#64748b';
  return (
    <span style={{background:c+'22',color:c,padding:'2px 8px',borderRadius:9999,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>
      {SFR[s] ?? s}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecruitmentReports({ candidates }: Props) {
  const [view, setView] = useState<View>('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);

  // Filters
  const [fJob, setFJob] = useState('all');
  const [fStage, setFStage] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  // Selection for offre & lettre views
  const [selJobId, setSelJobId] = useState('');
  const [selAppId, setSelAppId] = useState('');

  useEffect(() => {
    supabase.from('job_openings')
      .select('id, title, status, contract_type, publication_date')
      .order('publication_date', { ascending: false })
      .then(({ data }) => { if (data) setJobs(data as Job[]); });
  }, []);

  const allRows = getRows(candidates);

  // Filtered rows for dashboard/synthese/etat
  const rows = allRows.filter(({app}) => {
    if (fJob !== 'all' && app.job_opening?.id !== fJob && app.job_opening_id !== fJob) return false;
    if (fStage !== 'all' && app.status !== fStage) return false;
    if (fFrom && app.created_at < fFrom) return false;
    if (fTo && app.created_at > fTo + 'T23:59:59') return false;
    return true;
  });

  const activeRows = allRows.filter(({app}) =>
    !['rejected','withdrawn','integrated'].includes(app.status)
  );
  const integratedCount = allRows.filter(({app}) => app.status === 'integrated').length;
  const uniqueCands = new Set(allRows.map(r => r.cand.id)).size;

  // For rapport de l'offre
  const offreRows = allRows.filter(({app}) =>
    app.job_opening?.id === selJobId || app.job_opening_id === selJobId
  );
  const selJob = jobs.find(j => j.id === selJobId);

  // For lettre
  const trialRows = allRows.filter(({app}) =>
    ['trial','assignment','integrated'].includes(app.status)
  );
  const selLettre = trialRows.find(({app}) => app.id === selAppId);

  // ── Nav ──────────────────────────────────────────────────────────────────────
  const NAV: { v: View; label: string; icon: React.ReactNode }[] = [
    { v: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={15}/> },
    { v: 'synthese',  label: 'Synthèse candidature', icon: <TrendingUp size={15}/> },
    { v: 'etat',      label: 'État de la candidature', icon: <Users size={15}/> },
    { v: 'offre',     label: "Rapport de l'offre", icon: <Briefcase size={15}/> },
    { v: 'lettre',    label: "Lettre d'engagement", icon: <FileText size={15}/> },
  ];

  // ── Shared filter bar ─────────────────────────────────────────────────────────
  function FilterBar({ showStage = true }: { showStage?: boolean }) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 mb-4">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-slate-500 mb-1">Offre</label>
          <select value={fJob} onChange={e => setFJob(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="all">Toutes les offres</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        {showStage && (
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-slate-500 mb-1">Phase</label>
            <select value={fStage} onChange={e => setFStage(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="all">Toutes les phases</option>
              {STAGES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              <option value="rejected">Refusé(e)</option>
              <option value="withdrawn">Retiré(e)</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Du</label>
          <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"/>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Au</label>
          <input type="date" value={fTo} onChange={e => setFTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"/>
        </div>
        {(fJob !== 'all' || fStage !== 'all' || fFrom || fTo) && (
          <button onClick={() => { setFJob('all'); setFStage('all'); setFFrom(''); setFTo(''); }}
            className="mt-4 text-xs text-slate-500 hover:text-slate-800 underline">
            Réinitialiser
          </button>
        )}
      </div>
    );
  }

  // ── Candidature table (shared) ────────────────────────────────────────────────
  function AppTable({ data }: { data: typeof rows }) {
    if (data.length === 0)
      return <div className="text-center py-10 text-slate-400 text-sm">Aucune candidature</div>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{background:GD}}>
              {['N°','Candidat','Poste visé','Date dépôt','Diplôme','Expérience','Statut'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-white font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(({app,cand},i) => (
              <tr key={app.id} className={i%2===0?'bg-white':'bg-slate-50/60'}>
                <td className="px-3 py-2 text-slate-500">{i+1}</td>
                <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{fullName(cand)}</td>
                <td className="px-3 py-2 text-slate-600">{app.desired_position ?? app.job_opening?.title ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmt(app.created_at)}</td>
                <td className="px-3 py-2 text-slate-500">{topDegree(cand)}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{expStr(expMonths(cand))}</td>
                <td className="px-3 py-2"><Badge s={app.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────────
  function Dashboard() {
    const byStage = STAGES.map(s => ({
      ...s,
      count: allRows.filter(r => r.app.status === s.v).length,
    }));
    const maxCount = Math.max(...byStage.map(s => s.count), 1);

    // Group by job
    const byJob: Record<string,{title:string;count:number}> = {};
    for (const {app} of allRows) {
      const jid = app.job_opening?.id ?? app.job_opening_id ?? '__none__';
      const title = app.job_opening?.title ?? 'Non précisé';
      if (!byJob[jid]) byJob[jid] = {title, count: 0};
      byJob[jid].count++;
    }
    const jobList = Object.values(byJob).sort((a,b)=>b.count-a.count).slice(0,8);

    // Evolution last 30 days
    const today = new Date();
    const days: {label:string; count:number}[] = [];
    for (let i=29; i>=0; i--) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const ds = d.toISOString().slice(0,10);
      days.push({
        label: d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),
        count: allRows.filter(r => r.app.created_at.slice(0,10) === ds).length,
      });
    }
    const maxDay = Math.max(...days.map(d=>d.count), 1);

    function printDashboard() {
      const stageRows = byStage.map(s =>
        `<tr><td>${s.l}</td><td style="text-align:right;font-weight:600">${s.count}</td></tr>`
      ).join('');
      const jobRows = jobList.map(j =>
        `<tr><td>${j.title}</td><td style="text-align:right;font-weight:600">${j.count}</td></tr>`
      ).join('');
      printHtml(`
        <div>
          <div class="kpi"><span class="kv">${allRows.length}</span><div class="kl">Candidatures reçues</div></div>
          <div class="kpi"><span class="kv">${uniqueCands}</span><div class="kl">Candidats uniques</div></div>
          <div class="kpi"><span class="kv">${activeRows.length}</span><div class="kl">En cours de traitement</div></div>
          <div class="kpi"><span class="kv">${integratedCount}</span><div class="kl">Titularisés</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
          <div><h2>Répartition par phase du pipeline</h2>
          <table><tr><th>Phase</th><th style="text-align:right">Candidats</th></tr>${stageRows}</table></div>
          <div><h2>Candidatures par offre</h2>
          <table><tr><th>Offre</th><th style="text-align:right">Nb.</th></tr>${jobRows}</table></div>
        </div>`, 'Tableau de Bord — Candidatures');
    }

    return (
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Candidatures reçues', val: allRows.length, color: 'text-blue-600' },
            { label: 'Candidats uniques',   val: uniqueCands,    color: 'text-emerald-600' },
            { label: 'En cours de traitement', val: activeRows.length, color: 'text-amber-500' },
            { label: 'Titularisés',          val: integratedCount, color: 'text-green-700' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`text-3xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <FilterBar/>

        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-700">
            Récapitulatif des candidatures <span className="text-slate-400 font-normal ml-1">{rows.length} résultat(s)</span>
          </span>
          <button onClick={printDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg"
            style={{background:G}}>
            <Printer size={13}/> Imprimer
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <AppTable data={rows}/>
          </div>

          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Répartition par phase du pipeline</div>
            <div className="space-y-1.5">
              {byStage.map(s => (
                <div key={s.v} className="flex items-center gap-2 text-xs">
                  <span className="text-right text-slate-500 w-20 shrink-0 truncate">{s.s}</span>
                  <div className="flex-1 h-4 rounded-sm bg-slate-100 relative overflow-hidden">
                    <div className="h-full rounded-sm transition-all"
                      style={{width:`${(s.count/maxCount)*100}%`,background:G}}/>
                    <span className="absolute right-2 top-0 h-full flex items-center text-xs font-semibold text-slate-700">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By job */}
        {jobList.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Briefcase size={15} className="text-emerald-700"/> Liste des candidats par offre
            </div>
            <div className="space-y-1.5">
              {jobList.map((j,i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 flex-1 truncate">{j.title}</span>
                  <span className="font-semibold text-slate-800 w-8 text-right">{j.count}</span>
                  <div className="w-32 h-3 rounded-sm bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-sm" style={{width:`${(j.count/Math.max(...jobList.map(x=>x.count),1))*100}%`,background:G}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evolution */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-700"/>
            Évolution des candidatures (30 derniers jours)
            <span className="text-slate-400 font-normal text-xs ml-1">Total : {days.reduce((s,d)=>s+d.count,0)}</span>
          </div>
          <div className="flex items-end gap-0.5 h-20">
            {days.map((d,i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div className="w-full rounded-sm transition-all"
                  style={{height:`${Math.max(2,(d.count/maxDay)*64)}px`,background:G,opacity:d.count?1:0.15}}/>
                {i % 5 === 0 && (
                  <span className="text-slate-400" style={{fontSize:8}}>{d.label}</span>
                )}
                {d.count > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap" style={{fontSize:9}}>
                    {d.label}: {d.count}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── SYNTHÈSE CANDIDATURE ──────────────────────────────────────────────────────
  function SyntheseView() {
    // Group by type (contract type from job opening or status category)
    const byType: Record<string,{label:string;rows:typeof rows}> = {};
    for (const r of rows) {
      const t = r.app.offer_contract_type ?? 'Non précisé';
      if (!byType[t]) byType[t] = {label:t, rows:[]};
      byType[t].rows.push(r);
    }

    function printSynthese() {
      const tableRows = rows.map((r,i) => `<tr>
        <td>${i+1}</td><td>${fullName(r.cand)}</td>
        <td>${r.app.desired_position ?? r.app.job_opening?.title ?? '—'}</td>
        <td>${fmt(r.app.created_at)}</td>
        <td>${topDegree(r.cand)}</td>
        <td>${expStr(expMonths(r.cand))}</td>
        <td>${SFR[r.app.status] ?? r.app.status}</td>
      </tr>`).join('');

      const byTypeRows = Object.values(byType).map(t => `
        <h2>${t.label} (${t.rows.length})</h2>
        <table><tr><th>N°</th><th>Candidat</th><th>Poste visé</th><th>Date dépôt</th><th>Statut</th></tr>
        ${t.rows.map((r,i) => `<tr><td>${i+1}</td><td>${fullName(r.cand)}</td><td>${r.app.desired_position??r.app.job_opening?.title??'—'}</td><td>${fmt(r.app.created_at)}</td><td>${SFR[r.app.status]??r.app.status}</td></tr>`).join('')}
        </table>`).join('');

      const period = (fFrom || fTo) ? `Période : ${fFrom ? fmt(fFrom) : '—'} → ${fTo ? fmt(fTo) : '—'}` : '';
      printHtml(`
        ${period ? `<p style="margin-bottom:10px">${period}</p>` : ''}
        <h2>Récapitulatif des candidatures (${rows.length})</h2>
        <table><tr><th>N°</th><th>Candidat</th><th>Poste visé</th><th>Date dépôt</th><th>Diplôme</th><th>Expérience</th><th>Statut</th></tr>
        ${tableRows}</table>
        <h2>Répartition par type de candidature</h2>
        ${byTypeRows}
      `, 'Synthèse des Candidatures');
    }

    return (
      <div className="space-y-4">
        <FilterBar/>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Récapitulatif des candidatures
            <span className="text-slate-400 font-normal ml-2 text-xs">{rows.length} résultat(s)</span>
          </span>
          <button onClick={printSynthese} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg" style={{background:G}}>
            <Printer size={13}/> Imprimer
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <AppTable data={rows}/>
        </div>

        {Object.values(byType).length > 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Répartition par type de candidature</div>
            <div className="space-y-3">
              {Object.values(byType).map(t => (
                <div key={t.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{t.label}</span>
                    <span className="text-slate-500">{t.rows.length} candidature(s)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${(t.rows.length/rows.length)*100}%`,background:G}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ÉTAT DE LA CANDIDATURE ────────────────────────────────────────────────────
  function EtatView() {
    function printEtat() {
      const tableRows = rows.map((r,i) => `<tr>
        <td>${i+1}</td><td>${fullName(r.cand)}</td>
        <td>${r.app.desired_position ?? r.app.job_opening?.title ?? '—'}</td>
        <td>${r.cand.professional_title ?? '—'}</td>
        <td>${topDegree(r.cand)}</td>
        <td>${expStr(expMonths(r.cand))}</td>
        <td>${fmt(r.app.created_at)}</td>
        <td>${SFR[r.app.status] ?? r.app.status}</td>
      </tr>`).join('');
      const jobTitle = fJob !== 'all' ? (jobs.find(j=>j.id===fJob)?.title ?? '') : 'Toutes les offres';
      const stageTitle = fStage !== 'all' ? (STAGES.find(s=>s.v===fStage)?.l ?? fStage) : 'Toutes les phases';
      printHtml(`
        <p><strong>Offre :</strong> ${jobTitle} | <strong>Phase :</strong> ${stageTitle}</p><br/>
        <table><tr><th>N°</th><th>Candidat</th><th>Poste visé</th><th>Titre professionnel</th><th>Diplôme</th><th>Expérience</th><th>Date dépôt</th><th>Statut</th></tr>
        ${tableRows}</table>
      `, "Liste des candidats — État de la candidature");
    }

    return (
      <div className="space-y-4">
        <FilterBar showStage={true}/>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Liste des candidats
            <span className="text-slate-400 font-normal ml-2 text-xs">{rows.length} résultat(s)</span>
          </span>
          <button onClick={printEtat} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg" style={{background:G}}>
            <Printer size={13}/> Imprimer
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{background:GD}}>
                  {['N°','Candidat','Poste visé','Titre','Diplôme','Expérience','Date dépôt','Statut'].map(h=>(
                    <th key={h} className="px-3 py-2 text-left text-white font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">Aucune candidature</td></tr>
                ) : rows.map(({app,cand},i) => (
                  <tr key={app.id} className={i%2===0?'bg-white':'bg-slate-50/60'}>
                    <td className="px-3 py-2 text-slate-500">{i+1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{fullName(cand)}</td>
                    <td className="px-3 py-2 text-slate-600">{app.desired_position ?? app.job_opening?.title ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{cand.professional_title ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{topDegree(cand)}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{expStr(expMonths(cand))}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmt(app.created_at)}</td>
                    <td className="px-3 py-2"><Badge s={app.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── RAPPORT DE L'OFFRE ────────────────────────────────────────────────────────
  function OffreView() {
    const byStageOffre = STAGES.map(s => ({
      ...s, count: offreRows.filter(r => r.app.status === s.v).length,
    }));

    function printOffre() {
      if (!selJob) return;
      const stageRows = byStageOffre.map(s =>
        `<tr><td>${s.l}</td><td style="text-align:right;font-weight:600">${s.count}</td></tr>`
      ).join('');
      const candRows = offreRows.map((r,i) => `<tr>
        <td>${i+1}</td><td>${fullName(r.cand)}</td>
        <td>${r.cand.professional_title ?? '—'}</td>
        <td>${topDegree(r.cand)}</td>
        <td>${expStr(expMonths(r.cand))}</td>
        <td>${fmt(r.app.created_at)}</td>
        <td>${SFR[r.app.status] ?? r.app.status}</td>
      </tr>`).join('');
      printHtml(`
        <div style="margin-bottom:16px">
          <div class="kpi"><span class="kv">${offreRows.length}</span><div class="kl">Candidatures</div></div>
          <div class="kpi"><span class="kv">${byStageOffre.find(s=>s.v==='integrated')?.count??0}</span><div class="kl">Titularisés</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px">
          <div>
            <h2>Répartition par phase</h2>
            <table><tr><th>Phase</th><th style="text-align:right">Nb.</th></tr>${stageRows}</table>
          </div>
          <div>
            <h2>Liste des candidats</h2>
            <table><tr><th>N°</th><th>Candidat</th><th>Titre</th><th>Diplôme</th><th>Expérience</th><th>Date dépôt</th><th>Statut</th></tr>
            ${candRows}</table>
          </div>
        </div>
      `, `Rapport de l'offre — ${selJob.title}`);
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-xs text-slate-500 mb-1">Sélectionner une offre</label>
          <select value={selJobId} onChange={e => setSelJobId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">— Choisir une offre —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>

        {selJobId && selJob && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{selJob.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 space-x-3">
                    <span>Statut : {selJob.status}</span>
                    {selJob.contract_type && <span>Contrat : {selJob.contract_type}</span>}
                    {selJob.publication_date && <span>Publié le {fmt(selJob.publication_date)}</span>}
                  </div>
                </div>
                <button onClick={printOffre}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg" style={{background:G}}>
                  <Printer size={13}/> Imprimer
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { l: 'Candidatures',   v: offreRows.length },
                  { l: 'En cours',       v: offreRows.filter(r=>!['rejected','withdrawn','integrated'].includes(r.app.status)).length },
                  { l: 'Refusés',        v: offreRows.filter(r=>r.app.status==='rejected').length },
                  { l: 'Titularisés',    v: offreRows.filter(r=>r.app.status==='integrated').length },
                ].map(k => (
                  <div key={k.l} className="text-center bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-700">{k.v}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{k.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">Répartition par phase</div>
                <div className="space-y-1.5">
                  {byStageOffre.map(s => {
                    const max = Math.max(...byStageOffre.map(x=>x.count), 1);
                    return (
                      <div key={s.v} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-right text-slate-500 shrink-0 truncate">{s.s}</span>
                        <div className="flex-1 h-4 bg-slate-100 rounded-sm relative overflow-hidden">
                          <div className="h-full rounded-sm" style={{width:`${(s.count/max)*100}%`,background:G}}/>
                          <span className="absolute right-1 top-0 h-full flex items-center text-xs font-semibold text-slate-700">{s.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <AppTable data={offreRows}/>
              </div>
            </div>
          </>
        )}
        {!selJobId && (
          <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-slate-400 text-sm">
            Sélectionnez une offre pour afficher son rapport
          </div>
        )}
      </div>
    );
  }

  // ── LETTRE D'ENGAGEMENT ───────────────────────────────────────────────────────
  function LettreView() {
    const sel = selLettre;

    function printLettre() {
      if (!sel) return;
      const { app, cand } = sel;
      const startDate = app.offer_start_date ? fmtLong(app.offer_start_date) : '_______________';
      const endDate = app.trial_end_date ? fmtLong(app.trial_end_date) : '_______________';
      const months = app.trial_period_months ?? '___';
      const poste = app.desired_position ?? app.job_opening?.title ?? '_______________';
      const salary = app.offer_salary ? `${app.offer_salary.toLocaleString('fr-FR')} FCFA brut/mois` : '_______________';
      const edu = (cand.candidate_educations ?? []).map(e =>
        `<tr><td>${e.degree}</td><td>${e.field_of_study??'—'}</td><td>${e.institution}</td><td>${e.end_date?new Date(e.end_date).getFullYear():'—'}</td></tr>`
      ).join('');
      const exp = (cand.candidate_experiences ?? []).map(e =>
        `<tr><td>${e.company??'—'}</td><td>${e.job_title??'—'}</td><td>${e.start_date?fmt(e.start_date):'—'}</td><td>${e.end_date?fmt(e.end_date):(e.is_current?'Présent':'—')}</td></tr>`
      ).join('');

      printHtml(`
        <div style="margin-bottom:20px">
          <p style="text-align:right;margin-bottom:16px">Douala, le ${fmtLong(new Date().toISOString())}</p>
          <p><strong>À :</strong> M. / Mme ${fullName(cand)}</p>
          <p style="margin-top:8px"><strong>Objet : Engagement à l'essai — Poste de ${poste}</strong></p>
        </div>
        <p>Monsieur / Madame,</p>
        <br/>
        <p>Suite aux épreuves de recrutement et à l'avis favorable du jury de recrutement, nous avons l'honneur de vous informer que vous êtes retenu(e) pour un engagement à l'essai au sein de la Société Nationale des Hydrocarbures (SNH) aux conditions ci-après :</p>
        <br/>
        <h2>1. Conditions d'engagement</h2>
        <table style="width:auto">
          <tr><td style="padding:4px 12px 4px 0;font-weight:600">Poste</td><td>${poste}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600">Date de prise de service</td><td>${startDate}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600">Durée de l'essai</td><td>${months} mois</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600">Fin de période d'essai</td><td>${endDate}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600">Rémunération mensuelle brute</td><td>${salary}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600">Type de contrat</td><td>${app.offer_contract_type ?? '—'}</td></tr>
        </table>
        <br/>
        <p>Durant la période d'essai, vous bénéficierez des avantages accordés au personnel en situation régulière selon les dispositions du statut du personnel de la SNH.</p>
        <br/>
        <p>À l'issue de la période d'essai et sous réserve d'un avis favorable de votre hiérarchie, vous serez titularisé(e) dans votre poste.</p>
        <br/>
        <p>Nous vous prions de bien vouloir retourner un exemplaire dûment signé de la présente lettre en guise d'acceptation.</p>
        <br/>
        <h2>2. Profil du candidat</h2>
        <table style="width:auto;margin-bottom:8px">
          <tr><td style="padding:3px 12px 3px 0;font-weight:600">Nom et prénom</td><td>${fullName(cand)}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;font-weight:600">Date de naissance</td><td>${fmtLong(cand.birth_date)}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;font-weight:600">Nationalité</td><td>${cand.nationality ?? '—'}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;font-weight:600">Email</td><td>${cand.email}</td></tr>
        </table>
        ${edu ? `<h2>3. Formation</h2><table><tr><th>Diplôme</th><th>Spécialité</th><th>Établissement</th><th>Année</th></tr>${edu}</table>` : ''}
        ${exp ? `<h2>4. Expériences professionnelles</h2><table><tr><th>Entreprise</th><th>Poste</th><th>Début</th><th>Fin</th></tr>${exp}</table>` : ''}
        <div class="sig">
          <div><div class="line">La Direction des Ressources Humaines<br/>SNH</div></div>
          <div><div class="line">Lu et approuvé — ${fullName(cand)}</div></div>
        </div>
      `, `Lettre d'engagement à l'essai — ${fullName(cand)}`);
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-xs text-slate-500 mb-1">Sélectionner un candidat (phase Essai / Affectation / Titularisé)</label>
          <select value={selAppId} onChange={e => setSelAppId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">— Choisir un candidat —</option>
            {trialRows.map(({app,cand}) => (
              <option key={app.id} value={app.id}>
                {fullName(cand)} — {app.job_opening?.title ?? app.desired_position ?? 'Poste non précisé'} ({SFR[app.status]})
              </option>
            ))}
          </select>
          {trialRows.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">Aucun candidat en phase Essai, Affectation ou Titularisation.</p>
          )}
        </div>

        {sel && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">{fullName(sel.cand)}</h3>
                <p className="text-sm text-slate-500">{sel.cand.professional_title ?? sel.app.desired_position ?? '—'}</p>
                <Badge s={sel.app.status}/>
              </div>
              <button onClick={printLettre}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium"
                style={{background:G}}>
                <Printer size={14}/> Générer la lettre
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Informations personnelles</div>
                {[
                  ['Naissance', fmtLong(sel.cand.birth_date)],
                  ['Nationalité', sel.cand.nationality ?? '—'],
                  ['Email', sel.cand.email],
                  ['Téléphone', sel.cand.phone ?? '—'],
                  ['Localisation', sel.cand.location ?? '—'],
                ].map(([l,v]) => (
                  <div key={l as string} className="flex gap-2">
                    <span className="text-slate-400 w-24 shrink-0">{l}</span>
                    <span className="text-slate-700 font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conditions d'engagement</div>
                {[
                  ['Poste',         sel.app.desired_position ?? sel.app.job_opening?.title ?? '—'],
                  ['Prise de service', fmtLong(sel.app.offer_start_date)],
                  ['Durée essai',   sel.app.trial_period_months ? `${sel.app.trial_period_months} mois` : '—'],
                  ['Fin essai',     fmtLong(sel.app.trial_end_date)],
                  ['Salaire brut',  sel.app.offer_salary ? `${sel.app.offer_salary.toLocaleString('fr-FR')} FCFA` : '—'],
                  ['Type contrat',  sel.app.offer_contract_type ?? '—'],
                ].map(([l,v]) => (
                  <div key={l as string} className="flex gap-2">
                    <span className="text-slate-400 w-28 shrink-0">{l}</span>
                    <span className="text-slate-700 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {(sel.cand.candidate_educations?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Formation</div>
                <div className="space-y-1">
                  {sel.cand.candidate_educations!.map((e,i) => (
                    <div key={i} className="text-sm text-slate-600">
                      <span className="font-medium">{e.degree}</span>
                      {e.field_of_study && <span className="text-slate-400"> — {e.field_of_study}</span>}
                      <span className="text-slate-400"> · {e.institution}</span>
                      {e.end_date && <span className="text-slate-400"> ({new Date(e.end_date).getFullYear()})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!selAppId && (
          <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-slate-400 text-sm">
            Sélectionnez un candidat pour prévisualiser et générer la lettre
          </div>
        )}
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────────
  const ICONS: Record<View, React.ReactNode> = {
    dashboard: <BarChart3 size={15}/>,
    synthese:  <TrendingUp size={15}/>,
    etat:      <Users size={15}/>,
    offre:     <Briefcase size={15}/>,
    lettre:    <FileText size={15}/>,
  };

  return (
    <div className="flex gap-0 min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col py-4">
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            <BarChart3 size={13}/> États &amp; Rapports
          </div>
        </div>
        {NAV.map(n => (
          <button key={n.v} onClick={() => setView(n.v)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left w-full
              ${view === n.v ? 'text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            style={view === n.v ? {background:G} : {}}>
            {ICONS[n.v]} {n.label}
            {view === n.v && <ChevronRight size={12} className="ml-auto"/>}
          </button>
        ))}
        <div className="mt-auto px-3 pt-4 border-t border-slate-100">
          <button onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5">
            <RefreshCw size={12}/> Actualiser
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="rounded-2xl text-white p-6 mb-6 flex items-center gap-4"
          style={{background:`linear-gradient(135deg,${G} 0%,${GD} 100%)`}}>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            {view === 'dashboard' && <BarChart3 size={24}/>}
            {view === 'synthese'  && <TrendingUp size={24}/>}
            {view === 'etat'      && <ClipboardList size={24}/>}
            {view === 'offre'     && <Briefcase size={24}/>}
            {view === 'lettre'    && <Award size={24}/>}
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-75 mb-0.5">Société Nationale des Hydrocarbures</div>
            <h1 className="text-2xl font-bold">
              {view === 'dashboard' && 'Tableaux de Bord — Candidatures'}
              {view === 'synthese'  && 'Synthèse des Candidatures'}
              {view === 'etat'      && 'État de la Candidature'}
              {view === 'offre'     && "Rapport de l'Offre"}
              {view === 'lettre'    && "Lettre d'Engagement à l'Essai"}
            </h1>
            <p className="text-sm opacity-75 mt-0.5">Des états clairs pour un suivi efficace et des décisions éclairées.</p>
          </div>
        </div>

        {view === 'dashboard' && <Dashboard/>}
        {view === 'synthese'  && <SyntheseView/>}
        {view === 'etat'      && <EtatView/>}
        {view === 'offre'     && <OffreView/>}
        {view === 'lettre'    && <LettreView/>}
      </main>
    </div>
  );
}
