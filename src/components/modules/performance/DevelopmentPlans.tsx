import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, X, CreditCard as Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface DevelopmentPlan {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  start_date: string;
  target_completion_date: string;
  actual_completion_date: string;
  employee?: any;
  actions?: DevelopmentAction[];
}

interface DevelopmentAction {
  id: string;
  plan_id: string;
  action_type: 'training' | 'mentoring' | 'project' | 'certification' | 'other';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
  completion_date: string;
  resources_needed: string;
  progress_notes: string;
}

export default function DevelopmentPlans() {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DevelopmentPlan | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'completed',
    start_date: '',
    target_completion_date: '',
  });

  const [actions, setActions] = useState<Partial<DevelopmentAction>[]>([]);

  useEffect(() => {
    loadPlans();
    loadEmployees();
    loadCurrentEmployee();
  }, []);

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

  const loadPlans = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('development_plans')
      .select(`
        *,
        employee:employees(first_name, last_name, position:positions(name)),
        actions:development_actions(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading plans:', error);
    } else {
      setPlans(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const planData = {
      ...formData,
      employee_id: formData.employee_id || currentEmployee?.id,
    };

    if (selectedPlan) {
      const { error } = await supabase
        .from('development_plans')
        .update(planData)
        .eq('id', selectedPlan.id);

      if (error) {
        alert('Erreur lors de la mise à jour du plan');
        return;
      }

      for (const action of actions) {
        if (action.id) {
          await supabase
            .from('development_actions')
            .update(action)
            .eq('id', action.id);
        } else {
          await supabase
            .from('development_actions')
            .insert({ ...action, plan_id: selectedPlan.id });
        }
      }
    } else {
      const { data: newPlan, error } = await supabase
        .from('development_plans')
        .insert(planData)
        .select()
        .single();

      if (error) {
        alert('Erreur lors de la création du plan');
        return;
      }

      if (newPlan && actions.length > 0) {
        const actionsData = actions.map(action => ({
          ...action,
          plan_id: newPlan.id,
        }));

        await supabase.from('development_actions').insert(actionsData);
      }
    }

    resetForm();
    loadPlans();
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      title: '',
      description: '',
      status: 'draft',
      start_date: '',
      target_completion_date: '',
    });
    setActions([]);
    setSelectedPlan(null);
    setShowModal(false);
  };

  const handleEdit = (plan: DevelopmentPlan) => {
    setSelectedPlan(plan);
    setFormData({
      employee_id: plan.employee_id,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      start_date: plan.start_date,
      target_completion_date: plan.target_completion_date,
    });
    setActions(plan.actions || []);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) return;

    const { error } = await supabase
      .from('development_plans')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
    } else {
      loadPlans();
    }
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        action_type: 'training',
        title: '',
        description: '',
        priority: 'medium',
        status: 'planned',
        due_date: '',
        resources_needed: '',
        progress_notes: '',
      },
    ]);
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      planned: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: 'Brouillon',
      active: 'Actif',
      completed: 'Terminé',
      planned: 'Planifié',
      in_progress: 'En cours',
      cancelled: 'Annulé',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };

    const labels = {
      high: 'Haute',
      medium: 'Moyenne',
      low: 'Basse',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  const calculateProgress = (actions: DevelopmentAction[]) => {
    if (!actions || actions.length === 0) return 0;
    const completed = actions.filter(a => a.status === 'completed').length;
    return Math.round((completed / actions.length) * 100);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Plans de Développement Individuel</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nouveau Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucun plan de développement</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
                    {getStatusBadge(plan.status)}
                  </div>

                  {plan.employee && (
                    <p className="text-sm text-gray-600 mb-2">
                      {plan.employee.first_name} {plan.employee.last_name}
                      {plan.employee.position && ` - ${plan.employee.position.name}`}
                    </p>
                  )}

                  <p className="text-sm text-gray-600 mb-3">{plan.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Début: {new Date(plan.start_date).toLocaleDateString('fr-FR')}</span>
                    <span>Objectif: {new Date(plan.target_completion_date).toLocaleDateString('fr-FR')}</span>
                    {plan.actions && plan.actions.length > 0 && (
                      <>
                        <span className="font-medium text-blue-600">
                          {plan.actions.length} action(s)
                        </span>
                        <span className="font-medium text-green-600">
                          Progression: {calculateProgress(plan.actions)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {plan.actions && plan.actions.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Actions du plan</h4>
                  <div className="space-y-2">
                    {plan.actions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{action.title}</span>
                            {getStatusBadge(action.status)}
                            {getPriorityBadge(action.priority)}
                          </div>
                          <p className="text-xs text-gray-500">
                            Échéance: {new Date(action.due_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {action.action_type === 'training' ? 'Formation' :
                           action.action_type === 'mentoring' ? 'Mentorat' :
                           action.action_type === 'project' ? 'Projet' :
                           action.action_type === 'certification' ? 'Certification' : 'Autre'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedPlan ? 'Modifier le Plan' : 'Nouveau Plan de Développement'}
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
                    <option value="">Mon plan personnel</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du plan
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Plan de développement Q1 2026"
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
                  placeholder="Objectifs et contexte de ce plan..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  </select>
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
                    Date cible de fin
                  </label>
                  <input
                    type="date"
                    value={formData.target_completion_date}
                    onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Actions du plan</h3>
                  <button
                    type="button"
                    onClick={addAction}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Plus size={18} />
                    Ajouter une action
                  </button>
                </div>

                <div className="space-y-4">
                  {actions.map((action, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeAction(index)}
                        className="absolute top-2 right-2 text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <X size={18} />
                      </button>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type d'action
                          </label>
                          <select
                            value={action.action_type}
                            onChange={(e) => updateAction(index, 'action_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="training">Formation</option>
                            <option value="mentoring">Mentorat</option>
                            <option value="project">Projet</option>
                            <option value="certification">Certification</option>
                            <option value="other">Autre</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priorité
                          </label>
                          <select
                            value={action.priority}
                            onChange={(e) => updateAction(index, 'priority', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="high">Haute</option>
                            <option value="medium">Moyenne</option>
                            <option value="low">Basse</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre
                          </label>
                          <input
                            type="text"
                            value={action.title}
                            onChange={(e) => updateAction(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: Suivre une formation sur React"
                            required
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={action.description}
                            onChange={(e) => updateAction(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Décrivez l'action..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Échéance
                          </label>
                          <input
                            type="date"
                            value={action.due_date}
                            onChange={(e) => updateAction(index, 'due_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Statut
                          </label>
                          <select
                            value={action.status}
                            onChange={(e) => updateAction(index, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="planned">Planifié</option>
                            <option value="in_progress">En cours</option>
                            <option value="completed">Terminé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ressources nécessaires
                          </label>
                          <input
                            type="text"
                            value={action.resources_needed}
                            onChange={(e) => updateAction(index, 'resources_needed', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Budget, temps, matériel..."
                          />
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
                  {selectedPlan ? 'Mettre à jour' : 'Créer le plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
