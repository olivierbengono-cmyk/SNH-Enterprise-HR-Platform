import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, PlayCircle, StopCircle, BarChart3, Filter, TableProperties } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';

interface TimeEntry {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_duration: number;
  total_hours: number | null;
  overtime_hours: number;
  status: 'pending' | 'approved' | 'rejected';
  project_id: string | null;
  notes: string | null;
  project?: { name: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function TimeTracking() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showBatch, setShowBatch] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  const [formData, setFormData] = useState({
    project_id: '',
    notes: '',
    break_duration: 60
  });

  useEffect(() => {
    loadData();
    checkCurrentClockIn();
  }, [user, selectedDate, activeTab]);

  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name').eq('employment_status', 'active').order('first_name')
      .then(({ data }) => { if (data) setEmployeeOptions(data); });
  }, []);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employee) return;

      const startDate = getStartDate();
      const endDate = getEndDate();

      const { data: entries } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:projects(name)
        `)
        .eq('employee_id', employee.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      setTimeEntries(entries || []);

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('name');

      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentClockIn = async () => {
    if (!user) return;

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employee) return;

      const { data: entry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', selectedDate)
        .is('clock_out', null)
        .maybeSingle();

      if (entry) {
        setClockedIn(true);
        setCurrentEntry(entry);
      } else {
        setClockedIn(false);
        setCurrentEntry(null);
      }
    } catch (error) {
      console.error('Error checking clock in:', error);
    }
  };

  const getStartDate = () => {
    const date = new Date(selectedDate);
    if (activeTab === 'daily') return selectedDate;
    if (activeTab === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff)).toISOString().split('T')[0];
    }
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const getEndDate = () => {
    const date = new Date(selectedDate);
    if (activeTab === 'daily') return selectedDate;
    if (activeTab === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1) + 6;
      return new Date(date.setDate(diff)).toISOString().split('T')[0];
    }
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const handleClockIn = async () => {
    if (!user) return;

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employee) return;

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: employee.id,
          date: selectedDate,
          clock_in: new Date().toISOString(),
          project_id: formData.project_id || null,
          notes: formData.notes,
          break_duration: formData.break_duration,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setClockedIn(true);
      setCurrentEntry(data);
      alert('Pointage d\'entrée enregistré avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors du pointage : ' + error.message);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    try {
      const clockOut = new Date();
      const clockIn = new Date(currentEntry.clock_in!);
      const diffMs = clockOut.getTime() - clockIn.getTime();
      const totalMinutes = Math.floor(diffMs / 60000) - formData.break_duration;
      const totalHours = Number((totalMinutes / 60).toFixed(2));
      const overtimeHours = Math.max(0, totalHours - 8);

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOut.toISOString(),
          break_duration: formData.break_duration,
          total_hours: totalHours,
          overtime_hours: overtimeHours,
          notes: formData.notes,
          project_id: formData.project_id || null
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setClockedIn(false);
      setCurrentEntry(null);
      setFormData({ project_id: '', notes: '', break_duration: 60 });
      alert('Pointage de sortie enregistré avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors du pointage de sortie : ' + error.message);
    }
  };

  const getTotalHours = () => {
    return timeEntries
      .filter(e => filterStatus === 'all' || e.status === filterStatus)
      .reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const getOvertimeHours = () => {
    return timeEntries
      .filter(e => filterStatus === 'all' || e.status === filterStatus)
      .reduce((sum, entry) => sum + entry.overtime_hours, 0);
  };

  const filteredEntries = timeEntries.filter(e =>
    filterStatus === 'all' || e.status === filterStatus
  );

  const batchSaveTimeEntries = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const clockIn = row.clock_in ? `${String(row.date)}T${String(row.clock_in)}:00` : null;
      const clockOut = row.clock_out ? `${String(row.date)}T${String(row.clock_out)}:00` : null;
      let totalHours = null;
      if (clockIn && clockOut) {
        const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000;
        const breakH = (Number(row.break_duration) || 0) / 60;
        totalHours = Math.max(0, diff - breakH);
      }
      const payload = {
        employee_id: String(row.employee_id || ''),
        date: String(row.date || ''),
        clock_in: clockIn,
        clock_out: clockOut,
        break_duration: Number(row.break_duration) || 60,
        total_hours: totalHours,
        overtime_hours: totalHours ? Math.max(0, totalHours - 8) : 0,
        project_id: row.project_id ? String(row.project_id) : null,
        notes: row.notes ? String(row.notes) : null,
        status: 'approved',
      };
      const { error } = await supabase.from('time_entries').insert(payload);
      if (error) errors.push(error.message);
      else success++;
    }
    loadData();
    return { success, errors };
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
          <h2 className="text-2xl font-bold text-gray-900">Gestion du Temps</h2>
          <p className="text-gray-600">Pointage et suivi des heures de travail</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatch(true)}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition text-sm"
          >
            <TableProperties className="h-4 w-4" />
            Saisie par lots
          </button>
          <Clock className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Heures totales</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalHours().toFixed(1)}h</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Heures sup.</p>
              <p className="text-2xl font-bold text-orange-600">{getOvertimeHours().toFixed(1)}h</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {timeEntries.filter(e => e.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approuvées</p>
              <p className="text-2xl font-bold text-green-600">
                {timeEntries.filter(e => e.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pointage du jour</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={clockedIn}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projet (optionnel)
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Aucun projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée de pause (minutes)
            </label>
            <input
              type="number"
              value={formData.break_duration}
              onChange={(e) => setFormData({ ...formData, break_duration: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Description des tâches effectuées..."
            />
          </div>

          <div className="flex gap-4">
            {!clockedIn ? (
              <button
                onClick={handleClockIn}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle className="h-5 w-5" />
                Pointer l'arrivée
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <StopCircle className="h-5 w-5" />
                Pointer le départ
              </button>
            )}
          </div>

          {clockedIn && currentEntry && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Pointé depuis {new Date(currentEntry.clock_in!).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Historique</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mois
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrivée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Départ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures sup.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Aucun pointage pour cette période
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.total_hours ? `${entry.total_hours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {entry.overtime_hours > 0 ? `${entry.overtime_hours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.project?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Approuvée
                        </span>
                      )}
                      {entry.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3" />
                          En attente
                        </span>
                      )}
                      {entry.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3" />
                          Rejetée
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showBatch && (
        <BatchEntryTable<Record<string, unknown>>
          title="Pointages"
          onClose={() => setShowBatch(false)}
          onSave={batchSaveTimeEntries}
          initialRows={5}
          emptyRow={() => ({ employee_id: '', date: selectedDate, clock_in: '08:00', clock_out: '17:00', break_duration: '60', project_id: '', notes: '' })}
          columns={[
            { key: 'employee_id', label: 'Agent', type: 'select', required: true, width: '200px', options: employeeOptions.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
            { key: 'date', label: 'Date', type: 'date', required: true, width: '130px' },
            { key: 'clock_in', label: 'Arrivée', type: 'text', placeholder: '08:00', width: '90px' },
            { key: 'clock_out', label: 'Départ', type: 'text', placeholder: '17:00', width: '90px' },
            { key: 'break_duration', label: 'Pause (min)', type: 'number', placeholder: '60', width: '100px' },
            { key: 'project_id', label: 'Projet', type: 'select', width: '160px', options: projects.map(p => ({ value: p.id, label: p.name })) },
            { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Remarques…', width: '160px' },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}
