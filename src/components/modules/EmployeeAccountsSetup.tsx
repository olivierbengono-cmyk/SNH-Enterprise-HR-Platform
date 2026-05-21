import { useState } from 'react';
import { Users, CheckCircle, AlertCircle, Mail, Key, Loader } from 'lucide-react';

export function EmployeeAccountsSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCreateAccounts = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-employee-accounts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la création des comptes');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('Error creating accounts:', err);
      setError(err.message || 'Erreur lors de la création des comptes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuration des comptes employés</h2>
        <p className="text-gray-600 mt-1">Créer des comptes d'accès pour tous les employés actifs</p>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Création automatique des comptes</h3>
          <p className="text-sm text-gray-600 mt-1">
            Cette opération va créer un compte pour chaque employé actif qui n'en a pas encore.
          </p>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Informations importantes :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email de connexion : l'email professionnel de l'employé</li>
                  <li>Mot de passe initial : le matricule de l'employé</li>
                  <li>L'employé devra changer son mot de passe lors de sa première connexion</li>
                  <li>Un email de confirmation sera envoyé automatiquement</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Créés avec succès</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{result.success}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Ignorés</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.skipped}</p>
                  <p className="text-xs text-gray-600 mt-1">Comptes existants</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">Erreurs</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{result.errors}</p>
                </div>
              </div>

              {result.details && result.details.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="font-medium text-gray-900">Détails de l'opération</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Matricule</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Statut</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.details.map((detail: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{detail.employee_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{detail.email || '-'}</td>
                            <td className="px-4 py-3">
                              {detail.status === 'success' && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Succès</span>
                              )}
                              {detail.status === 'skipped' && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">Ignoré</span>
                              )}
                              {detail.status === 'error' && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">Erreur</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{detail.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCreateAccounts}
            disabled={loading}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                Créer les comptes employés
              </>
            )}
          </button>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Note importante :</p>
                <p>
                  Les employés recevront leurs identifiants par email automatiquement.
                  Assurez-vous que les adresses email professionnelles sont correctement configurées dans les fiches employés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
