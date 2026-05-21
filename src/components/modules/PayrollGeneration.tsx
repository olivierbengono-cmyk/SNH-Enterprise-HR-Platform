import { useEffect, useMemo, useState } from 'react';
import { Play, RefreshCw, CheckCircle2, AlertCircle, Calculator, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  current_salary: number | null;
  hire_date: string | null;
  employment_status: string;
}

interface SocialContribution {
  code: string;
  name: string;
  contribution_type: string;
  employee_rate: number;
  employer_rate: number;
  ceiling_amount: number | null;
}

interface TaxBracket {
  code: string;
  name: string;
  parameter_type: string;
  min_amount: number | null;
  max_amount: number | null;
  rate: number | null;
  fixed_amount: number | null;
}

interface ComputedPayslip {
  employee: EmployeeRow;
  base_salary: number;
  seniority_bonus: number;
  gross_taxable: number;
  cnps_employee: number;
  cnps_employer_total: number;
  taxable_base: number;
  abatement: number;
  irpp: number;
  total_deductions: number;
  net_salary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  existing_payslip_id?: string;
}

const monthNames = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);

function yearsOfSeniority(hireDate: string | null, ref: Date): number {
  if (!hireDate) return 0;
  const start = new Date(hireDate);
  if (Number.isNaN(start.getTime())) return 0;
  let years = ref.getFullYear() - start.getFullYear();
  const hasReached =
    ref.getMonth() > start.getMonth() ||
    (ref.getMonth() === start.getMonth() && ref.getDate() >= start.getDate());
  if (!hasReached) years -= 1;
  return Math.max(0, years);
}

function seniorityBonusRate(years: number): number {
  if (years < 2) return 0;
  if (years < 5) return 0.04;
  if (years < 10) return 0.06;
  if (years < 15) return 0.08;
  if (years < 20) return 0.1;
  if (years < 25) return 0.15;
  return 0.2;
}

function applyProgressiveBrackets(base: number, brackets: TaxBracket[]): number {
  if (base <= 0) return 0;
  const sorted = [...brackets]
    .filter((b) => b.parameter_type === 'irpp_bracket')
    .sort((a, b) => (a.min_amount ?? 0) - (b.min_amount ?? 0));
  let tax = 0;
  for (const bracket of sorted) {
    const min = bracket.min_amount ?? 0;
    const max = bracket.max_amount ?? Number.POSITIVE_INFINITY;
    const rate = bracket.rate ?? 0;
    if (base <= min) break;
    const slice = Math.min(base, max) - min;
    if (slice > 0) tax += slice * rate;
    if (base <= max) break;
  }
  return Math.max(0, tax);
}

export default function PayrollGeneration() {
  const today = new Date();
  const [periodYear, setPeriodYear] = useState(today.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(today.getMonth() + 1);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [contributions, setContributions] = useState<SocialContribution[]>([]);
  const [taxParams, setTaxParams] = useState<TaxBracket[]>([]);
  const [existingPayslips, setExistingPayslips] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; errors: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadExistingPayslips();
  }, [periodMonth, periodYear]);

  const loadReferenceData = async () => {
    setLoading(true);
    try {
      const [employeesRes, contributionsRes, taxRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, employee_number, first_name, last_name, current_salary, hire_date, employment_status')
          .eq('employment_status', 'active')
          .order('last_name'),
        supabase.from('social_contributions').select('*').eq('is_active', true),
        supabase.from('tax_parameters').select('*').eq('is_active', true),
      ]);
      const eligible = (employeesRes.data || []) as EmployeeRow[];
      setEmployees(eligible);
      setSelectedIds(new Set(eligible.map((e) => e.id)));
      setContributions((contributionsRes.data || []) as SocialContribution[]);
      setTaxParams((taxRes.data || []) as TaxBracket[]);
    } catch (err) {
      console.error('Error loading payroll references:', err);
      setFeedback({ type: 'error', message: 'Erreur lors du chargement des donnees de paie' });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPayslips = async () => {
    const { data } = await supabase
      .from('payslips')
      .select('id, employee_id')
      .eq('period_month', periodMonth)
      .eq('period_year', periodYear);
    const map: Record<string, string> = {};
    (data || []).forEach((p: any) => {
      map[p.employee_id] = p.id;
    });
    setExistingPayslips(map);
  };

  const computePayslip = (employee: EmployeeRow): ComputedPayslip => {
    const periodRef = new Date(periodYear, periodMonth - 1, 28);
    const base = Number(employee.current_salary || 0);
    const years = yearsOfSeniority(employee.hire_date, periodRef);
    const seniorityRate = seniorityBonusRate(years);
    const seniorityBonus = Math.round(base * seniorityRate);
    const grossTaxable = base + seniorityBonus;

    const cnpsPension = contributions.find((c) => c.contribution_type === 'cnps_pension');
    const cnpsFamily = contributions.find((c) => c.contribution_type === 'cnps_family');
    const cnpsAccident = contributions.find((c) => c.contribution_type === 'cnps_accident');

    const pensionBase = Math.min(grossTaxable, Number(cnpsPension?.ceiling_amount ?? grossTaxable));
    const familyBase = Math.min(grossTaxable, Number(cnpsFamily?.ceiling_amount ?? grossTaxable));
    const accidentBase = Math.min(grossTaxable, Number(cnpsAccident?.ceiling_amount ?? grossTaxable));

    const cnpsEmp = Math.round(pensionBase * Number(cnpsPension?.employee_rate ?? 0));
    const cnpsEmployerPension = Math.round(pensionBase * Number(cnpsPension?.employer_rate ?? 0));
    const cnpsEmployerFamily = Math.round(familyBase * Number(cnpsFamily?.employer_rate ?? 0));
    const cnpsEmployerAccident = Math.round(accidentBase * Number(cnpsAccident?.employer_rate ?? 0));
    const cnpsEmployerTotal = cnpsEmployerPension + cnpsEmployerFamily + cnpsEmployerAccident;

    const abatementParam = taxParams.find((t) => t.code === 'TAX_ABATEMENT');
    const abatementRate = Number(abatementParam?.rate ?? 0);
    const abatement = Math.round(grossTaxable * abatementRate);
    const taxableBase = Math.max(0, grossTaxable - abatement - cnpsEmp);
    const irpp = Math.round(applyProgressiveBrackets(taxableBase, taxParams));

    const allowances: Record<string, number> = {};
    if (seniorityBonus > 0) allowances["Prime d'anciennete"] = seniorityBonus;

    const deductions: Record<string, number> = {
      'CNPS (salarie)': cnpsEmp,
      'IRPP': irpp,
    };

    const totalDeductions = cnpsEmp + irpp;
    const netSalary = Math.max(0, grossTaxable - totalDeductions);

    return {
      employee,
      base_salary: base,
      seniority_bonus: seniorityBonus,
      gross_taxable: grossTaxable,
      cnps_employee: cnpsEmp,
      cnps_employer_total: cnpsEmployerTotal,
      taxable_base: taxableBase,
      abatement,
      irpp,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      allowances,
      deductions,
      existing_payslip_id: existingPayslips[employee.id],
    };
  };

  const preview = useMemo(
    () => employees.map(computePayslip),
    [employees, contributions, taxParams, existingPayslips, periodYear, periodMonth],
  );

  const totals = useMemo(() => {
    const subset = preview.filter((p) => selectedIds.has(p.employee.id));
    return {
      count: subset.length,
      gross: subset.reduce((s, p) => s + p.gross_taxable, 0),
      cnpsEmp: subset.reduce((s, p) => s + p.cnps_employee, 0),
      cnpsEmployer: subset.reduce((s, p) => s + p.cnps_employer_total, 0),
      irpp: subset.reduce((s, p) => s + p.irpp, 0),
      net: subset.reduce((s, p) => s + p.net_salary, 0),
    };
  }, [preview, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(employees.map((e) => e.id)));
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      setFeedback({ type: 'error', message: 'Selectionnez au moins un employe' });
      return;
    }
    setGenerating(true);
    setFeedback(null);
    setProgress({ done: 0, total: selectedIds.size, errors: 0 });

    const toProcess = preview.filter((p) => selectedIds.has(p.employee.id));
    let done = 0;
    let errors = 0;

    for (const computed of toProcess) {
      const payload = {
        employee_id: computed.employee.id,
        period_month: periodMonth,
        period_year: periodYear,
        base_salary: computed.base_salary,
        allowances: computed.allowances,
        deductions: computed.deductions,
        net_salary: computed.net_salary,
        status: 'generated' as const,
        generated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('payslips')
        .upsert(payload, { onConflict: 'employee_id,period_month,period_year' });

      if (error) {
        console.error('Error generating payslip for', computed.employee.employee_number, error);
        errors += 1;
      }
      done += 1;
      setProgress({ done, total: toProcess.length, errors });
    }

    setGenerating(false);
    await loadExistingPayslips();
    if (errors === 0) {
      setFeedback({
        type: 'success',
        message: `${done} bulletin(s) genere(s) avec succes pour ${monthNames[periodMonth - 1]} ${periodYear}.`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: `${done - errors} bulletin(s) generes, ${errors} echec(s). Consultez la console pour les details.`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  const allSelected = selectedIds.size === employees.length && employees.length > 0;
  const yearsOptions = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Generation de la paie</h2>
            <p className="text-slate-300 text-sm">
              Calcul automatique des bulletins selon les parametres en vigueur (CNPS, IRPP, primes).
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 uppercase tracking-wider">Mois</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                disabled={generating}
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 uppercase tracking-wider">Annee</label>
              <select
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                disabled={generating}
              >
                {yearsOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadReferenceData}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm disabled:opacity-50"
              title="Recharger les donnees"
            >
              <RefreshCw size={16} />
              Recharger
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${
          feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          feedback.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Employes</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900">{totals.count}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Brut total</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.gross)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">CNPS salarie</span>
            <Calculator size={16} className="text-orange-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.cnpsEmp)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">IRPP</span>
            <Calculator size={16} className="text-red-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.irpp)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Net total</span>
            <CheckCircle2 size={16} className="text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-700">{formatCurrency(totals.net)}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Previsualisation des bulletins</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {monthNames[periodMonth - 1]} {periodYear} — {employees.length} employes eligibles
            </p>
          </div>
          <div className="flex items-center gap-2">
            {progress && generating && (
              <span className="text-sm text-slate-600">
                {progress.done}/{progress.total}{progress.errors > 0 ? ` (${progress.errors} erreurs)` : ''}
              </span>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generation...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Generer la paie ({selectedIds.size})
                </>
              )}
            </button>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-600 font-medium">Aucun employe actif trouve</p>
            <p className="text-sm text-slate-500 mt-1">Verifiez que des employes sont bien enregistres avec le statut actif.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Employe</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Salaire base</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Anciennete</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Brut</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">CNPS</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">IRPP</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Net</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-700">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((row) => {
                  const selected = selectedIds.has(row.employee.id);
                  return (
                    <tr key={row.employee.id} className={selected ? 'bg-blue-50/40' : ''}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(row.employee.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          {row.employee.first_name} {row.employee.last_name}
                          {row.base_salary === 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-semibold">
                              Salaire manquant
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{row.employee.employee_number}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.base_salary)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {row.seniority_bonus > 0 ? `+${formatCurrency(row.seniority_bonus)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(row.gross_taxable)}</td>
                      <td className="px-3 py-2 text-right text-orange-700">-{formatCurrency(row.cnps_employee)}</td>
                      <td className="px-3 py-2 text-right text-red-700">-{formatCurrency(row.irpp)}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-700">{formatCurrency(row.net_salary)}</td>
                      <td className="px-3 py-2 text-center">
                        {row.existing_payslip_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                            Sera remplace
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            Nouveau
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700 mb-1">Regles de calcul appliquees</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Prime d'anciennete progressive selon annees de service (0% {'<'} 2 ans, 4% / 6% / 8% / 10% / 15% / 20%)</li>
          <li>CNPS Pension salarie : {((contributions.find((c) => c.contribution_type === 'cnps_pension')?.employee_rate ?? 0) * 100).toFixed(2)}% plafonne a {formatCurrency(Number(contributions.find((c) => c.contribution_type === 'cnps_pension')?.ceiling_amount ?? 0))}</li>
          <li>Abattement forfaitaire applique avant IRPP ({((Number(taxParams.find((t) => t.code === 'TAX_ABATEMENT')?.rate ?? 0)) * 100).toFixed(0)}%)</li>
          <li>IRPP calcule par tranches progressives (bareme en base)</li>
        </ul>
      </div>
    </div>
  );
}
