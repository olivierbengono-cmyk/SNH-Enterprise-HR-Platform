import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'SNH - Perspectives : Workflow Recrutement & SIRH 2026-2027';
pptx.company = 'Societe Nationale des Hydrocarbures';

const C = {
  dark:    '0A2540',
  navy:    '0D2D4F',
  primary: '1B6CA8',
  accent:  '16A34A',
  gold:    'D97706',
  white:   'FFFFFF',
  gray:    '64748B',
  silver:  'F1F5F9',
  light:   'EFF6FF',
  mid:     'DBEAFE',
  slate:   '475569',
  green50: 'F0FDF4',
  green200:'BBF7D0',
};

const TOTAL = 4;

function bg(s, color) { s.background = { fill: color || C.white }; }

function footer(s, num) {
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.1, w: 13.33, h: 0.03, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('SNH - DRH  |  Perspectives 2026-2027  |  Confidentiel  |  ' + num + ' / ' + TOTAL,
    { x: 0.4, y: 7.15, w: 12.5, h: 0.28, fontSize: 8, color: C.gray, align: 'center' });
}

function sectionBar(s, label, color) {
  const c = color || C.gold;
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 0.22, w: 12.4, h: 0.07, fill: { color: c }, line: { color: c } });
  s.addText(label.toUpperCase(), { x: 0.45, y: 0.34, w: 12.4, h: 0.42, fontSize: 10, bold: true, color: c, charSpacing: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE P1 - Titre
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText('SNH', { x: 0.5, y: 0.42, w: 4, h: 0.72, fontSize: 34, bold: true, color: C.white });
  s.addText('Societe Nationale des Hydrocarbures', { x: 0.5, y: 1.12, w: 9, h: 0.36, fontSize: 11, color: 'A0C4E8', italic: true });
  s.addText('Perspectives\n& Prochaines Etapes', { x: 0.5, y: 1.95, w: 12, h: 1.85, fontSize: 40, bold: true, color: C.white, lineSpacingMultiple: 1.2 });
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.98, w: 7.0, h: 0.05, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText('A la suite des echanges du Directoire  -  DRH/DI/COM  |  Juillet 2026', { x: 0.5, y: 4.15, w: 12, h: 0.4, fontSize: 13, color: 'A0C4E8' });

  const items = [
    { n: '1', color: C.gold, t: 'Workflow de Recrutement', s: 'Module a deployer en priorite - processus complet de A a Z' },
    { n: '2', color: C.primary, t: 'SIRH SNH - Modules complementaires', s: 'Feuille de route digitalisation RH 2026-2027' },
  ];
  items.forEach((it, i) => {
    const y = 4.88 + i * 1.08;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 12.3, h: 0.88, fill: { color: C.navy }, line: { color: it.color, pt: 1 }, rectRadius: 0.08 });
    s.addShape(pptx.ShapeType.ellipse, { x: 0.68, y: y + 0.22, w: 0.44, h: 0.44, fill: { color: it.color }, line: { color: it.color } });
    s.addText(it.n, { x: 0.68, y: y + 0.22, w: 0.44, h: 0.44, fontSize: 11, bold: true, color: C.dark, align: 'center' });
    s.addText(it.t, { x: 1.26, y: y + 0.1, w: 11.3, h: 0.32, fontSize: 13, bold: true, color: C.white });
    s.addText(it.s, { x: 1.26, y: y + 0.44, w: 11.3, h: 0.28, fontSize: 10, color: it.color, italic: true });
  });
  footer(s, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE P2 - Workflow de Recrutement 10 etapes
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Workflow de Recrutement - Processus en 10 etapes (NS 193 / NS 571)', C.gold);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.45, y: 0.86, w: 12.4, h: 0.4, fill: { color: C.dark }, line: { color: C.dark }, rectRadius: 0.05 });
  s.addText('Depuis la Demande de Recrutement jusqu\'a la Titularisation - tracabilite complete, notifications automatiques, integration CVtheque', { x: 0.6, y: 0.88, w: 12.1, h: 0.36, fontSize: 9.5, italic: true, color: 'A0C4E8', align: 'center' });

  const stages = [
    { n: '01', label: 'Demande de\nrecrutement', color: C.primary, note: 'NS 193 / NS 571' },
    { n: '02', label: 'Preselection\nCV & dossiers', color: '3B82F6', note: 'Score IA CVtheque' },
    { n: '03', label: 'Tests\ntechniques', color: '8B5CF6', note: 'Evaluation competences' },
    { n: '04', label: 'Entretien\nRH / Jury', color: C.gold, note: 'Grille evaluation' },
    { n: '05', label: 'Tests\npsychotechniques', color: 'EC4899', note: 'Aptitudes & personnalite' },
    { n: '06', label: 'Visite\nmedicale', color: '06B6D4', note: 'Aptitude physique' },
    { n: '07', label: 'Enquete de\nmoralite', color: C.slate, note: 'Verification antecedents' },
    { n: '08', label: 'Authentification\ndiplomes', color: '0EA5E9', note: 'Verification originaux' },
    { n: '09', label: 'Periode\nd\'essai', color: C.accent, note: 'Integration progressive' },
    { n: '10', label: 'Titularisation', color: C.dark, note: 'Integration SIRH' },
  ];

  [stages.slice(0, 5), stages.slice(5, 10)].forEach((row, ri) => {
    const baseY = 1.38 + ri * 2.72;
    row.forEach((st, i) => {
      const x = 0.45 + i * 2.56;
      s.addShape(pptx.ShapeType.roundRect, { x, y: baseY, w: 2.4, h: 2.34, fill: { color: st.color }, line: { color: st.color }, rectRadius: 0.1 });
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.08, y: baseY + 0.08, w: 0.44, h: 0.28, fill: { color: '1A2A3A' }, line: { color: '2A3A4A' }, rectRadius: 0.04 });
      s.addText(st.n, { x: x + 0.08, y: baseY + 0.08, w: 0.44, h: 0.28, fontSize: 8.5, bold: true, color: C.white, align: 'center' });
      s.addText(st.label, { x: x + 0.1, y: baseY + 0.52, w: 2.2, h: 0.8, fontSize: 10, bold: true, color: C.white, align: 'center', wrap: true, lineSpacingMultiple: 1.15 });
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.14, y: baseY + 1.78, w: 2.12, h: 0.3, fill: { color: '1A2A3A' }, line: { color: '2A3A4A' }, rectRadius: 0.04 });
      s.addText(st.note, { x: x + 0.14, y: baseY + 1.78, w: 2.12, h: 0.3, fontSize: 7.5, color: 'D1D5DB', align: 'center', italic: true });
      if (i < row.length - 1) s.addText('->', { x: x + 2.32, y: baseY + 0.94, w: 0.32, h: 0.42, fontSize: 14, bold: true, color: C.gray, align: 'center' });
    });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.45, y: 6.28, w: 12.4, h: 0.62, fill: { color: C.dark }, line: { color: C.gold, pt: 1 }, rectRadius: 0.08 });
  const benefits = ['Tracabilite complete', 'Notifications candidat', 'Dashboard temps reel', 'Lie a la CVtheque', 'Demande NS-571 integree'];
  benefits.forEach((b, i) => {
    s.addText(b, { x: 0.6 + i * 2.48, y: 6.34, w: 2.3, h: 0.5, fontSize: 9, color: 'A0C4E8', align: 'center', bold: true });
  });
  footer(s, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE P3 - Modules SIRH
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Modules SIRH complementaires - Feuille de route digitalisation RH SNH', C.primary);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.45, y: 0.86, w: 12.4, h: 0.42, fill: { color: C.dark }, line: { color: C.dark }, rectRadius: 0.05 });
  s.addText('L\'infrastructure SIRH SNH est en cours de materialisation. Chaque module capitalise sur les donnees deja en base.', { x: 0.6, y: 0.88, w: 12.1, h: 0.38, fontSize: 9.5, italic: true, color: 'A0C4E8', align: 'center' });

  const modules = [
    { color: C.accent, status: 'OPERATIONNEL', statusBg: '14532D', t: 'Paie & Bulletins de Salaire', d: 'Generation bulletins, elements variables, cotisations sociales, parametres fiscaux. Export PDF.' },
    { color: C.accent, status: 'OPERATIONNEL', statusBg: '14532D', t: 'Performance & Evaluations', d: 'Entretiens annuels, objectifs OKR, competences metier, plans de developpement, feedback 360.' },
    { color: C.accent, status: 'OPERATIONNEL', statusBg: '14532D', t: 'QVCT & Bien-etre au Travail', d: 'Suivi QVCT, espaces de discussion RH, alertes, analyse IA des tendances bien-etre.' },
    { color: C.accent, status: 'OPERATIONNEL', statusBg: '14532D', t: 'Formation & Competences', d: 'Plans de formation, programmes par direction, matrice des competences, referentiel postes.' },
    { color: C.gold, status: 'EN COURS', statusBg: '431407', t: 'Presences & Conges', d: 'Suivi temps de travail, demandes de conge, validation manageur, soldes, notes de frais.' },
    { color: C.gold, status: 'EN COURS', statusBg: '431407', t: 'Workflow Recrutement', d: 'Processus 10 etapes depuis la demande de recrutement jusqu\'a la titularisation.' },
    { color: C.primary, status: 'PREVU 2027', statusBg: '1E3A5F', t: 'Organigramme & Annuaire', d: 'Organigramme interactif SNH, annuaire collaborateurs, fiche de poste dynamique.' },
    { color: C.primary, status: 'PREVU 2027', statusBg: '1E3A5F', t: 'Connexion ERP / Paie externe', d: 'Interfacage avec le systeme ERP paie existant SNH - synchronisation bidirectionnelle.' },
  ];

  modules.forEach((m, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.45 + col * 3.22;
    const y = 1.42 + row * 2.76;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.06, h: 2.58, fill: { color: C.silver }, line: { color: 'E2E8F0' }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 3.06, h: 0.06, fill: { color: m.color }, line: { color: m.color } });
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.52, y: y + 0.14, w: 2.02, h: 0.26, fill: { color: m.statusBg }, line: { color: m.color }, rectRadius: 0.04 });
    s.addText(m.status, { x: x + 0.52, y: y + 0.14, w: 2.02, h: 0.26, fontSize: 7.5, bold: true, color: m.color, align: 'center' });
    s.addText(m.t, { x: x + 0.1, y: y + 0.48, w: 2.86, h: 0.46, fontSize: 9.5, bold: true, color: C.dark, align: 'center', wrap: true });
    s.addText(m.d, { x: x + 0.1, y: y + 1.0, w: 2.86, h: 1.42, fontSize: 8.5, color: C.slate, wrap: true, lineSpacingMultiple: 1.2, align: 'center' });
  });
  footer(s, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE P4 - Vision & Roadmap
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('VISION & FEUILLE DE ROUTE', { x: 0.4, y: 0.32, w: 12.5, h: 0.3, fontSize: 9.5, bold: true, color: C.primary, charSpacing: 2 });
  s.addText('SIRH SNH - Roadmap 2026-2027', { x: 0.4, y: 0.7, w: 12.5, h: 0.64, fontSize: 24, bold: true, color: C.white });
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.46, w: 12.5, h: 0.04, fill: { color: C.primary }, line: { color: C.primary } });

  const milestones = [
    { date: 'Juil. 2026', label: 'Presentation\nDirectoire', color: C.gold, done: true },
    { date: 'Juil.-Aout 2026', label: 'Deploiement\nCVtheque & Portail', color: C.accent, done: true },
    { date: 'Sept.-Oct. 2026', label: 'Formation equipes\nDRH & Informatique', color: C.accent, done: false },
    { date: 'Oct.-Dec. 2026', label: 'Workflow\nRecrutement', color: C.gold, done: false },
    { date: '2027', label: 'SIRH complet\n& ERP Paie', color: C.primary, done: false },
  ];

  s.addShape(pptx.ShapeType.line, { x: 1.0, y: 2.76, w: 11.0, h: 0.001, line: { color: '1E4A7A', pt: 2 } });

  milestones.forEach((m, i) => {
    const x = 0.6 + i * 2.68;
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.46, y: 2.54, w: 0.44, h: 0.44, fill: { color: m.color }, line: { color: m.color } });
    s.addText(m.done ? 'V' : 'O', { x: x + 0.46, y: 2.54, w: 0.44, h: 0.44, fontSize: 11, bold: true, color: C.white, align: 'center' });
    s.addText(m.date, { x: x - 0.14, y: 3.08, w: 1.64, h: 0.28, fontSize: 8, bold: true, color: m.color, align: 'center' });
    s.addText(m.label, { x: x - 0.18, y: 3.4, w: 1.72, h: 0.56, fontSize: 9, color: C.white, align: 'center', wrap: true, lineSpacingMultiple: 1.2 });
  });

  const benefits2 = [
    {
      title: 'Pour la DRH', color: C.gold,
      items: ['Tableaux de bord RH complets et temps reel', 'Processus digitalises & tracables de bout en bout', 'Pilotage data-driven des effectifs et competences', 'Moins de saisie manuelle, plus de valeur ajoutee'],
    },
    {
      title: 'Pour les Managers', color: C.primary,
      items: ['Visibilite sur les candidatures de leur direction', 'Suivi des evaluations et performances de l\'equipe', 'Demandes de recrutement formalisees en ligne', 'Acces a l\'organigramme et a l\'annuaire interactif'],
    },
    {
      title: 'Pour la SNH', color: C.accent,
      items: ['Image employeur renforcee - attractivite des talents', 'Conformite reglementaire des donnees RH & candidats', 'Reduction des delais de recrutement', 'Capitalisation sur le SIRH existant - ROI optimal'],
    },
  ];

  benefits2.forEach((bl, i) => {
    const x = 0.4 + i * 4.3;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 4.18, w: 4.1, h: 2.72, fill: { color: C.navy }, line: { color: bl.color, pt: 1 }, rectRadius: 0.08 });
    s.addShape(pptx.ShapeType.rect, { x, y: 4.18, w: 4.1, h: 0.06, fill: { color: bl.color }, line: { color: bl.color } });
    s.addText(bl.title, { x: x + 0.14, y: 4.24, w: 3.82, h: 0.34, fontSize: 11, bold: true, color: bl.color });
    bl.items.forEach((it, j) => {
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.14, y: 4.74 + j * 0.48, w: 0.12, h: 0.12, fill: { color: bl.color }, line: { color: bl.color } });
      s.addText(it, { x: x + 0.34, y: 4.69 + j * 0.48, w: 3.62, h: 0.38, fontSize: 8.8, color: '94A3B8', wrap: true });
    });
  });
  footer(s, 4);
}

const filename = 'SNH_Perspectives_Workflow_SIRH_2026_2027.pptx';
await pptx.writeFile({ fileName: filename });
console.log('\n✅  Presentation Perspectives generee : ' + filename + '  (' + TOTAL + ' slides)\n');
