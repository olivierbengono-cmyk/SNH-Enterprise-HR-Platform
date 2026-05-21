import React, { useState, useEffect } from 'react';
import { Plus, Users, Send, Eye, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Feedback360Campaign {
  id: string;
  employee_id: string;
  requester_id: string;
  campaign_name: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  start_date: string;
  end_date: string;
  anonymous: boolean;
  employee?: any;
  requester?: any;
  responses?: FeedbackResponse[];
}

interface FeedbackResponse {
  id: string;
  feedback_360_id: string;
  respondent_id: string;
  relationship: 'manager' | 'peer' | 'direct_report' | 'self';
  ratings: any;
  strengths: string;
  areas_for_development: string;
  additional_comments: string;
  submitted_at: string;
  respondent?: any;
}

const feedbackCategories = [
  { name: 'Communication', key: 'communication' },
  { name: 'Leadership', key: 'leadership' },
  { name: 'Collaboration', key: 'collaboration' },
  { name: 'Innovation', key: 'innovation' },
  { name: 'Qualité du travail', key: 'quality' },
  { name: 'Gestion du temps', key: 'time_management' },
];

export default function Feedback360() {
  const { user, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Feedback360Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Feedback360Campaign | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  const [campaignForm, setCampaignForm] = useState({
    employee_id: '',
    campaign_name: '',
    description: '',
    start_date: '',
    end_date: '',
    anonymous: true,
  });

  const [responseForm, setResponseForm] = useState({
    relationship: 'peer' as 'manager' | 'peer' | 'direct_report' | 'self',
    ratings: {} as any,
    strengths: '',
    areas_for_development: '',
    additional_comments: '',
  });

  useEffect(() => {
    loadCampaigns();
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

  const loadCampaigns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('feedback_360')
      .select(`
        *,
        employee:employees!feedback_360_employee_id_fkey(first_name, last_name, position:positions(name)),
        requester:employees!feedback_360_requester_id_fkey(first_name, last_name),
        responses:feedback_responses(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading campaigns:', error);
    } else {
      setCampaigns(data || []);
    }

    setLoading(false);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmployee) {
      alert('Employé non trouvé');
      return;
    }

    const { error } = await supabase
      .from('feedback_360')
      .insert({
        ...campaignForm,
        requester_id: currentEmployee.id,
        status: 'active',
      });

    if (error) {
      alert('Erreur lors de la création de la campagne');
      console.error(error);
      return;
    }

    resetCampaignForm();
    loadCampaigns();
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmployee || !selectedCampaign) return;

    const { error } = await supabase
      .from('feedback_responses')
      .insert({
        feedback_360_id: selectedCampaign.id,
        respondent_id: currentEmployee.id,
        ...responseForm,
      });

    if (error) {
      alert('Erreur lors de la soumission du feedback');
      console.error(error);
      return;
    }

    resetResponseForm();
    loadCampaigns();
  };

  const handleCloseCampaign = async (id: string) => {
    const { error } = await supabase
      .from('feedback_360')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la clôture de la campagne');
    } else {
      loadCampaigns();
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      employee_id: '',
      campaign_name: '',
      description: '',
      start_date: '',
      end_date: '',
      anonymous: true,
    });
    setShowCampaignModal(false);
  };

  const resetResponseForm = () => {
    setResponseForm({
      relationship: 'peer',
      ratings: {},
      strengths: '',
      areas_for_development: '',
      additional_comments: '',
    });
    setSelectedCampaign(null);
    setShowResponseModal(false);
  };

  const initializeRatings = () => {
    const ratings: any = {};
    feedbackCategories.forEach(cat => {
      ratings[cat.key] = 3;
    });
    setResponseForm({ ...responseForm, ratings });
  };

  const updateRating = (key: string, value: number) => {
    setResponseForm({
      ...responseForm,
      ratings: { ...responseForm.ratings, [key]: value },
    });
  };

  const renderStars = (rating: number, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange && onChange(star)}
            disabled={!onChange}
            className={`${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span className={`text-xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };

  const calculateAverageRating = (responses: FeedbackResponse[]) => {
    if (!responses || responses.length === 0) return 0;

    let totalSum = 0;
    let totalCount = 0;

    responses.forEach(response => {
      if (response.ratings) {
        const ratings = Object.values(response.ratings);
        totalSum += ratings.reduce((sum: number, rating: any) => sum + Number(rating), 0);
        totalCount += ratings.length;
      }
    });

    return totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: 'Brouillon',
      active: 'Active',
      closed: 'Clôturée',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Feedback 360°</h2>
        <button
          onClick={() => setShowCampaignModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nouvelle Campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune campagne de feedback</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.campaign_name}</h3>
                    {getStatusBadge(campaign.status)}
                    {campaign.anonymous && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Anonyme
                      </span>
                    )}
                  </div>

                  {campaign.employee && (
                    <p className="text-sm text-gray-600 mb-2">
                      Employé évalué: {campaign.employee.first_name} {campaign.employee.last_name}
                      {campaign.employee.position && ` - ${campaign.employee.position.name}`}
                    </p>
                  )}

                  <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Du {new Date(campaign.start_date).toLocaleDateString('fr-FR')}</span>
                    <span>au {new Date(campaign.end_date).toLocaleDateString('fr-FR')}</span>
                    <span className="font-medium text-blue-600">
                      {campaign.responses?.length || 0} réponse(s)
                    </span>
                    {campaign.responses && campaign.responses.length > 0 && (
                      <span className="font-medium text-yellow-600">
                        Note moyenne: {calculateAverageRating(campaign.responses)}/5
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        initializeRatings();
                        setShowResponseModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Send size={18} />
                      Donner mon feedback
                    </button>
                  )}

                  {campaign.responses && campaign.responses.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowResultsModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Voir les résultats"
                    >
                      <Eye size={18} />
                    </button>
                  )}

                  {campaign.status === 'active' && (profile?.role === 'drh' || profile?.role === 'admin') && (
                    <button
                      onClick={() => handleCloseCampaign(campaign.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Clôturer"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Nouvelle Campagne de Feedback 360°</h2>
              <button onClick={resetCampaignForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employé à évaluer
                </label>
                <select
                  value={campaignForm.employee_id}
                  onChange={(e) => setCampaignForm({ ...campaignForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la campagne
                </label>
                <input
                  type="text"
                  value={campaignForm.campaign_name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Feedback 360° Q1 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez l'objectif de cette campagne..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={campaignForm.start_date}
                    onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
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
                    value={campaignForm.end_date}
                    onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={campaignForm.anonymous}
                  onChange={(e) => setCampaignForm({ ...campaignForm, anonymous: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="anonymous" className="text-sm text-gray-700">
                  Feedbacks anonymes (recommandé)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetCampaignForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer la campagne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResponseModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Donner mon Feedback - {selectedCampaign.campaign_name}
              </h2>
              <button onClick={resetResponseForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitResponse} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre relation avec la personne évaluée
                </label>
                <select
                  value={responseForm.relationship}
                  onChange={(e) => setResponseForm({ ...responseForm, relationship: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="manager">Manager</option>
                  <option value="peer">Collègue</option>
                  <option value="direct_report">Collaborateur direct</option>
                  <option value="self">Auto-évaluation</option>
                </select>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Évaluations par catégorie</h3>
                <div className="space-y-4">
                  {feedbackCategories.map((category) => (
                    <div key={category.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{category.name}</span>
                        {renderStars(
                          responseForm.ratings[category.key] || 3,
                          (rating) => updateRating(category.key, rating)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points forts
                </label>
                <textarea
                  value={responseForm.strengths}
                  onChange={(e) => setResponseForm({ ...responseForm, strengths: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Quels sont les principaux points forts de cette personne ?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Axes de développement
                </label>
                <textarea
                  value={responseForm.areas_for_development}
                  onChange={(e) => setResponseForm({ ...responseForm, areas_for_development: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sur quels aspects cette personne pourrait-elle progresser ?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires additionnels
                </label>
                <textarea
                  value={responseForm.additional_comments}
                  onChange={(e) => setResponseForm({ ...responseForm, additional_comments: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Autres commentaires ou suggestions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetResponseForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send size={18} />
                  Soumettre mon feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResultsModal && selectedCampaign && selectedCampaign.responses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Résultats - {selectedCampaign.campaign_name}
              </h2>
              <button
                onClick={() => {
                  setShowResultsModal(false);
                  setSelectedCampaign(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">Note moyenne globale</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {calculateAverageRating(selectedCampaign.responses)}/5
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Basé sur {selectedCampaign.responses.length} réponse(s)
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Feedbacks reçus</h3>
                <div className="space-y-4">
                  {selectedCampaign.responses.map((response, idx) => (
                    <div key={response.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900">
                          Feedback #{idx + 1}
                          {!selectedCampaign.anonymous && response.respondent && (
                            <span className="text-sm text-gray-600 ml-2">
                              - {response.respondent.first_name} {response.respondent.last_name}
                            </span>
                          )}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {response.relationship === 'manager' ? 'Manager' :
                           response.relationship === 'peer' ? 'Collègue' :
                           response.relationship === 'direct_report' ? 'Collaborateur direct' : 'Auto-évaluation'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Points forts:</p>
                          <p className="text-sm text-gray-600">{response.strengths}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Axes de développement:</p>
                          <p className="text-sm text-gray-600">{response.areas_for_development}</p>
                        </div>

                        {response.additional_comments && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Commentaires:</p>
                            <p className="text-sm text-gray-600">{response.additional_comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setShowResultsModal(false);
                    setSelectedCampaign(null);
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
