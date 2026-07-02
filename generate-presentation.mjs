import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'Portail de Recrutement SNH – Présentation Directoire';
pptx.subject = 'Système de Recrutement & CVthèque';
pptx.company = 'Société Nationale des Hydrocarbures';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  dark:    '0A2540',
  primary: '1B6CA8',
  accent:  '16A34A',
  light:   'E8F4FD',
  white:   'FFFFFF',
  gray:    '64748B',
  silver:  'F1F5F9',
  gold:    'D97706',
  red:     'DC2626',
};

// ── Master background helper ──────────────────────────────────────────────────
function bg(slide, color = C.white) {
  slide.background = { fill: color };
}

function addSlideFooter(slide, num, total) {
  slide.addText(`SNH – Présentation Directoire  |  Confidentiel  |  ${num} / ${total}`, {
    x: 0.4, y: 7.2, w: 12.5, h: 0.3,
    fontSize: 8, color: C.gray, align: 'center',
  });
  // Bottom bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.1, w: 13.33, h: 0.03,
    fill: { color: C.primary }, line: { color: C.primary },
  });
}

function sectionTitle(slide, text) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 0.25, w: 12.3, h: 0.08,
    fill: { color: C.primary }, line: { color: C.primary },
  });
  slide.addText(text.toUpperCase(), {
    x: 0.5, y: 0.38, w: 12.3, h: 0.45,
    fontSize: 10, bold: true, color: C.primary, charSpacing: 2,
  });
}

// ── SLIDE 1 – Titre ───────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);

  // Large accent bar left
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  // SNH logo text
  s.addText('SNH', {
    x: 0.5, y: 0.5, w: 3, h: 0.8,
    fontSize: 36, bold: true, color: C.white,
  });
  s.addText('Société Nationale des Hydrocarbures', {
    x: 0.5, y: 1.2, w: 7, h: 0.4,
    fontSize: 11, color: 'A0C4E8', italic: true,
  });

  // Main title
  s.addText('Portail de Recrutement\n& Espace CVthèque', {
    x: 0.5, y: 2.2, w: 12, h: 1.8,
    fontSize: 40, bold: true, color: C.white, lineSpacingMultiple: 1.2,
  });

  // Subtitle bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 4.15, w: 8, h: 0.06,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  s.addText('Présentation au Directoire  —  Solution SIRH Intégrée', {
    x: 0.5, y: 4.35, w: 10, h: 0.45,
    fontSize: 15, color: 'A0C4E8',
  });

  s.addText('Direction des Ressources Humaines  |  Juillet 2026', {
    x: 0.5, y: 5.0, w: 8, h: 0.35,
    fontSize: 11, color: C.gray,
  });

  // Tag pills
  const tags = ['Digitalisation RH', 'Recrutement Structuré', 'Traçabilité', 'Conformité'];
  tags.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5 + i * 2.8, y: 5.8, w: 2.5, h: 0.38,
      fill: { color: '1B3A5C' }, line: { color: C.primary },
      rectRadius: 0.06,
    });
    s.addText(t, {
      x: 0.5 + i * 2.8, y: 5.8, w: 2.5, h: 0.38,
      fontSize: 9, color: 'A0C4E8', align: 'center', valign: 'middle',
    });
  });
}

// ── SLIDE 2 – Sommaire ────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, 'Sommaire');

  s.addText('Plan de la Présentation', {
    x: 0.5, y: 0.95, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  const items = [
    ['01', 'Contexte & Enjeux', 'Pourquoi digitaliser le recrutement ?'],
    ['02', 'Architecture & Périmètre', 'Composantes du système'],
    ['03', 'Portail Candidat', 'Espace libre-service externe'],
    ['04', 'Espace Recrutement RH', 'Gestion interne des offres et dossiers'],
    ['05', 'CVthèque & Matching', 'Base de compétences et scoring IA'],
    ['06', 'Pipeline en 10 Étapes', 'Workflow de sélection structuré'],
    ['07', 'Tableaux de Bord & Rapports', 'Pilotage et indicateurs RH'],
    ['08', 'Sécurité & Conformité', 'Traçabilité et contrôle d\'accès'],
    ['09', 'Bénéfices & ROI', 'Gains opérationnels attendus'],
    ['10', 'Feuille de Route', 'Prochaines étapes'],
  ];

  items.forEach(([num, title, sub], i) => {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = col === 0 ? 0.4 : 6.7;
    const y = 1.7 + row * 1.0;

    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.55, h: 0.55,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText(num, {
      x, y, w: 0.55, h: 0.55,
      fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(title, {
      x: x + 0.65, y: y + 0.02, w: 5.3, h: 0.28,
      fontSize: 11, bold: true, color: C.dark,
    });
    s.addText(sub, {
      x: x + 0.65, y: y + 0.28, w: 5.3, h: 0.22,
      fontSize: 9, color: C.gray, italic: true,
    });
  });

  addSlideFooter(s, 2, 12);
}

// ── SLIDE 3 – Contexte & Enjeux ───────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '01 – Contexte & Enjeux');

  s.addText('Pourquoi Digitaliser le Recrutement à la SNH ?', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  // Left pain points
  s.addText('DÉFIS AVANT DIGITALISATION', {
    x: 0.5, y: 1.5, w: 5.8, h: 0.35,
    fontSize: 10, bold: true, color: C.red, charSpacing: 1.5,
  });

  const pains = [
    'Processus papier chronophage et non traçable',
    'Dossiers candidats dispersés dans plusieurs services',
    'Absence de scoring et de critères objectifs',
    'Aucune visibilité sur le pipeline de sélection',
    'Coordination difficile entre jury, DRH et directions',
    'Risque de perte ou falsification de documents',
  ];
  pains.forEach((p, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 1.95 + i * 0.62, w: 0.28, h: 0.28,
      fill: { color: 'FEE2E2' }, line: { color: C.red },
    });
    s.addText('✕', {
      x: 0.5, y: 1.95 + i * 0.62, w: 0.28, h: 0.28,
      fontSize: 9, bold: true, color: C.red, align: 'center', valign: 'middle',
    });
    s.addText(p, {
      x: 0.88, y: 1.97 + i * 0.62, w: 5.5, h: 0.28,
      fontSize: 10, color: C.dark,
    });
  });

  // Right gains
  s.addText('APPORTS DE LA SOLUTION', {
    x: 7.0, y: 1.5, w: 5.8, h: 0.35,
    fontSize: 10, bold: true, color: C.accent, charSpacing: 1.5,
  });

  const gains = [
    'Portail en ligne accessible 24h/24 aux candidats',
    'Dossier unique centralisé dans la CVthèque',
    'Scoring IA automatique (compétences + expérience)',
    'Pipeline visuel en temps réel avec statuts',
    'Rôles et permissions granulaires par profil',
    'Audit log complet et horodaté',
  ];
  gains.forEach((g, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: 7.0, y: 1.95 + i * 0.62, w: 0.28, h: 0.28,
      fill: { color: 'DCFCE7' }, line: { color: C.accent },
    });
    s.addText('✓', {
      x: 7.0, y: 1.95 + i * 0.62, w: 0.28, h: 0.28,
      fontSize: 9, bold: true, color: C.accent, align: 'center', valign: 'middle',
    });
    s.addText(g, {
      x: 7.38, y: 1.97 + i * 0.62, w: 5.5, h: 0.28,
      fontSize: 10, color: C.dark,
    });
  });

  // Separator
  s.addShape(pptx.ShapeType.line, {
    x: 6.66, y: 1.45, w: 0, h: 5.5,
    line: { color: 'E2E8F0', width: 1.5, dashType: 'dash' },
  });

  addSlideFooter(s, 3, 12);
}

// ── SLIDE 4 – Architecture ────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '02 – Architecture & Périmètre');

  s.addText('Composantes du Système de Recrutement SNH', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  // Three pillars
  const pillars = [
    {
      color: C.primary,
      icon: '🌐',
      title: 'Portail Candidat',
      sub: 'Interface Externe',
      items: ['Création de compte sécurisé', 'Dépôt de candidature en ligne', 'Suivi de dossier en temps réel', 'Gestion du profil & CV', 'Notifications automatiques'],
    },
    {
      color: C.accent,
      icon: '🏢',
      title: 'Espace RH',
      sub: 'Interface Interne',
      items: ['Gestion des offres d\'emploi', 'Demandes de recrutement', 'Évaluation jury', 'Suivi du pipeline', 'Génération de lettres'],
    },
    {
      color: C.gold,
      icon: '📊',
      title: 'CVthèque & BI',
      sub: 'Moteur de Données',
      items: ['Base candidats centralisée', 'Scoring & matching IA', 'Rapports statistiques', 'Historique des candidatures', 'Export & impression'],
    },
  ];

  pillars.forEach((p, i) => {
    const x = 0.5 + i * 4.2;
    // Header box
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.55, w: 3.9, h: 1.0,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.title, {
      x, y: 1.6, w: 3.9, h: 0.45,
      fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(p.sub, {
      x, y: 2.1, w: 3.9, h: 0.35,
      fontSize: 9, color: C.white, align: 'center', italic: true,
    });

    // Body box
    s.addShape(pptx.ShapeType.rect, {
      x, y: 2.55, w: 3.9, h: 3.5,
      fill: { color: C.silver }, line: { color: 'E2E8F0', width: 1 },
    });

    p.items.forEach((item, j) => {
      s.addShape(pptx.ShapeType.rect, {
        x: x + 0.15, y: 2.72 + j * 0.62, w: 0.22, h: 0.22,
        fill: { color: p.color }, line: { color: p.color },
      });
      s.addText(item, {
        x: x + 0.45, y: 2.7 + j * 0.62, w: 3.3, h: 0.28,
        fontSize: 9.5, color: C.dark,
      });
    });
  });

  // Bottom connector label
  s.addShape(pptx.ShapeType.rect, {
    x: 3.2, y: 6.3, w: 6.9, h: 0.4,
    fill: { color: C.dark }, line: { color: C.dark },
  });
  s.addText('Base de données Supabase PostgreSQL  —  Authentification JWT  —  Accès RLS sécurisé', {
    x: 3.2, y: 6.3, w: 6.9, h: 0.4,
    fontSize: 8.5, color: C.white, align: 'center', valign: 'middle',
  });

  addSlideFooter(s, 4, 12);
}

// ── SLIDE 5 – Portail Candidat ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '03 – Portail Candidat');

  s.addText('Espace Libre-Service pour les Candidats', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  // Feature cards
  const features = [
    {
      title: 'Inscription & Authentification',
      desc: 'Création de compte avec email vérifié. Connexion sécurisée. Changement de mot de passe obligatoire à la première connexion.',
      color: C.primary,
    },
    {
      title: 'Profil Professionnel Complet',
      desc: 'Titre de poste, localisation, coordonnées, LinkedIn, portfolio. Photo de profil. Compétences avec niveaux de maîtrise.',
      color: '0E7490',
    },
    {
      title: 'Curriculum Vitae Structuré',
      desc: 'Formations (diplôme, établissement, filière). Expériences professionnelles avec dates. Langues et certifications.',
      color: C.accent,
    },
    {
      title: 'Candidature en Ligne',
      desc: 'Consultation des offres publiées. Dépôt de candidature en quelques clics. Lettre de motivation intégrée.',
      color: C.gold,
    },
    {
      title: 'Gestion des Documents',
      desc: 'Upload des pièces (CV, diplômes, certificats). Suivi des dates d\'expiration. Documents sécurisés dans le cloud.',
      color: '7C3AED',
    },
    {
      title: 'Suivi en Temps Réel',
      desc: 'Tableau de bord candidat. Statut de la candidature à chaque étape du pipeline. Notifications par email.',
      color: 'DB2777',
    },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.25;
    const y = 1.55 + row * 2.6;

    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 3.9, h: 0.42,
      fill: { color: f.color }, line: { color: f.color },
    });
    s.addText(f.title, {
      x: x + 0.1, y, w: 3.7, h: 0.42,
      fontSize: 10, bold: true, color: C.white, valign: 'middle',
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: y + 0.42, w: 3.9, h: 1.95,
      fill: { color: C.silver }, line: { color: 'E2E8F0' },
    });
    s.addText(f.desc, {
      x: x + 0.12, y: y + 0.52, w: 3.65, h: 1.78,
      fontSize: 9.5, color: C.dark, lineSpacingMultiple: 1.3,
    });
  });

  addSlideFooter(s, 5, 12);
}

// ── SLIDE 6 – Espace Recrutement RH ──────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '04 – Espace Recrutement RH');

  s.addText('Gestion Interne des Offres et des Dossiers', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  // Left panel — workflow
  s.addText('WORKFLOW DEMANDE DE RECRUTEMENT', {
    x: 0.5, y: 1.5, w: 5.8, h: 0.35,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const workflow = [
    ['Responsable de service', 'Saisit la demande (poste, motif, budget)', C.gray],
    ['Validation DRH', 'Examine et valide ou rejette', C.primary],
    ['Publication offre', 'Mise en ligne sur le portail candidats', C.accent],
    ['Collecte candidatures', 'Réception & tri automatique', C.gold],
    ['Processus jury', 'Évaluation structurée multi-étapes', '7C3AED'],
    ['Décision finale', 'Titularisation ou rejet motivé', C.dark],
  ];

  workflow.forEach(([role, action, color], i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 1.95 + i * 0.78, w: 0.35, h: 0.35,
      fill: { color }, line: { color },
    });
    s.addText(`${i + 1}`, {
      x: 0.5, y: 1.95 + i * 0.78, w: 0.35, h: 0.35,
      fontSize: 10, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(role, {
      x: 0.95, y: 1.96 + i * 0.78, w: 5.3, h: 0.2,
      fontSize: 9, bold: true, color: C.dark,
    });
    s.addText(action, {
      x: 0.95, y: 2.15 + i * 0.78, w: 5.3, h: 0.2,
      fontSize: 8.5, color: C.gray, italic: true,
    });
    if (i < 5) {
      s.addShape(pptx.ShapeType.line, {
        x: 0.67, y: 2.3 + i * 0.78, w: 0, h: 0.43,
        line: { color: 'CBD5E1', width: 1.5 },
      });
    }
  });

  // Right panel — roles
  s.addText('RÔLES & PERMISSIONS', {
    x: 7.0, y: 1.5, w: 5.8, h: 0.35,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const roles = [
    { role: 'Administrateur DRH', perms: ['Accès total', 'Gestion utilisateurs', 'Paramétrage système'] },
    { role: 'Responsable Recrutement', perms: ['Gestion offres', 'Validation demandes', 'Rapports'] },
    { role: 'Responsable Carrière', perms: ['Suivi pipeline', 'Gestion CVthèque', 'Matching'] },
    { role: 'Manager d\'équipe', perms: ['Demandes recrutement', 'Vue équipe'] },
  ];

  roles.forEach((r, i) => {
    const y = 1.95 + i * 1.28;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 7.0, y, w: 5.8, h: 1.18,
      fill: { color: C.silver }, line: { color: 'E2E8F0' }, rectRadius: 0.05,
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 7.0, y, w: 0.08, h: 1.18,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText(r.role, {
      x: 7.18, y: y + 0.05, w: 5.5, h: 0.3,
      fontSize: 10, bold: true, color: C.dark,
    });
    r.perms.forEach((p, j) => {
      s.addText(`• ${p}`, {
        x: 7.18, y: y + 0.38 + j * 0.25, w: 5.5, h: 0.25,
        fontSize: 9, color: C.gray,
      });
    });
  });

  addSlideFooter(s, 6, 12);
}

// ── SLIDE 7 – CVthèque ────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '05 – CVthèque & Matching IA');

  s.addText('Base de Compétences et Scoring Automatique', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  // Scoring diagram
  s.addText('ALGORITHME DE SCORING', {
    x: 0.5, y: 1.5, w: 5.8, h: 0.35,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const scores = [
    ['Score Global', 100, C.primary, 85],
    ['Match Compétences', 40, C.accent, 36],
    ['Match Expérience', 30, C.gold, 24],
    ['Match Diplôme', 20, '7C3AED', 14],
    ['Bonus Recommandation', 10, 'DB2777', 7],
  ];

  scores.forEach(([label, max, color, example], i) => {
    const y = 2.0 + i * 0.88;
    s.addText(label, {
      x: 0.5, y, w: 3.2, h: 0.3,
      fontSize: 9.5, bold: i === 0, color: C.dark,
    });
    s.addText(`/${max} pts`, {
      x: 3.7, y, w: 0.9, h: 0.3,
      fontSize: 8.5, color: C.gray, italic: true,
    });
    // Bar track
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: y + 0.3, w: 4.5, h: 0.3,
      fill: { color: 'E2E8F0' }, line: { color: 'E2E8F0' },
    });
    // Bar fill
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: y + 0.3, w: 4.5 * (example / max), h: 0.3,
      fill: { color }, line: { color },
    });
    s.addText(`Exemple: ${example}`, {
      x: 5.1, y: y + 0.3, w: 1.2, h: 0.3,
      fontSize: 8, color, bold: true,
    });
  });

  // Right: CVthèque features
  s.addText('FONCTIONNALITÉS CVthèque', {
    x: 7.0, y: 1.5, w: 5.8, h: 0.35,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const cvItems = [
    ['Profils candidats enrichis', 'Photo, compétences, langues, certifications'],
    ['Historique multi-candidatures', 'Toutes les postulations d\'un même candidat'],
    ['Filtres avancés', 'Par offre, phase, score, statut, date'],
    ['Matching automatique', 'Correspondance poste ↔ profil en temps réel'],
    ['Gestion des documents', 'CV, diplômes, casier, visite médicale'],
    ['Pipeline candidats', 'Vue kanban des 10 phases de sélection'],
    ['Export & rapports', '6 modèles de rapports imprimables'],
    ['Archivage sécurisé', 'Conformité RGPD, logs d\'accès'],
  ];

  cvItems.forEach(([title, desc], i) => {
    const y = 2.0 + i * 0.62;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 7.0, y, w: 5.8, h: 0.52,
      fill: { color: i % 2 === 0 ? C.silver : C.white }, line: { color: 'E2E8F0' },
      rectRadius: 0.04,
    });
    s.addText(title, {
      x: 7.15, y: y + 0.03, w: 5.5, h: 0.24,
      fontSize: 9.5, bold: true, color: C.primary,
    });
    s.addText(desc, {
      x: 7.15, y: y + 0.27, w: 5.5, h: 0.22,
      fontSize: 8.5, color: C.gray,
    });
  });

  addSlideFooter(s, 7, 12);
}

// ── SLIDE 8 – Pipeline 10 étapes ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '06 – Pipeline de Recrutement en 10 Étapes');

  s.addText('Workflow de Sélection Structuré & Traçable', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  const steps = [
    { n: '01', label: 'Candidature', color: '3B82F6', desc: 'Dépôt en ligne' },
    { n: '02', label: 'Tests Tech.', color: '8B5CF6', desc: 'Épreuves techniques' },
    { n: '03', label: 'Entretien', color: '0EA5E9', desc: 'Entretien RH/jury' },
    { n: '04', label: 'Tests Psy.', color: 'F59E0B', desc: 'Évaluation psycho' },
    { n: '05', label: 'Visite Méd.', color: '10B981', desc: 'Aptitude médicale' },
    { n: '06', label: 'Moralité', color: 'EC4899', desc: 'Enquête casier' },
    { n: '07', label: 'Diplômes', color: '6366F1', desc: 'Authentification' },
    { n: '08', label: 'Essai', color: 'F97316', desc: 'Période d\'essai' },
    { n: '09', label: 'Affectation', color: '14B8A6', desc: 'Prise de poste' },
    { n: '10', label: 'Titularisé(e)', color: C.accent, desc: 'Intégration finale' },
  ];

  steps.forEach((step, i) => {
    const x = 0.4 + i * 1.25;
    // Circle
    s.addShape(pptx.ShapeType.ellipse, {
      x, y: 1.7, w: 0.95, h: 0.95,
      fill: { color: step.color }, line: { color: step.color },
    });
    s.addText(step.n, {
      x, y: 1.7, w: 0.95, h: 0.95,
      fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    // Connector arrow
    if (i < 9) {
      s.addShape(pptx.ShapeType.line, {
        x: x + 0.97, y: 2.12, w: 0.26, h: 0,
        line: { color: 'CBD5E1', width: 1.5 },
      });
    }
    s.addText(step.label, {
      x: x - 0.15, y: 2.72, w: 1.25, h: 0.3,
      fontSize: 8, bold: true, color: C.dark, align: 'center',
    });
    s.addText(step.desc, {
      x: x - 0.15, y: 3.0, w: 1.25, h: 0.25,
      fontSize: 7.5, color: C.gray, align: 'center', italic: true,
    });
  });

  // Status badges explanation
  s.addText('STATUTS DISPONIBLES À CHAQUE ÉTAPE', {
    x: 0.5, y: 3.55, w: 12, h: 0.3,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const statuses = [
    ['En cours', '3B82F6', 'Actif dans cette phase'],
    ['Validé', C.accent, 'Passage à la phase suivante'],
    ['Refusé(e)', C.red, 'Éliminé du processus'],
    ['En attente', C.gold, 'Décision en cours'],
    ['Différé', '6366F1', 'Report de l\'évaluation'],
    ['Non présenté', C.gray, 'Absent à l\'épreuve'],
  ];

  statuses.forEach((st, i) => {
    const x = 0.4 + i * 2.15;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 3.95, w: 2.0, h: 0.38,
      fill: { color: st[1] }, line: { color: st[1] }, rectRadius: 0.06,
    });
    s.addText(st[0], {
      x, y: 3.95, w: 2.0, h: 0.38,
      fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(st[2], {
      x, y: 4.38, w: 2.0, h: 0.28,
      fontSize: 7.5, color: C.gray, align: 'center', italic: true,
    });
  });

  // Évaluation jury
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 4.85, w: 12.5, h: 1.7,
    fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE' },
  });
  s.addText('ÉVALUATION JURY — FORMULAIRE STRUCTURÉ', {
    x: 0.6, y: 4.95, w: 12, h: 0.3,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1,
  });

  const juryFields = [
    'Aptitudes techniques',
    'Comportement & soft skills',
    'Expression orale',
    'Motivation & projet pro.',
    'Score jury (0-100)',
    'Avis : Admis / Refusé / Liste d\'attente',
    'Commentaire libre du jury',
  ];

  juryFields.forEach((f, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    s.addText(`• ${f}`, {
      x: 0.6 + col * 3.1, y: 5.32 + row * 0.28, w: 2.95, h: 0.28,
      fontSize: 8.5, color: C.dark,
    });
  });

  addSlideFooter(s, 8, 12);
}

// ── SLIDE 9 – Tableaux de Bord ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '07 – Tableaux de Bord & Rapports');

  s.addText('Pilotage du Recrutement en Temps Réel', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  // KPI boxes
  const kpis = [
    { val: '70+', label: 'Candidatures reçues', color: C.primary },
    { val: '27+', label: 'Candidats uniques', color: C.accent },
    { val: '62', label: 'En cours de traitement', color: C.gold },
    { val: '10', label: 'Offres actives', color: '7C3AED' },
  ];

  kpis.forEach((k, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.55, w: 2.85, h: 1.1,
      fill: { color: k.color }, line: { color: k.color },
    });
    s.addText(k.val, {
      x, y: 1.6, w: 2.85, h: 0.65,
      fontSize: 32, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(k.label, {
      x, y: 2.25, w: 2.85, h: 0.35,
      fontSize: 8.5, color: C.white, align: 'center',
    });
  });

  // Reports section
  s.addText('6 MODÈLES DE RAPPORTS DISPONIBLES', {
    x: 0.5, y: 2.85, w: 12, h: 0.35,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const reports = [
    {
      title: 'Récapitulatif des candidatures',
      desc: 'Vue globale de toutes les candidatures sur une période donnée avec répartition par statut et par offre.',
    },
    {
      title: 'Candidatures par type',
      desc: 'Analyse comparative entre candidatures spontanées, sur offre, internes et externes.',
    },
    {
      title: 'Rapport d\'une offre précise',
      desc: 'Détail complet d\'une offre : nombre de postulants, taux de passage par phase, score moyen.',
    },
    {
      title: 'Liste des candidats par phase',
      desc: 'Extraction des candidats pour une offre et une étape précise du pipeline de sélection.',
    },
    {
      title: 'Fiche de synthèse recrue',
      desc: 'Document complet du candidat retenu : profil, scores, évaluations jury et décisions.',
    },
    {
      title: 'Lettre d\'engagement',
      desc: 'Génération automatique de la lettre d\'engagement personnalisée avec les données du candidat.',
    },
  ];

  reports.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.25;
    const y = 3.35 + row * 1.72;

    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 3.9, h: 0.36,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText(`R${i + 1}  ${r.title}`, {
      x: x + 0.08, y, w: 3.7, h: 0.36,
      fontSize: 9, bold: true, color: C.white, valign: 'middle',
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: y + 0.36, w: 3.9, h: 1.25,
      fill: { color: C.silver }, line: { color: 'E2E8F0' },
    });
    s.addText(r.desc, {
      x: x + 0.1, y: y + 0.46, w: 3.7, h: 1.05,
      fontSize: 9, color: C.dark, lineSpacingMultiple: 1.3,
    });
  });

  addSlideFooter(s, 9, 12);
}

// ── SLIDE 10 – Sécurité ───────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '08 – Sécurité & Conformité');

  s.addText('Traçabilité Complète et Contrôle d\'Accès Granulaire', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  const secItems = [
    {
      title: 'Authentification Sécurisée',
      color: C.primary,
      items: [
        'JWT (JSON Web Tokens) avec expiration',
        'Sessions Supabase Auth',
        'Changement de mot de passe obligatoire à la 1ère connexion',
        'Déconnexion automatique en cas d\'inactivité',
      ],
    },
    {
      title: 'Row Level Security (RLS)',
      color: C.accent,
      items: [
        'Chaque rôle ne voit que ses données autorisées',
        '4 politiques CRUD distinctes par table',
        'Isolation des données entre entités',
        'Candidats : accès à leurs seuls dossiers',
      ],
    },
    {
      title: 'Audit Log & Traçabilité',
      color: C.gold,
      items: [
        'Horodatage de chaque action (création, modification, suppression)',
        'Journalisation des connexions et tentatives échouées',
        'Adresse IP locale enregistrée',
        'Conservation des événements de sécurité',
      ],
    },
    {
      title: 'Stockage Documents Sécurisé',
      color: '7C3AED',
      items: [
        'Supabase Storage avec buckets dédiés',
        'Signed URLs à durée limitée pour accès temporaire',
        'Politique d\'accès par ownership',
        'Séparation des buckets candidats / employés',
      ],
    },
  ];

  secItems.forEach((sec, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 6.45;
    const y = 1.55 + row * 2.6;

    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 6.0, h: 0.45,
      fill: { color: sec.color }, line: { color: sec.color },
    });
    s.addText(sec.title, {
      x: x + 0.12, y, w: 5.8, h: 0.45,
      fontSize: 11, bold: true, color: C.white, valign: 'middle',
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: y + 0.45, w: 6.0, h: 2.05,
      fill: { color: C.silver }, line: { color: 'E2E8F0' },
    });
    sec.items.forEach((item, j) => {
      s.addText(`•  ${item}`, {
        x: x + 0.2, y: y + 0.56 + j * 0.46, w: 5.6, h: 0.38,
        fontSize: 9.5, color: C.dark,
      });
    });
  });

  addSlideFooter(s, 10, 12);
}

// ── SLIDE 11 – Bénéfices & ROI ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionTitle(s, '09 – Bénéfices & ROI');

  s.addText('Gains Opérationnels Attendus', {
    x: 0.5, y: 0.75, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.dark,
  });

  const benefits = [
    { pct: '−70%', label: 'Temps de traitement\ndes dossiers', color: C.accent },
    { pct: '−85%', label: 'Risque d\'erreur\net de perte', color: C.primary },
    { pct: '3×', label: 'Rapidité du\npipeline', color: C.gold },
    { pct: '100%', label: 'Traçabilité\ndes décisions', color: '7C3AED' },
  ];

  benefits.forEach((b, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pptx.ShapeType.ellipse, {
      x, y: 1.5, w: 2.85, h: 2.85,
      fill: { color: b.color }, line: { color: b.color },
    });
    s.addText(b.pct, {
      x, y: 1.6, w: 2.85, h: 1.5,
      fontSize: 34, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(b.label, {
      x, y: 3.1, w: 2.85, h: 0.65,
      fontSize: 9, color: C.white, align: 'center', lineSpacingMultiple: 1.3,
    });
  });

  // Operational gains
  s.addText('BÉNÉFICES DÉTAILLÉS PAR DIMENSION', {
    x: 0.5, y: 4.6, w: 12, h: 0.3,
    fontSize: 9, bold: true, color: C.primary, charSpacing: 1.5,
  });

  const dims = [
    ['Efficacité opérationnelle', 'Processus entièrement dématérialisé, validation en quelques clics, zéro document papier en circulation.'],
    ['Qualité des recrutements', 'Scoring objectif basé sur les compétences réelles, réduction des biais de sélection, critères uniformes.'],
    ['Expérience candidat', 'Portail moderne et intuitif, communication transparente, suivi en temps réel — image employeur renforcée.'],
    ['Conformité réglementaire', 'Traçabilité totale, droits d\'accès documentés, archivage sécurisé conforme aux exigences légales.'],
  ];

  dims.forEach((d, i) => {
    const x = 0.4 + (i % 2) * 6.45;
    const y = 5.0 + Math.floor(i / 2) * 0.72;
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.06, h: 0.55,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText(d[0], {
      x: x + 0.16, y: y + 0.02, w: 5.8, h: 0.22,
      fontSize: 9.5, bold: true, color: C.dark,
    });
    s.addText(d[1], {
      x: x + 0.16, y: y + 0.26, w: 5.8, h: 0.25,
      fontSize: 8.5, color: C.gray,
    });
  });

  addSlideFooter(s, 11, 12);
}

// ── SLIDE 12 – Conclusion / Feuille de Route ──────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);

  // Left bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  sectionTitle(s, '10 – Feuille de Route & Conclusion');

  s.addText('Prochaines Étapes', {
    x: 0.5, y: 0.85, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.white,
  });

  const roadmap = [
    { phase: 'Phase 1', label: 'Déploiement & Formation', date: 'Juillet 2026', items: ['Formation des équipes RH', 'Activation du portail candidat', 'Migration des dossiers existants'], color: C.accent },
    { phase: 'Phase 2', label: 'Optimisation', date: 'T3 2026', items: ['Retours utilisateurs & ajustements', 'Enrichissement du référentiel compétences', 'Automatisation des notifications email'], color: C.primary },
    { phase: 'Phase 3', label: 'Extension IA', date: 'T4 2026', items: ['IA de suggestion de candidats', 'Prédiction de fit culturel', 'Rapport BI avancé'], color: C.gold },
  ];

  roadmap.forEach((r, i) => {
    const x = 0.4 + i * 4.2;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.65, w: 3.9, h: 0.42,
      fill: { color: r.color }, line: { color: r.color },
    });
    s.addText(`${r.phase}  —  ${r.date}`, {
      x: x + 0.1, y: 1.65, w: 3.7, h: 0.22,
      fontSize: 8, bold: true, color: C.white, valign: 'bottom',
    });
    s.addText(r.label, {
      x: x + 0.1, y: 1.87, w: 3.7, h: 0.2,
      fontSize: 9.5, bold: true, color: C.white,
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: 2.07, w: 3.9, h: 2.1,
      fill: { color: '1B3A5C' }, line: { color: '2D5A8E' },
    });
    r.items.forEach((item, j) => {
      s.addText(`→  ${item}`, {
        x: x + 0.15, y: 2.18 + j * 0.62, w: 3.6, h: 0.52,
        fontSize: 9, color: 'A0C4E8', lineSpacingMultiple: 1.25,
      });
    });
  });

  // Final message
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 4.45, w: 12.5, h: 1.75,
    fill: { color: '0F172A' }, line: { color: C.primary, width: 1.5 },
  });
  s.addText('En Conclusion', {
    x: 0.7, y: 4.58, w: 12, h: 0.35,
    fontSize: 12, bold: true, color: C.accent,
  });
  s.addText(
    'Le Portail de Recrutement et l\'Espace CVthèque de la SNH constituent une avancée majeure dans la transformation digitale RH. '
    + 'Ils offrent un cadre structuré, transparent et sécurisé pour attirer, évaluer et intégrer les meilleurs talents, '
    + 'tout en garantissant la conformité aux exigences réglementaires et la cohérence avec la stratégie de développement de l\'entreprise.',
    {
      x: 0.7, y: 5.0, w: 12, h: 1.05,
      fontSize: 10.5, color: 'CBD5E1', lineSpacingMultiple: 1.45,
    }
  );

  // CTA
  s.addShape(pptx.ShapeType.roundRect, {
    x: 4.4, y: 6.3, w: 4.5, h: 0.55,
    fill: { color: C.accent }, line: { color: C.accent }, rectRadius: 0.06,
  });
  s.addText('Direction des Ressources Humaines  —  SNH  |  Juillet 2026', {
    x: 4.4, y: 6.3, w: 4.5, h: 0.55,
    fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle',
  });
}

// ── Write file ─────────────────────────────────────────────────────────────────
await pptx.writeFile({ fileName: 'Presentation_Portail_Recrutement_SNH.pptx' });
console.log('Fichier généré : Presentation_Portail_Recrutement_SNH.pptx');
