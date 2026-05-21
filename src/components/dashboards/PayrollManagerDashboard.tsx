import React, { useState, useEffect } from 'react';
import {
  Calculator, DollarSign, FileText, Settings, TrendingUp, Users,
  Calendar, CheckCircle, Clock, AlertCircle, Download, Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PayrollStats {
  totalEmployees: number;
  currentMonthPayroll: number;
  pendingCalculations: number;
  approvedCalculations: number;
  totalBonuses: number;
  pendingBonuses: number;
}

interface PayrollManagerDashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function PayrollManagerDashboard({ onNavigate }: PayrollManagerDashboardProps = {}) {
  const [activeModule, setActiveModule] = useState<string>('overview');
  const [stats, setStats] = useState<PayrollStats>({
    totalEmployees: 0,
    currentMonthPayroll: 0,
    pendingCalculations: 0,
    approvedCalculations: 0,
    totalBonuses: 0,
    pendingBonuses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const [employeesResult, payrollResult, bonusesResult] = await Promise.all([
        supabase
          .from('employees')
          .select('id', { count: 'exact' })
          .eq('employment_status', 'active'),
        supabase
          .from('payroll_calculations')
          .select('status, net_salary')
          .eq('period_month', currentMonth)
          .eq('period_year', currentYear),
        supabase
          .from('employee_bonuses')
          .select('status, final_amount')
          .eq('period_month', currentMonth)
          .eq('period_year', currentYear),
      ]);

      const totalEmployees = employeesResult.count || 0;
      const payrollData = payrollResult.data || [];
      const bonusesData = bonusesResult.data || [];

      const currentMonthPayroll = payrollData
        .filter(p => p.status === 'validated' || p.status === 'paid')
        .reduce((sum, p) => sum + (p.net_salary || 0), 0);

      const pendingCalculations = payrollData.filter(p => p.status === 'draft' || p.status === 'calculated').length;
      const approvedCalculations = payrollData.filter(p => p.status === 'validated' || p.status === 'paid').length;

      const totalBonuses = bonusesData.reduce((sum, b) => sum + (b.final_amount || 0), 0);
      const pendingBonuses = bonusesData.filter(b => b.status === 'pending' || b.status === 'calculated').length;

      setStats({
        totalEmployees,
        currentMonthPayroll,
        pendingCalculations,
        approvedCalculations,
        totalBonuses,
        pendingBonuses,
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

  const getCurrentPeriod = () => {
    const now = new Date();
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const modules = [
    {
      id: 'payroll',
      name: 'Traitement Paie',
      icon: Calculator,
      description: 'Calcul et validation de la paie mensuelle',
      color: 'bg-blue-500',
      route: 'payroll-administration'
    },
    {
      id: 'bonuses',
      name: 'Primes & Bonus',
      icon: TrendingUp,
      description: 'Gestion des primes et éléments exceptionnels',
      color: 'bg-green-500',
      route: 'payroll-bonuses'
    },
    {
      id: 'payslips',
      name: 'Bulletins de Paie',
      icon: FileText,
      description: 'Génération et gestion des bulletins',
      color: 'bg-purple-500',
      route: 'payslips'
    },
    {
      id: 'elements',
      name: 'Éléments de Paie',
      icon: Settings,
      description: 'Configuration des rubriques de paie',
      color: 'bg-orange-500',
      route: 'payroll-elements'
    },
    {
      id: 'grids',
      name: 'Grilles Salariales',
      icon: DollarSign,
      description: 'Gestion des grilles et échelles',
      color: 'bg-indigo-500',
      route: 'salary-grids'
    },
    {
      id: 'accounting',
      name: 'Comptabilité OHADA',
      icon: FileText,
      description: 'Écritures comptables et exports',
      color: 'bg-teal-500',
      route: 'payroll-accounting'
    },
    {
      id: 'tax',
      name: 'Paramètres Fiscaux',
      icon: Settings,
      description: 'Configuration IRPP et cotisations',
      color: 'bg-red-500',
      route: 'tax-parameters'
    },
    {
      id: 'social',
      name: 'Cotisations Sociales',
      icon: Users,
      description: 'Paramétrage CNPS',
      color: 'bg-yellow-500',
      route: 'social-contributions'
    },
  ];

  const statsCards = [
    {
      title: 'Employés Actifs',
      value: stats.totalEmployees,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      route: 'employees',
    },
    {
      title: 'Paie du Mois',
      value: formatCurrency(stats.currentMonthPayroll),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      route: 'payroll-administration',
    },
    {
      title: 'Calculs en Attente',
      value: stats.pendingCalculations,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      route: 'payroll-administration',
    },
    {
      title: 'Calculs Validés',
      value: stats.approvedCalculations,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      route: 'payslips',
    },
    {
      title: 'Primes Totales',
      value: formatCurrency(stats.totalBonuses),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      route: 'payroll-bonuses',
    },
    {
      title: 'Primes en Attente',
      value: stats.pendingBonuses,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      route: 'payroll-bonuses',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Gestion de la Paie</h1>
            <p className="text-blue-100 text-base sm:text-lg">
              Période : {getCurrentPeriod()}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => onNavigate?.('payroll-administration')}
              className="bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Générer Paie</span>
              <span className="sm:hidden">Générer</span>
            </button>
            <button
              onClick={() => onNavigate?.('payslips')}
              className="bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onNavigate?.(stat.route)}
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg hover:-translate-y-0.5 transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 sm:p-4 rounded-full flex-shrink-0`}>
                  <Icon className={`h-5 w-5 sm:h-7 sm:w-7 ${stat.color}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Modules de Gestion</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => onNavigate && onNavigate(module.route)}
                className="group p-4 sm:p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className={`${module.color} w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                  {module.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {module.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span>Actions Rapides</span>
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => onNavigate?.('payroll-administration')}
              className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium transition-colors flex items-center justify-between text-sm sm:text-base"
            >
              <span>Calculer la paie du mois</span>
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            </button>
            <button
              onClick={() => onNavigate?.('payroll-bonuses')}
              className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-900 font-medium transition-colors flex items-center justify-between text-sm sm:text-base"
            >
              <span>Attribuer des primes</span>
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            </button>
            <button
              onClick={() => onNavigate?.('payslips')}
              className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-900 font-medium transition-colors flex items-center justify-between text-sm sm:text-base"
            >
              <span>Générer les bulletins</span>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            </button>
            <button
              onClick={() => onNavigate?.('payroll-accounting')}
              className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 font-medium transition-colors flex items-center justify-between text-sm sm:text-base"
            >
              <span className="truncate">Exporter écritures comptables</span>
              <Download className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ml-2" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            <span>Alertes & Notifications</span>
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {stats.pendingCalculations > 0 && (
              <button
                type="button"
                onClick={() => onNavigate?.('payroll-administration')}
                className="w-full text-left p-3 sm:p-4 bg-orange-50 border-l-4 border-orange-500 rounded hover:bg-orange-100 transition"
              >
                <p className="font-semibold text-orange-900 text-sm sm:text-base">
                  {stats.pendingCalculations} calcul(s) en attente de validation
                </p>
                <p className="text-xs sm:text-sm text-orange-700 mt-1">
                  Vérifiez et validez les calculs avant le traitement final
                </p>
              </button>
            )}
            {stats.pendingBonuses > 0 && (
              <button
                type="button"
                onClick={() => onNavigate?.('payroll-bonuses')}
                className="w-full text-left p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded hover:bg-yellow-100 transition"
              >
                <p className="font-semibold text-yellow-900 text-sm sm:text-base">
                  {stats.pendingBonuses} prime(s) en attente d'approbation
                </p>
                <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                  Examinez les demandes de primes en attente
                </p>
              </button>
            )}
            {stats.pendingCalculations === 0 && stats.pendingBonuses === 0 && (
              <div className="p-3 sm:p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <p className="font-semibold text-green-900 text-sm sm:text-base">
                  Tout est à jour !
                </p>
                <p className="text-xs sm:text-sm text-green-700 mt-1">
                  Aucune action en attente pour le moment
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
