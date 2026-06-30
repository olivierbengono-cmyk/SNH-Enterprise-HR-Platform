import { useState, useEffect } from 'react';
import { X, AlertCircle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logAudit } from '../../utils/auditLog';

interface EmployeeFormProps {
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: any;
}

export function EmployeeForm({ onClose, onSuccess, employeeToEdit }: EmployeeFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    employee_number: employeeToEdit?.employee_number || '',
    first_name: employeeToEdit?.first_name || '',
    last_name: employeeToEdit?.last_name || '',
    email: employeeToEdit?.email || '',
    phone: employeeToEdit?.phone || '',
    department_id: employeeToEdit?.department_id || '',
    position_id: employeeToEdit?.position_id || '',
    hire_date: employeeToEdit?.hire_date || new Date().toISOString().split('T')[0],
    contract_type: employeeToEdit?.contract_type || 'CDI',
    employment_status: employeeToEdit?.employment_status || 'active',
    date_of_birth: employeeToEdit?.date_of_birth || '',
    address: employeeToEdit?.address || '',
    nationality: employeeToEdit?.nationality || '',
    gender: employeeToEdit?.gender || '',
    city: employeeToEdit?.city || '',
    grade: employeeToEdit?.grade || '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [deptResponse, posResponse] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('positions').select('id, title, department_id').order('title')
      ]);

      if (deptResponse.data) setDepartments(deptResponse.data);
      if (posResponse.data) setPositions(posResponse.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const filteredPositions = formData.department_id
    ? positions.filter(p => p.department_id === formData.department_id)
    : positions;

  const generateEmployeeNumber = () => {
    const year = new Date(formData.hire_date).getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    return `SNH-${year}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.employee_number) {
      formData.employee_number = generateEmployeeNumber();
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      employee_number: formData.employee_number || generateEmployeeNumber(),
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || null,
      department_id: formData.department_id || null,
      position_id: formData.position_id || null,
      hire_date: formData.hire_date,
      contract_type: formData.contract_type,
      employment_status: formData.employment_status,
      date_of_birth: formData.date_of_birth || null,
      address: formData.address || null,
      nationality: formData.nationality || null,
      gender: formData.gender || null,
      city: formData.city || null,
      grade: formData.grade || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (employeeToEdit) {
        const { error: updateError } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', employeeToEdit.id);

        if (updateError) throw updateError;
        logAudit({
          user_email: profile?.email, user_role: profile?.role,
          action: 'UPDATE', resource_type: 'employee', resource_id: employeeToEdit.id,
          resource_label: `${payload.first_name} ${payload.last_name}`,
          details: `Matricule : ${payload.employee_number}`,
        });
      } else {
        const { error: insertError } = await supabase
          .from('employees')
          .insert(payload);

        if (insertError) throw insertError;
        logAudit({
          user_email: profile?.email, user_role: profile?.role,
          action: 'CREATE', resource_type: 'employee',
          resource_label: `${payload.first_name} ${payload.last_name}`,
          details: `Matricule : ${payload.employee_number} — Poste : ${payload.position_id ?? '—'}`,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {employeeToEdit ? 'Modifier l\'employé' : 'Nouvel employé'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">Remplissez les informations ci-dessous</p>
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

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+237..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-bold text-slate-900 mb-4">Informations professionnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Matricule
                </label>
                <input
                  type="text"
                  value={formData.employee_number}
                  onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                  placeholder="Auto-généré si vide"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Date d'embauche <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Département <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value, position_id: '' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Sélectionnez un département</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Poste <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.position_id}
                  onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                  disabled={!formData.department_id}
                >
                  <option value="">Sélectionnez un poste</option>
                  {filteredPositions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Type de contrat <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.contract_type}
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Stage">Stage</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employment_status}
                  onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                >
                  <option value="active">Actif</option>
                  <option value="on_leave">En congé</option>
                  <option value="suspended">Suspendu</option>
                  <option value="terminated">Terminé</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-bold text-slate-900 mb-4">Informations complémentaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Genre</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                >
                  <option value="">Non précisé</option>
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Nationalité</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Ex: Camerounaise"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Ville</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: Yaoundé"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Grade</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="Ex: Cadre A"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : employeeToEdit ? 'Mettre à jour' : 'Créer l\'employé'}
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
