import { useState, useEffect, useCallback } from 'react';
import {
  Award, Bot, Users, TrendingUp, Target, ChevronRight,
  Loader2, AlertCircle, CheckCircle, Star, ArrowRight,
  BookOpen, Clock, Zap, Search, BarChart3, UserCheck,
  GraduationCap, Sparkles, RefreshCw, ChevronDown,
  Plus, Pencil, Trash2, X, Save, ListChecks, ChevronUp,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DevelopmentPlans from './performance/DevelopmentPlans';
import CompetencyFramework from './performance/CompetencyFramework';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Position {
  id: string;
  title: string;
  department: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position_title: string | null;
  department: string | null;
}

interface SkillGap {
  skill_name: string;
  current: string | null;
  required: string;
  gap_points: number;
}

interface Candidate {
  employee_id: string;
  first_name: string;
  last_name: string;
  current_position: string | null;
  department: string | null;
  score: number;
  mandatory_score: number;
  skills_covered: number;
  total_requirements: number;
  missing_mandatory: string[];
  skill_gaps: SkillGap[];
  rationale: string;
}

interface Successor {
  employee_id: string;
  first_name: string;
  last_name: string;
  current_position: string | null;
  department: string | null;
  score: number;
  mandatory_score: number;
  skills_overlap: number;
  total_departing_skills: number;
  skill_gaps: SkillGap[];
  training_plan: TrainingItem[];
  rationale: string;
}

interface TrainingItem {
  skill_name: string;
  current_level: string;
  target_level: string;
  priority: string;
  estimated_duration: string;
  recommended_approach: string;
}

interface MatchResult {
  position: { id: string; title: string; department: string };
  requirements: { skill_name: string; required_level: string; is_mandatory: boolean; weight: number }[];
  candidates: Candidate[];
}

interface SuccessionResult {
  departing_employee: { name: string; position: string; department: string; skills_count: number };
  successors: Successor[];
}

interface TrainingResult {
  employee: { name: string; current_position: string; department: string };
  target_position: { title: string; department: string };
  current_match_score: number;
  mandatory_score: number;
  total_gaps: number;
  estimated_development_months: number;
  training_plan: TrainingItem[];
  summary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'bg-slate-100 text-slate-600',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-emerald-100 text-emerald-700',
  expert: 'bg-amber-100 text-amber-700',
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  expert: 'Expert',
};

const PRIORITY_COLOR: Record<string, string> = {
  Haute: 'bg-red-100 text-red-700',
  Moyenne: 'bg-amber-100 text-amber-700',
  Faible: 'bg-slate-100 text-slate-600',
};

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={6} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={6} fill="none"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size * 0.22} fontWeight="700" fill={color}>
        {score}%
      </text>
    </svg>
  );
}

function SkillLevelBadge({ level }: { level: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[level] ?? 'bg-slate-100 text-slate-600'}`}>
      {LEVEL_LABEL[level] ?? level}
    </span>
  );
}

function EmptyAnalysis({ icon: Icon, title, desc }: { icon: React.FC<any>; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-slate-700 font-semibold text-lg">{title}</p>
      <p className="text-slate-500 text-sm mt-1 max-w-sm">{desc}</p>
    </div>
  );
}

// ─── Tab: Position Matching ──────────────────────────────────────────────────

function PositionMatchingTab({ positions }: { positions: Position[] }) {
  const [selectedPosition, setSelectedPosition] = useState('');
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const analyze = async () => {
    if (!selectedPosition) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-skills`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'position_matching', position_id: selectedPosition, top_n: topN }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Sélectionner un poste cible</h3>
            <p className="text-xs text-slate-500">L'IA analysera tous les profils et les classera par adéquation</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedPosition}
            onChange={(e) => { setSelectedPosition(e.target.value); setResult(null); }}
            className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Choisir un poste --</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title} – {p.department}</option>
            ))}
          </select>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="w-36 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Tous</option>
          </select>
          <button
            onClick={analyze}
            disabled={!selectedPosition || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800">Analyse IA en cours…</p>
            <p className="text-sm text-slate-500 mt-1">Lecture transversale de tous les profils employés</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Position header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Poste analysé</p>
                <h3 className="text-xl font-bold mt-0.5">{result.position.title}</h3>
                <p className="text-blue-200 text-sm mt-0.5">{result.position.department}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs">Référentiel</p>
                <p className="text-2xl font-bold">{result.requirements.length}</p>
                <p className="text-blue-200 text-xs">compétence{result.requirements.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.requirements.map((r) => (
                <span key={r.skill_name} className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.is_mandatory ? 'bg-white/20 text-white' : 'bg-white/10 text-blue-100'}`}>
                  {r.skill_name} · {LEVEL_LABEL[r.required_level] ?? r.required_level}
                  {r.is_mandatory && <span className="ml-1 text-amber-300">*</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Candidates */}
          <div className="space-y-3">
            {result.candidates.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                Aucun candidat trouvé pour ce poste.
              </div>
            ) : result.candidates.map((c, idx) => (
              <div key={c.employee_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(expandedId === c.employee_id ? null : c.employee_id)}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                    {idx + 1}
                  </div>
                  <ScoreRing score={c.score} size={52} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-slate-500 truncate">{c.current_position ?? '—'} · {c.department ?? '—'}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">{c.rationale}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-500">Couvert</p>
                      <p className="font-bold text-slate-800">{c.skills_covered}/{c.total_requirements}</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-500">Obligatoires</p>
                      <p className={`font-bold ${c.mandatory_score >= 80 ? 'text-emerald-600' : c.mandatory_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {c.mandatory_score}%
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === c.employee_id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {expandedId === c.employee_id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
                    <p className="text-sm text-slate-700 italic">{c.rationale}</p>

                    {c.missing_mandatory.length > 0 && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">Compétences obligatoires manquantes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {c.missing_mandatory.map((m) => (
                              <span key={m} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{m}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {c.skill_gaps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-2">Écarts de compétences</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {c.skill_gaps.map((g) => (
                            <div key={g.skill_name} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">{g.skill_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <SkillLevelBadge level={g.current ?? 'beginner'} />
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <SkillLevelBadge level={g.required} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <EmptyAnalysis
          icon={Target}
          title="Sélectionnez un poste pour démarrer"
          desc="L'IA va analyser l'ensemble des profils employés et les classer par adéquation aux compétences requises."
        />
      )}
    </div>
  );
}

// ─── Tab: Succession Planning ────────────────────────────────────────────────

function SuccessionPlanningTab({ employees }: { employees: Employee[] }) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuccessionResult | null>(null);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      (e.position_title ?? '').toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    );
  });

  const analyze = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-skills`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'succession_planning', employee_id: selectedEmployee, top_n: topN }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Titulaire de poste partant</h3>
            <p className="text-xs text-slate-500">Identifiez les meilleurs successeurs internes basés sur les compétences</p>
          </div>
        </div>

        <div className="mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un employé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <select
            value={selectedEmployee}
            onChange={(e) => { setSelectedEmployee(e.target.value); setResult(null); }}
            className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            size={1}
          >
            <option value="">-- Choisir l'employé partant --</option>
            {filteredEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}{e.position_title ? ` — ${e.position_title}` : ''}
              </option>
            ))}
          </select>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="w-36 px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
          >
            <option value={3}>Top 3</option>
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
          </select>
          <button
            onClick={analyze}
            disabled={!selectedEmployee || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
              <Bot className="w-8 h-8 text-amber-600" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800">Analyse de succession en cours…</p>
            <p className="text-sm text-slate-500 mt-1">Comparaison transversale des profils de compétences</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Departing employee banner */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-amber-100 text-xs font-medium uppercase tracking-wide">Titulaire partant</p>
                <h3 className="text-xl font-bold mt-0.5">{result.departing_employee.name}</h3>
                <p className="text-amber-100 text-sm">{result.departing_employee.position} · {result.departing_employee.department}</p>
              </div>
              <div className="text-right">
                <p className="text-amber-100 text-xs">Compétences clés</p>
                <p className="text-3xl font-bold">{result.departing_employee.skills_count}</p>
              </div>
            </div>
          </div>

          {/* Successors */}
          <div className="space-y-3">
            {result.successors.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                Aucun successeur identifié.
              </div>
            ) : result.successors.map((s, idx) => (
              <div key={s.employee_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(expandedId === s.employee_id ? null : s.employee_id)}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {idx === 0 ? <Star className="w-4 h-4" /> : idx + 1}
                  </div>
                  <ScoreRing score={s.score} size={52} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{s.first_name} {s.last_name}</p>
                      {idx === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Recommandé</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{s.current_position ?? '—'} · {s.department ?? '—'}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">{s.rationale}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-500">Recouvrement</p>
                      <p className="font-bold text-slate-800">{s.skills_overlap}/{s.total_departing_skills}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === s.employee_id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {expandedId === s.employee_id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
                    <p className="text-sm text-slate-700 italic">{s.rationale}</p>

                    {s.training_plan.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4" />
                          Plan de formation recommandé
                        </p>
                        <div className="space-y-2">
                          {s.training_plan.map((t) => (
                            <div key={t.skill_name} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${PRIORITY_COLOR[t.priority]}`}>
                                {t.priority}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800">{t.skill_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                                  <span>{t.current_level}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="text-slate-700 font-medium">{t.target_level}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{t.recommended_approach} · {t.estimated_duration}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <EmptyAnalysis
          icon={UserCheck}
          title="Identifiez le meilleur successeur"
          desc="Sélectionnez un titulaire de poste partant pour que l'IA identifie les candidats internes les mieux positionnés pour assurer la succession."
        />
      )}
    </div>
  );
}

// ─── Tab: Training Recommendations ──────────────────────────────────────────

function TrainingRecommendationsTab({ positions, employees }: { positions: Position[]; employees: Employee[] }) {
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!selectedPosition || !selectedEmployee) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-skills`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'training_recommendations', position_id: selectedPosition, employee_id: selectedEmployee }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ready = selectedPosition && selectedEmployee;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Générer un plan de formation personnalisé</h3>
            <p className="text-xs text-slate-500">L'IA analyse l'écart entre le profil actuel et le poste cible</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Collaborateur</label>
            <select
              value={selectedEmployee}
              onChange={(e) => { setSelectedEmployee(e.target.value); setResult(null); }}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">-- Choisir un collaborateur --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}{e.position_title ? ` — ${e.position_title}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Poste cible</label>
            <select
              value={selectedPosition}
              onChange={(e) => { setSelectedPosition(e.target.value); setResult(null); }}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">-- Choisir un poste cible --</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title} – {p.department}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={analyze}
          disabled={!ready || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Générer le plan de formation
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <Bot className="w-8 h-8 text-emerald-600" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800">Analyse des écarts en cours…</p>
            <p className="text-sm text-slate-500 mt-1">Construction du plan de développement personnalisé</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">Plan de développement</p>
                <h3 className="text-xl font-bold mt-0.5">{result.employee.name}</h3>
                <div className="flex items-center gap-2 text-emerald-100 text-sm mt-1">
                  <span>{result.employee.current_position ?? 'Poste actuel'}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-white font-medium">{result.target_position.title}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <ScoreRing score={result.current_match_score} size={64} />
                  <p className="text-emerald-100 text-xs mt-1">Adéquation</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold">{result.total_gaps}</p>
                <p className="text-emerald-100 text-xs">Écart{result.total_gaps > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold">{result.estimated_development_months}</p>
                <p className="text-emerald-100 text-xs">Mois estimés</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold">{result.training_plan.filter(t => t.priority === 'Haute').length}</p>
                <p className="text-emerald-100 text-xs">Priorité haute</p>
              </div>
            </div>
          </div>

          {/* AI summary */}
          <div className="bg-white rounded-xl border border-emerald-200 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1">Recommandation IA</p>
                <p className="text-sm text-slate-700">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Training plan */}
          {result.training_plan.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Plan de formation — {result.training_plan.length} action{result.training_plan.length > 1 ? 's' : ''}
                </h4>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{result.estimated_development_months} mois
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {result.training_plan.map((t, idx) => (
                  <div key={t.skill_name} className="flex items-start gap-4 px-5 py-4">
                    <div className="flex-shrink-0 w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{t.skill_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <SkillLevelBadge level={t.current_level === 'Non acquis' ? 'beginner' : Object.entries(LEVEL_LABEL).find(([, v]) => v === t.current_level)?.[0] ?? 'beginner'} />
                        <ArrowRight className="w-3 h-3" />
                        <SkillLevelBadge level={Object.entries(LEVEL_LABEL).find(([, v]) => v === t.target_level)?.[0] ?? 'intermediate'} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{t.recommended_approach}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.estimated_duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">Aucun écart majeur détecté. Ce collaborateur est déjà au niveau requis pour ce poste.</p>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <EmptyAnalysis
          icon={GraduationCap}
          title="Construisez un plan de formation ciblé"
          desc="Choisissez un collaborateur et un poste cible pour obtenir un plan de développement personnalisé basé sur l'analyse des écarts de compétences."
        />
      )}
    </div>
  );
}

// ─── Tab: Référentiel de Compétences ────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface EmployeeSkillRow {
  id: string;
  employee_id: string;
  skill_id: string;
  proficiency_level: string;
  acquired_date: string | null;
  last_assessed_date: string | null;
}

const CATEGORIES = [
  { value: 'technical', label: 'Technique', color: 'bg-blue-100 text-blue-700' },
  { value: 'soft', label: 'Savoir-être', color: 'bg-violet-100 text-violet-700' },
  { value: 'language', label: 'Langue', color: 'bg-teal-100 text-teal-700' },
  { value: 'certification', label: 'Certification', color: 'bg-amber-100 text-amber-700' },
  { value: 'other', label: 'Autre', color: 'bg-slate-100 text-slate-600' },
];

const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
];

function getCategoryStyle(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? 'bg-slate-100 text-slate-600';
}
function getCategoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function SkillFormModal({
  skill,
  onSave,
  onClose,
}: {
  skill: Partial<Skill> | null;
  onSave: (s: Partial<Skill>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Skill>>(
    skill ?? { name: '', category: 'technical', description: '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{skill?.id ? 'Modifier la compétence' : 'Nouvelle compétence'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom de la compétence *</label>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex : Forage pétrolier"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Catégorie</label>
            <select
              value={form.category ?? 'technical'}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Description de la compétence…"
            />
          </div>
          {error && <p className="text-red-600 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignSkillModal({
  skill,
  employees,
  assignments,
  onSave,
  onRemove,
  onClose,
}: {
  skill: Skill;
  employees: Employee[];
  assignments: EmployeeSkillRow[];
  onSave: (employeeId: string, level: string, acquiredDate: string) => Promise<void>;
  onRemove: (rowId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [acquiredDate, setAcquiredDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const assignedIds = new Set(assignments.map((a) => a.employee_id));
  const availableEmps = employees.filter((e) => {
    if (assignedIds.has(e.id)) return false;
    const q = search.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q) ||
      (e.position_title ?? '').toLowerCase().includes(q)
    );
  });

  const handleAssign = async () => {
    if (!selectedEmp) { setError('Sélectionnez un collaborateur.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(selectedEmp, level, acquiredDate);
      setSelectedEmp('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (rowId: string) => {
    setRemoving(rowId);
    try { await onRemove(rowId); } finally { setRemoving(null); }
  };

  const getEmpName = (empId: string) => {
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.first_name} ${e.last_name}` : empId;
  };
  const getEmpMeta = (empId: string) => {
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.position_title ?? '—'} · ${e.department ?? '—'}` : '';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900">Affecter — {skill.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{assignments.length} collaborateur{assignments.length !== 1 ? 's' : ''} affecté{assignments.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Assign form */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-3">Affecter à un nouveau collaborateur</p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un collaborateur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selectedEmp}
                onChange={(e) => { setSelectedEmp(e.target.value); setError(''); }}
                className="sm:col-span-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Collaborateur --</option>
                {availableEmps.map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={acquiredDate}
                  onChange={(e) => setAcquiredDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAssign}
                  disabled={saving || !selectedEmp}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex-shrink-0"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Affecter
                </button>
              </div>
            </div>
            {error && <p className="text-red-600 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          </div>

          {/* Current assignments */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">Collaborateurs actuellement affectés</p>
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucun collaborateur affecté à cette compétence.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                      {getEmpName(a.employee_id).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{getEmpName(a.employee_id)}</p>
                      <p className="text-xs text-slate-500 truncate">{getEmpMeta(a.employee_id)}</p>
                    </div>
                    <SkillLevelBadge level={a.proficiency_level} />
                    {a.acquired_date && (
                      <span className="text-xs text-slate-400 hidden sm:block flex-shrink-0">
                        {new Date(a.acquired_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemove(a.id)}
                      disabled={removing === a.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    >
                      {removing === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">Fermer</button>
        </div>
      </div>
    </div>
  );
}

function SkillReferentialTab({ employees }: { employees: Employee[] }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allAssignments, setAllAssignments] = useState<EmployeeSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'skills' | 'employees'>('skills');

  const [skillModal, setSkillModal] = useState<Partial<Skill> | null | false>(false);
  const [assignModal, setAssignModal] = useState<Skill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Employee view state
  const [selectedEmpView, setSelectedEmpView] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        supabase.from('skills').select('id, name, category, description').order('category').order('name'),
        supabase.from('employee_skills').select('id, employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date'),
      ]);
      setSkills((sRes.data ?? []) as Skill[]);
      setAllAssignments((aRes.data ?? []) as EmployeeSkillRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveSkill = async (form: Partial<Skill>) => {
    if (form.id) {
      const { error } = await supabase.from('skills').update({ name: form.name, category: form.category, description: form.description }).eq('id', form.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('skills').insert({ name: form.name, category: form.category, description: form.description });
      if (error) throw new Error(error.message);
    }
    await loadAll();
  };

  const deleteSkill = async (id: string) => {
    if (!confirm('Supprimer cette compétence ? Les affectations aux employés seront également supprimées.')) return;
    setDeletingId(id);
    await supabase.from('skills').delete().eq('id', id);
    await loadAll();
    setDeletingId(null);
  };

  const assignSkill = async (skillId: string, employeeId: string, level: string, acquiredDate: string) => {
    const { error } = await supabase.from('employee_skills').insert({
      skill_id: skillId,
      employee_id: employeeId,
      proficiency_level: level,
      acquired_date: acquiredDate,
      last_assessed_date: acquiredDate,
    });
    if (error) throw new Error(error.message);
    const { data } = await supabase.from('employee_skills').select('id, employee_id, skill_id, proficiency_level, acquired_date, last_assessed_date');
    setAllAssignments((data ?? []) as EmployeeSkillRow[]);
  };

  const removeAssignment = async (rowId: string) => {
    await supabase.from('employee_skills').delete().eq('id', rowId);
    setAllAssignments((prev) => prev.filter((a) => a.id !== rowId));
  };

  const filteredSkills = skills.filter((s) => {
    if (filterCat !== 'all' && s.category !== filterCat) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredEmployeesView = employees.filter((e) => {
    const q = empSearch.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    );
  });

  const empAssignments = selectedEmpView
    ? allAssignments.filter((a) => a.employee_id === selectedEmpView)
    : [];

  const getSkillName = (skillId: string) => skills.find((s) => s.id === skillId)?.name ?? skillId;
  const getSkillCategory = (skillId: string) => skills.find((s) => s.id === skillId)?.category ?? '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement du référentiel…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* View mode toggle + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('skills')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'skills' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ListChecks className="w-4 h-4" />
            Par compétence
          </button>
          <button
            onClick={() => setViewMode('employees')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'employees' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" />
            Par collaborateur
          </button>
        </div>
        {viewMode === 'skills' && (
          <button
            onClick={() => setSkillModal({})}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle compétence
          </button>
        )}
      </div>

      {/* ── Vue par compétence ── */}
      {viewMode === 'skills' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une compétence…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Stats mini */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => {
              const count = skills.filter((s) => s.category === cat.value).length;
              const assigned = allAssignments.filter((a) => {
                const sk = skills.find((s) => s.id === a.skill_id);
                return sk?.category === cat.value;
              }).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilterCat(filterCat === cat.value ? 'all' : cat.value)}
                  className={`p-3 rounded-xl border text-left transition ${filterCat === cat.value ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                  <p className="text-lg font-bold text-slate-900 mt-1.5">{count}</p>
                  <p className="text-xs text-slate-500">{assigned} affectation{assigned !== 1 ? 's' : ''}</p>
                </button>
              );
            })}
          </div>

          {/* Skills list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">{filteredSkills.length} compétence{filteredSkills.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-slate-500">{allAssignments.length} affectation{allAssignments.length !== 1 ? 's' : ''} au total</p>
            </div>
            {filteredSkills.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Aucune compétence trouvée.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSkills.map((skill) => {
                  const count = allAssignments.filter((a) => a.skill_id === skill.id).length;
                  return (
                    <div key={skill.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{skill.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryStyle(skill.category)}`}>
                            {getCategoryLabel(skill.category)}
                          </span>
                        </div>
                        {skill.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{skill.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center hidden sm:block">
                          <p className="text-base font-bold text-slate-800">{count}</p>
                          <p className="text-[10px] text-slate-400">affecté{count !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => setAssignModal(skill)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Affecter
                        </button>
                        <button
                          onClick={() => setSkillModal(skill)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSkill(skill.id)}
                          disabled={deletingId === skill.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          {deletingId === skill.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vue par collaborateur ── */}
      {viewMode === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un collaborateur…"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedEmpView}
              onChange={(e) => setSelectedEmpView(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Sélectionner un collaborateur --</option>
              {filteredEmployeesView.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}{e.position_title ? ` — ${e.position_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedEmpView ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {(() => {
                const emp = employees.find((e) => e.id === selectedEmpView);
                return (
                  <div className="px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
                        {emp?.first_name[0]}{emp?.last_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{emp?.first_name} {emp?.last_name}</p>
                        <p className="text-slate-300 text-xs">{emp?.position_title ?? '—'} · {emp?.department ?? '—'}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-bold">{empAssignments.length}</p>
                        <p className="text-slate-300 text-xs">compétence{empAssignments.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {empAssignments.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  Aucune compétence affectée à ce collaborateur.
                  <br />
                  <button
                    onClick={() => {
                      const firstSkill = skills[0];
                      if (firstSkill) setAssignModal(firstSkill);
                    }}
                    className="mt-3 text-blue-600 hover:underline text-xs"
                  >
                    Aller dans la vue "Par compétence" pour affecter
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {empAssignments
                    .sort((a, b) => {
                      const la = LEVELS.findIndex((l) => l.value === b.proficiency_level);
                      const lb = LEVELS.findIndex((l) => l.value === a.proficiency_level);
                      return la - lb;
                    })
                    .map((a) => (
                      <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{getSkillName(a.skill_id)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryStyle(getSkillCategory(a.skill_id))}`}>
                              {getCategoryLabel(getSkillCategory(a.skill_id))}
                            </span>
                          </div>
                          {a.acquired_date && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              Acquis le {new Date(a.acquired_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <SkillLevelBadge level={a.proficiency_level} />
                        <button
                          onClick={() => removeAssignment(a.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {employees
                  .filter((e) => {
                    const q = empSearch.toLowerCase();
                    return (
                      e.first_name.toLowerCase().includes(q) ||
                      e.last_name.toLowerCase().includes(q) ||
                      (e.department ?? '').toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => {
                    const count = allAssignments.filter((a) => a.employee_id === emp.id).length;
                    const topSkills = allAssignments
                      .filter((a) => a.employee_id === emp.id)
                      .sort((a, b) => LEVELS.findIndex((l) => l.value === b.proficiency_level) - LEVELS.findIndex((l) => l.value === a.proficiency_level))
                      .slice(0, 3);
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => setSelectedEmpView(emp.id)}
                      >
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-slate-500 truncate">{emp.position_title ?? '—'} · {emp.department ?? '—'}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {topSkills.map((a) => (
                              <span key={a.id} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                                {getSkillName(a.skill_id)}
                              </span>
                            ))}
                            {count > 3 && <span className="text-xs text-slate-400">+{count - 3}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold text-slate-800">{count}</p>
                          <p className="text-[10px] text-slate-400">compétence{count !== 1 ? 's' : ''}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {skillModal !== false && (
        <SkillFormModal
          skill={skillModal}
          onSave={saveSkill}
          onClose={() => setSkillModal(false)}
        />
      )}
      {assignModal && (
        <AssignSkillModal
          skill={assignModal}
          employees={employees}
          assignments={allAssignments.filter((a) => a.skill_id === assignModal.id)}
          onSave={(empId, lv, dt) => assignSkill(assignModal.id, empId, lv, dt)}
          onRemove={removeAssignment}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SkillsManagement() {
  const [activeTab, setActiveTab] = useState<'matching' | 'succession' | 'training' | 'referential' | 'development' | 'competency_framework'>('referential');
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [posRes, empRes] = await Promise.all([
        supabase
          .from('positions')
          .select('id, title, departments(name)')
          .order('title'),
        supabase
          .from('employees')
          .select('id, first_name, last_name, positions(title), departments(name)')
          .eq('employment_status', 'active')
          .order('first_name'),
      ]);

      setPositions(
        (posRes.data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          department: p.departments?.name ?? '',
        }))
      );
      setEmployees(
        (empRes.data ?? []).map((e: any) => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          position_title: e.positions?.title ?? null,
          department: e.departments?.name ?? null,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const TABS = [
    { id: 'referential' as const, label: 'Référentiel de compétences', icon: ListChecks, color: 'slate' },
    { id: 'competency_framework' as const, label: 'Cadre de compétences RH', icon: Award, color: 'orange' },
    { id: 'matching' as const, label: 'Adéquation poste-profil', icon: Target, color: 'blue' },
    { id: 'succession' as const, label: 'Plan de succession', icon: UserCheck, color: 'amber' },
    { id: 'training' as const, label: 'Recommandations formation', icon: GraduationCap, color: 'emerald' },
    { id: 'development' as const, label: 'Plans de développement', icon: BookOpen, color: 'teal' },
  ];

  const ACTIVE_TAB_STYLE: Record<string, string> = {
    referential: 'border-slate-700 text-slate-900',
    competency_framework: 'border-orange-500 text-orange-600',
    matching: 'border-blue-600 text-blue-600',
    succession: 'border-amber-500 text-amber-600',
    training: 'border-emerald-600 text-emerald-600',
    development: 'border-teal-600 text-teal-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestion des Compétences</h2>
          <p className="text-slate-500 text-sm mt-0.5">Analyse IA transversale des profils, successions et plans de développement</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-200 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-sky-700">IA active</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Employés actifs', value: employees.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Postes référencés', value: positions.length, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Profils à analyser', value: employees.length, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Modules IA', value: 3, icon: Bot, color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {loadingData ? <span className="inline-block w-8 h-5 bg-slate-200 rounded animate-pulse" /> : stat.value}
                </p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${isActive ? ACTIVE_TAB_STYLE[tab.id] : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Chargement des données…</span>
            </div>
          ) : (
            <>
              {activeTab === 'referential' && <SkillReferentialTab employees={employees} />}
              {activeTab === 'competency_framework' && <CompetencyFramework />}
              {activeTab === 'matching' && <PositionMatchingTab positions={positions} />}
              {activeTab === 'succession' && <SuccessionPlanningTab employees={employees} />}
              {activeTab === 'training' && <TrainingRecommendationsTab positions={positions} employees={employees} />}
              {activeTab === 'development' && <DevelopmentPlans />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
