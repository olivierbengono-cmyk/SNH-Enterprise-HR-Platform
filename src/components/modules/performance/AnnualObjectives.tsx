import React, { useState, useEffect } from 'react';
import {
  Plus, Target, ChevronDown, X, Pencil, Eye, Trash2,
  CheckCircle2, RefreshCw, Save, Send, FileText, Users
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ObjectiveItem {
  id?: string;
  objective_name: string;
  weight: number;
  indicator: string;
  target: string;
  deadline: string;
  result: string;
  achievement_rate: number | null;
  sort_order: number;
}

interface AnnualObjective {
  id: string;
  employee_id: string;
  evaluator_id: string | null;
  year: number;
  main_missions: string;
  status: 'draft' | 'active' | 'self_evaluated' | 'completed' | 'archived';
  self_evaluation_score: number | null;
  self_evaluation_comment: string;
  interim_notes: string;
  employee?: { first_name: string; last_name: string; position?: { name: string } };
  evaluator?: { first_name: string; last_name: string };
  items?: ObjectiveItem[];
}

interface Employee { id: string; first_name: string; last_name: string; }

const STATUS_CONFIG = {
  draft:          { label: 'Brouillon',       color: 'bg-gray-100 text-gray-700' },
  active:         { label: 'En cours',        color: 'bg-blue-100 text-blue-700' },
  self_evaluated: { label: 'Auto-évalué',     color: 'bg-amber-100 text-amber-700' },
  completed:      { label: 'Évalué',          color: 'bg-green-100 text-green-700' },
  archived:       { label: 'Archivé',         color: 'bg-gray-100 text-gray-500' },
};

const DEFAULT_ITEMS: ObjectiveItem[] = [
  { objective_name: 'Traiter les dossiers dans les délais', weight: 30, indicator: 'Taux de respect des délais', target: '≥ 90%', deadline: '', result: '', achievement_rate: null, sort_order: 0 },
  { objective_name: 'Produire des notes de qualité', weight: 25, indicator: 'Validation sans reprise majeure', target: '≥ 85%', deadline: '', result: '', achievement_rate: null, sort_order: 1 },
  { objective_name: 'Participer aux projets de la direction', weight: 20, indicator: 'Livrables réalisés', target: '100%', deadline: '', result: '', achievement_rate: null, sort_order: 2 },
  { objective_name: 'Réactivité administrative', weight: 15, indicator: 'Délai moyen de traitement', target: '≤ 3 jours', deadline: '', result: '', achievement_rate: null, sort_order: 3 },
  { objective_name: 'Discipline et collaboration', weight: 10, indicator: 'Appréciation hiérarchique', target: 'Satisfaisant', deadline: '', result: '', achievement_rate: null, sort_order: 4 },
];

export default function AnnualObjectives() {
  const { profile } = useAuth();
  const isManager = ['admin', 'drh', 'manager', 'career_manager'].includes(profile?.role ?? '');

  const [objectives, setObjectives] = useState<AnnualObjective[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selected, setSelected] = useState<AnnualObjective | null>(null);
  const [selfEvalMode, setSelfEvalMode] = useState(false);

  const [form, setForm] = useState({
    employee_id: '', evaluator_id: '', year: new Date().getFullYear(),
    main_missions: '', status: 'draft' as AnnualObjective['status'],
    self_evaluation_score: '', self_evaluation_comment: '', interim_notes: '',
  });
  const [items, setItems] = useState<ObjectiveItem[]>(DEFAULT_ITEMS.map(i => ({ ...i })));

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [objRes, empRes] = await Promise.all([
      supabase.from('annual_objectives').select(`
        *,
        employee:employees!annual_objectives_employee_id_fkey(first_name, last_name, position:positions(name)),
        evaluator:employees!annual_objectives_evaluator_id_fkey(first_name, last_name)
      `).order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, first_name, last_name').eq('employment_status', 'active').order('last_name'),
    ]);
    if (objRes.data) setObjectives(objRes.data as AnnualObjective[]);
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  };

  const loadItems = async (objectiveId: string) => {
    const { data } = await supabase
      .from('annual_objective_items')
      .select('*')
      .eq('annual_objective_id', objectiveId)
      .order('sort_order');
    return (data ?? []) as ObjectiveItem[];
  };

  const openCreate = () => {
    setForm({ employee_id: '', evaluator_id: '', year: new Date().getFullYear(), main_missions: '', status: 'draft', self_evaluation_score: '', self_evaluation_comment: '', interim_notes: '' });
    setItems(DEFAULT_ITEMS.map(i => ({ ...i })));
    setSelected(null); setViewMode(false); setSelfEvalMode(false);
    setShowModal(true);
  };

  const openView = async (obj: AnnualObjective) => {
    const loadedItems = await loadItems(obj.id);
    setSelected({ ...obj, items: loadedItems });
    setViewMode(true); setSelfEvalMode(false);
    setShowModal(true);
  };

  const openEdit = async (obj: AnnualObjective) => {
    const loadedItems = await loadItems(obj.id);
    setSelected(obj);
    setForm({
      employee_id: obj.employee_id, evaluator_id: obj.evaluator_id ?? '',
      year: obj.year, main_missions: obj.main_missions, status: obj.status,
      self_evaluation_score: obj.self_evaluation_score?.toString() ?? '',
      self_evaluation_comment: obj.self_evaluation_comment, interim_notes: obj.interim_notes,
    });
    setItems(loadedItems.length > 0 ? loadedItems : DEFAULT_ITEMS.map(i => ({ ...i })));
    setViewMode(false); setSelfEvalMode(false);
    setShowModal(true);
  };

  const openSelfEval = async (obj: AnnualObjective) => {
    const loadedItems = await loadItems(obj.id);
    setSelected(obj);
    setForm({
      employee_id: obj.employee_id, evaluator_id: obj.evaluator_id ?? '',
      year: obj.year, main_missions: obj.main_missions, status: obj.status,
      self_evaluation_score: obj.self_evaluation_score?.toString() ?? '',
      self_evaluation_comment: obj.self_evaluation_comment, interim_notes: obj.interim_notes,
    });
    setItems(loadedItems.length > 0 ? loadedItems : DEFAULT_ITEMS.map(i => ({ ...i })));
    setViewMode(false); setSelfEvalMode(true);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelected(null); setViewMode(false); setSelfEvalMode(false); };

  const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalWeight - 100) > 0.1) {
      alert(`La somme des poids doit être égale à 100%. Actuellement : ${totalWeight}%`);
      return;
    }
    const payload = {
      employee_id: form.employee_id,
      evaluator_id: form.evaluator_id || null,
      year: form.year,
      main_missions: form.main_missions,
      status: selfEvalMode ? 'self_evaluated' as AnnualObjective['status'] : form.status,
      self_evaluation_score: form.self_evaluation_score ? Number(form.self_evaluation_score) : null,
      self_evaluation_comment: form.self_evaluation_comment,
      interim_notes: form.interim_notes,
      updated_at: new Date().toISOString(),
    };

    let objectiveId = selected?.id;

    if (selected) {
      await supabase.from('annual_objectives').update(payload).eq('id', selected.id);
    } else {
      const { data } = await supabase.from('annual_objectives').insert(payload).select('id').single();
      objectiveId = data?.id;
    }

    if (objectiveId) {
      if (selected) {
        await supabase.from('annual_objective_items').delete().eq('annual_objective_id', objectiveId);
      }
      const itemsToInsert = items.map((item, idx) => ({
        annual_objective_id: objectiveId,
        objective_name: item.objective_name,
        weight: Number(item.weight),
        indicator: item.indicator,
        target: item.target,
        deadline: item.deadline || null,
        result: item.result,
        achievement_rate: item.achievement_rate,
        sort_order: idx,
      }));
      await supabase.from('annual_objective_items').insert(itemsToInsert);
    }

    closeModal();
    load();
  };

  const updateItem = (idx: number, field: keyof ObjectiveItem, value: string | number | null) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { objective_name: '', weight: 0, indicator: '', target: '', deadline: '', result: '', achievement_rate: null, sort_order: prev.length }]);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette feuille de route ?')) return;
    await supabase.from('annual_objectives').delete().eq('id', id);
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Feuilles de route annuelles</h2>
          <p className="text-sm text-gray-500">Objectifs, indicateurs, poids et suivi d'atteinte par agent</p>
        </div>
        {isManager && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Nouvelle feuille de route
          </button>
        )}
      </div>

      {objectives.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune feuille de route</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {objectives.map(obj => {
            const sc = STATUS_CONFIG[obj.status];
            return (
              <div key={obj.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900">
                        {obj.employee?.first_name} {obj.employee?.last_name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {obj.year}
                      </span>
                    </div>
                    {obj.employee?.position && (
                      <p className="text-sm text-gray-500 mt-0.5">{(obj.employee.position as any).name}</p>
                    )}
                    {obj.evaluator && (
                      <p className="text-xs text-gray-400 mt-1">
                        Évaluateur : {obj.evaluator.first_name} {obj.evaluator.last_name}
                      </p>
                    )}
                    {obj.self_evaluation_score != null && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        Auto-évaluation : {obj.self_evaluation_score}/100
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openView(obj)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Voir">
                      <Eye className="h-4 w-4" />
                    </button>
                    {obj.status === 'active' && (
                      <button onClick={() => openSelfEval(obj)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Auto-évaluation">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {isManager && (
                      <>
                        <button onClick={() => openEdit(obj)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(obj.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {viewMode ? 'Feuille de route' : selfEvalMode ? 'Auto-évaluation' : selected ? 'Modifier la feuille de route' : 'Nouvelle feuille de route'}
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[selected.status].color}`}>
                        {STATUS_CONFIG[selected.status].label}
                      </span>
                    </div>
                  </div>

                  {selected.main_missions && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Missions principales</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.main_missions}</p>
                    </div>
                  )}

                  {selected.items && selected.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Objectifs et indicateurs</h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-100 bg-white">
                          <thead className="bg-gray-50">
                            <tr>
                              {['Objectif','Poids','Indicateur','Cible','Échéance','Résultat','Atteinte'].map(h => (
                                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selected.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2.5 text-sm font-medium text-gray-900 max-w-48">{item.objective_name}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{item.weight}%</span>
                                </td>
                                <td className="px-3 py-2.5 text-sm text-gray-600">{item.indicator}</td>
                                <td className="px-3 py-2.5 text-sm text-gray-600">{item.target}</td>
                                <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                                  {item.deadline ? new Date(item.deadline).toLocaleDateString('fr-FR') : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-sm text-gray-700">{item.result || '—'}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {item.achievement_rate != null ? (
                                    <span className={`text-sm font-bold ${Number(item.achievement_rate) >= 80 ? 'text-green-700' : Number(item.achievement_rate) >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                                      {item.achievement_rate}%
                                    </span>
                                  ) : <span className="text-gray-400">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(selected.self_evaluation_score != null || selected.self_evaluation_comment) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Auto-évaluation de l'agent</p>
                      {selected.self_evaluation_score != null && (
                        <p className="text-2xl font-bold text-amber-800 mb-2">{selected.self_evaluation_score}/100</p>
                      )}
                      {selected.self_evaluation_comment && (
                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{selected.self_evaluation_comment}</p>
                      )}
                    </div>
                  )}

                  {selected.interim_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Observations intermédiaires</p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{selected.interim_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form id="obj-form" onSubmit={handleSubmit} className="space-y-6">
                  {!selfEvalMode && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                          <select required value={form.employee_id}
                            onChange={e => setForm({ ...form, employee_id: e.target.value })}
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Missions principales</label>
                        <textarea rows={3} value={form.main_missions}
                          onChange={e => setForm({ ...form, main_missions: e.target.value })}
                          placeholder="Décrivez les missions principales confiées à l'agent..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                        <select value={form.status}
                          onChange={e => setForm({ ...form, status: e.target.value as AnnualObjective['status'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>

                      {/* Items table */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Objectifs et indicateurs</h3>
                            <p className="text-xs text-gray-400">
                              Total poids : <span className={`font-bold ${Math.abs(totalWeight - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>{totalWeight}%</span> (doit faire 100%)
                            </p>
                          </div>
                          <button type="button" onClick={addItem}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium">
                            <Plus className="h-3 w-3" /> Ajouter
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-100 bg-white">
                            <thead className="bg-gray-50">
                              <tr>
                                {['Objectif *','Poids % *','Indicateur *','Cible','Échéance','Résultat','Atteinte %',''].map(h => (
                                  <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-2 py-1.5">
                                    <input required value={item.objective_name}
                                      onChange={e => updateItem(idx, 'objective_name', e.target.value)}
                                      className="w-40 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input required type="number" min={0} max={100} value={item.weight}
                                      onChange={e => updateItem(idx, 'weight', Number(e.target.value))}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 text-center" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input required value={item.indicator}
                                      onChange={e => updateItem(idx, 'indicator', e.target.value)}
                                      className="w-36 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input value={item.target}
                                      onChange={e => updateItem(idx, 'target', e.target.value)}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input type="date" value={item.deadline}
                                      onChange={e => updateItem(idx, 'deadline', e.target.value)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input value={item.result}
                                      onChange={e => updateItem(idx, 'result', e.target.value)}
                                      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input type="number" min={0} max={100}
                                      value={item.achievement_rate ?? ''}
                                      onChange={e => updateItem(idx, 'achievement_rate', e.target.value ? Number(e.target.value) : null)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 text-center" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <button type="button" onClick={() => removeItem(idx)}
                                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observations intermédiaires</label>
                        <textarea rows={2} value={form.interim_notes}
                          onChange={e => setForm({ ...form, interim_notes: e.target.value })}
                          placeholder="Points trimestriels, commentaires du supérieur..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}

                  {/* Self-evaluation section */}
                  {selfEvalMode && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-amber-800 mb-1">Auto-évaluation de l'agent</p>
                        <p className="text-xs text-amber-700">Donnez votre propre appréciation de votre performance sur les objectifs fixés.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note d'auto-évaluation (0–100)</label>
                        <input type="number" min={0} max={100} value={form.self_evaluation_score}
                          onChange={e => setForm({ ...form, self_evaluation_score: e.target.value })}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire d'auto-évaluation</label>
                        <textarea rows={5} value={form.self_evaluation_comment}
                          onChange={e => setForm({ ...form, self_evaluation_comment: e.target.value })}
                          placeholder="Décrivez vos résultats, vos difficultés rencontrées, vos points forts..."
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
                <button form="obj-form" type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                  {selfEvalMode ? <><Send className="h-4 w-4" /> Soumettre l'auto-évaluation</> : <><Save className="h-4 w-4" /> {selected ? 'Mettre à jour' : 'Créer'}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
