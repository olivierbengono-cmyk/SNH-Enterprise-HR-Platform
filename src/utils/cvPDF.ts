export interface CVData {
  profile: {
    first_name: string; last_name: string; email: string;
    phone?: string | null; phone2?: string | null;
    location?: string | null; region?: string | null;
    linkedin_url?: string | null; portfolio_url?: string | null;
    summary?: string | null; desired_position?: string | null;
    professional_title?: string | null;
    birth_date?: string | null; gender?: string | null;
    nationality?: string | null; national_id?: string | null;
    availability_date?: string | null; mobility?: string | null;
    photo_url?: string | null;
  };
  experiences: Array<{
    job_title: string; company: string; location?: string;
    start_date: string; end_date?: string; is_current?: boolean;
    description?: string; contract_type?: string; sector?: string;
  }>;
  educations: Array<{
    degree: string; field_of_study?: string; institution: string;
    location?: string; start_date?: string; end_date?: string;
    is_current?: boolean; grade?: string; description?: string;
  }>;
  skills: Array<{ name: string; category: string; level: string }>;
  languages: Array<{ name: string; level: string }>;
  // Optional AI-generated enhanced content
  aiSummary?: string;
  aiInstructions?: string;
}

type CVTemplate = 'classic' | 'modern';

const LEVEL_MAP: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire',
  advanced: 'Avancé', expert: 'Expert',
  good: 'Bon niveau', excellent: 'Excellent',
};
const LANG_LEVEL_MAP: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire',
  good: 'Bon niveau', excellent: 'Courant / Bilingue',
};

function formatDateRange(start?: string, end?: string, isCurrent?: boolean) {
  const fmt = (d?: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };
  const s = fmt(start);
  const e = isCurrent ? 'Présent' : (end ? fmt(end) : 'Présent');
  return s ? `${s} — ${e}` : e;
}

// ── Template 1: SNH Classique (navy sidebar + photo) ─────────────────────────
function buildClassicTemplate(data: CVData): string {
  const { profile, experiences, educations, skills, languages, aiSummary } = data;
  const summary = aiSummary || profile.summary || '';

  const techSkills = skills.filter(s => s.category === 'technical');
  const softSkills = skills.filter(s => s.category === 'soft' || s.category === 'other');
  const certSkills = skills.filter(s => s.category === 'certification');

  const photoSection = profile.photo_url
    ? `<div class="photo-wrap"><img src="${profile.photo_url}" alt="Photo" class="photo" crossorigin="anonymous" /></div>`
    : `<div class="photo-wrap photo-placeholder"><span>${profile.first_name[0]}${profile.last_name[0]}</span></div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>CV – ${profile.first_name} ${profile.last_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',Arial,sans-serif;font-size:10pt;color:#1e293b;background:#fff;}
    .page{display:flex;min-height:297mm;width:210mm;margin:0 auto;}
    @media print{
      body{margin:0;}
      .page{width:100%;min-height:100vh;}
      .no-print{display:none;}
    }
    /* Sidebar */
    .sidebar{width:68mm;background:#0f2d52;color:#fff;padding:0;display:flex;flex-direction:column;flex-shrink:0;}
    .photo-wrap{width:68mm;height:68mm;overflow:hidden;flex-shrink:0;}
    .photo{width:100%;height:100%;object-fit:cover;display:block;}
    .photo-placeholder{background:#1e4a7a;display:flex;align-items:center;justify-content:center;font-size:32pt;font-weight:700;color:#ffffff80;}
    .sidebar-body{padding:16px 14px;flex:1;}
    .sidebar h3{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#93c5fd;margin:14px 0 6px;border-bottom:1px solid #1e4a7a;padding-bottom:4px;}
    .sidebar h3:first-child{margin-top:0;}
    .contact-item{display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;font-size:8.5pt;color:#e2e8f0;line-height:1.4;}
    .contact-icon{width:14px;text-align:center;flex-shrink:0;margin-top:1px;opacity:.8;}
    .skill-item{margin-bottom:5px;}
    .skill-name{font-size:8.5pt;color:#e2e8f0;margin-bottom:2px;}
    .skill-bar{height:4px;background:#1e4a7a;border-radius:2px;overflow:hidden;}
    .skill-fill{height:100%;background:#60a5fa;border-radius:2px;}
    .skill-tag{display:inline-block;background:#1e4a7a;color:#bfdbfe;font-size:7.5pt;padding:2px 7px;border-radius:20px;margin:2px 2px 0 0;}
    .lang-item{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:8.5pt;color:#e2e8f0;}
    .lang-level{background:#1e4a7a;color:#93c5fd;font-size:7pt;padding:1px 6px;border-radius:10px;}
    /* Main */
    .main{flex:1;padding:28px 24px 20px;}
    .name-block{border-bottom:3px solid #0f2d52;padding-bottom:12px;margin-bottom:14px;}
    .name-block h1{font-size:22pt;font-weight:800;color:#0f2d52;line-height:1.1;letter-spacing:-0.5px;}
    .name-block .title{font-size:10.5pt;font-weight:600;color:#2563eb;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;}
    .mini-contacts{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;}
    .mini-contact{font-size:7.5pt;color:#64748b;display:flex;align-items:center;gap:4px;}
    .summary{font-size:9pt;color:#374151;line-height:1.6;margin-bottom:16px;padding:10px 12px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;}
    .section-title{font-size:10pt;font-weight:700;color:#0f2d52;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
    .section-title::after{content:'';flex:1;height:1.5px;background:#e2e8f0;}
    .section{margin-bottom:16px;}
    .exp-item{display:flex;gap:12px;margin-bottom:10px;}
    .exp-date{font-size:8pt;color:#64748b;min-width:60px;text-align:right;padding-top:2px;flex-shrink:0;}
    .exp-line{display:flex;flex-direction:column;align-items:center;gap:0;}
    .exp-dot{width:10px;height:10px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:3px;}
    .exp-connector{width:2px;flex:1;background:#e2e8f0;margin-top:2px;}
    .exp-body{flex:1;}
    .exp-company{font-size:10pt;font-weight:700;color:#0f2d52;}
    .exp-role{font-size:9pt;font-weight:500;color:#2563eb;margin-bottom:2px;}
    .exp-desc{font-size:8.5pt;color:#4b5563;line-height:1.5;margin-top:4px;}
    .exp-desc ul{margin-left:14px;}
    .exp-desc li{margin-bottom:2px;}
    .edu-item{display:flex;gap:12px;margin-bottom:8px;}
  </style>
</head>
<body>
<div class="page">
  <!-- Sidebar -->
  <div class="sidebar">
    ${photoSection}
    <div class="sidebar-body">
      <h3>Contact</h3>
      ${profile.phone ? `<div class="contact-item"><span class="contact-icon">📞</span><span>${profile.phone}</span></div>` : ''}
      ${profile.phone2 ? `<div class="contact-item"><span class="contact-icon">📱</span><span>${profile.phone2}</span></div>` : ''}
      <div class="contact-item"><span class="contact-icon">✉</span><span>${profile.email}</span></div>
      ${profile.location ? `<div class="contact-item"><span class="contact-icon">📍</span><span>${profile.location}${profile.region ? ', ' + profile.region : ''}</span></div>` : ''}
      ${profile.birth_date ? `<div class="contact-item"><span class="contact-icon">🗓</span><span>Né(e) le ${new Date(profile.birth_date).toLocaleDateString('fr-FR')}</span></div>` : ''}
      ${profile.gender ? `<div class="contact-item"><span class="contact-icon">👤</span><span>${profile.gender}</span></div>` : ''}
      ${profile.nationality ? `<div class="contact-item"><span class="contact-icon">🌍</span><span>${profile.nationality}</span></div>` : ''}
      ${profile.national_id ? `<div class="contact-item"><span class="contact-icon">🪪</span><span>CNI : ${profile.national_id}</span></div>` : ''}
      ${profile.linkedin_url ? `<div class="contact-item"><span class="contact-icon">🔗</span><span style="word-break:break-all;font-size:7.5pt">${profile.linkedin_url}</span></div>` : ''}

      ${techSkills.length > 0 ? `
      <h3>Compétences techniques</h3>
      ${techSkills.map(s => {
        const pct = s.level === 'expert' ? 100 : s.level === 'advanced' ? 80 : s.level === 'intermediate' ? 60 : 40;
        return `<div class="skill-item"><div class="skill-name">${s.name}</div><div class="skill-bar"><div class="skill-fill" style="width:${pct}%"></div></div></div>`;
      }).join('')}` : ''}

      ${softSkills.length > 0 ? `
      <h3>Savoir-être</h3>
      <div>${softSkills.map(s => `<span class="skill-tag">${s.name}</span>`).join('')}</div>` : ''}

      ${certSkills.length > 0 ? `
      <h3>Certifications</h3>
      <div>${certSkills.map(s => `<span class="skill-tag">${s.name}</span>`).join('')}</div>` : ''}

      ${languages.length > 0 ? `
      <h3>Langues</h3>
      ${languages.map(l => `<div class="lang-item"><span>${l.name}</span><span class="lang-level">${LANG_LEVEL_MAP[l.level] || l.level}</span></div>`).join('')}` : ''}

      ${profile.mobility ? `<h3>Mobilité</h3><div class="contact-item" style="margin:0"><span>${profile.mobility}</span></div>` : ''}
      ${profile.availability_date ? `<h3>Disponibilité</h3><div class="contact-item" style="margin:0"><span>${new Date(profile.availability_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span></div>` : ''}
    </div>
  </div>

  <!-- Main -->
  <div class="main">
    <div class="name-block">
      <h1>${profile.last_name.toUpperCase()} ${profile.first_name}</h1>
      ${profile.professional_title ? `<div class="title">${profile.professional_title}</div>` : ''}
      ${profile.desired_position ? `<div class="title" style="color:#64748b;font-size:9pt;margin-top:2px;text-transform:none;">${profile.desired_position}</div>` : ''}
      <div class="mini-contacts">
        ${profile.email ? `<span class="mini-contact">✉ ${profile.email}</span>` : ''}
        ${profile.phone ? `<span class="mini-contact">📞 ${profile.phone}</span>` : ''}
        ${profile.location ? `<span class="mini-contact">📍 ${profile.location}</span>` : ''}
      </div>
    </div>

    ${summary ? `<div class="summary">${summary.replace(/\n/g, '<br>')}</div>` : ''}

    ${experiences.length > 0 ? `
    <div class="section">
      <div class="section-title">Expérience Professionnelle</div>
      ${experiences.map((e, i) => `
      <div class="exp-item">
        <div class="exp-date">${formatDateRange(e.start_date, e.end_date, e.is_current)}</div>
        <div class="exp-line">
          <div class="exp-dot"></div>
          ${i < experiences.length - 1 ? '<div class="exp-connector"></div>' : ''}
        </div>
        <div class="exp-body">
          <div class="exp-company">${e.company}${e.location ? ' — ' + e.location : ''}</div>
          <div class="exp-role">${e.job_title}${e.contract_type ? ' (' + e.contract_type + ')' : ''}</div>
          ${e.description ? `<div class="exp-desc">${formatDescription(e.description)}</div>` : ''}
        </div>
      </div>`).join('')}
    </div>` : ''}

    ${educations.length > 0 ? `
    <div class="section">
      <div class="section-title">Formation Académique</div>
      ${educations.map((e, i) => `
      <div class="edu-item">
        <div class="exp-date">${e.end_date ? new Date(e.end_date).getFullYear() : (e.is_current ? 'En cours' : '')}</div>
        <div class="exp-line">
          <div class="exp-dot" style="background:#10b981"></div>
          ${i < educations.length - 1 ? '<div class="exp-connector"></div>' : ''}
        </div>
        <div class="exp-body">
          <div class="exp-company">${e.institution}${e.location ? ' — ' + e.location : ''}</div>
          <div class="exp-role" style="color:#10b981">${e.degree}${e.field_of_study ? ', ' + e.field_of_study : ''}</div>
          ${e.grade ? `<div style="font-size:8pt;color:#64748b">Mention : ${e.grade}</div>` : ''}
          ${e.description ? `<div class="exp-desc" style="font-size:8pt">${e.description}</div>` : ''}
        </div>
      </div>`).join('')}
    </div>` : ''}
  </div>
</div>
</body></html>`;
}

// ── Template 2: Moderne (clean, full-width, accent line) ─────────────────────
function buildModernTemplate(data: CVData): string {
  const { profile, experiences, educations, skills, languages, aiSummary } = data;
  const summary = aiSummary || profile.summary || '';
  const allSkills = skills.filter(s => s.category !== 'language');

  const photoSection = profile.photo_url
    ? `<img src="${profile.photo_url}" alt="Photo" class="photo" crossorigin="anonymous" />`
    : `<div class="photo-placeholder">${profile.first_name[0]}${profile.last_name[0]}</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>CV – ${profile.first_name} ${profile.last_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',Arial,sans-serif;font-size:10pt;color:#1e293b;background:#fff;}
    .page{width:210mm;margin:0 auto;padding:0;}
    @media print{body{margin:0;}.page{width:100%;}.no-print{display:none;}}
    .header{background:linear-gradient(135deg,#0f2d52 0%,#1e4a7a 100%);color:#fff;padding:28px 32px;display:flex;gap:22px;align-items:center;}
    .photo{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #60a5fa;flex-shrink:0;}
    .photo-placeholder{width:80px;height:80px;border-radius:50%;background:#1e4a7a;display:flex;align-items:center;justify-content:center;font-size:24pt;font-weight:700;color:#60a5fa;border:3px solid #60a5fa;flex-shrink:0;}
    .header-info{flex:1;}
    .header h1{font-size:20pt;font-weight:800;letter-spacing:-0.5px;line-height:1.1;}
    .header .title{font-size:11pt;color:#93c5fd;font-weight:600;margin-top:4px;}
    .header-contacts{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;}
    .hc{font-size:8.5pt;color:#cbd5e1;display:flex;align-items:center;gap:5px;}
    .body{display:flex;gap:0;}
    .col-left{width:68mm;padding:20px 16px;border-right:1px solid #e2e8f0;flex-shrink:0;}
    .col-right{flex:1;padding:20px 22px;}
    .sec-title{font-size:9pt;font-weight:700;color:#0f2d52;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #2563eb;}
    .sec{margin-bottom:18px;}
    .contact-item{display:flex;gap:7px;margin-bottom:5px;font-size:8.5pt;color:#374151;line-height:1.4;}
    .badge{display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:7.5pt;font-weight:500;padding:2px 8px;border-radius:20px;margin:2px 2px 0 0;border:1px solid #bfdbfe;}
    .skill-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
    .skill-name{font-size:8.5pt;color:#374151;}
    .dots{display:flex;gap:3px;}
    .dot{width:9px;height:9px;border-radius:50%;background:#bfdbfe;}
    .dot.filled{background:#2563eb;}
    .lang-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
    .lang-level{font-size:7.5pt;color:#64748b;}
    .exp-block{margin-bottom:14px;}
    .exp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
    .exp-company{font-size:10pt;font-weight:700;color:#0f2d52;}
    .exp-role{font-size:9pt;font-weight:600;color:#2563eb;margin-top:1px;}
    .exp-date{font-size:8pt;color:#94a3b8;white-space:nowrap;flex-shrink:0;margin-top:2px;}
    .exp-desc{font-size:8.5pt;color:#4b5563;line-height:1.55;margin-top:5px;}
    .exp-desc ul{margin-left:14px;}
    .exp-desc li{margin-bottom:2px;}
    .edu-block{margin-bottom:10px;}
    .edu-degree{font-size:9.5pt;font-weight:600;color:#0f2d52;}
    .edu-school{font-size:8.5pt;color:#64748b;margin-top:1px;}
    .edu-date{font-size:8pt;color:#94a3b8;}
    .summary{font-size:9pt;line-height:1.6;color:#374151;margin-bottom:16px;padding:10px 12px;background:#f1f5f9;border-radius:6px;border-left:3px solid #2563eb;}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    ${photoSection}
    <div class="header-info">
      <h1>${profile.last_name.toUpperCase()} ${profile.first_name}</h1>
      ${profile.professional_title ? `<div class="title">${profile.professional_title}</div>` : ''}
      <div class="header-contacts">
        ${profile.email ? `<span class="hc">✉ ${profile.email}</span>` : ''}
        ${profile.phone ? `<span class="hc">📞 ${profile.phone}</span>` : ''}
        ${profile.location ? `<span class="hc">📍 ${profile.location}</span>` : ''}
        ${profile.birth_date ? `<span class="hc">🗓 ${new Date(profile.birth_date).toLocaleDateString('fr-FR')}</span>` : ''}
        ${profile.nationality ? `<span class="hc">🌍 ${profile.nationality}</span>` : ''}
        ${profile.linkedin_url ? `<span class="hc">🔗 LinkedIn</span>` : ''}
      </div>
    </div>
  </div>

  <div class="body">
    <!-- Left column -->
    <div class="col-left">
      ${allSkills.length > 0 ? `
      <div class="sec">
        <div class="sec-title">Compétences</div>
        ${allSkills.map(s => {
          const filled = s.level === 'expert' ? 5 : s.level === 'advanced' ? 4 : s.level === 'intermediate' ? 3 : 2;
          return `<div class="skill-row">
            <span class="skill-name">${s.name}</span>
            <div class="dots">${[1,2,3,4,5].map(i => `<div class="dot ${i <= filled ? 'filled' : ''}"></div>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>` : ''}

      ${languages.length > 0 ? `
      <div class="sec">
        <div class="sec-title">Langues</div>
        ${languages.map(l => `<div class="lang-row"><span style="font-size:8.5pt;color:#374151">${l.name}</span><span class="lang-level">${LANG_LEVEL_MAP[l.level] || l.level}</span></div>`).join('')}
      </div>` : ''}

      ${profile.mobility || profile.availability_date ? `
      <div class="sec">
        <div class="sec-title">Informations</div>
        ${profile.mobility ? `<div class="contact-item"><span>🚗</span><span>Mobilité : ${profile.mobility}</span></div>` : ''}
        ${profile.availability_date ? `<div class="contact-item"><span>📅</span><span>Disponible : ${new Date(profile.availability_date).toLocaleDateString('fr-FR', {month:'long',year:'numeric'})}</span></div>` : ''}
        ${profile.gender ? `<div class="contact-item"><span>👤</span><span>${profile.gender}</span></div>` : ''}
        ${profile.national_id ? `<div class="contact-item"><span>🪪</span><span>CNI : ${profile.national_id}</span></div>` : ''}
      </div>` : ''}
    </div>

    <!-- Right column -->
    <div class="col-right">
      ${summary ? `<div class="summary">${summary.replace(/\n/g, '<br>')}</div>` : ''}

      ${experiences.length > 0 ? `
      <div class="sec">
        <div class="sec-title">Expérience Professionnelle</div>
        ${experiences.map(e => `
        <div class="exp-block">
          <div class="exp-head">
            <div><div class="exp-company">${e.company}</div><div class="exp-role">${e.job_title}</div></div>
            <div class="exp-date">${formatDateRange(e.start_date, e.end_date, e.is_current)}</div>
          </div>
          ${e.description ? `<div class="exp-desc">${formatDescription(e.description)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}

      ${educations.length > 0 ? `
      <div class="sec">
        <div class="sec-title">Formation</div>
        ${educations.map(e => `
        <div class="edu-block">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <div class="edu-degree">${e.degree}${e.field_of_study ? ' — ' + e.field_of_study : ''}</div>
            <div class="edu-date">${e.end_date ? new Date(e.end_date).getFullYear() : ''}</div>
          </div>
          <div class="edu-school">${e.institution}${e.location ? ', ' + e.location : ''}</div>
          ${e.grade ? `<div style="font-size:7.5pt;color:#64748b">Mention : ${e.grade}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}
    </div>
  </div>
</div>
</body></html>`;
}

function formatDescription(desc: string): string {
  const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return `<p>${desc}</p>`;
  return `<ul>${lines.map(l => `<li>${l.replace(/^[-•*]\s*/, '')}</li>`).join('')}</ul>`;
}

// ── Public API ────────────────────────────────────────────────────────────────
export function generateCV(data: CVData, template: CVTemplate = 'classic') {
  const html = template === 'classic' ? buildClassicTemplate(data) : buildModernTemplate(data);
  const win = window.open('', '_blank');
  if (!win) { alert('Activez les popups pour afficher le CV'); return; }
  win.document.open();
  win.document.write(html + `
    <div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:10px;z-index:999">
      <button onclick="window.print()" style="background:#0f2d52;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
        🖨 Imprimer / Enregistrer PDF
      </button>
      <button onclick="window.close()" style="background:#64748b;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:12px;cursor:pointer;">✕ Fermer</button>
    </div>
  `);
  win.document.close();
}
