import { useState, useEffect } from 'react';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar, Briefcase, GraduationCap, Target, Download, Filter, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DetailedReports } from './DetailedReports';

type AnalyticsTab = 'overview' | 'workforce' | 'payroll' | 'leave' | 'training' | 'recruitment' | 'performance' | 'reports';

interface AnalyticsStats {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  departures: number;
  avgAge: number;
  avgSeniority: number;
  totalPayroll: number;
  avgSalary: number;
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
  totalTrainings: number;
  employeesInTraining: number;
  openPositions: number;
  applicationsReceived: number;
}

export function Analytics() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [stats, setStats] = useState<AnalyticsStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    newHires: 0,
    departures: 0,
    avgAge: 0,
    avgSeniority: 0,
    totalPayroll: 0,
    avgSalary: 0,
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
    totalTrainings: 0,
    employeesInTraining: 0,
    openPositions: 0,
    applicationsReceived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: '2026-01-01',
    end: '2026-12-31',
  });

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      const startYear = parseInt(dateRange.start.split('-')[0]);
      const endYear = parseInt(dateRange.end.split('-')[0]);
      const startMonth = parseInt(dateRange.start.split('-')[1]);
      const endMonth = parseInt(dateRange.end.split('-')[1]);

      const [
        employeesResult,
        leavesResult,
        trainingsResult,
        recruitmentResult,
        payrollResult,
        enrollmentsResult,
        candidatesResult,
      ] = await Promise.all([
        supabase.from('employees').select('id, date_of_birth, hire_date, employment_status, contract_type'),
        supabase.from('leave_requests').select('id, status, start_date').gte('start_date', dateRange.start).lte('start_date', dateRange.end),
        supabase.from('training_programs').select('id, start_date').gte('start_date', dateRange.start).lte('start_date', dateRange.end),
        supabase.from('job_openings').select('id, status'),
        supabase.from('payroll_calculations').select('net_salary, gross_salary, period_month, period_year').gte('period_year', startYear).lte('period_year', endYear),
        supabase.from('training_enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
      ]);

      const employees = employeesResult.data || [];
      const leaves = leavesResult.data || [];
      const trainings = trainingsResult.data || [];
      const jobs = recruitmentResult.data || [];
      const payrolls = payrollResult.data || [];
      const totalEnrolled = enrollmentsResult.count || 0;
      const totalCandidates = candidatesResult.count || 0;

      const activeEmps = employees.filter(e => e.employment_status === 'active');
      const totalPayroll = payrolls.reduce((sum, p) => sum + (p.gross_salary || 0), 0);

      const calculateAge = (dob: string) => {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const calculateSeniority = (hireDate: string) => {
        const today = new Date();
        const hired = new Date(hireDate);
        return Math.floor((today.getTime() - hired.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      };

      const avgAge = employees.filter(e => e.date_of_birth).length > 0
        ? employees.filter(e => e.date_of_birth).reduce((sum, e) => sum + calculateAge(e.date_of_birth!), 0) / employees.filter(e => e.date_of_birth).length
        : 0;

      const avgSeniority = employees.filter(e => e.hire_date).length > 0
        ? employees.filter(e => e.hire_date).reduce((sum, e) => sum + calculateSeniority(e.hire_date!), 0) / employees.filter(e => e.hire_date).length
        : 0;

      const monthlyPayrollCount = payrolls.length;
      const avgSalaryCalc = monthlyPayrollCount > 0 ? totalPayroll / monthlyPayrollCount : 0;

      setStats({
        totalEmployees: employees.length,
        activeEmployees: activeEmps.length,
        newHires: employees.filter(e => e.hire_date && e.hire_date >= dateRange.start).length,
        departures: employees.filter(e => e.employment_status === 'terminated').length,
        avgAge: Math.round(avgAge),
        avgSeniority: Math.round(avgSeniority * 10) / 10,
        totalPayroll: totalPayroll,
        avgSalary: avgSalaryCalc,
        totalLeaves: leaves.length,
        approvedLeaves: leaves.filter(l => l.status === 'approved').length,
        pendingLeaves: leaves.filter(l => l.status === 'pending').length,
        totalTrainings: trainings.length,
        employeesInTraining: totalEnrolled,
        openPositions: jobs.filter(j => j.status === 'open').length,
        applicationsReceived: totalCandidates,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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

  const tabs = [
    { id: 'overview' as AnalyticsTab, label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'workforce' as AnalyticsTab, label: 'Effectifs', icon: Users },
    { id: 'payroll' as AnalyticsTab, label: 'Masse salariale', icon: DollarSign },
    { id: 'leave' as AnalyticsTab, label: 'Congés & Absences', icon: Calendar },
    { id: 'training' as AnalyticsTab, label: 'Formations', icon: GraduationCap },
    { id: 'recruitment' as AnalyticsTab, label: 'Recrutement', icon: Briefcase },
    { id: 'performance' as AnalyticsTab, label: 'Performance', icon: Target },
    { id: 'reports' as AnalyticsTab, label: 'Rapports détaillés', icon: FileText },
  ];

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <TrendingUp className="w-5 h-5 text-green-600" />
      </div>
      <h3 className="text-3xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
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
          <h1 className="text-3xl font-bold text-slate-900">Analytics RH</h1>
          <p className="text-slate-600 mt-1">Rapports et statistiques détaillés</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2">
            <Filter className="w-4 h-4 text-slate-600" />
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
          <button className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition">
            <Download className="w-5 h-5" />
            Exporter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-slate-900 bg-slate-50 text-slate-900'
                      : 'border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Effectif total"
                  value={stats.totalEmployees}
                  icon={Users}
                  color="bg-blue-600"
                  subtitle={`${stats.activeEmployees} actifs`}
                />
                <StatCard
                  title="Masse salariale"
                  value={formatCurrency(stats.totalPayroll)}
                  icon={DollarSign}
                  color="bg-green-600"
                  subtitle={`Salaire moyen: ${formatCurrency(stats.avgSalary)}`}
                />
                <StatCard
                  title="Demandes de congés"
                  value={stats.totalLeaves}
                  icon={Calendar}
                  color="bg-orange-600"
                  subtitle={`${stats.pendingLeaves} en attente`}
                />
                <StatCard
                  title="Postes ouverts"
                  value={stats.openPositions}
                  icon={Briefcase}
                  color="bg-purple-600"
                  subtitle={`${stats.applicationsReceived} candidatures`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Mouvement du personnel
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Nouvelles embauches</p>
                        <p className="text-2xl font-bold text-green-600">{stats.newHires}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Départs</p>
                        <p className="text-2xl font-bold text-red-600">{stats.departures}</p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-red-600 rotate-180" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Taux de turnover</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {stats.totalEmployees > 0 ? ((stats.departures / stats.totalEmployees) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div className="p-3 bg-slate-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-slate-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Indicateurs clés
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Âge moyen</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.avgAge} ans</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Ancienneté moyenne</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.avgSeniority} ans</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Taux d'absentéisme</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {stats.totalEmployees > 0 ? ((stats.approvedLeaves / stats.totalEmployees) * 100 / 12).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workforce' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Effectif total"
                  value={stats.totalEmployees}
                  icon={Users}
                  color="bg-blue-600"
                />
                <StatCard
                  title="Employés actifs"
                  value={stats.activeEmployees}
                  icon={Users}
                  color="bg-green-600"
                />
                <StatCard
                  title="Taux d'activité"
                  value={`${stats.totalEmployees > 0 ? ((stats.activeEmployees / stats.totalEmployees) * 100).toFixed(1) : 0}%`}
                  icon={TrendingUp}
                  color="bg-slate-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Répartition par département</h3>
                <p className="text-slate-600">Graphique de répartition des effectifs par département à venir</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Pyramide des âges</h3>
                <p className="text-slate-600">Visualisation de la pyramide des âges à venir</p>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Masse salariale totale"
                  value={formatCurrency(stats.totalPayroll)}
                  icon={DollarSign}
                  color="bg-green-600"
                />
                <StatCard
                  title="Salaire moyen"
                  value={formatCurrency(stats.avgSalary)}
                  icon={DollarSign}
                  color="bg-blue-600"
                />
                <StatCard
                  title="Bulletins générés"
                  value={stats.totalEmployees * 12}
                  icon={BarChart3}
                  color="bg-slate-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Évolution de la masse salariale</h3>
                <p className="text-slate-600">Graphique d'évolution mensuelle à venir</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Répartition des coûts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-2">Salaires bruts</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalPayroll * 1.2)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-2">Charges patronales</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalPayroll * 0.2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="Total demandes"
                  value={stats.totalLeaves}
                  icon={Calendar}
                  color="bg-blue-600"
                />
                <StatCard
                  title="Approuvées"
                  value={stats.approvedLeaves}
                  icon={Calendar}
                  color="bg-green-600"
                />
                <StatCard
                  title="En attente"
                  value={stats.pendingLeaves}
                  icon={Calendar}
                  color="bg-orange-600"
                />
                <StatCard
                  title="Taux d'approbation"
                  value={`${stats.totalLeaves > 0 ? ((stats.approvedLeaves / stats.totalLeaves) * 100).toFixed(1) : 0}%`}
                  icon={TrendingUp}
                  color="bg-slate-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Taux d'absentéisme par période</h3>
                <p className="text-slate-600">Graphique d'évolution de l'absentéisme à venir</p>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Formations dispensées"
                  value={stats.totalTrainings}
                  icon={GraduationCap}
                  color="bg-blue-600"
                />
                <StatCard
                  title="Employés formés"
                  value={stats.employeesInTraining}
                  icon={Users}
                  color="bg-green-600"
                />
                <StatCard
                  title="Taux de participation"
                  value={`${stats.totalEmployees > 0 ? ((stats.employeesInTraining / stats.totalEmployees) * 100).toFixed(1) : 0}%`}
                  icon={TrendingUp}
                  color="bg-slate-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Formations par catégorie</h3>
                <p className="text-slate-600">Répartition des formations par type à venir</p>
              </div>
            </div>
          )}

          {activeTab === 'recruitment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="Postes ouverts"
                  value={stats.openPositions}
                  icon={Briefcase}
                  color="bg-blue-600"
                />
                <StatCard
                  title="Candidatures"
                  value={stats.applicationsReceived}
                  icon={Users}
                  color="bg-green-600"
                />
                <StatCard
                  title="Embauches"
                  value={stats.newHires}
                  icon={TrendingUp}
                  color="bg-slate-600"
                />
                <StatCard
                  title="Délai moyen"
                  value="45 jours"
                  icon={Calendar}
                  color="bg-orange-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Tunnel de recrutement</h3>
                <p className="text-slate-600">Visualisation du processus de recrutement à venir</p>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Évaluations complétées"
                  value="0"
                  icon={Target}
                  color="bg-blue-600"
                />
                <StatCard
                  title="Score moyen"
                  value="N/A"
                  icon={TrendingUp}
                  color="bg-green-600"
                />
                <StatCard
                  title="Objectifs atteints"
                  value="N/A"
                  icon={BarChart3}
                  color="bg-slate-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Module en cours de développement</h3>
                <p className="text-slate-600">Les indicateurs de performance seront disponibles prochainement</p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && <DetailedReports />}
        </div>
      </div>
    </div>
  );
}
