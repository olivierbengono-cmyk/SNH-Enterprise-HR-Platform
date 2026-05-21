import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Globe, CreditCard as Edit2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function MyProfile() {
  const { profile } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    nationality: '',
  });

  // All roles can edit their own basic contact info
  const canEdit = true;

  useEffect(() => {
    loadEmployeeData();
  }, [profile]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select(`*, departments(name), positions(title)`)
        .eq('user_id', profile?.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setEmployee(data);
        setFormData({
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          nationality: data.nationality || '',
        });
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des informations' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      phone: employee?.phone || '',
      address: employee?.address || '',
      city: employee?.city || '',
      nationality: employee?.nationality || '',
    });
    setMessage(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const { error } = await supabase
        .from('employees')
        .update({
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          nationality: formData.nationality || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Informations mises à jour avec succès' });
      setIsEditing(false);
      await loadEmployeeData();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune fiche employé associée</h2>
        <p className="text-slate-600">Votre compte utilisateur n'est pas encore lié à une fiche employé.</p>
        <p className="text-sm text-slate-500 mt-2">Veuillez contacter le service RH.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Informations</h1>
          <p className="text-slate-600 mt-1">Consultez et gérez vos informations personnelles</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => { setIsEditing(true); setMessage(null); }}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition bg-snh-green text-white hover:bg-snh-green-dark"
          >
            <Edit2 className="w-5 h-5" />
            Modifier
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleCancel} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50">
              <X className="w-5 h-5" />Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium disabled:opacity-50">
              <Save className="w-5 h-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {message.type === 'success'
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</p>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center gap-4">
            {employee.photo_url ? (
              <img src={employee.photo_url} alt={`${employee.first_name} ${employee.last_name}`}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-snh-green to-snh-green-dark rounded-full flex items-center justify-center text-white font-bold text-3xl">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{employee.first_name} {employee.last_name}</h2>
              <p className="text-slate-600">{employee.positions?.title || 'Poste non défini'}</p>
              <p className="text-sm text-slate-500 mt-1">
                Matricule: <span className="font-mono font-medium">{employee.employee_number}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Professional info (read-only) */}
          <div>
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-snh-green" />
              Informations Professionnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
              <InfoRow label="Département" value={employee.departments?.name || 'Non défini'} />
              <InfoRow label="Poste" value={employee.positions?.title || 'Non défini'} />
              <InfoRow label="Type de contrat" value={employee.contract_type || '—'} />
              <div>
                <p className="text-xs text-slate-500 mb-1">Statut</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  employee.employment_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {employee.employment_status === 'active' ? 'Actif' : employee.employment_status}
                </span>
              </div>
              {employee.hire_date && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date d'embauche</p>
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(employee.hire_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {employee.grade && <InfoRow label="Grade" value={employee.grade} />}
              {employee.current_salary && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Salaire actuel</p>
                  <p className="font-medium text-slate-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(employee.current_salary)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Personal info (editable) */}
          <div>
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-snh-green" />
              Informations Personnelles
            </h3>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />{employee.email}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Téléphone</p>
                {isEditing ? (
                  <input type="tel" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+237 6 XX XX XX XX"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none" />
                ) : (
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />{employee.phone || 'Non renseigné'}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Adresse</p>
                {isEditing ? (
                  <textarea value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Adresse complète"
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none" />
                ) : (
                  <p className="font-medium text-slate-900 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <span>{employee.address || 'Non renseignée'}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">Ville</p>
                  {isEditing ? (
                    <input type="text" value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Ex: Yaoundé"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none" />
                  ) : (
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />{employee.city || 'Non renseignée'}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">Nationalité</p>
                  {isEditing ? (
                    <input type="text" value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Ex: Camerounaise"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none" />
                  ) : (
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />{employee.nationality || 'Non renseignée'}
                    </p>
                  )}
                </div>
              </div>

              {employee.date_of_birth && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1">Date de naissance</p>
                  <p className="font-medium text-slate-900">
                    {new Date(employee.date_of_birth).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}
