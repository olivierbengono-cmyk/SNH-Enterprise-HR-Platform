import { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft, Search, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MasterSkill { id: string; name: string; category: string; }
const CAT_LABEL: Record<string, string> = {
  technical: 'Technique', soft: 'Soft Skills', language: 'Langues', certification: 'Certifications', other: 'Autres',
};
const CAT_ORDER = ['technical', 'soft', 'language', 'certification', 'other'];

interface JobOpeningFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'infos' | 'candidat' | 'competences' | 'conditions';

const TABS: { value: Tab; label: string }[] = [
  { value: 'infos',       label: 'Informations' },
  { value: 'candidat',    label: 'Critères candidat' },
  { value: 'competences', label: 'Compétences' },
  { value: 'conditions',  label: 'Langues & Conditions' },
];

const EDU_LEVELS = [
  'CEP', 'BEPC', 'BAC',
  'BAC+2 (BTS/DUT)', 'BAC+3 (Licence)', 'BAC+4',
  'BAC+5 (Master)', 'Doctorat', 'Indifférent',
];

const WORK_MODES = ['Présentiel uniquement', 'Télétravail partiel', 'Full remote'];

function genRef() {
  return `SNH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
}

function inp(err = false) {
  return `w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-snh-green focus:border-transparent ${err ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`;
}
function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}{req && <span className="text-red-500 ml-1">*</span>}</label>;
}

export function JobOpeningForm({ onClose, onSuccess }: JobOpeningFormProps) {
  const [tab, setTab] = useState<Tab>('infos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // ── Tab 1: Informations ───────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [reference, setReference] = useState(genRef());
  const [contractType, setContractType] = useState('CDI');
  const [location, setLocation] = useState('Yaoundé');
  const [status, setStatus] = useState('open');
  const [workMode, setWorkMode] = useState('Présentiel uniquement');
  const [publicationDate, setPublicationDate] = useState(new Date().toISOString().split('T')[0]);
  const [closingDate, setClosingDate] = useState('');
  const [description, setDescription] = useState('');
  const [openingsCount, setOpeningsCount] = useState(1);
  const [isInternal, setIsInternal] = useState(false);
  const [departmentId, setDepartmentId] = useState('');

  // ── Tab 2: Critères candidat ──────────────────────────────────────────────
  const [educationLevel, setEducationLevel] = useState('');
  const [minExperienceYears, setMinExperienceYears] = useState(0);
  const [requirements, setRequirements] = useState('');

  // ── Tab 3: Compétences ────────────────────────────────────────────────────
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [masterSkills, setMasterSkills] = useState<MasterSkill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');

  // ── Tab 4: Langues & Conditions ───────────────────────────────────────────
  const [salaryRange, setSalaryRange] = useState('');
  const [requiredLanguages, setRequiredLanguages] = useState<{ language: string; level: string }[]>([]);
  const [benefits, setBenefits] = useState('');
  const [otherConditions, setOtherConditions] = useState('');

  const addLanguage = () => setRequiredLanguages(p => [...p, { language: '', level: 'Courant' }]);
  const updLanguage = (i: number, k: 'language' | 'level', v: string) =>
    setRequiredLanguages(p => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });
  const delLanguage = (i: number) => setRequiredLanguages(p => p.filter((_, j) => j !== i));

  useEffect(() => {
    supabase.from('departments').select('id, name').order('name').then(({ data }) => {
      if (data) setDepartments(data);
    });
    supabase.from('skills').select('id, name, category').order('category').order('name').then(({ data }) => {
      if (data) setMasterSkills(data as MasterSkill[]);
    });
  }, []);

  const toggleSkill = (name: string, required: boolean) => {
    if (required) {
      setRequiredSkills(prev =>
        prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
      );
    } else {
      setNiceToHaveSkills(prev =>
        prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
      );
    }
  };

  const tabIdx = TABS.findIndex(t => t.value === tab);
  const isLast = tabIdx === TABS.length - 1;
  const isFirst = tabIdx === 0;

  const goNext = () => {
    if (tab === 'infos' && !title.trim()) { setError('Le titre du poste est obligatoire.'); return; }
    if (tab === 'infos' && !reference.trim()) { setError('La référence est obligatoire.'); return; }
    setError('');
    setTab(TABS[tabIdx + 1].value);
  };
  const goPrev = () => { setError(''); setTab(TABS[tabIdx - 1].value); };

  const handleSubmit = async () => {
    if (!title.trim()) { setTab('infos'); setError('Le titre du poste est obligatoire.'); return; }
    if (!reference.trim()) { setTab('infos'); setError('La référence est obligatoire.'); return; }
    if (!description.trim()) { setTab('infos'); setError('La description du poste est obligatoire.'); return; }
    setError(''); setLoading(true);
    try {
      const { error: insertError } = await supabase.from('job_openings').insert({
        title, reference, contract_type: contractType,
        location: location || null,
        status,
        description,
        requirements: requirements || null,
        department_id: departmentId || null,
        education_level: educationLevel || null,
        min_experience_years: minExperienceYears,
        required_skills: requiredSkills,
        nice_to_have_skills: niceToHaveSkills,
        salary_range: salaryRange || null,
        publication_date: publicationDate || null,
        closing_date: closingDate || null,
        openings_count: openingsCount,
        is_internal: isInternal,
        work_mode: workMode || null,
        required_languages: requiredLanguages.filter(l => l.language.trim()).map(l => `${l.language.trim()} (${l.level})`),
        benefits: benefits.trim() || null,
        other_conditions: otherConditions.trim() || null,
      });
      if (insertError) throw insertError;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 pt-5 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Créer une offre d'emploi</h2>
              <p className="text-xs text-slate-500 mt-0.5">SNH Cameroun — Portail Recrutement</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 -mb-px">
            {TABS.map((t, i) => (
              <button key={t.value} onClick={() => { setError(''); setTab(t.value); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.value ? 'border-snh-green text-snh-green' : 'border-transparent text-slate-500 hover:text-slate-700'} ${i > tabIdx ? 'opacity-60' : ''}`}>
                {t.label}
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
                <Lbl req>Titre du poste</Lbl>
                <input value={title} onChange={e => setTitle(e.target.value)} className={inp(!title && !!error)}
                  placeholder="Ingénieur Réservoir, Analyste Financier..." />
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
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inp()}>
                    <option value="open">Publiée</option>
                    <option value="draft">Brouillon</option>
                    <option value="closed">Fermée</option>
                  </select>
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
                  <Lbl>Niveau d'études requis</Lbl>
                  <select value={educationLevel} onChange={e => setEducationLevel(e.target.value)} className={inp()}>
                    <option value="">— Indifférent —</option>
                    {EDU_LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Expérience minimum (années)</Lbl>
                  <input type="number" min={0} max={30} value={minExperienceYears}
                    onChange={e => setMinExperienceYears(Number(e.target.value))} className={inp()} />
                </div>
              </div>
              <div>
                <Lbl>Profil recherché / Exigences</Lbl>
                <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={7}
                  placeholder="Compétences requises, qualifications, expérience souhaitée, qualités personnelles..."
                  className={inp() + ' resize-none'} />
              </div>
            </div>
          )}

          {/* ── Tab 3: Compétences ──────────────────────────────────────── */}
          {tab === 'competences' && (
            <div className="space-y-5">
              {/* Legend */}
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

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                  className={inp() + ' pl-9'} placeholder="Rechercher dans le référentiel de compétences..." />
              </div>

              {/* Skills grouped by category */}
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

              {/* Summary of selected */}
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

          {/* ── Tab 4: Langues & Conditions ─────────────────────────────── */}
          {tab === 'conditions' && (
            <div className="space-y-5">

              {/* Langues requises */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Lbl>Langues requises</Lbl>
                  <button type="button" onClick={addLanguage}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-snh-green text-white font-semibold hover:bg-snh-green-dark transition">
                    <Plus size={12} /> Ajouter une langue
                  </button>
                </div>
                {requiredLanguages.length === 0 ? (
                  <button type="button" onClick={addLanguage}
                    className="w-full border-2 border-dashed border-slate-200 rounded-xl py-5 text-sm text-slate-400 hover:border-snh-green hover:text-snh-green flex items-center justify-center gap-2 transition">
                    <Plus size={15} /> Cliquez pour ajouter une exigence linguistique
                  </button>
                ) : (
                  <div className="space-y-2">
                    {requiredLanguages.map((lang, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">Langue</label>
                          <input value={lang.language} onChange={e => updLanguage(i, 'language', e.target.value)}
                            className={inp()} placeholder="Français, Anglais, Espagnol..." />
                        </div>
                        <div className="w-44 flex-shrink-0">
                          <label className="block text-xs text-slate-500 mb-1">Niveau requis</label>
                          <select value={lang.level} onChange={e => updLanguage(i, 'level', e.target.value)} className={inp()}>
                            {['Notions', 'Scolaire', 'Intermédiaire', 'Courant', 'Professionnel', 'Bilingue', 'Langue maternelle'].map(l => (
                              <option key={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <button type="button" onClick={() => delLanguage(i)}
                          className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conditions de rémunération */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Rémunération & Avantages</p>
                <div className="space-y-4">
                  <div>
                    <Lbl>Fourchette salariale</Lbl>
                    <input value={salaryRange} onChange={e => setSalaryRange(e.target.value)} className={inp()}
                      placeholder="Ex: 400 000 – 700 000 FCFA/mois" />
                    <p className="text-xs text-slate-400 mt-1">Laissez vide si confidentiel.</p>
                  </div>
                  <div>
                    <Lbl>Avantages et bénéfices</Lbl>
                    <textarea value={benefits} onChange={e => setBenefits(e.target.value)} rows={3}
                      className={inp() + ' resize-none'}
                      placeholder="Assurance santé, voiture de fonction, tickets restaurant, prime de performance, logement de fonction..." />
                  </div>
                </div>
              </div>

              {/* Autres conditions */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Autres conditions</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Lbl>Mode de travail</Lbl>
                    <select value={workMode} onChange={e => setWorkMode(e.target.value)} className={inp()}>
                      {WORK_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl>Disponibilité requise</Lbl>
                    <select className={inp()} defaultValue="">
                      <option value="">— Non précisée —</option>
                      <option>Immédiate</option>
                      <option>Sous 1 mois</option>
                      <option>Sous 3 mois</option>
                      <option>Flexible</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Lbl>Autres conditions particulières</Lbl>
                  <textarea value={otherConditions} onChange={e => setOtherConditions(e.target.value)} rows={3}
                    className={inp() + ' resize-none'}
                    placeholder="Mobilité géographique, horaires décalés, astreintes, port d'EPI obligatoire, permis B requis..." />
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="border-t border-slate-100 pt-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Récapitulatif de l'offre</p>
                  <dl className="space-y-2 text-sm">
                    {[
                      ['Titre', title || '—'],
                      ['Référence', reference || '—'],
                      ['Contrat', contractType],
                      ['Localisation', location || '—'],
                      ['Mode de travail', workMode],
                      ['Statut', status === 'open' ? 'Publiée' : status === 'draft' ? 'Brouillon' : 'Fermée'],
                      ['Postes', String(openingsCount)],
                      ['Niveau requis', educationLevel || 'Indifférent'],
                      ['Expérience min.', `${minExperienceYears} an${minExperienceYears > 1 ? 's' : ''}`],
                      ['Langues', requiredLanguages.filter(l => l.language.trim()).length
                        ? requiredLanguages.filter(l => l.language.trim()).map(l => `${l.language} (${l.level})`).join(', ')
                        : '—'],
                      ['Compétences requises', requiredSkills.length ? requiredSkills.join(', ') : '—'],
                      ['Compétences bonus', niceToHaveSkills.length ? niceToHaveSkills.join(', ') : '—'],
                      ['Salaire', salaryRange || 'Confidentiel'],
                      ['Avantages', benefits || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-slate-500 w-44 flex-shrink-0">{k}</dt>
                        <dd className="text-slate-800 font-medium break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
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
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création...</> : 'Publier l\'offre'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
