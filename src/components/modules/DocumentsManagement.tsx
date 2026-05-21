import { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Download, CheckCircle, XCircle, Clock,
  AlertCircle, Eye, X, Save, Printer, Filter, ChevronDown, Stamp,
  Briefcase, DollarSign, Calendar, Star, File, ChevronRight, TableProperties
} from 'lucide-react';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateDocumentByType } from '../../utils/attestationPDF';
import type { UserRole } from '../../lib/database.types';

interface DocumentsManagementProps {
  role: UserRole;
}

interface DocumentRequest {
  id: string;
  employee_id: string;
  request_type: string;
  purpose: string | null;
  additional_notes: string | null;
  status: string;
  processed_at: string | null;
  rejection_reason: string | null;
  urgency: string;
  copies_count: number;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_number: string;
    hire_date: string;
    contract_type: string | null;
    current_salary: number | null;
    department: { name: string } | null;
    position: { title: string } | null;
  } | null;
}

const REQUEST_TYPES: Record<string, { label: string; icon: React.FC<any>; color: string; desc: string }> = {
  attestation_travail: {
    label: "Attestation de travail",
    icon: Briefcase,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    desc: "Justifie votre emploi aupres de tiers",
  },
  certificat_salaire: {
    label: "Certificat de salaire",
    icon: DollarSign,
    color: "text-green-600 bg-green-50 border-green-200",
    desc: "Pour demarches bancaires et administratives",
  },
  attestation_presence: {
    label: "Attestation de presence",
    icon: Calendar,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    desc: "Confirme votre presence en activite",
  },
  attestation_conge: {
    label: "Attestation de conge",
    icon: Calendar,
    color: "text-teal-600 bg-teal-50 border-teal-200",
    desc: "Justificatif de conge approuve",
  },
  lettre_recommandation: {
    label: "Lettre de recommandation",
    icon: Star,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    desc: "Recommandation professionnelle de la direction",
  },
  bulletin_paie: {
    label: "Duplicata bulletin de paie",
    icon: FileText,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    desc: "Copie de votre bulletin de salaire",
  },
  contrat_travail: {
    label: "Copie du contrat de travail",
    icon: File,
    color: "text-red-600 bg-red-50 border-red-200",
    desc: "Exemplaire de votre contrat",
  },
  autre: {
    label: "Autre document",
    icon: FileText,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    desc: "Tout autre document RH",
  },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<any>; style: string }> = {
  pending: { label: "En attente", icon: Clock, style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  approved: { label: "Approuvee", icon: CheckCircle, style: "bg-blue-50 text-blue-700 border-blue-200" },
  ready: { label: "Disponible", icon: CheckCircle, style: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejetee", icon: XCircle, style: "bg-red-50 text-red-700 border-red-200" },
};

const isHR = (role: UserRole) =>
  ['drh', 'admin', 'career_manager', 'payroll_manager'].includes(role);

export default function DocumentsManagement({ role }: DocumentsManagementProps) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [myEmployee, setMyEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<DocumentRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<DocumentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'requests' | 'generate'>('requests');

  const [formData, setFormData] = useState({
    employee_id: '',
    request_type: 'attestation_travail',
    purpose: '',
    additional_notes: '',
    urgency: 'normal',
    copies_count: 1,
  });

  useEffect(() => {
    loadData();
  }, [profile, role]);

  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);

      if (!isHR(role)) {
        const { data: emp } = await supabase
          .from('employees')
          .select(`
            id, first_name, last_name, employee_number, hire_date, contract_type, current_salary,
            department:departments(name), position:positions(title)
          `)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (emp) {
          setMyEmployee(emp);
          const { data: reqs } = await supabase
            .from('document_requests')
            .select('*')
            .eq('employee_id', emp.id)
            .order('created_at', { ascending: false });
          setRequests((reqs || []) as DocumentRequest[]);
        }
      } else {
        const [reqsRes, empsRes] = await Promise.all([
          supabase
            .from('document_requests')
            .select(`
              *,
              employee:employees!document_requests_employee_id_fkey(
                first_name, last_name, employee_number, hire_date, contract_type, current_salary,
                department:departments(name), position:positions(title)
              )
            `)
            .order('created_at', { ascending: false }),
          supabase
            .from('employees')
            .select(`
              id, first_name, last_name, employee_number, hire_date, contract_type, current_salary,
              department:departments(name), position:positions(title)
            `)
            .eq('employment_status', 'active')
            .order('last_name'),
        ]);
        setRequests((reqsRes.data || []) as unknown as DocumentRequest[]);
        setEmployees((empsRes.data || []) as any[]);
      }
    } catch (error) {
      console.error('Error loading documents data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const empId = isHR(role) ? formData.employee_id : myEmployee?.id;
      if (!empId) throw new Error("Employe non identifie");

      const { error } = await supabase.from('document_requests').insert({
        employee_id: empId,
        request_type: formData.request_type,
        purpose: formData.purpose || null,
        additional_notes: formData.additional_notes || null,
        urgency: formData.urgency,
        copies_count: formData.copies_count,
      });
      if (error) throw error;

      setShowRequestForm(false);
      setFormData({ employee_id: '', request_type: 'attestation_travail', purpose: '', additional_notes: '', urgency: 'normal', copies_count: 1 });
      await loadData();
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const batchSaveDocRequests = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const payload = {
        employee_id: String(row.employee_id || ''),
        request_type: String(row.request_type || 'attestation_travail'),
        purpose: row.purpose ? String(row.purpose) : null,
        additional_notes: row.additional_notes ? String(row.additional_notes) : null,
        urgency: String(row.urgency || 'normal'),
        copies_count: row.copies_count ? Number(row.copies_count) : 1,
      };
      const { error } = await supabase.from('document_requests').insert(payload);
      if (error) errors.push(error.message);
      else success++;
    }
    loadData();
    return { success, errors };
  };

  const handleApprove = async (request: DocumentRequest) => {
    try {
      await supabase.from('document_requests').update({
        status: 'approved',
        processed_by: profile?.id,
        processed_at: new Date().toISOString(),
      }).eq('id', request.id);
      await loadData();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleMarkReady = async (request: DocumentRequest) => {
    try {
      await supabase.from('document_requests').update({
        status: 'ready',
        processed_by: profile?.id,
        processed_at: new Date().toISOString(),
      }).eq('id', request.id);
      await loadData();
    } catch (error) {
      console.error('Error marking ready:', error);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    try {
      await supabase.from('document_requests').update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        processed_by: profile?.id,
        processed_at: new Date().toISOString(),
      }).eq('id', showRejectModal.id);
      setShowRejectModal(null);
      setRejectionReason('');
      await loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleGenerateDirect = (empId: string, type: string) => {
    const emp = employees.find(e => e.id === empId) || myEmployee;
    if (!emp) return;
    generateDocumentByType(type, emp);
  };

  const handleGenerateFromRequest = (request: DocumentRequest) => {
    const emp = request.employee || myEmployee;
    if (!emp) return;
    generateDocumentByType(request.request_type, emp);
  };

  const filteredRequests = requests.filter((r) => {
    const search = searchQuery.toLowerCase();
    const empName = r.employee
      ? `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase()
      : '';
    const matchSearch = !search || empName.includes(search) ||
      REQUEST_TYPES[r.request_type]?.label.toLowerCase().includes(search);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchType = filterType === 'all' || r.request_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    ready: requests.filter(r => r.status === 'ready').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-snh-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documents & Attestations</h1>
          <p className="text-slate-600 mt-1">
            {isHR(role)
              ? "Gestion des demandes de documents et generation d'attestations"
              : "Demandez et telechargez vos documents RH"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isHR(role) && (
            <button
              onClick={() => setShowBatch(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-medium"
            >
              <TableProperties className="w-4 h-4" />
              Saisie par lots
            </button>
          )}
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium"
          >
            <Plus className="w-4 h-4" />
            {isHR(role) ? 'Nouvelle demande' : 'Demander un document'}
          </button>
        </div>
      </div>

      {isHR(role) && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total demandes', value: stats.total, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
            { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
            { label: 'Disponibles', value: stats.ready, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Rejetees', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                  </div>
                  <div className={`p-3 ${s.bg} rounded-xl`}>
                    <Icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isHR(role) && (
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4">
          {[
            { id: 'requests', label: 'Demandes recues', icon: FileText },
            { id: 'generate', label: 'Generation rapide', icon: Printer },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition ${
                  activeView === tab.id
                    ? 'border-snh-green text-snh-green'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {(!isHR(role) || activeView === 'requests') && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row gap-3">
              {isHR(role) && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par employe ou type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green"
                  />
                </div>
              )}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green bg-white"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green bg-white"
              >
                <option value="all">Tous les types</option>
                {Object.entries(REQUEST_TYPES).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-14 h-14 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Aucune demande de document</p>
              <p className="text-slate-400 text-sm mt-1">
                {filterStatus !== 'all' || filterType !== 'all'
                  ? 'Aucun resultat pour ces filtres'
                  : 'Cliquez sur "Demander un document" pour commencer'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((request) => {
                const typeConfig = REQUEST_TYPES[request.request_type];
                const statusConfig = STATUS_CONFIG[request.status];
                const TypeIcon = typeConfig?.icon || FileText;
                const StatusIcon = statusConfig?.icon || Clock;

                return (
                  <div
                    key={request.id}
                    className="p-5 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setShowDetailModal(request)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl border ${typeConfig?.color || 'bg-slate-50 text-slate-600 border-slate-200'} flex-shrink-0`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{typeConfig?.label || request.request_type}</p>
                            {isHR(role) && request.employee && (
                              <p className="text-sm text-slate-500 mt-0.5">
                                {request.employee.first_name} {request.employee.last_name} — {request.employee.department?.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {request.urgency === 'urgent' && (
                              <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full">
                                Urgent
                              </span>
                            )}
                            <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig?.style}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig?.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <p className="text-xs text-slate-400">
                            Demande le {formatDate(request.created_at)}
                          </p>
                          {request.copies_count > 1 && (
                            <p className="text-xs text-slate-500">{request.copies_count} exemplaires</p>
                          )}
                          {request.purpose && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">Motif: {request.purpose}</p>
                          )}
                        </div>

                        {isHR(role) && request.status === 'pending' && (
                          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleApprove(request)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approuver
                            </button>
                            <button
                              onClick={() => { setShowRejectModal(request); setRejectionReason(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Rejeter
                            </button>
                          </div>
                        )}

                        {isHR(role) && request.status === 'approved' && (
                          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleGenerateFromRequest(request)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Generer le document
                            </button>
                            <button
                              onClick={() => handleMarkReady(request)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Marquer pret
                            </button>
                          </div>
                        )}

                        {!isHR(role) && request.status === 'ready' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateFromRequest(request); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 mt-3 text-xs font-medium bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Telecharger / Imprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isHR(role) && activeView === 'generate' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Generation rapide d'attestations</h2>
          <p className="text-sm text-slate-500 mb-6">Selectionnez un employe et generez directement un document sans passer par le workflow de demande.</p>

          <GenerateQuickForm employees={employees} onGenerate={handleGenerateDirect} />
        </div>
      )}

      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Demande de document</h2>
                <p className="text-sm text-slate-500 mt-0.5">Remplissez le formulaire de demande</p>
              </div>
              <button onClick={() => setShowRequestForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {isHR(role) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Employe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green bg-white"
                  >
                    <option value="">Selectionner un employe</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.last_name} {emp.first_name} — {emp.department?.name || '—'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type de document <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(REQUEST_TYPES).map(([val, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, request_type: val })}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition ${
                          formData.request_type === val
                            ? 'border-snh-green bg-green-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-lg border ${cfg.color} flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{cfg.label}</p>
                          <p className="text-xs text-slate-500">{cfg.desc}</p>
                        </div>
                        {formData.request_type === val && (
                          <CheckCircle className="w-4 h-4 text-snh-green ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motif / Destination</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Ex: Dossier bancaire, demande de visa..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Urgence</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nb d'exemplaires</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.copies_count}
                    onChange={(e) => setFormData({ ...formData, copies_count: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes supplementaires</label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  rows={2}
                  placeholder="Precisions supplementaires (optionnel)..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-5 py-2.5 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Soumettre la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Detail de la demande</h2>
              <button onClick={() => setShowDetailModal(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: 'Type', value: REQUEST_TYPES[showDetailModal.request_type]?.label },
                ...(isHR(role) && showDetailModal.employee
                  ? [{ label: 'Employe', value: `${showDetailModal.employee.first_name} ${showDetailModal.employee.last_name}` }]
                  : []),
                { label: 'Statut', value: STATUS_CONFIG[showDetailModal.status]?.label },
                { label: 'Urgence', value: showDetailModal.urgency === 'urgent' ? 'Urgent' : 'Normal' },
                { label: 'Exemplaires', value: String(showDetailModal.copies_count) },
                { label: 'Motif', value: showDetailModal.purpose || '—' },
                { label: 'Notes', value: showDetailModal.additional_notes || '—' },
                { label: 'Date demande', value: formatDate(showDetailModal.created_at) },
                ...(showDetailModal.rejection_reason
                  ? [{ label: 'Motif de rejet', value: showDetailModal.rejection_reason }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="text-sm font-medium text-slate-500 w-32 flex-shrink-0">{label}</span>
                  <span className="text-sm text-slate-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              {isHR(role) && (showDetailModal.status === 'approved' || showDetailModal.status === 'ready') && (
                <button
                  onClick={() => { handleGenerateFromRequest(showDetailModal); setShowDetailModal(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Generer
                </button>
              )}
              {!isHR(role) && showDetailModal.status === 'ready' && (
                <button
                  onClick={() => { handleGenerateFromRequest(showDetailModal); setShowDetailModal(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Telecharger
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Rejeter la demande</h2>
              <button onClick={() => setShowRejectModal(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Vous allez rejeter la demande de
                <strong> {REQUEST_TYPES[showRejectModal.request_type]?.label}</strong>
                {showRejectModal.employee && ` de ${showRejectModal.employee.first_name} ${showRejectModal.employee.last_name}`}.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motif du rejet (optionnel)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Expliquez pourquoi la demande est rejetee..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatch && (
        <BatchEntryTable<Record<string, unknown>>
          title="Demandes de documents"
          onClose={() => setShowBatch(false)}
          onSave={batchSaveDocRequests}
          initialRows={5}
          emptyRow={() => ({ employee_id: '', request_type: 'attestation_travail', purpose: '', urgency: 'normal', copies_count: '1' })}
          columns={[
            { key: 'employee_id', label: 'Agent', type: 'select', required: true, width: '200px', options: employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
            { key: 'request_type', label: 'Type de document', type: 'select', required: true, width: '200px', options: Object.entries(REQUEST_TYPES).map(([v, c]) => ({ value: v, label: c.label })) },
            { key: 'purpose', label: 'Destination / Motif', type: 'text', placeholder: 'Banque, Ambassade…', width: '180px' },
            { key: 'urgency', label: 'Urgence', type: 'select', width: '100px', options: [{ value: 'normal', label: 'Normal' }, { value: 'urgent', label: 'Urgent' }] },
            { key: 'copies_count', label: 'Exemplaires', type: 'number', placeholder: '1', width: '100px' },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}

function GenerateQuickForm({ employees, onGenerate }: { employees: any[]; onGenerate: (empId: string, type: string) => void }) {
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedType, setSelectedType] = useState('attestation_travail');

  const generableTypes = Object.keys(REQUEST_TYPES);

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Employe <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedEmp}
          onChange={(e) => setSelectedEmp(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-snh-green bg-white"
        >
          <option value="">Selectionner un employe</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.last_name} {emp.first_name} — {emp.department?.name || '—'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Type d'attestation</label>
        <div className="grid grid-cols-1 gap-2">
          {generableTypes.map((type) => {
            const cfg = REQUEST_TYPES[type];
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition ${
                  selectedType === type ? 'border-snh-green bg-green-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg border ${cfg.color} flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{cfg.label}</p>
                  <p className="text-xs text-slate-500">{cfg.desc}</p>
                </div>
                {selectedType === type && (
                  <CheckCircle className="w-4 h-4 text-snh-green ml-auto flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => { if (selectedEmp) onGenerate(selectedEmp, selectedType); }}
        disabled={!selectedEmp}
        className="flex items-center gap-2 px-5 py-2.5 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Printer className="w-4 h-4" />
        Generer et imprimer
      </button>
    </div>
  );
}
