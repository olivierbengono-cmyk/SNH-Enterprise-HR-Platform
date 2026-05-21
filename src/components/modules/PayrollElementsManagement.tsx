import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PayrollElement {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: 'gain' | 'retenue' | 'cotisation_employee' | 'cotisation_employer' | 'information';
  calculation_type: 'fixed' | 'percentage' | 'formula' | 'manual';
  calculation_base: string | null;
  calculation_rate: number | null;
  formula: string | null;
  is_taxable: boolean;
  is_subject_to_cnps: boolean;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
  requires_approval: boolean;
  applicable_to_convention: string | null;
}

export function PayrollElementsManagement() {
  const [elements, setElements] = useState<PayrollElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingElement, setEditingElement] = useState<PayrollElement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<PayrollElement>>({
    code: '',
    name: '',
    description: '',
    category: 'gain',
    calculation_type: 'fixed',
    calculation_base: null,
    calculation_rate: null,
    formula: null,
    is_taxable: true,
    is_subject_to_cnps: true,
    display_order: 0,
    is_active: true,
    requires_approval: false,
    applicable_to_convention: null,
  });

  useEffect(() => {
    loadElements();
  }, []);

  const loadElements = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_elements')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setElements(data || []);
    } catch (error) {
      console.error('Error loading payroll elements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingElement) {
        const { error } = await supabase
          .from('payroll_elements')
          .update(formData)
          .eq('id', editingElement.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payroll_elements')
          .insert([formData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingElement(null);
      resetForm();
      loadElements();
    } catch (error) {
      console.error('Error saving payroll element:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (element: PayrollElement) => {
    setEditingElement(element);
    setFormData(element);
    setShowForm(true);
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('Les éléments système ne peuvent pas être supprimés');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      const { error } = await supabase
        .from('payroll_elements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadElements();
    } catch (error) {
      console.error('Error deleting element:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'gain',
      calculation_type: 'fixed',
      calculation_base: null,
      calculation_rate: null,
      formula: null,
      is_taxable: true,
      is_subject_to_cnps: true,
      display_order: 0,
      is_active: true,
      requires_approval: false,
      applicable_to_convention: null,
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      gain: 'Gain',
      retenue: 'Retenue',
      cotisation_employee: 'Cotisation Salarié',
      cotisation_employer: 'Cotisation Employeur',
      information: 'Information',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      gain: 'bg-green-100 text-green-800',
      retenue: 'bg-red-100 text-red-800',
      cotisation_employee: 'bg-blue-100 text-blue-800',
      cotisation_employer: 'bg-purple-100 text-purple-800',
      information: 'bg-slate-100 text-slate-800',
    };
    return colors[category as keyof typeof colors] || colors.information;
  };

  const filteredElements = filterCategory === 'all'
    ? elements
    : elements.filter(e => e.category === filterCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Éléments de Paie</h2>
          <p className="text-slate-600 mt-1">Gestion des rubriques de paie paramétrables</p>
        </div>
        <button
          onClick={() => {
            setEditingElement(null);
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition"
        >
          <Plus className="w-5 h-5" />
          Nouvel élément
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterCategory === 'all'
                ? 'bg-snh-green text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tous ({elements.length})
          </button>
          <button
            onClick={() => setFilterCategory('gain')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterCategory === 'gain'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Gains ({elements.filter(e => e.category === 'gain').length})
          </button>
          <button
            onClick={() => setFilterCategory('retenue')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterCategory === 'retenue'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Retenues ({elements.filter(e => e.category === 'retenue').length})
          </button>
          <button
            onClick={() => setFilterCategory('cotisation_employee')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterCategory === 'cotisation_employee'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Cotisations Salarié ({elements.filter(e => e.category === 'cotisation_employee').length})
          </button>
        </div>

        <div className="space-y-3">
          {filteredElements.map((element) => (
            <div
              key={element.id}
              className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-slate-900">{element.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(element.category)}`}>
                      {getCategoryLabel(element.category)}
                    </span>
                    {element.is_system && (
                      <span className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-medium">
                        Système
                      </span>
                    )}
                    {!element.is_active && (
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">Code: {element.code}</p>
                  {element.description && (
                    <p className="text-sm text-slate-600 mb-2">{element.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Type: {element.calculation_type}</span>
                    {element.calculation_rate && (
                      <span>Taux: {(element.calculation_rate * 100).toFixed(2)}%</span>
                    )}
                    <span>Imposable: {element.is_taxable ? 'Oui' : 'Non'}</span>
                    <span>CNPS: {element.is_subject_to_cnps ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(element)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </button>
                  {!element.is_system && (
                    <button
                      onClick={() => handleDelete(element.id, element.is_system)}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredElements.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Aucun élément trouvé</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingElement ? 'Modifier l\'élément' : 'Nouvel élément de paie'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingElement(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="PRIME_XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Catégorie *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  >
                    <option value="gain">Gain</option>
                    <option value="retenue">Retenue</option>
                    <option value="cotisation_employee">Cotisation Salarié</option>
                    <option value="cotisation_employer">Cotisation Employeur</option>
                    <option value="information">Information</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type de calcul *
                  </label>
                  <select
                    required
                    value={formData.calculation_type}
                    onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  >
                    <option value="fixed">Montant fixe</option>
                    <option value="percentage">Pourcentage</option>
                    <option value="formula">Formule</option>
                    <option value="manual">Saisie manuelle</option>
                  </select>
                </div>

                {formData.calculation_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Taux (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.calculation_rate || ''}
                      onChange={(e) => setFormData({ ...formData, calculation_rate: parseFloat(e.target.value) / 100 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                      placeholder="4.2"
                    />
                  </div>
                )}

                {formData.calculation_type === 'formula' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Formule
                    </label>
                    <input
                      type="text"
                      value={formData.formula || ''}
                      onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                      placeholder="gross_salary * 0.042"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Convention applicable
                  </label>
                  <input
                    type="text"
                    value={formData.applicable_to_convention || ''}
                    onChange={(e) => setFormData({ ...formData, applicable_to_convention: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="Convention Hydrocarbures"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_taxable}
                      onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-snh-green"
                    />
                    <span className="text-sm font-medium text-slate-700">Soumis à l'IRPP</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_subject_to_cnps}
                      onChange={(e) => setFormData({ ...formData, is_subject_to_cnps: e.target.checked })}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-snh-green"
                    />
                    <span className="text-sm font-medium text-slate-700">Soumis aux cotisations CNPS</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requires_approval}
                      onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-snh-green"
                    />
                    <span className="text-sm font-medium text-slate-700">Nécessite approbation</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-snh-green"
                    />
                    <span className="text-sm font-medium text-slate-700">Actif</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingElement(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg hover:bg-snh-green-dark transition font-medium"
                >
                  <Save className="w-5 h-5" />
                  {editingElement ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
