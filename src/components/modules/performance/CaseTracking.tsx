import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Search, Eye, Pencil, Trash2, X, ChevronDown,
  FolderOpen, AlertCircle, Clock, CheckCircle2, PauseCircle,
  Users, FileText, BarChart2, RefreshCw, Zap, Upload,
  Download, Paperclip, Bell, ChevronRight, UserPlus, Tag
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

type Status = 'pending' | 'in_progress' | 'validation' | 'completed' | 'suspended';
type Complexity = 'simple' | 'medium' | 'complex' | 'strategic' | 'sensitive';

interface Assignment {
  id?: string;
  employee_id: string;
  assigned_by?: string;
  hierarchy_level: number;
  status: 'pending' | 'in_progress' | 'done' | 'delegated';
  reminder_count: number;
  last_reminded_at: string | null;
  alert_threshold_days: number;
  notes: string;
  employee?: { first_name: string; last_name: string; department?: { name: string } };
}

interface CaseFolder {
  id: string;
  reference: string;
  title: string;
  description: string;
  department_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string;
  status: Status;
  complexity: Complexity;
  complexity_coef: number;
  expected_deadline: string | null;
  actual_completion: string | null;
  is_urgent: boolean;
  reminder_count: number;
  return_count: number;
  documents_produced: number;
  supervisor_notes: string;
  is_confidential: boolean;
  document_path: string | null;
  document_name: string | null;
  document_uploaded_at: string | null;
  document_metadata: Record<string, string>;
  created_at: string;
  assignee?: { first_name: string; last_name: string };
  assigner?: { first_name: string; last_name: string };
  department?: { name: string };
  assignments?: Assignment[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
  department?: { name: string } | null;
  manager_id: string | null;
}

interface Department { id: string; name: string; }

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; coef: number; color: string; bg: string }> = {
  simple:    { label: 'Simple',      coef: 1, color: 'text-gray-600',  bg: 'bg-gray-100' },
  medium:    { label: 'Moyen',       coef: 2, color: 'text-blue-700',  bg: 'bg-blue-100' },
  complex:   { label: 'Complexe',    coef: 3, color: 'text-amber-700', bg: 'bg-amber-100' },
  strategic: { label: 'Stratégique', coef: 4, color: 'text-red-700',   bg: 'bg-red-100' },
  sensitive: { label: 'Sensible',    coef: 5, color: 'text-rose-700',  bg: 'bg-rose-100' },
};

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  pending:     { label: 'En attente',    icon: Clock,        color: 'text-gray-600',  bg: 'bg-gray-100' },
  in_progress: { label: 'En cours',      icon: RefreshCw,    color: 'text-blue-700',  bg: 'bg-blue-100' },
  validation:  { label: 'En validation', icon: Eye,          color: 'text-amber-700', bg: 'bg-amber-100' },
  completed:   { label: 'Terminé',       icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-100' },
  suspended:   { label: 'Suspendu',      icon: PauseCircle,  color: 'text-red-700',   bg: 'bg-red-100' },
};

const ASSIGN_STATUS_CONFIG = {
  pending:   { label: 'En attente', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  done:      { label: 'Terminé',   color: 'bg-green-100 text-green-700' },
  delegated: { label: 'Délégué',   color: 'bg-amber-100 text-amber-700' },
};

const METADATA_TYPES = [
  'Contrat', 'Courrier entrant', 'Courrier sortant', 'Note interne', 'Rapport',
  'Procès-verbal', 'Décision', 'Facture', 'Convention', 'Autre',
];

const EMPTY_FORM = {
  reference: '', title: '', description: '', department_id: '',
  status: 'pending' as Status, complexity: 'simple' as Complexity,
  complexity_coef: 1, expected_deadline: '', actual_completion: '',
  is_urgent: false, reminder_count: 0, return_count: 0,
  documents_produced: 0, supervisor_notes: '', is_confidential: false,
  doc_type: '', doc_keywords: '', doc_category: '',
};

export default function CaseTracking() {
  const { user, profile } = useAuth();
  const isAdmin = ['admin', 'drh', 'career_manager'].includes(profile?.role ?? '');
  const isManager = ['admin', 'drh', 'manager', 'career_manager'].includes(profile?.role ?? '');

  const [cases, setCases] = useState<CaseFolder[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterComplexity, setFilterComplexity] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selected, setSelected] = useState<CaseFolder | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);

    const [casesRes, empRes, deptRes, meRes] = await Promise.all([
      supabase.from('case_folders').select(`
        *,
        assignee:employees!case_folders_assigned_to_fkey(first_name, last_name),
        assigner:employees!case_folders_assigned_by_fkey(first_name, last_name),
        department:departments(name)
      `).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, first_name, last_name, department_id, manager_id, department:departments(name)')
        .eq('employment_status', 'active').order('last_name'),
      supabase.from('departments').select('id, name').order('name'),
      user ? supabase.from('employees').select('id, first_name, last_name, department_id, manager_id').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    if (casesRes.data) {
      const caseIds = casesRes.data.map((c: any) => c.id);
      let assignmentsMap: Record<string, Assignment[]> = {};
      if (caseIds.length > 0) {
        const { data: aData } = await supabase
          .from('case_folder_assignments')
          .select('*, employee:employees(first_name, last_name, department:departments(name))')
          .in('case_folder_id', caseIds)
          .order('hierarchy_level');
        if (aData) {
          for (const a of aData) {
            if (!assignmentsMap[a.case_folder_id]) assignmentsMap[a.case_folder_id] = [];
            assignmentsMap[a.case_folder_id].push(a);
          }
        }
      }
      setCases(casesRes.data.map((c: any) => ({ ...c, assignments: assignmentsMap[c.id] ?? [] })));
    }
    if (empRes.data) setAllEmployees(empRes.data as Employee[]);
    if (deptRes.data) setDepartments(deptRes.data);
    if (meRes.data) setCurrentEmployee(meRes.data as Employee);
    setLoading(false);
  };

  // Employés filtrés selon le contexte du manager (sa direction uniquement)
  const availableEmployees = useMemo(() => {
    if (isAdmin) return allEmployees;
    if (profile?.role === 'manager' && currentEmployee?.department_id) {
      return allEmployees.filter(e => e.department_id === currentEmployee.department_id);
    }
    return allEmployees;
  }, [allEmployees, isAdmin, profile?.role, currentEmployee]);

  // Sous-collaborateurs d'un agent (ceux dont manager_id = employee_id)
  const getSubordinates = (employeeId: string): Employee[] =>
    allEmployees.filter(e => e.manager_id === employeeId);

  const isOverdue = (c: CaseFolder) =>
    c.expected_deadline && c.status !== 'completed' && new Date(c.expected_deadline) < new Date();

  // Dossiers avec alerte active (pas de MAJ depuis threshold jours)
  const hasAlert = (c: CaseFolder) => {
    if (c.status === 'completed' || c.status === 'suspended') return false;
    const lastActivity = c.updated_at ? new Date(c.updated_at) : new Date(c.created_at);
    const daysSince = (Date.now() - lastActivity.getTime()) / 86400000;
    return daysSince > 3;
  };

  const filtered = useMemo(() => cases.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.reference.toLowerCase().includes(q)
      || `${c.assignee?.first_name} ${c.assignee?.last_name}`.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchComplexity = filterComplexity === 'all' || c.complexity === filterComplexity;
    const matchAlert = !alertsOnly || hasAlert(c) || isOverdue(c);
    return matchSearch && matchStatus && matchComplexity && matchAlert;
  }), [cases, search, filterStatus, filterComplexity, alertsOnly]);

  const stats = useMemo(() => {
    const total = cases.length;
    const completed = cases.filter(c => c.status === 'completed').length;
    const overdue = cases.filter(c => isOverdue(c)).length;
    const alerts = cases.filter(c => hasAlert(c)).length;
    const weightedTotal = cases.reduce((s, c) => s + c.complexity_coef, 0);
    const weightedDone = cases.filter(c => c.status === 'completed').reduce((s, c) => s + c.complexity_coef, 0);
    return { total, completed, overdue, alerts, weightedTotal, weightedDone };
  }, [cases]);

  // ─── Ouverture modals ───────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setAssignments([]);
    setUploadFile(null);
    setSelected(null); setViewMode(false); setShowModal(true);
  };

  const openView = async (c: CaseFolder) => {
    setSelected(c); setViewMode(true); setShowModal(true);
  };

  const openEdit = (c: CaseFolder) => {
    setSelected(c);
    setForm({
      reference: c.reference, title: c.title, description: c.description,
      department_id: c.department_id ?? '', status: c.status,
      complexity: c.complexity, complexity_coef: c.complexity_coef,
      expected_deadline: c.expected_deadline ?? '', actual_completion: c.actual_completion ?? '',
      is_urgent: c.is_urgent, reminder_count: c.reminder_count, return_count: c.return_count,
      documents_produced: c.documents_produced, supervisor_notes: c.supervisor_notes,
      is_confidential: c.is_confidential,
      doc_type: c.document_metadata?.type ?? '',
      doc_keywords: c.document_metadata?.keywords ?? '',
      doc_category: c.document_metadata?.category ?? '',
    });
    setAssignments(c.assignments ?? []);
    setUploadFile(null);
    setViewMode(false); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelected(null); setViewMode(false); setUploadFile(null); };

  const handleComplexityChange = (complexity: Complexity) =>
    setForm({ ...form, complexity, complexity_coef: COMPLEXITY_CONFIG[complexity].coef });

  // ─── Affectations multiples ─────────────────────────────────────────────────

  const addAssignment = (empId: string, level: number) => {
    if (assignments.find(a => a.employee_id === empId)) return;
    const emp = allEmployees.find(e => e.id === empId);
    setAssignments(prev => [...prev, {
      employee_id: empId,
      hierarchy_level: level,
      status: 'pending',
      reminder_count: 0,
      last_reminded_at: null,
      alert_threshold_days: 3,
      notes: '',
      employee: emp ? { first_name: emp.first_name, last_name: emp.last_name } : undefined,
    }]);
  };

  const removeAssignment = (empId: string) =>
    setAssignments(prev => prev.filter(a => a.employee_id !== empId));

  const updateAssignmentNotes = (empId: string, notes: string) =>
    setAssignments(prev => prev.map(a => a.employee_id === empId ? { ...a, notes } : a));

  // ─── Upload document ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setUploadFile(f);
  };

  const uploadDocument = async (caseId: string): Promise<{ path: string; name: string } | null> => {
    if (!uploadFile) return null;
    const ext = uploadFile.name.split('.').pop();
    const path = `${caseId}/${Date.now()}_${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('case-documents').upload(path, uploadFile, { upsert: true });
    if (error) { console.error(error); return null; }
    return { path, name: uploadFile.name };
  };

  const getDocumentUrl = async (path: string) => {
    const { data } = await supabase.storage.from('case-documents').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  const handleDownload = async (c: CaseFolder) => {
    if (!c.document_path) return;
    const url = await getDocumentUrl(c.document_path);
    if (url) { window.open(url, '_blank'); }
  };

  // ─── Sauvegarde ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(!!uploadFile);

    const primaryAssignee = assignments.find(a => a.hierarchy_level === 0)?.employee_id ?? null;

    const payload: any = {
      reference: form.reference,
      title: form.title,
      description: form.description,
      department_id: form.department_id || null,
      assigned_to: primaryAssignee,
      status: form.status,
      complexity: form.complexity,
      complexity_coef: form.complexity_coef,
      expected_deadline: form.expected_deadline || null,
      actual_completion: form.actual_completion || null,
      is_urgent: form.is_urgent,
      reminder_count: form.reminder_count,
      return_count: form.return_count,
      documents_produced: form.documents_produced,
      supervisor_notes: form.supervisor_notes,
      is_confidential: form.is_confidential,
      document_metadata: {
        type: form.doc_type,
        keywords: form.doc_keywords,
        category: form.doc_category,
      },
      updated_at: new Date().toISOString(),
    };

    let caseId = selected?.id;

    if (selected) {
      await supabase.from('case_folders').update(payload).eq('id', selected.id);
    } else {
      const { data } = await supabase.from('case_folders').insert({
        ...payload,
        assigned_by: currentEmployee?.id ?? null,
      }).select('id').single();
      caseId = data?.id;
    }

    if (caseId && uploadFile) {
      const uploaded = await uploadDocument(caseId);
      if (uploaded) {
        await supabase.from('case_folders').update({
          document_path: uploaded.path,
          document_name: uploaded.name,
          document_uploaded_at: new Date().toISOString(),
        }).eq('id', caseId);
      }
    }

    // Synchroniser les affectations
    if (caseId) {
      // Supprimer les anciennes si modification
      if (selected) {
        await supabase.from('case_folder_assignments').delete().eq('case_folder_id', caseId);
      }
      if (assignments.length > 0) {
        await supabase.from('case_folder_assignments').insert(
          assignments.map(a => ({
            case_folder_id: caseId,
            employee_id: a.employee_id,
            assigned_by: currentEmployee?.id ?? null,
            hierarchy_level: a.hierarchy_level,
            status: a.status,
            alert_threshold_days: a.alert_threshold_days,
            notes: a.notes,
          }))
        );
      }
    }

    setUploading(false);
    closeModal();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce dossier ?')) return;
    await supabase.from('case_folders').delete().eq('id', id);
    load();
  };

  const handleRemind = async (caseId: string, assignmentId?: string) => {
    if (assignmentId) {
      await supabase.from('case_folder_assignments').update({
        reminder_count: supabase.rpc as any,
        last_reminded_at: new Date().toISOString(),
      }).eq('id', assignmentId);
    }
    await supabase.from('case_folders').update({
      reminder_count: (cases.find(c => c.id === caseId)?.reminder_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', caseId);
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total dossiers', value: stats.total, icon: FolderOpen, color: 'blue' },
          { label: 'Terminés', value: stats.completed, icon: CheckCircle2, color: 'green' },
          { label: 'En retard', value: stats.overdue, icon: AlertCircle, color: 'red' },
          { label: 'Alertes actives', value: stats.alerts, icon: Bell, color: 'amber', clickable: true },
          { label: 'Charge pondérée', value: `${stats.weightedDone}/${stats.weightedTotal}`, icon: BarChart2, color: 'slate' },
        ].map(({ label, value, icon: Icon, color, clickable }) => (
          <button
            key={label}
            onClick={clickable ? () => setAlertsOnly(v => !v) : undefined}
            className={`bg-white rounded-xl border p-3 flex items-center gap-3 text-left transition-all
              ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
              ${clickable && alertsOnly ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
          >
            <div className={`p-2 rounded-lg bg-${color}-50 flex-shrink-0`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </button>
        ))}
      </div>

      {alertsOnly && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <Bell className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">Filtrage alertes actif — dossiers sans mise à jour depuis 3+ jours ou en retard</span>
          <button onClick={() => setAlertsOnly(false)} className="ml-auto text-amber-500 hover:text-amber-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un dossier, un agent..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="all">Tous statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterComplexity} onChange={e => setFilterComplexity(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="all">Toute complexité</option>
            {Object.entries(COMPLEXITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label} (×{v.coef})</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {isManager && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Nouveau dossier
          </button>
        )}
      </div>

      {/* Légende complexité */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(COMPLEXITY_CONFIG).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${v.bg} ${v.color}`}>
            Coef ×{v.coef} — {v.label}
          </span>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun dossier trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                {['Réf / Titre', 'Agents affectés', 'Statut', 'Complexité', 'Délai prévu', 'Document', 'Alertes', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const sc = STATUS_CONFIG[c.status];
                const StatusIcon = sc.icon;
                const cc = COMPLEXITY_CONFIG[c.complexity];
                const overdue = isOverdue(c);
                const alert = hasAlert(c);
                const agentsCount = (c.assignments?.length ?? 0) || (c.assigned_to ? 1 : 0);
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors
                    ${overdue ? 'bg-red-50/40' : alert ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex gap-1 flex-shrink-0 mt-0.5">
                          {c.is_urgent && <Zap className="h-3.5 w-3.5 text-amber-500" />}
                          {c.is_confidential && <span className="text-xs bg-gray-800 text-white px-1 rounded leading-tight">CONF</span>}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-mono">{c.reference}</p>
                          <p className="text-sm font-semibold text-gray-900 max-w-xs truncate">{c.title}</p>
                          {c.department && <p className="text-xs text-gray-400">{c.department.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {c.assignments && c.assignments.length > 0 ? (
                        <div className="space-y-0.5">
                          {c.assignments.slice(0, 3).map(a => (
                            <div key={a.employee_id} className="flex items-center gap-1.5">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0
                                ${a.hierarchy_level === 0 ? 'bg-blue-600' : a.hierarchy_level === 1 ? 'bg-teal-500' : 'bg-gray-400'}`}>
                                {a.hierarchy_level + 1}
                              </div>
                              <span className="text-xs text-gray-700 truncate max-w-28">
                                {a.employee?.first_name} {a.employee?.last_name}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${ASSIGN_STATUS_CONFIG[a.status].color}`}>
                                {ASSIGN_STATUS_CONFIG[a.status].label}
                              </span>
                            </div>
                          ))}
                          {c.assignments.length > 3 && (
                            <p className="text-xs text-gray-400">+{c.assignments.length - 3} autre{c.assignments.length - 3 > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      ) : c.assignee ? (
                        <span className="text-sm text-gray-700">{c.assignee.first_name} {c.assignee.last_name}</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Non affecté</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                        <StatusIcon className="h-3 w-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${cc.bg} ${cc.color}`}>
                        ×{c.complexity_coef} {cc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      {c.expected_deadline ? (
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                          {new Date(c.expected_deadline).toLocaleDateString('fr-FR')}
                          {overdue && <span className="block text-xs">(retard)</span>}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {c.document_path ? (
                        <button onClick={() => handleDownload(c)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-medium transition-colors">
                          <Download className="h-3 w-3" />
                          <span className="max-w-20 truncate">{c.document_name ?? 'Télécharger'}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Aucun</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(overdue || alert) && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold
                            ${overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            <Bell className="h-3 w-3" />
                            {overdue ? 'Retard' : 'Inactif'}
                          </span>
                        )}
                        {c.reminder_count > 0 && (
                          <span className="text-xs text-amber-600 font-bold">{c.reminder_count}×</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        {isManager && (
                          <>
                            <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {(overdue || alert) && (
                              <button onClick={() => handleRemind(c.id)} title="Envoyer une relance"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded">
                                <Bell className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[93vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {viewMode ? 'Détail du dossier' : selected ? 'Modifier le dossier' : 'Nouveau dossier'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {viewMode && selected ? (
                <ViewMode case_={selected} onDownload={handleDownload} />
              ) : (
                <form id="case-form" onSubmit={handleSubmit} className="space-y-6">

                  {/* Infos principales */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Référence *</label>
                      <input required value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Direction / Service</label>
                      <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        disabled={profile?.role === 'manager'}>
                        <option value="">— Sélectionner —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé *</label>
                    <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Affectation hiérarchique */}
                  <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        Affectation des agents
                      </h3>
                      <p className="text-xs text-gray-400">Niveau 1 = responsable principal, 2 = délégué, 3 = sous-délégué...</p>
                    </div>

                    {/* Agents déjà affectés */}
                    {assignments.length > 0 && (
                      <div className="space-y-2">
                        {assignments.map(a => {
                          const subs = getSubordinates(a.employee_id);
                          return (
                            <div key={a.employee_id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                                  ${a.hierarchy_level === 0 ? 'bg-blue-600' : a.hierarchy_level === 1 ? 'bg-teal-500' : 'bg-gray-400'}`}>
                                  {a.hierarchy_level + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {a.employee?.first_name} {a.employee?.last_name}
                                  </p>
                                  <input value={a.notes} onChange={e => updateAssignmentNotes(a.employee_id, e.target.value)}
                                    placeholder="Note pour cet agent..."
                                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-400" />
                                </div>
                                <button type="button" onClick={() => removeAssignment(a.employee_id)}
                                  className="p-1 text-red-400 hover:text-red-600 flex-shrink-0">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              {/* Sous-collaborateurs disponibles */}
                              {subs.length > 0 && (
                                <div className="mt-2 ml-9 flex flex-wrap gap-2">
                                  {subs.filter(s => !assignments.find(a2 => a2.employee_id === s.id)).map(sub => (
                                    <button key={sub.id} type="button"
                                      onClick={() => addAssignment(sub.id, a.hierarchy_level + 1)}
                                      className="flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs hover:bg-teal-100 transition-colors">
                                      <ChevronRight className="h-3 w-3" />
                                      Déléguer à {sub.first_name} {sub.last_name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Ajouter un agent */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ajouter un agent{profile?.role === 'manager' ? ' (votre direction uniquement)' : ''}
                      </label>
                      <select onChange={e => { if (e.target.value) { addAssignment(e.target.value, 0); e.target.value = ''; } }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">— Sélectionner un agent à affecter —</option>
                        {availableEmployees
                          .filter(e => !assignments.find(a => a.employee_id === e.id))
                          .map(e => (
                            <option key={e.id} value={e.id}>
                              {e.first_name} {e.last_name}{e.department ? ` — ${(e.department as any).name}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Statut, complexité, délais */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complexité</label>
                      <select value={form.complexity} onChange={e => handleComplexityChange(e.target.value as Complexity)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        {Object.entries(COMPLEXITY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label} (×{v.coef})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Délai prévu</label>
                      <input type="date" value={form.expected_deadline} onChange={e => setForm({ ...form, expected_deadline: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date clôture</label>
                      <input type="date" value={form.actual_completion} onChange={e => setForm({ ...form, actual_completion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retours correction</label>
                      <input type="number" min={0} value={form.return_count} onChange={e => setForm({ ...form, return_count: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Documents produits</label>
                      <input type="number" min={0} value={form.documents_produced} onChange={e => setForm({ ...form, documents_produced: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_urgent} onChange={e => setForm({ ...form, is_urgent: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">Urgent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_confidential} onChange={e => setForm({ ...form, is_confidential: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-gray-700" />
                      <span className="text-sm font-medium text-gray-700">Confidentiel</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observations du supérieur</label>
                    <textarea rows={2} value={form.supervisor_notes} onChange={e => setForm({ ...form, supervisor_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Section Document scanné */}
                  <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Document physique scanné
                      <span className="ml-1 text-xs font-normal text-blue-600">(PDF, image, Word, Excel — max 20 Mo)</span>
                    </h3>

                    {/* Fichier existant */}
                    {selected?.document_path && !uploadFile && (
                      <div className="flex items-center gap-3 bg-white rounded-lg border border-blue-200 p-3">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{selected.document_name}</p>
                          {selected.document_uploaded_at && (
                            <p className="text-xs text-gray-400">
                              Chargé le {new Date(selected.document_uploaded_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <button type="button" onClick={() => handleDownload(selected)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">
                          <Download className="h-3.5 w-3.5" /> Télécharger
                        </button>
                      </div>
                    )}

                    {/* Upload */}
                    <div>
                      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx,.xls,.xlsx" />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm w-full justify-center transition-colors">
                        <Upload className="h-4 w-4" />
                        {uploadFile ? uploadFile.name : selected?.document_path ? 'Remplacer le document' : 'Charger le document scanné'}
                      </button>
                      {uploadFile && (
                        <div className="mt-2 flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-blue-700 truncate">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} Ko)</span>
                          <button type="button" onClick={() => setUploadFile(null)} className="text-blue-400 hover:text-blue-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Métadonnées M-Files */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <Tag className="h-3 w-3" /> Type de document
                        </label>
                        <select value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500">
                          <option value="">— Sélectionner —</option>
                          {METADATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie / Classe</label>
                        <input value={form.doc_category} onChange={e => setForm({ ...form, doc_category: e.target.value })}
                          placeholder="ex: RH, Finance, Juridique"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Mots-clés (M-Files)</label>
                        <input value={form.doc_keywords} onChange={e => setForm({ ...form, doc_keywords: e.target.value })}
                          placeholder="ex: contrat, 2026, fournisseur"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      Les métadonnées (type, catégorie, mots-clés) sont stockées en JSON et peuvent être exportées vers M-Files pour une recherche documentaire optimisée.
                    </p>
                  </div>

                </form>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0">
              <button onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                {viewMode ? 'Fermer' : 'Annuler'}
              </button>
              {!viewMode && (
                <button form="case-form" type="submit" disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-60">
                  {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                  {selected ? 'Mettre à jour' : 'Créer le dossier'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant vue détail ───────────────────────────────────────────────────

function ViewMode({ case_: c, onDownload }: { case_: CaseFolder; onDownload: (c: CaseFolder) => void }) {
  const sc = STATUS_CONFIG[c.status];
  const cc = COMPLEXITY_CONFIG[c.complexity];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <p className="text-xs font-mono text-gray-400">{c.reference}</p>
          <h3 className="text-2xl font-bold text-gray-900">{c.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {c.is_urgent && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Zap className="h-3 w-3" />Urgent</span>}
            {c.is_confidential && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-white">Confidentiel</span>}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.color}`}>{sc.label}</span>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${cc.bg} ${cc.color}`}>{cc.label} ×{c.complexity_coef}</span>
          </div>
        </div>
      </div>

      {c.description && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.description}</p>
        </div>
      )}

      {/* Affectations hiérarchiques */}
      {c.assignments && c.assignments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />Agents affectés — structure hiérarchique
          </p>
          <div className="space-y-2">
            {c.assignments.map((a, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border
                ${a.hierarchy_level === 0 ? 'bg-blue-50 border-blue-200' :
                  a.hierarchy_level === 1 ? 'bg-teal-50 border-teal-200 ml-6' :
                  'bg-gray-50 border-gray-200 ml-12'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5
                  ${a.hierarchy_level === 0 ? 'bg-blue-600' : a.hierarchy_level === 1 ? 'bg-teal-500' : 'bg-gray-400'}`}>
                  {a.hierarchy_level + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{a.employee?.first_name} {a.employee?.last_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${ASSIGN_STATUS_CONFIG[a.status].color}`}>
                      {ASSIGN_STATUS_CONFIG[a.status].label}
                    </span>
                    {a.reminder_count > 0 && (
                      <span className="text-xs text-amber-600">{a.reminder_count} relance{a.reminder_count > 1 ? 's' : ''}</span>
                    )}
                    {a.last_reminded_at && (
                      <span className="text-xs text-gray-400">Dernière relance : {new Date(a.last_reminded_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  {a.notes && <p className="text-xs text-gray-600 mt-1 italic">{a.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Délai prévu</p>
          <p className="text-sm font-bold">{c.expected_deadline ? new Date(c.expected_deadline).toLocaleDateString('fr-FR') : '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Date clôture</p>
          <p className="text-sm font-bold">{c.actual_completion ? new Date(c.actual_completion).toLocaleDateString('fr-FR') : '—'}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-amber-600 mb-1">Relances</p>
          <p className="text-xl font-black text-amber-700">{c.reminder_count}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-xs text-red-600 mb-1">Retours correction</p>
          <p className="text-xl font-black text-red-700">{c.return_count}</p>
        </div>
      </div>

      {/* Document scanné */}
      {c.document_path && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5" />Document physique scanné
          </p>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{c.document_name}</p>
              {c.document_uploaded_at && (
                <p className="text-xs text-gray-500">Chargé le {new Date(c.document_uploaded_at).toLocaleDateString('fr-FR')}</p>
              )}
              {c.document_metadata && Object.keys(c.document_metadata).some(k => c.document_metadata[k]) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.document_metadata.type && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{c.document_metadata.type}</span>
                  )}
                  {c.document_metadata.category && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{c.document_metadata.category}</span>
                  )}
                  {c.document_metadata.keywords && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      Mots-clés : {c.document_metadata.keywords}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => onDownload(c)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Download className="h-4 w-4" /> Télécharger
            </button>
          </div>
        </div>
      )}

      {c.supervisor_notes && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />Observations du supérieur
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.supervisor_notes}</p>
        </div>
      )}
    </div>
  );
}
