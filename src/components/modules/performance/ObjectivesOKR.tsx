import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, AlertCircle, CheckCircle2, Clock, X, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Objective {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  type: 'individual' | 'team' | 'company';
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual';
  year: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  key_results?: KeyResult[];
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  metric: string;
  target_value: number;
  current_value: number;
  unit: string;
  weight: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
}

export default function ObjectivesOKR() {
  const { user, profile } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    type: 'individual' as 'individual' | 'team' | 'company',
    period: 'Q1' as 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    status: 'draft' as 'draft' | 'active' | 'completed' | 'cancelled',
  });

  const [keyResults, setKeyResults] = useState<Partial<KeyResult>[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  useEffect(() => {
    loadObjectives();
    loadEmployees();
    loadCurrentEmployee();
  }, [selectedPeriod, selectedYear]);

  const loadCurrentEmployee = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setCurrentEmployee(data);
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, position:positions(name)')
      .eq('employment_status', 'active')
      .order('last_name');

    if (data) setEmployees(data);
  };

  const loadObjectives = async () => {
    setLoading(true);

    let query = supabase
      .from('objectives')
      .select(`
        *,
        employee:employees(first_name, last_name),
        key_results(*)
      `)
      .eq('year', selectedYear)
      .order('created_at', { ascending: false });

    if (selectedPeriod !== 'all') {
      query = query.eq('period', selectedPeriod);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading objectives:', error);
    } else {
      setObjectives(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const objectiveData = {
      ...formData,
      created_by: currentEmployee?.id,
      employee_id: formData.employee_id || currentEmployee?.id,
    };

    if (editingObjective) {
      const { error } = await supabase
        .from('objectives')
        .update(objectiveData)
        .eq('id', editingObjective.id);

      if (error) {
        alert('Erreur lors de la mise à jour de l\'objectif');
        return;
      }

      for (const kr of keyResults) {
        if (kr.id) {
          await supabase
            .from('key_results')
            .update(kr)
            .eq('id', kr.id);
        } else {
          await supabase
            .from('key_results')
            .insert({ ...kr, objective_id: editingObjective.id });
        }
      }
    } else {
      const { data: newObjective, error } = await supabase
        .from('objectives')
        .insert(objectiveData)
        .select()
        .single();

      if (error) {
        alert('Erreur lors de la création de l\'objectif');
        return;
      }

      if (newObjective && keyResults.length > 0) {
        const keyResultsData = keyResults.map(kr => ({
          ...kr,
          objective_id: newObjective.id,
        }));

        await supabase.from('key_results').insert(keyResultsData);
      }
    }

    resetForm();
    loadObjectives();
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      title: '',
      description: '',
      type: 'individual',
      period: 'Q1',
      year: new Date().getFullYear(),
      start_date: '',
      end_date: '',
      status: 'draft',
    });
    setKeyResults([]);
    setEditingObjective(null);
    setShowModal(false);
  };

  const handleEdit = (objective: Objective) => {
    setEditingObjective(objective);
    setFormData({
      employee_id: objective.employee_id,
      title: objective.title,
      description: objective.description,
      type: objective.type,
      period: objective.period,
      year: objective.year,
      start_date: objective.start_date,
      end_date: objective.end_date,
      status: objective.status,
    });
    setKeyResults(objective.key_results || []);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) return;

    const { error } = await supabase
      .from('objectives')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
    } else {
      loadObjectives();
    }
  };

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      {
        title: '',
        metric: '',
        target_value: 0,
        current_value: 0,
        unit: '',
        weight: 100,
        status: 'not_started',
      },
    ]);
  };

  const updateKeyResult = (index: number, field: string, value: any) => {
    const updated = [...keyResults];
    updated[index] = { ...updated[index], [field]: value };
    setKeyResults(updated);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      at_risk: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      draft: 'Brouillon',
      active: 'Actif',
      completed: 'Terminé',
      cancelled: 'Annulé',
      not_started: 'Non démarré',
      in_progress: 'En cours',
      at_risk: 'À risque',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const calculateProgress = (keyResults: KeyResult[]) => {
    if (!keyResults || keyResults.length === 0) return 0;

    const totalWeight = keyResults.reduce((sum, kr) => sum + kr.weight, 0);
    const weightedProgress = keyResults.reduce((sum, kr) => {
      const progress = Math.min((kr.current_value / kr.target_value) * 100, 100);
      return sum + (progress * kr.weight / totalWeight);
    }, 0);

    return Math.round(weightedProgress);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toutes les périodes</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="annual">Annuel</option>
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nouvel Objectif
        </button>
      </div>

      {objectives.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucun objectif pour cette période</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {objectives.map((objective) => (
            <div key={objective.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{objective.title}</h3>
                    {getStatusBadge(objective.status)}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {objective.type === 'individual' ? 'Individuel' : objective.type === 'team' ? 'Équipe' : 'Entreprise'}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {objective.period} {objective.year}
                    </span>
                  </div>
                  {objective.employee && (
                    <p className="text-sm text-gray-600 mb-2">
                      {objective.employee.first_name} {objective.employee.last_name}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">{objective.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(objective)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(objective.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {objective.key_results && objective.key_results.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Résultats Clés</h4>
                    <span className="text-sm font-medium text-blue-600">
                      Progression: {calculateProgress(objective.key_results)}%
                    </span>
                  </div>

                  {objective.key_results.map((kr) => (
                    <div key={kr.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{kr.title}</p>
                          <p className="text-sm text-gray-600">{kr.metric}</p>
                        </div>
                        {getStatusBadge(kr.status)}
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{kr.current_value} / {kr.target_value} {kr.unit}</span>
                          <span>{Math.round((kr.current_value / kr.target_value) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              kr.status === 'completed' ? 'bg-green-500' :
                              kr.status === 'at_risk' ? 'bg-orange-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min((kr.current_value / kr.target_value) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingObjective ? 'Modifier l\'Objectif' : 'Nouvel Objectif'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {(profile?.role === 'drh' || profile?.role === 'career_manager' || profile?.role === 'admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employé
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="individual">Individuel</option>
                    <option value="team">Équipe</option>
                    <option value="company">Entreprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Période
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="annual">Annuel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Année
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de l'objectif
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Augmenter la satisfaction client"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez l'objectif en détail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Résultats Clés (KR)</h3>
                  <button
                    type="button"
                    onClick={addKeyResult}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Plus size={18} />
                    Ajouter un KR
                  </button>
                </div>

                <div className="space-y-4">
                  {keyResults.map((kr, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeKeyResult(index)}
                        className="absolute top-2 right-2 text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <X size={18} />
                      </button>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre du résultat clé
                          </label>
                          <input
                            type="text"
                            value={kr.title}
                            onChange={(e) => updateKeyResult(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: Atteindre un NPS de 8/10"
                            required
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Métrique
                          </label>
                          <input
                            type="text"
                            value={kr.metric}
                            onChange={(e) => updateKeyResult(index, 'metric', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: Score NPS"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valeur cible
                          </label>
                          <input
                            type="number"
                            value={kr.target_value}
                            onChange={(e) => updateKeyResult(index, 'target_value', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valeur actuelle
                          </label>
                          <input
                            type="number"
                            value={kr.current_value}
                            onChange={(e) => updateKeyResult(index, 'current_value', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unité
                          </label>
                          <input
                            type="text"
                            value={kr.unit}
                            onChange={(e) => updateKeyResult(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="%, points, €, etc."
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Poids (%)
                          </label>
                          <input
                            type="number"
                            value={kr.weight}
                            onChange={(e) => updateKeyResult(index, 'weight', Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Statut
                          </label>
                          <select
                            value={kr.status}
                            onChange={(e) => updateKeyResult(index, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="not_started">Non démarré</option>
                            <option value="in_progress">En cours</option>
                            <option value="at_risk">À risque</option>
                            <option value="completed">Terminé</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingObjective ? 'Mettre à jour' : 'Créer l\'objectif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
