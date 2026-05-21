import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Clock, CheckCircle, TrendingUp, X, Calendar, MapPin, User, Building, TableProperties } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../lib/database.types';
import { TrainingProgramForm } from './TrainingProgramForm';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';

interface TrainingManagementProps {
  role: UserRole;
}

export function TrainingManagement({ role }: TrainingManagementProps) {
  const { profile } = useAuth();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  useEffect(() => {
    loadData();
    supabase.from('employees').select('id, first_name, last_name').eq('employment_status', 'active').order('first_name').then(({ data }) => setEmployeeOptions(data || []));
  }, [profile]);

  const loadData = async () => {
    try {
      if (role === 'employee') {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', profile?.id)
          .maybeSingle();

        if (employee) {
          const { data } = await supabase
            .from('training_enrollments')
            .select(`
              *,
              training_programs (*)
            `)
            .eq('employee_id', employee.id)
            .order('created_at', { ascending: false });

          setEnrollments(data || []);
        }
      } else {
        const { data } = await supabase
          .from('training_programs')
          .select('*')
          .order('created_at', { ascending: false });

        setTrainings(data || []);
      }
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const batchSaveEnrollments = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const payload = {
        employee_id: String(row.employee_id || ''),
        training_program_id: String(row.training_program_id || ''),
        enrollment_status: 'enrolled',
      };
      const { error } = await supabase.from('training_enrollments').insert(payload);
      if (error) errors.push(error.message);
      else success++;
    }
    loadData();
    return { success, errors };
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
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Formations</h1>
          <p className="text-slate-600 mt-1">
            {role === 'employee' ? 'Mes formations' : 'Vue d\'ensemble des formations'}
          </p>
        </div>
        {(role === 'drh' || role === 'admin') && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBatch(true)}
              className="flex items-center gap-2 bg-slate-700 text-white px-5 py-3 rounded-lg font-medium hover:bg-slate-600 transition"
            >
              <TableProperties className="w-5 h-5" />
              Inscriptions par lots
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition"
            >
              <Plus className="w-5 h-5" />
              Nouveau programme
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total</span>
            <GraduationCap className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {role === 'employee' ? enrollments.length : trainings.length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">En cours</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {role === 'employee'
              ? enrollments.filter(e => e.enrollment_status === 'enrolled').length
              : trainings.filter(t => t.status === 'ongoing').length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Complétées</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {role === 'employee'
              ? enrollments.filter(e => e.enrollment_status === 'completed').length
              : trainings.filter(t => t.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6">
          {role === 'employee' ? 'Mes inscriptions' : 'Programmes de formation'}
        </h2>

        <div className="space-y-4">
          {role === 'employee' ? (
            enrollments.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Aucune formation</p>
              </div>
            ) : (
              enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedEnrollment(enrollment)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">
                        {enrollment.training_programs?.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {enrollment.training_programs?.category}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      enrollment.enrollment_status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {enrollment.enrollment_status === 'completed' ? 'Complété' : 'En cours'}
                    </span>
                  </div>
                  {enrollment.training_programs?.duration_hours && (
                    <p className="text-sm text-slate-600">
                      Durée: {enrollment.training_programs.duration_hours}h
                    </p>
                  )}
                </div>
              ))
            )
          ) : (
            trainings.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Aucun programme</p>
              </div>
            ) : (
              trainings.map((training) => (
                <div
                  key={training.id}
                  className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedTraining(training)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">{training.title}</h3>
                      <p className="text-sm text-slate-600">{training.category}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      training.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : training.status === 'ongoing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {training.status === 'completed' ? 'Complété' : training.status === 'ongoing' ? 'En cours' : 'Planifié'}
                    </span>
                  </div>
                  {training.description && (
                    <p className="text-sm text-slate-600 mb-3">{training.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {training.duration_hours && <span>{training.duration_hours}h</span>}
                    {training.provider && <span>Par {training.provider}</span>}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedTraining.title}</h2>
                <p className="text-slate-600 mt-1">{selectedTraining.category}</p>
              </div>
              <button
                onClick={() => setSelectedTraining(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-3">Description</h3>
                <p className="text-slate-700">{selectedTraining.description || 'Aucune description'}</p>
              </div>

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Détails du programme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTraining.duration_hours && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Durée</p>
                        <p className="font-medium text-slate-900">{selectedTraining.duration_hours} heures</p>
                      </div>
                    </div>
                  )}
                  {selectedTraining.provider && (
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Prestataire</p>
                        <p className="font-medium text-slate-900">{selectedTraining.provider}</p>
                      </div>
                    </div>
                  )}
                  {selectedTraining.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Lieu</p>
                        <p className="font-medium text-slate-900">{selectedTraining.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedTraining.cost && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Coût</p>
                        <p className="font-medium text-slate-900">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'XAF',
                            minimumFractionDigits: 0,
                          }).format(selectedTraining.cost)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTraining.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : selectedTraining.status === 'ongoing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedTraining.status === 'completed' ? 'Complété' :
                     selectedTraining.status === 'ongoing' ? 'En cours' : 'Planifié'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTraining(null)}
                className="w-full px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedEnrollment.training_programs?.title}
                </h2>
                <p className="text-slate-600 mt-1">{selectedEnrollment.training_programs?.category}</p>
              </div>
              <button
                onClick={() => setSelectedEnrollment(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-3">Description</h3>
                <p className="text-slate-700">
                  {selectedEnrollment.training_programs?.description || 'Aucune description'}
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Détails de la formation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEnrollment.training_programs?.duration_hours && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Durée</p>
                        <p className="font-medium text-slate-900">
                          {selectedEnrollment.training_programs.duration_hours} heures
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedEnrollment.training_programs?.provider && (
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Prestataire</p>
                        <p className="font-medium text-slate-900">
                          {selectedEnrollment.training_programs.provider}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedEnrollment.training_programs?.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Lieu</p>
                        <p className="font-medium text-slate-900">
                          {selectedEnrollment.training_programs.location}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-600">Date d'inscription</p>
                      <p className="font-medium text-slate-900">
                        {new Date(selectedEnrollment.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedEnrollment.completion_date && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Formation complétée</p>
                      <p className="text-xs text-green-700 mt-1">
                        Le {new Date(selectedEnrollment.completion_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedEnrollment.enrollment_status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedEnrollment.enrollment_status === 'completed' ? 'Complété' : 'En cours'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedEnrollment(null)}
                className="w-full px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <TrainingProgramForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {showBatch && (
        <BatchEntryTable<Record<string, unknown>>
          title="Inscriptions aux formations"
          onClose={() => setShowBatch(false)}
          onSave={batchSaveEnrollments}
          initialRows={5}
          emptyRow={() => ({ employee_id: '', training_program_id: '' })}
          columns={[
            { key: 'employee_id', label: 'Agent', type: 'select', required: true, width: '220px', options: employeeOptions.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
            { key: 'training_program_id', label: 'Programme de formation', type: 'select', required: true, width: '280px', options: trainings.map(t => ({ value: t.id, label: t.title })) },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}
