import React, { useState, useEffect } from 'react';
import { Receipt, Plus, CheckCircle, XCircle, DollarSign, FileText, Upload, Trash2, TableProperties } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';

interface ExpenseReport {
  id: string;
  report_number: string;
  title: string;
  submission_date: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  rejection_reason?: string;
  items?: ExpenseItem[];
}

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  merchant: string;
  category?: { name: string };
  receipt_url?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  max_amount?: number;
}

export default function ExpenseManagement() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showBatchItems, setShowBatchItems] = useState(false);

  const [reportForm, setReportForm] = useState({
    title: '',
    period_start: '',
    period_end: ''
  });

  const [itemForm, setItemForm] = useState({
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    merchant: '',
    payment_method: 'personal_card'
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employee) return;

      const { data: reportsData } = await supabase
        .from('expense_reports')
        .select(`
          *,
          items:expense_items(
            *,
            category:expense_categories(name)
          )
        `)
        .eq('employee_id', employee.id)
        .order('submission_date', { ascending: false });

      setReports(reportsData || []);

      const { data: categoriesData } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReport = async () => {
    if (!user) return;

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employee) return;

      const reportNumber = `NDF-${Date.now()}`;

      const { error } = await supabase
        .from('expense_reports')
        .insert({
          employee_id: employee.id,
          report_number: reportNumber,
          title: reportForm.title,
          period_start: reportForm.period_start,
          period_end: reportForm.period_end,
          total_amount: 0,
          status: 'draft'
        });

      if (error) throw error;

      setShowNewReport(false);
      setReportForm({ title: '', period_start: '', period_end: '' });
      alert('Note de frais créée avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors de la création : ' + error.message);
    }
  };

  const addExpenseItem = async () => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from('expense_items')
        .insert({
          expense_report_id: selectedReport.id,
          category_id: itemForm.category_id,
          date: itemForm.date,
          description: itemForm.description,
          amount: parseFloat(itemForm.amount),
          merchant: itemForm.merchant,
          payment_method: itemForm.payment_method,
          is_reimbursable: true
        });

      if (error) throw error;

      const newTotal = selectedReport.total_amount + parseFloat(itemForm.amount);
      await supabase
        .from('expense_reports')
        .update({ total_amount: newTotal })
        .eq('id', selectedReport.id);

      setShowAddItem(false);
      setItemForm({
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        merchant: '',
        payment_method: 'personal_card'
      });
      alert('Dépense ajoutée avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors de l\'ajout : ' + error.message);
    }
  };

  const batchSaveExpenseItems = async (rows: Record<string, unknown>[]) => {
    if (!selectedReport) return { success: 0, errors: ['Aucun rapport sélectionné'] };
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const amount = parseFloat(String(row.amount || '0'));
      const payload = {
        expense_report_id: selectedReport.id,
        category_id: row.category_id ? String(row.category_id) : null,
        date: String(row.date || new Date().toISOString().split('T')[0]),
        description: String(row.description || ''),
        amount,
        merchant: row.merchant ? String(row.merchant) : null,
        payment_method: String(row.payment_method || 'personal_card'),
        is_reimbursable: true,
      };
      const { error } = await supabase.from('expense_items').insert(payload);
      if (error) errors.push(error.message);
      else success++;
    }
    if (success > 0) {
      const { data: items } = await supabase.from('expense_items').select('amount').eq('expense_report_id', selectedReport.id);
      const total = (items || []).reduce((s, i) => s + (i.amount || 0), 0);
      await supabase.from('expense_reports').update({ total_amount: total }).eq('id', selectedReport.id);
    }
    loadData();
    return { success, errors };
  };

  const submitReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('expense_reports')
        .update({ status: 'submitted', submission_date: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      alert('Note de frais soumise avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors de la soumission : ' + error.message);
    }
  };

  const deleteItem = async (itemId: string, amount: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette dépense ?')) return;

    try {
      const { error } = await supabase
        .from('expense_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      if (selectedReport) {
        const newTotal = selectedReport.total_amount - amount;
        await supabase
          .from('expense_reports')
          .update({ total_amount: newTotal })
          .eq('id', selectedReport.id);
      }

      alert('Dépense supprimée avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors de la suppression : ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Brouillon', icon: FileText },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Soumise', icon: CheckCircle },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approuvée', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejetée', icon: XCircle },
      paid: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Payée', icon: DollarSign }
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const getTotalPending = () => {
    return reports
      .filter(r => r.status === 'submitted')
      .reduce((sum, r) => sum + r.total_amount, 0);
  };

  const getTotalApproved = () => {
    return reports
      .filter(r => r.status === 'approved' || r.status === 'paid')
      .reduce((sum, r) => sum + r.total_amount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notes de Frais</h2>
          <p className="text-gray-600">Gestion des remboursements de frais professionnels</p>
        </div>
        <button
          onClick={() => setShowNewReport(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nouvelle note de frais
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-blue-900">{getTotalPending().toLocaleString()} FCFA</p>
            </div>
            <Receipt className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approuvées</p>
              <p className="text-2xl font-bold text-green-900">{getTotalApproved().toLocaleString()} FCFA</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total notes</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {showNewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle note de frais</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                <input
                  type="text"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Mission à Douala"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Début période</label>
                  <input
                    type="date"
                    value={reportForm.period_start}
                    onChange={(e) => setReportForm({ ...reportForm, period_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fin période</label>
                  <input
                    type="date"
                    value={reportForm.period_end}
                    onChange={(e) => setReportForm({ ...reportForm, period_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewReport(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createReport}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numéro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucune note de frais
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.report_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(report.period_start).toLocaleDateString('fr-FR')} - {new Date(report.period_end).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.total_amount.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Voir détails
                        </button>
                        {report.status === 'draft' && (
                          <button
                            onClick={() => submitReport(report.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Soumettre
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedReport.title}</h3>
                <p className="text-sm text-gray-600">{selectedReport.report_number}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {selectedReport.status === 'draft' && (
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setShowAddItem(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Ajouter une dépense
                </button>
                <button
                  onClick={() => setShowBatchItems(true)}
                  className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <TableProperties className="h-5 w-5" />
                  Saisie par lots
                </button>
              </div>
            )}

            {showAddItem && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Nouvelle dépense</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Sélectionner</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={itemForm.date}
                      onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ex: Taxi aéroport"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={itemForm.amount}
                      onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commerçant</label>
                    <input
                      type="text"
                      value={itemForm.merchant}
                      onChange={(e) => setItemForm({ ...itemForm, merchant: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ex: Hotel Hilton"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                    <select
                      value={itemForm.payment_method}
                      onChange={(e) => setItemForm({ ...itemForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="personal_card">Carte personnelle</option>
                      <option value="company_card">Carte entreprise</option>
                      <option value="cash">Espèces</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={addExpenseItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {selectedReport.items && selectedReport.items.length > 0 ? (
                selectedReport.items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{item.description}</span>
                        <span className="text-xs text-gray-500">{item.category?.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(item.date).toLocaleDateString('fr-FR')} • {item.merchant}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">{item.amount.toLocaleString()} FCFA</span>
                      {selectedReport.status === 'draft' && (
                        <button
                          onClick={() => deleteItem(item.id, item.amount)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Aucune dépense ajoutée</p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">{selectedReport.total_amount.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchItems && selectedReport && (
        <BatchEntryTable<Record<string, unknown>>
          title={`Dépenses — ${selectedReport.title}`}
          onClose={() => setShowBatchItems(false)}
          onSave={batchSaveExpenseItems}
          initialRows={5}
          emptyRow={() => ({ category_id: '', date: new Date().toISOString().split('T')[0], description: '', amount: '', merchant: '', payment_method: 'personal_card' })}
          columns={[
            { key: 'date', label: 'Date', type: 'date', required: true, width: '130px' },
            { key: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Transport, Repas…', width: '200px' },
            { key: 'category_id', label: 'Catégorie', type: 'select', width: '160px', options: categories.map(c => ({ value: c.id, label: c.name })) },
            { key: 'amount', label: 'Montant (FCFA)', type: 'number', required: true, placeholder: '0', width: '130px' },
            { key: 'merchant', label: 'Fournisseur', type: 'text', placeholder: 'Nom…', width: '160px' },
            { key: 'payment_method', label: 'Paiement', type: 'select', width: '130px', options: [{ value: 'personal_card', label: 'Carte perso' }, { value: 'company_card', label: 'Carte société' }, { value: 'cash', label: 'Espèces' }] },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}
