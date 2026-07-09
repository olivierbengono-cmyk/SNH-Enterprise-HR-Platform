import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Briefcase, GraduationCap, FileText, CheckCircle, XCircle, Plus, Trash2, Upload, MapPin, Phone, Mail, Linkedin, Globe, Calendar, Building2, ArrowRight, X, LogIn, UserPlus, LogOut, Sparkles, Clock, Star, AlertCircle, ChevronDown, ChevronUp, Lock, Eye, EyeOff, MessageSquare, BookOpen, Bell, LayoutDashboard, Send, Search, Plane as PaperPlane, ChevronRight, Home, Folder, BarChart3, Settings, Camera, Download, Monitor, Scale, Shield, DollarSign, Layers, Flame, Wrench, Zap, Users, Package, Cpu, TrendingUp, FlaskConical, Truck, HeartPulse, Printer } from 'lucide-react';
import { generateCV, CVData } from '../../utils/cvPDF';

// ── Types ──────────────────────────────────────────────────────────────────────
interface CandidateProfile {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; location: string | null; linkedin_url: string | null; birth_date: string | null;
  portfolio_url: string | null; summary: string | null; desired_position: string | null;
  desired_salary_min: number | null; desired_salary_max: number | null;
  availability_date: string | null; mobility: string | null;
  profile_completed: boolean; gender?: string | null;
  nationality?: string | null; region?: string | null; professional_title?: string | null;
  national_id?: string | null; phone2?: string | null;
  facebook_url?: string | null; twitter_url?: string | null; instagram_url?: string | null;
  photo_url?: string | null;
}
interface JobOpening {
  id: string; title: string; reference: string; contract_type: string;
  location: string; description: string; requirements: string;
  required_skills: string[]; nice_to_have_skills: string[];
  min_experience_years: number; education_level: string | null;
  publication_date: string; closing_date: string;
  title_en?: string | null; description_en?: string | null; requirements_en?: string | null;
  translation_status?: string | null;
}
interface JobMatch {
  id: string; job_opening_id: string; match_score: number;
  skill_match_score: number; experience_match_score: number; education_match_score: number;
  matched_skills: string[]; missing_skills: string[]; ai_summary: string | null;
  job_opening: JobOpening;
}
interface Application {
  id: string; job_opening_id: string | null; desired_position: string | null;
  cover_letter: string | null; status: string; created_at: string;
  spontaneous_type?: string | null;
  job_opening?: { id: string; title: string } | null;
}
interface Experience {
  id?: string; job_title: string; company: string; location: string;
  start_date: string; end_date: string; is_current: boolean; description: string;
  contract_type?: string; sector?: string;
}
interface Education {
  id?: string; degree: string; field_of_study: string; institution: string;
  location: string; start_date: string; end_date: string; is_current: boolean;
  grade: string; education_level?: string; country?: string; description?: string;
}
interface Skill {
  id?: string; skill_id?: string | null; name: string;
  category: 'technical' | 'soft' | 'language' | 'certification' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
interface MasterSkill { id: string; name: string; category: string; description?: string | null; }
interface Language { id?: string; name: string; level: string; }
interface CandidateDoc {
  id: string; candidate_id: string; type: string;
  file_name: string; file_url: string; file_size: number | null; uploaded_at: string;
  expiration_date?: string | null;
}
interface Notification {
  id: string; title: string; body: string; read: boolean; created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SNH_GREEN = '#006B3C';
const SNH_RED   = '#CE1126';
const SNH_GOLD  = '#FCD116';
/** @deprecated use SNH_GREEN */
const SNH_BLUE  = SNH_GREEN;
const SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
];
const SKILL_CATEGORIES = [
  { value: 'technical', label: 'Technique' },
  { value: 'soft', label: 'Savoir-être' },
  { value: 'language', label: 'Langue' },
  { value: 'certification', label: 'Certification' },
  { value: 'other', label: 'Autre' },
];
const LANG_LEVELS = [
  { value: 'beginner',     labelFr: 'Débutant',         labelEn: 'Beginner',    stars: 1 },
  { value: 'intermediate', labelFr: 'Intermédiaire',     labelEn: 'Intermediate', stars: 2 },
  { value: 'good',         labelFr: 'Bon niveau',        labelEn: 'Advanced',    stars: 3 },
  { value: 'excellent',    labelFr: 'Courant',           labelEn: 'Fluent',      stars: 4 },
  { value: 'native',       labelFr: 'Natif / Maternel',  labelEn: 'Native',      stars: 5 },
];
const REGIONS_CM = ['Centre','Littoral','Ouest','Nord','Extrême-Nord','Adamaoua','Est','Sud','Nord-Ouest','Sud-Ouest'];

const COUNTRIES = [
  'Cameroun','Gabon','Congo','République Démocratique du Congo','République Centrafricaine',
  'Guinée Équatoriale','Tchad','Nigeria','Sénégal','Côte d\'Ivoire','Ghana','Togo','Bénin',
  'Mali','Burkina Faso','Niger','Mauritanie','Guinée','Guinée-Bissau','Sierra Leone','Liberia',
  'Cap-Vert','Gambie','Angola','Mozambique','Zambie','Zimbabwe','Malawi','Tanzanie','Kenya',
  'Ouganda','Rwanda','Burundi','Éthiopie','Somalie','Djibouti','Érythrée','Soudan','Soudan du Sud',
  'Maroc','Algérie','Tunisie','Libye','Égypte','Madagascar','Île Maurice','Seychelles',
  'Afrique du Sud','Namibie','Botswana','Lesotho','Eswatini',
  'France','Belgique','Suisse','Luxembourg','Canada','États-Unis','Royaume-Uni','Allemagne',
  'Espagne','Italie','Portugal','Pays-Bas','Suède','Norvège','Danemark','Finlande',
  'Russie','Ukraine','Turquie','Chine','Inde','Japon','Corée du Sud','Brésil','Mexique',
  'Argentine','Colombie','Autre',
];

const PROFILE_TR = {
  fr: {
    tabInfos: 'Infos personnelles', tabFormations: 'Parcours Académique',
    tabExperiences: 'Expériences', tabCompetences: 'Compétences',
    tabLangues: 'Langues', tabCV: 'Générer CV',
    firstName: 'Prénom *', lastName: 'Nom *', birthDate: 'Date de naissance *',
    gender: 'Genre *', genderPh: '— Sélectionner —', genderM: 'Homme', genderF: 'Femme',
    professionalTitle: 'Titre professionnel', professionalTitlePh: 'Ex: Ingénieur Pétrole & Gaz Senior',
    phoneMain: 'Téléphone principal *', phoneMainPh: '+237 6XX XXX XXX',
    phoneSecondary: 'Téléphone secondaire',
    cityResidence: 'Ville de résidence *', cityPh: 'Yaoundé',
    countryResidence: 'Pays de résidence *', countryPh: '— Sélectionner —',
    nationality: 'Nationalité', nationalityPh: 'Camerounaise',
    idNumber: 'N° CNI / Passeport',
    desiredPosition: 'Poste souhaité', desiredPositionPh: 'Ingénieur Réservoir...',
    availability: 'Disponibilité à partir du',
    salary: 'Prétention Salariale (FCFA)', salaryPh: 'Ex : 500 000',
    linkedin: 'Profil LinkedIn', linkedinPh: 'https://linkedin.com/in/...',
    portfolio: 'Site / Portfolio', portfolioPh: 'https://...',
    facebook: 'Facebook', facebookPh: 'https://facebook.com/...',
    twitter: 'Twitter / X', twitterPh: 'https://x.com/...',
    instagram: 'Instagram', instagramPh: 'https://instagram.com/...',
    about: 'À propos de vous', aboutPh: 'Décrivez votre parcours, vos expertises et vos ambitions professionnelles...',
    academicPathTitle: 'Parcours académique',
    formationN: 'Formation', addFormation: 'Ajouter une formation',
    level: 'Niveau *', degree: 'Diplôme obtenu *', institution: 'Établissement *',
    fieldOfStudy: "Domaine d'études *", fieldPh: 'Génie Pétrolier, Finance...',
    eduCountry: 'Pays', eduCity: 'Ville', startYear: 'Année de début *', endYear: 'Année de fin',
    grade: 'Mention', gradePh: 'Très bien, Bien...',
    descSpec: 'Description / Spécialisation', descSpecPh: "Décrivez votre spécialisation, mémoire, projet de fin d'études...",
    currentFormation: 'Formation en cours',
    experiencesTitle: 'Expériences professionnelles / Stages',
    expN: 'Expérience', addExp: 'Ajouter une expérience',
    jobTitle: 'Poste occupé *', jobTitlePh: 'Ingénieur Réservoir...',
    company: 'Entreprise *', sector: "Secteur d'activité", sectorPh: 'Pétrole & Gaz, Finance...',
    contractType: 'Type de contrat', expCity: 'Ville',
    startDate: 'Date de début *', endDate: 'Date de fin',
    currentJob: 'Poste actuel', missions: 'Description des missions', missionsPh: 'Vos principales responsabilités et réalisations...',
    // Skills tab
    skillsTitle: 'Compétences', skillsSelected: 'sélectionnée', skillsSelectedPlural: 'sélectionnées',
    closeCatalogue: 'Fermer le catalogue', browseCatalogue: 'Parcourir le catalogue de compétences',
    skillLevelTitle: 'Niveau par compétence', catTechnical: 'Technique', catSoft: 'Soft Skills',
    catLanguage: 'Langues', catCertification: 'Certifications', catOther: 'Autres',
    noResultFor: 'Aucun résultat pour', customSkillPh: 'Compétence personnalisée non listée...',
    addBtn: 'Ajouter',
    // Languages tab
    langTitle: 'Langues parlées', langLevelTitle: 'Évaluation du niveau',
    langAddPh: 'Ajouter une autre langue (Ex : Espagnol, Arabe…)',
    langGroupWorld: 'Langues mondiales', langGroupAfrican: 'Langues africaines', langGroupOther: 'Autres',
    langLevelBeginner: 'Débutant', langLevelIntermediate: 'Intermédiaire',
    langLevelGood: 'Bon niveau', langLevelExcellent: 'Courant', langLevelNative: 'Natif / Maternel',
    // CV generator
    cvPhotoTitle: 'Photo de profil (CV)',
    cvPhotoHint: 'Format : JPG, PNG, WEBP — max 5 Mo\nPrivilégiez une photo professionnelle (fond neutre, tenue formelle)',
    cvPhotoUploading: 'Téléversement...', cvPhotoBtn: 'Choisir une photo',
    cvPhotoTooLarge: 'Photo trop volumineuse (max 5 Mo)', cvPhotoError: 'Erreur upload : ',
    cvTemplateTitle: 'Modèle de CV',
    cvTemplateClassicLabel: 'SNH Classique', cvTemplateClassicDesc: 'Colonne latérale marine, photo, style institutionnel',
    cvTemplateModernLabel: 'Moderne', cvTemplateModernDesc: 'En-tête plein, bicolonne, épuré et contemporain',
    cvAITitle: 'Amélioration IA (optionnel)',
    cvAIDesc: 'Décrivez le style souhaité, le poste visé ou les points à mettre en avant. L\'IA améliorera votre résumé professionnel.',
    cvAIPh: 'Ex : Mets en avant mes compétences en forage et production pétrolière...',
    cvAIGenerating: 'Génération IA...', cvAIBtn: 'Améliorer avec l\'IA',
    cvAIGenerated: 'Résumé IA généré', cvAISummaryLabel: 'Résumé IA :',
    cvAIDone: 'Génération IA terminée.', cvAIError: 'Erreur lors de la génération IA.',
    cvExportBtn: 'Générer et télécharger le CV (PDF)',
    cvExportHint: 'Le CV s\'ouvre dans un nouvel onglet — utilisez "Imprimer" → "Enregistrer en PDF"',
  },
  en: {
    tabInfos: 'Personal info', tabFormations: 'Academic path',
    tabExperiences: 'Experience', tabCompetences: 'Skills',
    tabLangues: 'Languages', tabCV: 'Generate CV',
    firstName: 'First name *', lastName: 'Last name *', birthDate: 'Date of birth *',
    gender: 'Gender *', genderPh: '— Select —', genderM: 'Male', genderF: 'Female',
    professionalTitle: 'Professional title', professionalTitlePh: 'e.g., Senior Oil & Gas Engineer',
    phoneMain: 'Main phone *', phoneMainPh: '+237 6XX XXX XXX',
    phoneSecondary: 'Secondary phone',
    cityResidence: 'City of residence *', cityPh: 'Yaoundé',
    countryResidence: 'Country of residence *', countryPh: '— Select —',
    nationality: 'Nationality', nationalityPh: 'Cameroonian',
    idNumber: 'National ID / Passport',
    desiredPosition: 'Desired position', desiredPositionPh: 'Reservoir Engineer...',
    availability: 'Available from',
    salary: 'Expected Salary (XAF)', salaryPh: 'Ex: 500,000',
    linkedin: 'LinkedIn profile', linkedinPh: 'https://linkedin.com/in/...',
    portfolio: 'Website / Portfolio', portfolioPh: 'https://...',
    facebook: 'Facebook', facebookPh: 'https://facebook.com/...',
    twitter: 'Twitter / X', twitterPh: 'https://x.com/...',
    instagram: 'Instagram', instagramPh: 'https://instagram.com/...',
    about: 'About you', aboutPh: 'Briefly introduce yourself and your career goals…',
    academicPathTitle: 'Academic path',
    formationN: 'Education', addFormation: 'Add education',
    level: 'Education Level *', degree: 'Degree obtained *', institution: 'School / University *',
    fieldOfStudy: 'Field of study *', fieldPh: 'Petroleum Engineering, Finance...',
    eduCountry: 'Country', eduCity: 'City', startYear: 'Start year *', endYear: 'End year',
    grade: 'Grade', gradePh: 'Distinction, Merit...',
    descSpec: 'Area of Specialization / Major', descSpecPh: 'Provide details about your specialization, thesis or graduation project…',
    currentFormation: 'Currently enrolled',
    experiencesTitle: 'Work experience / Internships',
    expN: 'Experience', addExp: 'Add experience',
    jobTitle: 'Job title *', jobTitlePh: 'Reservoir Engineer...',
    company: 'Company *', sector: 'Industry', sectorPh: 'Oil & Gas, Finance...',
    contractType: 'Contract type', expCity: 'City',
    startDate: 'Start date *', endDate: 'End date',
    currentJob: 'Current position', missions: 'Job description', missionsPh: 'Your main responsibilities and achievements...',
    // Skills tab
    skillsTitle: 'Skills', skillsSelected: 'selected', skillsSelectedPlural: 'selected',
    closeCatalogue: 'Close catalogue', browseCatalogue: 'Browse skills catalogue',
    skillLevelTitle: 'Proficiency Level', catTechnical: 'Technical', catSoft: 'Soft Skills',
    catLanguage: 'Languages', catCertification: 'Certifications', catOther: 'Other',
    noResultFor: 'No result for', customSkillPh: 'Custom skill not listed...',
    addBtn: 'Add',
    // Languages tab
    langTitle: 'Languages spoken', langLevelTitle: 'Level assessment',
    langAddPh: 'Add another language (e.g. Spanish, Arabic…)',
    langGroupWorld: 'World languages', langGroupAfrican: 'African languages', langGroupOther: 'Other',
    langLevelBeginner: 'Beginner', langLevelIntermediate: 'Intermediate',
    langLevelGood: 'Advanced', langLevelExcellent: 'Fluent', langLevelNative: 'Native / Mother tongue',
    // CV generator
    cvPhotoTitle: 'Profile photo (CV)',
    cvPhotoHint: 'Format: JPG, PNG, WEBP — max 5 MB\nProfessional photo preferred (neutral background, formal attire)',
    cvPhotoUploading: 'Uploading, please wait...', cvPhotoBtn: 'Choose a photo',
    cvPhotoTooLarge: 'Photo too large (max 5 MB)', cvPhotoError: 'Upload error: ',
    cvTemplateTitle: 'CV template',
    cvTemplateClassicLabel: 'SNH Classic', cvTemplateClassicDesc: 'Navy sidebar, photo, institutional style',
    cvTemplateModernLabel: 'Modern', cvTemplateModernDesc: 'Full header, two-column, clean and contemporary',
    cvAITitle: 'AI enhancement (optional)',
    cvAIDesc: 'Enter your target role or key highlights. AI will refine your summary.',
    cvAIPh: 'Ex: Highlight my drilling and oil production skills...',
    cvAIGenerating: 'Generating...', cvAIBtn: 'Enhance with AI',
    cvAIGenerated: 'AI summary generated', cvAISummaryLabel: 'AI summary:',
    cvAIDone: 'AI generation complete.', cvAIError: 'Error during AI generation.',
    cvExportBtn: 'Generate and download CV (PDF)',
    cvExportHint: 'The CV opens in a new tab — use "Print" → "Save as PDF"',
  },
} as const;
const SNH_DIRECTIONS = [
  'Direction Exploration & Production',
  'Direction Financière',
  'Direction Informatique & Systèmes d\'Information',
  'Direction Juridique',
  'Direction des Ressources Humaines',
  'Direction HSE (Hygiène, Sécurité, Environnement)',
  'Direction Logistique & Approvisionnement',
  'Direction des Relations Extérieures & Coopération',
  'Direction Commerciale',
  'Direction Générale',
  'Sans préférence — Au choix de la SNH',
];
const DOC_TYPES_FR = [
  { value: 'cv',                  label: 'CV / Curriculum Vitae' },
  { value: 'cover_letter',        label: 'Lettre de motivation' },
  { value: 'diploma',             label: 'Diplôme / Attestation de diplôme' },
  { value: 'cni_passport',        label: 'CNI / Passeport' },
  { value: 'employment_cert',     label: "Attestation d'emploi" },
  { value: 'work_cert',           label: 'Certificat de travail' },
  { value: 'criminal_record',     label: 'Extrait de casier judiciaire (n°3)' },
  { value: 'birth_cert',          label: 'Acte de naissance' },
  { value: 'residence_cert',      label: 'Certificat de résidence' },
  { value: 'medical_cert',        label: 'Certificat médical d\'aptitude' },
  { value: 'tax_cert',            label: 'Attestation de régularité fiscale' },
  { value: 'cnps_cert',           label: 'Attestation CNPS' },
  { value: 'reference',           label: 'Lettre de recommandation' },
  { value: 'other',               label: 'Autre document' },
];
const DOC_TYPES_EN = [
  { value: 'cv',                  label: 'CV / Curriculum Vitae' },
  { value: 'cover_letter',        label: 'Cover letter' },
  { value: 'diploma',             label: 'Diploma / Degree certificate' },
  { value: 'cni_passport',        label: 'National ID / Passport' },
  { value: 'employment_cert',     label: 'Employment certificate' },
  { value: 'work_cert',           label: 'Work certificate' },
  { value: 'criminal_record',     label: 'Criminal record extract' },
  { value: 'birth_cert',          label: 'Birth certificate' },
  { value: 'residence_cert',      label: 'Residence certificate' },
  { value: 'medical_cert',        label: 'Medical fitness certificate' },
  { value: 'tax_cert',            label: 'Tax Clearance Certificate (TCC)' },
  { value: 'cnps_cert',           label: 'CNPS Clearance Certificate' },
  { value: 'reference',           label: 'Recommendation letter' },
  { value: 'other',               label: 'Other document' },
];
function getDocTypes(lang: 'fr' | 'en') { return lang === 'fr' ? DOC_TYPES_FR : DOC_TYPES_EN; }

const EDU_LEVELS = [
  'CEP', 'BEPC', 'BAC',
  'BAC+2 (BTS/DUT)', 'BAC+3 (Licence)', 'BAC+4',
  'BAC+5 (Master)', 'Doctorat', 'Autre',
];
const EDU_LEVELS_EN = [
  'FSLC', 'GCE O-Level', 'GCE A-Level',
  'GCE+2 / HND', "Bachelor's Degree", 'GCE+4',
  "Master's Degree", 'Doctorate / PhD', 'Other',
];
function getEduLevels(lang: 'fr' | 'en') { return lang === 'fr' ? EDU_LEVELS : EDU_LEVELS_EN; }

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// ── UI primitives ──────────────────────────────────────────────────────────────
function inp(err?: boolean) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white ${err ? 'border-red-300 bg-red-50' : 'border-gray-300'}`;
}
function Lbl({ children }: { children: React.ReactNode }) {
  if (typeof children === 'string' && children.endsWith(' *')) {
    return (
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {children.slice(0, -2)}<span className="text-red-500"> *</span>
      </label>
    );
  }
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>;
}
function Tag({ children, variant = 'blue' }: { children: React.ReactNode; variant?: 'blue'|'green'|'amber'|'purple'|'gray'|'red' }) {
  const cls: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls[variant]}`}>{children}</span>;
}
function AppStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new:              { label: 'Soumis',              cls: 'bg-blue-50 text-blue-700' },
    technical_tests:  { label: 'Tests techniques',   cls: 'bg-yellow-50 text-yellow-700' },
    interview:        { label: 'Entretien',           cls: 'bg-orange-50 text-orange-700' },
    psycho_tests:     { label: 'Tests psy.',          cls: 'bg-purple-50 text-purple-700' },
    medical_visit:    { label: 'Visite médicale',    cls: 'bg-teal-50 text-teal-700' },
    morality_inquiry: { label: 'Enquête moralité',   cls: 'bg-cyan-50 text-cyan-700' },
    diploma_check:    { label: 'Auth. diplômes',     cls: 'bg-indigo-50 text-indigo-700' },
    trial:            { label: 'En essai',            cls: 'bg-green-50 text-green-700' },
    assignment:       { label: 'Affectation',         cls: 'bg-emerald-50 text-emerald-700' },
    integrated:       { label: 'Titularisé(e)',      cls: 'bg-emerald-100 text-emerald-800' },
    rejected:         { label: 'Refusé(e)',           cls: 'bg-red-50 text-red-700' },
    withdrawn:        { label: 'Retiré(e)',           cls: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status] ?? map.new;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

// ── Sidebar nav item ───────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, badge, onClick }: {
  icon: React.FC<any>; label: string; active?: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${active ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span> : null}
    </button>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'bg-blue-600' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── SNH Pipeline Progress (shown to candidate) ─────────────────────────────────
const SNH_PIPELINE_STEPS = [
  { value: 'new',              label: 'Candidature' },
  { value: 'technical_tests',  label: 'Tests techniques' },
  { value: 'interview',        label: 'Entretien' },
  { value: 'psycho_tests',     label: 'Tests psy.' },
  { value: 'medical_visit',    label: 'Visite méd.' },
  { value: 'morality_inquiry', label: 'Moralité' },
  { value: 'diploma_check',    label: 'Diplômes' },
  { value: 'trial',            label: 'Essai' },
  { value: 'assignment',       label: 'Affectation' },
  { value: 'integrated',       label: 'Titularisé(e)' },
];
function SNHPipelineProgress({ status, lang }: { status: string; lang: Lang }) {
  const currentIdx = SNH_PIPELINE_STEPS.findIndex(s => s.value === status);
  const isTerminal = status === 'rejected' || status === 'withdrawn';
  if (isTerminal || status === 'new' || currentIdx <= 0) return null;
  const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / SNH_PIPELINE_STEPS.length) * 100) : 0;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{lang === 'fr' ? 'Étape' : 'Step'} {Math.max(1, currentIdx + 1)}/{SNH_PIPELINE_STEPS.length}</span>
        <span className="text-xs font-semibold text-green-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-0.5 overflow-hidden">
        {SNH_PIPELINE_STEPS.map((step, i) => (
          <div key={step.value}
            className={`h-1 flex-1 rounded-sm transition-all ${i <= currentIdx ? 'bg-green-500' : 'bg-gray-200'}`}
            title={step.label}
          />
        ))}
      </div>
    </div>
  );
}

function printApplicationFiche(app: any, candidateName: string) {
  const steps = SNH_PIPELINE_STEPS;
  const currentIdx = steps.findIndex(s => s.value === app.status);
  const STATUS_FR: Record<string, string> = {
    new: 'Candidature soumise', technical_tests: 'Tests techniques — Jury SNH',
    interview: 'Entretien d\'embauche', psycho_tests: 'Tests professionnels & psychotechniques',
    medical_visit: 'Visite médicale d\'embauche', morality_inquiry: 'Enquête de moralité',
    diploma_check: 'Authentification diplômes & état civil', trial: 'Engagement à l\'essai',
    assignment: 'Affectation et prise de service', integrated: 'Titularisation',
    rejected: 'Candidature — décision finale', withdrawn: 'Candidature retirée',
  };

  const stepsHtml = steps.map((s, i) => {
    const done = i < currentIdx;
    const active = i === currentIdx;
    const bg = active ? '#006B3C' : done ? '#10b981' : '#e5e7eb';
    const col = active || done ? '#fff' : '#9ca3af';
    return `<div style="display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
      <div style="width:28px;height:28px;border-radius:50%;background:${bg};color:${col};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${done ? '✓' : i + 1}</div>
      <span style="font-size:13px;font-weight:${active ? '700' : '400'};color:${active ? '#006B3C' : done ? '#059669' : '#94a3b8'};">${s.label}</span>
      ${active ? `<span style="margin-left:auto;font-size:11px;background:#006B3C1a;color:#006B3C;border:1px solid #006B3C40;padding:2px 10px;border-radius:99px;font-weight:600;">Étape actuelle</span>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Fiche de progression — ${candidateName}</title>
  <style>
    body{margin:0;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;}
    @media print{body{padding:16px;}}
    h1{font-size:20px;color:#006B3C;margin:0 0 4px;}
    .sub{color:#6b7280;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;}
    .card{border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px;}
    .label{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;}
    .value{font-size:14px;font-weight:600;color:#111827;}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;}
  </style>
  </head><body>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
    <div style="width:48px;height:48px;background:#006B3C;border-radius:10px;display:flex;align-items:center;justify-content:center;">
      <span style="color:#fff;font-size:20px;font-weight:900;">S</span>
    </div>
    <div>
      <h1>Fiche de progression — Recrutement SNH</h1>
      <p class="sub">Société Nationale des Hydrocarbures du Cameroun</p>
    </div>
  </div>
  <div class="card">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div><p class="label">Candidat(e)</p><p class="value">${candidateName}</p></div>
      <div><p class="label">Poste visé</p><p class="value">${app.desired_position || app.job_opening?.title || '—'}</p></div>
      <div><p class="label">Date de candidature</p><p class="value">${app.created_at ? new Date(app.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p></div>
      <div><p class="label">Statut actuel</p><p class="value" style="color:#006B3C;">${STATUS_FR[app.status] ?? app.status}</p></div>
    </div>
  </div>
  <div class="card">
    <p class="label" style="margin-bottom:12px;">Progression du processus de recrutement</p>
    ${stepsHtml}
  </div>
  <p class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — SNH Recrutement — Confidentiel</p>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

type Section = 'dashboard' | 'profile' | 'documents' | 'jobs' | 'spontaneous' | 'applications' | 'notifications';

// ── i18n ────────────────────────────────────────────────────────────────────────
type Lang = 'fr' | 'en';
const TR = {
  fr: {
    // Auth / nav
    login: 'Connexion', signup: 'Créer un compte', loginTitle: 'Connexion à mon espace',
    registerTitle: 'Créer mon compte candidat', snh: 'SNH Recrutement',
    heroTitle: 'Rejoignez la SNH', heroSub: 'et participez à l\'avenir énergétique du Cameroun',
    heroDesc: 'Découvrez nos opportunités d\'emploi, de stage et déposez votre candidature en quelques étapes.',
    searchPlaceholder: 'Poste, mot-clé, lieu...', allContracts: 'Tous les contrats',
    apply: 'Candidater', seeDetails: 'Voir détails', hideDetails: 'Masquer',
    noJobs: 'Aucune offre ne correspond à votre recherche.', loadingJobs: 'Chargement des offres…',
    spontTitle: 'Vous n\'êtes pas satisfait ?',
    spontDesc: 'Envoyez une candidature spontanée — nous la garderons dans notre vivier de talents.',
    spontBtn: 'Déposer une candidature spontanée',
    available: 'offres disponibles', openUntil: 'Ouvert jusqu\'au',
    firstName: 'Prénom', lastName: 'Nom', email: 'Email', password: 'Mot de passe',
    firstNamePh: 'Olivier', lastNamePh: 'Kamdem',
    alreadyAccount: 'Déjà un compte ? Se connecter', noAccount: 'Pas encore de compte ? S\'inscrire',
    privacy: 'Vos données sont traitées de manière confidentielle conformément à la politique de recrutement SNH.',
    dashboard: 'Tableau de bord', profile: 'Mon profil', documents: 'Mes documents',
    jobs: 'Offres d\'emploi', spontaneous: 'Candidature spontanée', applications: 'Mes candidatures',
    notifications: 'Notifications', logout: 'Déconnexion', menu: 'Menu',
    home: 'Accueil', notifs: 'Notifs', more: 'Plus',
    // Public landing
    statsPublished: 'Offres publiées', statsContracts: 'Types de contrats',
    statsLocation: 'Localisation', statsCountry: 'Cameroun',
    alreadyCandidate: 'Déjà candidat ?', accessMySpace: 'Accéder à mon espace',
    results: 'résultat', resultsPlural: 'résultats', allPositions: 'Toutes les offres',
    reset: 'Réinitialiser', closing: 'Clôture :', details: 'Détails',
    jobDescription: 'Description du poste', profileSought: 'Profil recherché',
    experience: 'Expérience', year: 'an', years: 'ans', min: 'min.',
    formation: 'Formation', reference: 'Référence', applyToOffer: 'Postuler à cette offre',
    footer: 'Société Nationale des Hydrocarbures', rights: 'Tous droits réservés',
    // Auth modal
    connectBtn: 'Se connecter', createAccountBtn: 'Créer mon compte',
    errorNameRequired: 'Prénom et nom requis',
    errorCredentials: 'Email ou mot de passe incorrect',
    errorGeneric: 'Une erreur est survenue',
    // Portal general
    loadingSpace: 'Chargement de votre espace…', candidate: 'Candidat', profileLabel: 'Profil',
    mySpace: 'Mon espace', snhRecruitment: 'Recrutement SNH', account: 'Compte',
    // Dashboard
    statApplications: 'Candidatures soumises', statJobs: 'Offres disponibles',
    statInterviews: 'Entretiens planifiés', statProfileComplete: 'Profil complété',
    completionTitle: 'Complétion du profil', completionBtn: 'Compléter mon profil',
    itemPersonalInfo: 'Informations personnelles', itemEducation: 'Formations académiques',
    itemExperience: 'Expériences professionnelles', itemSkills: 'Compétences',
    itemDocuments: 'Documents justificatifs',
    activityTitle: 'Activité récente', activityEmpty: 'Aucune activité récente',
    activitySubmitted: 'Candidature soumise', activityUpdate: 'Mise à jour de statut',
    matchesTitle: 'Offres recommandées', applied: 'Postulé',
    // Documents
    docsExpiredTitle: 'Documents expirés',
    docsExpiredMsg: 'Veuillez mettre à jour ces documents.',
    docsSoonTitle: 'Documents expirant bientôt (dans 30 jours)',
    docsSoonMsg: 'Pensez à renouveler ces documents.',
    docsInfoTitle: 'À cette étape, seul votre CV est requis',
    docsInfoMsg: 'Les autres documents (diplômes, CNI, attestations d\'emploi, etc.) vous seront demandés aux étapes suivantes du processus de recrutement.',
    docsUploadTitle: 'Téléverser votre CV',
    docsType: 'Type de document', docsExpiry: 'Date d\'expiration (si applicable)',
    docsUploading: 'Envoi en cours...', docsChooseFile: 'Choisir et téléverser un fichier',
    docsFormats: 'PDF, Word, JPG, PNG — max 10 Mo',
    docsMyDocs: 'Mes documents', docsEmpty: 'Aucun document téléversé',
    docsFileTooLarge: 'Fichier trop volumineux (max 10 Mo)',
    docsUploadError: 'Erreur upload : ', docsSaveError: 'Erreur lors de l\'enregistrement : ',
    docsExpiresOn: 'Expire le ', docsExpiredOn: '⚠ Expiré le ', docsSoonOn: '⚠ Expire le ',
    docsCvLabel: 'CV / Curriculum Vitae',
    // Job detail modal
    jdContract: 'Type de contrat', jdLocation: 'Lieu', jdExperience: 'Expérience min.',
    jdNotSpecified: 'Non précisé', jdEducation: 'Niveau d\'études',
    jdPublished: 'Publiée le', jdClosing: 'Clôture le',
    jdDescription: 'Description du poste', jdProfile: 'Profil recherché',
    jdSkillsRequired: 'Compétences requises', jdSkillsNice: 'Compétences appréciées',
    jdDocs: 'Documents complémentaires',
    jdDocsInfo: 'Ces documents seront demandés aux étapes suivantes du processus de sélection.',
    jdClose: 'Fermer', jdApplyBtn: 'Postuler à cette offre',
    jdApplyError: 'Impossible de postuler : ', jdRef: 'Réf.',
    // Jobs section
    jobsTitle: 'Offres de la Société Nationale des Hydrocarbures',
    jobsDesc: 'Cliquez sur une offre pour voir le détail. Assurez-vous que votre profil est complet avant de postuler.',
    jobsSearchPh: 'Rechercher un poste...', jobsAllTypes: 'Tous types de contrat',
    jobsEmpty: 'Aucune offre trouvée', jobsClosing: 'Clôture', jobsViewOffer: 'Voir l\'offre →',
    // Spontaneous
    spontSent: 'Candidature envoyée !',
    spontSentMsg: 'Votre candidature spontanée a été transmise aux services de la SNH. Vous serez contacté(e) prochainement.',
    spontBannerTitle: 'Candidature spontanée à la SNH',
    spontBannerDesc: 'Soumettez votre dossier directement même en l\'absence d\'une offre publiée. Précisez le type de candidature et le poste que vous visez.',
    spontTypeTitle: 'Type de candidature',
    spontTypeEmploi: 'Emploi', spontTypeEmploiSub: 'CDI ou CDD à la SNH',
    spontTypeAcad: 'Stage académique', spontTypeAcadSub: 'Fin d\'études / mémoire',
    spontTypePro: 'Stage professionnel', spontTypeProSub: 'Perfectionnement / insertion pro',
    spontDocsTitle: 'Documents complémentaires',
    spontDocsDesc: 'Vous pouvez soumettre votre candidature dès maintenant. Les pièces justificatives (diplômes, CNI, attestations, etc.) vous seront demandées aux étapes suivantes du processus de sélection.',
    spontPosteTitle: 'Poste visé', spontPosteLbl: 'Intitulé du poste / fonction *',
    spontPostePh: 'Ex: Ingénieur Réservoir, Comptable, Juriste...',
    spontStageTitle: 'Informations sur le stage',
    spontStageTopic: 'Thème / Sujet du stage',
    spontStageTopicPh: 'Ex: Optimisation de la récupération assistée du pétrole...',
    spontStageLevel: 'Niveau d\'études actuel', spontStageLevelPh: '— Sélectionner —',
    spontStageDuration: 'Durée souhaitée', spontStageStart: 'Date de début souhaitée',
    spontStageSupervisor: 'Encadreur académique (nom et contact)',
    spontStageSupervisorPh: 'Ex: Pr. Olivier Kamdem — 699 000 000',
    spontStageSchool: 'Institution actuelle',
    spontStageSchoolPh: 'ENSP, Université de Yaoundé I, IUT...',
    spontConditions: 'Conditions', spontAvail: 'Disponibilité',
    spontSalary: 'Prétention salariale (FCFA/mois, optionnel)', spontSalaryPh: 'Ex: 600000',
    spontCoverLetter: 'Lettre de motivation',
    spontSubmitBtn: 'Envoyer ma candidature à la SNH',
    spontAvailOptions: ['Immédiatement', 'Dans 1 mois', 'Dans 2 mois', 'Dans 3 mois'],
    spontDurationAcadOptions: ['1 mois', '2 mois'],
    spontDurationProOptions: ['1 mois', '2 mois', '3 mois', '4 mois', '6 mois', 'À définir avec la SNH'],
    // Applications
    appTitle: 'Mes candidatures SNH', appEmpty: 'Aucune candidature',
    appAllStatuses: 'Tous les statuts', appPublished: 'Offre publiée',
    appSpontaneous: 'Candidature spontanée',
    appConfirm: 'Confirmer ?', appYes: 'Oui', appNo: 'Non',
    appWithdraw: 'Dépostuler', appWithdrawError: 'Impossible de dépostuler : ',
    appDelete: 'Supprimer', appDeleteError: 'Impossible de supprimer : ',
    appReapply: 'Repostuler',
    appReapplyLimitTitle: 'Limite de candidatures atteinte',
    appReapplyLimitMsg: 'Vous avez déjà postulé 3 fois à cette offre (la limite autorisée). Il n\'est plus possible de repostuler à ce poste.',
    appReapplyLimitBtn: 'Compris',
    appGlobalLimitTitle: 'Limite globale atteinte',
    appGlobalLimitMsg: 'Vous avez atteint le maximum de 5 candidatures actives. Retirez une candidature existante avant d\'en soumettre une nouvelle.',
    statusNew: 'Soumis', statusTechnicalTests: 'Tests techniques', statusInterview: 'Entretien',
    statusPsychoTests: 'Tests psy.', statusMedicalVisit: 'Visite médicale', statusMoralityInquiry: 'Enquête moralité',
    statusDiplomaCheck: 'Auth. diplômes', statusTrial: 'En essai', statusAssignment: 'Affectation',
    statusIntegrated: 'Titularisé(e)', statusRejected: 'Refusé(e)', statusWithdrawn: 'Retiré(e)',
    // Notifications
    notifsNew: 'nouvelle', notifsNewPlural: 'nouvelles', notifsEmpty: 'Aucune notification',
    notifsNewBadge: 'Nouveau',
  },
  en: {
    // Auth / nav
    login: 'Log in', signup: 'Sign up', loginTitle: 'Log in to your account',
    registerTitle: 'Create your candidate account', snh: 'SNH Recruitment Portal',
    heroTitle: 'Join the SNH', heroSub: 'and contribute to Cameroon\'s energy future',
    heroDesc: 'Find jobs & internships opportunities and apply in a few easy steps.',
    searchPlaceholder: 'Job title, keywords, location', allContracts: 'All contracts',
    apply: 'Apply', seeDetails: 'View details', hideDetails: 'Hide',
    noJobs: "Don't see a matching position?", loadingJobs: 'Loading positions…',
    spontTitle: "Can't find a matching role?",
    spontDesc: 'Send a spontaneous application — we\'ll keep it in our talent pool.',
    spontBtn: 'Submit a spontaneous application',
    available: 'Job Openings / Vacancies', openUntil: 'Open until',
    firstName: 'First name', lastName: 'Last name', email: 'Email', password: 'Password',
    firstNamePh: 'Olivier', lastNamePh: 'Kamdem',
    alreadyAccount: 'Already have an account? Log in', noAccount: 'Don\'t have an account? Sign up',
    privacy: 'Your data is handled confidentially in accordance with SNH\'s recruitment policy.',
    dashboard: 'Dashboard', profile: 'My profile', documents: 'My documents',
    jobs: 'Job openings', spontaneous: 'Open application', applications: 'My applications',
    notifications: 'Notifications', logout: 'Log out', menu: 'Menu',
    home: 'Home', notifs: 'Notifs', more: 'More',
    // Public landing
    statsPublished: 'Open positions', statsContracts: 'Contract types',
    statsLocation: 'Location', statsCountry: 'Cameroon',
    alreadyCandidate: 'Already a candidate?', accessMySpace: 'Access my account',
    results: 'result', resultsPlural: 'results', allPositions: 'All Job Openings',
    reset: 'Reset', closing: 'Closing:', details: 'Details',
    jobDescription: 'Job description', profileSought: 'Required profile',
    experience: 'Experience', year: 'year', years: 'years', min: 'min.',
    formation: 'Education', reference: 'Reference', applyToOffer: 'Apply for this position',
    footer: 'National Hydrocarbons Corporation', rights: 'All rights reserved',
    // Auth modal
    connectBtn: 'Log in', createAccountBtn: 'Sign up',
    errorNameRequired: 'First and last name required',
    errorCredentials: 'Incorrect email or password',
    errorGeneric: 'An error occurred',
    // Portal general
    loadingSpace: 'Loading your space…', candidate: 'Candidate', profileLabel: 'Profile',
    mySpace: 'My account', snhRecruitment: 'SNH Recruitment Portal', account: 'Account',
    // Dashboard
    statApplications: 'Applications submitted', statJobs: 'Open positions',
    statInterviews: 'Interviews scheduled', statProfileComplete: 'Profile completed',
    completionTitle: 'Profile completion', completionBtn: 'Complete my profile',
    itemPersonalInfo: 'Personal information', itemEducation: 'Academic background',
    itemExperience: 'Work experience', itemSkills: 'Skills',
    itemDocuments: 'Supporting documents',
    activityTitle: 'Recent activity', activityEmpty: 'No recent activity',
    activitySubmitted: 'Application submitted', activityUpdate: 'Status update',
    matchesTitle: 'Recommended positions', applied: 'Applied',
    // Documents
    docsExpiredTitle: 'Expired documents',
    docsExpiredMsg: 'Please renew or update the documents',
    docsSoonTitle: 'Documents expiring soon (within 30 days)',
    docsSoonMsg: 'Remember to renew these documents.',
    docsInfoTitle: 'At this stage, only your CV is required',
    docsInfoMsg: 'Other documents (diplomas, ID, employment certificates, etc.) will be requested during later stages of the process.',
    docsUploadTitle: 'Upload your CV',
    docsType: 'Document type', docsExpiry: 'Expiry date (if applicable)',
    docsUploading: 'Uploading...', docsChooseFile: 'Choose and upload a file',
    docsFormats: 'PDF, Word, JPG, PNG — max 10 MB',
    docsMyDocs: 'My documents', docsEmpty: 'No documents uploaded',
    docsFileTooLarge: 'File too large (max 10 MB)',
    docsUploadError: 'Upload error: ', docsSaveError: 'Save error: ',
    docsExpiresOn: 'Expires on ', docsExpiredOn: '⚠ Expired on ', docsSoonOn: '⚠ Expires on ',
    docsCvLabel: 'CV / Curriculum Vitae',
    // Job detail modal
    jdContract: 'Contract type', jdLocation: 'Location', jdExperience: 'Min. experience',
    jdNotSpecified: 'Not specified', jdEducation: 'Education level',
    jdPublished: 'Published on', jdClosing: 'Closing on',
    jdDescription: 'Job description', jdProfile: 'Required profile',
    jdSkillsRequired: 'Required skills', jdSkillsNice: 'Nice-to-have skills',
    jdDocs: 'Supporting documents',
    jdDocsInfo: 'These documents will be required during subsequent selection stages.',
    jdClose: 'Close', jdApplyBtn: 'Apply for this position',
    jdApplyError: 'Unable to apply: ', jdRef: 'Ref.',
    // Jobs section
    jobsTitle: 'SNH Job Openings',
    jobsDesc: 'Click on a position to view details. Make sure your profile is complete before applying.',
    jobsSearchPh: 'Search job openings', jobsAllTypes: 'All contract types',
    jobsEmpty: 'No positions found', jobsClosing: 'Closing', jobsViewOffer: 'View Job Opening →',
    // Spontaneous
    spontSent: 'Application Submitted Successfully!',
    spontSentMsg: 'Your spontaneous application has been forwarded to SNH. You will be contacted shortly.',
    spontBannerTitle: 'Spontaneous application to SNH',
    spontBannerDesc: 'Submit your application directly even without a published offer. Specify the type of application and the position you are targeting.',
    spontTypeTitle: 'Application type',
    spontTypeEmploi: 'Employment', spontTypeEmploiSub: 'Permanent or fixed-term contract at SNH',
    spontTypeAcad: 'Academic internship', spontTypeAcadSub: 'Graduation Project / Thesis Internship',
    spontTypePro: 'Professional internship', spontTypeProSub: 'Professional Insertion / Skills Development',
    spontDocsTitle: 'Supporting documents',
    spontDocsDesc: 'You can submit your application right now. Supporting documents (diplomas, ID, certificates, etc.) will be requested at subsequent stages of the selection process.',
    spontPosteTitle: 'Target position', spontPosteLbl: 'Position title / role *',
    spontPostePh: 'E.g., Reservoir Engineer, Accountant, Lawyer...',
    spontStageTitle: 'Internship details',
    spontStageTopic: 'Topic / Subject',
    spontStageTopicPh: 'E.g., Enhanced oil recovery optimization...',
    spontStageLevel: 'Current level of study', spontStageLevelPh: '— Select —',
    spontStageDuration: 'Desired duration', spontStageStart: 'Desired start date',
    spontStageSupervisor: 'Academic supervisor (name and contact)',
    spontStageSupervisorPh: 'E.g., Prof. Olivier Kamdem — 699 000 000',
    spontStageSchool: 'Current institution',
    spontStageSchoolPh: 'ENSP, University of Yaoundé I, IUT...',
    spontConditions: 'Conditions', spontAvail: 'Availability',
    spontSalary: 'Salary expectation (FCFA/month, optional)', spontSalaryPh: 'E.g., 600000',
    spontCoverLetter: 'Cover letter',
    spontSubmitBtn: 'Submit my application to SNH',
    spontAvailOptions: ['Immediately', 'Within 1 month', 'Within 2 months', 'Within 3 months'],
    spontDurationAcadOptions: ['1 month', '2 months'],
    spontDurationProOptions: ['1 month', '2 months', '3 months', '4 months', '6 months', 'To be agreed with SNH'],
    // Applications
    appTitle: 'My SNH applications', appEmpty: 'No applications',
    appAllStatuses: 'All statuses', appPublished: 'Published position',
    appSpontaneous: 'Spontaneous application',
    appConfirm: 'Confirm?', appYes: 'Yes', appNo: 'No',
    appWithdraw: 'Withdraw', appWithdrawError: 'Unable to withdraw: ',
    appDelete: 'Delete', appDeleteError: 'Unable to delete: ',
    appReapply: 'Re-apply',
    appReapplyLimitTitle: 'Application limit reached',
    appReapplyLimitMsg: 'You have already applied 3 times to this position (the maximum allowed). Further applications for this role are not possible.',
    appReapplyLimitBtn: 'Understood',
    appGlobalLimitTitle: 'Global limit reached',
    appGlobalLimitMsg: 'You have reached the maximum of 5 active applications. Withdraw an existing application before submitting a new one.',
    statusNew: 'Submitted', statusTechnicalTests: 'Technical tests', statusInterview: 'Interview',
    statusPsychoTests: 'Psycho tests', statusMedicalVisit: 'Medical check', statusMoralityInquiry: 'Background check',
    statusDiplomaCheck: 'Diploma auth.', statusTrial: 'Trial period', statusAssignment: 'Assignment',
    statusIntegrated: 'Permanent staff', statusRejected: 'Rejected', statusWithdrawn: 'Withdrawn',
    // Notifications
    notifsNew: 'New', notifsNewPlural: 'New', notifsEmpty: 'No notifications',
    notifsNewBadge: 'New',
  },
} as const;

// ── Main component ─────────────────────────────────────────────────────────────
export default function CandidatePortal() {
  const [view, setView] = useState<'public' | 'auth' | 'portal'>('public');
  const [lang, setLang] = useState<Lang>('fr');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [section, setSection] = useState<Section>('dashboard');
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openJobs, setOpenJobs] = useState<JobOpening[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<CandidateDoc[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [masterSkills, setMasterSkills] = useState<MasterSkill[]>([]);
  // job to apply to after auth
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  useEffect(() => {
    // Load public jobs and master skills list immediately — no auth required
    supabase.from('job_openings').select('*').eq('status', 'open').or('closing_date.is.null,closing_date.gte.' + new Date().toISOString().split('T')[0]).order('publication_date', { ascending: false })
      .then(({ data }) => { setOpenJobs((data || []) as JobOpening[]); setLoadingJobs(false); });
    supabase.from('skills').select('id, name, category, description').order('category').order('name')
      .then(({ data }) => { if (data) setMasterSkills(data as MasterSkill[]); });
    // Check session silently — if logged in, transition to portal view without spinner
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadPortal(session.user.id, false);
    });
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const dest = (e as CustomEvent<string>).detail as Section;
      if (dest) setSection(dest);
    };
    document.addEventListener('portal-nav', handler);
    return () => document.removeEventListener('portal-nav', handler);
  }, []);

  // Realtime subscription: receive new notifications when HR changes application status
  useEffect(() => {
    if (!candidateId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const channel = supabase
        .channel(`candidate-notifs-${session.user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          const n = payload.new as any;
          const notif: Notification = {
            id: n.id, title: n.title, body: n.message, read: false, created_at: n.created_at,
          };
          setNotifications(prev => [notif, ...prev]);
          setUnreadNotifs(prev => prev + 1);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    });
  }, [candidateId]);

  const loadPortal = async (userId: string, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { data: cand } = await supabase.from('candidates').select('*').eq('user_id', userId).maybeSingle();
      if (!cand) { setView('public'); return; }
      setCandidateId(cand.id);
      setProfile(cand as CandidateProfile);

      const [expRes, eduRes, skRes, langRes, docRes, appRes, matchRes, jobRes, notifRes] = await Promise.all([
        supabase.from('candidate_experiences').select('*').eq('candidate_id', cand.id).order('start_date', { ascending: false }),
        supabase.from('candidate_educations').select('*').eq('candidate_id', cand.id).order('end_date', { ascending: false }),
        supabase.from('candidate_candidate_skills').select('*').eq('candidate_id', cand.id),
        supabase.from('candidate_languages').select('*').eq('candidate_id', cand.id),
        supabase.from('candidate_documents').select('*').eq('candidate_id', cand.id).order('uploaded_at', { ascending: false }),
        supabase.from('candidate_applications').select('*,job_opening:job_openings(id,title)').eq('candidate_id', cand.id).order('created_at', { ascending: false }),
        supabase.from('candidate_job_matches').select('*, job_opening:job_openings(*)').eq('candidate_id', cand.id).order('match_score', { ascending: false }),
        supabase.from('job_openings').select('*').eq('status', 'open').or('closing_date.is.null,closing_date.gte.' + new Date().toISOString().split('T')[0]).order('publication_date', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', userId).eq('category', 'recruitment').order('created_at', { ascending: false }).limit(30),
      ]);
      setExperiences((expRes.data || []) as Experience[]);
      setEducations((eduRes.data || []) as Education[]);
      setSkills((skRes.data || []) as Skill[]);
      setLanguages((langRes.data || []) as Language[]);
      setDocuments((docRes.data || []) as CandidateDoc[]);
      setApplications((appRes.data || []) as Application[]);
      setMatches((matchRes.data || []) as unknown as JobMatch[]);
      setOpenJobs((jobRes.data || []) as JobOpening[]);

      const notifs: Notification[] = (notifRes.data || []).map((n: any) => ({
        id: n.id, title: n.title, body: n.message, read: n.is_read, created_at: n.created_at,
      }));
      setNotifications(notifs);
      setUnreadNotifs(notifs.filter(n => !n.read).length);

      setView('portal');
    } catch {
      // On error (network timeout, etc.) fall back to public view so the user isn't stuck
      setView('public');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifs(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('public');
    setCandidateId(null); setProfile(null);
    setApplications([]); setExperiences([]); setEducations([]);
    setSkills([]); setDocuments([]); setMatches([]); setNotifications([]);
  };

  const openAuth = (mode: 'login' | 'register' = 'login', jobId?: string) => {
    setAuthMode(mode);
    if (jobId) setPendingJobId(jobId);
    setView('auth');
  };

  const profilePct = () => {
    if (!profile) return 0;
    // 5 sections, each worth 20 points — mirrors the dashboard completionItems
    let score = 0;
    // Personal info (phone + location + birth_date + gender)
    const personalFields = [profile.phone, profile.location, profile.birth_date, profile.gender];
    score += Math.round((personalFields.filter(Boolean).length / personalFields.length) * 20);
    // Education (at least one with degree + institution + field + start_date)
    const validEdu = educations.filter(e => e.degree && e.institution && e.field_of_study && e.start_date);
    score += validEdu.length > 0 ? 20 : 0;
    // Experience
    score += experiences.length > 0 ? 20 : 0;
    // Skills (at least 3)
    score += skills.length >= 3 ? 20 : Math.round((skills.length / 3) * 20);
    // Documents
    score += documents.length > 0 ? 20 : 0;
    return score;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden px-3 py-2">
        <img src="/logoSNHFINAL.png" alt="SNH" className="h-12 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).src='/logoSNH.png'; }} />
      </div>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: SNH_GREEN }} />
      <p className="text-sm text-gray-500">{TR[lang].loadingSpace}</p>
    </div>
  );

  // ── Public landing ──
  if (view === 'public' || view === 'auth') return (
    <>
      <PublicLanding
        openJobs={openJobs}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
        onApply={(jobId) => openAuth('login', jobId)}
        loadingJobs={loadingJobs}
        lang={lang} setLang={setLang}
      />
      {view === 'auth' && (
        <AuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          onClose={() => setView('public')}
          lang={lang}
          onAuth={async (uid) => {
            setPendingJobId(null);
            await loadPortal(uid);
          }}
        />
      )}
    </>
  );

  const navTo = (s: Section) => { setSection(s); setMobileMenuOpen(false); };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* ── Mobile menu overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* ── Sidebar (desktop) + Mobile drawer ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-56 md:flex md:flex-shrink-0 md:sticky md:top-0 md:h-screen
      `}>
        {/* Tricolor top accent */}
        <div className="h-0.5 flex-shrink-0" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_RED} 50%, ${SNH_GOLD} 67%)` }} />
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-1">
              <img src="/logoSNHFINAL.png" alt="SNH" className="h-10 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).src='/logoSNH.png'; }} />
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">{TR[lang].mySpace}</p>
          <NavItem icon={LayoutDashboard} label={TR[lang].dashboard} active={section==='dashboard'} onClick={() => navTo('dashboard')} />
          <NavItem icon={User} label={TR[lang].profile} active={section==='profile'} onClick={() => navTo('profile')} />
          <NavItem icon={Folder} label={TR[lang].documents} active={section==='documents'} onClick={() => navTo('documents')} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 mt-2">{TR[lang].snhRecruitment}</p>
          <NavItem icon={Briefcase} label={TR[lang].jobs} active={section==='jobs'} onClick={() => navTo('jobs')} />
          <NavItem icon={Send} label={TR[lang].spontaneous} active={section==='spontaneous'} onClick={() => navTo('spontaneous')} />
          <NavItem icon={FileText} label={TR[lang].applications} active={section==='applications'} badge={applications.filter(a => a.status !== 'withdrawn').length} onClick={() => navTo('applications')} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 mt-2">{TR[lang].account}</p>
          <NavItem icon={Bell} label={TR[lang].notifications} active={section==='notifications'} badge={unreadNotifs || undefined} onClick={() => { navTo('notifications'); setUnreadNotifs(0); }} />
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all mt-0.5">
            <LogOut size={16} /> {TR[lang].logout}
          </button>
        </nav>

        {/* Footer user */}
        {profile && (
          <div className="p-3 border-t border-gray-100 flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
              {initials(profile.first_name, profile.last_name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{profile.first_name} {profile.last_name}</p>
              <p className="text-xs text-gray-400">{TR[lang].candidate}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile only) */}
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
            <p className="text-base font-semibold text-gray-900">{SECTION_TITLES(lang)[section]}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Language toggle */}
            <button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition flex-shrink-0">
              <Globe size={12} />
              <span>{lang === 'fr' ? 'EN' : 'FR'}</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
              <BarChart3 size={13} className="text-green-700" />
              <span className="text-xs font-semibold text-green-800">{TR[lang].profileLabel} : {profilePct()}%</span>
            </div>
            {/* Profile % compact on xs */}
            <div className="sm:hidden flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <BarChart3 size={12} className="text-green-700" />
              <span className="text-xs font-semibold text-green-800">{profilePct()}%</span>
            </div>
            {profile && (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
                {initials(profile.first_name, profile.last_name)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
          {section === 'dashboard' && profile && (
            <DashboardSection
              profile={profile} experiences={experiences} educations={educations}
              skills={skills} documents={documents} applications={applications}
              openJobs={openJobs} matches={matches} pct={profilePct()}
              onNav={setSection} candidateId={candidateId!}
              onApplied={(app) => setApplications(prev => [app, ...prev])}
              lang={lang}
            />
          )}
          {section === 'profile' && profile && (
            <ProfileSection
              profile={profile} setProfile={setProfile}
              experiences={experiences} setExperiences={setExperiences}
              educations={educations} setEducations={setEducations}
              skills={skills} setSkills={setSkills}
              languages={languages} setLanguages={setLanguages}
              masterSkills={masterSkills}
              candidateId={candidateId!}
              lang={lang}
            />
          )}
          {section === 'documents' && candidateId && (
            <DocumentsSection candidateId={candidateId} documents={documents} setDocuments={setDocuments} lang={lang} />
          )}
          {section === 'jobs' && (
            <JobsSection openJobs={openJobs} matches={matches} candidateId={candidateId!}
              onApplied={(app) => setApplications(prev => [app, ...prev])} applications={applications}
              documents={documents} educations={educations} lang={lang} />
          )}
          {section === 'spontaneous' && profile && candidateId && (
            <SpontaneousSection candidateId={candidateId} profile={profile} documents={documents}
              onApplied={(app) => { setApplications(prev => [app, ...prev]); setSection('applications'); }} lang={lang} />
          )}
          {section === 'applications' && (
            <ApplicationsSection applications={applications} openJobs={openJobs}
              documents={documents} candidateId={candidateId!}
              candidateName={profile ? `${profile.first_name} ${profile.last_name}` : ''}
              onApplied={(app) => setApplications(prev => [app, ...prev])}
              onWithdrawn={(appId) => setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'withdrawn' } : a))}
              onDeleted={(appId) => setApplications(prev => prev.filter(a => a.id !== appId))}
              lang={lang} />
          )}
          {section === 'notifications' && (
            <NotificationsSection notifications={notifications} onView={markNotificationsAsRead} lang={lang} />
          )}
        </div>

        {/* ── Mobile bottom navigation bar ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-stretch">
          {([
            { s: 'dashboard' as Section, icon: LayoutDashboard, label: TR[lang].home },
            { s: 'profile'   as Section, icon: User,            label: TR[lang].profile },
            { s: 'jobs'      as Section, icon: Briefcase,        label: TR[lang].jobs },
            { s: 'applications' as Section, icon: FileText,      label: TR[lang].applications, badge: applications.filter(a => a.status !== 'withdrawn').length },
            { s: 'notifications' as Section, icon: Bell,         label: TR[lang].notifs, badge: unreadNotifs },
          ] as { s: Section; icon: React.FC<any>; label: string; badge?: number }[]).map(({ s, icon: Icon, label, badge }) => (
            <button key={s} onClick={() => { navTo(s); if (s === 'notifications') setUnreadNotifs(0); }}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors relative
                ${section === s ? 'text-green-700' : 'text-gray-500'}`}>
              <div className="relative">
                <Icon size={20} />
                {badge ? (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </div>
              <span className="leading-tight">{label}</span>
              {section === s && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ backgroundColor: SNH_GREEN }} />}
            </button>
          ))}
          {/* More button */}
          <button onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium text-gray-500 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <span className="leading-tight">{TR[lang].menu}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

const SECTION_TITLES = (l: Lang): Record<Section, string> => ({
  dashboard: TR[l].dashboard,
  profile: TR[l].profile,
  documents: TR[l].documents,
  jobs: TR[l].jobs,
  spontaneous: TR[l].spontaneous,
  applications: TR[l].applications,
  notifications: TR[l].notifications,
});

// ── Public Landing ─────────────────────────────────────────────────────────────
function PublicLanding({ openJobs, onLogin, onRegister, onApply, loadingJobs, lang, setLang }: {
  openJobs: JobOpening[];
  onLogin: () => void;
  onRegister: () => void;
  onApply: (jobId: string) => void;
  loadingJobs: boolean;
  lang: Lang; setLang: (l: Lang) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const filtered = openJobs.filter(j => {
    const txt = `${j.title} ${j.location} ${j.contract_type} ${j.description ?? ''}`.toLowerCase();
    return (!search || txt.includes(search.toLowerCase())) &&
           (!filterContract || j.contract_type === filterContract);
  });

  const contracts = [...new Set(openJobs.map(j => j.contract_type).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Header / Hero ── */}
      <header className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/2226776/pexels-photo-2226776.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}>
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(0,30,15,0.92) 0%, rgba(0,60,30,0.82) 45%, rgba(0,20,10,0.90) 100%)' }} />
        {/* Tricolor accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_RED} 50%, ${SNH_GOLD} 67%)` }} />

        {/* Navbar */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center">
            <img src="/logoSNHFINAL.png" alt="SNH" className="h-14 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).src='/logoSNH.png'; }} />
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1.5 px-3 py-2 border border-white/30 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition">
              <Globe size={14} /> {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            <button onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 border border-white/40 rounded-lg text-sm font-medium text-white transition hover:bg-white/10">
              <LogIn size={15} /> {TR[lang].login}
            </button>
            <button onClick={onRegister}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition hover:opacity-90"
              style={{ background: SNH_GOLD, color: '#1a1a1a' }}>
              <UserPlus size={15} /> {TR[lang].signup}
            </button>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border"
            style={{ background: 'rgba(252,209,22,0.15)', borderColor: 'rgba(252,209,22,0.4)', color: SNH_GOLD }}>
            <Sparkles size={12} /> {openJobs.length} {TR[lang].available}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4 tracking-tight text-white">
            {TR[lang].heroTitle}<br />
            <span className="font-light text-2xl" style={{ color: SNH_GOLD }}>{TR[lang].heroSub}</span>
          </h1>
          <p className="text-white/70 text-base max-w-2xl mx-auto mb-8">
            {lang === 'fr'
              ? <>Découvrez nos <span style={{ color: SNH_GOLD }} className="font-semibold">opportunités d'emploi</span>, de stage et déposez votre <span style={{ color: SNH_GOLD }} className="font-semibold">candidature</span> en quelques étapes.</>
              : <>Discover our <span style={{ color: SNH_GOLD }} className="font-semibold">employment opportunities</span>, internships and submit your <span style={{ color: SNH_GOLD }} className="font-semibold">application</span> in a few steps.</>
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={TR[lang].searchPlaceholder}
                className="w-full pl-9 pr-4 py-3 rounded-xl text-gray-900 text-sm outline-none border-0 focus:ring-2 shadow-md"
                style={{ '--tw-ring-color': SNH_GOLD } as any}
              />
            </div>
            <select value={filterContract} onChange={e => setFilterContract(e.target.value)}
              className="px-4 py-3 rounded-xl text-gray-700 text-sm outline-none bg-white border-0 shadow-md min-w-[160px]">
              <option value="">{TR[lang].allContracts}</option>
              {contracts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-8 flex-wrap">
          {[
            { label: lang === 'fr' ? TR.fr.statsPublished : TR.en.statsPublished, value: openJobs.length },
            { label: lang === 'fr' ? TR.fr.statsContracts : TR.en.statsContracts, value: contracts.length },
            { label: lang === 'fr' ? TR.fr.statsLocation : TR.en.statsLocation, value: TR[lang].statsCountry },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={14} style={{ color: SNH_GREEN }} />
              <span><strong style={{ color: SNH_GREEN }}>{s.value}</strong> <span style={{ color: SNH_GREEN }}>{s.label}</span></span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <span>{TR[lang].alreadyCandidate}</span>
            <button onClick={onLogin} className="font-bold hover:underline" style={{ color: SNH_GREEN }}>
              {TR[lang].accessMySpace}
            </button>
          </div>
        </div>
      </div>

      {/* ── Job list ── */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {search || filterContract ? `${filtered.length} ${filtered.length !== 1 ? TR[lang].resultsPlural : TR[lang].results}` : TR[lang].allPositions}
          </h2>
        </div>

        {loadingJobs ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: SNH_GREEN }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{TR[lang].noJobs}</p>
            <button onClick={() => { setSearch(''); setFilterContract(''); }} className="mt-3 text-sm font-semibold hover:underline" style={{ color: SNH_GREEN }}>
              {TR[lang].reset}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${SNH_GREEN}18` }}>
                      <Briefcase size={18} style={{ color: SNH_GREEN }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight">{(lang === 'en' && job.title_en) ? job.title_en : job.title}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />{TR[lang].closing} {fmtDate(job.closing_date)}</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: `${SNH_RED}12`, color: SNH_RED }}>{job.contract_type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                            {expandedJob === job.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {TR[lang].details}
                          </button>
                          <button onClick={() => onApply(job.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-white rounded-lg text-xs font-bold transition hover:opacity-90"
                            style={{ background: SNH_GREEN }}>
                            <Send size={13} /> {TR[lang].apply}
                          </button>
                        </div>
                      </div>

                      {/* Skills preview */}
                      {job.required_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.required_skills.slice(0, 5).map(s => (
                            <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{s}</span>
                          ))}
                          {job.required_skills.length > 5 && (
                            <span className="text-xs text-gray-400">+{job.required_skills.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedJob === job.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                    {job.description && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase mb-1.5">{TR[lang].jobDescription}</p>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{(lang === 'en' && job.description_en) ? job.description_en : job.description}</p>
                      </div>
                    )}
                    {job.requirements && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase mb-1.5">{TR[lang].profileSought}</p>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{(lang === 'en' && job.requirements_en) ? job.requirements_en : job.requirements}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {job.min_experience_years > 0 && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <p className="text-gray-500 mb-0.5">{TR[lang].experience}</p>
                          <p className="font-semibold text-gray-900">{job.min_experience_years} {job.min_experience_years > 1 ? TR[lang].years : TR[lang].year} {TR[lang].min}</p>
                        </div>
                      )}
                      {job.education_level && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <p className="text-gray-500 mb-0.5">{TR[lang].formation}</p>
                          <p className="font-semibold text-gray-900">{job.education_level}</p>
                        </div>
                      )}
                      <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                        <p className="text-gray-500 mb-0.5">{TR[lang].reference}</p>
                        <p className="font-semibold text-gray-900">{job.reference}</p>
                      </div>
                    </div>
                    <button onClick={() => onApply(job.id)}
                      className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold transition hover:opacity-90"
                      style={{ background: SNH_GREEN }}>
                      <Send size={15} /> {TR[lang].applyToOffer}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Spontaneous CTA */}
        <div className="mt-8 rounded-2xl overflow-hidden border border-green-200 bg-white">
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_RED} 50%, ${SNH_GOLD} 67%)` }} />
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${SNH_GREEN}18` }}>
              <Send size={22} style={{ color: SNH_GREEN }} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{TR[lang].spontTitle}</h3>
            <p className="text-gray-500 text-sm mb-5">{TR[lang].spontDesc}</p>
            <button onClick={onRegister}
              className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold text-sm transition hover:opacity-90"
              style={{ background: SNH_GREEN }}>
              <UserPlus size={16} /> {TR[lang].spontBtn}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/2226776/pexels-photo-2226776.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
        }}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,25,12,0.92)' }} />
        <div className="relative z-10 h-0.5" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_RED} 50%, ${SNH_GOLD} 67%)` }} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <img src="/logoSNHFINAL.png" alt="SNH" className="h-10 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).src='/logoSNH.png'; }} />
            <div>
              <p className="text-white/90 text-xs font-semibold">{TR[lang].footer}</p>
              <p className="text-white/50 text-xs">© {new Date().getFullYear()} — {TR[lang].rights}</p>
            </div>
          </div>
          <p className="text-xs font-medium" style={{ color: SNH_GOLD }}>{lang === 'fr' ? 'Portail de recrutement officiel' : 'Official recruitment portal'}</p>
        </div>
      </footer>
    </div>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────────────────
function AuthModal({ onAuth, authMode, setAuthMode, onClose, lang = 'fr' }: {
  onAuth: (uid: string) => void;
  authMode: 'login' | 'register';
  setAuthMode: (m: 'login' | 'register') => void;
  onClose: () => void;
  lang?: Lang;
}) {
  const tAuth = TR[lang ?? 'fr'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (authMode === 'register') {
        if (!firstName.trim() || !lastName.trim()) { setError(tAuth.errorNameRequired); setLoading(false); return; }
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        if (data.user) {
          const { error: candErr } = await supabase.from('candidates').insert({
            user_id: data.user.id, first_name: firstName, last_name: lastName,
            email, profile_completed: false, status: 'active', source: 'direct',
          });
          if (candErr) throw candErr;
          onAuth(data.user.id);
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        if (data.user) onAuth(data.user.id);
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? tAuth.errorCredentials : err.message || tAuth.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        {/* Tricolor top bar */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${SNH_GREEN} 33%, ${SNH_RED} 50%, ${SNH_GOLD} 67%)` }} />
        {/* Header */}
        <div className="px-6 pt-6 pb-5 text-center relative" style={{ background: `linear-gradient(135deg, ${SNH_GREEN} 0%, #004d2b 100%)` }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
            <X size={14} className="text-white" />
          </button>
          <div className="flex items-center justify-center mx-auto mb-3">
            <img src="/logoSNHFINAL.png" alt="SNH" className="h-14 w-auto object-contain drop-shadow-md" onError={e => {
              const el = e.target as HTMLImageElement;
              el.src='/logoSNH.png';
              el.parentElement!.innerHTML = authMode === 'login'
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006B3C" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006B3C" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>';
            }} />
          </div>
          <h2 className="text-white text-base font-bold">{authMode === 'login' ? TR[lang].loginTitle : TR[lang].registerTitle}</h2>
          <p className="text-white/60 text-xs mt-0.5">{TR[lang].snh}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {authMode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl>{TR[lang].firstName} *</Lbl><input value={firstName} onChange={e => setFirstName(e.target.value)} className={inp()} placeholder={TR[lang].firstNamePh} required /></div>
              <div><Lbl>{TR[lang].lastName} *</Lbl><input value={lastName} onChange={e => setLastName(e.target.value)} className={inp()} placeholder={TR[lang].lastNamePh} required /></div>
            </div>
          )}
          <div><Lbl>{TR[lang].email}</Lbl><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp()} placeholder="votre@email.cm" required /></div>
          <div>
            <Lbl>{TR[lang].password}</Lbl>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={inp() + ' pr-10'} placeholder="••••••••" required minLength={6} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {authMode === 'register' && (
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Lock size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
              {TR[lang].privacy}
            </p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition text-sm"
            style={{ background: SNH_GREEN }}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
              authMode === 'login' ? <><LogIn size={15} /> {TR[lang].connectBtn}</> : <><UserPlus size={15} /> {TR[lang].createAccountBtn}</>}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm font-semibold transition hover:underline" style={{ color: SNH_GREEN }}>
              {authMode === 'login' ? TR[lang].noAccount : TR[lang].alreadyAccount}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardSection({ profile, experiences, educations, skills, documents, applications, openJobs, matches, pct, onNav, candidateId, onApplied, lang }: {
  profile: CandidateProfile; experiences: Experience[]; educations: Education[];
  skills: Skill[]; documents: CandidateDoc[]; applications: Application[];
  openJobs: JobOpening[]; matches: JobMatch[]; pct: number; onNav: (s: Section) => void;
  candidateId: string; onApplied: (app: Application) => void; lang: Lang;
}) {
  const t = TR[lang];
  const completionItems = (() => {
    const personalFields = [profile.phone, profile.location, profile.birth_date, profile.gender];
    const personalDone = personalFields.filter(Boolean).length;
    const personalPct = Math.round((personalDone / personalFields.length) * 100);
    const validEdu = educations.filter(e => e.degree && e.institution && e.field_of_study && e.start_date);
    const skillPct = Math.min(100, Math.round((skills.length / 3) * 100));
    return [
      { label: t.itemPersonalInfo, done: personalPct === 100, pct: personalPct },
      { label: t.itemEducation, done: validEdu.length > 0, pct: validEdu.length > 0 ? 100 : 0 },
      { label: t.itemExperience, done: experiences.length > 0, pct: experiences.length > 0 ? 100 : 0 },
      { label: t.itemSkills, done: skills.length >= 3, pct: skillPct },
      { label: t.itemDocuments, done: documents.length > 0, pct: documents.length > 0 ? 100 : 0 },
    ];
  })();

  const [applying, setApplying] = useState<string | null>(null);
  // Exclude withdrawn so "Apply" button can reappear after withdrawal
  const [applied, setApplied] = useState<Set<string>>(new Set(applications.filter(a => a.status !== 'withdrawn').map(a => a.job_opening_id || '').filter(Boolean)));
  const [limitJobId, setLimitJobId] = useState<string | null>(null);

  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplying(jobId);
    // Check global application limit (max 5 active applications across all jobs)
    const { count: globalCount } = await supabase
      .from('candidate_applications')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .neq('status', 'withdrawn')
      .neq('status', 'rejected');
    if ((globalCount ?? 0) >= 5) {
      setApplying(null);
      setLimitJobId('global');
      return;
    }
    // Check per-job attempt count (max 3 attempts on same job including withdrawn)
    const { count } = await supabase
      .from('candidate_applications')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .eq('job_opening_id', jobId);
    if ((count ?? 0) >= 3) {
      setApplying(null);
      setLimitJobId(jobId);
      return;
    }
    const { data } = await supabase.from('candidate_applications').insert({
      candidate_id: candidateId, job_opening_id: jobId,
      desired_position: jobTitle, status: 'new',
    }).select().maybeSingle();
    if (data) { onApplied(data as Application); setApplied(prev => new Set([...prev, jobId])); }
    setApplying(null);
  };

  const recentActivities = applications.slice(0, 4).map(a => ({
    title: a.status === 'new' ? t.activitySubmitted : t.activityUpdate,
    sub: a.desired_position || a.job_opening?.title || '—',
    date: fmtDate(a.created_at),
  }));

  return (
    <>
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📋', value: applications.length, label: t.statApplications },
          { icon: '💼', value: openJobs.length, label: t.statJobs },
          { icon: '📅', value: applications.filter(a => a.status === 'interview').length, label: t.statInterviews },
          { icon: '⭐', value: `${pct}%`, label: t.statProfileComplete },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile completion */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.completionTitle}</h3>
          <div className="space-y-3">
            {completionItems.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`flex items-center gap-1.5 ${item.done ? 'text-green-700' : 'text-gray-600'}`}>
                    {item.done ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-amber-500" />}
                    {item.label}
                  </span>
                  <span className={`font-semibold ${item.done ? 'text-green-700' : item.pct > 0 ? 'text-amber-600' : 'text-red-500'}`}>{item.pct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={item.pct} color={item.pct === 100 ? 'bg-green-500' : item.pct > 0 ? 'bg-amber-400' : 'bg-red-400'} />
              </div>
            ))}
          </div>
          <button onClick={() => onNav('profile')} className="mt-4 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg text-white transition" style={{ background: SNH_GREEN }}>
            {t.completionBtn} <ChevronRight size={14} />
          </button>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.activityTitle}</h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t.activityEmpty}</p>
          ) : (
            <div className="relative border-l-2 border-gray-200 pl-4 ml-2 space-y-4">
              {recentActivities.map((a, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: SNH_GREEN }} />
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.sub}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} />{a.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top matching offers */}
      {matches.filter(m => m.match_score >= 60).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: SNH_GOLD }} />
            <h3 className="text-sm font-semibold text-gray-900">{t.matchesTitle}</h3>
          </div>
          <div className="space-y-3">
            {matches.filter(m => m.match_score >= 60).slice(0, 3).map(m => {
              const { Icon: JobIcon, color: iconColor, bg: iconBg } = getJobIcon(m.job_opening.title, m.job_opening.contract_type);
              return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: iconBg }}>
                  <JobIcon size={15} style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{m.job_opening.title}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <Tag variant="gray">{m.job_opening.contract_type}</Tag>
                    <Tag variant="gray">{m.job_opening.location}</Tag>
                  </div>
                </div>
                {applied.has(m.job_opening_id) ? (
                  <span className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle size={12} />{t.applied}</span>
                ) : (
                  <button onClick={() => handleApply(m.job_opening.id, m.job_opening.title)} disabled={applying === m.job_opening.id}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1 disabled:opacity-60"
                    style={{ background: SNH_BLUE }}>
                    {applying === m.job_opening.id ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={11} />}
                    {t.apply}
                  </button>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* Limit modal */}
    {limitJobId && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle size={22} className="text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-900">
              {limitJobId === 'global' ? t.appGlobalLimitTitle : t.appReapplyLimitTitle}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {limitJobId === 'global' ? t.appGlobalLimitMsg : t.appReapplyLimitMsg}
            </p>
          </div>
          <button onClick={() => setLimitJobId(null)}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: SNH_GREEN }}>
            {t.appReapplyLimitBtn}
          </button>
        </div>
      </div>
    )}
    </>
  );
}

// Convert a 4-digit year string ("2018") to ISO date ("2018-01-01") for DATE columns
function yearToDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return s || null;
}
// Extract 4-digit year from "2018-01-01" or "2018" for display in number inputs
function dateToYear(v: string | null | undefined): string {
  if (!v) return '';
  const s = String(v).trim();
  return s.length >= 4 ? s.slice(0, 4) : s;
}

// ── Profile Section ───────────────────────────────────────────────────────────
type ProfileTab = 'infos' | 'formations' | 'experiences' | 'competences' | 'langues' | 'cv';

function ProfileSection({ profile, setProfile, experiences, setExperiences, educations, setEducations, skills, setSkills, languages, setLanguages, masterSkills, candidateId, lang }: {
  profile: CandidateProfile; setProfile: (p: CandidateProfile) => void;
  experiences: Experience[]; setExperiences: (v: Experience[]) => void;
  educations: Education[]; setEducations: (v: Education[]) => void;
  skills: Skill[]; setSkills: (v: Skill[]) => void;
  languages: Language[]; setLanguages: (v: Language[]) => void;
  masterSkills: MasterSkill[];
  candidateId: string;
  lang: 'fr' | 'en';
}) {
  const [tab, setTab] = useState<ProfileTab>('infos');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const t = PROFILE_TR[lang];
  const TABS: { value: ProfileTab; label: string; icon: React.FC<any> }[] = [
    { value: 'infos', label: t.tabInfos, icon: User },
    { value: 'formations', label: t.tabFormations, icon: GraduationCap },
    { value: 'experiences', label: t.tabExperiences, icon: Briefcase },
    { value: 'competences', label: t.tabCompetences, icon: Star },
    { value: 'langues', label: t.tabLangues, icon: Globe },
    { value: 'cv', label: t.tabCV, icon: Download },
  ];

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Always persist all sections — not just the active tab
    await Promise.all([
      // 1. Candidate profile info
      supabase.from('candidates').update({
        first_name: profile.first_name, last_name: profile.last_name,
        professional_title: profile.professional_title || null,
        birth_date: profile.birth_date || null,
        phone: profile.phone || null, phone2: profile.phone2 || null,
        location: profile.location || null, region: profile.region || null,
        nationality: profile.nationality || null, national_id: profile.national_id || null,
        linkedin_url: profile.linkedin_url || null, portfolio_url: profile.portfolio_url || null,
        facebook_url: profile.facebook_url || null, twitter_url: profile.twitter_url || null,
        instagram_url: profile.instagram_url || null,
        summary: profile.summary || null, desired_position: profile.desired_position || null,
        desired_salary_min: profile.desired_salary_min || null,
        desired_salary_max: profile.desired_salary_max || null,
        availability_date: profile.availability_date || null,
        mobility: profile.mobility || null, profile_completed: true,
      }).eq('user_id', user.id),

      // 2. Experiences — delete + reinsert
      supabase.from('candidate_experiences').delete().eq('candidate_id', candidateId).then(async () => {
        const valid = experiences.filter(e => e.job_title && e.company && e.start_date);
        if (valid.length) await supabase.from('candidate_experiences').insert(
          valid.map(({ id: _id, ...e }) => ({ ...e, candidate_id: candidateId, end_date: e.is_current ? null : (e.end_date || null) }))
        );
      }),

      // 3. Educations — delete + reinsert
      supabase.from('candidate_educations').delete().eq('candidate_id', candidateId).then(async () => {
        const valid = educations.filter(e => e.degree && e.institution && e.field_of_study && e.start_date);
        if (valid.length) {
          const { error: eduErr } = await supabase.from('candidate_educations').insert(
            valid.map(({ id: _id, ...e }) => ({
              ...e,
              candidate_id: candidateId,
              start_date: yearToDate(e.start_date),
              end_date: e.is_current ? null : yearToDate(e.end_date),
            }))
          );
          if (eduErr) console.error('Education save error:', eduErr);
        }
      }),

      // 4. Skills — delete + reinsert
      supabase.from('candidate_candidate_skills').delete().eq('candidate_id', candidateId).then(async () => {
        const valid = skills.filter(s => s.name);
        if (valid.length) await supabase.from('candidate_candidate_skills').insert(
          valid.map(({ id: _id, ...s }) => ({ ...s, candidate_id: candidateId, skill_id: s.skill_id ?? null }))
        );
      }),

      // 5. Languages — delete + reinsert
      supabase.from('candidate_languages').delete().eq('candidate_id', candidateId).then(async () => {
        const valid = languages.filter(l => l.name.trim());
        if (valid.length) await supabase.from('candidate_languages').insert(
          valid.map(({ id: _id, ...l }) => ({ ...l, candidate_id: candidateId }))
        );
      }),
    ]);

    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 flex-wrap max-w-2xl">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={13} />{t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {tab === 'infos' && <InfosTab profile={profile} setProfile={setProfile} t={t} />}
        {tab === 'formations' && <FormationsTab items={educations} setItems={setEducations} t={t} lang={lang} />}
        {tab === 'experiences' && <ExperiencesTab items={experiences} setItems={setExperiences} t={t} />}
        {tab === 'competences' && <CompetencesTab items={skills} setItems={setSkills} masterSkills={masterSkills} lang={lang} />}
        {tab === 'langues' && <LanguesTab items={languages} setItems={setLanguages} lang={lang} />}
        {tab === 'cv' && (
          <CVGeneratorPanel
            profile={profile} experiences={experiences} educations={educations}
            skills={skills} languages={languages} candidateId={candidateId}
            onPhotoUpdate={(url) => setProfile({ ...profile, photo_url: url })}
            lang={lang}
          />
        )}

        {tab !== 'cv' && (
          <div className="mt-5 pt-5 border-t border-gray-100 flex justify-end">
            <button onClick={save} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 ${saved ? 'bg-green-600' : ''}`}
              style={!saved ? { background: SNH_BLUE } : {}}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                saved ? <><CheckCircle size={15} /> Sauvegardé</> : <><CheckCircle size={15} /> Sauvegarder</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CV Generator Panel ────────────────────────────────────────────────────────
function CVGeneratorPanel({ profile, experiences, educations, skills, languages, candidateId, onPhotoUpdate, lang }: {
  profile: CandidateProfile;
  experiences: any[]; educations: any[]; skills: any[]; languages: any[];
  candidateId: string;
  onPhotoUpdate: (url: string) => void;
  lang: 'fr' | 'en';
}) {
  const t = PROFILE_TR[lang];
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiMsg, setAiMsg] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert(t.cvPhotoTooLarge); return; }
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${candidateId}/profile.${ext}`;
    const { error: upErr } = await supabase.storage.from('candidate-photos').upload(path, file, { upsert: true });
    if (upErr) { alert(t.cvPhotoError + upErr.message); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from('candidate-photos').getPublicUrl(path);
    const photoUrl = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('candidates').update({ photo_url: photoUrl }).eq('id', candidateId);
    onPhotoUpdate(photoUrl);
    setUploadingPhoto(false);
  };

  const handleGenerate = async () => {
    setGenerating(true); setAiMsg(''); setAiSummary(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('generate-cv-ai', {
        body: { profile, experiences, educations, skills, languages, instructions },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.data?.aiSummary) { setAiSummary(res.data.aiSummary); setAiMsg(res.data.message || ''); }
      else setAiMsg(res.data?.message || t.cvAIDone);
    } catch { setAiMsg(t.cvAIError); }
    setGenerating(false);
  };

  const handleExport = async () => {
    const cvData: CVData = {
      profile: { ...profile, photo_url: profile.photo_url || null },
      experiences, educations, skills, languages,
      aiSummary: aiSummary || undefined,
    };
    await generateCV(cvData, template);
  };

  return (
    <div className="space-y-6">
      {/* Photo upload */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Camera size={15} /> {t.cvPhotoTitle}</h3>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center">
            {profile.photo_url
              ? <img src={profile.photo_url} alt="Photo" className="w-full h-full object-cover" />
              : <Camera size={28} className="text-gray-300" />}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">{t.cvPhotoHint.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
              {uploadingPhoto ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <Upload size={14} />}
              {uploadingPhoto ? t.cvPhotoUploading : t.cvPhotoBtn}
            </button>
          </div>
        </div>
      </div>

      {/* Template choice */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText size={15} /> {t.cvTemplateTitle}</h3>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'classic', label: t.cvTemplateClassicLabel, desc: t.cvTemplateClassicDesc },
            { value: 'modern', label: t.cvTemplateModernLabel, desc: t.cvTemplateModernDesc },
          ] as const).map(tp => (
            <button key={tp.value} onClick={() => setTemplate(tp.value)}
              className={`p-3 rounded-xl border-2 text-left transition ${template === tp.value ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${template === tp.value ? 'border-green-600 bg-green-600' : 'border-gray-300'}`} />
                <span className="text-sm font-semibold text-gray-900">{tp.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-5">{tp.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* AI instructions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2"><Sparkles size={15} className="text-amber-500" /> {t.cvAITitle}</h3>
        <p className="text-xs text-gray-500 mb-2">{t.cvAIDesc}</p>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          placeholder={t.cvAIPh} />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: '#f59e0b' }}>
            {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
            {generating ? t.cvAIGenerating : t.cvAIBtn}
          </button>
          {aiSummary && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> {t.cvAIGenerated}</span>}
        </div>
        {aiMsg && <p className="text-xs text-gray-500 mt-1">{aiMsg}</p>}
        {aiSummary && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">{t.cvAISummaryLabel}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="pt-4 border-t border-gray-100">
        <button onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0f2d52, #1e4a7a)' }}>
          <Download size={16} /> {t.cvExportBtn}
        </button>
        <p className="text-xs text-center text-gray-400 mt-2">{t.cvExportHint}</p>
      </div>
    </div>
  );
}

function InfosTab({ profile, setProfile, t }: { profile: CandidateProfile; setProfile: (p: CandidateProfile) => void; t: typeof PROFILE_TR['fr'] }) {
  const s = (k: keyof CandidateProfile, v: any) => setProfile({ ...profile, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.firstName}</Lbl><input value={profile.first_name} onChange={e => s('first_name', e.target.value)} className={inp()} /></div>
        <div><Lbl>{t.lastName}</Lbl><input value={profile.last_name} onChange={e => s('last_name', e.target.value)} className={inp()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.birthDate}</Lbl><input type="date" value={profile.birth_date || ''} onChange={e => s('birth_date', e.target.value)} className={inp()} required /></div>
        <div><Lbl>{t.gender}</Lbl>
          <select value={profile.gender || ''} onChange={e => s('gender', e.target.value)} className={inp()} required>
            <option value="">{t.genderPh}</option>
            <option value="Homme">{t.genderM}</option>
            <option value="Femme">{t.genderF}</option>
          </select>
        </div>
      </div>
      <div><Lbl>{t.professionalTitle}</Lbl><input value={profile.professional_title || ''} onChange={e => s('professional_title', e.target.value)} className={inp()} placeholder={t.professionalTitlePh} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.phoneMain}</Lbl><input value={profile.phone || ''} onChange={e => s('phone', e.target.value)} className={inp()} placeholder={t.phoneMainPh} required /></div>
        <div><Lbl>{t.phoneSecondary}</Lbl><input value={profile.phone2 || ''} onChange={e => s('phone2', e.target.value)} className={inp()} placeholder={t.phoneMainPh} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.cityResidence}</Lbl><input value={profile.location || ''} onChange={e => s('location', e.target.value)} className={inp()} placeholder={t.cityPh} required /></div>
        <div><Lbl>{t.countryResidence}</Lbl>
          <select value={profile.region || ''} onChange={e => s('region', e.target.value)} className={inp()} required>
            <option value="">{t.countryPh}</option>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.nationality}</Lbl><input value={profile.nationality || ''} onChange={e => s('nationality', e.target.value)} className={inp()} placeholder={t.nationalityPh} /></div>
        <div><Lbl>{t.idNumber}</Lbl><input value={profile.national_id || ''} onChange={e => s('national_id', e.target.value)} className={inp()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.desiredPosition}</Lbl><input value={profile.desired_position || ''} onChange={e => s('desired_position', e.target.value)} className={inp()} placeholder={t.desiredPositionPh} /></div>
        <div><Lbl>{t.availability}</Lbl><input type="date" value={profile.availability_date || ''} onChange={e => s('availability_date', e.target.value)} className={inp()} /></div>
      </div>
      <div>
        <Lbl>{t.salary}</Lbl>
        <input type="number" value={profile.desired_salary_min || ''} onChange={e => s('desired_salary_min', Number(e.target.value))} className={inp()} placeholder={t.salaryPh} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>{t.linkedin}</Lbl><input value={profile.linkedin_url || ''} onChange={e => s('linkedin_url', e.target.value)} className={inp()} placeholder={t.linkedinPh} /></div>
        <div><Lbl>{t.portfolio}</Lbl><input value={profile.portfolio_url || ''} onChange={e => s('portfolio_url', e.target.value)} className={inp()} placeholder={t.portfolioPh} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Lbl>{t.facebook}</Lbl><input value={profile.facebook_url || ''} onChange={e => s('facebook_url', e.target.value)} className={inp()} placeholder={t.facebookPh} /></div>
        <div><Lbl>{t.twitter}</Lbl><input value={profile.twitter_url || ''} onChange={e => s('twitter_url', e.target.value)} className={inp()} placeholder={t.twitterPh} /></div>
        <div><Lbl>{t.instagram}</Lbl><input value={profile.instagram_url || ''} onChange={e => s('instagram_url', e.target.value)} className={inp()} placeholder={t.instagramPh} /></div>
      </div>
      <div><Lbl>{t.about}</Lbl>
        <textarea value={profile.summary || ''} onChange={e => s('summary', e.target.value)} rows={4} className={inp()} placeholder={t.aboutPh} />
      </div>
    </div>
  );
}

function FormationsTab({ items, setItems, t, lang }: { items: Education[]; setItems: (v: Education[]) => void; t: typeof PROFILE_TR['fr']; lang: 'fr' | 'en' }) {
  const add = () => setItems([...items, { degree: '', field_of_study: '', institution: '', location: '', start_date: '', end_date: '', is_current: false, grade: '', country: 'Cameroun', education_level: '', description: '' }]);
  const upd = (i: number, k: keyof Education, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{t.academicPathTitle}</h3>
      {items.map((edu, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">{t.formationN} {i + 1}</span>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>{t.level}</Lbl>
              <select value={edu.education_level || ''} onChange={e => upd(i,'education_level',e.target.value)} className={inp()}>
                <option value="">— Sélectionner —</option>
                {EDU_LEVELS.map((l, i) => <option key={l} value={l}>{getEduLevels(lang)[i]}</option>)}
              </select>
            </div>
            <div><Lbl>{t.degree}</Lbl><input value={edu.degree} onChange={e => upd(i,'degree',e.target.value)} className={inp()} placeholder="Master en Génie Pétrolier..." /></div>
            <div><Lbl>{t.institution}</Lbl><input value={edu.institution} onChange={e => upd(i,'institution',e.target.value)} className={inp()} placeholder="ENSP, Université de Yaoundé..." /></div>
            <div><Lbl>{t.fieldOfStudy}</Lbl><input value={edu.field_of_study} onChange={e => upd(i,'field_of_study',e.target.value)} className={inp(!edu.field_of_study)} placeholder={t.fieldPh} /></div>
            <div><Lbl>{t.eduCountry}</Lbl><input value={edu.country || ''} onChange={e => upd(i,'country',e.target.value)} className={inp()} /></div>
            <div><Lbl>{t.eduCity}</Lbl><input value={edu.location} onChange={e => upd(i,'location',e.target.value)} className={inp()} /></div>
            <div><Lbl>{t.startYear}</Lbl><input type="number" value={dateToYear(edu.start_date)} onChange={e => upd(i,'start_date',e.target.value)} className={inp(!edu.start_date)} placeholder="Ex: 2018" min="1950" max="2030" /></div>
            {!edu.is_current && <div><Lbl>{t.endYear}</Lbl><input type="number" value={dateToYear(edu.end_date)} onChange={e => upd(i,'end_date',e.target.value)} className={inp()} placeholder="Ex: 2022" min="1950" max="2030" /></div>}
            <div><Lbl>{t.grade}</Lbl><input value={edu.grade} onChange={e => upd(i,'grade',e.target.value)} className={inp()} placeholder={t.gradePh} /></div>
            <div className="col-span-2"><Lbl>{t.descSpec}</Lbl>
              <textarea value={edu.description || ''} onChange={e => upd(i,'description',e.target.value)} rows={2} className={inp()} placeholder={t.descSpecPh} />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={edu.is_current} onChange={e => upd(i,'is_current',e.target.checked)} className="rounded border-gray-300" />
            {t.currentFormation}
          </label>
        </div>
      ))}
      <button onClick={add} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition">
        <Plus size={15} /> {t.addFormation}
      </button>
    </div>
  );
}

function ExperiencesTab({ items, setItems, t }: { items: Experience[]; setItems: (v: Experience[]) => void; t: typeof PROFILE_TR['fr'] }) {
  const add = () => setItems([...items, { job_title: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '', contract_type: 'CDI', sector: '' }]);
  const upd = (i: number, k: keyof Experience, v: any) => { const a = [...items]; (a[i] as any)[k] = v; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{t.experiencesTitle}</h3>
      {items.map((exp, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">{t.expN} {i + 1}</span>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>{t.jobTitle}</Lbl><input value={exp.job_title} onChange={e => upd(i,'job_title',e.target.value)} className={inp()} placeholder={t.jobTitlePh} /></div>
            <div><Lbl>{t.company}</Lbl><input value={exp.company} onChange={e => upd(i,'company',e.target.value)} className={inp()} /></div>
            <div><Lbl>{t.sector}</Lbl><input value={exp.sector || ''} onChange={e => upd(i,'sector',e.target.value)} className={inp()} placeholder={t.sectorPh} /></div>
            <div><Lbl>{t.contractType}</Lbl>
              <select value={exp.contract_type || 'CDI'} onChange={e => upd(i,'contract_type',e.target.value)} className={inp()}>
                {['CDI','CDD','Stage','Freelance','Alternance','Autres'].map(ct => <option key={ct}>{ct}</option>)}
              </select>
            </div>
            <div><Lbl>{t.expCity}</Lbl><input value={exp.location} onChange={e => upd(i,'location',e.target.value)} className={inp()} /></div>
            <div><Lbl>{t.startDate}</Lbl><input type="date" value={exp.start_date} onChange={e => upd(i,'start_date',e.target.value)} className={inp()} /></div>
            {!exp.is_current && <div><Lbl>{t.endDate}</Lbl><input type="date" value={exp.end_date} onChange={e => upd(i,'end_date',e.target.value)} className={inp()} /></div>}
          </div>
          <label className="flex items-center gap-2 my-3 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={exp.is_current} onChange={e => upd(i,'is_current',e.target.checked)} className="rounded border-gray-300" />
            {t.currentJob}
          </label>
          <div><Lbl>{t.missions}</Lbl>
            <textarea value={exp.description} onChange={e => upd(i,'description',e.target.value)} rows={3} className={inp()} placeholder={t.missionsPh} />
          </div>
        </div>
      ))}
      <button onClick={add} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition">
        <Plus size={15} /> {t.addExp}
      </button>
    </div>
  );
}

function getCatLabel(cat: string, t: typeof PROFILE_TR['fr']): string {
  const map: Record<string, string> = {
    technical: t.catTechnical, soft: t.catSoft, language: t.catLanguage,
    certification: t.catCertification, other: t.catOther,
  };
  return map[cat] ?? cat;
}

function StarLevel({ value, onChange }: { value: Skill['level']; onChange: (v: Skill['level']) => void }) {
  const map: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const labels = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
  const levels: Skill['level'][] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const filled = map[value] ?? 2;
  return (
    <div className="flex gap-0.5" title={labels[filled - 1]}>
      {[1, 2, 3, 4].map(star => (
        <button key={star} type="button" onClick={() => onChange(levels[star - 1])}
          className="transition-transform hover:scale-110 focus:outline-none"
          title={labels[star - 1]}>
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={star <= filled ? '#f59e0b' : 'none'}
            stroke={star <= filled ? '#f59e0b' : '#d1d5db'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function CompetencesTab({ items, setItems, masterSkills, lang }: {
  items: Skill[]; setItems: (v: Skill[]) => void; masterSkills: MasterSkill[]; lang: 'fr' | 'en';
}) {
  const t = PROFILE_TR[lang];
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedNames = new Set(items.map(s => s.name));

  const toggle = (ms: MasterSkill) => {
    if (selectedNames.has(ms.name)) {
      setItems(items.filter(s => s.name !== ms.name));
    } else {
      setItems([...items, { name: ms.name, skill_id: ms.id, category: (ms.category as Skill['category']) || 'technical', level: 'intermediate' }]);
    }
  };

  const removeSkill = (name: string) => {
    const ms = masterSkills.find(m => m.name === name);
    if (ms) toggle(ms); else setItems(items.filter(s => s.name !== name));
  };

  const addCustom = () => {
    if (!newName.trim() || selectedNames.has(newName.trim())) return;
    setItems([...items, { name: newName.trim(), skill_id: null, category: 'other', level: 'intermediate' }]);
    setNewName('');
  };

  const updateLevel = (name: string, level: Skill['level']) => {
    setItems(items.map(s => s.name === name ? { ...s, level } : s));
  };

  const f = search.toLowerCase();
  const grouped = masterSkills.reduce<Record<string, MasterSkill[]>>((acc, ms) => {
    const cat = ms.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    if (!f || ms.name.toLowerCase().includes(f)) acc[cat].push(ms);
    return acc;
  }, {});
  const catOrder = ['technical', 'soft', 'language', 'certification', 'other'];
  const hasResults = catOrder.some(cat => grouped[cat]?.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{t.skillsTitle}</h3>
        <span className="text-xs text-gray-500">{items.length} {items.length !== 1 ? t.skillsSelectedPlural : t.skillsSelected}</span>
      </div>

      {/* Selected skills chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-green-50 border border-green-100 rounded-xl min-h-[48px]">
          {items.map(sk => (
            <span key={sk.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-green-300 text-green-800 shadow-sm">
              {sk.name}
              <button type="button" onClick={() => removeSkill(sk.name)} className="text-green-400 hover:text-red-500 transition ml-0.5 leading-none"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Catalogue toggle button */}
      <button type="button" onClick={() => setPickerOpen(v => !v)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition">
        <Plus size={15} className={`transition-transform ${pickerOpen ? 'rotate-45' : ''}`} />
        {pickerOpen ? t.closeCatalogue : t.browseCatalogue}
      </button>

      {/* Inline picker */}
      {pickerOpen && (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inp() + ' bg-white'} placeholder={t.browseCatalogue + '...'} autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto p-3 space-y-4">
            {hasResults ? catOrder.map(cat => {
              const list = grouped[cat];
              if (!list || list.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{getCatLabel(cat, t)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map(ms => (
                      <button key={ms.id} type="button" onClick={() => toggle(ms)}
                        title={ms.description ?? ms.name}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selectedNames.has(ms.name) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'}`}>
                        {selectedNames.has(ms.name) && '✓ '}{ms.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-gray-400 text-center py-6">{t.noResultFor} « {search} »</p>
            )}
          </div>
          <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-200">
            <input value={newName} onChange={e => setNewName(e.target.value)} className={inp() + ' flex-1 bg-white text-sm'} placeholder={t.customSkillPh} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
            <button type="button" onClick={addCustom} className="px-4 py-2 rounded-lg text-white font-semibold text-sm flex items-center gap-1" style={{ background: SNH_BLUE }}>
              <Plus size={14} /> {t.addBtn}
            </button>
          </div>
        </div>
      )}

      {/* Selected skills with star levels */}
      {items.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">{t.skillLevelTitle}</p>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="text-amber-400">★</span> {lang === 'fr' ? 'Déb' : 'Beg'} &nbsp;
              <span className="text-amber-400">★★</span> {lang === 'fr' ? 'Int' : 'Int'} &nbsp;
              <span className="text-amber-400">★★★</span> {lang === 'fr' ? 'Av' : 'Adv'} &nbsp;
              <span className="text-amber-400">★★★★</span> {lang === 'fr' ? 'Exp' : 'Exp'}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map(sk => (
              <div key={sk.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition group">
                <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{sk.name}</span>
                <StarLevel value={sk.level} onChange={lv => updateLevel(sk.name, lv)} />
                <button type="button" onClick={() => removeSkill(sk.name)} className="text-gray-300 group-hover:text-red-400 hover:text-red-500 transition ml-1 flex-shrink-0"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const LANGUAGE_CATALOGUE = [
  { group: 'Langues mondiales', langs: ['Français', 'Anglais', 'Espagnol', 'Arabe', 'Portugais', 'Russe', 'Mandarin', 'Japonais', 'Allemand', 'Italien'] },
  { group: 'Langues africaines', langs: ['Swahili', 'Haoussa', 'Yoruba', 'Igbo', 'Zulu', 'Amharique', 'Wolof', 'Fula', 'Lingala', 'Shona'] },
  { group: 'Autres', langs: ['Coréen', 'Hindi', 'Turc', 'Néerlandais', 'Polonais', 'Ukrainien', 'Persan', 'Vietnamien', 'Thaï', 'Grec'] },
];

const DEFAULT_LANGS = ['Français', 'Anglais'];

function LanguesTab({ items, setItems, lang }: { items: Language[]; setItems: (v: Language[]) => void; lang: 'fr' | 'en' }) {
  const t = PROFILE_TR[lang];
  const [customName, setCustomName] = useState('');
  const selectedNames = new Set(items.map(l => l.name));

  const toggle = (name: string) => {
    if (selectedNames.has(name)) {
      setItems(items.filter(l => l.name !== name));
    } else {
      setItems([...items, { name, level: 'good' }]);
    }
  };

  const addCustom = () => {
    const t = customName.trim();
    if (!t || selectedNames.has(t)) return;
    setItems([...items, { name: t, level: 'good' }]);
    setCustomName('');
  };

  const updateLevel = (name: string, level: string) => {
    setItems(items.map(l => l.name === name ? { ...l, level } : l));
  };

  const currentStars = (level: string) => LANG_LEVELS.find(l => l.value === level)?.stars ?? 3;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.langTitle}</h3>
        {/* Default languages: FR + EN */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DEFAULT_LANGS.map(name => (
            <button key={name} type="button" onClick={() => toggle(name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${selectedNames.has(name) ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'}`}>
              <span className="text-base">{name === 'Français' ? '🇫🇷' : '🇬🇧'}</span>
              {name}
              {selectedNames.has(name) && <CheckCircle size={14} className="text-green-600" />}
            </button>
          ))}
        </div>

        {/* Add other language */}
        <div className="flex gap-2">
          <input value={customName} onChange={e => setCustomName(e.target.value)} className={inp() + ' flex-1'}
            placeholder={t.langAddPh} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
          <button type="button" onClick={addCustom} className="px-4 py-2 text-sm rounded-lg text-white font-semibold flex items-center gap-1.5" style={{ background: SNH_GREEN }}>
            <Plus size={14} /> {t.addBtn}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.langLevelTitle}</p>
          {items.map(langItem => {
            const stars = currentStars(langItem.level);
            const lvEntry = LANG_LEVELS.find(l => l.value === langItem.level);
            const levelLabel = lvEntry ? (lang === 'fr' ? lvEntry.labelFr : lvEntry.labelEn) : '';
            return (
              <div key={langItem.name} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-800 min-w-[80px]">{langItem.name}</span>
                {/* Star rating */}
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4, 5].map(n => {
                    const lv = LANG_LEVELS[n - 1];
                    return (
                      <button key={n} type="button" title={lang === 'fr' ? lv.labelFr : lv.labelEn}
                        onClick={() => updateLevel(langItem.name, lv.value)}
                        className="transition-transform hover:scale-110">
                        <Star size={20} fill={n <= stars ? SNH_GREEN : 'none'} stroke={n <= stars ? SNH_GREEN : '#d1d5db'} />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: `${SNH_GREEN}15`, color: SNH_GREEN }}>{levelLabel}</span>
                <button type="button" onClick={() => toggle(langItem.name)} className="text-red-400 hover:text-red-600 ml-auto"><X size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────
function docExpiryStatus(expDate: string | null | undefined): 'expired' | 'soon' | 'ok' | null {
  if (!expDate) return null;
  const d = new Date(expDate);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
}

function DocumentsSection({ candidateId, documents, setDocuments, lang }: {
  candidateId: string; documents: CandidateDoc[]; setDocuments: (d: CandidateDoc[]) => void; lang: Lang;
}) {
  const t = TR[lang];
  const [selectedType, setSelectedType] = useState('cv');
  const [expirationDate, setExpirationDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const expiredDocs = documents.filter(d => docExpiryStatus(d.expiration_date) === 'expired');
  const soonDocs = documents.filter(d => docExpiryStatus(d.expiration_date) === 'soon');
  const docTypes = getDocTypes(lang);

  const getDocPath = (fileUrl: string) => {
    const parts = fileUrl.split('/candidates-documents/');
    return parts.length > 1 ? decodeURIComponent(parts[1]) : fileUrl;
  };

  const openDocPreview = async (fileUrl: string) => {
    const path = getDocPath(fileUrl);
    const { data } = await supabase.storage.from('candidates-documents').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError(t.docsFileTooLarge); e.target.value = ''; return; }
    setError(''); setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${candidateId}/${selectedType}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('candidates-documents').upload(path, file, { upsert: false });
    if (upErr) { setError(t.docsUploadError + upErr.message); setUploading(false); e.target.value = ''; return; }
    const { data: urlData } = supabase.storage.from('candidates-documents').getPublicUrl(path);
    const { data: docData, error: insertErr } = await supabase.from('candidate_documents').insert({
      candidate_id: candidateId, type: selectedType, file_name: file.name,
      file_url: urlData.publicUrl, file_size: file.size,
      expiration_date: expirationDate || null,
    }).select().maybeSingle();
    if (insertErr) {
      setError(t.docsSaveError + insertErr.message);
      setUploading(false); e.target.value = ''; return;
    }
    if (docData) setDocuments([docData as CandidateDoc, ...documents]);
    setUploading(false); setExpirationDate(''); e.target.value = '';
  };

  const handleDelete = async (doc: CandidateDoc) => {
    setDeleting(doc.id);
    const parts = doc.file_url.split('/candidates-documents/');
    if (parts[1]) await supabase.storage.from('candidates-documents').remove([decodeURIComponent(parts[1])]);
    await supabase.from('candidate_documents').delete().eq('id', doc.id);
    setDocuments(documents.filter(d => d.id !== doc.id));
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      {/* Expiry alerts */}
      {expiredDocs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{t.docsExpiredTitle}</p>
            <p className="text-xs text-red-700 mt-1">{expiredDocs.map(d => docTypes.find(t2 => t2.value === d.type)?.label ?? d.type).join(', ')} — {t.docsExpiredMsg}</p>
          </div>
        </div>
      )}
      {soonDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{t.docsSoonTitle}</p>
            <p className="text-xs text-amber-700 mt-1">{soonDocs.map(d => docTypes.find(t2 => t2.value === d.type)?.label ?? d.type).join(', ')} — {t.docsSoonMsg}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">{t.docsInfoTitle}</p>
          <p className="text-xs text-blue-700 mt-1">{t.docsInfoMsg}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.docsUploadTitle}</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Lbl>{t.docsType} *</Lbl>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={inp()}>
              <option value="cv">{t.docsCvLabel}</option>
            </select>
          </div>
          <div>
            <Lbl>{t.docsExpiry}</Lbl>
            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className={inp()} min={new Date().toISOString().split('T')[0]} />
          </div>
        </div>
        <label className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          style={{ background: SNH_GREEN }}>
          {uploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.docsUploading}</> : <><Upload size={14} />{t.docsChooseFile}</>}
          <input type="file" className="hidden" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFile} />
        </label>
        <p className="text-xs text-gray-400 mt-2 text-center">{t.docsFormats}</p>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{t.docsMyDocs} ({documents.length})</h3>
        </div>
        {documents.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm"><FileText size={32} className="mx-auto mb-2 opacity-30" />{t.docsEmpty}</div>
        ) : (
          <div>
            {documents.map(doc => {
              const expStatus = docExpiryStatus(doc.expiration_date);
              return (
                <div key={doc.id} className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 ${expStatus === 'expired' ? 'bg-red-50' : expStatus === 'soon' ? 'bg-amber-50' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${expStatus === 'expired' ? 'bg-red-100' : expStatus === 'soon' ? 'bg-amber-100' : ''}`}
                    style={!expStatus || expStatus === 'ok' ? { background: `${SNH_GREEN}15` } : {}}>
                    <FileText size={16} style={{ color: expStatus === 'expired' ? '#dc2626' : expStatus === 'soon' ? '#d97706' : SNH_GREEN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {docTypes.find(d => d.value === doc.type)?.label ?? doc.type} · {fmtSize(doc.file_size)} · {lang === 'fr' ? 'Ajouté le' : 'Added on'} {fmtDate(doc.uploaded_at)}
                    </p>
                    {doc.expiration_date && (
                      <p className={`text-xs font-semibold mt-0.5 ${expStatus === 'expired' ? 'text-red-600' : expStatus === 'soon' ? 'text-amber-600' : 'text-gray-500'}`}>
                        {expStatus === 'expired' ? t.docsExpiredOn : expStatus === 'soon' ? t.docsSoonOn : t.docsExpiresOn}{fmtDate(doc.expiration_date)}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => openDocPreview(doc.file_url)} className="p-1.5 rounded transition hover:bg-green-50" style={{ color: SNH_GREEN }} title="Aperçu">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition disabled:opacity-50">
                    {deleting === doc.id ? <div className="w-3.5 h-3.5 border border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Job Detail Modal ──────────────────────────────────────────────────────────
function JobDetailModal({ job, match, isApplied, documents, candidateId, onApplied, onClose, readOnly, lang = 'fr' }: {
  job: JobOpening; match?: JobMatch; isApplied: boolean;
  documents: CandidateDoc[]; candidateId: string;
  onApplied: (app: Application) => void; onClose: () => void; readOnly?: boolean; lang?: Lang;
}) {
  const t = TR[lang];
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [limitReached, setLimitReached] = useState(false);

  const isStage = job.contract_type?.toLowerCase().includes('stage');
  const docKey = job.contract_type?.toLowerCase().includes('académique') ? 'stage_academique'
    : job.contract_type?.toLowerCase().includes('professionnel') ? 'stage_professionnel'
    : 'emploi';
  const uploadedTypes = new Set(documents.map(d => d.type));
  const requiredDocs = getRequiredDocs(docKey, lang);

  const handleApplyClick = async () => {
    setApplying(true);
    setApplyError('');

    // Check global application limit (max 5 active applications)
    const { count: globalCount } = await supabase
      .from('candidate_applications')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .neq('status', 'withdrawn')
      .neq('status', 'rejected');
    if ((globalCount ?? 0) >= 5) {
      setApplying(false);
      setApplyError(t.appGlobalLimitTitle + ' — ' + t.appGlobalLimitMsg);
      return;
    }

    // Count all previous attempts for this candidate+job (including withdrawn)
    const { count } = await supabase
      .from('candidate_applications')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .eq('job_opening_id', job.id);

    if ((count ?? 0) >= 3) {
      setApplying(false);
      setLimitReached(true);
      return;
    }

    const { data, error } = await supabase.from('candidate_applications').insert({
      candidate_id: candidateId, job_opening_id: job.id,
      desired_position: job.title, status: 'new',
    }).select().maybeSingle();
    if (error) {
      setApplyError(t.jdApplyError + error.message);
    } else if (data) {
      onApplied(data as Application);
      onClose();
    }
    setApplying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 rounded-t-2xl border-b border-gray-100 ${isStage ? 'bg-amber-50' : ''}`}
          style={!isStage ? { background: `${SNH_GREEN}08` } : {}}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 items-start">
              {(() => {
                const { Icon: JobIcon, color: iconColor, bg: iconBg } = getJobIcon(job.title, job.contract_type);
                return (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: iconBg }}>
                    <JobIcon size={22} style={{ color: iconColor }} />
                  </div>
                );
              })()}
              <div>
                <h2 className="text-lg font-bold text-gray-900">{(lang === 'en' && job.title_en) ? job.title_en : job.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">SNH · {job.location}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Tag variant={isStage ? 'amber' : 'green'}>{job.contract_type}</Tag>
                  {job.reference && <Tag variant="gray">{t.jdRef} {job.reference}</Tag>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"><X size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t.jdContract, value: job.contract_type },
              { label: t.jdLocation, value: job.location },
              { label: t.jdExperience, value: job.min_experience_years ? `${job.min_experience_years} ${lang === 'fr' ? 'an(s)' : 'year(s)'}` : t.jdNotSpecified },
              { label: t.jdEducation, value: job.education_level || t.jdNotSpecified },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={12} />{t.jdPublished} {fmtDate(job.publication_date)}</span>
            <span className={`flex items-center gap-1 font-semibold ${new Date(job.closing_date) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
              <Clock size={12} />{t.jdClosing} {fmtDate(job.closing_date)}
            </span>
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.jdDescription}</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {(lang === 'en' && job.description_en) ? job.description_en : job.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.jdProfile}</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {(lang === 'en' && job.requirements_en) ? job.requirements_en : job.requirements}
              </p>
            </div>
          )}

          {/* Required skills */}
          {job.required_skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.jdSkillsRequired}</p>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map(s => <Tag key={s} variant="blue">{s}</Tag>)}
              </div>
            </div>
          )}

          {/* Nice-to-have skills */}
          {job.nice_to_have_skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.jdSkillsNice}</p>
              <div className="flex flex-wrap gap-2">
                {job.nice_to_have_skills.map(s => <Tag key={s} variant="gray">{s}</Tag>)}
              </div>
            </div>
          )}

          {/* Documents info */}
          {!readOnly && requiredDocs.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-blue-700">{t.jdDocs}</p>
              <div className="space-y-1.5">
                {requiredDocs.map(doc => {
                  const ok = uploadedTypes.has(doc.value);
                  return (
                    <div key={doc.value} className="flex items-center gap-2 text-sm">
                      {ok
                        ? <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                        : <AlertCircle size={14} className="text-blue-400 flex-shrink-0" />}
                      <span className={ok ? 'text-green-700' : 'text-blue-600'}>{doc.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-blue-600 mt-3">{t.jdDocsInfo}</p>
            </div>
          )}
        </div>

        {applyError && (
          <div className="mx-6 mb-0 -mt-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
            <span>{applyError}</span>
          </div>
        )}

        {/* Limit reached overlay */}
        {limitReached && (
          <div className="mx-6 mb-0 -mt-2 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{t.appReapplyLimitTitle}</p>
              <p className="text-xs text-amber-700 mt-1">{t.appReapplyLimitMsg}</p>
            </div>
            <button onClick={() => { setLimitReached(false); onClose(); }} className="text-amber-500 hover:text-amber-700 flex-shrink-0"><X size={14} /></button>
          </div>
        )}

        {/* Footer */}
        {!readOnly && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">{t.jdClose}</button>
            {isApplied ? (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-semibold"><CheckCircle size={15} />{t.applied}</span>
            ) : (
              <button onClick={handleApplyClick} disabled={applying}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl text-white font-semibold disabled:opacity-60 transition hover:opacity-90"
                style={{ background: SNH_BLUE }}>
                {applying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                {t.jdApplyBtn}
              </button>
            )}
          </div>
        )}
        {readOnly && (
          <div className="px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">{t.jdClose}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

function getJobIcon(title: string, contractType?: string): { Icon: React.FC<any>; color: string; bg: string } {
  const t = (title + ' ' + (contractType ?? '')).toLowerCase();

  if (t.includes('stage') || t.includes('intern'))
    return { Icon: GraduationCap, color: '#7c3aed', bg: '#ede9fe' };

  if (t.includes('informati') || t.includes(' si ') || t.includes('système') || t.includes('systeme') ||
      t.includes('développ') || t.includes('develop') || t.includes('logiciel') || t.includes('réseau') ||
      t.includes('reseau') || t.includes('cyber') || t.includes('data') || t.includes('digital') ||
      t.includes('web') || t.includes('cloud') || t.includes('erp') || t.includes('base de données'))
    return { Icon: Monitor, color: '#2563eb', bg: '#dbeafe' };

  if (t.includes('financ') || t.includes('compt') || t.includes('audit') || t.includes('budget') ||
      t.includes('trésor') || t.includes('fiscal') || t.includes('sysco') || t.includes('analys') ||
      t.includes('économ') || t.includes('econom') || t.includes('sap'))
    return { Icon: DollarSign, color: '#d97706', bg: '#fef3c7' };

  if (t.includes('jurist') || t.includes('juridique') || t.includes('droit') || t.includes('légal') ||
      t.includes('legal') || t.includes('contrat pétrol') || t.includes('ohada'))
    return { Icon: Scale, color: '#6d28d9', bg: '#ede9fe' };

  if (t.includes('hse') || t.includes('hygiène') || t.includes('hygiene') || t.includes('sécurité') ||
      t.includes('securit') || t.includes('environn') || t.includes('iso 14001') || t.includes('ohsas'))
    return { Icon: Shield, color: '#0891b2', bg: '#cffafe' };

  if (t.includes('santé') || t.includes('sante') || t.includes('médic') || t.includes('medic') ||
      t.includes('infirm'))
    return { Icon: HeartPulse, color: '#e11d48', bg: '#ffe4e6' };

  if (t.includes('géolog') || t.includes('geolog') || t.includes('explor') || t.includes('réservoir') ||
      t.includes('reserv') || t.includes('bassin') || t.includes('sismique') || t.includes('pétroph') ||
      t.includes('stratig') || t.includes('géophysi') || t.includes('geophysi'))
    return { Icon: Layers, color: '#059669', bg: '#d1fae5' };

  if (t.includes('pétrole') || t.includes('petrol') || t.includes('product') || t.includes('forage') ||
      t.includes('drill') || t.includes('pipeline') || t.includes('raffin') || t.includes('hydrocarbure') ||
      t.includes('gaz') || t.includes('gas'))
    return { Icon: Flame, color: '#dc2626', bg: '#fee2e2' };

  if (t.includes('ressources humaines') || t.includes('ressource humaine') || t.includes(' rh') ||
      t.includes('recrutement') || t.includes('talent') || t.includes('paie') || t.includes('payroll'))
    return { Icon: Users, color: '#db2777', bg: '#fce7f3' };

  if (t.includes('logistique') || t.includes('approvision') || t.includes('achat') ||
      t.includes('supply') || t.includes('transport') || t.includes('stock'))
    return { Icon: Package, color: '#92400e', bg: '#fef3c7' };

  if (t.includes('mécan') || t.includes('mecan') || t.includes('mainten') || t.includes('maintenan') ||
      t.includes('electromécani') || t.includes('réparation'))
    return { Icon: Wrench, color: '#475569', bg: '#f1f5f9' };

  if (t.includes('électr') || t.includes('electr') || t.includes('instrument') ||
      t.includes('automat') || t.includes('énergie'))
    return { Icon: Zap, color: '#ca8a04', bg: '#fef9c3' };

  if (t.includes('chimi') || t.includes('labora') || t.includes('matériau') || t.includes('materiau'))
    return { Icon: FlaskConical, color: '#0284c7', bg: '#e0f2fe' };

  if (t.includes('directeur') || t.includes('manager') || t.includes('chef de') ||
      t.includes('responsable') || t.includes('directi') || t.includes('général'))
    return { Icon: Building2, color: '#374151', bg: '#f3f4f6' };

  if (t.includes('relations') || t.includes('coopérat') || t.includes('diplomati') ||
      t.includes('communication') || t.includes('marketing'))
    return { Icon: Globe, color: '#0369a1', bg: '#e0f2fe' };

  if (t.includes('cpu') || t.includes('architecture') || t.includes('infrastructure') ||
      t.includes('réseaux') || t.includes('telecom') || t.includes('télécom'))
    return { Icon: Cpu, color: '#4f46e5', bg: '#e0e7ff' };

  return { Icon: Briefcase, color: SNH_GREEN, bg: `${SNH_GREEN}15` };
}

function JobsSection({ openJobs, matches, candidateId, onApplied, applications, documents, educations, lang }: {
  openJobs: JobOpening[]; matches: JobMatch[]; candidateId: string;
  onApplied: (app: Application) => void; applications: Application[];
  documents: CandidateDoc[]; educations: Education[]; lang: Lang;
}) {
  const t = TR[lang];
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  // Only count non-withdrawn applications as "already applied" (so re-apply button can appear)
  const applied = new Set(applications.filter(a => a.status !== 'withdrawn').map(a => a.job_opening_id || '').filter(Boolean));

  // Diploma-level rank for filtering — higher index = higher level
  const EDU_RANK: Record<string, number> = {
    'CEP': 0, 'FSLC': 0,
    'BEPC': 1, 'GCE O-Level': 1,
    'BAC': 2, 'GCE A-Level': 2,
    'BAC+2 (BTS/DUT)': 3, 'GCE+2 / HND': 3,
    'BAC+3 (Licence)': 4, "Bachelor's Degree": 4,
    'BAC+4': 5, 'GCE+4': 5,
    'BAC+5 (Master)': 6, "Master's Degree": 6,
    'Doctorat': 7, 'Doctorate / PhD': 7,
    'Autre': -1, 'Other': -1,
  };
  const candidateRank = educations.reduce((max, e) => {
    const r = EDU_RANK[e.education_level ?? ''] ?? -1;
    return r > max ? r : max;
  }, -1);

  const filtered = openJobs.filter(j => {
    const txt = `${j.title} ${j.location} ${j.description}`.toLowerCase();
    if (search && !txt.includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && j.contract_type !== filterType) return false;
    // Diploma-level compatibility filter (only when candidate has a known level)
    if (candidateRank >= 0 && j.education_level) {
      const jobRank = EDU_RANK[j.education_level] ?? -1;
      if (jobRank >= 0 && Math.abs(jobRank - candidateRank) > 1) return false;
    }
    return true;
  });

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-xl p-4 flex items-start gap-3 border" style={{ background: `${SNH_GREEN}0D`, borderColor: `${SNH_GREEN}30` }}>
          <Building2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: SNH_GREEN }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: SNH_GREEN }}>{t.jobsTitle}</p>
            <p className="text-xs mt-0.5" style={{ color: `${SNH_GREEN}CC` }}>{t.jobsDesc}</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className={inp() + ' pl-9'} placeholder={t.jobsSearchPh} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`${inp()} w-48`}>
            <option value="all">{t.jobsAllTypes}</option>
            {['CDI','CDD','Stage académique','Stage professionnel'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Briefcase size={40} className="mx-auto mb-2 opacity-20" />{t.jobsEmpty}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => {
              const m = matches.find(x => x.job_opening_id === job.id);
              const isStage = job.contract_type?.toLowerCase().includes('stage');
              const isApplied = applied.has(job.id);
              const { Icon: JobIcon, color: iconColor, bg: iconBg } = getJobIcon(job.title, job.contract_type);
              return (
                <div key={job.id} onClick={() => setSelectedJob(job)} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-4 items-start transition hover:shadow-md cursor-pointer ${isStage ? 'border-l-4 border-l-amber-400 border-gray-200' : 'border-l-4 border-l-blue-500 border-gray-200'}`}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: iconBg }}>
                    <JobIcon size={20} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 hover:underline">{(lang === 'en' && job.title_en) ? job.title_en : job.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">SNH · {job.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Tag variant={isStage ? 'amber' : 'green'}>{job.contract_type}</Tag>
                      {job.required_skills?.slice(0, 3).map(s => <Tag key={s} variant="blue">{s}</Tag>)}
                      {(job.required_skills?.length || 0) > 3 && <Tag variant="gray">+{job.required_skills.length - 3}</Tag>}
                      <Tag variant="gray"><Clock size={10} className="mr-1" />{t.jobsClosing} {fmtDate(job.closing_date)}</Tag>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                    {isApplied
                      ? <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle size={12} />{t.applied}</span>
                      : <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">{t.jobsViewOffer}</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          match={matches.find(x => x.job_opening_id === selectedJob.id)}
          isApplied={applied.has(selectedJob.id)}
          documents={documents}
          candidateId={candidateId}
          onApplied={(app) => { onApplied(app); }}
          onClose={() => setSelectedJob(null)}
          lang={lang}
        />
      )}
    </>
  );
}

// ── Spontaneous Application ───────────────────────────────────────────────────
const REQUIRED_DOCS_BY_TYPE_FR: Record<string, { value: string; label: string }[]> = {
  emploi: [
    { value: 'cv',              label: 'CV / Curriculum Vitae' },
    { value: 'cover_letter',    label: 'Lettre de motivation' },
    { value: 'diploma',         label: 'Diplôme / Attestation de diplôme' },
    { value: 'cni_passport',    label: 'CNI / Passeport' },
    { value: 'employment_cert', label: "Attestation d'emploi" },
    { value: 'work_cert',       label: 'Certificat de travail' },
  ],
  stage_academique: [
    { value: 'cv',           label: 'CV / Curriculum Vitae' },
    { value: 'cover_letter', label: 'Lettre de motivation' },
    { value: 'diploma',      label: 'Diplôme / Attestation de scolarité' },
    { value: 'cni_passport', label: 'CNI / Passeport' },
  ],
  stage_professionnel: [
    { value: 'cv',           label: 'CV / Curriculum Vitae' },
    { value: 'cover_letter', label: 'Lettre de motivation' },
    { value: 'cni_passport', label: 'CNI / Passeport' },
  ],
};
const REQUIRED_DOCS_BY_TYPE_EN: Record<string, { value: string; label: string }[]> = {
  emploi: [
    { value: 'cv',              label: 'CV / Curriculum Vitae' },
    { value: 'cover_letter',    label: 'Cover letter' },
    { value: 'diploma',         label: 'Diploma / Degree certificate' },
    { value: 'cni_passport',    label: 'National ID / Passport' },
    { value: 'employment_cert', label: 'Employment certificate' },
    { value: 'work_cert',       label: 'Work certificate' },
  ],
  stage_academique: [
    { value: 'cv',           label: 'CV / Curriculum Vitae' },
    { value: 'cover_letter', label: 'Cover letter' },
    { value: 'diploma',      label: 'Diploma / Enrolment certificate' },
    { value: 'cni_passport', label: 'National ID / Passport' },
  ],
  stage_professionnel: [
    { value: 'cv',           label: 'CV / Curriculum Vitae' },
    { value: 'cover_letter', label: 'Cover letter' },
    { value: 'cni_passport', label: 'National ID / Passport' },
  ],
};
function getRequiredDocs(type: string, lang: 'fr' | 'en') {
  const map = lang === 'fr' ? REQUIRED_DOCS_BY_TYPE_FR : REQUIRED_DOCS_BY_TYPE_EN;
  return map[type] ?? [];
}

function SpontaneousSection({ candidateId, profile, documents, onApplied, lang }: {
  candidateId: string;
  profile: CandidateProfile;
  documents: CandidateDoc[];
  onApplied: (app: Application) => void;
  lang: Lang;
}) {
  const t = TR[lang];
  const [type, setType] = useState<'emploi' | 'stage_academique' | 'stage_professionnel'>('emploi');
  const [poste, setPoste] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [stageTopic, setStageTopic] = useState('');
  const [stageDuration, setStageDuration] = useState('');
  const [stageStart, setStageStart] = useState('');
  const [stageSchool, setStageSchool] = useState('');
  const [stageSupervisor, setStageSupervisor] = useState('');
  const [stageEduLevel, setStageEduLevel] = useState('');
  const [availability, setAvailability] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isStage = type !== 'emploi';
  const uploadedTypes = new Set(documents.map(d => d.type));
  const requiredDocs = getRequiredDocs(type, lang);
  const missingDocs = requiredDocs.filter(d => !uploadedTypes.has(d.value));
  const hasMissingDocs = missingDocs.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poste || !coverLetter.trim()) return;
    setSubmitting(true);
    const typeLabel = type === 'emploi' ? 'Emploi' : type === 'stage_academique' ? 'Stage académique' : 'Stage professionnel';
    const desiredPos = `[${typeLabel}] ${poste}`;
    let notes = '';
    if (isStage) {
      notes = [
        stageTopic && `Thème : ${stageTopic}`,
        stageDuration && `Durée : ${stageDuration}`,
        stageStart && `Début souhaité : ${stageStart}`,
        stageSchool && `Institution : ${stageSchool}`,
        stageSupervisor && `Encadreur académique : ${stageSupervisor}`,
        stageEduLevel && `Niveau d'études actuel : ${stageEduLevel}`,
      ].filter(Boolean).join('\n');
    } else {
      notes = [
        availability && `Disponibilité : ${availability}`,
        salaryExpectation && `Prétention salariale : ${salaryExpectation} FCFA/mois`,
      ].filter(Boolean).join('\n');
    }
    const { data } = await supabase.from('candidate_applications').insert({
      candidate_id: candidateId,
      job_opening_id: null,
      desired_position: desiredPos,
      cover_letter: coverLetter,
      status: 'new',
      internal_notes: notes || null,
      spontaneous_type: type,
    }).select().maybeSingle();
    setSubmitting(false);
    if (data) { setDone(true); onApplied(data as Application); }
  };

  if (done) return (
    <div className="max-w-lg mx-auto mt-12 text-center bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{t.spontSent}</h2>
      <p className="text-gray-500 text-sm">{t.spontSentMsg}</p>
    </div>
  );

  return (
    <div>
      <div className="rounded-xl p-4 flex items-start gap-3 mb-5 border" style={{ background: `${SNH_GREEN}0D`, borderColor: `${SNH_GREEN}30` }}>
        <Send size={16} className="flex-shrink-0 mt-0.5" style={{ color: SNH_GREEN }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: SNH_GREEN }}>{t.spontBannerTitle}</p>
          <p className="text-xs mt-0.5" style={{ color: `${SNH_GREEN}CC` }}>{t.spontBannerDesc}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.spontTypeTitle} <span className="text-red-500">*</span></h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'emploi', icon: Briefcase, label: t.spontTypeEmploi, sub: t.spontTypeEmploiSub },
              { value: 'stage_academique', icon: GraduationCap, label: t.spontTypeAcad, sub: t.spontTypeAcadSub },
              { value: 'stage_professionnel', icon: BookOpen, label: t.spontTypePro, sub: t.spontTypeProSub },
            ].map(tp => (
              <button key={tp.value} type="button" onClick={() => setType(tp.value as typeof type)}
                className={`p-4 rounded-xl border-2 text-center transition cursor-pointer ${type === tp.value ? 'bg-green-50' : 'border-gray-200 bg-white hover:border-green-400'}`}
                style={type === tp.value ? { borderColor: SNH_GREEN } : {}}>
                <tp.icon size={22} className="mx-auto mb-1.5" style={{ color: type === tp.value ? SNH_GREEN : '#9ca3af' }} />
                <p className="text-xs font-semibold text-gray-900">{tp.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{tp.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Documents info */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">{t.spontDocsTitle}</p>
            <p className="text-xs text-blue-700 mt-1">
              {t.spontDocsDesc}
            </p>
            {requiredDocs.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {requiredDocs.map(doc => {
                  const present = uploadedTypes.has(doc.value);
                  return (
                    <div key={doc.value} className="flex items-center gap-1.5">
                      {present
                        ? <CheckCircle size={12} className="text-green-600 flex-shrink-0" />
                        : <AlertCircle size={12} className="text-blue-400 flex-shrink-0" />}
                      <span className={`text-xs ${present ? 'text-green-700' : 'text-blue-600'}`}>{doc.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Poste */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.spontPosteTitle} <span className="text-red-500">*</span></h3>
          <div>
            <Lbl>{t.spontPosteLbl}</Lbl>
            <input value={poste} onChange={e => setPoste(e.target.value)} className={inp()} placeholder={t.spontPostePh} required />
          </div>
        </div>

        {/* Stage-specific fields */}
        {isStage && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap size={15} /> {t.spontStageTitle}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Lbl>{t.spontStageTopic}</Lbl>
                <input value={stageTopic} onChange={e => setStageTopic(e.target.value)} className={inp()} placeholder={t.spontStageTopicPh} />
              </div>
              <div className="col-span-2">
                <Lbl>{t.spontStageLevel}</Lbl>
                <select value={stageEduLevel} onChange={e => setStageEduLevel(e.target.value)} className={inp()}>
                  <option value="">{t.spontStageLevelPh}</option>
                  {EDU_LEVELS.map((l, i) => <option key={l} value={l}>{getEduLevels(lang)[i]}</option>)}
                </select>
              </div>
              <div>
                <Lbl>{t.spontStageDuration}</Lbl>
                <select value={stageDuration} onChange={e => setStageDuration(e.target.value)} className={inp()}>
                  {(type === 'stage_academique' ? t.spontDurationAcadOptions : t.spontDurationProOptions).map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Lbl>{t.spontStageStart}</Lbl>
                <input type="date" value={stageStart} onChange={e => setStageStart(e.target.value)} className={inp()} />
              </div>
              <div>
                <Lbl>{t.spontStageSupervisor}</Lbl>
                <input value={stageSupervisor} onChange={e => setStageSupervisor(e.target.value)} className={inp()} placeholder={t.spontStageSupervisorPh} />
              </div>
              <div className="col-span-2">
                <Lbl>{t.spontStageSchool}</Lbl>
                <input value={stageSchool} onChange={e => setStageSchool(e.target.value)} className={inp()} placeholder={t.spontStageSchoolPh} />
              </div>
            </div>
          </div>
        )}

        {/* Emploi-specific fields */}
        {!isStage && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.spontConditions}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl>{t.spontAvail}</Lbl>
                <select value={availability} onChange={e => setAvailability(e.target.value)} className={inp()}>
                  {t.spontAvailOptions.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Lbl>{t.spontSalary}</Lbl>
                <input type="number" value={salaryExpectation} onChange={e => setSalaryExpectation(e.target.value)} className={inp()} placeholder={t.spontSalaryPh} />
              </div>
            </div>
          </div>
        )}

        {/* Cover letter */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.spontCoverLetter} <span className="text-red-500">*</span></h3>
          <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={9} className={inp()} required
            placeholder={lang === 'fr'
              ? `Madame, Monsieur le Directeur des Ressources Humaines,\n\nJe me permets de vous adresser ma candidature spontanée auprès de la Société Nationale des Hydrocarbures du Cameroun (SNH) pour un poste de [poste visé].\n\n[Développez vos motivations et votre valeur ajoutée pour la SNH]\n\nDans l'espoir d'une réponse favorable, je reste disponible pour tout entretien à votre convenance.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${profile.first_name} ${profile.last_name}`
              : `Dear HR Director,\n\nI am writing to submit my spontaneous application to the Société Nationale des Hydrocarbures (SNH) for the position of [desired position].\n\n[Describe your motivations and the value you would bring to SNH]\n\nI remain available for an interview at your convenience.\n\nYours sincerely,\n\n${profile.first_name} ${profile.last_name}`
            } />

          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={submitting || !coverLetter.trim() || !poste}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition"
              style={{ background: SNH_BLUE }}>
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
              {t.spontSubmitBtn}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────
function ApplicationsSection({ applications, openJobs, documents, candidateId, candidateName, onApplied, onWithdrawn, onDeleted, lang }: {
  applications: Application[]; openJobs: JobOpening[];
  documents: CandidateDoc[]; candidateId: string; candidateName: string;
  onApplied: (app: Application) => void;
  onWithdrawn: (appId: string) => void;
  onDeleted: (appId: string) => void;
  lang: Lang;
}) {
  const t = TR[lang];
  const [filter, setFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);
  // Exclude withdrawn so "isApplied" check in modal allows re-apply
  const applied = new Set(applications.filter(a => a.status !== 'withdrawn').map(a => a.job_opening_id || '').filter(Boolean));

  const STATUS_LABELS: Record<string, string> = {
    new: t.statusNew, technical_tests: t.statusTechnicalTests, interview: t.statusInterview,
    psycho_tests: t.statusPsychoTests, medical_visit: t.statusMedicalVisit,
    morality_inquiry: t.statusMoralityInquiry, diploma_check: t.statusDiplomaCheck,
    trial: t.statusTrial, assignment: t.statusAssignment,
    integrated: t.statusIntegrated, rejected: t.statusRejected, withdrawn: t.statusWithdrawn,
  };

  const canWithdraw = (status: string) => ['new', 'technical_tests'].includes(status);
  const canDelete  = (status: string) => ['withdrawn', 'rejected'].includes(status);

  const handleWithdraw = async (appId: string) => {
    setWithdrawing(appId);
    setActionError('');
    const { error } = await supabase
      .from('candidate_applications')
      .update({ status: 'withdrawn' })
      .eq('id', appId);
    if (error) {
      setActionError(t.appWithdrawError + error.message);
      setWithdrawing(null);
      return;
    }
    onWithdrawn(appId);
    setWithdrawing(null);
    setConfirmWithdrawId(null);
  };

  const handleDelete = async (appId: string) => {
    setDeleting(appId);
    setActionError('');
    const { error } = await supabase
      .from('candidate_applications')
      .delete()
      .eq('id', appId);
    if (error) {
      setActionError(t.appDeleteError + error.message);
      setDeleting(null);
      return;
    }
    onDeleted(appId);
    setDeleting(null);
    setConfirmDeleteId(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)} className={`${inp()} w-52`}>
          <option value="all">{t.appAllStatuses}</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {actionError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t.appTitle} ({filtered.length})</h3>
          </div>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400"><FileText size={36} className="mx-auto mb-2 opacity-20" />{t.appEmpty}</div>
          ) : (
            <div>
              {filtered.map(app => {
                const job = openJobs.find(j => j.id === app.job_opening_id);
                const isStage = job?.contract_type?.toLowerCase().includes('stage');
                return (
                  <div key={app.id}
                    className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                    {(() => {
                      const title = app.desired_position || app.job_opening?.title || '';
                      const { Icon: JobIcon, color: iconColor, bg: iconBg } = getJobIcon(title, job?.contract_type);
                      return (
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
                          style={{ background: iconBg }}
                          onClick={() => job && setSelectedJob(job)}>
                          <JobIcon size={16} style={{ color: iconColor }} />
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => job && setSelectedJob(job)}>
                      <p className="text-sm font-semibold text-gray-900">{app.desired_position || app.job_opening?.title || '—'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Building2 size={10} />SNH</span>
                        {app.job_opening_id ? <Tag variant="blue">{t.appPublished}</Tag> : <Tag variant="purple">{t.appSpontaneous}</Tag>}
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{fmtDate(app.created_at)}</span>
                      </div>
                      <SNHPipelineProgress status={app.status} lang={lang} />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AppStatus status={app.status} />
                      {job && <ChevronRight size={14} className="text-gray-300 cursor-pointer" onClick={() => setSelectedJob(job)} />}

                      {/* Withdraw button — active applications only */}
                      {canWithdraw(app.status) && (
                        confirmWithdrawId === app.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-red-700 font-medium">{t.appConfirm}</span>
                            <button onClick={() => handleWithdraw(app.id)} disabled={withdrawing === app.id}
                              className="text-xs px-2 py-0.5 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition disabled:opacity-50">
                              {withdrawing === app.id ? '...' : t.appYes}
                            </button>
                            <button onClick={() => setConfirmWithdrawId(null)}
                              className="text-xs px-2 py-0.5 border border-red-200 text-red-600 rounded hover:bg-red-100 transition">
                              {t.appNo}
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setConfirmWithdrawId(app.id); }}
                            className="text-xs px-2.5 py-1 border border-slate-200 text-slate-500 rounded-lg hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition font-medium">
                            {t.appWithdraw}
                          </button>
                        )
                      )}

                      {/* Print fiche — for applications that have progressed */}
                      {!['new', 'withdrawn', 'rejected'].includes(app.status) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); printApplicationFiche(app, candidateName); }}
                          className="text-xs px-2.5 py-1 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 hover:border-green-400 transition font-medium flex items-center gap-1"
                          title={lang === 'fr' ? 'Imprimer ma fiche de progression' : 'Print progression sheet'}
                        >
                          <Printer size={11} />
                          {lang === 'fr' ? 'Imprimer' : 'Print'}
                        </button>
                      )}

                      {/* Delete button — withdrawn / rejected only */}
                      {canDelete(app.status) && (
                        confirmDeleteId === app.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-red-700 font-medium">{t.appConfirm}</span>
                            <button onClick={() => handleDelete(app.id)} disabled={deleting === app.id}
                              className="text-xs px-2 py-0.5 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition disabled:opacity-50">
                              {deleting === app.id ? '...' : t.appYes}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2 py-0.5 border border-red-200 text-red-600 rounded hover:bg-red-100 transition">
                              {t.appNo}
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(app.id); }}
                            className="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:text-red-700 transition font-medium flex items-center gap-1">
                            <Trash2 size={11} />
                            {t.appDelete}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isApplied={applied.has(selectedJob.id)}
          documents={documents}
          candidateId={candidateId}
          onApplied={onApplied}
          onClose={() => setSelectedJob(null)}
          readOnly
          lang={lang}
        />
      )}
    </>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

// Translate DB-stored French notification text to English.
// The trigger stores fixed patterns — we translate by matching them.
function translateNotif(title: string, body: string, lang: Lang): { title: string; body: string } {
  if (lang === 'fr') return { title, body };

  // Translate title
  let enTitle = title;
  if (title === 'Candidature reçue') enTitle = 'Application received';
  else if (title === 'Mise à jour de votre dossier') enTitle = 'Application update';

  // Translate body — extract the job position then rebuild in English
  let enBody = body;

  // Pattern: 'Votre candidature pour "X" a bien été reçue. L'équipe RH SNH la traitera dans les meilleurs délais.'
  const receivedMatch = body.match(/^Votre candidature pour "(.+)" a bien été reçue\./);
  if (receivedMatch) {
    enBody = `Your application for "${receivedMatch[1]}" has been received. The SNH HR team will process it as soon as possible.`;
    return { title: enTitle, body: enBody };
  }

  // Pattern: 'Votre candidature pour "X" a été mise à jour. Nouveau statut : Y.'
  const updatedMatch = body.match(/^Votre candidature pour "(.+)" a été mise à jour\. Nouveau statut : (.+)\.$/);
  if (updatedMatch) {
    const position = updatedMatch[1];
    const statusFr = updatedMatch[2];
    const statusMap: Record<string, string> = {
      'En cours d\'étude': 'Under review',
      'Entretien planifié': 'Interview scheduled',
      'Offre reçue': 'Offer received',
      'En essai': 'Trial period',
      'Intégration en cours': 'Onboarding',
      'Titularisé(e) — félicitations !': 'Confirmed — congratulations!',
      'Non retenu(e) à ce stade': 'Not selected at this stage',
      'Candidature retirée': 'Application withdrawn',
    };
    const statusEn = statusMap[statusFr] ?? statusFr;
    enBody = `Your application for "${position}" has been updated. New status: ${statusEn}.`;
    return { title: enTitle, body: enBody };
  }

  return { title: enTitle, body: enBody };
}

function NotificationsSection({ notifications, onView, lang }: { notifications: Notification[]; onView: () => void; lang: Lang }) {
  const t = TR[lang];
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark all as read shortly after the section is opened
  useEffect(() => {
    if (unreadCount === 0) return;
    const t = setTimeout(onView, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{t.notifications}</h3>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {unreadCount} {unreadCount > 1 ? t.notifsNewPlural : t.notifsNew}
            </span>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><Bell size={32} className="mx-auto mb-2 opacity-20" />{t.notifsEmpty}</div>
        ) : (
          <div>
            {notifications.map(n => {
              const { title: nTitle, body: nBody } = translateNotif(n.title, n.body, lang);
              return (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${n.read ? 'bg-green-50/30' : 'bg-red-50/40'}`}>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                    {nTitle}
                  </p>
                  <p className={`text-sm mt-0.5 ${n.read ? 'text-gray-500' : 'text-gray-700'}`}>{nBody}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} />{fmtDate(n.created_at)}</p>
                </div>
                {!n.read && (
                  <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{t.notifsNewBadge}</span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
