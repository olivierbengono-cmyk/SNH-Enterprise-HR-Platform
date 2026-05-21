import { useState } from 'react';
import { X, AlertCircle, CheckCircle, FileX } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContractTerminationFormProps {
  employee: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractTerminationForm({ employee, onClose, onSuccess }: ContractTerminationFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    contract_end_date: '',
    termination_type: '',
    termination_reason: '',
    termination_notice_period: 0,
    last_working_day: '',
    termination_notes: '',
  });

  const terminationTypes = [
    { value: 'démission', label: 'Démission' },
    { value: 'licenciement', label: 'Licenciement' },
    { value: 'retraite', label: 'Retraite' },
    { value: 'fin_cdd', label: 'Fin de CDD' },
    { value: 'mutation', label: 'Mutation' },
    { value: 'décès', label: 'Décès' },
    { value: 'abandon_poste', label: 'Abandon de poste' },
    { value: 'rupture_conventionnelle', label: 'Rupture conventionnelle' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.contract_end_date || !formData.termination_type || !formData.termination_reason) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          contract_end_date: formData.contract_end_date,
          termination_type: formData.termination_type,
          termination_reason: formData.termination_reason,
          termination_notice_period: formData.termination_notice_period,
          last_working_day: formData.last_working_day || formData.contract_end_date,
          termination_notes: formData.termination_notes,
          employment_status: 'terminated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Fin de contrat enregistrée avec succès' });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error terminating contract:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileX className="w-7 h-7 text-red-600" />
              Mettre fin au contrat
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Employé : {employee.first_name} {employee.last_name} ({employee.employee_number})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Attention</p>
              <p className="mt-1">
                Cette action mettra fin au contrat de l'employé et changera son statut à "Terminé".
                Assurez-vous d'avoir toutes les informations nécessaires avant de valider.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Date de fin de contrat <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Dernier jour travaillé
                </label>
                <input
                  type="date"
                  value={formData.last_working_day}
                  onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Si vide, la date de fin de contrat sera utilisée
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Type de cessation <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.termination_type}
                onChange={(e) => setFormData({ ...formData, termination_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
                required
              >
                <option value="">Sélectionnez le type de cessation</option>
                {terminationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Période de préavis (en jours)
              </label>
              <input
                type="number"
                min="0"
                value={formData.termination_notice_period}
                onChange={(e) => setFormData({ ...formData, termination_notice_period: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Nombre de jours de préavis selon le contrat ou la convention collective
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Motif détaillé <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.termination_reason}
                onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none resize-none"
                placeholder="Décrivez le motif de la cessation du contrat..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Notes complémentaires
              </label>
              <textarea
                value={formData.termination_notes}
                onChange={(e) => setFormData({ ...formData, termination_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none resize-none"
                placeholder="Informations complémentaires, procédures suivies, documents remis, etc."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Confirmer la fin de contrat'}
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
