import { useState, useEffect } from 'react';
import {
  X, Star, ChevronDown, ChevronUp, CheckCircle, AlertCircle,
  User, ThumbsUp, ThumbsDown, Minus, Award, Save, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JuryEval {
  id: string;
  evaluator_email: string;
  evaluator_name: string | null;
  evaluation_phase: string;
  score_presentation: number;
  score_communication: number;
  score_technical: number;
  score_leadership: number;
  score_behavior: number;
  score_motivation: number;
  score_teamwork: number;
  score_vision: number;
  score_availability: number;
  average_score: number | null;
  comment: string | null;
  recommendation: string | null;
  created_at: string;
}

interface Props {
  candidateId: string;
  candidateName: string;
  applicationId?: string | null;
  jobOpeningId?: string | null;
  jobTitle?: string;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CRITERIA: { key: keyof Omit<JuryEval, 'id' | 'evaluator_email' | 'evaluator_name' | 'evaluation_phase' | 'average_score' | 'comment' | 'recommendation' | 'created_at'>; label: string; weight: number; description: string }[] = [
  { key: 'score_presentation',  label: 'Présentation générale',      weight: 10, description: 'Apparence, posture, première impression' },
  { key: 'score_communication', label: 'Communication & Expression',  weight: 15, description: 'Clarté, élocution, argumentation' },
  { key: 'score_technical',     label: 'Connaissances techniques',    weight: 20, description: 'Maîtrise du domaine métier, expertise' },
  { key: 'score_leadership',    label: 'Leadership & Initiative',     weight: 10, description: 'Capacité à décider, à fédérer, à proposer' },
  { key: 'score_behavior',      label: 'Comportement professionnel',  weight: 10, description: 'Attitude, respect, maturité professionnelle' },
  { key: 'score_motivation',    label: 'Motivation & Engagement',     weight: 15, description: 'Intérêt pour le poste, projet professionnel' },
  { key: 'score_teamwork',      label: 'Esprit d\'équipe',            weight: 10, description: 'Collaboration, écoute, adaptabilité' },
  { key: 'score_vision',        label: 'Vision & Stratégie',          weight: 5,  description: 'Perspective à long terme, pensée systémique' },
  { key: 'score_availability',  label: 'Disponibilité',               weight: 5,  description: 'Date de disponibilité, mobilité' },
];

const PHASES: { value: string; label: string }[] = [
  { value: 'preselection',  label: 'Présélection dossier' },
  { value: 'written_test',  label: 'Test écrit' },
  { value: 'interview',     label: 'Entretien' },
  { value: 'final',         label: 'Jury final' },
];

const RECOMMENDATIONS: { value: string; label: string; color: string; icon: React.FC<any> }[] = [
  { value: 'strongly_recommend',    label: 'Fortement recommandé(e)',  color: 'text-emerald-700 bg-emerald-50 border-emerald-300',  icon: ThumbsUp },
  { value: 'recommend',             label: 'Recommandé(e)',            color: 'text-green-700   bg-green-50   border-green-300',    icon: ThumbsUp },
  { value: 'neutral',               label: 'Neutre',                   color: 'text-amber-700   bg-amber-50   border-amber-300',    icon: Minus },
  { value: 'not_recommend',         label: 'Déconseillé(e)',           color: 'text-orange-700  bg-orange-50  border-orange-300',   icon: ThumbsDown },
  { value: 'strongly_not_recommend',label: 'Fortement déconseillé(e)', color: 'text-red-700     bg-red-50     border-red-300',      icon: ThumbsDown },
];

function getRecommendationMeta(val: string | null) {
  return RECOMMENDATIONS.find(r => r.value === val) ?? RECOMMENDATIONS[2];
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = pct >= 80 ? 'text-emerald-700 bg-emerald-50' :
                pct >= 65 ? 'text-green-700 bg-green-50' :
                pct >= 50 ? 'text-amber-700 bg-amber-50' :
                pct >= 35 ? 'text-orange-700 bg-orange-50' :
                            'text-red-700 bg-red-50';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      <Star className="w-3 h-3" />
      {score}/10
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JuryEvaluationModal({ candidateId, candidateName, applicationId, jobOpeningId, jobTitle, onClose }: Props) {
  const { user, profile } = useAuth();
  const [existingEvals, setExistingEvals] = useState<JuryEval[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExisting, setShowExisting] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const emptyScores = () => Object.fromEntries(CRITERIA.map(c => [c.key, 7])) as Record<string, number>;

  const [phase, setPhase] = useState('interview');
  const [scores, setScores] = useState<Record<string, number>>(emptyScores());
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('recommend');

  useEffect(() => { loadEvaluations(); }, [candidateId]);

  const loadEvaluations = async () => {
    setLoading(true);
    const q = supabase.from('jury_evaluations').select('*').eq('candidate_id', candidateId);
    if (applicationId) {
      // prefer evaluations linked to this application, but show all
    }
    const { data } = await q.order('created_at', { ascending: false });
    setExistingEvals((data ?? []) as JuryEval[]);

    // Pre-fill if current evaluator already has one
    const mine = (data ?? []).find(e => e.evaluator_email === user?.email);
    if (mine) {
      setPhase(mine.evaluation_phase);
      setScores(Object.fromEntries(CRITERIA.map(c => [c.key, (mine as any)[c.key] as number])));
      setComment(mine.comment ?? '');
      setRecommendation(mine.recommendation ?? 'recommend');
    }
    setLoading(false);
  };

  const weightedScore = () => {
    const total = CRITERIA.reduce((sum, c) => sum + (scores[c.key] ?? 0) * c.weight, 0) / 100;
    return Math.round(total * 10) / 10;
  };

  const avgScore = () => {
    const sum = CRITERIA.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
    return Math.round((sum / CRITERIA.length) * 10) / 10;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        candidate_id: candidateId,
        application_id: applicationId ?? null,
        job_opening_id: jobOpeningId ?? null,
        evaluator_email: user?.email ?? profile?.email ?? 'inconnu',
        evaluator_name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || null,
        evaluation_phase: phase,
        ...Object.fromEntries(CRITERIA.map(c => [c.key, scores[c.key] ?? 0])),
        comment: comment || null,
        recommendation,
      };

      // Upsert by evaluator_email + candidate_id
      const existing = existingEvals.find(e => e.evaluator_email === (user?.email ?? profile?.email));
      if (existing) {
        await supabase.from('jury_evaluations').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('jury_evaluations').insert(payload);
      }
      setSuccessMsg('Évaluation enregistrée avec succès.');
      await loadEvaluations();
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const overall = existingEvals.length > 0
    ? Math.round(existingEvals.reduce((s, e) => s + (e.average_score ?? 0), 0) / existingEvals.length * 10) / 10
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Grille d'évaluation jury</h2>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{candidateName}</span>
              {jobTitle && <span> — {jobTitle}</span>}
            </p>
          </div>
          {overall !== null && (
            <div className="text-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
              <p className="text-xs text-slate-500">Moyenne jury</p>
              <p className="text-2xl font-bold text-slate-900">{overall}<span className="text-sm text-slate-400">/10</span></p>
              <p className="text-xs text-slate-400">{existingEvals.length} évaluateur{existingEvals.length > 1 ? 's' : ''}</p>
            </div>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Existing evaluations */}
          {existingEvals.length > 0 && (
            <div className="border-b border-slate-100">
              <button
                onClick={() => setShowExisting(v => !v)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition"
              >
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Évaluations existantes ({existingEvals.length})
                </span>
                {showExisting ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showExisting && (
                <div className="px-6 pb-4 space-y-3">
                  {existingEvals.map(ev => {
                    const rec = getRecommendationMeta(ev.recommendation);
                    const RecIcon = rec.icon;
                    return (
                      <div key={ev.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {(ev.evaluator_name ?? ev.evaluator_email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{ev.evaluator_name ?? ev.evaluator_email}</p>
                              <p className="text-xs text-slate-400">
                                {PHASES.find(p => p.value === ev.evaluation_phase)?.label} —{' '}
                                {new Date(ev.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ev.average_score !== null && (
                              <div className="text-center">
                                <p className="text-xl font-bold text-slate-900">{ev.average_score}</p>
                                <p className="text-xs text-slate-400">/ 10</p>
                              </div>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${rec.color}`}>
                              <RecIcon className="w-3 h-3" />
                              {rec.label}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {CRITERIA.map(c => (
                            <div key={c.key} className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 truncate pr-1">{c.label.split(' ')[0]}</span>
                              <ScoreBadge score={(ev as any)[c.key]} />
                            </div>
                          ))}
                        </div>
                        {ev.comment && (
                          <p className="text-xs text-slate-600 mt-3 italic border-t border-slate-200 pt-2">"{ev.comment}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Evaluation form */}
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">
                {existingEvals.find(e => e.evaluator_email === user?.email) ? 'Modifier mon évaluation' : 'Nouvelle évaluation'}
              </p>
            </div>

            {/* Phase selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Phase d'évaluation</label>
              <div className="flex flex-wrap gap-2">
                {PHASES.map(p => (
                  <button key={p.value} onClick={() => setPhase(p.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition ${
                      phase === p.value
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scores grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Grille de notation (0 – 10)</label>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Moyenne simple : <span className="font-bold text-slate-800">{avgScore()}/10</span></span>
                  <span className="text-slate-500">Score pondéré : <span className="font-bold text-emerald-700">{weightedScore()}/10</span></span>
                </div>
              </div>
              <div className="space-y-2">
                {CRITERIA.map(c => {
                  const val = scores[c.key] ?? 0;
                  const pct = val * 10;
                  const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';
                  return (
                    <div key={c.key} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                      <div className="w-44 flex-shrink-0">
                        <p className="text-xs font-medium text-slate-700 leading-tight">{c.label}</p>
                        <p className="text-xs text-slate-400 leading-tight">{c.description}</p>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <input
                          type="number" min={0} max={10} value={val}
                          onChange={e => setScores(prev => ({ ...prev, [c.key]: Math.min(10, Math.max(0, Number(e.target.value))) }))}
                          className="w-14 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:ring-2 focus:ring-green-500 outline-none bg-white"
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0">×{c.weight}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Recommandation</label>
              <div className="flex flex-wrap gap-2">
                {RECOMMENDATIONS.map(r => {
                  const Icon = r.icon;
                  return (
                    <button key={r.value} onClick={() => setRecommendation(r.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition ${
                        recommendation === r.value ? r.color : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      <Icon className="w-3 h-3" />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Commentaire (optionnel)</label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Observations sur le candidat, points forts, points à améliorer..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-shrink-0">
          {successMsg ? (
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> {successMsg}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Score pondéré final : <span className="font-bold text-slate-700">{weightedScore()}/10</span></p>
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600">
              Fermer
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold transition disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Enregistrement…' : 'Enregistrer l\'évaluation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
