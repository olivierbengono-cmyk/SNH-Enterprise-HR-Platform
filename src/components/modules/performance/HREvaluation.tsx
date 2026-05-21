import React, { useState, useEffect } from 'react';
import {
  Plus, Eye, Pencil, Trash2, X, RefreshCw, CheckCircle2,
  Award, TrendingUp, BarChart2, AlertTriangle, Save, Send
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

type EvalStatus = 'draft' | 'proposed' | 'adjusted' | 'validated' | 'archived';
type Mention = '' | 'excellent' | 'tres_bien' | 'bien' | 'assez_bien' | 'insuffisant';

interface HREval {
  id: string;
  employee_id: string;
  evaluator_id: string | null;
  annual_objective_id: string | null;
  year: number;
  score_case_folders: number;
  score_objectives: number;
  score_quality: number;
  score_behavior: number;
  computed_score: number;
  adjusted_score: number | null;
  adjustment_reason: string;
  mention: Mention;
  status: EvalStatus;
  evaluator_comment: string;
  hr_comment: string;
  employee?: { first_name: string; last_name: string; position?: { name: string } };
  evaluator?: { first_name: string; last_name: string };
}

interface Employee { id: string; first_name: string; last_name: string; }
interface AnnualObj { id: string; year: number; employee_id: string; }

const MENTION_CONFIG: Record<Mention, { label: string; color: string; bg: string; min: number }> = {
  '':           { label: '—',           color: 'text-gray-500',  bg: 'bg-gray-100',   min: 0 },
  excellent:    { label: 'Excellent',   color: 'text-green-700', bg: 'bg-green-100',  min: 90 },
  tres_bien:    { label: 'Très bien',   color: 'text-teal-700',  bg: 'bg-teal-100',   min: 75 },
  bien:         { label: 'Bien',        color: 'text-blue-700',  bg: 'bg-blue-100',   min: 60 },
  assez_bien:   { label: 'Assez bien',  color: 'text-amber-700', bg: 'bg-amber-100',  min: 50 },
  insuffisant:  { label: 'Insuffisant', color: 'text-red-700',   bg: 'bg-red-100',    min: 0  },
};

const STATUS_CONFIG: Record<EvalStatus, { label: string; color: string }> = {
  draft:     { label: 'Brouillon',           color: 'bg-gray-100 text-gray-700' },
  proposed:  { label: 'Note proposée',       color: 'bg-blue-100 text-blue-700' },
  adjusted:  { label: 'Ajustée (chef)',      color: 'bg-amber-100 text-amber-700' },
  validated: { label: 'Validée RH',         color: 'bg-green-100 text-green-700' },
  archived:  { label: 'Archivée',           color: 'bg-gray-100 text-gray-500' },
};

const WEIGHTS = { case_folders: 40, objectives: 35, quality: 15, behavior: 10 };

function computeScore(sf: number, so: number, sq: number, sb: number) {
  return Math.round(
    (sf * WEIGHTS.case_folders + so * WEIGHTS.objectives + sq * WEIGHTS.quality + sb * WEIGHTS.behavior) / 100 * 100
  ) / 100;
}

function suggestMention(score: number): Mention {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'tres_bien';
  if (score >= 60) return 'bien';
  if (score >= 50) return 'assez_bien';
  return 'insuffisant';
}

interface ScoreBarProps { label: string; score: number; weight: number; color: string; }
function ScoreBar({ label, score, weight, color }: ScoreBarProps) {
  const contribution = Math.round(score * weight / 100 * 10) / 10;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label} <span className="text-gray-400">({weight}%)</span></span>
        <span className="font-semibold text-gray-900">{score}/100 <span className="text-gray-400 text-xs">→ {contribution} pts</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}

export default function HREvaluation() {
  const { profile } = useAuth();
  const isManager = ['admin','drh','manager','career_manager'].includes(profile?.role ?? '');
  const isDrh = ['admin','drh'].includes(profile?.role ?? '');

  const [evaluations, setEvaluations] = useState<HREval[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [annualObjs, setAnnualObjs] = useState<AnnualObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [selected, setSelected] = useState<HREval | null>(null);

  const [form, setForm] = useState({
    employee_id: '', evaluator_id: '', annual_objective_id: '', year: new Date().getFullYear(),
    score_case_folders: 0, score_objectives: 0, score_quality: 0, score_behavior: 0,
    mention: '' as Mention, evaluator_comment: '', hr_comment: '',
    adjusted_score: '', adjustment_reason: '',
  });

  const computedScore = computeScore(form.score_case_folders, form.score_objectives, form.score_quality, form.score_behavior);
  const finalScore = form.adjusted_score !== '' ? Number(form.adjusted_score) : computedScore;

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [evRes, empRes, objRes] = await Promise.all([
      supabase.from('hr_evaluations').select(`
        *,
        employee:employees!hr_evaluations_employee_id_fkey(first_name, last_name, position:positions(name)),
        evaluator:employees!hr_evaluations_evaluator_id_fkey(first_name, last_name)
      `).order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, first_name, last_name').eq('employment_status','active').order('last_name'),
      supabase.from('annual_objectives').select('id, year, employee_id'),
    ]);
    if (evRes.data) setEvaluations(evRes.data as HREval[]);
    if (empRes.data) setEmployees(empRes.data);
    if (objRes.data) setAnnualObjs(objRes.data);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      employee_id: '', evaluator_id: '', annual_objective_id: '', year: new Date().getFullYear(),
      score_case_folders: 0, score_objectives: 0, score_quality: 0, score_behavior: 0,
      mention: '', evaluator_comment: '', hr_comment: '',
      adjusted_score: '', adjustment_reason: '',
    });
  };

  const openCreate = () => { resetForm(); setSelected(null); setViewMode(false); setAdjustMode(false); setShowModal(true); };

  const openView = (ev: HREval) => { setSelected(ev); setViewMode(true); setAdjustMode(false); setShowModal(true); };

  const openEdit = (ev: HREval) => {
    setSelected(ev);
    setForm({
      employee_id: ev.employee_id, evaluator_id: ev.evaluator_id ?? '',
      annual_objective_id: ev.annual_objective_id ?? '', year: ev.year,
      score_case_folders: ev.score_case_folders, score_objectives: ev.score_objectives,
      score_quality: ev.score_quality, score_behavior: ev.score_behavior,
      mention: ev.mention, evaluator_comment: ev.evaluator_comment,
      hr_comment: ev.hr_comment,
      adjusted_score: ev.adjusted_score?.toString() ?? '',
      adjustment_reason: ev.adjustment_reason,
    });
    setViewMode(false); setAdjustMode(false); setShowModal(true);
  };

  const openAdjust = (ev: HREval) => {
    setSelected(ev);
    setForm({
      employee_id: ev.employee_id, evaluator_id: ev.evaluator_id ?? '',
      annual_objective_id: ev.annual_objective_id ?? '', year: ev.year,
      score_case_folders: ev.score_case_folders, score_objectives: ev.score_objectives,
      score_quality: ev.score_quality, score_behavior: ev.score_behavior,
      mention: ev.mention, evaluator_comment: ev.evaluator_comment,
      hr_comment: ev.hr_comment,
      adjusted_score: ev.adjusted_score?.toString() ?? '',
      adjustment_reason: ev.adjustment_reason,
    });
    setViewMode(false); setAdjustMode(true); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelected(null); setViewMode(false); setAdjustMode(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cs = computeScore(form.score_case_folders, form.score_objectives, form.score_quality, form.score_behavior);
    const mention = form.mention || suggestMention(form.adjusted_score !== '' ? Number(form.adjusted_score) : cs);
    const payload = {
      employee_id: form.employee_id,
      evaluator_id: form.evaluator_id || null,
      annual_objective_id: form.annual_objective_id || null,
      year: form.year,
      score_case_folders: form.score_case_folders,
      score_objectives: form.score_objectives,
      score_quality: form.score_quality,
      score_behavior: form.score_behavior,
      computed_score: cs,
      adjusted_score: form.adjusted_score !== '' ? Number(form.adjusted_score) : null,
      adjustment_reason: form.adjustment_reason,
      mention,
      status: adjustMode
        ? 'adjusted'
        : (form.adjusted_score !== '' ? 'proposed' : 'proposed') as EvalStatus,
      evaluator_comment: form.evaluator_comment,
      hr_comment: form.hr_comment,
      updated_at: new Date().toISOString(),
    };

    if (selected) {
      await supabase.from('hr_evaluations').update(payload).eq('id', selected.id);
    } else {
      await supabase.from('hr_evaluations').insert(payload);
    }
    closeModal();
    load();
  };

  const handleValidate = async (id: string) => {
    await supabase.from('hr_evaluations').update({ status: 'validated', updated_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette évaluation ?')) return;
    await supabase.from('hr_evaluations').delete().eq('id', id);
    load();
  };

  const availableObjs = annualObjs.filter(o => o.employee_id === form.employee_id);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Évaluations RH annuelles</h2>
          <p className="text-sm text-gray-500">Note calculée automatiquement, ajustement hiérarchique avec justification, validation RH</p>
        </div>
        {isManager && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Nouvelle évaluation
          </button>
        )}
      </div>

      {/* Formula recap */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-600 uppercase mb-3">Grille de calcul de la note</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Traitement dossiers', weight: 40, color: 'bg-blue-500' },
            { label: 'Atteinte objectifs', weight: 35, color: 'bg-teal-500' },
            { label: 'Qualité livrables', weight: 15, color: 'bg-amber-500' },
            { label: 'Comportement / collab.', weight: 10, color: 'bg-slate-400' },
          ].map(({ label, weight, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-slate-600">{label}</p>
                <p className="text-sm font-bold text-slate-800">{weight}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {evaluations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Award className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune évaluation RH</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {evaluations.map(ev => {
            const sc = STATUS_CONFIG[ev.status];
            const mn = MENTION_CONFIG[ev.mention];
            const displayScore = ev.adjusted_score ?? ev.computed_score;
            return (
              <div key={ev.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-gray-900">
                        {ev.employee?.first_name} {ev.employee?.last_name}
                      </h3>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{ev.year}</span>
                      {ev.mention && (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${mn.bg} ${mn.color}`}>{mn.label}</span>
                      )}
                    </div>
                    {ev.employee?.position && (
                      <p className="text-sm text-gray-500 mb-2">{(ev.employee.position as any).name}</p>
                    )}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Note calculée</p>
                        <p className="text-2xl font-black text-gray-800">{ev.computed_score}<span className="text-sm font-normal text-gray-400">/100</span></p>
                      </div>
                      {ev.adjusted_score != null && (
                        <div className="text-center">
                          <p className="text-xs text-amber-500">Note ajustée</p>
                          <p className="text-2xl font-black text-amber-600">{ev.adjusted_score}<span className="text-sm font-normal text-amber-400">/100</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openView(ev)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                    {isManager && ev.status === 'proposed' && (
                      <button onClick={() => openAdjust(ev)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Ajuster">
                        <TrendingUp className="h-4 w-4" />
                      </button>
                    )}
                    {isDrh && ev.status === 'adjusted' && (
                      <button onClick={() => handleValidate(ev.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Valider">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {isManager && ev.status !== 'validated' && (
                      <button onClick={() => openEdit(ev)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {isDrh && (
                      <button onClick={() => handleDelete(ev.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {viewMode ? 'Détail évaluation' : adjustMode ? 'Ajustement hiérarchique' : selected ? 'Modifier évaluation' : 'Nouvelle évaluation RH'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {viewMode && selected ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Agent</p>
                      <p className="text-sm font-bold text-gray-900">{selected.employee?.first_name} {selected.employee?.last_name}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Année</p>
                      <p className="text-sm font-bold text-gray-900">{selected.year}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Statut</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[selected.status].color}`}>
                        {STATUS_CONFIG[selected.status].label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Détail des scores</h3>
                    <ScoreBar label="Traitement des dossiers" score={selected.score_case_folders} weight={40} color="bg-blue-500" />
                    <ScoreBar label="Atteinte des objectifs" score={selected.score_objectives} weight={35} color="bg-teal-500" />
                    <ScoreBar label="Qualité des livrables" score={selected.score_quality} weight={15} color="bg-amber-500" />
                    <ScoreBar label="Comportement / collaboration" score={selected.score_behavior} weight={10} color="bg-slate-400" />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Note calculée</p>
                      <p className="text-4xl font-black text-blue-800">{selected.computed_score}<span className="text-lg font-normal text-blue-400">/100</span></p>
                      <p className="text-xs text-blue-500 mt-1">Automatique</p>
                    </div>
                    {selected.adjusted_score != null && (
                      <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-amber-600 font-semibold uppercase mb-1">Note ajustée</p>
                        <p className="text-4xl font-black text-amber-800">{selected.adjusted_score}<span className="text-lg font-normal text-amber-400">/100</span></p>
                        <p className="text-xs text-amber-500 mt-1">Décision hiérarchique</p>
                      </div>
                    )}
                    {selected.mention && (
                      <div className={`flex-1 ${MENTION_CONFIG[selected.mention].bg} border rounded-xl p-4 text-center`}>
                        <p className="text-xs font-semibold uppercase mb-1 text-gray-600">Mention</p>
                        <p className={`text-xl font-black ${MENTION_CONFIG[selected.mention].color}`}>{MENTION_CONFIG[selected.mention].label}</p>
                      </div>
                    )}
                  </div>

                  {selected.adjustment_reason && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />Justification de l'ajustement
                      </p>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{selected.adjustment_reason}</p>
                    </div>
                  )}

                  {selected.evaluator_comment && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Commentaire évaluateur</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.evaluator_comment}</p>
                    </div>
                  )}

                  {selected.hr_comment && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Commentaire RH</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.hr_comment}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form id="hr-eval-form" onSubmit={handleSubmit} className="space-y-5">
                  {!adjustMode && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                          <select required value={form.employee_id}
                            onChange={e => setForm({ ...form, employee_id: e.target.value, annual_objective_id: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="">— Sélectionner —</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Évaluateur</label>
                          <select value={form.evaluator_id}
                            onChange={e => setForm({ ...form, evaluator_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="">— Sélectionner —</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
                          <input required type="number" value={form.year}
                            onChange={e => setForm({ ...form, year: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Feuille de route liée</label>
                          <select value={form.annual_objective_id}
                            onChange={e => setForm({ ...form, annual_objective_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            disabled={!form.employee_id}>
                            <option value="">— Aucune —</option>
                            {availableObjs.map(o => <option key={o.id} value={o.id}>Objectifs {o.year}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Saisie des scores (0–100)</h3>
                        {[
                          { key: 'score_case_folders', label: 'Traitement des dossiers', weight: 40, color: 'bg-blue-500' },
                          { key: 'score_objectives', label: 'Atteinte des objectifs annuels', weight: 35, color: 'bg-teal-500' },
                          { key: 'score_quality', label: 'Qualité des livrables', weight: 15, color: 'bg-amber-500' },
                          { key: 'score_behavior', label: 'Comportement / collaboration', weight: 10, color: 'bg-slate-400' },
                        ].map(({ key, label, weight, color }) => (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-sm text-gray-700">{label} <span className="text-gray-400">({weight}%)</span></label>
                              <input type="number" min={0} max={100}
                                value={(form as any)[key]}
                                onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min((form as any)[key], 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-700">Note calculée automatiquement</p>
                          <p className="text-xs text-blue-500">= (40%×dossiers) + (35%×objectifs) + (15%×qualité) + (10%×comportement)</p>
                        </div>
                        <p className="text-4xl font-black text-blue-800">{computedScore}<span className="text-lg text-blue-400">/100</span></p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mention proposée</label>
                        <select value={form.mention}
                          onChange={e => setForm({ ...form, mention: e.target.value as Mention })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                          <option value="">Automatique (recommandée : {MENTION_CONFIG[suggestMention(computedScore)].label})</option>
                          {Object.entries(MENTION_CONFIG).filter(([k]) => k !== '').map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire de l'évaluateur</label>
                        <textarea rows={3} value={form.evaluator_comment}
                          onChange={e => setForm({ ...form, evaluator_comment: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>

                      {isDrh && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire RH</label>
                          <textarea rows={2} value={form.hr_comment}
                            onChange={e => setForm({ ...form, hr_comment: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                      )}
                    </>
                  )}

                  {adjustMode && selected && (
                    <div className="space-y-5">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Note proposée par le système</p>
                        <p className="text-5xl font-black text-blue-800">{selected.computed_score}<span className="text-xl text-blue-400">/100</span></p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-amber-700 uppercase mb-1 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5" />Décision hiérarchique
                        </p>
                        <p className="text-xs text-amber-600 mb-3">Vous pouvez modifier la note proposée. Une justification est obligatoire.</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note ajustée (0–100) *</label>
                            <input required type="number" min={0} max={100} value={form.adjusted_score}
                              onChange={e => setForm({ ...form, adjusted_score: e.target.value })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 text-center text-xl font-bold" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mention finale</label>
                            <select value={form.mention}
                              onChange={e => setForm({ ...form, mention: e.target.value as Mention })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                              {Object.entries(MENTION_CONFIG).filter(([k]) => k !== '').map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Justification de l'ajustement *
                          <span className="ml-1 text-red-500">obligatoire</span>
                        </label>
                        <textarea required rows={4} value={form.adjustment_reason}
                          onChange={e => setForm({ ...form, adjustment_reason: e.target.value })}
                          placeholder="Expliquez pourquoi vous modifiez la note calculée automatiquement. Cette justification est archivée."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                {viewMode ? 'Fermer' : 'Annuler'}
              </button>
              {!viewMode && (
                <button form="hr-eval-form" type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                  {adjustMode ? <><TrendingUp className="h-4 w-4" /> Enregistrer l'ajustement</> : <><Save className="h-4 w-4" /> {selected ? 'Mettre à jour' : 'Proposer la note'}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
