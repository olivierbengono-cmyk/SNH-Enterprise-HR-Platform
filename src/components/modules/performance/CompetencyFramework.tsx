import React, { useState, useEffect } from 'react';
import { Plus, Award, CreditCard as Edit2, Trash2, X, Eye } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Competency {
  id: string;
  name: string;
  category: 'technical' | 'behavioral' | 'leadership' | 'core';
  description: string;
  level_definitions: any;
  applicable_roles: string[];
  active: boolean;
}

const categories = [
  { value: 'technical', label: 'Technique', color: 'blue' },
  { value: 'behavioral', label: 'Comportementale', color: 'green' },
  { value: 'leadership', label: 'Leadership', color: 'purple' },
  { value: 'core', label: 'Fondamentale', color: 'orange' },
];

const defaultLevelDefinitions = {
  level1: { name: 'Débutant', description: '' },
  level2: { name: 'Intermédiaire', description: '' },
  level3: { name: 'Confirmé', description: '' },
  level4: { name: 'Expert', description: '' },
  level5: { name: 'Maître', description: '' },
};

export default function CompetencyFramework() {
  const { profile } = useAuth();
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    category: 'technical' as 'technical' | 'behavioral' | 'leadership' | 'core',
    description: '',
    level_definitions: defaultLevelDefinitions,
    applicable_roles: [] as string[],
    active: true,
  });

  const isHR = profile?.role === 'drh' || profile?.role === 'career_manager' || profile?.role === 'admin';

  useEffect(() => {
    loadCompetencies();
  }, [selectedCategory]);

  const loadCompetencies = async () => {
    setLoading(true);

    let query = supabase
      .from('competency_framework')
      .select('*')
      .order('category')
      .order('name');

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading competencies:', error);
    } else {
      setCompetencies(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCompetency) {
      const { error } = await supabase
        .from('competency_framework')
        .update(formData)
        .eq('id', selectedCompetency.id);

      if (error) {
        alert('Erreur lors de la mise à jour de la compétence');
        return;
      }
    } else {
      const { error } = await supabase
        .from('competency_framework')
        .insert(formData);

      if (error) {
        alert('Erreur lors de la création de la compétence');
        console.error(error);
        return;
      }
    }

    resetForm();
    loadCompetencies();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'technical',
      description: '',
      level_definitions: defaultLevelDefinitions,
      applicable_roles: [],
      active: true,
    });
    setSelectedCompetency(null);
    setShowModal(false);
    setViewMode(false);
  };

  const handleView = (competency: Competency) => {
    setSelectedCompetency(competency);
    setViewMode(true);
    setShowModal(true);
  };

  const handleEdit = (competency: Competency) => {
    setSelectedCompetency(competency);
    setFormData({
      name: competency.name,
      category: competency.category,
      description: competency.description,
      level_definitions: competency.level_definitions || defaultLevelDefinitions,
      applicable_roles: competency.applicable_roles || [],
      active: competency.active,
    });
    setViewMode(false);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette compétence ?')) return;

    const { error } = await supabase
      .from('competency_framework')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
    } else {
      loadCompetencies();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('competency_framework')
      .update({ active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la mise à jour du statut');
    } else {
      loadCompetencies();
    }
  };

  const updateLevelDefinition = (level: string, field: 'name' | 'description', value: string) => {
    setFormData({
      ...formData,
      level_definitions: {
        ...formData.level_definitions,
        [level]: {
          ...formData.level_definitions[level],
          [field]: value,
        },
      },
    });
  };

  const getCategoryBadge = (category: string) => {
    const cat = categories.find(c => c.value === category);
    if (!cat) return null;

    const colorClasses = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[cat.color as keyof typeof colorClasses]}`}>
        {cat.label}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Référentiel de Compétences</h2>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {isHR && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Nouvelle Compétence
          </button>
        )}
      </div>

      {competencies.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Award size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune compétence dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {competencies.map((competency) => (
            <div
              key={competency.id}
              className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
                !competency.active ? 'opacity-60 border-gray-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{competency.name}</h3>
                    {getCategoryBadge(competency.category)}
                    {!competency.active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{competency.description}</p>

                  {competency.applicable_roles && competency.applicable_roles.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">Applicable aux rôles:</span>
                      {competency.applicable_roles.map((role, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(competency)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Voir les niveaux"
                  >
                    <Eye size={18} />
                  </button>

                  {isHR && (
                    <>
                      <button
                        onClick={() => handleEdit(competency)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>

                      <button
                        onClick={() => toggleActive(competency.id, competency.active)}
                        className={`px-3 py-1 text-xs rounded ${
                          competency.active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {competency.active ? 'Désactiver' : 'Activer'}
                      </button>

                      <button
                        onClick={() => handleDelete(competency.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {viewMode
                  ? 'Détails de la Compétence'
                  : selectedCompetency
                  ? 'Modifier la Compétence'
                  : 'Nouvelle Compétence'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {viewMode && selectedCompetency ? (
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <p className="text-gray-900">{selectedCompetency.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  {getCategoryBadge(selectedCompetency.category)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedCompetency.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Niveaux de compétence</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedCompetency.level_definitions || {}).map(([level, def]: [string, any]) => (
                      <div key={level} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{def.name}</h4>
                        <p className="text-sm text-gray-600">{def.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de la compétence
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Gestion de projet"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
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
                    placeholder="Décrivez cette compétence..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôles applicables (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.applicable_roles.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applicable_roles: e.target.value.split(',').map(r => r.trim()).filter(r => r),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Manager, Développeur, Chef de projet (séparés par des virgules)"
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Définition des niveaux</h3>
                  <div className="space-y-4">
                    {Object.keys(defaultLevelDefinitions).map((level, index) => (
                      <div key={level} className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Niveau {index + 1}
                            </label>
                            <input
                              type="text"
                              value={formData.level_definitions[level]?.name || ''}
                              onChange={(e) => updateLevelDefinition(level, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ex: Débutant"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={formData.level_definitions[level]?.description || ''}
                              onChange={(e) => updateLevelDefinition(level, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Décrivez ce niveau..."
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Compétence active
                  </label>
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
                    {selectedCompetency ? 'Mettre à jour' : 'Créer la compétence'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
