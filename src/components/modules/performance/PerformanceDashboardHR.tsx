import React, { useState, useEffect } from 'react';
import {
  BarChart2, Users, FolderOpen, Clock, TrendingUp, AlertCircle,
  CheckCircle2, RefreshCw, Calendar, Award, Filter, ChevronDown
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface EmployeeStat {
  id: string;
  name: string;
  position: string;
  department: string;
  totalFolders: number;
  completedFolders: number;
  lateFolders: number;
  weightedCompleted: number;
  weightedTotal: number;
  avgDelayDays: number | null;
  reminderTotal: number;
  returnTotal: number;
  hasEvaluation: boolean;
  evalScore: number | null;
  evalMention: string;
  evalStatus: string;
  hasObjectives: boolean;
  objStatus: string;
  selfEvalScore: number | null;
}

interface DirectionStat {
  id: string;
  name: string;
  totalFolders: number;
  completedFolders: number;
  lateFolders: number;
  employeeCount: number;
  blockedFolders: number;
}

const MENTION_COLORS: Record<string, string> = {
  excellent:   'text-green-700 bg-green-100',
  tres_bien:   'text-teal-700 bg-teal-100',
  bien:        'text-blue-700 bg-blue-100',
  assez_bien:  'text-amber-700 bg-amber-100',
  insuffisant: 'text-red-700 bg-red-100',
};
const MENTION_LABELS: Record<string, string> = {
  excellent: 'Excellent', tres_bien: 'Très bien', bien: 'Bien',
  assez_bien: 'Assez bien', insuffisant: 'Insuffisant',
};

interface MiniBarProps { value: number; max?: number; color: string; }
function MiniBar({ value, max = 100, color }: MiniBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PerformanceDashboardHR() {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStat[]>([]);
  const [directionStats, setDirectionStats] = useState<DirectionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewType, setViewType] = useState<'employees' | 'directions'>('employees');

  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => { load(); }, [selectedYear]);

  const load = async () => {
    setLoading(true);
    await Promise.all([loadEmployeeStats(), loadDirectionStats()]);
    setLoading(false);
  };

  const loadEmployeeStats = async () => {
    const [empRes, foldersRes, evalRes, objRes] = await Promise.all([
      supabase.from('employees').select(`
        id, first_name, last_name,
        position:positions(name),
        department:departments(name)
      `).eq('employment_status', 'active'),
      supabase.from('case_folders').select('id, assigned_to, status, complexity_coef, expected_deadline, actual_completion, reminder_count, return_count, is_confidential'),
      supabase.from('hr_evaluations').select('employee_id, computed_score, adjusted_score, mention, status').eq('year', selectedYear),
      supabase.from('annual_objectives').select('employee_id, status, self_evaluation_score').eq('year', selectedYear),
    ]);

    if (!empRes.data) return;

    const folders = foldersRes.data ?? [];
    const evals = evalRes.data ?? [];
    const objs = objRes.data ?? [];

    const stats: EmployeeStat[] = empRes.data.map(emp => {
      const empFolders = folders.filter(f => f.assigned_to === emp.id);
      const completed = empFolders.filter(f => f.status === 'completed');
      const late = empFolders.filter(f =>
        f.expected_deadline && f.status !== 'completed' && new Date(f.expected_deadline) < new Date()
      );
      const weightedCompleted = completed.reduce((s, f) => s + (f.complexity_coef ?? 1), 0);
      const weightedTotal = empFolders.reduce((s, f) => s + (f.complexity_coef ?? 1), 0);

      const completedWithDates = completed.filter(f => f.expected_deadline && f.actual_completion);
      const avgDelay = completedWithDates.length > 0
        ? Math.round(completedWithDates.reduce((s, f) => {
            const diff = (new Date(f.actual_completion!).getTime() - new Date(f.expected_deadline!).getTime()) / 86400000;
            return s + diff;
          }, 0) / completedWithDates.length)
        : null;

      const evalData = evals.find(e => e.employee_id === emp.id);
      const objData = objs.find(o => o.employee_id === emp.id);

      return {
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        position: (emp.position as any)?.name ?? '—',
        department: (emp.department as any)?.name ?? '—',
        totalFolders: empFolders.length,
        completedFolders: completed.length,
        lateFolders: late.length,
        weightedCompleted,
        weightedTotal,
        avgDelayDays: avgDelay,
        reminderTotal: empFolders.reduce((s, f) => s + (f.reminder_count ?? 0), 0),
        returnTotal: empFolders.reduce((s, f) => s + (f.return_count ?? 0), 0),
        hasEvaluation: !!evalData,
        evalScore: evalData ? (evalData.adjusted_score ?? evalData.computed_score) : null,
        evalMention: evalData?.mention ?? '',
        evalStatus: evalData?.status ?? '',
        hasObjectives: !!objData,
        objStatus: objData?.status ?? '',
        selfEvalScore: objData?.self_evaluation_score ?? null,
      };
    });

    setEmployeeStats(stats.sort((a, b) => (b.evalScore ?? -1) - (a.evalScore ?? -1)));
  };

  const loadDirectionStats = async () => {
    const [deptRes, foldersRes] = await Promise.all([
      supabase.from('departments').select('id, name'),
      supabase.from('case_folders').select('id, department_id, status, expected_deadline, assigned_to'),
    ]);

    if (!deptRes.data) return;
    const folders = foldersRes.data ?? [];

    const stats: DirectionStat[] = deptRes.data.map(dept => {
      const deptFolders = folders.filter(f => f.department_id === dept.id);
      const completed = deptFolders.filter(f => f.status === 'completed').length;
      const late = deptFolders.filter(f =>
        f.expected_deadline && f.status !== 'completed' && new Date(f.expected_deadline) < new Date()
      ).length;
      const blocked = deptFolders.filter(f => f.status === 'suspended').length;
      const uniqueAgents = new Set(deptFolders.map(f => f.assigned_to).filter(Boolean)).size;

      return {
        id: dept.id, name: dept.name,
        totalFolders: deptFolders.length, completedFolders: completed,
        lateFolders: late, employeeCount: uniqueAgents, blockedFolders: blocked,
      };
    });

    setDirectionStats(stats.sort((a, b) => b.totalFolders - a.totalFolders));
  };

  const globalStats = {
    totalEmployees: employeeStats.length,
    withEval: employeeStats.filter(e => e.hasEvaluation).length,
    avgScore: employeeStats.filter(e => e.evalScore != null).length > 0
      ? Math.round(employeeStats.filter(e => e.evalScore != null).reduce((s, e) => s + (e.evalScore ?? 0), 0) / employeeStats.filter(e => e.evalScore != null).length)
      : null,
    totalFolders: employeeStats.reduce((s, e) => s + e.totalFolders, 0),
    completedFolders: employeeStats.reduce((s, e) => s + e.completedFolders, 0),
    lateFolders: employeeStats.reduce((s, e) => s + e.lateFolders, 0),
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tableau de bord RH — Performance</h2>
          <p className="text-sm text-gray-500">Vue consolidée : dossiers, objectifs, évaluations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['employees','directions'] as const).map(v => (
              <button key={v} onClick={() => setViewType(v)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${viewType === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {v === 'employees' ? 'Par agent' : 'Par direction'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Agents actifs', value: globalStats.totalEmployees, icon: Users, color: 'blue' },
          { label: 'Avec évaluation', value: `${globalStats.withEval}/${globalStats.totalEmployees}`, icon: Award, color: 'green' },
          { label: 'Score moyen', value: globalStats.avgScore != null ? `${globalStats.avgScore}/100` : '—', icon: TrendingUp, color: 'teal' },
          { label: 'Total dossiers', value: globalStats.totalFolders, icon: FolderOpen, color: 'slate' },
          { label: 'Dossiers terminés', value: globalStats.completedFolders, icon: CheckCircle2, color: 'green' },
          { label: 'Dossiers en retard', value: globalStats.lateFolders, icon: AlertCircle, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}-50 flex-shrink-0`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Par agent */}
      {viewType === 'employees' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                {['Agent','Direction','Dossiers','Charge pondérée','En retard','Relances','Retours','Objectifs','Score final','Mention'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employeeStats.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-32">{emp.position}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 max-w-36 truncate">{emp.department}</td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-bold text-gray-800">{emp.completedFolders}/{emp.totalFolders}</p>
                    {emp.totalFolders > 0 && (
                      <MiniBar value={emp.completedFolders} max={emp.totalFolders} color="bg-blue-500" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-bold text-blue-700">{emp.weightedCompleted}<span className="text-gray-400 font-normal">/{emp.weightedTotal}</span></p>
                    {emp.weightedTotal > 0 && (
                      <MiniBar value={emp.weightedCompleted} max={emp.weightedTotal} color="bg-teal-500" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-bold ${emp.lateFolders > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {emp.lateFolders}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-bold ${emp.reminderTotal > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {emp.reminderTotal}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-bold ${emp.returnTotal > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {emp.returnTotal}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {emp.hasObjectives ? (
                      <div>
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">Oui</span>
                        {emp.selfEvalScore != null && (
                          <p className="text-xs text-amber-600 mt-0.5">Auto : {emp.selfEvalScore}/100</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Non</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {emp.evalScore != null ? (
                      <p className="text-xl font-black text-gray-800">{emp.evalScore}<span className="text-xs font-normal text-gray-400">/100</span></p>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {emp.evalMention ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${MENTION_COLORS[emp.evalMention] ?? 'bg-gray-100 text-gray-600'}`}>
                        {MENTION_LABELS[emp.evalMention] ?? emp.evalMention}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Par direction */}
      {viewType === 'directions' && (
        <div className="grid gap-4">
          {directionStats.filter(d => d.totalFolders > 0).map(dir => {
            const rate = dir.totalFolders > 0 ? Math.round((dir.completedFolders / dir.totalFolders) * 100) : 0;
            return (
              <div key={dir.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{dir.name}</h3>
                    <p className="text-sm text-gray-500">{dir.employeeCount} agent{dir.employeeCount > 1 ? 's' : ''} assigné{dir.employeeCount > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`text-2xl font-black ${rate >= 80 ? 'text-green-700' : rate >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{rate}%</div>
                    <div className="text-xs text-gray-400 leading-tight">taux<br/>clôture</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Total', value: dir.totalFolders, color: 'text-gray-800' },
                    { label: 'Terminés', value: dir.completedFolders, color: 'text-green-700' },
                    { label: 'En retard', value: dir.lateFolders, color: dir.lateFolders > 0 ? 'text-red-600' : 'text-gray-400' },
                    { label: 'Suspendus', value: dir.blockedFolders, color: dir.blockedFolders > 0 ? 'text-amber-600' : 'text-gray-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {directionStats.every(d => d.totalFolders === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <BarChart2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucune donnée de dossier par direction</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
