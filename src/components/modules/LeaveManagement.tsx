import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, Check, X, FileText, Download, TableProperties } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../lib/database.types';
import { LeaveRequestForm } from './LeaveRequestForm';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';

interface LeaveManagementProps {
  role: UserRole;
}

export function LeaveManagement({ role }: LeaveManagementProps) {
  const { profile } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  useEffect(() => {
    loadData();
    supabase.from('employees').select('id, first_name, last_name').eq('employment_status', 'active').order('first_name').then(({ data }) => setEmployeeOptions(data || []));
  }, [profile, role]);

  const loadData = async () => {
    try {
      const [typesResponse, requestsResponse] = await Promise.all([
        supabase.from('leave_types').select('*'),
        loadLeaveRequests()
      ]);

      setLeaveTypes(typesResponse.data || []);
      setLeaveRequests(requestsResponse || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    if (!profile) return [];

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employees!leave_requests_employee_id_fkey (first_name, last_name, employee_number),
        leave_types (name, color)
      `)
      .order('created_at', { ascending: false });

    if (role === 'employee') {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (employee) {
        query = query.eq('employee_id', employee.id);
      }
    }

    const { data } = await query;
    return data || [];
  };

  const downloadMedicalCertificate = async (certificateUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-certificates')
        .download(certificateUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Erreur lors du téléchargement du certificat médical');
    }
  };

  const handleApprove = async (requestId: string) => {
    const request = leaveRequests.find(r => r.id === requestId);
    const isSickLeave = request?.leave_types?.name.toLowerCase().includes('maladie');

    if (isSickLeave && !request?.medical_certificate_url) {
      alert('Cette demande de congé maladie ne peut pas être approuvée car le certificat médical n\'a pas été fourni.');
      return;
    }

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
        })
        .eq('id', requestId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error approving leave request:', error);
      alert('Erreur lors de l\'approbation de la demande');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Motif du rejet (optionnel):');
    if (reason === null) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
          rejection_reason: reason || null,
        })
        .eq('id', requestId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      alert('Erreur lors du rejet de la demande');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-slate-100 text-slate-800',
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      cancelled: 'Annulé',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const filteredRequests = filterStatus === 'all'
    ? leaveRequests
    : leaveRequests.filter(req => req.status === filterStatus);

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  };

  const batchSaveLeaves = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const start = String(row.start_date || '');
      const end = String(row.end_date || '');
      const days = start && end
        ? Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
        : 1;
      const payload = {
        employee_id: String(row.employee_id || ''),
        leave_type_id: row.leave_type_id ? String(row.leave_type_id) : null,
        start_date: start,
        end_date: end,
        days_count: days,
        reason: row.reason ? String(row.reason) : null,
        status: 'approved',
      };
      const { error } = await supabase.from('leave_requests').insert(payload);
      if (error) errors.push(error.message);
      else success++;
    }
    loadData();
    return { success, errors };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Congés</h1>
          <p className="text-slate-600 mt-1">
            {role === 'employee' ? 'Mes demandes de congés' : 'Vue d\'ensemble des congés'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {role === 'employee' && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition"
            >
              <Plus className="w-5 h-5" />
              Nouvelle demande
            </button>
          )}
          {role !== 'employee' && (
            <button
              onClick={() => setShowBatch(true)}
              className="flex items-center gap-2 bg-slate-700 text-white px-5 py-3 rounded-lg font-medium hover:bg-slate-600 transition"
            >
              <TableProperties className="w-5 h-5" />
              Saisie par lots
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total</span>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">En attente</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Approuvés</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.approved}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Rejetés</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.rejected}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'all'
                ? 'bg-snh-green text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'pending'
                ? 'bg-snh-green text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'approved'
                ? 'bg-snh-green text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Approuvés
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'rejected'
                ? 'bg-snh-green text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Rejetés
          </button>
        </div>

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Aucune demande trouvée</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 rounded-lg">
                      {getStatusIcon(request.status)}
                    </div>
                    <div>
                      {role !== 'employee' && (
                        <p className="font-bold text-slate-900 mb-1">
                          {request.employees?.first_name} {request.employees?.last_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: request.leave_types?.color }}
                        ></div>
                        <p className="font-medium text-slate-900">{request.leave_types?.name}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(request.start_date).toLocaleDateString('fr-FR')} - {new Date(request.end_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium">{request.days_count} jours</span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {request.reason && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-700">{request.reason}</p>
                  </div>
                )}

                {request.medical_certificate_url && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Certificat médical</p>
                          <p className="text-xs text-blue-700">{request.medical_certificate_name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadMedicalCertificate(request.medical_certificate_url, request.medical_certificate_name)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                )}

                {request.leave_types?.name.toLowerCase().includes('maladie') && !request.medical_certificate_url && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">Certificat médical manquant</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Cette demande ne peut pas être validée sans certificat médical.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {request.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-red-800 mb-1">Motif du rejet :</p>
                    <p className="text-sm text-red-700">{request.rejection_reason}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <span>
                    Demandé le {new Date(request.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  {request.approved_at && (
                    <span>
                      Traité le {new Date(request.approved_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>

                {(role === 'drh' || role === 'manager' || role === 'admin') && request.status === 'pending' && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={
                        actionLoading === request.id ||
                        (request.leave_types?.name.toLowerCase().includes('maladie') && !request.medical_certificate_url)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        request.leave_types?.name.toLowerCase().includes('maladie') && !request.medical_certificate_url
                          ? 'Certificat médical requis'
                          : ''
                      }
                    >
                      <Check className="w-4 h-4" />
                      Approuver
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {role === 'employee' && leaveTypes.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Types de congés disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaveTypes.map((type) => (
              <div key={type.id} className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                  <p className="font-medium text-slate-900">{type.name}</p>
                </div>
                <p className="text-sm text-slate-600">{type.days_per_year} jours/an</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRequestForm && (
        <LeaveRequestForm
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {showBatch && (
        <BatchEntryTable<Record<string, unknown>>
          title="Congés"
          onClose={() => setShowBatch(false)}
          onSave={batchSaveLeaves}
          initialRows={5}
          emptyRow={() => ({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })}
          columns={[
            { key: 'employee_id', label: 'Agent', type: 'select', required: true, width: '200px', options: employeeOptions.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
            { key: 'leave_type_id', label: 'Type de congé', type: 'select', width: '160px', options: leaveTypes.map(t => ({ value: t.id, label: t.name })) },
            { key: 'start_date', label: 'Début', type: 'date', required: true, width: '140px' },
            { key: 'end_date', label: 'Fin', type: 'date', required: true, width: '140px' },
            { key: 'reason', label: 'Motif', type: 'text', placeholder: 'Motif…', width: '200px' },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}
