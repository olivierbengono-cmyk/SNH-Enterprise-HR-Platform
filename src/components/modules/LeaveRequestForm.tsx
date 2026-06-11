import { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Upload, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LeaveRequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface LeaveType {
  id: string;
  name: string;
  days_per_year: number;
  color: string;
}

export function LeaveRequestForm({ onClose, onSuccess }: LeaveRequestFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadInitialData();
  }, [profile]);

  const loadInitialData = async () => {
    if (!profile) return;

    try {
      const [typesResponse, employeeResponse] = await Promise.all([
        supabase.from('leave_types').select('*').order('name'),
        supabase
          .from('employees')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle()
      ]);

      if (typesResponse.data) setLeaveTypes(typesResponse.data);
      if (employeeResponse.data) setEmployeeId(employeeResponse.data.id);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Erreur lors du chargement des données');
    }
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate < startDate) return 0;

    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const daysCount = calculateDays(formData.start_date, formData.end_date);

  const selectedLeaveType = leaveTypes.find(type => type.id === formData.leave_type_id);
  const isSickLeave = selectedLeaveType?.name.toLowerCase().includes('maladie');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Format de fichier non autorisé. Utilisez PDF, JPEG ou PNG.');
        return;
      }
      if (file.size > 5242880) {
        setError('Le fichier ne doit pas dépasser 5 Mo.');
        return;
      }
      setMedicalCertificate(file);
      setError('');
    }
  };

  const uploadMedicalCertificate = async (): Promise<{ url: string; name: string } | null> => {
    if (!medicalCertificate || !profile) return null;

    setUploadProgress(true);
    try {
      const fileExt = medicalCertificate.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-certificates')
        .upload(fileName, medicalCertificate);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('medical-certificates')
        .getPublicUrl(fileName);

      return {
        url: fileName,
        name: medicalCertificate.name
      };
    } catch (err: any) {
      console.error('Error uploading certificate:', err);
      throw new Error('Erreur lors du téléchargement du certificat médical');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!employeeId) {
      setError('Impossible de trouver votre profil employé');
      return;
    }

    if (!formData.leave_type_id || !formData.start_date || !formData.end_date) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (isSickLeave && !medicalCertificate) {
      setError('Un certificat médical est obligatoire pour les congés maladie');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    if (daysCount === 0) {
      setError('Aucun jour ouvrable sélectionné');
      return;
    }

    setLoading(true);

    try {
      let certificateData = null;
      if (isSickLeave && medicalCertificate) {
        certificateData = await uploadMedicalCertificate();
      }

      const { error: insertError } = await supabase.from('leave_requests').insert({
        employee_id: employeeId,
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_count: daysCount,
        reason: formData.reason || null,
        status: 'pending',
        medical_certificate_url: certificateData?.url || null,
        medical_certificate_name: certificateData?.name || null,
      });

      if (insertError) {
        // Clean up orphaned file if insert failed
        if (certificateData?.url) {
          await supabase.storage.from('medical-certificates').remove([certificateData.url]);
        }
        throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating leave request:', err);
      setError(err.message || 'Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Nouvelle demande de congé</h2>
            <p className="text-sm text-slate-600 mt-1">Remplissez le formulaire ci-dessous</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Type de congé <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.leave_type_id}
              onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
              required
            >
              <option value="">Sélectionnez un type</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.days_per_year} jours/an)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Date de début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Date de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          {formData.start_date && formData.end_date && daysCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="w-5 h-5" />
                <p className="font-medium">
                  Durée: {daysCount} jour{daysCount > 1 ? 's' : ''} ouvrable{daysCount > 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Du {new Date(formData.start_date).toLocaleDateString('fr-FR')} au{' '}
                {new Date(formData.end_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Motif (optionnel)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              placeholder="Précisez le motif de votre demande..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none resize-none"
            />
          </div>

          {isSickLeave && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Certificat médical <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="medical-certificate"
                  />
                  <label
                    htmlFor="medical-certificate"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Cliquez pour télécharger le certificat médical
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        PDF, JPEG ou PNG (max 5 Mo)
                      </p>
                    </div>
                  </label>
                </div>

                {medicalCertificate && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-900 truncate">
                        {medicalCertificate.name}
                      </p>
                      <p className="text-xs text-green-700">
                        {(medicalCertificate.size / 1024 / 1024).toFixed(2)} Mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMedicalCertificate(null)}
                      className="p-1 hover:bg-green-100 rounded transition"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Important :</strong> Le certificat médical est obligatoire pour les congés maladie.
                    Votre demande ne pourra être validée sans ce document.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading || !employeeId || uploadProgress || (isSickLeave && !medicalCertificate)}
              className="flex-1 px-6 py-3 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadProgress ? 'Téléchargement...' : loading ? 'Envoi en cours...' : 'Soumettre la demande'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
