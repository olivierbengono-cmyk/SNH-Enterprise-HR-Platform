import { useState, useEffect } from 'react';
import { Search, Trash2, AlertCircle, CheckCircle, User, Mail, Calendar, Shield, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function ActiveAccountsManagement() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors du chargement des comptes' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (account: any) => {
    try {
      setDeleting(account.id);
      setMessage(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session introuvable');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-roles`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete', userId: account.id }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression');
      }

      setMessage({
        type: 'success',
        text: `Le compte de ${account.first_name} ${account.last_name} a été supprimé avec succès`,
      });

      setConfirmDelete(null);
      loadAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la suppression du compte',
      });
    } finally {
      setDeleting(null);
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      admin: { label: 'Administrateur', color: 'bg-rose-100 text-rose-800' },
      drh: { label: 'DRH', color: 'bg-blue-100 text-blue-800' },
      director: { label: 'Directeur', color: 'bg-slate-200 text-slate-800' },
      manager: { label: 'Manager', color: 'bg-green-100 text-green-800' },
      employee: { label: 'Employé', color: 'bg-slate-100 text-slate-800' },
      payroll_manager: { label: 'Gestionnaire Paie', color: 'bg-amber-100 text-amber-800' },
      recruitment_manager: { label: 'Recrutement', color: 'bg-teal-100 text-teal-800' },
      career_manager: { label: 'Carrière', color: 'bg-sky-100 text-sky-800' },
      qvct_manager: { label: 'QVCT', color: 'bg-pink-100 text-pink-800' },
    };

    return roles[role] || { label: role || 'Inconnu', color: 'bg-slate-100 text-slate-800' };
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
          <h1 className="text-3xl font-bold text-slate-900">Comptes d'accès actifs</h1>
          <p className="text-slate-600 mt-1">{accounts.length} comptes enregistrés</p>
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">Attention</p>
          <p className="mt-1">
            La suppression d'un compte est une action irréversible. L'utilisateur perdra l'accès à la plateforme
            et devra créer un nouveau compte s'il souhaite se reconnecter.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email, rôle..."
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Utilisateur</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Email</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Rôle</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Date de création</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Dernière mise à jour</th>
                <th className="text-right py-4 px-4 font-medium text-slate-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => {
                const roleInfo = getRoleBadge(account.role);
                return (
                  <tr
                    key={account.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-snh-green to-snh-green-dark rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {account.first_name?.[0]}{account.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {account.first_name} {account.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{account.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">
                          {new Date(account.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-900">
                        {account.updated_at
                          ? new Date(account.updated_at).toLocaleDateString('fr-FR')
                          : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setConfirmDelete(account)}
                        disabled={deleting === account.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Supprimer le compte"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredAccounts.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Aucun compte trouvé</p>
              <p className="text-sm text-slate-500 mt-1">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Total</span>
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{accounts.length}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Administrateurs</span>
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {accounts.filter(a => a.role === 'admin' || a.role === 'drh').length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Managers</span>
            <User className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {accounts.filter(a => a.role === 'manager').length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Employés</span>
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {accounts.filter(a => a.role === 'employee').length}
          </p>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmer la suppression</h3>
                <p className="text-sm text-slate-600">Cette action est irréversible</p>
              </div>
            </div>

            <p className="text-slate-700 mb-6">
              Êtes-vous sûr de vouloir supprimer le compte de{' '}
              <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ?
              <br />
              <br />
              L'utilisateur perdra immédiatement l'accès à la plateforme.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteAccount(confirmDelete)}
                disabled={deleting !== null}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting !== null}
                className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
