import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'CVtheque & Portail de Recrutement SNH - Directoire';
pptx.subject = 'CVtheque - Portail Candidat - Gestion RH';
pptx.company = 'Societe Nationale des Hydrocarbures';

const C = {
  dark:    '0A2540',
  navy:    '0D2D4F',
  primary: '1B6CA8',
  accent:  '16A34A',
  gold:    'D97706',
  red:     'B91C1C',
  white:   'FFFFFF',
  gray:    '64748B',
  silver:  'F1F5F9',
  light:   'EFF6FF',
  mid:     'DBEAFE',
  slate:   '475569',
  green50: 'F0FDF4',
  green200:'BBF7D0',
};

const TOTAL = 5;

function bg(s, color) { s.background = { fill: color || C.white }; }

function footer(s, num) {
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.1, w: 13.33, h: 0.03, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('SNH - DRH/DI/COM  |  Note 641 du 19 juin 2026  |  Confidentiel  |  ' + num + ' / ' + TOTAL,
    { x: 0.4, y: 7.15, w: 12.5, h: 0.28, fontSize: 8, color: C.gray, align: 'center' });
}

function sectionBar(s, label, color) {
  const c = color || C.primary;
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 0.22, w: 12.4, h: 0.07, fill: { color: c }, line: { color: c } });
  s.addText(label.toUpperCase(), { x: 0.45, y: 0.34, w: 12.4, h: 0.42, fontSize: 10, bold: true, color: c, charSpacing: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 - Titre
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent }, line: { color: C.accent } });
  s.addText('SNH', { x: 0.5, y: 0.42, w: 4, h: 0.72, fontSize: 34, bold: true, color: C.white });
  s.addText('Societe Nationale des Hydrocarbures', { x: 0.5, y: 1.12, w: 9, h: 0.36, fontSize: 11, color: 'A0C4E8', italic: true });
  s.addText('CVtheque &\nPortail de Recrutement', { x: 0.5, y: 1.95, w: 12, h: 1.85, fontSize: 40, bold: true, color: C.white, lineSpacingMultiple: 1.2 });
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.98, w: 8.0, h: 0.05, fill: { color: C.accent }, line: { color: C.accent } });
  s.addText('Presentation au Directoire  -  Suite a la note 641 DRH/DI/COM du 19 juin 2026', { x: 0.5, y: 4.15, w: 12, h: 0.4, fontSize: 13, color: 'A0C4E8' });
  s.addText('Direction des Ressources Humaines  |  Juillet 2026', { x: 0.5, y: 4.68, w: 8, h: 0.34, fontSize: 10.5, color: C.gray });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 5.38, w: 12.3, h: 1.55, fill: { color: C.navy }, line: { color: '1E4A7A', pt: 1 }, rectRadius: 0.1 });
  s.addText('DEROULEMENT DE LA SEANCE', { x: 0.75, y: 5.45, w: 5, h: 0.28, fontSize: 8.5, bold: true, color: C.gold, charSpacing: 2 });

  const steps = [
    { n: '1', t: 'Introduction DADRH', sub: 'Contexte & enjeux\nde la CVtheque' },
    { n: '2', t: 'Portail Candidat', sub: 'Espace public\nde candidature' },
    { n: '3', t: 'CVtheque RH', sub: 'Gestion, recherche\n& adequation IA' },
    { n: '4', t: 'Perspectives', sub: 'Workflow puis\nautres modules SIRH' },
  ];
  steps.forEach((st, i) => {
    const x = 0.65 + i * 3.02;
    s.addShape(pptx.ShapeType.ellipse, { x, y: 5.83, w: 0.4, h: 0.4, fill: { color: C.gold }, line: { color: C.gold } });
    s.addText(st.n, { x, y: 5.83, w: 0.4, h: 0.4, fontSize: 10, bold: true, color: C.dark, align: 'center' });
    s.addText(st.t, { x: x + 0.48, y: 5.84, w: 2.35, h: 0.26, fontSize: 10, bold: true, color: C.white });
    s.addText(st.sub, { x: x + 0.48, y: 6.1, w: 2.35, h: 0.5, fontSize: 8.5, color: '94A3B8', lineSpacingMultiple: 1.15 });
    if (i < steps.length - 1) s.addText('>', { x: x + 2.8, y: 5.88, w: 0.28, h: 0.38, fontSize: 14, bold: true, color: C.gray, align: 'center' });
  });
  footer(s, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 - Introduction DADRH
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText('MOT D\'INTRODUCTION - MADAME LE DIRECTEUR ADJOINT DES RESSOURCES HUMAINES', { x: 0.38, y: 0.28, w: 12.5, h: 0.3, fontSize: 9, bold: true, color: C.gold, charSpacing: 1.5 });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.38, y: 0.68, w: 12.52, h: 0.84, fill: { color: C.navy }, line: { color: '1E4A7A', pt: 1 }, rectRadius: 0.08 });
  s.addText('Contexte & Enjeux de la mise en place d\'une CVtheque a la SNH', { x: 0.6, y: 0.74, w: 12.1, h: 0.46, fontSize: 17, bold: true, color: C.white });
  s.addText('Direction des Ressources Humaines  -  SNH', { x: 0.6, y: 1.2, w: 12.1, h: 0.26, fontSize: 10, color: 'A0C4E8', italic: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.38, y: 1.66, w: 12.52, h: 0.04, fill: { color: C.gold }, line: { color: C.gold } });

  const cols = [
    {
      title: 'Pourquoi une CVtheque ?',
      color: C.gold, bg: '0F1F35', border: '2A4A6A',
      items: [
        'Instruction de Madame le Conseiller N 2 - reunion de coordination du 2 avril 2026',
        'Concertation tripartite DRH / DI / COM mandatee pour doter la SNH d\'un dispositif moderne',
        'Descente conjointe chez Tradex (filiale SNH) - recueil des bonnes pratiques en mai-juin 2026',
        'Note 641 DRH/DI/COM du 19 juin 2026 - formalisation des orientations retenues',
      ],
    },
    {
      title: 'Situation actuelle',
      color: 'EF4444', bg: '1A0F0F', border: '5A1A1A',
      items: [
        'Candidatures recues par email, depot physique ou recommandations informelles - aucun canal centralise',
        'Dossiers papier ou tableurs disperses - risques de perte, doublons, pas de tracabilite',
        'Aucune visibilite sur le vivier de candidats entre deux campagnes de recrutement',
        'Image employeur insuffisante - la SNH ne dispose pas de portail dedie aux candidats',
      ],
    },
    {
      title: 'Enjeux & Objectifs',
      color: C.accent, bg: '0A1A12', border: '1A4A2A',
      items: [
        'Centraliser toutes les candidatures dans une base numerique unique, securisee et exploitable',
        'Offrir un portail public professionnel et bilingue - ameliorer l\'image employeur de la SNH',
        'Permettre a la DRH de rechercher, filtrer et evaluer les candidats avec l\'intelligence artificielle',
        'Constituer un vivier de talents reutilisable pour les recrutements futurs',
      ],
    },
  ];

  cols.forEach((col, i) => {
    const x = 0.38 + i * 4.27;
    const y = 1.82;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: 4.14, h: 5.06, fill: { color: col.bg }, line: { color: col.border, pt: 1 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 4.14, h: 0.06, fill: { color: col.color }, line: { color: col.color } });
    s.addText(col.title, { x: x + 0.14, y: y + 0.12, w: 3.86, h: 0.34, fontSize: 10.5, bold: true, color: col.color, wrap: true });
    s.addShape(pptx.ShapeType.rect, { x: x + 0.18, y: y + 0.52, w: 3.78, h: 0.03, fill: { color: col.color }, line: { color: col.color } });
    col.items.forEach((item, j) => {
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: y + 0.78 + j * 1.02, w: 0.14, h: 0.14, fill: { color: col.color }, line: { color: col.color } });
      s.addText(item, { x: x + 0.4, y: y + 0.7 + j * 1.02, w: 3.6, h: 0.88, fontSize: 9, color: '94A3B8', wrap: true, lineSpacingMultiple: 1.25 });
    });
  });
  footer(s, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 - Portail Candidat public
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'Portail de Recrutement - Espace Candidat (acces public)');

  s.addShape(pptx.ShapeType.roundRect, { x: 0.45, y: 0.88, w: 12.4, h: 0.46, fill: { color: C.dark }, line: { color: C.dark }, rectRadius: 0.06 });
  s.addText('"Consultez nos offres et postulez a la SNH depuis n\'importe quel appareil - portail bilingue francais / anglais"', { x: 0.6, y: 0.9, w: 12.1, h: 0.42, fontSize: 10.5, italic: true, color: 'A0C4E8', align: 'center' });

  const parcours = [
    { n: '1', icon: '~1~', title: 'Consulter les offres', lines: ['Portail public SNH', 'Filtres par poste, contrat', 'Affichage bilingue FR/EN'] },
    { n: '2', icon: '~2~', title: 'Creer son profil', lines: ['Identite, formations', 'Experiences, competences', 'Langues & recommandateurs'] },
    { n: '3', icon: '~3~', title: 'Postuler en ligne', lines: ['Sur offre publiee', 'Candidature spontanee', 'Emploi / stage aca. / pro.'] },
    { n: '4', icon: '~4~', title: 'Suivre sa candidature', lines: ['Tableau de bord perso.', 'Statut en temps reel', 'Notifications automatiques'] },
  ];

  parcours.forEach((p, i) => {
    const x = 0.45 + i * 3.26;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.46, w: 3.12, h: 2.74, fill: { color: C.light }, line: { color: C.mid, pt: 1 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.46, w: 3.12, h: 0.06, fill: { color: C.primary }, line: { color: C.primary } });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 1.36, y: 1.52, w: 0.4, h: 0.4, fill: { color: C.primary }, line: { color: C.primary } });
    s.addText(p.n, { x: x + 1.36, y: 1.52, w: 0.4, h: 0.4, fontSize: 10, bold: true, color: C.white, align: 'center' });
    s.addText(p.title, { x: x + 0.1, y: 2.04, w: 2.92, h: 0.32, fontSize: 10.5, bold: true, color: C.dark, align: 'center' });
    p.lines.forEach((l, j) => {
      s.addText('- ' + l, { x: x + 0.12, y: 2.42 + j * 0.38, w: 2.88, h: 0.32, fontSize: 9, color: C.slate, align: 'center' });
    });
    if (i < parcours.length - 1) s.addText('->', { x: x + 3.04, y: 2.68, w: 0.3, h: 0.42, fontSize: 14, bold: true, color: C.primary, align: 'center' });
  });

  const extras = [
    { title: 'Documents & CV', d: 'Upload securise (CV, diplomes, CNI, attestations)\nAlerte automatique d\'expiration des pieces' },
    { title: 'Generation de CV par IA', d: 'CV professionnel genere automatiquement\ndepuis le profil - mise en forme SNH' },
    { title: 'Bilingue FR / EN', d: 'Toutes les offres disponibles en francais\net en anglais - attraction sous-regionale' },
    { title: 'Responsive 24h/24', d: 'Optimise mobile, tablette, bureau\nAucune installation requise' },
  ];

  extras.forEach((e, i) => {
    const x = 0.45 + i * 3.26;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 4.32, w: 3.12, h: 2.56, fill: { color: C.silver }, line: { color: 'E2E8F0' }, rectRadius: 0.08 });
    s.addShape(pptx.ShapeType.rect, { x, y: 4.32, w: 3.12, h: 0.06, fill: { color: C.primary }, line: { color: C.primary } });
    s.addText(e.title, { x: x + 0.1, y: 4.44, w: 2.92, h: 0.34, fontSize: 10.5, bold: true, color: C.dark, align: 'center' });
    s.addText(e.d, { x: x + 0.12, y: 4.82, w: 2.88, h: 1.5, fontSize: 9, color: C.slate, align: 'center', wrap: true, lineSpacingMultiple: 1.35 });
  });
  footer(s, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 - CVtheque Administration RH
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.white);
  sectionBar(s, 'CVtheque - Gestion & Administration RH (recherche, adequation IA)');

  const kpis = [
    { val: 'Dossier numerique', sub: 'complet par candidat', color: C.primary },
    { val: 'Recherche IA', sub: 'multi-criteres instantanee', color: C.accent },
    { val: 'Score adequation', sub: 'profil / poste automatique', color: C.gold },
    { val: 'Integration SIRH', sub: 'candidat -> employe SNH', color: C.dark },
  ];
  kpis.forEach((k, i) => {
    const x = 0.45 + i * 3.2;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 0.86, w: 3.04, h: 0.88, fill: { color: k.color }, line: { color: k.color }, rectRadius: 0.08 });
    s.addText(k.val, { x, y: 0.9, w: 3.04, h: 0.38, fontSize: 13.5, bold: true, color: C.white, align: 'center' });
    s.addText(k.sub, { x, y: 1.27, w: 3.04, h: 0.34, fontSize: 8.5, color: 'DBEAFE', align: 'center', wrap: true });
  });

  // Colonne gauche - dossier
  s.addShape(pptx.ShapeType.roundRect, { x: 0.45, y: 1.88, w: 5.9, h: 4.98, fill: { color: C.light }, line: { color: C.mid }, rectRadius: 0.1 });
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 1.88, w: 5.9, h: 0.4, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('Dossier Candidat - Contenu complet', { x: 0.6, y: 1.9, w: 5.6, h: 0.36, fontSize: 10.5, bold: true, color: C.white });

  const dossier = [
    'Identite, photo, coordonnees, nationalite',
    'Formations & diplomes (niveau, etablissement, pays)',
    'Experiences professionnelles & stages',
    'Competences techniques et soft skills',
    'Langues parlees avec niveau (A1 a C2)',
    'Recommandateurs (nom, fonction, contact)',
    'Documents joints (CV, diplomes, CNI, attestations)',
    'Historique des candidatures & statuts pipeline',
  ];
  dossier.forEach((d, i) => {
    s.addShape(pptx.ShapeType.ellipse, { x: 0.62, y: 2.5 + i * 0.54, w: 0.14, h: 0.14, fill: { color: C.primary }, line: { color: C.primary } });
    s.addText(d, { x: 0.84, y: 2.44 + i * 0.54, w: 5.34, h: 0.44, fontSize: 9.5, color: C.dark, wrap: true });
  });

  // Colonne droite - fonctions RH
  s.addShape(pptx.ShapeType.roundRect, { x: 6.55, y: 1.88, w: 6.3, h: 4.98, fill: { color: C.green50 }, line: { color: C.green200 }, rectRadius: 0.1 });
  s.addShape(pptx.ShapeType.rect, { x: 6.55, y: 1.88, w: 6.3, h: 0.4, fill: { color: C.accent }, line: { color: C.accent } });
  s.addText('Fonctions disponibles pour la DRH', { x: 6.7, y: 1.9, w: 6.0, h: 0.36, fontSize: 10.5, bold: true, color: C.white });

  const fonctions = [
    { t: 'Recherche & Filtres avances', d: 'Par offre, statut, diplome, competence, score, date - resultats instantanes' },
    { t: 'Score d\'adequation IA', d: 'Classement automatique des candidats par compatibilite au poste cible' },
    { t: 'Fiche candidat detaillee', d: 'Dossier complet, apercu documents, historique echanges et candidatures' },
    { t: 'Communication candidats', d: 'Envoi d\'emails et notifications personnalises depuis l\'interface RH' },
    { t: 'Evaluation & Grille jury', d: 'Notation ponderee par jure, score global, rapport exportable en PDF' },
    { t: 'Conversion Candidat -> Employe', d: 'Integration automatique du candidat retenu dans le SIRH SNH' },
    { t: 'Rapports & Tableaux de bord', d: '6 rapports disponibles - export PDF, statistiques temps reel' },
  ];
  fonctions.forEach((f, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 6.65, y: 2.42 + i * 0.62, w: 6.06, h: 0.56, fill: { color: C.white }, line: { color: C.green200 }, rectRadius: 0.06 });
    s.addText(f.t, { x: 6.72, y: 2.44 + i * 0.62, w: 5.9, h: 0.24, fontSize: 9.5, bold: true, color: C.dark });
    s.addText(f.d, { x: 6.72, y: 2.68 + i * 0.62, w: 5.9, h: 0.26, fontSize: 8.5, color: C.slate });
  });
  footer(s, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 - Perspectives
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bg(s, C.dark);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('PERSPECTIVES & PROCHAINES ETAPES', { x: 0.4, y: 0.32, w: 12.5, h: 0.32, fontSize: 9.5, bold: true, color: C.primary, charSpacing: 2 });
  s.addText('A la suite de vos echanges', { x: 0.4, y: 0.72, w: 12.5, h: 0.7, fontSize: 26, bold: true, color: C.white });
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.52, w: 12.5, h: 0.04, fill: { color: C.primary }, line: { color: C.primary } });

  const blocks = [
    {
      num: '01', color: C.gold,
      title: 'Workflow de Recrutement',
      subtitle: 'Priorite immediate',
      desc: 'Deploiement du module de gestion du processus de recrutement en 10 etapes, depuis la demande de recrutement (NS 193 / NS 571) jusqu\'a la titularisation du candidat retenu.',
      items: [
        'Demande de recrutement formalisee & tracable',
        'Workflow 10 etapes : candidature -> titularisation',
        'Notifications automatiques a chaque etape',
        'Tableau de bord recrutement DRH en temps reel',
        'Lien direct avec la CVtheque & le SIRH employes',
      ],
      status: 'PROCHAINE ETAPE - Sept. / Oct. 2026',
    },
    {
      num: '02', color: C.primary,
      title: 'Modules SIRH Complementaires',
      subtitle: 'Digitalisation complete des RH',
      desc: 'Capitaliser sur l\'infrastructure SIRH SNH en cours de materialisation pour etendre progressivement la digitalisation a l\'ensemble des processus RH.',
      items: [
        'ERP Paie - connexion des donnees de paie au SIRH',
        'Gestion des conges & presences (time tracking)',
        'Performance & entretiens annuels (deja disponible)',
        'Formation & plans de developpement des competences',
        'Organigramme interactif & annuaire des collaborateurs',
      ],
      status: 'FEUILLE DE ROUTE 2026 - 2027',
    },
  ];

  blocks.forEach((bl, i) => {
    const x = 0.4 + i * 6.5;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.68, w: 6.2, h: 5.22, fill: { color: C.navy }, line: { color: bl.color, pt: 1.5 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.68, w: 6.2, h: 0.06, fill: { color: bl.color }, line: { color: bl.color } });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: 1.78, w: 0.5, h: 0.5, fill: { color: bl.color }, line: { color: bl.color } });
    s.addText(bl.num, { x: x + 0.18, y: 1.78, w: 0.5, h: 0.5, fontSize: 11, bold: true, color: C.dark, align: 'center' });
    s.addText(bl.title, { x: x + 0.82, y: 1.78, w: 5.2, h: 0.32, fontSize: 13.5, bold: true, color: C.white });
    s.addText(bl.subtitle, { x: x + 0.82, y: 2.1, w: 5.2, h: 0.26, fontSize: 9.5, color: bl.color, italic: true });
    s.addShape(pptx.ShapeType.rect, { x: x + 0.18, y: 2.46, w: 5.84, h: 0.03, fill: { color: bl.color }, line: { color: bl.color } });
    s.addText(bl.desc, { x: x + 0.18, y: 2.56, w: 5.84, h: 0.88, fontSize: 9, color: '94A3B8', wrap: true, lineSpacingMultiple: 1.3, italic: true });
    bl.items.forEach((item, j) => {
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.22, y: 3.56 + j * 0.52, w: 0.13, h: 0.13, fill: { color: bl.color }, line: { color: bl.color } });
      s.addText(item, { x: x + 0.44, y: 3.5 + j * 0.52, w: 5.56, h: 0.42, fontSize: 9.5, color: C.white, wrap: true });
    });
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.18, y: 6.34, w: 5.84, h: 0.34, fill: { color: '061929' }, line: { color: bl.color, pt: 1 }, rectRadius: 0.05 });
    s.addText(bl.status, { x: x + 0.18, y: 6.34, w: 5.84, h: 0.34, fontSize: 8.5, bold: true, color: bl.color, align: 'center' });
  });
  footer(s, 5);
}

const filename = 'Concertation_DRH_DI_COM_Note641_Portail_Recrutement_SNH.pptx';
await pptx.writeFile({ fileName: filename });
console.log('\n✅  Presentation principale generee : ' + filename + '  (' + TOTAL + ' slides)\n');
