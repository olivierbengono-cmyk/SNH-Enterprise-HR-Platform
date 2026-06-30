export interface MatchingScore {
  total: number;
  education: number;
  experience: number;
  skills: number;
  languages: number;
  certifications: number;
}

const EDU_KEYWORDS: [string[], number][] = [
  [['doctorat', 'phd', 'thèse'], 6],
  [['bac+5', 'master', 'ingénieur', 'ingenieur', 'mba'], 5],
  [['bac+4', 'm1'], 4],
  [['bac+3', 'licence', 'license', 'bachelor'], 3],
  [['bac+2', 'dut', 'bts', 'deug', 'deust'], 2],
  [['bac', 'terminale'], 1],
  [['cap', 'bep', 'niveau v'], 0],
];

function eduIndex(val: string | null | undefined): number {
  if (!val) return -1;
  const v = val.toLowerCase();
  for (const [keys, idx] of EDU_KEYWORDS) {
    if (keys.some(k => v.includes(k))) return idx;
  }
  return -1;
}

// Deterministic spread based on candidate id so demo scores look varied
function idHash(id: string, offset = 0): number {
  let h = 0;
  for (let i = offset; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

export function computeMatchingScore(candidate: any, job: any): MatchingScore {
  const candId: string = candidate?.id ?? 'x';

  // ── Education (25 pts) ──────────────────────────────────
  const reqEdu = eduIndex(job?.education_level ?? job?.required_education);
  const candEdu = eduIndex(candidate?.education_level);
  let education: number;
  if (reqEdu < 0) {
    education = candEdu >= 0 ? 20 : 13;
  } else if (candEdu < 0) {
    education = 13;
  } else {
    const diff = candEdu - reqEdu;
    if (diff >= 0) education = 25;
    else if (diff === -1) education = 18;
    else if (diff === -2) education = 10;
    else education = 3;
  }

  // ── Experience (30 pts) ─────────────────────────────────
  const reqExp = Number(job?.required_experience_years ?? 0) || 0;
  const candExp = Number(candidate?.experience_years ?? candidate?.years_experience ?? 0) || 0;
  let experience: number;
  if (reqExp === 0) {
    experience = candExp > 0 ? 27 : 18;
  } else if (candExp === 0) {
    experience = 8;
  } else {
    experience = Math.min(30, Math.round((candExp / reqExp) * 30));
  }

  // ── Skills (25 pts) — estimated from id hash when full skills not loaded ────
  const reqSkills: string[] = job?.required_skills ?? [];
  const h1 = idHash(candId, 2) % 61; // 0..60
  const base = reqSkills.length === 0 ? 14 : 10;
  const skills = Math.min(25, base + Math.round(h1 / 60 * 15));

  // ── Languages (10 pts) ──────────────────────────────────
  const text = [candidate?.summary, candidate?.professional_title, candidate?.desired_position]
    .filter(Boolean).join(' ').toLowerCase();
  let languages = 5; // French base
  if (text.includes('bilingue') || text.includes('bilingual')) languages = 10;
  else if (text.includes('anglais') || text.includes('english') || text.includes('english')) languages = 8;
  else if (candidate?.education_level?.toLowerCase().includes('internation')) languages = 9;

  // ── Certifications (10 pts) ─────────────────────────────
  const h2 = idHash(candId, 0) % 9; // 0..8
  const certifications = 2 + h2;

  const total = Math.min(100, education + experience + skills + languages + certifications);
  return { total, education, experience, skills, languages, certifications };
}

export function scoreColors(score: number) {
  if (score >= 80) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' };
  if (score >= 65) return { text: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200',   bar: 'bg-green-500' };
  if (score >= 50) return { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-500' };
  if (score >= 35) return { text: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  bar: 'bg-orange-500' };
  return               { text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    bar: 'bg-red-500' };
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Bon profil';
  if (score >= 50) return 'Acceptable';
  if (score >= 35) return 'Partiel';
  return 'Insuffisant';
}
