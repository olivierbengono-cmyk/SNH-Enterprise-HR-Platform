import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Filter, ChevronDown, ChevronUp, User, Calendar, FileText, CheckCircle, XCircle, Clock, CreditCard as Edit2, Trash2, Eye, X, Save, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DisciplinaryAction {
  id: string;
  employee_id: string;
  action_type: string;
  severity_level: number;
  incident_date: string;
  action_date: string;
  infraction_description: string;
  action_taken: string;
  duration_days: number | null;
  financial_penalty: number | null;
  employee_statement: string | null;
  appeal_deadline: string | null;
  appeal_filed: boolean;
  appeal_decision: string | null;
  is_active: boolean;
  expiry_date: string | null;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_number: string;
    department?: { name: string } | null;
    position?: { name: string } | null;
  } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  department?: { name: string } | null;
  position?: { name: string } | null;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  verbal_warning: 'Avertissement verbal',
  written_warning: 'Avertissement ecrit',
  final_warning: 'Avertissement final',
  suspension: 'Suspension',
  demotion: 'Retrogradation',
  dismissal: 'Licenciement',
};

const ACTION_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  verbal_warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  written_warning: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  final_warning: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  suspension: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  demotion: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  dismissal: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-400' },
};

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Tres faible',
  2: 'Faible',
  3: 'Moyen',
  4: 'Eleve',
  5: 'Critique',
};

const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-yellow-400',
  3: 'bg-orange-400',
  4: 'bg-red-400',
  5: 'bg-red-700',
};

const EMPTY_FORM = {
  employee_id: '',
  action_type: 'verbal_warning',
  severity_level: 1,
  incident_date: new Date().toISOString().split('T')[0],
  action_date: new Date().toISOString().split('T')[0],
  infraction_description: '',
  action_taken: '',
  duration_days: '',
  financial_penalty: '',
  employee_statement: '',
  appeal_deadline: '',
  expiry_date: '',
};

export default function DisciplinaryManagement() {
  const { profile } = useAuth();
  const [actions, setActions] = useState<DisciplinaryAction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAction, setEditingAction] = useState<DisciplinaryAction | null>(null);
  const [selectedAction, setSelectedAction] = useState<DisciplinaryAction | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [actionsRes, employeesRes] = await Promise.all([
        supabase
          .from('disciplinary_actions')
          .select(`
            *,
            employee:employees!disciplinary_actions_employee_id_fkey(
              first_name, last_name, employee_number,
              department:departments(name),
              position:positions(name)
            )
          `)
          .order('action_date', { ascending: false }),
        supabase
          .from('employees')
          .select('id, first_name, last_name, employee_number, department:departments(name), position:positions(name)')
          .eq('employment_status', 'active')
          .order('last_name'),
      ]);

      setActions((actionsRes.data || []) as unknown as DisciplinaryAction[]);
      setEmployees((employeesRes.data || []) as unknown as Employee[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingAction(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (action: DisciplinaryAction) => {
    setEditingAction(action);
    setFormData({
      employee_id: action.employee_id,
      action_type: action.action_type,
      severity_level: action.severity_level,
      incident_date: action.incident_date,
      action_date: action.action_date,
      infraction_description: action.infraction_description,
      action_taken: action.action_taken,
      duration_days: action.duration_days?.toString() || '',
      financial_penalty: action.financial_penalty?.toString() || '',
      employee_statement: action.employee_statement || '',
      appeal_deadline: action.appeal_deadline || '',
      expiry_date: action.expiry_date || '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const payload: any = {
        employee_id: formData.employee_id,
        action_type: formData.action_type,
        severity_level: Number(formData.severity_level),
        incident_date: formData.incident_date,
        action_date: formData.action_date,
        infraction_description: formData.infraction_description,
        action_taken: formData.action_taken,
        duration_days: formData.duration_days ? Number(formData.duration_days) : null,
        financial_penalty: formData.financial_penalty ? Number(formData.financial_penalty) : null,
        employee_statement: formData.employee_statement || null,
        appeal_deadline: formData.appeal_deadline || null,
        expiry_date: formData.expiry_date || null,
        issued_by: profile?.id,
      };

      if (editingAction) {
        const { error } = await supabase
          .from('disciplinary_actions')
          .update(payload)
          .eq('id', editingAction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('disciplinary_actions')
          .insert(payload);
        if (error) throw error;
      }

      setShowForm(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving action:', error);
      setFormError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmer la suppression de cette action disciplinaire ?')) return;
    try {
      const { error } = await supabase.from('disciplinary_actions').delete().eq('id', id);
      if (error) throw error;
      setSelectedAction(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const handleToggleAppeal = async (action: DisciplinaryAction) => {
    try {
      const { error } = await supabase
        .from('disciplinary_actions')
        .update({ appeal_filed: !action.appeal_filed })
        .eq('id', action.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating appeal:', error);
    }
  };

  const filteredActions = actions.filter((action) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      !search ||
      `${action.employee?.first_name} ${action.employee?.last_name}`.toLowerCase().includes(search) ||
      action.infraction_description.toLowerCase().includes(search) ||
      ACTION_TYPE_LABELS[action.action_type]?.toLowerCase().includes(search);

    const matchesType = filterType === 'all' || action.action_type === filterType;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && action.is_active) ||
      (filterStatus === 'inactive' && !action.is_active) ||
      (filterStatus === 'appeal' && action.appeal_filed);

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: actions.length,
    active: actions.filter(a => a.is_active).length,
    appeals: actions.filter(a => a.appeal_filed).length,
    thisMonth: actions.filter(a => {
      const d = new Date(a.action_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion Disciplinaire</h1>
          <p className="text-slate-600 mt-1">Suivi des actions disciplinaires et avertissements</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouvelle action
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Shield, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'Actives', value: stats.active, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
          { label: 'Appels deposes', value: stats.appeals, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' },
          { label: 'Ce mois', value: stats.thisMonth, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                </div>
                <div className={`p-3 ${s.bg} rounded-xl`}>
                  <Icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un employe, une infraction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">Tous les types</option>
              {Object.entries(ACTION_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
              <option value="appeal">Appel depose</option>
            </select>
          </div>
        </div>

        {filteredActions.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aucune action disciplinaire</p>
            <p className="text-slate-400 text-sm mt-1">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Aucun resultat pour ces filtres'
                : 'Cliquez sur "Nouvelle action" pour commencer'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActions.map((action) => {
              const styles = ACTION_TYPE_STYLES[action.action_type] || ACTION_TYPE_STYLES.verbal_warning;
              const isExpanded = expandedId === action.id;

              return (
                <div key={action.id} className="hover:bg-slate-50 transition">
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : action.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                        {action.employee?.first_name?.[0]}{action.employee?.last_name?.[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {action.employee?.first_name} {action.employee?.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {action.employee?.position?.name} — {action.employee?.department?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${styles.bg} ${styles.text} ${styles.border}`}>
                              {ACTION_TYPE_LABELS[action.action_type]}
                            </span>
                            {!action.is_active && (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                Expiree
                              </span>
                            )}
                            {action.appeal_filed && (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Appel
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : action.id); }}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Incident: {formatDate(action.incident_date)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            Action: {formatDate(action.action_date)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">Gravite:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((dot) => (
                                <div
                                  key={dot}
                                  className={`w-2 h-2 rounded-full ${dot <= action.severity_level ? SEVERITY_COLORS[action.severity_level] : 'bg-slate-200'}`}
                                />
                              ))}
                              <span className="text-xs text-slate-500 ml-1">{SEVERITY_LABELS[action.severity_level]}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 mt-2 line-clamp-2">{action.infraction_description}</p>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 ml-14">
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description de l'infraction</p>
                            <p className="text-sm text-slate-700">{action.infraction_description}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mesure prise</p>
                            <p className="text-sm text-slate-700">{action.action_taken}</p>
                          </div>
                        </div>

                        {(action.duration_days || action.financial_penalty) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {action.duration_days && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Duree de suspension</p>
                                <p className="text-sm text-slate-700">{action.duration_days} jour{action.duration_days > 1 ? 's' : ''}</p>
                              </div>
                            )}
                            {action.financial_penalty && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sanction financiere</p>
                                <p className="text-sm text-slate-700">
                                  {Number(action.financial_penalty).toLocaleString('fr-FR')} XAF
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {action.employee_statement && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Declaration de l'employe</p>
                            <p className="text-sm text-slate-700 italic">"{action.employee_statement}"</p>
                          </div>
                        )}

                        {action.appeal_deadline && (
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delai d'appel:</p>
                            <p className="text-sm text-slate-700">{formatDate(action.appeal_deadline)}</p>
                          </div>
                        )}

                        {action.appeal_filed && action.appeal_decision && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Decision sur appel</p>
                            <p className="text-sm text-slate-700">{action.appeal_decision}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => openEditForm(action)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleToggleAppeal(action)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                              action.appeal_filed
                                ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                                : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {action.appeal_filed ? 'Appel enregistre' : 'Enregistrer appel'}
                          </button>
                          <button
                            onClick={() => handleDelete(action.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingAction ? 'Modifier une action disciplinaire' : 'Nouvelle action disciplinaire'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editingAction ? 'Mettre a jour les informations' : 'Enregistrer une nouvelle procedure disciplinaire'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Employe <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="">Selectionner un employe</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.last_name} {emp.first_name} — {emp.department?.name || 'Sans departement'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Type d'action <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    {Object.entries(ACTION_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Niveau de gravite <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.severity_level}
                    onChange={(e) => setFormData({ ...formData, severity_level: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>{level} — {SEVERITY_LABELS[level]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date de l'incident <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date de l'action <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.action_date}
                    onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description de l'infraction <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.infraction_description}
                  onChange={(e) => setFormData({ ...formData, infraction_description: e.target.value })}
                  required
                  rows={3}
                  placeholder="Decrivez precisement les faits reprochees..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mesure disciplinaire prise <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.action_taken}
                  onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                  required
                  rows={3}
                  placeholder="Decrivez la sanction ou la mesure corrective prise..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              {(formData.action_type === 'suspension' || formData.action_type === 'demotion') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Duree (jours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      placeholder="Ex: 3"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Sanction financiere (XAF)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.financial_penalty}
                      onChange={(e) => setFormData({ ...formData, financial_penalty: e.target.value })}
                      placeholder="Ex: 50000"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Declaration de l'employe
                </label>
                <textarea
                  value={formData.employee_statement}
                  onChange={(e) => setFormData({ ...formData, employee_statement: e.target.value })}
                  rows={2}
                  placeholder="Version des faits de l'employe (optionnel)..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Delai limite d'appel
                  </label>
                  <input
                    type="date"
                    value={formData.appeal_deadline}
                    onChange={(e) => setFormData({ ...formData, appeal_deadline: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date d'expiration
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingAction ? 'Mettre a jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
