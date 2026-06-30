import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, ChevronRight, X, Search, CheckCircle, XCircle,
  Clock, Building2, GraduationCap, Calendar, Users, ArrowRight,
  AlertCircle, FileText, Briefcase, Pencil, Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecruitmentRequest {
  id: string;
  reference: string;
  direction: string;
  service: string | null;
  position_title: string;
  required_education: string | null;
  required_experience_years: number;
  required_skills: string[];
  contract_type: string;
  positions_count: number;
  budget_validated: boolean;
  justification: string | null;
  job_description: string | null;
  desired_start_date: string | null;
  status: string;
  requested_by_email: string | null;
  reviewed_by_email: string | null;
  review_comment: string | null;
  job_opening_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:  { label: 'Soumise',       color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  drh_review: { label: 'En examen DRH', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  approved:   { label: 'Approuvée',     color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  published:  { label: 'Publiée',       color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200' },
  rejected:   { label: 'Refusée',       color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
  cancelled:  { label: 'Annulée',       color: 'text-slate-500',   bg: 'bg-slate-100',  border: 'border-slate-200' },
};

const DIRECTIONS = [
  'Direction Générale',
  'Direction de l\'Exploration',
  'Direction de la Production',
  'Direction Technique',
  'Direction Financière',
  'Direction des Ressources Humaines',
  'Direction Juridique',
  'Direction Commerciale',
  'Direction des Systèmes d\'Information',
  'Direction HSE',
  'Direction de la Communication',
  'Secrétariat Général',
];

const EDU_LEVELS = ['CAP/BEP', 'Bac', 'Bac+2', 'Bac+3/Licence', 'Bac+4', 'Bac+5/Master', 'Doctorat'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage académique', 'Stage professionnel', 'Contrat de prestation'];

const WORKFLOW_STEPS: { status: string; label: string }[] = [
  { status: 'submitted',  label: 'Soumise' },
  { status: 'drh_review', label: 'Examen DRH' },
  { status: 'approved',   label: 'Approuvée' },
  { status: 'published',  label: 'Publiée' },
];

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.color} ${m.border}`}>
      {m.label}
    </span>
  );
}

// ─── Form modal ───────────────────────────────────────────────────────────────

interface FormModalProps {
  initial?: Partial<RecruitmentRequest>;
  onClose: () => void;
  onSaved: () => void;
}

function FormModal({ initial, onClose, onSaved }: FormModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillDropOpen, setSkillDropOpen] = useState(false);
  const [positions, setPositions] = useState<{ id: string; title: string }[]>([]);
  const [masterSkills, setMasterSkills] = useState<{ id: string; name: string; category: string }[]>([]);

  useEffect(() => {
    supabase.from('positions').select('id, title').order('title').then(({ data }) => {
      if (data) setPositions(data);
    });
    supabase.from('skills').select('id, name, category').order('category').order('name').then(({ data }) => {
      if (data) setMasterSkills(data);
    });
  }, []);

  const [form, setForm] = useState({
    direction: initial?.direction ?? '',
    service: initial?.service ?? '',
    position_title: initial?.position_title ?? '',
    required_education: initial?.required_education ?? 'Bac+5/Master',
    required_experience_years: initial?.required_experience_years ?? 0,
    required_skills: initial?.required_skills ?? [] as string[],
    contract_type: initial?.contract_type ?? 'CDI',
    positions_count: initial?.positions_count ?? 1,
    budget_validated: initial?.budget_validated ?? false,
    justification: initial?.justification ?? '',
    job_description: initial?.job_description ?? '',
    desired_start_date: initial?.desired_start_date ?? '',
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const addSkill = (name: string) => {
    const s = name.trim();
    if (s && !form.required_skills.includes(s)) {
      set('required_skills', [...form.required_skills, s]);
    }
    setSkillSearch('');
    setSkillDropOpen(false);
  };

  const removeSkill = (s: string) => set('required_skills', form.required_skills.filter(x => x !== s));

  const filteredSkills = masterSkills.filter(sk =>
    !form.required_skills.includes(sk.name) &&
    sk.name.toLowerCase().includes(skillSearch.toLowerCase())
  ).slice(0, 12);

  const handleSubmit = async () => {
    if (!form.direction || !form.position_title) return;
    setSaving(true);
    try {
      const ref = initial?.id ? initial.reference : `DR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const payload = {
        ...form,
        reference: ref,
        requested_by_email: initial?.requested_by_email ?? user?.email ?? '',
      };

      if (initial?.id) {
        await supabase.from('recruitment_requests').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', initial.id);
      } else {
        await supabase.from('recruitment_requests').insert(payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">
            {initial?.id ? 'Modifier la demande' : 'Nouvelle demande de recrutement'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Direction demandeuse *</label>
              <select value={form.direction} onChange={e => set('direction', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                <option value="">Sélectionner...</option>
                {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Service / Division</label>
              <input value={form.service} onChange={e => set('service', e.target.value)}
                placeholder="Ex: Service Comptabilité" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Intitulé du poste *</label>
              <select
                value={form.position_title}
                onChange={e => set('position_title', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                <option value="">— Sélectionner dans le référentiel —</option>
                {positions.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Niveau requis</label>
              <select value={form.required_education} onChange={e => set('required_education', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                {EDU_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expérience minimale (ans)</label>
              <input type="number" min={0} max={30} value={form.required_experience_years} onChange={e => set('required_experience_years', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type de contrat</label>
              <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de postes</label>
              <input type="number" min={1} max={50} value={form.positions_count} onChange={e => set('positions_count', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date souhaitée de prise de poste</label>
              <input type="date" value={form.desired_start_date} onChange={e => set('desired_start_date', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Compétences requises</label>
            <div className="relative">
              <input
                value={skillSearch}
                onChange={e => { setSkillSearch(e.target.value); setSkillDropOpen(true); }}
                onFocus={() => setSkillDropOpen(true)}
                onBlur={() => setTimeout(() => setSkillDropOpen(false), 150)}
                placeholder="Rechercher dans le référentiel de compétences…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              {skillDropOpen && filteredSkills.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredSkills.map(sk => (
                    <button key={sk.id} type="button"
                      onMouseDown={() => addSkill(sk.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 flex items-center justify-between gap-2 transition">
                      <span>{sk.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{sk.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.required_skills.map(s => (
                <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motif / Justification</label>
            <textarea rows={3} value={form.justification} onChange={e => set('justification', e.target.value)}
              placeholder="Expliquez le motif du besoin en recrutement (départ, création de poste, croissance…)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description du poste</label>
            <textarea rows={4} value={form.job_description} onChange={e => set('job_description', e.target.value)}
              placeholder="Missions, responsabilités, activités principales…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input type="checkbox" id="budget_ok" checked={form.budget_validated} onChange={e => set('budget_validated', e.target.checked)}
              className="w-4 h-4 rounded text-green-600 focus:ring-green-500" />
            <label htmlFor="budget_ok" className="text-sm text-slate-700 cursor-pointer">
              Budget validé par la Direction Financière
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.direction || !form.position_title}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold transition disabled:opacity-60">
            {saving ? 'Enregistrement…' : (initial?.id ? 'Mettre à jour' : 'Soumettre la demande')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecruitmentRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RecruitmentRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RecruitmentRequest | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const canManage = profile?.role === 'drh' || profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('recruitment_requests').select('*').order('created_at', { ascending: false });
    setRequests((data ?? []) as RecruitmentRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (req: RecruitmentRequest, newStatus: string) => {
    setActionLoading(true);
    await supabase.from('recruitment_requests').update({
      status: newStatus,
      reviewed_by_email: profile?.email,
      review_comment: reviewComment || null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.id);
    setReviewComment('');
    await load();
    setSelected(prev => prev?.id === req.id ? { ...prev, status: newStatus } : prev);
    setActionLoading(false);
  };

  const createJobOpening = async (req: RecruitmentRequest) => {
    setActionLoading(true);
    const { data: job } = await supabase.from('job_openings').insert({
      title: req.position_title,
      description: req.job_description ?? '',
      requirements: `Niveau requis : ${req.required_education ?? '—'}\nExpérience : ${req.required_experience_years} an(s)`,
      required_skills: req.required_skills,
      education_level: req.required_education,
      required_experience_years: req.required_experience_years,
      contract_type: req.contract_type,
      status: 'open',
      publication_date: new Date().toISOString().split('T')[0],
    }).select().maybeSingle();

    if (job) {
      await supabase.from('recruitment_requests').update({
        status: 'published',
        job_opening_id: job.id,
        updated_at: new Date().toISOString(),
      }).eq('id', req.id);
    }
    await load();
    setSelected(prev => prev?.id === req.id ? { ...prev, status: 'published', job_opening_id: job?.id ?? null } : prev);
    setActionLoading(false);
  };

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${r.position_title} ${r.direction} ${r.reference}`.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    pending: requests.filter(r => ['submitted', 'drh_review'].includes(r.status)).length,
    approved: requests.filter(r => r.status === 'approved').length,
    published: requests.filter(r => r.status === 'published').length,
    total: requests.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-green-700" />
            Demandes de recrutement
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion des besoins en recrutement (NS 193/2009)</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-800 transition text-sm">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En attente de traitement', value: stats.pending,  icon: Clock,        color: 'text-amber-600 bg-amber-50' },
          { label: 'Approuvées',               value: stats.approved, icon: CheckCircle,  color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Offres publiées',           value: stats.published,icon: Briefcase,   color: 'text-green-600 bg-green-50' },
          { label: 'Total demandes',            value: stats.total,   icon: FileText,     color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* List + detail pane */}
      <div className="flex gap-5">
        {/* List */}
        <div className={`bg-white rounded-xl border border-slate-200 flex flex-col ${selected ? 'w-[420px] flex-shrink-0' : 'flex-1'}`}>
          <div className="px-4 py-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-green-500 outline-none">
                <option value="all">Tous statuts</option>
                {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-400">{filtered.length} demande{filtered.length > 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
              <ClipboardList className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Aucune demande</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto flex-1">
              {filtered.map(req => (
                <div key={req.id} onClick={() => setSelected(selected?.id === req.id ? null : req)}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition hover:bg-slate-50 ${selected?.id === req.id ? 'bg-green-50 border-r-2 border-r-green-600' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{req.position_title}</p>
                    <p className="text-xs text-slate-400 truncate">{req.direction}{req.service ? ` · ${req.service}` : ''}</p>
                    <p className="text-xs text-slate-300">{req.reference} · {fmtDate(req.created_at)}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail pane */}
        {selected && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">{selected.position_title}</h3>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selected.reference} · {selected.direction}{selected.service ? ` / ${selected.service}` : ''}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {canManage && ['submitted','drh_review','approved'].includes(selected.status) && (
                  <button onClick={() => setEditTarget(selected)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600">
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Workflow progress */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-0">
                {WORKFLOW_STEPS.map((step, i) => {
                  const statuses = WORKFLOW_STEPS.map(s => s.status);
                  const currentIdx = statuses.indexOf(selected.status);
                  const done = i < currentIdx || selected.status === step.status;
                  const active = selected.status === step.status;
                  return (
                    <div key={step.status} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        active ? 'bg-green-600 border-green-600 text-white' :
                        done ? 'bg-green-100 border-green-400 text-green-600' :
                        'bg-white border-slate-200 text-slate-300'
                      }`}>
                        {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-xs text-center leading-tight ${active ? 'font-semibold text-green-700' : done ? 'text-green-600' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div className="absolute" style={{ display: 'none' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Diplôme requis',     value: selected.required_education ?? '—', icon: GraduationCap },
                  { label: 'Expérience',          value: `${selected.required_experience_years} an(s) min.`, icon: Clock },
                  { label: 'Type de contrat',     value: selected.contract_type, icon: FileText },
                  { label: 'Postes à pourvoir',   value: String(selected.positions_count), icon: Users },
                  { label: 'Budget validé',       value: selected.budget_validated ? 'Oui' : 'Non', icon: selected.budget_validated ? CheckCircle : AlertCircle },
                  { label: 'Date souhaitée',      value: fmtDate(selected.desired_start_date), icon: Calendar },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <item.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selected.required_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Compétences requises</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.required_skills.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.justification && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Justification</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">{selected.justification}</p>
                </div>
              )}

              {selected.job_description && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description du poste</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed whitespace-pre-wrap">{selected.job_description}</p>
                </div>
              )}

              {selected.review_comment && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Commentaire DRH</p>
                  <p className="text-sm text-amber-800">{selected.review_comment}</p>
                </div>
              )}

              {/* DRH Actions */}
              {canManage && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions DRH</p>
                  <textarea rows={2} value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                    placeholder="Commentaire (optionnel)…"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none resize-none" />
                  <div className="flex flex-wrap gap-2">
                    {selected.status === 'submitted' && (
                      <button onClick={() => doAction(selected, 'drh_review')} disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-60">
                        <Clock className="w-3.5 h-3.5" /> Prendre en charge
                      </button>
                    )}
                    {selected.status === 'drh_review' && (
                      <>
                        <button onClick={() => doAction(selected, 'approved')} disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-60">
                          <CheckCircle className="w-3.5 h-3.5" /> Approuver
                        </button>
                        <button onClick={() => doAction(selected, 'rejected')} disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-60">
                          <XCircle className="w-3.5 h-3.5" /> Rejeter
                        </button>
                      </>
                    )}
                    {selected.status === 'approved' && !selected.job_opening_id && (
                      <button onClick={() => createJobOpening(selected)} disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-60">
                        <ArrowRight className="w-3.5 h-3.5" /> Créer l'offre d'emploi
                      </button>
                    )}
                    {selected.status === 'published' && selected.job_opening_id && (
                      <div className="flex items-center gap-2 text-xs text-green-700 font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Offre d'emploi créée et publiée
                      </div>
                    )}
                    {['submitted','drh_review','approved'].includes(selected.status) && (
                      <button onClick={() => doAction(selected, 'cancelled')} disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition disabled:opacity-60">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <FormModal onClose={() => setShowForm(false)} onSaved={() => { load(); setShowForm(false); }} />
      )}
      {editTarget && (
        <FormModal initial={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { load(); setEditTarget(null); }} />
      )}
    </div>
  );
}
