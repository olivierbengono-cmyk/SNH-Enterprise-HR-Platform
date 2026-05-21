import { X, TrendingUp, TrendingDown, Minus, Users, Calendar, Briefcase, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface KPIDetailModalProps {
  kpiType: 'total' | 'active' | 'cdi' | 'cdd' | 'turnover' | 'absences';
  title: string;
  value: number | string;
  onClose: () => void;
}

export function KPIDetailModal({ kpiType, title, value, onClose }: KPIDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDetails();
  }, [kpiType]);

  const loadDetails = async () => {
    try {
      setLoading(true);

      switch (kpiType) {
        case 'total':
          await loadTotalEmployeesDetail();
          break;
        case 'active':
          await loadActiveEmployeesDetail();
          break;
        case 'cdi':
          await loadContractTypeDetail('CDI');
          break;
        case 'cdd':
          await loadContractTypeDetail('CDD');
          break;
        case 'turnover':
          await loadTurnoverDetail();
          break;
        case 'absences':
          await loadAbsencesDetail();
          break;
      }
    } catch (error) {
      console.error('Error loading KPI details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTotalEmployeesDetail = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        employee_number,
        employment_status,
        hire_date,
        departments (name),
        positions (title)
      `)
      .order('hire_date', { ascending: false })
      .limit(50);

    if (!error && data) {
      setDetails(data);

      const byDepartment = data.reduce((acc: any, emp: any) => {
        const dept = emp.departments?.name || 'Non défini';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      setStats({ byDepartment });
    }
  };

  const loadActiveEmployeesDetail = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        employee_number,
        hire_date,
        departments (name),
        positions (title)
      `)
      .eq('employment_status', 'active')
      .order('hire_date', { ascending: false });

    if (!error && data) {
      setDetails(data);
    }
  };

  const loadContractTypeDetail = async (contractType: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        employee_number,
        hire_date,
        contract_end_date,
        departments (name),
        positions (title)
      `)
      .eq('contract_type', contractType)
      .eq('employment_status', 'active')
      .order('hire_date', { ascending: false });

    if (!error && data) {
      setDetails(data);
    }
  };

  const loadTurnoverDetail = async () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        employee_number,
        contract_end_date,
        termination_type,
        termination_reason,
        last_working_day
      `)
      .eq('employment_status', 'terminated')
      .gte('contract_end_date', startOfYear)
      .order('contract_end_date', { ascending: false });

    if (!error && data) {
      setDetails(data);

      const byType = data.reduce((acc: any, emp: any) => {
        const type = emp.termination_type || 'Non spécifié';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      setStats({ byType, year: currentYear });
    }
  };

  const loadAbsencesDetail = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        leave_type,
        status,
        employees (
          first_name,
          last_name,
          employee_number
        )
      `)
      .eq('status', 'approved')
      .order('start_date', { ascending: false })
      .limit(50);

    if (!error && data) {
      setDetails(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-snh-green" />
              {title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Valeur actuelle : <span className="font-bold text-snh-green">{value}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green"></div>
            </div>
          ) : (
            <>
              {stats && stats.byDepartment && (
                <div className="mb-6 bg-slate-50 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 mb-3">Répartition par département</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(stats.byDepartment).map(([dept, count]: [string, any]) => (
                      <div key={dept} className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600">{dept}</p>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats && stats.byType && (
                <div className="mb-6 bg-slate-50 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 mb-3">
                    Types de cessation ({stats.year})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(stats.byType).map(([type, count]: [string, any]) => (
                      <div key={type} className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 truncate" title={type}>{type}</p>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <h3 className="font-bold text-slate-900 mb-3">Détails</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Employé</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Matricule</th>
                      {kpiType !== 'absences' && (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Département</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Poste</th>
                        </>
                      )}
                      {kpiType === 'turnover' && (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Date de fin</th>
                        </>
                      )}
                      {kpiType === 'absences' && (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Période</th>
                        </>
                      )}
                      {kpiType !== 'turnover' && kpiType !== 'absences' && (
                        <th className="text-left py-3 px-4 font-medium text-slate-600 text-sm">Date d'embauche</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">
                            {item.first_name || item.employees?.first_name} {item.last_name || item.employees?.last_name}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-slate-900">
                            {item.employee_number || item.employees?.employee_number}
                          </span>
                        </td>
                        {kpiType !== 'absences' && (
                          <>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-900">{item.departments?.name || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-900">{item.positions?.title || 'N/A'}</span>
                            </td>
                          </>
                        )}
                        {kpiType === 'turnover' && (
                          <>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-900">{item.termination_type || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-900">
                                {item.contract_end_date ? new Date(item.contract_end_date).toLocaleDateString('fr-FR') : 'N/A'}
                              </span>
                            </td>
                          </>
                        )}
                        {kpiType === 'absences' && (
                          <>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-900">{item.leave_type}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-900">
                                {new Date(item.start_date).toLocaleDateString('fr-FR')} - {new Date(item.end_date).toLocaleDateString('fr-FR')}
                              </span>
                            </td>
                          </>
                        )}
                        {kpiType !== 'turnover' && kpiType !== 'absences' && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-900">
                              {new Date(item.hire_date).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {details.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Aucune donnée disponible</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
