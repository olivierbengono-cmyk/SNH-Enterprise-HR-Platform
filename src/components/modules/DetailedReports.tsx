import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Users, DollarSign, TrendingUp, Filter, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReportData {
  id: string;
  name: string;
  type: string;
  date: string;
  data: any;
}

export function DetailedReports() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const reportTypes = [
    { id: 'workforce-structure', name: 'Structure des effectifs', icon: Users },
    { id: 'payroll-analysis', name: 'Analyse de la masse salariale', icon: DollarSign },
    { id: 'leave-summary', name: 'Synthèse des congés', icon: Calendar },
    { id: 'turnover-analysis', name: 'Analyse du turnover', icon: TrendingUp },
    { id: 'training-report', name: 'Bilan des formations', icon: FileText },
    { id: 'recruitment-stats', name: 'Statistiques de recrutement', icon: Users },
    { id: 'age-pyramid', name: 'Pyramide des âges', icon: TrendingUp },
    { id: 'seniority-distribution', name: 'Répartition par ancienneté', icon: Calendar },
    { id: 'salary-distribution', name: 'Distribution salariale', icon: DollarSign },
    { id: 'department-analysis', name: 'Analyse par département', icon: Users },
    { id: 'gender-equality', name: 'Équité hommes/femmes', icon: Users },
    { id: 'contract-types', name: 'Répartition des contrats', icon: FileText },
  ];

  const generateReport = async (reportType: string) => {
    setLoading(true);
    try {
      let reportData: any = {};

      switch (reportType) {
        case 'workforce-structure':
          const { data: employees } = await supabase
            .from('employees')
            .select('id, first_name, last_name, department_id, position_id, employment_status, hire_date, contract_type');

          reportData = {
            totalEmployees: employees?.length || 0,
            byDepartment: groupBy(employees || [], 'department_id'),
            byEmploymentStatus: groupBy(employees || [], 'employment_status'),
            byContractType: groupBy(employees || [], 'contract_type'),
          };
          break;

        case 'payroll-analysis':
          const startYear = parseInt(dateRange.start.split('-')[0]);
          const endYear = parseInt(dateRange.end.split('-')[0]);

          const { data: payrolls } = await supabase
            .from('payroll_calculations')
            .select('*')
            .gte('period_year', startYear)
            .lte('period_year', endYear);

          const totalGross = payrolls?.reduce((sum, p) => sum + (parseFloat(p.gross_salary) || 0), 0) || 0;
          const totalNet = payrolls?.reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0) || 0;
          const totalDeductions = payrolls?.reduce((sum, p) => sum + (parseFloat(p.total_deductions) || 0), 0) || 0;

          reportData = {
            period: `${dateRange.start} au ${dateRange.end}`,
            totalGross: formatCurrency(totalGross),
            totalNet: formatCurrency(totalNet),
            totalDeductions: formatCurrency(totalDeductions),
            avgGross: formatCurrency(totalGross / (payrolls?.length || 1)),
            avgNet: formatCurrency(totalNet / (payrolls?.length || 1)),
            count: payrolls?.length || 0,
          };
          break;

        case 'leave-summary':
          const { data: leaves } = await supabase
            .from('leave_requests')
            .select('*')
            .gte('start_date', dateRange.start)
            .lte('start_date', dateRange.end);

          reportData = {
            total: leaves?.length || 0,
            approved: leaves?.filter(l => l.status === 'approved').length || 0,
            pending: leaves?.filter(l => l.status === 'pending').length || 0,
            rejected: leaves?.filter(l => l.status === 'rejected').length || 0,
            byType: groupBy(leaves || [], 'leave_type'),
            totalDays: leaves?.reduce((sum, l) => sum + (l.days_requested || 0), 0) || 0,
          };
          break;

        case 'turnover-analysis':
          const { data: allEmployees } = await supabase
            .from('employees')
            .select('id, employment_status, hire_date');

          const activeCount = allEmployees?.filter(e => e.employment_status === 'active').length || 0;
          const terminatedCount = allEmployees?.filter(e => e.employment_status === 'terminated').length || 0;
          const hiredInPeriod = allEmployees?.filter(e =>
            e.hire_date &&
            e.hire_date >= dateRange.start &&
            e.hire_date <= dateRange.end
          ).length || 0;

          reportData = {
            activeEmployees: activeCount,
            departures: terminatedCount,
            hires: hiredInPeriod,
            netChange: hiredInPeriod - terminatedCount,
            turnoverRate: activeCount > 0 ? ((terminatedCount / (activeCount + terminatedCount)) * 100).toFixed(2) + '%' : '0%',
          };
          break;

        case 'training-report':
          const { data: trainings } = await supabase
            .from('training_programs')
            .select('*')
            .gte('start_date', dateRange.start)
            .lte('start_date', dateRange.end);

          reportData = {
            totalPrograms: trainings?.length || 0,
            byStatus: groupBy(trainings || [], 'status'),
            totalBudget: trainings?.reduce((sum, t) => sum + (t.budget || 0), 0) || 0,
            avgDuration: trainings?.reduce((sum, t) => sum + (t.duration_hours || 0), 0) / (trainings?.length || 1) || 0,
          };
          break;

        default:
          reportData = { message: 'Rapport en cours de développement' };
      }

      const newReport: ReportData = {
        id: Date.now().toString(),
        name: reportTypes.find(r => r.id === reportType)?.name || reportType,
        type: reportType,
        date: new Date().toISOString(),
        data: reportData,
      };

      setReports([newReport, ...reports]);
      setSelectedReport(newReport.id);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupBy = (array: any[], key: string) => {
    return array.reduce((result, item) => {
      const group = item[key] || 'Non défini';
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = (report: ReportData) => {
    const dataStr = JSON.stringify(report.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.type}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedReportData = reports.find(r => r.id === selectedReport);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rapports Détaillés</h2>
          <p className="text-slate-600 mt-1">Générez et exportez des rapports personnalisés</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2">
          <Calendar className="w-4 h-4 text-slate-600" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="text-sm outline-none"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="text-sm outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Types de rapports
          </h3>
          <div className="space-y-2">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => generateReport(type.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition text-left disabled:opacity-50"
                >
                  <Icon className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green mx-auto mb-4"></div>
              <p className="text-slate-600">Génération du rapport en cours...</p>
            </div>
          )}

          {!loading && reports.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun rapport généré</h3>
              <p className="text-slate-600">Sélectionnez un type de rapport pour commencer</p>
            </div>
          )}

          {!loading && reports.length > 0 && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="flex-1 outline-none text-sm font-medium text-slate-900"
                  >
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.name} - {new Date(report.date).toLocaleString('fr-FR')}
                      </option>
                    ))}
                  </select>
                  {selectedReportData && (
                    <button
                      onClick={() => exportReport(selectedReportData)}
                      className="flex items-center gap-2 px-4 py-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">Exporter</span>
                    </button>
                  )}
                </div>
              </div>

              {selectedReportData && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{selectedReportData.name}</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedReportData.data).map(([key, value]) => (
                      <div key={key} className="border-b border-slate-100 pb-3 last:border-0">
                        <p className="text-sm font-medium text-slate-600 mb-1">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <div className="text-slate-900">
                          {typeof value === 'object' ? (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {Object.entries(value as any).map(([k, v]) => (
                                <div key={k} className="bg-slate-50 p-2 rounded">
                                  <p className="text-xs text-slate-600">{k}</p>
                                  <p className="font-medium">{String(v)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="font-bold text-lg">{String(value)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
