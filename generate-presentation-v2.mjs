import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'Portail de Recrutement SNH – Note 641 DRH/DI/COM';
pptx.subject = 'CVthèque & Module Recrutement';
pptx.company = 'Société Nationale des Hydrocarbures';

const C = {
  dark:    '0A2540',
  primary: '1B6CA8',
  accent:  '16A34A',
  gold:    'D97706',
  red:     'B91C1C',
  white:   'FFFFFF',
  gray:    '64748B',
  silver:  'F1F5F9',
  lightBlue: 'EFF6FF',
  midBlue: 'DBEAFE',
};

const TOTAL = 8;

function bg(slide, color = C.white) {
  slide.background = { fill: color };
}

function footer(slide, num) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.1, w: 13.33, h: 0.03,
    fill: { color: C.primary }, line: { color: C.primary },
  });
  slide.addText(
    `SNH — DRH/DI/COM  |  Note 641 du 19 juin 2026  |  Confidentiel  |  ${num} / ${TOTAL}`,
    { x: 0.4, y: 7.15, w: 12.5, h: 0.28, fontSize: 8, color: C.gray, align: 'center' }
  );
}

function sectionBar(slide, label) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 0.22, w: 12.4, h: 0.07,
    fill: { color: C.primary }, line: { color: C.primary },
  });
  slide.addText(label.toUpperCase(), {
    x: 0.45, y: 0.34, w: 12.4, h: 0.42,
    fontSize: 10, bold: true, color: C.primary, charSpacing: 2,
  });
}

function pill(slide, text, x, y, w, fillColor, textColor = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.36, fill: { color: fillColor },
    line: { color: fillColor }, rectRadius: 0.05,
  });
  slide.addText(text, {
    x, y, w, h: 0.36, fontSize: 10, bold: true,
    color: textColor, align: 'center',
  });
}

function iconBox(slide, icon, label, x, y, w = 3.8) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 1.3, fill: { color: C.lightBlue },
    line: { color: C.midBlue, pt: 1 }, rectRadius: 0.08,
  });
  slide.addText(icon, { x, y: y + 0.08, w, h: 0.55, fontSize: 26, align: 'center' });
  slide.addText(label, {
    x, y: y + 0.62, w, h: 0.6, fontSize: 9.5, bold: true,
    color: C.dark, align: 'center', wrap: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Titre
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  s.addText('SNH', {
    x: 0.5, y: 0.45, w: 3, h: 0.75,
    fontSize: 34, bold: true, color: C.white,
  });
  s.addText('Société Nationale des Hydrocarbures', {
    x: 0.5, y: 1.15, w: 8, h: 0.38,
    fontSize: 11, color: 'A0C4E8', italic: true,
  });

  s.addText('Portail de Recrutement\n& CVthèque', {
    x: 0.5, y: 2.0, w: 12, h: 1.7,
    fontSize: 38, bold: true, color: C.white, lineSpacingMultiple: 1.25,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.9, w: 7.5, h: 0.05,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  s.addText('Concertation DRH / DI / COM  —  Suite note 641 DRH/DI/COM du 19 juin 2026', {
    x: 0.5, y: 4.1, w: 12, h: 0.42,
    fontSize: 13, color: 'A0C4E8',
  });
  s.addText('Direction des Ressources Humaines  |  Juillet 2026', {
    x: 0.5, y: 4.65, w: 8, h: 0.35,
    fontSize: 10.5, color: C.gray,
  });

  const pills = [
    { t: 'Digitalisation RH', c: '1B3A5C' },
    { t: 'Recrutement Structuré', c: '1B3A5C' },
    { t: 'Expérience Tradex', c: '1A4731' },
    { t: 'SIRH Intégré', c: '7C2D12' },
  ];
  pills.forEach(({ t, c }, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5 + i * 3.0, y: 5.65, w: 2.7, h: 0.36,
      fill: { color: c }, line: { color: c }, rectRadius: 0.06,
    });
    s.addText(t, {
      x: 0.5 + i * 3.0, y: 5.65, w: 2.7, h: 0.36,
      fontSize: 9.5, bold: true, color: C.white, align: 'center',
    });
  });

  footer(s, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Contexte & Origine
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Contexte & Origine de la démarche');

  // Timeline vertical
  const events = [
    {
      date: '02 avril 2026',
      icon: '📋',
      title: 'Instruction de Madame le Conseiller N°2',
      body: 'Au terme de la réunion de coordination, instruction est donnée pour la tenue d\'une concertation tripartite DRH / Division de la Communication (COM) / Division Informatique (DI) en vue de la mise en place d\'un portail de recrutement et d\'une CVthèque.',
      color: C.primary,
    },
    {
      date: 'Mai – Juin 2026',
      icon: '🏭',
      title: 'Descente conjointe chez Tradex',
      body: 'Visite d\'étude auprès de Tradex — filiale SNH déjà dotée d\'une CVthèque opérationnelle. Recueil des bonnes pratiques, contraintes rencontrées et enseignements tirés. Compte rendu consigné dans la note 641 DRH/DI/COM du 19 juin 2026.',
      color: C.gold,
    },
    {
      date: '19 juin 2026',
      icon: '📄',
      title: 'Note 641 DRH/DI/COM',
      body: 'Formalisation des conclusions de la concertation et des orientations retenues : mise en place d\'un portail candidat public, d\'une CVthèque intégrée au SIRH SNH et d\'un module de gestion du workflow de recrutement.',
      color: C.accent,
    },
    {
      date: 'Juillet 2026',
      icon: '🚀',
      title: 'Présentation du livrable',
      body: 'Démonstration du portail opérationnel développé sur la plateforme BOLT, intégrant les trois composantes : espace candidat, CVthèque et module recrutement.',
      color: C.red,
    },
  ];

  events.forEach((ev, i) => {
    const y = 1.0 + i * 1.45;

    // Connector line
    if (i < events.length - 1) {
      s.addShape(pptx.ShapeType.line, {
        x: 1.22, y: y + 0.65, w: 0.001, h: 0.82,
        line: { color: 'CBD5E1', pt: 1.5, dashType: 'dash' },
      });
    }

    // Circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: 1.0, y: y + 0.08, w: 0.44, h: 0.44,
      fill: { color: ev.color }, line: { color: ev.color },
    });

    // Date badge
    s.addShape(pptx.ShapeType.roundRect, {
      x: 1.6, y: y + 0.1, w: 2.1, h: 0.26,
      fill: { color: C.silver }, line: { color: 'E2E8F0' }, rectRadius: 0.04,
    });
    s.addText(ev.date, {
      x: 1.6, y: y + 0.1, w: 2.1, h: 0.26,
      fontSize: 8.5, bold: true, color: ev.color, align: 'center',
    });

    // Title
    s.addText(ev.title, {
      x: 3.9, y: y + 0.04, w: 9.0, h: 0.32,
      fontSize: 11, bold: true, color: C.dark,
    });

    // Body
    s.addText(ev.body, {
      x: 3.9, y: y + 0.36, w: 9.0, h: 0.85,
      fontSize: 9.5, color: '475569', wrap: true, lineSpacingMultiple: 1.3,
    });
  });

  footer(s, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Expérience Tradex
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Retour d\'expérience Tradex — Descente conjointe DRH/DI/COM');

  // Left column — what Tradex has
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 0.88, w: 5.9, h: 5.9,
    fill: { color: 'FFF7ED' }, line: { color: 'FED7AA', pt: 1 }, rectRadius: 0.1,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 0.88, w: 5.9, h: 0.42,
    fill: { color: C.gold }, line: { color: C.gold },
  });
  s.addText('🏭  Dispositif Tradex (existant)', {
    x: 0.55, y: 0.89, w: 5.7, h: 0.4,
    fontSize: 11, bold: true, color: C.white,
  });

  const tradexItems = [
    'CVthèque sur tableur Excel centralisé',
    'Dépôt de candidatures par email ou dépôt physique',
    'Suivi manuel des candidatures (registres)',
    'Absence de portail en ligne dédié aux candidats',
    'Pas de workflow formalisé ni de pipeline visible',
    'Archivage des dossiers en format papier',
    'Risques de perte / doublon de dossiers',
  ];
  tradexItems.forEach((item, i) => {
    s.addText(`•  ${item}`, {
      x: 0.65, y: 1.46 + i * 0.65, w: 5.5, h: 0.55,
      fontSize: 9.5, color: '78350F', wrap: true, lineSpacingMultiple: 1.2,
    });
  });

  // Right column — lessons learned
  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.6, y: 0.88, w: 6.3, h: 5.9,
    fill: { color: C.lightBlue }, line: { color: C.midBlue, pt: 1 }, rectRadius: 0.1,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 6.6, y: 0.88, w: 6.3, h: 0.42,
    fill: { color: C.primary }, line: { color: C.primary },
  });
  s.addText('✅  Enseignements & Orientations SNH', {
    x: 6.7, y: 0.89, w: 6.1, h: 0.4,
    fontSize: 11, bold: true, color: C.white,
  });

  const lessons = [
    { icon: '🌐', text: 'Portail public accessible 24h/24 pour les candidats' },
    { icon: '📂', text: 'CVthèque numérique intégrée au SIRH (dossier unique candidat)' },
    { icon: '🔄', text: 'Workflow de recrutement formalisé et traçable (pipeline multi-étapes)' },
    { icon: '🔔', text: 'Notifications automatiques candidats à chaque changement de statut' },
    { icon: '📊', text: 'Tableaux de bord & rapports statistiques en temps réel' },
    { icon: '🔒', text: 'Sécurité des données conforme aux standards SNH' },
    { icon: '🔗', text: 'Interconnexion avec le SIRH : conversion candidat → employé' },
  ];
  lessons.forEach((l, i) => {
    s.addText(`${l.icon}  ${l.text}`, {
      x: 6.75, y: 1.46 + i * 0.65, w: 6.0, h: 0.55,
      fontSize: 9.5, color: C.dark, wrap: true, lineSpacingMultiple: 1.2,
    });
  });

  footer(s, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Espace Candidat
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Espace Candidat — Portail public de recrutement SNH');

  // Hero strip
  s.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 0.88, w: 12.4, h: 0.62,
    fill: { color: C.dark }, line: { color: C.dark },
  });
  s.addText('"Rejoignez la SNH — Trouvez des offres d\'emploi & de stage et postulez en quelques étapes"', {
    x: 0.6, y: 0.9, w: 12.1, h: 0.56,
    fontSize: 11, italic: true, color: 'A0C4E8', align: 'center',
  });

  // 6 feature boxes
  const features = [
    { icon: '🔍', title: 'Consultation des offres', desc: 'Recherche par poste, mots-clés, lieu, type de contrat — mise à jour en temps réel' },
    { icon: '📝', title: 'Création de compte', desc: 'Inscription sécurisée, profil candidat complet (identité, formations, expériences, compétences, langues)' },
    { icon: '📤', title: 'Candidature en ligne', desc: 'Dépôt de candidature sur offre publiée ou candidature spontanée (emploi, stage académique, stage pro)' },
    { icon: '📊', title: 'Suivi en temps réel', desc: 'Tableau de bord personnel — statut de chaque candidature, historique, notifications push' },
    { icon: '📄', title: 'Gestion des documents', desc: 'Upload CV, diplômes, CNI, attestations — alerte expiration — documents sécurisés dans le cloud' },
    { icon: '🤖', title: 'Génération de CV par IA', desc: 'CV professionnel généré automatiquement depuis le profil (2 templates SNH + amélioration par IA)' },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.45 + col * 4.3;
    const y = 1.7 + row * 2.5;

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 4.1, h: 2.2,
      fill: { color: C.lightBlue }, line: { color: C.midBlue, pt: 1 }, rectRadius: 0.1,
    });
    // Top accent bar
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 4.1, h: 0.06,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText(f.icon, { x, y: y + 0.1, w: 4.1, h: 0.5, fontSize: 22, align: 'center' });
    s.addText(f.title, {
      x: x + 0.15, y: y + 0.62, w: 3.8, h: 0.4,
      fontSize: 10.5, bold: true, color: C.dark, align: 'center',
    });
    s.addText(f.desc, {
      x: x + 0.15, y: y + 1.04, w: 3.8, h: 1.0,
      fontSize: 9, color: '475569', wrap: true, lineSpacingMultiple: 1.25, align: 'center',
    });
  });

  footer(s, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — CVthèque
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'CVthèque — Base de Données Candidats Intégrée au SIRH');

  // Big stat badges at top
  const stats = [
    { val: '100 %', label: 'Numérique', color: C.primary },
    { val: 'Temps réel', label: 'Mise à jour profils', color: C.accent },
    { val: 'Multi-critères', label: 'Recherche & Filtres', color: C.gold },
    { val: 'SIRH linked', label: 'Conversion Candidat → Employé', color: C.dark },
  ];
  stats.forEach((st, i) => {
    const x = 0.45 + i * 3.2;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 0.88, w: 3.0, h: 0.98,
      fill: { color: st.color }, line: { color: st.color }, rectRadius: 0.08,
    });
    s.addText(st.val, {
      x, y: 0.9, w: 3.0, h: 0.48,
      fontSize: 16, bold: true, color: C.white, align: 'center',
    });
    s.addText(st.label, {
      x, y: 1.36, w: 3.0, h: 0.42,
      fontSize: 8.5, color: 'DBEAFE', align: 'center', wrap: true,
    });
  });

  // Two columns below
  // Left: dossier candidat
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 2.1, w: 6.0, h: 4.7,
    fill: { color: C.lightBlue }, line: { color: C.midBlue }, rectRadius: 0.1,
  });
  s.addText('📁  Dossier Candidat (contenu)', {
    x: 0.6, y: 2.2, w: 5.7, h: 0.42,
    fontSize: 11, bold: true, color: C.primary,
  });
  const dossier = [
    'Identité, photo, coordonnées, nationalité',
    'Formations & diplômes (niveau, établissement, pays)',
    'Expériences professionnelles & stages',
    'Compétences techniques, soft skills, certifications',
    'Langues parlées avec niveau d\'évaluation',
    'Documents joints (CV, diplômes, CNI, certificats…)',
    'Historique des candidatures & statuts',
    'Score de compatibilité avec les offres (IA)',
  ];
  dossier.forEach((d, i) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: 0.62, y: 2.82 + i * 0.5, w: 0.14, h: 0.14,
      fill: { color: C.primary }, line: { color: C.primary },
    });
    s.addText(d, {
      x: 0.85, y: 2.76 + i * 0.5, w: 5.4, h: 0.42,
      fontSize: 9.5, color: C.dark, wrap: true,
    });
  });

  // Right: fonctions RH
  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.7, y: 2.1, w: 6.15, h: 4.7,
    fill: { color: 'F0FDF4' }, line: { color: 'BBF7D0' }, rectRadius: 0.1,
  });
  s.addText('⚙️  Fonctions disponibles pour les RH', {
    x: 6.85, y: 2.2, w: 5.8, h: 0.42,
    fontSize: 11, bold: true, color: C.accent,
  });
  const fonctions = [
    { icon: '🔎', text: 'Recherche & filtres avancés (offre, statut, diplôme, compétence, score)' },
    { icon: '📋', text: 'Fiche candidat détaillée consultable depuis l\'espace RH' },
    { icon: '📊', text: 'Rapports statistiques : candidatures par offre, par période, par type' },
    { icon: '📧', text: 'Envoi de notifications/emails aux candidats depuis l\'interface' },
    { icon: '⚖️', text: 'Évaluation jury et grille de notation par compétence' },
    { icon: '🔄', text: 'Changement de statut pipeline en un clic (10 étapes)' },
    { icon: '🔗', text: 'Conversion directe candidat retenu → fiche employé SIRH' },
    { icon: '📑', text: 'Génération de rapports PDF/imprimables (6 modèles disponibles)' },
  ];
  fonctions.forEach((f, i) => {
    s.addText(`${f.icon}  ${f.text}`, {
      x: 6.85, y: 2.72 + i * 0.5, w: 5.85, h: 0.44,
      fontSize: 9.5, color: C.dark, wrap: true, lineSpacingMultiple: 1.2,
    });
  });

  footer(s, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Module Recrutement (Workflow)
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Module Recrutement — Workflow & Pipeline de Sélection');

  // Pipeline stages
  const stages = [
    { label: 'Candidature\nreçue', color: '3B82F6', num: '1' },
    { label: 'Tests\ntechniques', color: '8B5CF6', num: '2' },
    { label: 'Entretien\nRH', color: C.gold, num: '3' },
    { label: 'Tests\npsy.', color: 'EC4899', num: '4' },
    { label: 'Visite\nmédicale', color: '06B6D4', num: '5' },
    { label: 'Enquête\nmoralité', color: '64748B', num: '6' },
    { label: 'Auth.\ndiplômes', color: '0EA5E9', num: '7' },
    { label: 'Période\nd\'essai', color: C.accent, num: '8' },
    { label: 'Affectation', color: '059669', num: '9' },
    { label: 'Titularisé', color: C.dark, num: '10' },
  ];

  stages.forEach((st, i) => {
    const x = 0.4 + i * 1.25;
    const y = 0.95;
    const w = 1.12;

    // Box
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w, h: 1.3,
      fill: { color: st.color }, line: { color: st.color }, rectRadius: 0.06,
    });
    // Number badge
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + w / 2 - 0.18, y: y + 0.06, w: 0.36, h: 0.36,
      fill: { color: 'E2E8F0' }, line: { color: 'CBD5E1' },
    });
    s.addText(st.num, {
      x: x + w / 2 - 0.18, y: y + 0.06, w: 0.36, h: 0.36,
      fontSize: 9, bold: true, color: C.dark, align: 'center',
    });
    s.addText(st.label, {
      x: x + 0.04, y: y + 0.5, w: w - 0.08, h: 0.72,
      fontSize: 8.5, bold: true, color: C.white, align: 'center', wrap: true, lineSpacingMultiple: 1.2,
    });

    // Arrow between boxes
    if (i < stages.length - 1) {
      s.addText('›', {
        x: x + w - 0.04, y: y + 0.42, w: 0.2, h: 0.46,
        fontSize: 14, bold: true, color: C.gray, align: 'center',
      });
    }
  });

  // Features below pipeline
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 2.45, w: 12.5, h: 0.04,
    fill: { color: C.midBlue }, line: { color: C.midBlue },
  });

  const wfFeatures = [
    { icon: '📋', title: 'Gestion des offres', lines: ['Création d\'offres structurées', '(bilingue FR/EN automatique)', 'Dates, contrat, profil, docs requis'] },
    { icon: '📨', title: 'Demandes de recrutement', lines: ['Workflow de validation', 'Responsable → DRH', 'Traçabilité complète NS-571'] },
    { icon: '🎯', title: 'Scoring & Matching IA', lines: ['Score de compatibilité candidat', 'Classement automatique', 'Recommandations RH'] },
    { icon: '⚖️', title: 'Évaluation Jury', lines: ['Grille de notation par juré', 'Calcul de score pondéré', 'Rapport d\'évaluation exportable'] },
    { icon: '🔔', title: 'Notifications auto', lines: ['Email + notification candidat', 'à chaque changement de statut', 'Modèles personnalisables'] },
    { icon: '📊', title: 'Rapports & Statistiques', lines: ['6 rapports PDF/Excel', 'Tableaux de bord temps réel', 'Historique candidatures complet'] },
  ];

  wfFeatures.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.3;
    const y = 2.65 + row * 2.1;

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 4.1, h: 1.9,
      fill: { color: C.silver }, line: { color: 'E2E8F0' }, rectRadius: 0.08,
    });
    s.addText(f.icon, { x, y: y + 0.08, w: 4.1, h: 0.45, fontSize: 20, align: 'center' });
    s.addText(f.title, {
      x: x + 0.1, y: y + 0.52, w: 3.9, h: 0.34,
      fontSize: 10, bold: true, color: C.dark, align: 'center',
    });
    f.lines.forEach((line, li) => {
      s.addText(line, {
        x: x + 0.1, y: y + 0.88 + li * 0.3, w: 3.9, h: 0.28,
        fontSize: 8.5, color: '475569', align: 'center',
      });
    });
  });

  footer(s, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — Besoins : Déploiement & Formation
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Besoins — Déploiement & Plan de Formation');

  // Left: Deployment needs
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 0.88, w: 5.95, h: 6.0,
    fill: { color: C.lightBlue }, line: { color: C.midBlue }, rectRadius: 0.1,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 0.88, w: 5.95, h: 0.44,
    fill: { color: C.primary }, line: { color: C.primary },
  });
  s.addText('🚀  Besoins de déploiement', {
    x: 0.6, y: 0.89, w: 5.6, h: 0.42,
    fontSize: 11, bold: true, color: C.white,
  });

  const deploy = [
    { cat: 'Infrastructure', items: ['Nom de domaine dédié (ex : recrutement.snh.cm)', 'Hébergement sécurisé (Supabase Cloud — données en zone EU)', 'Certificat SSL & politique de sauvegarde'] },
    { cat: 'Intégration SIRH', items: ['Lien avec la base employés (conversion candidat → employé)', 'Synchronisation des postes / organigramme', 'Accès depuis le portail employé SNH'] },
    { cat: 'Communication', items: ['Campagne de communication externe (candidats)', 'Guide utilisateur candidat (FR + EN)', 'Charte graphique SNH appliquée'] },
    { cat: 'Administration', items: ['Paramétrage des rôles (DRH, Recruteur, Jury, Admin)', 'Création des premiers comptes utilisateurs RH', 'Procédures internes de gestion des candidatures'] },
  ];

  let yCur = 1.48;
  deploy.forEach(({ cat, items }) => {
    s.addText(cat, {
      x: 0.65, y: yCur, w: 5.55, h: 0.3,
      fontSize: 10, bold: true, color: C.primary,
    });
    yCur += 0.32;
    items.forEach(item => {
      s.addText(`   • ${item}`, {
        x: 0.65, y: yCur, w: 5.55, h: 0.32,
        fontSize: 8.8, color: C.dark, wrap: true,
      });
      yCur += 0.34;
    });
    yCur += 0.1;
  });

  // Right: Training
  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.6, y: 0.88, w: 6.3, h: 6.0,
    fill: { color: 'F0FDF4' }, line: { color: 'BBF7D0' }, rectRadius: 0.1,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 6.6, y: 0.88, w: 6.3, h: 0.44,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  s.addText('🎓  Plan de Formation — Offre BOLT en Présentiel', {
    x: 6.75, y: 0.89, w: 6.0, h: 0.42,
    fontSize: 11, bold: true, color: C.white,
  });

  // Formation offer card
  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.7, y: 1.48, w: 6.1, h: 1.6,
    fill: { color: C.white }, line: { color: 'BBF7D0', pt: 1.5 }, rectRadius: 0.08,
  });
  s.addText('Formation BOLT — Prise en main de la plateforme', {
    x: 6.85, y: 1.56, w: 5.8, h: 0.36,
    fontSize: 11, bold: true, color: C.accent,
  });
  s.addText('📅  Septembre ou Octobre 2026  |  En présentiel  |  Public : Informaticiens du projet', {
    x: 6.85, y: 1.92, w: 5.8, h: 0.32,
    fontSize: 9.5, color: C.gray, italic: true,
  });
  s.addText('Durée estimée : 2 jours  |  Format : Atelier pratique', {
    x: 6.85, y: 2.24, w: 5.8, h: 0.3,
    fontSize: 9.5, color: C.gray,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 6.85, y: 2.56, w: 5.8, h: 0.03,
    fill: { color: 'BBF7D0' }, line: { color: 'BBF7D0' },
  });
  s.addText('À confirmer avec BOLT — planification à lancer dès validation de la présente note.', {
    x: 6.85, y: 2.62, w: 5.8, h: 0.36,
    fontSize: 9, color: '166534', italic: true, wrap: true,
  });

  // Training modules
  s.addText('Modules de formation recommandés :', {
    x: 6.75, y: 3.22, w: 6.0, h: 0.3,
    fontSize: 10.5, bold: true, color: '166534',
  });
  const modules = [
    { icon: '⚙️', mod: 'Administration de la plateforme BOLT', desc: 'Gestion des environnements, déploiements, variables d\'environnement' },
    { icon: '🗄️', mod: 'Base de données Supabase', desc: 'Structure des tables, politiques RLS, migrations SQL' },
    { icon: '🔌', mod: 'Edge Functions & API', desc: 'Fonctions serverless, intégrations externes, webhooks' },
    { icon: '🛡️', mod: 'Sécurité & Authentification', desc: 'Gestion des rôles, SSO, audit des accès' },
  ];
  modules.forEach((m, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 6.7, y: 3.6 + i * 0.82, w: 6.1, h: 0.7,
      fill: { color: C.white }, line: { color: 'D1FAE5' }, rectRadius: 0.06,
    });
    s.addText(m.icon, { x: 6.75, y: 3.63 + i * 0.82, w: 0.5, h: 0.56, fontSize: 16, align: 'center' });
    s.addText(m.mod, {
      x: 7.3, y: 3.63 + i * 0.82, w: 5.3, h: 0.28,
      fontSize: 9.5, bold: true, color: C.dark,
    });
    s.addText(m.desc, {
      x: 7.3, y: 3.91 + i * 0.82, w: 5.3, h: 0.28,
      fontSize: 8.5, color: '475569',
    });
  });

  footer(s, 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — Perspectives & Digitalisation RH
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);

  // Background grid decoration
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 4; row++) {
      s.addShape(pptx.ShapeType.rect, {
        x: col * 2.7, y: row * 2.0, w: 2.68, h: 1.98,
        fill: { color: col + row % 2 === 0 ? '0D2D4F' : '0A2540' },
        line: { color: '0F3460', pt: 0.5 },
      });
    }
  }

  // Title overlay
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 1.35,
    fill: { color: '061929' }, line: { color: '061929' },
  });
  s.addText('Perspectives — Digitalisation Complète des Ressources Humaines', {
    x: 0.5, y: 0.12, w: 12.3, h: 0.66,
    fontSize: 20, bold: true, color: C.white,
  });
  s.addText('Le Portail Recrutement s\'inscrit dans la trajectoire de matérialisation du SIRH SNH — déjà en cours', {
    x: 0.5, y: 0.78, w: 12.3, h: 0.38,
    fontSize: 11, color: 'A0C4E8', italic: true,
  });

  // Cards
  const persp = [
    {
      icon: '👤',
      title: 'Espace Employé Digital',
      body: 'Portail employé opérationnel : fiches de paie, congés, formation, profil RH — accessible depuis le navigateur',
      status: 'Opérationnel',
      statusColor: C.accent,
    },
    {
      icon: '💰',
      title: 'Paie & Éléments variables',
      body: 'Gestion de la paie automatisée : calcul des éléments, édition des bulletins, déclarations sociales et fiscales',
      status: 'Opérationnel',
      statusColor: C.accent,
    },
    {
      icon: '📈',
      title: 'Performance & OKR',
      body: 'Évaluations annuelles, objectifs OKR, plans de développement, feedback 360° — entièrement dématérialisés',
      status: 'Opérationnel',
      statusColor: C.accent,
    },
    {
      icon: '🏥',
      title: 'QVCT & Bien-être',
      body: 'Module QVCT : discussions collaboratives, enquêtes bien-être, suivi des indicateurs QVCT, analyses IA',
      status: 'Opérationnel',
      statusColor: C.accent,
    },
    {
      icon: '🎓',
      title: 'Formation & Compétences',
      body: 'Plan de formation, catalogue de compétences, matrice compétences/postes, suivi des parcours de développement',
      status: 'Opérationnel',
      statusColor: C.accent,
    },
    {
      icon: '🔵',
      title: 'Recrutement & CVthèque',
      body: 'Portail candidat public, CVthèque intégrée, pipeline de sélection complet — objet de la présente note',
      status: 'Déploiement en cours',
      statusColor: C.gold,
    },
    {
      icon: '🔗',
      title: 'Interconnexion ERP / Paie',
      body: 'Passerelle vers les systèmes de paie existants : transfert automatique des éléments variables depuis le SIRH',
      status: 'Prévu',
      statusColor: '9CA3AF',
    },
    {
      icon: '🌐',
      title: 'SSO & Sécurité centralisée',
      body: 'Authentification unique (SSO) pour tous les modules RH, gestion fine des rôles et droits d\'accès par entité',
      status: 'Prévu',
      statusColor: '9CA3AF',
    },
  ];

  persp.forEach((p, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.38 + col * 3.27;
    const y = 1.5 + row * 2.7;

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 3.1, h: 2.48,
      fill: { color: '0D2D4F' }, line: { color: '1E4A7A', pt: 1 }, rectRadius: 0.1,
    });
    // Top accent
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 3.1, h: 0.06,
      fill: { color: p.statusColor }, line: { color: p.statusColor },
    });

    s.addText(p.icon, { x, y: y + 0.12, w: 3.1, h: 0.48, fontSize: 22, align: 'center' });
    s.addText(p.title, {
      x: x + 0.1, y: y + 0.6, w: 2.9, h: 0.42,
      fontSize: 10, bold: true, color: C.white, align: 'center', wrap: true,
    });
    s.addText(p.body, {
      x: x + 0.1, y: y + 1.02, w: 2.9, h: 1.06,
      fontSize: 8.5, color: '94A3B8', wrap: true, lineSpacingMultiple: 1.25, align: 'center',
    });

    // Status badge
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.25, y: y + 2.1, w: 2.6, h: 0.26,
      fill: { color: '0D2D4F' }, line: { color: p.statusColor }, rectRadius: 0.04,
    });
    s.addText(p.status, {
      x: x + 0.25, y: y + 2.1, w: 2.6, h: 0.26,
      fontSize: 8, bold: true, color: p.statusColor, align: 'center',
    });
  });

  // Bottom caption
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.1, w: 13.33, h: 0.03,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  s.addText(
    'SNH — DRH/DI/COM  |  Note 641 du 19 juin 2026  |  Confidentiel  |  8 / 8',
    { x: 0.4, y: 7.15, w: 12.5, h: 0.28, fontSize: 8, color: C.gray, align: 'center' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
const filename = 'Concertation_DRH_DI_COM_Note641_Portail_Recrutement_SNH.pptx';
await pptx.writeFile({ fileName: filename });
console.log(`\n✅  Présentation générée : ${filename}\n`);
