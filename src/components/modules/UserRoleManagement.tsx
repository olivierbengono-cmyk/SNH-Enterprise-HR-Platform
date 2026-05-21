import { useState, useEffect } from 'react';
import { Shield, CreditCard as Edit2, Save, X, Search, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserRole, UserProfile } from '../../lib/database.types';

export function UserRoleManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const roles: { value: UserRole; label: string; description: string; color: string }[] = [
    { value: 'employee', label: 'Employé', description: 'Accès basique aux informations personnelles', color: 'bg-slate-100 text-slate-800' },
    { value: 'manager', label: 'Manager', description: 'Gestion des congés et évaluations de son équipe', color: 'bg-blue-100 text-blue-800' },
    { value: 'drh', label: 'DRH', description: 'Accès complet à la gestion RH', color: 'bg-snh-green/20 text-snh-green-dark' },
    { value: 'director', label: 'Directeur', description: 'Vue stratégique et validation finale', color: 'bg-slate-200 text-slate-800' },
    { value: 'admin', label: 'Administrateur', description: 'Accès système complet', color: 'bg-snh-red/20 text-snh-red-dark' },
    { value: 'payroll_manager', label: 'Gestionnaire Paie', description: 'Génération et gestion de la paie', color: 'bg-amber-100 text-amber-800' },
    { value: 'recruitment_manager', label: 'Gestionnaire Recrutement', description: 'Pilotage du recrutement', color: 'bg-teal-100 text-teal-800' },
    { value: 'career_manager', label: 'Gestionnaire Carrières', description: 'Formations, évaluations, disciplinaire', color: 'bg-sky-100 text-sky-800' },
    { value: 'qvct_manager', label: 'Gestionnaire QVCT', description: 'Qualité de vie et conditions de travail', color: 'bg-pink-100 text-pink-800' },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors du chargement des utilisateurs' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user: UserProfile) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setSelectedRole(null);
  };

  const handleSaveRole = async (userId: string) => {
    if (!selectedRole) return;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: selectedRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: selectedRole } : u));
      setMessage({ type: 'success', text: 'Rôle mis à jour avec succès' });
      setEditingUserId(null);
      setSelectedRole(null);
    } catch (error: any) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour du rôle' });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roleInfo = roles.find(r => r.value === role);
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleInfo?.color}`}>
        {roleInfo?.label}
      </span>
    );
  };

  const filteredUsers = users.filter(user =>
    (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-slate-900">Gestion des Rôles Utilisateurs</h2>
          <p className="text-slate-600 mt-1">Définir les permissions et accès de chaque utilisateur</p>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium">{users.length} utilisateurs</span>
        </div>
      </div>

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

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email ou matricule..."
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="border border-slate-200 rounded-lg p-4 hover:border-snh-green/50 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-snh-green to-snh-green-dark rounded-full flex items-center justify-center text-white font-medium">
                    {(user.first_name?.[0] || '').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900">
                        {user.first_name} {user.last_name}
                      </h3>
                      {editingUserId !== user.id && getRoleBadge(user.role)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{user.email}</span>
                      {user.employee_id && (
                        <span className="text-slate-400">• {user.employee_id}</span>
                      )}
                    </div>
                  </div>
                </div>

                {editingUserId === user.id ? (
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedRole || user.role}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none transition"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSaveRole(user.id)}
                      disabled={updating}
                      className="p-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition disabled:opacity-50"
                      title="Enregistrer"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updating}
                      className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition disabled:opacity-50"
                      title="Annuler"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditRole(user)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Modifier le rôle</span>
                  </button>
                )}
              </div>

              {editingUserId === user.id && selectedRole && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-5 h-5 text-snh-green flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-slate-900 mb-1">
                        Rôle : {roles.find(r => r.value === selectedRole)?.label}
                      </p>
                      <p className="text-slate-600">
                        {roles.find(r => r.value === selectedRole)?.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-snh-green" />
          Description des Rôles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.value} className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${role.color}`}>
                  {role.label}
                </span>
              </div>
              <p className="text-sm text-slate-600">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
