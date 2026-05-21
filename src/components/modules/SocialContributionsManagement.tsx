import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SocialContribution {
  id: string;
  code: string;
  name: string;
  contribution_type: 'cnps_pension' | 'cnps_family' | 'cnps_accident' | 'other';
  employee_rate: number | null;
  employer_rate: number | null;
  ceiling_amount: number | null;
  floor_amount: number | null;
  calculation_base: string;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  description: string | null;
}

export function SocialContributionsManagement() {
  const [contributions, setContributions] = useState<SocialContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContrib, setEditingContrib] = useState<SocialContribution | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contribution_type: 'cnps_pension' as SocialContribution['contribution_type'],
    employee_rate: 0,
    employer_rate: 0,
    ceiling_amount: 0,
    floor_amount: 0,
    calculation_base: 'gross_salary',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    description: '',
  });

  useEffect(() => {
    loadContributions();
  }, []);

  const loadContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('social_contributions')
        .select('*')
        .order('contribution_type', { ascending: true });

      if (error) throw error;
      setContributions(data || []);
    } catch (error) {
      console.error('Error loading contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        ...formData,
        employee_rate: formData.employee_rate ? formData.employee_rate / 100 : null,
        employer_rate: formData.employer_rate ? formData.employer_rate / 100 : null,
        ceiling_amount: formData.ceiling_amount || null,
        floor_amount: formData.floor_amount || null,
        end_date: formData.end_date || null,
      };

      if (editingContrib) {
        const { error } = await supabase
          .from('social_contributions')
          .update(dataToSave)
          .eq('id', editingContrib.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_contributions')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingContrib(null);
      loadContributions();
    } catch (error) {
      console.error('Error saving contribution:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette cotisation ?')) return;

    try {
      const { error } = await supabase
        .from('social_contributions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadContributions();
    } catch (error) {
      console.error('Error deleting contribution:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleEdit = (contrib: SocialContribution) => {
    setEditingContrib(contrib);
    setFormData({
      code: contrib.code,
      name: contrib.name,
      contribution_type: contrib.contribution_type,
      employee_rate: contrib.employee_rate ? contrib.employee_rate * 100 : 0,
      employer_rate: contrib.employer_rate ? contrib.employer_rate * 100 : 0,
      ceiling_amount: contrib.ceiling_amount || 0,
      floor_amount: contrib.floor_amount || 0,
      calculation_base: contrib.calculation_base,
      effective_date: contrib.effective_date,
      end_date: contrib.end_date || '',
      is_active: contrib.is_active,
      description: contrib.description || '',
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
      cnps_pension: 'CNPS Pension/Vieillesse',
      cnps_family: 'CNPS Prestations familiales',
      cnps_accident: 'CNPS Accidents de travail',
      other: 'Autre cotisation',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      cnps_pension: 'bg-blue-100 text-blue-800',
      cnps_family: 'bg-green-100 text-green-800',
      cnps_accident: 'bg-orange-100 text-orange-800',
      other: 'bg-slate-100 text-slate-800',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

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
          <h2 className="text-2xl font-bold text-slate-900">Cotisations Sociales</h2>
          <p className="text-slate-600 mt-1">Configuration CNPS et autres cotisations obligatoires</p>
        </div>
        <button
          onClick={() => {
            setEditingContrib(null);
            setFormData({
              code: '',
              name: '',
              contribution_type: 'cnps_pension',
              employee_rate: 0,
              employer_rate: 0,
              ceiling_amount: 0,
              floor_amount: 0,
              calculation_base: 'gross_salary',
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
          Nouvelle cotisation
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Cotisations CNPS Cameroun</h4>
            <p className="text-sm text-blue-800">
              Les cotisations sociales sont configurées selon les taux en vigueur à la CNPS (Caisse Nationale
              de Prévoyance Sociale). Le plafond mensuel de cotisation est de 750 000 FCFA.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Cotisations configurées
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Cotisation</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Taux salarié</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Taux employeur</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Taux total</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Plafond</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Statut</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((contrib) => {
                const employeeRate = contrib.employee_rate || 0;
                const employerRate = contrib.employer_rate || 0;
                const totalRate = employeeRate + employerRate;

                return (
                  <tr key={contrib.id} className="border-t border-slate-100">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-slate-900">{contrib.name}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(contrib.contribution_type)}`}>
                          {getTypeLabel(contrib.contribution_type)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-medium ${employeeRate > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {employeeRate > 0 ? `${(employeeRate * 100).toFixed(2)}%` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-medium ${employerRate > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {employerRate > 0 ? `${(employerRate * 100).toFixed(2)}%` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-slate-900">
                        {(totalRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-slate-600">
                      {formatCurrency(contrib.ceiling_amount)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        contrib.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {contrib.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(contrib)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(contrib.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {contributions.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Aucune cotisation configurée</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contributions.filter(c => c.is_active).map((contrib) => {
          const totalRate = (contrib.employee_rate || 0) + (contrib.employer_rate || 0);
          return (
            <div key={contrib.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 mb-2">{contrib.name}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Part salarié:</span>
                  <span className="font-medium text-blue-600">
                    {contrib.employee_rate ? `${(contrib.employee_rate * 100).toFixed(2)}%` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Part employeur:</span>
                  <span className="font-medium text-green-600">
                    {contrib.employer_rate ? `${(contrib.employer_rate * 100).toFixed(2)}%` : '-'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="font-medium text-slate-700">Total:</span>
                  <span className="font-bold text-slate-900">
                    {(totalRate * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingContrib ? 'Modifier la cotisation' : 'Nouvelle cotisation sociale'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingContrib(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="CNPS_XXX"
                  />
                </div>

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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                  <select
                    required
                    value={formData.contribution_type}
                    onChange={(e) => setFormData({ ...formData, contribution_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  >
                    <option value="cnps_pension">CNPS Pension/Vieillesse</option>
                    <option value="cnps_family">CNPS Prestations familiales</option>
                    <option value="cnps_accident">CNPS Accidents de travail</option>
                    <option value="other">Autre cotisation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Taux salarié (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.employee_rate}
                    onChange={(e) => setFormData({ ...formData, employee_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Taux employeur (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.employer_rate}
                    onChange={(e) => setFormData({ ...formData, employer_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plafond (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.ceiling_amount}
                    onChange={(e) => setFormData({ ...formData, ceiling_amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="750000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plancher (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.floor_amount}
                    onChange={(e) => setFormData({ ...formData, floor_amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Base de calcul</label>
                  <select
                    value={formData.calculation_base}
                    onChange={(e) => setFormData({ ...formData, calculation_base: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  >
                    <option value="gross_salary">Salaire brut</option>
                    <option value="base_salary">Salaire de base</option>
                    <option value="taxable_salary">Salaire imposable</option>
                  </select>
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
                    <span className="text-sm font-medium text-slate-700">Cotisation active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingContrib(null);
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
                  {editingContrib ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
