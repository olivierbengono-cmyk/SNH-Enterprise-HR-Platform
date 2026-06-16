import { useState, useEffect } from 'react';
import { Pagination, paginate, PageSize } from '../shared/Pagination';
import {
  Briefcase, Plus, Users, Calendar, TrendingUp, X, MapPin, Mail, Phone,
  FileText, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle,
  Eye, Building2, GraduationCap, Star, Search, Filter, Pencil, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JobOpeningForm } from './JobOpeningForm';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:        { label: 'Soumis',         color: 'bg-blue-100 text-blue-800 border-blue-200' },
  reviewing:  { label: 'En examen',      color: 'bg-amber-100 text-amber-800 border-amber-200' },
  interview:  { label: 'Entretien',      color: 'bg-violet-100 text-violet-800 border-violet-200' },
  offer:      { label: 'Offre',          color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pre_onboarding: { label: 'Essai',      color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  integrated: { label: 'Titularisé(e)', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected:   { label: 'Refusé(e)',      color: 'bg-red-100 text-red-800 border-red-200' },
  withdrawn:  { label: 'Retiré(e)',      color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const PIPELINE_STEPS = ['new', 'reviewing', 'interview', 'offer', 'pre_onboarding', 'integrated'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function CandidateInitials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0 border border-slate-200">
      {initials.toUpperCase()}
    </div>
  );
}

export function RecruitmentManagement() {
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [jobApplications, setJobApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'candidates'>('candidates');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [candidateTotalApps, setCandidateTotalApps] = useState<number | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState<PageSize>(20);
  const [jobSearch, setJobSearch] = useState('');
  const [jobFilterStatus, setJobFilterStatus] = useState('all');
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from('job_openings')
        .select('*')
        .order('created_at', { ascending: false });
      setJobOpenings(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openJob = async (job: any) => {
    setSelectedJob(job);
    setActiveTab('candidates');
    setSelectedApp(null);
    setFilterStatus('all');
    setLoadingApps(true);
    const { data, error } = await supabase
      .from('candidate_applications')
      .select(`
        id, status, created_at, cover_letter, desired_position,
        candidate:candidates (
          id, first_name, last_name, email, phone, location,
          professional_title, linkedin_url, summary, desired_position
        )
      `)
      .eq('job_opening_id', job.id)
      .order('created_at', { ascending: false });
    if (error) console.error('candidate_applications query error:', error);
    setJobApplications(data || []);
    setLoadingApps(false);
  };

  const selectApp = async (app: any | null) => {
    setSelectedApp(app);
    setCandidateTotalApps(null);
    if (app?.candidate?.id) {
      const { count } = await supabase
        .from('candidate_applications')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', app.candidate.id);
      setCandidateTotalApps(count ?? 0);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingStatus(appId);
    await supabase.from('candidate_applications').update({ status: newStatus }).eq('id', appId);
    setJobApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    if (selectedApp?.id === appId) setSelectedApp((prev: any) => ({ ...prev, status: newStatus }));
    setUpdatingStatus(null);
  };

  const stats = {
    open: jobOpenings.filter(j => j.status === 'open').length,
    draft: jobOpenings.filter(j => j.status === 'draft').length,
    closed: jobOpenings.filter(j => j.status === 'closed').length,
    total: jobOpenings.length,
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('job_openings').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      setSelectedJob(null);
      loadData();
    } finally {
      setDeleting(false);
    }
  };

  const filteredApps = filterStatus === 'all'
    ? jobApplications
    : jobApplications.filter(a => a.status === filterStatus);

  const filteredJobs = jobOpenings.filter(j => {
    if (jobFilterStatus !== 'all' && j.status !== jobFilterStatus) return false;
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      if (!`${j.title} ${j.location || ''} ${j.contract_type || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recrutement</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion des offres et candidatures</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-800 transition text-sm"
        >
          <Plus size={16} />
          Nouvelle offre
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Offres ouvertes', value: stats.open, icon: Briefcase, color: 'text-green-600 bg-green-50' },
          { label: 'Brouillons', value: stats.draft, icon: FileText, color: 'text-amber-600 bg-amber-50' },
          { label: 'Fermées', value: stats.closed, icon: XCircle, color: 'text-slate-500 bg-slate-100' },
          { label: 'Total offres', value: stats.total, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Job list */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Toutes les offres</h2>
            <span className="text-xs text-slate-400 flex-shrink-0">{filteredJobs.length}{filteredJobs.length !== jobOpenings.length ? `/${jobOpenings.length}` : ''} offre{jobOpenings.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={jobSearch}
                onChange={e => { setJobSearch(e.target.value); setJobsPage(1); }}
                placeholder="Rechercher une offre..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              />
              {jobSearch && (
                <button onClick={() => { setJobSearch(''); setJobsPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={11} />
                </button>
              )}
            </div>
            <select
              value={jobFilterStatus}
              onChange={e => { setJobFilterStatus(e.target.value); setJobsPage(1); }}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-600 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="all">Tous statuts</option>
              <option value="open">Publiées</option>
              <option value="draft">Brouillons</option>
              <option value="closed">Fermées</option>
            </select>
          </div>
        </div>
        {jobOpenings.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune offre créée</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Search size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune offre ne correspond</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {paginate(filteredJobs, jobsPage, jobsPageSize).map(job => {
                const isOpen = job.status === 'open';
                const isDraft = job.status === 'draft';
                return (
                  <div
                    key={job.id}
                    onClick={() => openJob(job)}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition group"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-green-50' : 'bg-slate-100'}`}>
                      <Briefcase size={18} className={isOpen ? 'text-green-700' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          isOpen ? 'bg-green-50 text-green-700 border-green-200' :
                          isDraft ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {isOpen ? 'Publiée' : isDraft ? 'Brouillon' : 'Fermée'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={10} />{job.location || 'Non précisé'}</span>
                        <span className="flex items-center gap-1"><Building2 size={10} />{job.contract_type || '—'}</span>
                        {job.closing_date && (
                          <span className="flex items-center gap-1"><Clock size={10} />Clôture {fmtDate(job.closing_date)}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition flex-shrink-0" />
                  </div>
                );
              })}
            </div>
            <Pagination
              total={filteredJobs.length}
              page={jobsPage}
              pageSize={jobsPageSize}
              onPage={setJobsPage}
              onPageSize={setJobsPageSize}
            />
          </>
        )}
      </div>

      {/* Job detail modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{selectedJob.title}</h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    selectedJob.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' :
                    selectedJob.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {selectedJob.status === 'open' ? 'Publiée' : selectedJob.status === 'draft' ? 'Brouillon' : 'Fermée'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><Building2 size={11} />{selectedJob.contract_type}</span>
                  {selectedJob.location && <span className="flex items-center gap-1"><MapPin size={11} />{selectedJob.location}</span>}
                  {selectedJob.closing_date && <span className="flex items-center gap-1"><Clock size={11} />Clôture {fmtDate(selectedJob.closing_date)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditingJob(selectedJob)}
                  title="Modifier l'offre"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-teal-300 hover:text-teal-700 transition"
                >
                  <Pencil size={13} /> Modifier
                </button>
                <button
                  onClick={() => setDeleteTarget(selectedJob)}
                  title="Supprimer l'offre"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
                <button onClick={() => setSelectedJob(null)} className="ml-1 p-1.5 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
              {[
                { key: 'candidates', label: `Candidatures`, count: jobApplications.length },
                { key: 'details', label: 'Description du poste' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>{loadingApps ? '…' : tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {/* ── Candidatures tab ── */}
              {activeTab === 'candidates' && (
                <div className="flex h-full">
                  {/* Candidates list */}
                  <div className={`flex flex-col ${selectedApp ? 'w-96 border-r border-slate-100 flex-shrink-0' : 'flex-1'}`}>
                    {/* Filter bar */}
                    <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2 flex-shrink-0">
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      >
                        <option value="all">Tous les statuts</option>
                        {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                          <option key={v} value={v}>{c.label}</option>
                        ))}
                      </select>
                      <span className="text-xs text-slate-400 ml-auto">
                        {filteredApps.length} candidat{filteredApps.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {loadingApps ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                      </div>
                    ) : filteredApps.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                        <Users size={36} className="mb-2 opacity-30" />
                        <p className="text-sm">Aucune candidature</p>
                        {filterStatus !== 'all' && (
                          <button onClick={() => setFilterStatus('all')} className="text-xs text-green-600 mt-1 hover:underline">
                            Voir tout
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50 overflow-y-auto flex-1">
                        {filteredApps.map(app => {
                          const cand = app.candidate;
                          const fullName = cand ? `${cand.first_name || ''} ${cand.last_name || ''}`.trim() : '—';
                          const isSelected = selectedApp?.id === app.id;
                          return (
                            <div
                              key={app.id}
                              onClick={() => selectApp(isSelected ? null : app)}
                              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition ${
                                isSelected ? 'bg-green-50 border-r-2 border-r-green-600' : 'hover:bg-slate-50'
                              }`}
                            >
                              {cand && <CandidateInitials name={fullName} />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>
                                <p className="text-xs text-slate-400 truncate">{cand?.current_position || app.desired_position || 'Poste non précisé'}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <StatusBadge status={app.status} />
                                <span className="text-xs text-slate-400">{fmtDate(app.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Candidate detail panel */}
                  {selectedApp && (() => {
                    const cand = selectedApp.candidate;
                    const fullName = cand ? `${cand.first_name || ''} ${cand.last_name || ''}`.trim() : '—';
                    const stepIdx = PIPELINE_STEPS.indexOf(selectedApp.status);
                    return (
                      <div className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0">
                        {/* Candidate header */}
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-600 border border-slate-200 flex-shrink-0">
                            {fullName.split(' ').filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900">{fullName}</p>
                            <p className="text-sm text-slate-500">{cand?.professional_title || cand?.desired_position || '—'}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {cand?.location && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <MapPin size={10} />{cand.location}
                                </p>
                              )}
                              <p className="text-xs flex items-center gap-1 font-semibold">
                                <FileText size={10} className="text-slate-400" />
                                {candidateTotalApps == null
                                  ? <span className="text-slate-300">…</span>
                                  : <span className={candidateTotalApps > 1 ? 'text-violet-700' : 'text-slate-500'}>
                                      {candidateTotalApps} candidature{candidateTotalApps > 1 ? 's' : ''} au total
                                    </span>
                                }
                              </p>
                            </div>
                          </div>
                          <button onClick={() => selectApp(null)} className="p-1 hover:bg-slate-100 rounded transition flex-shrink-0">
                            <X size={14} className="text-slate-400" />
                          </button>
                        </div>

                        {/* Pipeline progress */}
                        {!['rejected', 'withdrawn'].includes(selectedApp.status) && (
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pipeline</p>
                            <div className="flex items-center gap-0">
                              {PIPELINE_STEPS.map((step, i) => {
                                const done = i < stepIdx;
                                const active = i === stepIdx;
                                const cfg = STATUS_CONFIG[step];
                                return (
                                  <div key={step} className="flex-1 flex flex-col items-center gap-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                                      active ? 'bg-green-600 border-green-600 text-white' :
                                      done ? 'bg-green-100 border-green-400 text-green-600' :
                                      'bg-white border-slate-200 text-slate-300'
                                    }`}>
                                      {done ? <CheckCircle size={12} /> : i + 1}
                                    </div>
                                    <span className={`text-xs text-center leading-tight ${active ? 'font-semibold text-green-700' : done ? 'text-green-600' : 'text-slate-400'}`}>
                                      {cfg.label}
                                    </span>
                                    {i < PIPELINE_STEPS.length - 1 && (
                                      <div className={`absolute h-0.5 ${done ? 'bg-green-400' : 'bg-slate-200'}`} style={{ display: 'none' }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Status actions */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Changer le statut</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(STATUS_CONFIG)
                              .filter(([v]) => v !== selectedApp.status)
                              .map(([v, cfg]) => (
                                <button
                                  key={v}
                                  onClick={() => updateStatus(selectedApp.id, v)}
                                  disabled={updatingStatus === selectedApp.id}
                                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition hover:opacity-80 disabled:opacity-50 ${cfg.color}`}
                                >
                                  {updatingStatus === selectedApp.id ? '…' : cfg.label}
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Contact info */}
                        {cand && (
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact</p>
                            {cand.email && (
                              <a href={`mailto:${cand.email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 transition">
                                <Mail size={14} className="text-slate-400" />{cand.email}
                              </a>
                            )}
                            {cand.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Phone size={14} className="text-slate-400" />{cand.phone}
                              </div>
                            )}
                            {cand.experience_years != null && (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Star size={14} className="text-slate-400" />{cand.experience_years} an{cand.experience_years > 1 ? 's' : ''} d'expérience
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cover letter */}
                        {selectedApp.cover_letter && (
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lettre de motivation</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {selectedApp.cover_letter}
                            </p>
                          </div>
                        )}

                        {/* Profile summary */}
                        {cand?.profile_summary && (
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Résumé du profil</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{cand.profile_summary}</p>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 text-center pb-1">
                          Candidature soumise le {fmtDate(selectedApp.created_at)}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Description tab ── */}
              {activeTab === 'details' && (
                <div className="p-6 space-y-5">
                  {selectedJob.description && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description du poste</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                        {selectedJob.description}
                      </p>
                    </div>
                  )}
                  {selectedJob.requirements && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Exigences</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                        {selectedJob.requirements}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Localisation', value: selectedJob.location, icon: MapPin },
                      { label: 'Contrat', value: selectedJob.contract_type, icon: Briefcase },
                      { label: 'Publication', value: fmtDate(selectedJob.publication_date || selectedJob.created_at), icon: Calendar },
                      { label: 'Clôture', value: selectedJob.closing_date ? fmtDate(selectedJob.closing_date) : 'Non définie', icon: Clock },
                      { label: 'Niveau', value: selectedJob.education_level || 'Indifférent', icon: GraduationCap },
                      { label: 'Rémunération', value: selectedJob.salary_range || 'Confidentiel', icon: AlertCircle },
                    ].map(item => item.value && (
                      <div key={item.label} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <item.icon size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-400">{item.label}</p>
                          <p className="text-sm font-medium text-slate-800">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedJob.required_skills?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Compétences requises</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.required_skills.map((s: string) => (
                          <span key={s} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <JobOpeningForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { loadData(); setShowForm(false); }}
        />
      )}

      {/* Edit job modal */}
      {editingJob && (
        <JobOpeningForm
          initialData={editingJob}
          onClose={() => setEditingJob(null)}
          onSuccess={() => {
            loadData();
            setEditingJob(null);
            // Refresh the selected job data in the detail modal
            if (selectedJob?.id === editingJob.id) {
              setSelectedJob(null);
            }
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Supprimer cette offre ?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700">«{deleteTarget.title}»</span> sera définitivement supprimée,
                  ainsi que toutes les candidatures associées. Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-600 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                {deleting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Suppression...</>
                  : <><Trash2 size={14} />Supprimer définitivement</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
