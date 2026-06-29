import { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft, Search, Sparkles, Languages, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MasterSkill { id: string; name: string; category: string; }
interface Position { id: string; title: string; department_id: string | null; }

const CAT_LABEL: Record<string, string> = {
  technical: 'Technique', soft: 'Soft Skills', language: 'Langues', certification: 'Certifications', other: 'Autres',
};
const CAT_ORDER = ['technical', 'soft', 'language', 'certification', 'other'];

interface JobOpeningFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

type Tab = 'infos' | 'candidat' | 'competences' | 'traduction' | 'recapitulatif';

const TABS: { value: Tab; label: string }[] = [
  { value: 'infos',          label: 'Informations' },
  { value: 'candidat',       label: 'Critères candidat' },
  { value: 'competences',    label: 'Compétences' },
  { value: 'traduction',     label: 'Traduction EN' },
  { value: 'recapitulatif',  label: 'Récapitulatif' },
];

const EDU_LEVELS = [
  'CEP', 'BEPC', 'BAC',
  'BAC+2 (BTS/DUT)', 'BAC+3 (Licence)', 'BAC+4',
  'BAC+5 (Master)', 'Doctorat', 'Indifférent',
];

const TRANSLATION_STATUS_CONFIG = {
  none:          { label: 'Non traduit',          color: 'text-slate-500',  bg: 'bg-slate-100',  icon: Clock },
  ai_generated:  { label: 'Traduction IA',         color: 'text-amber-700', bg: 'bg-amber-50',   icon: Sparkles },
  validated:     { label: 'Validée par la cellule', color: 'text-green-700', bg: 'bg-green-50',   icon: CheckCircle },
};

function genRef() {
  return `SNH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
}

function inp(err = false) {
  return `w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-snh-green focus:border-transparent ${err ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`;
}
function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}{req && <span className="text-red-500 ml-1">*</span>}</label>;
}

// Side-by-side FR/EN field
function BilingualField({
  label, frValue, enValue, onEnChange, placeholder, multiline, rows = 4,
}: {
  label: string; frValue: string; enValue: string; onEnChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; rows?: number;
}) {
  const cls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-snh-green focus:border-transparent border-slate-300 bg-white';
  const roBase = 'w-full px-3 py-2.5 border rounded-lg text-sm bg-slate-50 border-slate-200 text-slate-600 leading-relaxed';
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">🇫🇷 Français (source)</p>
          {multiline
            ? <textarea readOnly value={frValue} rows={rows} className={roBase + ' resize-none'} />
            : <input readOnly value={frValue} className={roBase} />
          }
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">🇬🇧 English (traduction)</p>
          {multiline
            ? <textarea value={enValue} onChange={e => onEnChange(e.target.value)} rows={rows}
                placeholder={placeholder} className={cls + ' resize-none'} />
            : <input value={enValue} onChange={e => onEnChange(e.target.value)}
                placeholder={placeholder} className={cls} />
          }
        </div>
      </div>
    </div>
  );
}

export function JobOpeningForm({ onClose, onSuccess, initialData }: JobOpeningFormProps) {
  const { profile: authProfile } = useAuth();
  const canPublish = ['drh', 'admin', 'recruitment_manager'].includes(authProfile?.role || '');
  const isEdit = !!initialData?.id;
  const [tab, setTab] = useState<Tab>('infos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // ── Tab 1: Informations ───────────────────────────────────────────────────
  const [positionId, setPositionId] = useState(() => initialData?.position_id || '');
  const [title, setTitle] = useState(() => initialData?.title || '');
  const [reference, setReference] = useState(() => initialData?.reference || genRef());
  const [contractType, setContractType] = useState(() => initialData?.contract_type || 'CDI');
  const [location, setLocation] = useState(() => initialData?.location || 'Yaoundé');
  const [status, setStatus] = useState(() => initialData?.status || 'draft');
  const [workMode, setWorkMode] = useState(() => initialData?.work_mode || 'Présentiel uniquement');
  const [publicationDate, setPublicationDate] = useState(() => initialData?.publication_date || new Date().toISOString().split('T')[0]);
  const [closingDate, setClosingDate] = useState(() => initialData?.closing_date || '');
  const [description, setDescription] = useState(() => initialData?.description || '');
  const [openingsCount, setOpeningsCount] = useState(() => initialData?.openings_count ?? 1);
  const [isInternal, setIsInternal] = useState(() => initialData?.is_internal ?? false);
  const [departmentId, setDepartmentId] = useState(() => initialData?.department_id || '');

  // ── Tab 2: Critères candidat ──────────────────────────────────────────────
  const [educationLevel, setEducationLevel] = useState(() => initialData?.education_level || '');
  const [minExperienceYears, setMinExperienceYears] = useState(() => initialData?.min_experience_years ?? 0);
  const [requirements, setRequirements] = useState(() => initialData?.requirements || '');

  // ── Tab 3: Compétences ────────────────────────────────────────────────────
  const [requiredSkills, setRequiredSkills] = useState<string[]>(() => initialData?.required_skills || []);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>(() => initialData?.nice_to_have_skills || []);
  const [masterSkills, setMasterSkills] = useState<MasterSkill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');

  // ── Tab 4: Traduction EN ──────────────────────────────────────────────────
  const [titleEn, setTitleEn] = useState(() => initialData?.title_en || '');
  const [descriptionEn, setDescriptionEn] = useState(() => initialData?.description_en || '');
  const [requirementsEn, setRequirementsEn] = useState(() => initialData?.requirements_en || '');
  const [translationStatus, setTranslationStatus] = useState<'none' | 'ai_generated' | 'validated'>(
    () => initialData?.translation_status || 'none',
  );
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState('');
  const [translateMsgType, setTranslateMsgType] = useState<'info' | 'error' | 'warning'>('info');

  useEffect(() => {
    supabase.from('departments').select('id, name').order('name').then(({ data }) => {
      if (data) setDepartments(data);
    });
    supabase.from('skills').select('id, name, category').order('category').order('name').then(({ data }) => {
      if (data) setMasterSkills(data as MasterSkill[]);
    });
    supabase.from('positions').select('id, title, department_id').order('title').then(({ data }) => {
      if (data) setPositions(data as Position[]);
    });
  }, []);

  const handlePositionSelect = (pid: string) => {
    setPositionId(pid);
    if (!pid) { setTitle(''); return; }
    const pos = positions.find(p => p.id === pid);
    if (pos) {
      setTitle(pos.title);
      if (pos.department_id && !departmentId) setDepartmentId(pos.department_id);
    }
  };

  const handleTranslateAI = async () => {
    if (!description.trim() || !requirements.trim()) {
      setTranslateMsg("Remplissez d'abord la description et le profil recherché (onglet Informations / Critères candidat) avant de lancer la traduction.");
      setTranslateMsgType('warning');
      return;
    }
    setTranslating(true);
    setTranslateMsg('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('translate-job-opening', {
        body: { title, description, requirements },
      });
      if (fnErr) throw fnErr;
      if (data?.no_key) {
        setTranslateMsg(data.message);
        setTranslateMsgType('warning');
        return;
      }
      if (data?.title_en) setTitleEn(data.title_en);
      if (data?.description_en) setDescriptionEn(data.description_en);
      if (data?.requirements_en) setRequirementsEn(data.requirements_en);
      if (data?.title_en) setTranslationStatus('ai_generated');
      setTranslateMsg(data?.message || 'Traduction générée. Vérifiez et corrigez si nécessaire.');
      setTranslateMsgType('info');
    } catch (e: any) {
      setTranslateMsg('Erreur : ' + (e.message || 'inconnu'));
      setTranslateMsgType('error');
    } finally {
      setTranslating(false);
    }
  };

  const tabIdx = TABS.findIndex(t => t.value === tab);
  const isLast = tabIdx === TABS.length - 1;
  const isFirst = tabIdx === 0;

  const goNext = () => {
    if (tab === 'infos') {
      if (!positionId) { setError('Veuillez sélectionner un poste dans le référentiel.'); return; }
      if (!reference.trim()) { setError('La référence est obligatoire.'); return; }
      if (!description.trim()) { setError('La description du poste est obligatoire.'); return; }
    }
    if (tab === 'candidat') {
      if (!educationLevel) { setError('Le niveau d\'études requis est obligatoire.'); return; }
      if (!requirements.trim()) { setError('Le profil recherché / exigences est obligatoire.'); return; }
    }
    setError('');
    setTab(TABS[tabIdx + 1].value);
  };
  const goPrev = () => { setError(''); setTab(TABS[tabIdx - 1].value); };

  const handleSubmit = async () => {
    if (!positionId) { setTab('infos'); setError('Veuillez sélectionner un poste dans le référentiel.'); return; }
    if (!reference.trim()) { setTab('infos'); setError('La référence est obligatoire.'); return; }
    if (!description.trim()) { setTab('infos'); setError('La description du poste est obligatoire.'); return; }
    if (!educationLevel) { setTab('candidat'); setError('Le niveau d\'études requis est obligatoire.'); return; }
    if (!requirements.trim()) { setTab('candidat'); setError('Le profil recherché / exigences est obligatoire.'); return; }
    setError(''); setLoading(true);
    const payload = {
      title,
      position_id: positionId || null,
      reference, contract_type: contractType,
      location: location || null,
      status,
      description,
      requirements: requirements || null,
      department_id: departmentId || null,
      education_level: educationLevel || null,
      min_experience_years: minExperienceYears,
      required_skills: requiredSkills,
      nice_to_have_skills: niceToHaveSkills,
      publication_date: publicationDate || null,
      closing_date: closingDate || null,
      openings_count: openingsCount,
      is_internal: isInternal,
      work_mode: workMode || null,
      title_en: titleEn || null,
      description_en: descriptionEn || null,
      requirements_en: requirementsEn || null,
      translation_status: translationStatus,
    };
    try {
      if (isEdit) {
        const { error: upErr } = await supabase.from('job_openings').update(payload).eq('id', initialData.id);
        if (upErr) throw upErr;
      } else {
        const { error: insertError } = await supabase.from('job_openings').insert(payload);
        if (insertError) throw insertError;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (isEdit ? 'Erreur lors de la modification' : 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const dept = departments.find(d => d.id === departmentId);
  const tsConf = TRANSLATION_STATUS_CONFIG[translationStatus];
  const TransIcon = tsConf.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 pt-5 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Modifier l\'offre' : 'Créer une offre d\'emploi'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{isEdit ? initialData.title : 'SNH Cameroun — Portail Recrutement'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {TABS.map((t, i) => (
              <button key={t.value} onClick={() => { setError(''); setTab(t.value); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${tab === t.value ? 'border-snh-green text-snh-green' : 'border-transparent text-slate-500 hover:text-slate-700'} ${i > tabIdx ? 'opacity-60' : ''}`}>
                {t.value === 'traduction' && <Languages size={13} />}
                {t.label}
                {t.value === 'traduction' && translationStatus !== 'none' && (
                  <span className={`ml-0.5 w-1.5 h-1.5 rounded-full inline-block ${translationStatus === 'validated' ? 'bg-green-500' : 'bg-amber-400'}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* ── Tab 1: Informations ─────────────────────────────────────── */}
          {tab === 'infos' && (
            <div className="space-y-4">
              <div>
                <Lbl req>Poste (référentiel)</Lbl>
                <select value={positionId} onChange={e => handlePositionSelect(e.target.value)} className={inp(!positionId && !!error)}>
                  <option value="">— Sélectionner un poste dans le référentiel —</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                {positionId && title && (
                  <p className="text-xs text-slate-500 mt-1">Intitulé retenu : <strong>{title}</strong></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Lbl req>Référence</Lbl>
                  <input value={reference} onChange={e => setReference(e.target.value)} className={inp()} />
                </div>
                <div>
                  <Lbl>Type de contrat</Lbl>
                  <select value={contractType} onChange={e => setContractType(e.target.value)} className={inp()}>
                    {['CDI','CDD','Stage','Freelance','Alternance'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Localisation</Lbl>
                  <input value={location} onChange={e => setLocation(e.target.value)} className={inp()} placeholder="Yaoundé, Douala..." />
                </div>
                <div>
                  <Lbl>Statut</Lbl>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inp()} disabled={status === 'open' && !canPublish}>
                    {canPublish && <option value="open">Publiée</option>}
                    <option value="draft">Brouillon</option>
                    <option value="closed">Fermée</option>
                    {!canPublish && status === 'open' && <option value="open">Publiée</option>}
                  </select>
                  {!canPublish && <p className="text-xs text-amber-600 mt-1">Seul un Responsable Recrutement ou le DRH peut publier une offre.</p>}
                </div>
                <div>
                  <Lbl>Date de publication</Lbl>
                  <input type="date" value={publicationDate} onChange={e => setPublicationDate(e.target.value)} className={inp()} />
                </div>
                <div>
                  <Lbl>Date de clôture</Lbl>
                  <input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} className={inp()} min={publicationDate} />
                </div>
                <div>
                  <Lbl>Direction / Département</Lbl>
                  <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className={inp()}>
                    <option value="">— Sélectionner —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Nombre de postes</Lbl>
                  <input type="number" min={1} value={openingsCount} onChange={e => setOpeningsCount(Number(e.target.value))} className={inp()} />
                </div>
              </div>
              <div>
                <Lbl req>Description du poste</Lbl>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
                  placeholder="Missions, responsabilités et contexte du poste..."
                  className={inp(!description && !!error) + ' resize-none'} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">Offre interne uniquement (non visible sur le portail candidats)</span>
              </label>
            </div>
          )}

          {/* ── Tab 2: Critères candidat ────────────────────────────────── */}
          {tab === 'candidat' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Lbl req>Niveau d'études requis</Lbl>
                  <select value={educationLevel} onChange={e => setEducationLevel(e.target.value)} className={inp(!educationLevel && !!error)}>
                    <option value="">— Sélectionner —</option>
                    {EDU_LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl req>Expérience minimum (années)</Lbl>
                  <input type="number" min={0} max={30} value={minExperienceYears}
                    onChange={e => setMinExperienceYears(Number(e.target.value))} className={inp()} />
                </div>
              </div>
              <div>
                <Lbl req>Profil recherché / Exigences</Lbl>
                <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={7}
                  placeholder="Compétences requises, qualifications, expérience souhaitée, qualités personnelles..."
                  className={inp(!requirements && !!error) + ' resize-none'} />
              </div>
            </div>
          )}

          {/* ── Tab 3: Compétences ──────────────────────────────────────── */}
          {tab === 'competences' && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span className="text-slate-600 font-medium">Obligatoire</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  <span className="text-slate-600 font-medium">Appréciée (bonus)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" />
                  <span className="text-slate-500">Non sélectionnée</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">Cliquez une fois pour marquer <strong>obligatoire</strong>, deux fois pour <strong>appréciée</strong>, trois fois pour désélectionner.</p>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                  className={inp() + ' pl-9'} placeholder="Rechercher dans le référentiel de compétences..." />
              </div>

              <div className="space-y-4">
                {CAT_ORDER.map(cat => {
                  const f = skillSearch.toLowerCase();
                  const list = masterSkills.filter(m => m.category === cat && (!f || m.name.toLowerCase().includes(f)));
                  if (!list.length) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{CAT_LABEL[cat] ?? cat}</p>
                      <div className="flex flex-wrap gap-2">
                        {list.map(ms => {
                          const isRequired = requiredSkills.includes(ms.name);
                          const isNice = niceToHaveSkills.includes(ms.name);
                          const handleClick = () => {
                            if (!isRequired && !isNice) {
                              setRequiredSkills(p => [...p, ms.name]);
                            } else if (isRequired) {
                              setRequiredSkills(p => p.filter(s => s !== ms.name));
                              setNiceToHaveSkills(p => [...p, ms.name]);
                            } else {
                              setNiceToHaveSkills(p => p.filter(s => s !== ms.name));
                            }
                          };
                          return (
                            <button key={ms.id} type="button" onClick={handleClick}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                isRequired ? 'bg-green-50 border-green-500 text-green-800' :
                                isNice    ? 'bg-amber-50 border-amber-400 text-amber-800' :
                                'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                              }`}>
                              {ms.name}
                              {isRequired && <span className="ml-1 text-green-600 font-bold">✓</span>}
                              {isNice    && <span className="ml-1 text-amber-500 font-bold">+</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(requiredSkills.length > 0 || niceToHaveSkills.length > 0) && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  {requiredSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1.5">Compétences obligatoires ({requiredSkills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {requiredSkills.map(s => (
                          <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 rounded-full text-xs font-medium">
                            {s}
                            <button type="button" onClick={() => setRequiredSkills(p => p.filter(x => x !== s))} className="text-green-500 hover:text-red-500 transition ml-0.5">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {niceToHaveSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1.5">Compétences appréciées ({niceToHaveSkills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {niceToHaveSkills.map(s => (
                          <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-medium">
                            {s}
                            <button type="button" onClick={() => setNiceToHaveSkills(p => p.filter(x => x !== s))} className="text-amber-500 hover:text-red-500 transition ml-0.5">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 4: Traduction EN ────────────────────────────────────── */}
          {tab === 'traduction' && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Languages size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900 mb-0.5">Traduction anglaise de l'offre</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Utilisez le bouton <strong>Traduire avec l'IA</strong> pour générer automatiquement une traduction, puis corrigez si nécessaire.
                    La cellule de traduction peut aussi saisir ou valider directement dans les champs de droite.
                  </p>
                </div>
              </div>

              {/* AI Translate button + status */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={handleTranslateAI}
                  disabled={translating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ background: translating ? '#94a3b8' : '#006B3C' }}>
                  {translating
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Traduction en cours…</>
                    : <><Sparkles size={15} /> Traduire avec l'IA</>
                  }
                </button>

                {/* Translation status selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Statut :</span>
                  <div className="flex gap-1.5">
                    {(Object.entries(TRANSLATION_STATUS_CONFIG) as [keyof typeof TRANSLATION_STATUS_CONFIG, typeof TRANSLATION_STATUS_CONFIG[keyof typeof TRANSLATION_STATUS_CONFIG]][]).map(([val, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <button key={val} onClick={() => setTranslationStatus(val)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            translationStatus === val
                              ? `${conf.bg} ${conf.color} border-current`
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}>
                          <Icon size={12} /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Feedback message */}
              {translateMsg && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${
                  translateMsgType === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                  translateMsgType === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-green-50 border-green-200 text-green-800'
                }`}>
                  {translateMsgType === 'error'   ? <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> :
                   translateMsgType === 'warning' ? <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> :
                   <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />}
                  {translateMsg}
                </div>
              )}

              {/* Bilingual fields */}
              <div className="space-y-5">
                <BilingualField
                  label="Intitulé du poste"
                  frValue={title}
                  enValue={titleEn}
                  onEnChange={setTitleEn}
                  placeholder="Job title in English…"
                />
                <BilingualField
                  label="Description du poste"
                  frValue={description}
                  enValue={descriptionEn}
                  onEnChange={setDescriptionEn}
                  placeholder="Job description in English…"
                  multiline rows={6}
                />
                <BilingualField
                  label="Profil recherché / Exigences"
                  frValue={requirements}
                  enValue={requirementsEn}
                  onEnChange={setRequirementsEn}
                  placeholder="Required profile and qualifications in English…"
                  multiline rows={6}
                />
              </div>

              {/* Completion indicator */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">Complétude de la traduction</p>
                <div className="flex gap-3">
                  {[
                    { label: 'Titre', done: !!titleEn.trim() },
                    { label: 'Description', done: !!descriptionEn.trim() },
                    { label: 'Profil', done: !!requirementsEn.trim() },
                  ].map(f => (
                    <div key={f.label} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${f.done ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {f.done ? <CheckCircle size={12} /> : <Clock size={12} />} {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 5: Récapitulatif ────────────────────────────────────── */}
          {tab === 'recapitulatif' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Récapitulatif de l'offre</p>
                <dl className="space-y-2.5 text-sm">
                  {[
                    ['Poste', title || '—'],
                    ['Référence', reference || '—'],
                    ['Contrat', contractType],
                    ['Localisation', location || '—'],
                    ['Statut', status === 'open' ? 'Publiée' : status === 'draft' ? 'Brouillon' : 'Fermée'],
                    ['Publication', publicationDate || '—'],
                    ['Clôture', closingDate || 'Non définie'],
                    ['Postes', String(openingsCount)],
                    ['Direction', dept?.name || '—'],
                    ['Niveau requis', educationLevel || 'Non défini'],
                    ['Expérience min.', `${minExperienceYears} an${minExperienceYears > 1 ? 's' : ''}`],
                    ['Compétences requises', requiredSkills.length ? requiredSkills.join(', ') : '—'],
                    ['Compétences appréciées', niceToHaveSkills.length ? niceToHaveSkills.join(', ') : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="text-slate-500 w-44 flex-shrink-0">{k}</dt>
                      <dd className="text-slate-800 font-medium break-words">{v}</dd>
                    </div>
                  ))}
                  {description && (
                    <div className="pt-2 border-t border-slate-200">
                      <dt className="text-slate-500 mb-1">Description</dt>
                      <dd className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{description}</dd>
                    </div>
                  )}
                  {requirements && (
                    <div className="pt-2 border-t border-slate-200">
                      <dt className="text-slate-500 mb-1">Profil recherché</dt>
                      <dd className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{requirements}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Translation recap */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Languages size={13} /> Traduction anglaise
                  </p>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${tsConf.bg} ${tsConf.color}`}>
                    <TransIcon size={11} /> {tsConf.label}
                  </span>
                </div>
                {titleEn || descriptionEn || requirementsEn ? (
                  <dl className="space-y-2 text-sm">
                    {titleEn && (
                      <div className="flex gap-2">
                        <dt className="text-slate-500 w-32 flex-shrink-0">Title (EN)</dt>
                        <dd className="text-slate-800 font-medium">{titleEn}</dd>
                      </div>
                    )}
                    {descriptionEn && (
                      <div className="pt-2 border-t border-slate-200">
                        <dt className="text-slate-500 mb-1">Description (EN)</dt>
                        <dd className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{descriptionEn}</dd>
                      </div>
                    )}
                    {requirementsEn && (
                      <div className="pt-2 border-t border-slate-200">
                        <dt className="text-slate-500 mb-1">Required profile (EN)</dt>
                        <dd className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{requirementsEn}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-xs text-slate-400 italic">Aucune traduction saisie. L'offre sera affichée en français uniquement sur le portail.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-600">
            Annuler
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button onClick={goPrev} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-600">
                <ChevronLeft size={15} /> Précédent
              </button>
            )}
            {!isLast ? (
              <button onClick={goNext} className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg text-white font-semibold transition bg-snh-green hover:bg-snh-green-dark">
                Suivant <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2 text-sm rounded-lg text-white font-semibold transition bg-snh-green hover:bg-snh-green-dark disabled:opacity-50">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isEdit ? 'Enregistrement...' : 'Création...'}</>
                  : isEdit ? 'Enregistrer les modifications' : 'Publier l\'offre'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
