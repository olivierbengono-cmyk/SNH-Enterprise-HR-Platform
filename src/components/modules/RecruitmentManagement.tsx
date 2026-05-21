import { useState, useEffect } from 'react';
import { Briefcase, Plus, Users, Calendar, TrendingUp, X, MapPin, Mail, Phone, FileText, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JobOpeningForm } from './JobOpeningForm';

export function RecruitmentManagement() {
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsResponse, candidatesResponse] = await Promise.all([
        supabase
          .from('job_openings')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('candidates')
          .select('*, job_openings (title)')
          .order('created_at', { ascending: false })
      ]);

      setJobOpenings(jobsResponse.data || []);
      setCandidates(candidatesResponse.data || []);
    } catch (error) {
      console.error('Error loading recruitment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    openPositions: jobOpenings.filter(j => j.status === 'open').length,
    totalCandidates: candidates.length,
    inInterview: candidates.filter(c => c.status === 'interview').length,
    hired: candidates.filter(c => c.status === 'hired').length,
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
          <h1 className="text-3xl font-bold text-slate-900">Recrutement</h1>
          <p className="text-slate-600 mt-1">Gestion des offres et candidatures</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-snh-green text-white px-6 py-3 rounded-lg font-medium hover:bg-snh-green-dark transition"
        >
          <Plus className="w-5 h-5" />
          Nouvelle offre
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Postes ouverts</span>
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.openPositions}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Candidatures</span>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalCandidates}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Entretiens</span>
            <Calendar className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.inInterview}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Recrutés</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.hired}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Offres actives</h2>
          <div className="space-y-4">
            {jobOpenings.filter(j => j.status === 'open').length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Aucune offre active</p>
              </div>
            ) : (
              jobOpenings.filter(j => j.status === 'open').map((job) => (
                <div
                  key={job.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900">{job.title}</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {job.contract_type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{job.location}</p>
                  <p className="text-xs text-slate-500">
                    Publié le {new Date(job.publication_date || job.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Candidatures récentes</h2>
          <div className="space-y-4">
            {candidates.slice(0, 5).length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Aucune candidature</p>
              </div>
            ) : (
              candidates.slice(0, 5).map((candidate) => (
                <div
                  key={candidate.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {candidate.first_name} {candidate.last_name}
                      </p>
                      <p className="text-sm text-slate-600">{candidate.job_openings?.title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      candidate.status === 'received' ? 'bg-blue-100 text-blue-800' :
                      candidate.status === 'screening' ? 'bg-yellow-100 text-yellow-800' :
                      candidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {candidate.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(candidate.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                <p className="text-slate-600 mt-1">{selectedJob.contract_type}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-3">Description du poste</h3>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {selectedJob.description || 'Aucune description disponible'}
                </p>
              </div>

              {selectedJob.requirements && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 mb-3">Exigences</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedJob.requirements}</p>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Détails de l'offre</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedJob.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Localisation</p>
                        <p className="font-medium text-slate-900">{selectedJob.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedJob.salary_range && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Rémunération</p>
                        <p className="font-medium text-slate-900">{selectedJob.salary_range}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-600">Date de publication</p>
                      <p className="font-medium text-slate-900">
                        {new Date(selectedJob.publication_date || selectedJob.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {selectedJob.application_deadline && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-600">Date limite</p>
                        <p className="font-medium text-slate-900">
                          {new Date(selectedJob.application_deadline).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedJob.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : selectedJob.status === 'closed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedJob.status === 'open' ? 'Ouvert' :
                     selectedJob.status === 'closed' ? 'Fermé' : selectedJob.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="w-full px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedCandidate.first_name} {selectedCandidate.last_name}
                </h2>
                <p className="text-slate-600 mt-1">{selectedCandidate.job_openings?.title}</p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-3">Informations de contact</h3>
                <div className="space-y-2">
                  {selectedCandidate.email && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{selectedCandidate.email}</span>
                    </div>
                  )}
                  {selectedCandidate.phone && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{selectedCandidate.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedCandidate.cover_letter && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 mb-3">Lettre de motivation</h3>
                  <p className="text-slate-700 whitespace-pre-wrap text-sm">
                    {selectedCandidate.cover_letter}
                  </p>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Détails de la candidature</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Date de candidature</span>
                    <span className="text-sm font-medium text-slate-900">
                      {new Date(selectedCandidate.application_date || selectedCandidate.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {selectedCandidate.experience_years != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Années d'expérience</span>
                      <span className="text-sm font-medium text-slate-900">
                        {selectedCandidate.experience_years} ans
                      </span>
                    </div>
                  )}
                  {selectedCandidate.resume_url && (
                    <div className="pt-2">
                      <a
                        href={selectedCandidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Voir le CV
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedCandidate.status === 'received' ? 'bg-blue-100 text-blue-800' :
                    selectedCandidate.status === 'screening' ? 'bg-yellow-100 text-yellow-800' :
                    selectedCandidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                    selectedCandidate.status === 'hired' ? 'bg-green-100 text-green-800' :
                    selectedCandidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedCandidate.status === 'received' ? 'Reçu' :
                     selectedCandidate.status === 'screening' ? 'Présélection' :
                     selectedCandidate.status === 'interview' ? 'Entretien' :
                     selectedCandidate.status === 'hired' ? 'Embauché' :
                     selectedCandidate.status === 'rejected' ? 'Rejeté' :
                     selectedCandidate.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="w-full px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <JobOpeningForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
