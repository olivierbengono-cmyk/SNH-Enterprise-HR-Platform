import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TaxParameter {
  id: string;
  name: string;
  code: string;
  parameter_type: 'irpp_bracket' | 'tax_rate' | 'deduction' | 'threshold';
  min_amount: number | null;
  max_amount: number | null;
  rate: number | null;
  fixed_amount: number | null;
  deduction_amount: number | null;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  description: string | null;
}

export function TaxParametersManagement() {
  const [parameters, setParameters] = useState<TaxParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingParam, setEditingParam] = useState<TaxParameter | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parameter_type: 'irpp_bracket' as TaxParameter['parameter_type'],
    min_amount: 0,
    max_amount: 0,
    rate: 0,
    fixed_amount: 0,
    deduction_amount: 0,
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    description: '',
  });

  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_parameters')
        .select('*')
        .order('parameter_type', { ascending: true })
        .order('min_amount', { ascending: true });

      if (error) throw error;
      setParameters(data || []);
    } catch (error) {
      console.error('Error loading tax parameters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        ...formData,
        min_amount: formData.min_amount || null,
        max_amount: formData.max_amount || null,
        rate: formData.rate ? formData.rate / 100 : null,
        fixed_amount: formData.fixed_amount || null,
        deduction_amount: formData.deduction_amount || null,
        end_date: formData.end_date || null,
      };

      if (editingParam) {
        const { error } = await supabase
          .from('tax_parameters')
          .update(dataToSave)
          .eq('id', editingParam.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_parameters')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingParam(null);
      loadParameters();
    } catch (error) {
      console.error('Error saving tax parameter:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paramètre ?')) return;

    try {
      const { error } = await supabase
        .from('tax_parameters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadParameters();
    } catch (error) {
      console.error('Error deleting parameter:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleEdit = (param: TaxParameter) => {
    setEditingParam(param);
    setFormData({
      name: param.name,
      code: param.code,
      parameter_type: param.parameter_type,
      min_amount: param.min_amount || 0,
      max_amount: param.max_amount || 0,
      rate: param.rate ? param.rate * 100 : 0,
      fixed_amount: param.fixed_amount || 0,
      deduction_amount: param.deduction_amount || 0,
      effective_date: param.effective_date,
      end_date: param.end_date || '',
      is_active: param.is_active,
      description: param.description || '',
    });
    setShowForm(true);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      irpp_bracket: 'Tranche IRPP',
      tax_rate: 'Taux d\'imposition',
      deduction: 'Déduction',
      threshold: 'Seuil',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const irppBrackets = parameters.filter(p => p.parameter_type === 'irpp_bracket' && p.is_active);
  const deductions = parameters.filter(p => p.parameter_type === 'deduction' && p.is_active);
  const otherParams = parameters.filter(p => !['irpp_bracket', 'deduction'].includes(p.parameter_type) && p.is_active);

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
          <h2 className="text-2xl font-bold text-slate-900">Paramètres Fiscaux</h2>
          <p className="text-slate-600 mt-1">Configuration IRPP selon le Code Général des Impôts du Cameroun</p>
        </div>
        <button
          onClick={() => {
            setEditingParam(null);
            setFormData({
              name: '',
              code: '',
              parameter_type: 'irpp_bracket',
              min_amount: 0,
              max_amount: 0,
              rate: 0,
              fixed_amount: 0,
              deduction_amount: 0,
              effective_date: new Date().toISOString().split('T')[0],
              end_date: '',
              is_active: true,
              description: '',
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition"
        >
          <Plus className="w-5 h-5" />
          Nouveau paramètre
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Barème IRPP Cameroun 2024</h4>
            <p className="text-sm text-blue-800">
              Le barème progressif de l'IRPP est préconfiguré selon la législation camerounaise en vigueur.
              Les tranches peuvent être modifiées selon les évolutions fiscales.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Tranches IRPP
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Tranche</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">De</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">À</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Taux</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Description</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {irppBrackets.map((param) => (
                <tr key={param.id} className="border-t border-slate-100">
                  <td className="py-3 px-4 font-medium">{param.name}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(param.min_amount)}</td>
                  <td className="py-3 px-4 text-right">
                    {param.max_amount ? formatCurrency(param.max_amount) : 'Illimité'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900">
                    {param.rate ? `${(param.rate * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{param.description}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(param)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(param.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deductions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Déductions et abattements</h3>
          <div className="space-y-3">
            {deductions.map((param) => (
              <div key={param.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{param.name}</h4>
                    <p className="text-sm text-slate-600 mb-2">{param.description}</p>
                    <div className="flex gap-4 text-sm">
                      {param.rate && (
                        <span className="text-slate-700">
                          Taux: <strong>{(param.rate * 100).toFixed(1)}%</strong>
                        </span>
                      )}
                      {param.deduction_amount && (
                        <span className="text-slate-700">
                          Plafond: <strong>{formatCurrency(param.deduction_amount)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(param)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(param.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingParam ? 'Modifier le paramètre' : 'Nouveau paramètre fiscal'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingParam(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                  <select
                    required
                    value={formData.parameter_type}
                    onChange={(e) => setFormData({ ...formData, parameter_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  >
                    <option value="irpp_bracket">Tranche IRPP</option>
                    <option value="tax_rate">Taux d'imposition</option>
                    <option value="deduction">Déduction</option>
                    <option value="threshold">Seuil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Montant minimum (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Montant maximum (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_amount}
                    onChange={(e) => setFormData({ ...formData, max_amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="Laisser vide pour illimité"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Taux (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date d'effet *</label>
                  <input
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-snh-green"
                    />
                    <span className="text-sm font-medium text-slate-700">Paramètre actif</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingParam(null);
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
                  {editingParam ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
