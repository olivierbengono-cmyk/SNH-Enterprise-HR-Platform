import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, DollarSign, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../lib/database.types';
import { downloadPayslipPDF } from '../../utils/payslipPDF';

interface PayslipManagementProps {
  role: UserRole;
}

interface Payslip {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  net_salary: number;
  allowances: Record<string, number> | null;
  deductions: Record<string, number> | null;
  status: string;
  document_url: string | null;
  generated_at: string | null;
  created_at: string;
  employees?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export function PayslipManagement({ role }: PayslipManagementProps) {
  const { profile } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadPayslips();
  }, [profile, role, filterYear]);

  const loadPayslips = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('payslips')
        .select(`
          *,
          employees (first_name, last_name, employee_number)
        `)
        .eq('period_year', filterYear)
        .order('period_month', { ascending: false });

      if (role === 'employee') {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (employee) {
          query = query.eq('employee_id', employee.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayslips(data || []);
    } catch (error) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPeriod = (month: number, year: number) => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return `${monthNames[month - 1]} ${year}`;
  };

  const handleDownloadPayslip = (payslip: Payslip) => {
    handleDownloadPayslipPDF(payslip);
  };

  const getTotalDeductions = (payslip: Payslip) => {
    if (!payslip.deductions) return 0;
    return Object.values(payslip.deductions).reduce((sum, val) => sum + val, 0);
  };

  const getTotalAllowances = (payslip: Payslip) => {
    if (!payslip.allowances) return 0;
    return Object.values(payslip.allowances).reduce((sum, val) => sum + val, 0);
  };

  const stats = {
    total: payslips.length,
    totalGross: payslips.reduce((sum, p) => sum + p.base_salary + getTotalAllowances(p), 0),
    totalNet: payslips.reduce((sum, p) => sum + p.net_salary, 0),
    totalDeductions: payslips.reduce((sum, p) => sum + getTotalDeductions(p), 0),
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
          <h1 className="text-3xl font-bold text-slate-900">Bulletins de Paie</h1>
          <p className="text-slate-600 mt-1">
            {role === 'employee' ? 'Mes bulletins de paie' : 'Vue d\'ensemble des bulletins'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-snh-green focus:border-transparent outline-none"
          >
            {[2026, 2025, 2024, 2023].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Bulletins</span>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total brut</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalGross)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total net</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalNet)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Déductions totales</span>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalDeductions)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Historique des paiements</h2>

        {payslips.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Aucun bulletin trouvé</p>
            <p className="text-sm text-slate-500 mt-1">Aucun bulletin pour {filterYear}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payslips.map((payslip) => (
              <div
                key={payslip.id}
                className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedPayslip(payslip)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <FileText className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {formatPeriod(payslip.period_month, payslip.period_year)}
                      </p>
                      {role !== 'employee' && payslip.employees && (
                        <p className="text-sm text-slate-600">
                          {payslip.employees.first_name} {payslip.employees.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Salaire de base:</span>
                    <span className="font-medium text-slate-900">{formatCurrency(payslip.base_salary)}</span>
                  </div>
                  {getTotalAllowances(payslip) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Indemnités:</span>
                      <span className="font-medium text-green-600">+{formatCurrency(getTotalAllowances(payslip))}</span>
                    </div>
                  )}
                  {getTotalDeductions(payslip) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Déductions:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(getTotalDeductions(payslip))}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between">
                    <span className="font-medium text-slate-900">Net à payer:</span>
                    <span className="font-bold text-slate-900 text-lg">{formatCurrency(payslip.net_salary)}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPayslip(payslip);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Bulletin de Paie - {formatPeriod(selectedPayslip.period_month, selectedPayslip.period_year)}
                </h2>
                {role !== 'employee' && selectedPayslip.employees && (
                  <p className="text-slate-600 mt-1">
                    {selectedPayslip.employees.first_name} {selectedPayslip.employees.last_name} - {selectedPayslip.employees.employee_number}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Période de paie</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <p className="font-medium text-slate-900">
                    {formatPeriod(selectedPayslip.period_month, selectedPayslip.period_year)}
                  </p>
                </div>
                {selectedPayslip.generated_at && (
                  <p className="text-sm text-slate-600 mt-2">
                    Généré le {new Date(selectedPayslip.generated_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Détails de rémunération</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <span className="text-slate-700">Salaire de base</span>
                    <span className="font-bold text-slate-900">{formatCurrency(selectedPayslip.base_salary)}</span>
                  </div>

                  {selectedPayslip.allowances && Object.keys(selectedPayslip.allowances).length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <h4 className="font-medium text-slate-700 mb-3">Indemnités</h4>
                      <div className="space-y-2 pl-4">
                        {Object.entries(selectedPayslip.allowances).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-1">
                            <span className="text-slate-600">{key}</span>
                            <span className="font-medium text-green-600">+{formatCurrency(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPayslip.deductions && Object.keys(selectedPayslip.deductions).length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <h4 className="font-medium text-slate-700 mb-3">Déductions</h4>
                      <div className="space-y-2 pl-4">
                        {Object.entries(selectedPayslip.deductions).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-1">
                            <span className="text-slate-600">{key}</span>
                            <span className="font-medium text-red-600">-{formatCurrency(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t-2 border-slate-300 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-slate-900">Net à payer</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(selectedPayslip.net_salary)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPayslip.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : selectedPayslip.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedPayslip.status === 'paid' ? 'Payé' :
                     selectedPayslip.status === 'pending' ? 'En attente' :
                     selectedPayslip.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPayslip(selectedPayslip)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium"
                >
                  <Download className="w-5 h-5" />
                  Télécharger PDF
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
