import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Grid, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SalaryGrid {
  id: string;
  code: string;
  name: string;
  description: string | null;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  convention_type: string | null;
}

interface SalaryScale {
  id: string;
  salary_grid_id: string;
  grade: string;
  echelon: number;
  category: string | null;
  base_salary: number;
  min_salary: number | null;
  max_salary: number | null;
  experience_years_min: number | null;
  experience_years_max: number | null;
}

export function SalaryGridManagement() {
  const [grids, setGrids] = useState<SalaryGrid[]>([]);
  const [selectedGrid, setSelectedGrid] = useState<SalaryGrid | null>(null);
  const [scales, setScales] = useState<SalaryScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGridForm, setShowGridForm] = useState(false);
  const [showScaleForm, setShowScaleForm] = useState(false);
  const [editingGrid, setEditingGrid] = useState<SalaryGrid | null>(null);
  const [editingScale, setEditingScale] = useState<SalaryScale | null>(null);

  const [gridFormData, setGridFormData] = useState({
    code: '',
    name: '',
    description: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    convention_type: 'Convention Hydrocarbures',
  });

  const [scaleFormData, setScaleFormData] = useState({
    grade: '',
    echelon: 1,
    category: '',
    base_salary: 0,
    min_salary: 0,
    max_salary: 0,
    experience_years_min: 0,
    experience_years_max: 0,
  });

  useEffect(() => {
    loadGrids();
  }, []);

  useEffect(() => {
    if (selectedGrid) {
      loadScales(selectedGrid.id);
    }
  }, [selectedGrid]);

  const loadGrids = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_grids')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;
      setGrids(data || []);
      if (data && data.length > 0 && !selectedGrid) {
        setSelectedGrid(data[0]);
      }
    } catch (error) {
      console.error('Error loading grids:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScales = async (gridId: string) => {
    try {
      const { data, error } = await supabase
        .from('salary_scales')
        .select('*')
        .eq('salary_grid_id', gridId)
        .order('grade', { ascending: true })
        .order('echelon', { ascending: true });

      if (error) throw error;
      setScales(data || []);
    } catch (error) {
      console.error('Error loading scales:', error);
    }
  };

  const handleSubmitGrid = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGrid) {
        const { error } = await supabase
          .from('salary_grids')
          .update(gridFormData)
          .eq('id', editingGrid.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salary_grids')
          .insert([gridFormData]);

        if (error) throw error;
      }

      setShowGridForm(false);
      setEditingGrid(null);
      loadGrids();
    } catch (error) {
      console.error('Error saving grid:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleSubmitScale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGrid) return;

    try {
      const dataToSave = {
        ...scaleFormData,
        salary_grid_id: selectedGrid.id,
      };

      if (editingScale) {
        const { error } = await supabase
          .from('salary_scales')
          .update(dataToSave)
          .eq('id', editingScale.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salary_scales')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowScaleForm(false);
      setEditingScale(null);
      resetScaleForm();
      loadScales(selectedGrid.id);
    } catch (error) {
      console.error('Error saving scale:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteScale = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet échelon ?')) return;

    try {
      const { error } = await supabase
        .from('salary_scales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (selectedGrid) loadScales(selectedGrid.id);
    } catch (error) {
      console.error('Error deleting scale:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetScaleForm = () => {
    setScaleFormData({
      grade: '',
      echelon: 1,
      category: '',
      base_salary: 0,
      min_salary: 0,
      max_salary: 0,
      experience_years_min: 0,
      experience_years_max: 0,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const groupedScales = scales.reduce((acc, scale) => {
    if (!acc[scale.grade]) {
      acc[scale.grade] = [];
    }
    acc[scale.grade].push(scale);
    return acc;
  }, {} as Record<string, SalaryScale[]>);

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
          <h2 className="text-2xl font-bold text-slate-900">Grilles Salariales</h2>
          <p className="text-slate-600 mt-1">Gestion des grilles et échelles salariales</p>
        </div>
        <button
          onClick={() => {
            setEditingGrid(null);
            setGridFormData({
              code: '',
              name: '',
              description: '',
              effective_date: new Date().toISOString().split('T')[0],
              end_date: '',
              is_active: true,
              convention_type: 'Convention Hydrocarbures',
            });
            setShowGridForm(true);
          }}
          className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition"
        >
          <Plus className="w-5 h-5" />
          Nouvelle grille
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Grid className="w-5 h-5" />
            Grilles disponibles
          </h3>
          <div className="space-y-2">
            {grids.map((grid) => (
              <button
                key={grid.id}
                onClick={() => setSelectedGrid(grid)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedGrid?.id === grid.id
                    ? 'bg-snh-green text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                }`}
              >
                <p className="font-medium">{grid.name}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(grid.effective_date).toLocaleDateString('fr-FR')}
                </p>
                {grid.is_active && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded">
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6">
          {selectedGrid ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedGrid.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedGrid.description || selectedGrid.convention_type}
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetScaleForm();
                    setEditingScale(null);
                    setShowScaleForm(true);
                  }}
                  className="flex items-center gap-2 bg-snh-green text-white px-4 py-2 rounded-lg font-medium hover:bg-snh-green-dark transition"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter échelon
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedScales).map(([grade, gradeScales]) => (
                  <div key={grade} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h4 className="font-bold text-slate-900">Grade {grade}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Échelon</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Catégorie</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Salaire de base</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Min</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Max</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Expérience</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeScales.map((scale) => (
                            <tr key={scale.id} className="border-t border-slate-100">
                              <td className="py-3 px-4 font-medium">{scale.echelon}</td>
                              <td className="py-3 px-4 text-sm text-slate-600">{scale.category || '-'}</td>
                              <td className="py-3 px-4 text-right font-medium text-slate-900">
                                {formatCurrency(scale.base_salary)}
                              </td>
                              <td className="py-3 px-4 text-right text-sm text-slate-600">
                                {scale.min_salary ? formatCurrency(scale.min_salary) : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-sm text-slate-600">
                                {scale.max_salary ? formatCurrency(scale.max_salary) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center text-sm text-slate-600">
                                {scale.experience_years_min !== null && scale.experience_years_max !== null
                                  ? `${scale.experience_years_min}-${scale.experience_years_max} ans`
                                  : '-'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => {
                                      setEditingScale(scale);
                                      setScaleFormData({
                                        grade: scale.grade,
                                        echelon: scale.echelon,
                                        category: scale.category || '',
                                        base_salary: scale.base_salary,
                                        min_salary: scale.min_salary || 0,
                                        max_salary: scale.max_salary || 0,
                                        experience_years_min: scale.experience_years_min || 0,
                                        experience_years_max: scale.experience_years_max || 0,
                                      });
                                      setShowScaleForm(true);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                                  >
                                    <Edit2 className="w-4 h-4 text-slate-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteScale(scale.id)}
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
                ))}

                {scales.length === 0 && (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Aucun échelon défini pour cette grille</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Grid className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Sélectionnez une grille salariale</p>
            </div>
          )}
        </div>
      </div>

      {showScaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingScale ? 'Modifier l\'échelon' : 'Nouvel échelon'}
              </h2>
              <button
                onClick={() => {
                  setShowScaleForm(false);
                  setEditingScale(null);
                  resetScaleForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmitScale} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Grade *</label>
                  <input
                    type="text"
                    required
                    value={scaleFormData.grade}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, grade: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="A, B, C..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Échelon *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={scaleFormData.echelon}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, echelon: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Catégorie</label>
                  <input
                    type="text"
                    value={scaleFormData.category}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                    placeholder="Cadre, Agent de maîtrise, Employé..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Salaire de base *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={scaleFormData.base_salary}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, base_salary: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Salaire minimum</label>
                  <input
                    type="number"
                    min="0"
                    value={scaleFormData.min_salary}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, min_salary: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Salaire maximum</label>
                  <input
                    type="number"
                    min="0"
                    value={scaleFormData.max_salary}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, max_salary: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Expérience min (années)</label>
                  <input
                    type="number"
                    min="0"
                    value={scaleFormData.experience_years_min}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, experience_years_min: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Expérience max (années)</label>
                  <input
                    type="number"
                    min="0"
                    value={scaleFormData.experience_years_max}
                    onChange={(e) => setScaleFormData({ ...scaleFormData, experience_years_max: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowScaleForm(false);
                    setEditingScale(null);
                    resetScaleForm();
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
                  {editingScale ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
