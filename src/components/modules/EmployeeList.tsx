import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, User, Briefcase, Calendar, MoreVertical, X, Mail, Phone, MapPin, Building, FileX, Camera, TableProperties } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Employee } from '../../lib/database.types';
import { EmployeeForm } from './EmployeeForm';
import { ContractTerminationForm } from './ContractTerminationForm';
import { PhotoUpload } from './PhotoUpload';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';

interface DeptOption { id: string; name: string; }
interface PosOption  { id: string; title: string; }

export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([]);
  const [posOptions, setPosOptions]   = useState<PosOption[]>([]);

  useEffect(() => {
    const init = async () => {
      const [dRes, pRes] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('positions').select('id, title').order('title'),
      ]);
      if (dRes.data) setDeptOptions(dRes.data);
      if (pRes.data) setPosOptions(pRes.data);
      await loadEmployees();
    };
    init();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments (name),
          positions (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const batchSaveEmployees = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const payload = {
        first_name: String(row.first_name || '').trim(),
        last_name: String(row.last_name || '').trim(),
        email: String(row.email || '').trim(),
        employee_number: String(row.employee_number || '').trim(),
        department_id: row.department_id ? String(row.department_id) : null,
        position_id: row.position_id ? String(row.position_id) : null,
        contract_type: String(row.contract_type || 'CDI'),
        hire_date: row.hire_date ? String(row.hire_date) : new Date().toISOString().split('T')[0],
        employment_status: 'active',
        base_salary: row.base_salary ? Number(row.base_salary) : 0,
      };
      const { error } = await supabase.from('employees').insert(payload);
      if (error) errors.push(`${payload.first_name} ${payload.last_name}: ${error.message}`);
      else success++;
    }
    loadEmployees();
    return { success, errors };
  };

  const filteredEmployees = employees.filter(emp => {
    const txt = searchTerm.toLowerCase();
    const matchText = !searchTerm || (
      emp.first_name.toLowerCase().includes(txt) ||
      emp.last_name.toLowerCase().includes(txt) ||
      emp.employee_number.toLowerCase().includes(txt) ||
      emp.email.toLowerCase().includes(txt) ||
      ((emp as any).positions?.title ?? '').toLowerCase().includes(txt)
    );
    const matchDept = !filterDept || (emp as any).departments?.name === filterDept;
    const matchStatus = !filterStatus || emp.employment_status === filterStatus;
    const matchContract = !filterContract || emp.contract_type === filterContract;
    return matchText && matchDept && matchStatus && matchContract;
  });

  const hasActiveFilters = searchTerm || filterDept || filterStatus || filterContract;

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      terminated: 'bg-slate-100 text-slate-800',
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Actif',
      on_leave: 'En congé',
      suspended: 'Suspendu',
      terminated: 'Terminé',
    };
    return labels[status as keyof typeof labels] || status;
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
          <h1 className="text-3xl font-bold text-slate-900">Gestion du Personnel</h1>
          <p className="text-slate-600 mt-1">{employees.length} employés enregistrés</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatch(true)}
            className="flex items-center gap-2 bg-slate-700 text-white px-5 py-3 rounded-lg font-medium hover:bg-slate-600 transition"
          >
            <TableProperties className="w-5 h-5" />
            Saisie par lots
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition"
          >
            <Plus className="w-5 h-5" />
            Nouvel employé
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, matricule, email, poste..."
                className="w-full pl-11 pr-9 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button className="flex items-center gap-2 px-5 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition flex-shrink-0">
              <Download className="w-5 h-5" />
              <span className="font-medium">Export</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none bg-white min-w-[160px]"
            >
              <option value="">Tous les départements</option>
              {deptOptions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="on_leave">En congé</option>
              <option value="suspended">Suspendu</option>
              <option value="terminated">Terminé</option>
            </select>
            <select
              value={filterContract}
              onChange={e => setFilterContract(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none bg-white"
            >
              <option value="">Tous les contrats</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Stage">Stage</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchTerm(''); setFilterDept(''); setFilterStatus(''); setFilterContract(''); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
              >
                <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
              </button>
            )}
            {filteredEmployees.length !== employees.length && (
              <span className="text-xs text-slate-500 ml-auto">{filteredEmployees.length} résultat{filteredEmployees.length !== 1 ? 's' : ''} sur {employees.length}</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Employé</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Matricule</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Poste</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Département</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Statut</th>
                <th className="text-left py-4 px-4 font-medium text-slate-600 text-sm">Date d'embauche</th>
                <th className="text-right py-4 px-4 font-medium text-slate-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {(employee as any).photo_url ? (
                        <img
                          src={(employee as any).photo_url}
                          alt={`${employee.first_name} ${employee.last_name}`}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-slate-600 truncate">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm text-slate-900">{employee.employee_number}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-900">{(employee as any).positions?.title || 'N/A'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-900">{(employee as any).departments?.name || 'N/A'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.employment_status)}`}>
                      {getStatusLabel(employee.employment_status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-900">
                      {new Date(employee.hire_date).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                      <MoreVertical className="w-5 h-5 text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Aucun employé trouvé</p>
              <p className="text-sm text-slate-500 mt-1">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Total</span>
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{employees.length}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Actifs</span>
            <User className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {employees.filter(e => e.employment_status === 'active').length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">CDI</span>
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {employees.filter(e => e.contract_type === 'CDI').length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">CDD</span>
            <Calendar className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {employees.filter(e => e.contract_type === 'CDD').length}
          </p>
        </div>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(selectedEmployee as any).photo_url ? (
                  <img
                    src={(selectedEmployee as any).photo_url}
                    alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <p className="text-slate-600">{(selectedEmployee as any).positions?.title || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <PhotoUpload
                employeeId={selectedEmployee.id}
                currentPhotoUrl={(selectedEmployee as any).photo_url}
                onPhotoUploaded={(url) => {
                  setSelectedEmployee({ ...selectedEmployee, photo_url: url } as any);
                  loadEmployees();
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-slate-600" />
                    <span className="text-sm text-slate-600 font-medium">Informations personnelles</span>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{selectedEmployee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{selectedEmployee.phone_number || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{selectedEmployee.address || 'Non renseigné'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="w-5 h-5 text-slate-600" />
                    <span className="text-sm text-slate-600 font-medium">Informations professionnelles</span>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Matricule:</span>
                      <span className="text-sm font-mono font-medium text-slate-900">{selectedEmployee.employee_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Département:</span>
                      <span className="text-sm font-medium text-slate-900">{(selectedEmployee as any).departments?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Type de contrat:</span>
                      <span className="text-sm font-medium text-slate-900">{selectedEmployee.contract_type}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Détails du contrat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Date d'embauche</p>
                    <p className="font-medium text-slate-900">
                      {new Date(selectedEmployee.hire_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {selectedEmployee.contract_end_date && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Fin de contrat</p>
                      <p className="font-medium text-slate-900">
                        {new Date(selectedEmployee.contract_end_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Statut</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEmployee.employment_status)}`}>
                      {getStatusLabel(selectedEmployee.employment_status)}
                    </span>
                  </div>
                  {selectedEmployee.base_salary && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Salaire de base</p>
                      <p className="font-medium text-slate-900">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XAF',
                          minimumFractionDigits: 0,
                        }).format(selectedEmployee.base_salary)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Building className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600 font-medium">Autres informations</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedEmployee.nationality && (
                    <div>
                      <p className="text-xs text-slate-500">Nationalité</p>
                      <p className="text-sm font-medium text-slate-900">{selectedEmployee.nationality}</p>
                    </div>
                  )}
                  {selectedEmployee.date_of_birth && (
                    <div>
                      <p className="text-xs text-slate-500">Date de naissance</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(selectedEmployee.date_of_birth).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                  {selectedEmployee.emergency_contact && (
                    <div>
                      <p className="text-xs text-slate-500">Contact d'urgence</p>
                      <p className="text-sm font-medium text-slate-900">{selectedEmployee.emergency_contact}</p>
                    </div>
                  )}
                  {selectedEmployee.bank_account && (
                    <div>
                      <p className="text-xs text-slate-500">RIB</p>
                      <p className="text-sm font-mono font-medium text-slate-900">{selectedEmployee.bank_account}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(true);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
                >
                  Modifier
                </button>
                {selectedEmployee.employment_status !== 'terminated' && (
                  <button
                    onClick={() => {
                      setShowTerminationForm(true);
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
                  >
                    <FileX className="w-5 h-5" />
                    Fin de contrat
                  </button>
                )}
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <EmployeeForm
          employeeToEdit={selectedEmployee}
          onClose={() => {
            setShowForm(false);
            setSelectedEmployee(null);
          }}
          onSuccess={() => {
            loadEmployees();
            setShowForm(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {showTerminationForm && selectedEmployee && (
        <ContractTerminationForm
          employee={selectedEmployee}
          onClose={() => setShowTerminationForm(false)}
          onSuccess={() => {
            loadEmployees();
            setShowTerminationForm(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {showBatch && (
        <BatchEntryTable<Record<string, unknown>>
          title="Employés"
          onClose={() => setShowBatch(false)}
          onSave={batchSaveEmployees}
          initialRows={5}
          emptyRow={() => ({ first_name: '', last_name: '', email: '', employee_number: '', department_id: '', position_id: '', contract_type: 'CDI', hire_date: '', base_salary: '' })}
          columns={[
            { key: 'first_name', label: 'Prénom', type: 'text', required: true, placeholder: 'Jean', width: '120px' },
            { key: 'last_name', label: 'Nom', type: 'text', required: true, placeholder: 'Dupont', width: '120px' },
            { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'j.dupont@snh.cm', width: '180px' },
            { key: 'employee_number', label: 'Matricule', type: 'text', required: true, placeholder: 'SNH-001', width: '100px' },
            { key: 'contract_type', label: 'Contrat', type: 'select', required: true, width: '90px', options: [{ value: 'CDI', label: 'CDI' }, { value: 'CDD', label: 'CDD' }, { value: 'Stage', label: 'Stage' }] },
            { key: 'hire_date', label: 'Date embauche', type: 'date', required: true, width: '140px' },
            { key: 'department_id', label: 'Département', type: 'select', width: '180px', options: deptOptions.map(d => ({ value: d.id, label: d.name })) },
            { key: 'position_id', label: 'Poste', type: 'select', width: '180px', options: posOptions.map(p => ({ value: p.id, label: p.title })) },
            { key: 'base_salary', label: 'Salaire base', type: 'number', placeholder: '0', width: '110px' },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}
