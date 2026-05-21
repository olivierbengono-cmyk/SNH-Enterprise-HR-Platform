import React, { useState, useEffect } from 'react';
import { Plus, Star, Send, CheckCircle, CreditCard as Edit2, Eye, Trash2, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Review {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  review_year: number;
  review_type: 'annual' | 'mid_year' | 'probation' | 'project';
  status: 'draft' | 'submitted' | 'completed';
  overall_rating: number;
  strengths: string;
  areas_for_improvement: string;
  comments: string;
  review_date: string | null;
  employee?: any;
  reviewer?: any;
}


export default function PerformanceReviews() {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    review_period: 'Q1',
    review_year: new Date().getFullYear(),
    review_type: 'annual' as 'annual' | 'mid_year' | 'probation' | 'project',
    overall_rating: 3,
    strengths: '',
    areas_for_improvement: '',
    comments: '',
    review_date: '',
  });

  useEffect(() => {
    loadReviews();
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

  const loadReviews = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('performance_reviews')
      .select(`
        *,
        employee:employees!performance_reviews_employee_id_fkey(first_name, last_name, position:positions(name)),
        reviewer:employees!performance_reviews_reviewer_id_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reviews:', error);
    } else {
      setReviews(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmployee) {
      alert('Employé non trouvé');
      return;
    }

    const reviewPayload = {
      employee_id: formData.employee_id,
      review_period: formData.review_period,
      review_year: formData.review_year,
      review_type: formData.review_type,
      overall_rating: formData.overall_rating,
      strengths: formData.strengths,
      areas_for_improvement: formData.areas_for_improvement,
      comments: formData.comments,
      review_date: formData.review_date || null,
      reviewer_id: currentEmployee.id,
    };

    if (selectedReview) {
      const { error } = await supabase
        .from('performance_reviews')
        .update(reviewPayload)
        .eq('id', selectedReview.id);

      if (error) {
        alert('Erreur lors de la mise à jour de l\'évaluation');
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('performance_reviews')
        .insert({ ...reviewPayload, status: 'submitted' });

      if (error) {
        alert('Erreur lors de la création de l\'évaluation');
        console.error(error);
        return;
      }
    }

    resetForm();
    loadReviews();
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      review_period: 'Q1',
      review_year: new Date().getFullYear(),
      review_type: 'annual',
      overall_rating: 3,
      strengths: '',
      areas_for_improvement: '',
      comments: '',
      review_date: '',
    });
    setSelectedReview(null);
    setShowModal(false);
    setViewMode(false);
  };

  const handleView = (review: Review) => {
    setSelectedReview(review);
    setViewMode(true);
    setShowModal(true);
  };

  const handleEdit = (review: Review) => {
    setSelectedReview(review);
    setFormData({
      employee_id: review.employee_id,
      review_period: review.review_period,
      review_year: review.review_year,
      review_type: review.review_type,
      overall_rating: review.overall_rating || 3,
      strengths: review.strengths || '',
      areas_for_improvement: review.areas_for_improvement || '',
      comments: review.comments || '',
      review_date: review.review_date || '',
    });
    setViewMode(false);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette évaluation ?')) return;

    const { error } = await supabase
      .from('performance_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
    } else {
      loadReviews();
    }
  };

  const handleValidate = async (id: string) => {
    const { error } = await supabase
      .from('performance_reviews')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la validation');
    } else {
      loadReviews();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    };

    const labels = {
      draft: 'Brouillon',
      submitted: 'Soumise',
      completed: 'Terminée',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
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
            <Star
              size={20}
              className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Évaluations de Performance</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nouvelle Évaluation
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Star size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune évaluation</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {review.employee?.first_name} {review.employee?.last_name}
                    </h3>
                    {getStatusBadge(review.status)}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {review.review_period} {review.review_year}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {review.review_type === 'annual' ? 'Annuelle' :
                       review.review_type === 'mid_year' ? 'Mi-année' :
                       review.review_type === 'probation' ? "Période d'essai" : 'Projet'}
                    </span>
                  </div>

                  {review.employee?.position && (
                    <p className="text-sm text-gray-600 mb-2">{review.employee.position.name}</p>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Note globale:</span>
                      {renderStars(review.overall_rating || 0)}
                      <span className="text-sm font-medium text-gray-900">
                        {review.overall_rating}/5
                      </span>
                    </div>

                    {review.reviewer && (
                      <div className="text-sm text-gray-600">
                        Évaluateur: {review.reviewer.first_name} {review.reviewer.last_name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(review)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Voir"
                  >
                    <Eye size={18} />
                  </button>
                  {review.status !== 'completed' && (
                    <>
                      <button
                        onClick={() => handleEdit(review)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>
                      {(profile?.role === 'drh' || profile?.role === 'admin') && review.status === 'submitted' && (
                        <button
                          onClick={() => handleValidate(review.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Valider"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(review.id)}
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
                {viewMode ? 'Détails de l\'Évaluation' : selectedReview ? 'Modifier l\'Évaluation' : 'Nouvelle Évaluation'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {viewMode ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
                    <p className="text-gray-900">
                      {selectedReview?.employee?.first_name} {selectedReview?.employee?.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
                    <p className="text-gray-900">
                      {selectedReview?.review_period} {selectedReview?.review_year}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note globale</label>
                  {renderStars(selectedReview?.overall_rating || 0)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points forts</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReview?.strengths}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Axes d'amélioration</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReview?.areas_for_improvement}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReview?.comments}</p>
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
                      Employé
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
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
                      Type d'évaluation
                    </label>
                    <select
                      value={formData.review_type}
                      onChange={(e) => setFormData({ ...formData, review_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="annual">Annuelle</option>
                      <option value="mid_year">Mi-année</option>
                      <option value="probation">Période d'essai</option>
                      <option value="project">Projet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Période
                    </label>
                    <select
                      value={formData.review_period}
                      onChange={(e) => setFormData({ ...formData, review_period: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                      <option value="annual">Annuel</option>
                      <option value="probation">Période d'essai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Année
                    </label>
                    <input
                      type="number"
                      value={formData.review_year}
                      onChange={(e) => setFormData({ ...formData, review_year: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note globale
                  </label>
                  {renderStars(formData.overall_rating, (rating) =>
                    setFormData({ ...formData, overall_rating: rating })
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points forts
                  </label>
                  <textarea
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez les points forts de l'employé..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Axes d'amélioration
                  </label>
                  <textarea
                    value={formData.areas_for_improvement}
                    onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Quels sont les axes d'amélioration..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaires généraux
                  </label>
                  <textarea
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Commentaires additionnels..."
                  />
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Send size={18} />
                    {selectedReview ? 'Mettre à jour' : 'Soumettre l\'évaluation'}
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
