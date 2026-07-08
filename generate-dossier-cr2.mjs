// generate-dossier-cr2.mjs
// Generates a professional Word document for the CR2 presentation dossier
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, PageBreak, HorizontalPositionAlign, VerticalPositionAlign,
  Footer, Header, PageNumber, NumberFormat, Tab, TabStopType,
  convertInchesToTwip, convertMillimetersToTwip,
  UnderlineType,
} from 'docx';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Colors ───────────────────────────────────────────────────────────────────
const GREEN  = '006B3C';
const RED    = 'CE1126';
const GOLD   = 'FCD116';
const DARK   = '1A2E1A';
const GRAY   = 'F4F6F4';
const LGRAY  = 'E8EDE8';
const WHITE  = 'FFFFFF';
const TXT    = '1E2A1E';
const SUBTXT = '5A6A5A';

// ── Helpers ──────────────────────────────────────────────────────────────────
const pt  = (n) => n * 2;          // half-points (docx unit)
const cm  = (n) => convertMillimetersToTwip(n * 10);
const mm  = convertMillimetersToTwip;

const clr = (hex, bold = false, size = 22, font = 'Calibri') =>
  ({ color: hex, bold, size, font });

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: pt(18),
        color: WHITE,
        font: 'Calibri',
      }),
    ],
    shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
    indent: { left: mm(4), right: mm(4) },
    border: {
      bottom: { color: GOLD, size: 6, space: 2, style: BorderStyle.SINGLE },
    },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: pt(14), color: GREEN, font: 'Calibri' }),
    ],
    border: {
      left: { color: GREEN, size: 18, space: 6, style: BorderStyle.SINGLE },
      bottom: { color: LGRAY, size: 4, space: 2, style: BorderStyle.SINGLE },
    },
    indent: { left: mm(5) },
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({ text, bold: true, size: pt(12), color: DARK, font: 'Calibri' }),
    ],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80, line: 280, lineRule: 'auto' },
    indent: { left: opts.indent ? mm(10) : 0 },
    children: [
      new TextRun({
        text,
        size: pt(11),
        color: opts.color || TXT,
        font: 'Calibri',
        bold: opts.bold || false,
        italics: opts.italic || false,
      }),
    ],
    alignment: opts.align || AlignmentType.JUSTIFIED,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { before: 40, after: 40 },
    indent: { left: cm(level * 0.6 + 0.8), hanging: mm(5) },
    children: [
      new TextRun({ text, size: pt(10.5), color: TXT, font: 'Calibri' }),
    ],
  });
}

function badge(text, color = GREEN) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text: `  ${text}  `,
        bold: true,
        size: pt(9),
        color: WHITE,
        font: 'Calibri',
        shading: { type: ShadingType.SOLID, color, fill: color },
      }),
    ],
  });
}

function rule() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { color: LGRAY, size: 4, space: 1, style: BorderStyle.SINGLE } },
    children: [],
  });
}

function space(before = 200, after = 0) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function twoColTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: mm(1), bottom: mm(1), left: mm(2), right: mm(2) },
    borders: {
      top:    { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
      insideH:{ style: BorderStyle.NONE },
      insideV:{ style: BorderStyle.NONE },
    },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: GRAY, fill: GRAY },
          margins: { top: mm(1.5), bottom: mm(1.5), left: mm(3), right: mm(3) },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: pt(10), color: DARK, font: 'Calibri' })] })],
        }),
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          margins: { top: mm(1.5), bottom: mm(1.5), left: mm(3), right: mm(3) },
          children: [new Paragraph({ children: [new TextRun({ text: value, size: pt(10), color: TXT, font: 'Calibri' })] })],
        }),
      ],
    })),
  });
}

function featureTable(features) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: mm(1), bottom: mm(1), left: mm(2), right: mm(2) },
    borders: {
      top:    { style: BorderStyle.SINGLE, color: LGRAY, size: 4 },
      bottom: { style: BorderStyle.SINGLE, color: LGRAY, size: 4 },
      left:   { style: BorderStyle.SINGLE, color: LGRAY, size: 4 },
      right:  { style: BorderStyle.SINGLE, color: LGRAY, size: 4 },
      insideH:{ style: BorderStyle.SINGLE, color: LGRAY, size: 4 },
      insideV:{ style: BorderStyle.NONE },
    },
    rows: [
      // header
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: [new Paragraph({ children: [new TextRun({ text: 'Fonctionnalité', bold: true, size: pt(10), color: WHITE, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, size: pt(10), color: WHITE, font: 'Calibri' })] })],
          }),
        ],
      }),
      ...features.map(([feat, desc], idx) => new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? WHITE : GRAY, fill: idx % 2 === 0 ? WHITE : GRAY },
            margins: { top: mm(1.5), bottom: mm(1.5), left: mm(3), right: mm(3) },
            children: [new Paragraph({ children: [new TextRun({ text: feat, bold: true, size: pt(10), color: DARK, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? WHITE : GRAY, fill: idx % 2 === 0 ? WHITE : GRAY },
            margins: { top: mm(1.5), bottom: mm(1.5), left: mm(3), right: mm(3) },
            children: [new Paragraph({ children: [new TextRun({ text: desc, size: pt(10), color: TXT, font: 'Calibri' })] })],
          }),
        ],
      })),
    ],
  });
}

function loadImage(relPath, w, h) {
  try {
    const buf = readFileSync(path.join(__dirname, relPath));
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 160 },
      children: [
        new ImageRun({
          data: buf,
          transformation: { width: w, height: h },
          type: 'png',
        }),
      ],
    });
  } catch {
    return space(80);
  }
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
    children: [
      new TextRun({ text, italics: true, size: pt(9), color: SUBTXT, font: 'Calibri' }),
    ],
  });
}

// ── Cover page ───────────────────────────────────────────────────────────────
function buildCoverPage() {
  return [
    space(cm(2.5)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new ImageRun({
          data: readFileSync(path.join(__dirname, 'public/logoSNHFINAL.png')),
          transformation: { width: 110, height: 130 },
          type: 'png',
        }),
      ],
    }),
    space(cm(1)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
      children: [
        new TextRun({ text: '', size: pt(4) }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
      children: [
        new TextRun({
          text: 'SOCIÉTÉ NATIONALE DES HYDROCARBURES',
          bold: true,
          size: pt(13),
          color: GOLD,
          font: 'Calibri',
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
      children: [
        new TextRun({
          text: 'Direction des Ressources Humaines',
          bold: false,
          size: pt(11),
          color: WHITE,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
      children: [new TextRun({ text: '', size: pt(6) })],
    }),
    space(cm(1.2)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: '', size: pt(1) }),
      ],
      border: { bottom: { color: GOLD, size: 8, space: 0, style: BorderStyle.SINGLE } },
    }),
    space(cm(1)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'DOSSIER DE PRÉSENTATION', bold: true, size: pt(9), color: SUBTXT, font: 'Calibri', allCaps: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({
          text: 'Portail de Recrutement Numérique SNH',
          bold: true,
          size: pt(22),
          color: DARK,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 160 },
      children: [
        new TextRun({
          text: 'Modules, fonctionnalités et écrans principaux',
          size: pt(13),
          color: SUBTXT,
          font: 'Calibri',
          italics: true,
        }),
      ],
    }),
    space(cm(1)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new ImageRun({
          data: readFileSync(path.join(__dirname, 'public/assets/images/image copy copy.png')),
          transformation: { width: 530, height: 250 },
          type: 'png',
        }),
      ],
    }),
    caption('Page d\'accueil publique du Portail de Recrutement SNH'),
    space(cm(1.5)),
    twoColTable([
      ['Document préparé par', 'Direction des Ressources Humaines – DRH/DAD-RH'],
      ['Destinataire', 'Madame le Chargé de Recrutement 2 (CR2)'],
      ['Objet', 'Présentation au Directoire – Portail numérique de recrutement'],
      ['Version', '1.0 – Juillet 2026'],
      ['Classification', 'Usage interne – Confidentiel'],
    ]),
    pageBreak(),
  ];
}

// ── Table of contents (static) ────────────────────────────────────────────────
function buildTOC() {
  const sections = [
    ['1.', 'Présentation générale', '3'],
    ['2.', 'Page d\'accueil publique & espace candidat', '4'],
    ['3.', 'Espace candidat connecté – Tableau de bord', '5'],
    ['4.', 'Profil candidat & gestion documentaire', '6'],
    ['5.', 'Offres d\'emploi & processus de candidature', '7'],
    ['6.', 'Module Cvthèque – Administration RH', '8'],
    ['7.', 'Tableau de bord RH / DRH', '10'],
    ['8.', 'Gestion des employés & organigramme', '11'],
    ['9.', 'Module Paie', '12'],
    ['10.', 'Module Performance & Évaluation', '13'],
    ['11.', 'Module Formation', '14'],
    ['12.', 'Module QVCT', '15'],
    ['13.', 'Module Assistant IA', '16'],
    ['14.', 'Sécurité, rôles & gestion des accès', '17'],
    ['15.', 'Architecture technique & déploiement', '18'],
  ];
  return [
    heading1('SOMMAIRE'),
    space(100),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE },
      },
      rows: sections.map(([num, title, page], idx) => new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? GRAY : WHITE, fill: idx % 2 === 0 ? GRAY : WHITE },
            margins: { top: mm(2), bottom: mm(2), left: mm(3) },
            children: [new Paragraph({ children: [new TextRun({ text: num, bold: true, size: pt(10.5), color: GREEN, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 84, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? GRAY : WHITE, fill: idx % 2 === 0 ? GRAY : WHITE },
            margins: { top: mm(2), bottom: mm(2), left: mm(3) },
            children: [new Paragraph({ children: [new TextRun({ text: title, size: pt(10.5), color: TXT, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? GRAY : WHITE, fill: idx % 2 === 0 ? GRAY : WHITE },
            margins: { top: mm(2), bottom: mm(2), right: mm(3) },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: page, size: pt(10.5), color: SUBTXT, font: 'Calibri' })] })],
          }),
        ],
      })),
    }),
    pageBreak(),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

function section1() {
  return [
    heading1('1. PRÉSENTATION GÉNÉRALE'),
    space(100),
    heading2('1.1 Contexte et objectifs'),
    body(
      'La Société Nationale des Hydrocarbures (SNH) a entrepris la modernisation de son processus de recrutement ' +
      'à travers le déploiement d\'un portail numérique intégré. Cette plateforme répond aux exigences de la Note ' +
      'de Service N°570 complétant la NS N°193 relative au recrutement du personnel à la SNH.'
    ),
    body(
      'Le portail se décline en deux espaces distincts et complémentaires : un portail public accessible à tous les ' +
      'candidats externes, et une interface d\'administration dédiée aux équipes RH pour le pilotage de l\'ensemble ' +
      'du cycle de recrutement.'
    ),
    space(120),
    heading2('1.2 Périmètre fonctionnel'),
    featureTable([
      ['Portail Candidat',   'Interface publique de dépôt et suivi des candidatures (emploi, stage académique, stage professionnel, candidature spontanée)'],
      ['Cvthèque / Admin',  'Gestion complète du pipeline de recrutement, évaluation des candidats, jury, lettres de mission'],
      ['SIRH intégré',       'Gestion des employés, paie, performance, formation, temps & présence, QVCT'],
      ['Rapports & KPIs',    'Tableaux de bord analytiques, rapports PDF/Word, statistiques de recrutement en temps réel'],
      ['Assistant IA',       'Analyse automatique des profils, matching compétences-poste, génération de CV et rapports'],
      ['Sécurité',           'Authentification Supabase, RLS (Row-Level Security), gestion des rôles granulaire, journal d\'audit'],
    ]),
    space(120),
    heading2('1.3 Utilisateurs cibles'),
    bullet('Candidats externes (emploi CDI/CDD, stages, candidatures spontanées)'),
    bullet('Chargés de Recrutement (CR1, CR2) — gestion du pipeline et évaluation'),
    bullet('Direction des Ressources Humaines (DRH / DAD-RH)'),
    bullet('Directeur Général et membres du Directoire — tableaux de bord exécutifs'),
    bullet('Responsables opérationnels — gestion des équipes, performance, formation'),
    bullet('Gestionnaires de paie — traitement mensuel des bulletins'),
    pageBreak(),
  ];
}

function section2() {
  return [
    heading1('2. PAGE D\'ACCUEIL PUBLIQUE & ESPACE CANDIDAT'),
    space(100),
    loadImage('public/assets/images/image copy copy.png', 530, 250),
    caption('Fig. 1 – Page d\'accueil publique du Portail SNH (version anglaise affichée)'),
    space(80),
    heading2('2.1 Description générale'),
    body(
      'La page d\'accueil constitue la vitrine externe de la SNH pour le recrutement. Elle est accessible sans ' +
      'authentification, disponible en français et en anglais, et présente l\'ensemble des offres d\'emploi publiées ' +
      'en temps réel. Le fond visuel, inspiré des installations industrielles pétrolières, renforce le positionnement ' +
      'sectoriel de la SNH.'
    ),
    space(80),
    heading2('2.2 Fonctionnalités détaillées'),
    featureTable([
      ['Hero section',              'Bandeau d\'accroche avec compteur dynamique des offres disponibles, slogan institutionnel, appel à l\'action "Rejoindre la SNH"'],
      ['Barre de recherche',        'Recherche full-text sur le titre de poste, mots-clés et localisation, avec filtre par type de contrat (CDI, CDD, Stage académique, Stage professionnel)'],
      ['Liste des offres',          'Affichage en cartes avec : intitulé du poste, référence, localisation, date de clôture, type de contrat coloré, compétences requises'],
      ['Détail de l\'offre',        'Vue expandable : description complète, profil recherché, expérience requise, niveau de diplôme, avantages, conditions, langues requises'],
      ['Candidature spontanée',     'Section dédiée aux candidatures hors offre publiée (emploi, stage académique, stage professionnel)'],
      ['Bascule FR/EN',             'Traduction complète de l\'interface et des intitulés de postes en anglais via le module de traduction IA intégré'],
      ['Navigation responsive',     'Interface optimisée mobile, tablette et desktop – menu hamburger sur petits écrans'],
      ['Footer institutionnel',     'Pied de page avec logo SNH, mention légale, lien vers le portail officiel de la SNH'],
    ]),
    space(80),
    heading2('2.3 Création de compte candidat'),
    body(
      'Le candidat peut créer son compte directement depuis la page d\'accueil en cliquant sur "Créer un compte". ' +
      'Le formulaire d\'inscription collecte prénom, nom, adresse e-mail et mot de passe. Un e-mail de bienvenue ' +
      'est automatiquement envoyé. Après connexion, le candidat est redirigé vers son espace personnel.'
    ),
    pageBreak(),
  ];
}

function section3() {
  return [
    heading1('3. ESPACE CANDIDAT CONNECTÉ – TABLEAU DE BORD'),
    space(100),
    heading2('3.1 Vue d\'ensemble du tableau de bord'),
    body(
      'Une fois connecté, le candidat accède à un espace personnel structuré en plusieurs modules accessibles ' +
      'depuis une barre de navigation latérale. Le tableau de bord centralise les indicateurs clés de son parcours.'
    ),
    space(80),
    featureTable([
      ['Compteurs d\'activité',     '4 indicateurs en temps réel : candidatures soumises, offres disponibles, entretiens planifiés, pourcentage de complétion du profil'],
      ['Complétion du profil',      'Jauge visuelle par section (informations personnelles, formations, expériences, compétences, documents). Score sur 100% calculé de manière cohérente'],
      ['Activité récente',          'Timeline des dernières candidatures avec statut, date et intitulé du poste'],
      ['Offres recommandées (IA)',  'Algorithme de matching compétences/poste qui suggère les offres les plus compatibles avec le profil du candidat'],
      ['Notification en temps réel','Cloche de notification avec badge pour les nouvelles mises à jour (convocations, décisions, messages RH)'],
    ]),
    space(80),
    heading2('3.2 Navigation latérale'),
    body('La barre de navigation permet d\'accéder aux 7 espaces du portail candidat :'),
    bullet('Tableau de bord — vue synthétique'),
    bullet('Mon profil — saisie et mise à jour du CV numérique'),
    bullet('Offres d\'emploi — consultation et candidature aux postes publiés'),
    bullet('Candidature spontanée — dépôt hors offre publiée'),
    bullet('Mes candidatures — suivi du pipeline de recrutement'),
    bullet('Mes documents — gestion du dossier de candidature'),
    bullet('Notifications — historique des communications RH'),
    space(120),
    heading2('3.3 Filtre des offres par niveau de diplôme'),
    body(
      'Le système filtre automatiquement les offres affichées au candidat en fonction de son niveau de diplôme ' +
      'le plus élevé déclaré dans son profil. Un écart de plus d\'un niveau hiérarchique (ex. BAC+2 vs BAC+5) ' +
      'exclut l\'offre de la liste consultable, garantissant la cohérence des candidatures reçues.'
    ),
    pageBreak(),
  ];
}

function section4() {
  return [
    heading1('4. PROFIL CANDIDAT & GESTION DOCUMENTAIRE'),
    space(100),
    heading2('4.1 Profil candidat – 6 onglets'),
    body(
      'La section "Mon Profil" est organisée en 6 onglets thématiques permettant la saisie complète ' +
      'du CV numérique du candidat. La sauvegarde est globale et persistée en base de données Supabase.'
    ),
    space(80),
    featureTable([
      ['Informations personnelles',  'Prénom, nom, date de naissance, genre, titre professionnel, téléphones, ville de résidence, pays, nationalité, CNI/Passeport, disponibilité, prétention salariale, réseaux sociaux, présentation libre'],
      ['Parcours académique',        'Formations saisies avec : niveau de diplôme (obligatoire), diplôme obtenu, établissement, domaine d\'études (obligatoire), pays, ville, année de début (obligatoire), année de fin, mention, spécialisation. Support de formations multiples'],
      ['Expériences professionnelles', 'Postes occupés avec : intitulé, entreprise, secteur, type de contrat, ville, dates de début/fin, missions et réalisations. Indicateur "poste actuel"'],
      ['Compétences',                'Sélection depuis un catalogue centralisé de compétences SNH (techniques, soft skills, certifications) + ajout de compétences personnalisées. Niveau par compétence (débutant → expert)'],
      ['Langues',                    'Déclaration des langues maîtrisées avec niveau (débutant → natif/maternel). Affichage par étoiles'],
      ['Générer CV',                 'Export PDF du CV mis en forme automatiquement depuis les données du profil, aux couleurs SNH'],
    ]),
    space(80),
    heading2('4.2 Gestion des documents'),
    body(
      'Chaque candidature nécessite un dossier documentaire adapté au type de poste. Le module "Mes documents" ' +
      'gère le téléversement et la vérification des pièces justificatives.'
    ),
    featureTable([
      ['Types de documents',     'CV, lettre de motivation, diplômes, relevés de notes, pièce d\'identité, certificats de travail, certificats médicaux, lettres de recommandation'],
      ['Documents obligatoires', 'La liste des pièces requises varie selon le type de contrat (emploi CDI/CDD, stage académique, stage professionnel) et est affichée dynamiquement'],
      ['Validation',             'Indicateur visuel (vert/orange) du taux de complétion du dossier. Avertissement si pièces manquantes avant soumission'],
      ['Stockage sécurisé',      'Documents stockés dans Supabase Storage avec politiques de sécurité RLS. URLs signées pour les téléchargements'],
      ['Date d\'expiration',     'Possibilité de renseigner la date de validité des documents (CNI, diplômes, certificats médicaux)'],
    ]),
    pageBreak(),
  ];
}

function section5() {
  return [
    heading1('5. OFFRES D\'EMPLOI & PROCESSUS DE CANDIDATURE'),
    space(100),
    heading2('5.1 Consultation des offres'),
    featureTable([
      ['Recherche & filtres',    'Recherche textuelle + filtre par type de contrat. Les offres sont triées par date de publication'],
      ['Carte de poste',         'Intitulé, localisation, type de contrat (badge coloré), date de clôture, compétences requises sous forme de tags'],
      ['Détail de l\'offre',     'Modale complète : description, profil, expérience, niveau de diplôme requis, langues, avantages, conditions de travail, date limite'],
      ['Filtre niveau diplôme',  'Seules les offres compatibles avec le niveau de diplôme du candidat sont affichées (±1 niveau de la hiérarchie BAC → Doctorat)'],
      ['Matching IA',            'Score de compatibilité calculé par l\'IA (compétences, expérience, formation) affiché en pourcentage sur la carte de poste recommandé'],
    ]),
    space(80),
    heading2('5.2 Dépôt d\'une candidature'),
    body(
      'Le candidat accède au formulaire de candidature depuis la liste des offres ou les recommandations. ' +
      'Avant soumission, le système vérifie la présence des documents obligatoires et les limites de candidatures.'
    ),
    featureTable([
      ['Vérification des documents', 'Contrôle automatique des pièces obligatoires selon le type de contrat avant de permettre la soumission'],
      ['Lettre de motivation',        'Champ de rédaction intégré avec modèle pré-rempli adaptable'],
      ['Limite de candidatures',      'Maximum 5 candidatures actives simultanées par candidat (toutes offres confondues). Maximum 3 tentatives par offre'],
      ['Notification automatique',    'E-mail de confirmation envoyé au candidat et notification RH lors de chaque nouvelle candidature'],
      ['Retrait de candidature',      'Le candidat peut retirer sa candidature depuis l\'espace "Mes candidatures" (retrait possible uniquement pour les statuts non avancés)'],
    ]),
    space(80),
    heading2('5.3 Pipeline de recrutement (côté candidat)'),
    body('Le candidat suit l\'avancement de sa candidature via un indicateur visuel des étapes :'),
    bullet('Soumis — candidature reçue par la RH'),
    bullet('Tests techniques — convocation aux épreuves techniques'),
    bullet('Tests psychotechniques — évaluation psychométrique'),
    bullet('Entretien — convocation aux entretiens'),
    bullet('Visite médicale — aptitude médicale'),
    bullet('Enquête de moralité — vérification des antécédents'),
    bullet('Authentification des diplômes — vérification des titres'),
    bullet('En essai — période d\'essai en cours'),
    bullet('Affectation — poste et direction attribués'),
    bullet('Titularisé(e) — intégration définitive'),
    pageBreak(),
  ];
}

function section6() {
  return [
    heading1('6. MODULE CVTHÈQUE – ADMINISTRATION RH'),
    space(100),
    loadImage('public/assets/images/image.png', 530, 310),
    caption('Fig. 2 – Interface d\'administration de la Cvthèque SNH : tableaux de bord, rapports et fiche candidat'),
    space(80),
    heading2('6.1 Vue d\'ensemble'),
    body(
      'La Cvthèque est l\'interface centrale des Chargés de Recrutement. Elle permet de gérer l\'intégralité ' +
      'du pipeline de recrutement depuis la réception des candidatures jusqu\'à l\'intégration du recruté. ' +
      'Elle est accessible via le SIRH SNH avec les rôles "Recrutement" et "DRH".'
    ),
    space(80),
    heading2('6.2 Gestion des candidats'),
    featureTable([
      ['Répertoire des candidats',   'Liste paginée de tous les candidats avec filtres : statut, offre, période, source (portail / spontanée). Export Excel/CSV'],
      ['Fiche candidat complète',    'Vue 360° : profil, CV, compétences, langues, expériences, formations, documents, score IA, recommandeur'],
      ['Téléchargement des dossiers','Accès sécurisé aux documents fournis par les candidats (CV, diplômes, lettres de recommandation)'],
      ['Génération de lettre IA',    'Génération automatique par IA de la lettre d\'engagement à l\'essai personnalisée pour le candidat retenu'],
      ['Rapport de la fiche recrue', 'Export Word de la Synthèse Fiche Recrue officielle, conforme au modèle SNH, avec toutes les données du candidat'],
    ]),
    space(80),
    heading2('6.3 Pipeline de recrutement (côté RH)'),
    featureTable([
      ['Changement de statut',        'Glissement ou sélection du statut de pipeline. Chaque changement déclenche une notification automatique au candidat'],
      ['Jury d\'évaluation',          'Saisie des notes et appréciations du jury par critère (entretien, tests, aptitude). Calcul automatique du score global'],
      ['Convocation & communication', 'Envoi d\'e-mails standardisés (convocation entretien, résultats, lettres de décision) directement depuis la fiche candidat'],
      ['Gestion multi-offres',        'Suivi simultané des candidatures sur plusieurs postes ouverts'],
      ['Demandes de recrutement',     'Workflow de création et validation des demandes de recrutement liées aux besoins des directions'],
    ]),
    space(80),
    heading2('6.4 Tableaux de bord & rapports de recrutement'),
    featureTable([
      ['KPIs recrutement',                      'Taux de conversion, délais moyens par étape, nombre de candidatures par source, taux de présence aux tests'],
      ['Graphiques d\'évolution',               'Courbes du volume de candidatures dans le temps, histogrammes par offre et par période'],
      ['Rapport global sur une période',        'Export Word : récapitulatif toutes candidatures reçues sur une période donnée, par type de candidature'],
      ['Rapport par offre précise',             'Synthèse détaillée d\'une offre : statistiques, liste des candidats, résultats du pipeline'],
      ['Liste par phase de pipeline',           'Export des candidats à une étape précise du processus de sélection pour une offre donnée'],
      ['Synthèse Fiche Recrue',                 'Document officiel complet du candidat retenu, prêt à intégrer le dossier administratif'],
    ]),
    pageBreak(),
  ];
}

function section7() {
  return [
    heading1('7. TABLEAU DE BORD RH / DRH'),
    space(100),
    heading2('7.1 Dashboard DRH exécutif'),
    body(
      'Le tableau de bord DRH offre une vision transversale de toutes les activités RH en temps réel. ' +
      'Il est conçu pour le pilotage stratégique par la Direction des Ressources Humaines et le Directoire.'
    ),
    featureTable([
      ['Effectif total',               'Comptage en temps réel du personnel actif, répartition par direction/entité, par genre, par statut contractuel'],
      ['Masse salariale',              'Indicateurs de la masse salariale du mois courant, évolution mensuelle, répartition par catégorie'],
      ['Recrutement en cours',         'Nombre de postes ouverts, candidatures reçues ce mois, taux de conversion global, postes pourvus'],
      ['Formations planifiées',        'Sessions en cours, nombre de participants, heures de formation cumulées'],
      ['Absences & congés',            'Taux d\'absentéisme, congés en cours, demandes en attente de validation'],
      ['Alertes & actions requises',   'Notifications des actions prioritaires : contrats arrivant à échéance, évaluations en retard, documents manquants'],
    ]),
    space(80),
    heading2('7.2 Dashboards spécialisés par rôle'),
    featureTable([
      ['Dashboard Manager',          'Vue équipe : effectif direct, absences de l\'équipe, performances des collaborateurs, demandes en attente'],
      ['Dashboard Responsable Paie', 'État de la paie du mois : fiches à traiter, cotisations à verser, anomalies détectées'],
      ['Dashboard QVCT',             'Bien-être au travail : discussions en cours, indicateurs de satisfaction, enquêtes récentes'],
      ['Dashboard Carrière',         'Plans de développement, promotions prévues, besoins en formation identifiés'],
      ['Dashboard Recrutement',      'Pipeline global, offres actives, candidatures à traiter, entretiens planifiés de la semaine'],
    ]),
    pageBreak(),
  ];
}

function section8() {
  return [
    heading1('8. GESTION DES EMPLOYÉS & ORGANIGRAMME'),
    space(100),
    heading2('8.1 Répertoire des employés'),
    featureTable([
      ['Liste des employés',         'Vue tableau paginée avec recherche, filtres par direction/entité, statut, type de contrat. Export Excel'],
      ['Fiche employé complète',     'Informations personnelles, contrat, poste occupé, hiérarchie, compétences, photo, documents administratifs'],
      ['Gestion des contrats',       'Suivi des dates de contrat, alertes d\'échéance, procédure de résiliation avec formulaire dédié'],
      ['Photo de profil',            'Upload et recadrage de la photo de l\'employé stockée dans Supabase Storage'],
      ['Historique de carrière',     'Parcours interne : affectations successives, promotions, changements de poste'],
    ]),
    space(80),
    heading2('8.2 Organigramme interactif'),
    body(
      'L\'organigramme représente la structure hiérarchique complète de la SNH avec ses entités, ' +
      'directions et services. Il se génère dynamiquement depuis les données RH.'
    ),
    featureTable([
      ['Arborescence dynamique',   'Représentation visuelle de la hiérarchie : Directoire → Directions → Services → Postes'],
      ['Navigation interactive',   'Déploiement/réduction des nœuds, recherche d\'un employé dans l\'organigramme'],
      ['Fiche au clic',            'Affichage de la fiche résumée d\'un employé au clic sur son nœud (photo, poste, contacts)'],
      ['Export',                   'Impression et export de l\'organigramme en PDF'],
    ]),
    space(80),
    heading2('8.3 Gestion de la structure organisationnelle'),
    body(
      'Le module d\'administration de la structure permet de créer, modifier et réorganiser ' +
      'les entités, directions, services et niveaux hiérarchiques de la SNH.'
    ),
    pageBreak(),
  ];
}

function section9() {
  return [
    heading1('9. MODULE PAIE'),
    space(100),
    heading2('9.1 Traitement de la paie mensuelle'),
    body(
      'Le module paie couvre l\'intégralité du traitement mensuel des rémunérations, depuis ' +
      'la saisie des éléments variables jusqu\'à l\'édition des bulletins de paie.'
    ),
    featureTable([
      ['Génération automatique',     'Calcul de la paie brute et nette de tous les employés sur la base des paramètres contractuels et des éléments variables du mois'],
      ['Grille salariale',           'Gestion des catégories, échelons et indices. Mise à jour des barèmes par décision DRH'],
      ['Éléments variables',         'Saisie des primes, indemnités, heures supplémentaires, retenues, avances sur salaire pour chaque employé'],
      ['Cotisations sociales',       'Calcul automatique CNPS, IRPP, taxe spéciale et autres charges patronales et salariales selon la réglementation camerounaise'],
      ['Paramètres fiscaux',         'Configuration des tranches IRPP, abattements, plafonds de cotisations'],
      ['Bulletin de paie PDF',       'Génération du bulletin de paie individuel aux couleurs SNH, conforme au modèle réglementaire. Accessible par l\'employé dans son espace personnel'],
      ['Administration de la paie',  'Historique des traitements, états récapitulatifs par direction, exports comptables'],
    ]),
    space(80),
    heading2('9.2 Espace employé – Fiche de paie'),
    body(
      'Chaque employé accède à ses bulletins de paie depuis son espace personnel. ' +
      'L\'historique des 12 derniers mois est consultable et téléchargeable en PDF.'
    ),
    pageBreak(),
  ];
}

function section10() {
  return [
    heading1('10. MODULE PERFORMANCE & ÉVALUATION'),
    space(100),
    heading2('10.1 Gestion des objectifs'),
    featureTable([
      ['Objectifs annuels',        'Définition, pondération et suivi des objectifs annuels par employé, validés par le manager. Calcul du taux d\'atteinte en fin de période'],
      ['OKR (Objectifs & Résultats Clés)', 'Méthodologie OKR : objectifs stratégiques déclinés en résultats clés mesurables. Tableau de suivi collaboratif'],
      ['Indicateurs KPI',          'Bibliothèque de KPIs par fonction. Dashboard de suivi en temps réel avec seuils d\'alerte'],
    ]),
    space(80),
    heading2('10.2 Évaluations & entretiens'),
    featureTable([
      ['Entretiens annuels',         'Planification, conduite et enregistrement des entretiens d\'évaluation. Formulaire structuré par compétences et objectifs'],
      ['Évaluation 360°',            'Collecte des feedbacks multi-sources (manager, pairs, collaborateurs, auto-évaluation)'],
      ['Évaluation RH',              'Vue consolidée RH des évaluations avec comparaison inter-équipes et détection des hauts potentiels'],
      ['Référentiel de compétences', 'Bibliothèque des compétences métier par poste/niveau. Carte des compétences et écarts à développer'],
    ]),
    space(80),
    heading2('10.3 Développement & suivi'),
    featureTable([
      ['Plans de développement',   'Plans individuels de montée en compétences liés aux évaluations. Actions de formation recommandées'],
      ['Suivi des dossiers',        'Gestion des dossiers de cas particuliers : sanctions, félicitations, alertes, accompagnements'],
      ['Analytics performance',    'Analyses statistiques : distribution des notes, corrélation performance/ancienneté, évolutions par direction'],
    ]),
    pageBreak(),
  ];
}

function section11() {
  return [
    heading1('11. MODULE FORMATION'),
    space(100),
    body(
      'Le module Formation couvre le cycle complet de gestion des formations : du plan de formation ' +
      'annuel jusqu\'au suivi des certifications obtenues.'
    ),
    featureTable([
      ['Plan de formation',         'Élaboration du plan annuel de formation par direction, avec budgétisation et priorisation des besoins'],
      ['Catalogue de formations',   'Bibliothèque des programmes de formation internes et externes, avec objectifs, durée, coût, prérequis'],
      ['Sessions de formation',     'Planification des sessions : dates, lieu, formateur, participants, statut. Gestion des inscriptions et listes d\'attente'],
      ['Suivi individuel',          'Historique des formations suivies par employé, certifications obtenues, heures de formation capitalisées'],
      ['Évaluation des formations', 'Questionnaire de satisfaction post-formation, évaluation des acquis, impact sur la performance'],
      ['Rapports formation',        'Tableau de bord : taux de réalisation du plan, coût par employé, retour sur investissement formation'],
    ]),
    pageBreak(),
  ];
}

function section12() {
  return [
    heading1('12. MODULE QVCT – QUALITÉ DE VIE ET CONDITIONS DE TRAVAIL'),
    space(100),
    body(
      'Le module QVCT (Qualité de Vie et Conditions de Travail) permet de mesurer et d\'améliorer ' +
      'le bien-être des collaborateurs à travers des enquêtes, des discussions et des indicateurs dédiés.'
    ),
    featureTable([
      ['Enquêtes QVCT',             'Création et diffusion d\'enquêtes de satisfaction et de bien-être auprès des employés. Analyse statistique des résultats'],
      ['Discussions QVCT',          'Espace de dialogue structuré : thématiques de bien-être, conditions de travail, charge de travail, relations professionnelles'],
      ['Analyse IA des discussions','L\'assistant IA analyse automatiquement les discussions pour détecter les signaux faibles et produire une synthèse thématique'],
      ['Indicateurs bien-être',     'Tableau de bord : score de bien-être global, évolution mensuelle, comparatif par direction, alertes'],
      ['Actions correctives',       'Suivi des plans d\'action issus des enquêtes QVCT : responsable, échéance, statut d\'avancement'],
    ]),
    pageBreak(),
  ];
}

function section13() {
  return [
    heading1('13. MODULE ASSISTANT IA'),
    space(100),
    body(
      'L\'assistant IA est un module transversal intégré dans plusieurs espaces du portail. ' +
      'Il utilise des modèles de langage avancés (API Claude d\'Anthropic) pour automatiser les tâches à forte valeur ajoutée.'
    ),
    featureTable([
      ['Matching candidat-poste',      'Calcul d\'un score de compatibilité entre le profil d\'un candidat et les exigences d\'un poste (compétences, expérience, formation). Génération d\'une synthèse en langage naturel'],
      ['Analyse des compétences',      'Détection automatique des compétences présentes dans un profil, des manques par rapport au poste visé, et recommandations de développement'],
      ['Génération de CV IA',          'Production d\'un CV professionnel structuré en PDF à partir des données du profil du candidat, optimisé pour le poste visé'],
      ['Génération de rapports RH',    'Rédaction automatique de rapports analytiques sur le recrutement, la performance ou la formation à partir des données du SIRH'],
      ['Analyse discussions QVCT',     'Lecture et synthèse des discussions QVCT pour identifier les sujets récurrents et produire des recommandations'],
      ['Traduction des offres',        'Traduction automatique EN/FR des intitulés de postes, descriptions et exigences via IA'],
      ['Lettre d\'engagement essai',   'Génération automatique de la lettre d\'engagement à l\'essai pour le candidat retenu, personnalisée et conforme au modèle SNH'],
      ['Chatbot RH',                  'Assistant conversationnel disponible pour les candidats et les équipes RH, répondant aux questions sur le portail et les processus'],
    ]),
    pageBreak(),
  ];
}

function section14() {
  return [
    heading1('14. SÉCURITÉ, RÔLES & GESTION DES ACCÈS'),
    space(100),
    heading2('14.1 Modèle de rôles'),
    body(
      'Le portail implémente un contrôle d\'accès basé sur les rôles (RBAC). Chaque utilisateur ' +
      'se voit attribuer un ou plusieurs rôles déterminant ses droits de lecture, écriture et action.'
    ),
    featureTable([
      ['admin',               'Accès complet à toutes les fonctionnalités. Gestion des comptes, des rôles et des paramètres système'],
      ['drh / dad_rh',        'Accès à l\'ensemble du SIRH : employés, paie, recrutement, performance, formation, QVCT, rapports'],
      ['recrutement',         'Accès à la Cvthèque, pipeline de recrutement, rapports recrutement'],
      ['manager',             'Accès à son équipe, demandes de congés, évaluations et formations de ses collaborateurs'],
      ['responsable_paie',    'Module paie : saisie éléments variables, génération paie, bulletins, états récapitulatifs'],
      ['responsable_qvct',    'Module QVCT : enquêtes, discussions, indicateurs bien-être'],
      ['responsable_carriere','Plans de développement, gestion des compétences, parcours carrière'],
      ['employe',             'Espace employé : bulletin de paie, profil, congés, formations, évaluations'],
      ['candidat',            'Portail candidat : profil, candidatures, documents, notifications'],
    ]),
    space(80),
    heading2('14.2 Sécurité des données'),
    featureTable([
      ['Authentification',      'Supabase Auth : e-mail/mot de passe. Tokens JWT. Changement de mot de passe obligatoire à la première connexion pour les comptes créés par l\'admin'],
      ['RLS (Row Level Security)', 'Politiques RLS activées sur toutes les tables Supabase. Chaque utilisateur ne peut accéder qu\'aux données qui lui sont autorisées'],
      ['Journal d\'audit',      'Enregistrement de toutes les actions sensibles (connexions, modifications de données, changements de rôle, exports) avec horodatage et adresse IP'],
      ['Événements de sécurité','Table dédiée aux événements de sécurité : tentatives d\'accès non autorisé, changements de mot de passe, réinitialisations'],
      ['Stockage sécurisé',     'Documents candidats dans Supabase Storage avec URL signées temporaires. Politique de lecture strictement personnelle'],
      ['HTTPS',                 'Toutes les communications entre le navigateur et le serveur sont chiffrées (TLS 1.3)'],
    ]),
    pageBreak(),
  ];
}

function section15() {
  return [
    heading1('15. ARCHITECTURE TECHNIQUE & DÉPLOIEMENT'),
    space(100),
    heading2('15.1 Stack technologique'),
    featureTable([
      ['Frontend',      'React 18 + TypeScript + Vite 5. Interface responsive Tailwind CSS. Icônes Lucide React'],
      ['Backend / BDD', 'Supabase (PostgreSQL). Base de données relationnelle avec 80+ tables, triggers, fonctions PL/pgSQL'],
      ['Auth',          'Supabase Auth — e-mail/mot de passe. Sessions JWT. Politiques RLS par table'],
      ['Edge Functions','Supabase Edge Functions (Deno/TypeScript) pour les traitements serveur sécurisés : envoi d\'e-mails, appels IA, gestion des rôles'],
      ['IA / LLM',      'API Claude (Anthropic) via Edge Functions. Traitement sécurisé côté serveur — clé API non exposée au client'],
      ['Stockage',      'Supabase Storage pour les documents candidats et photos. Politique de sécurité par candidat/employé'],
      ['Déploiement',   'Application déployée sur la plateforme Bolt (StackBlitz). CDN mondial. HTTPS natif'],
      ['PDF / DOCX',    'Génération côté client des bulletins de paie, CV, rapports et documents Word avec jsPDF et docx.js'],
    ]),
    space(80),
    heading2('15.2 Migrations & versionnement'),
    body(
      'La base de données est gérée par des migrations SQL versionnées (130+ fichiers). ' +
      'Chaque évolution du schéma est tracée, réversible et documentée. L\'environnement est ' +
      'reproductible à l\'identique sur tout projet Supabase.'
    ),
    space(80),
    heading2('15.3 Évolutions prévues (Perspectives 2026–2027)'),
    bullet('Intégration avec le système ERP/Paie existant de la SNH via API'),
    bullet('Module de gestion des missions et déplacements professionnels'),
    bullet('Application mobile Android/iOS pour l\'espace employé'),
    bullet('Intégration SSO (Single Sign-On) avec l\'Active Directory SNH'),
    bullet('Module de gestion avancée des talents et planification de la succession'),
    bullet('Tableau de bord prédictif RH (turnover, absentéisme, besoins futurs)'),
    space(160),
    rule(),
    space(80),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      children: [
        new ImageRun({
          data: readFileSync(path.join(__dirname, 'public/logoSNHFINAL.png')),
          transformation: { width: 55, height: 65 },
          type: 'png',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({ text: 'Société Nationale des Hydrocarbures – Direction des Ressources Humaines', size: pt(9), color: SUBTXT, font: 'Calibri', bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'Portail Numérique de Recrutement SNH  ·  Dossier de présentation au Directoire  ·  Juillet 2026', size: pt(8.5), color: SUBTXT, font: 'Calibri', italics: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 0 },
      children: [
        new TextRun({ text: 'Document confidentiel – Usage interne uniquement', size: pt(8), color: RED, font: 'Calibri', bold: true }),
      ],
    }),
  ];
}

// ── Assemble & write ─────────────────────────────────────────────────────────
async function main() {
  const children = [
    ...buildCoverPage(),
    ...buildTOC(),
    ...section1(),
    ...section2(),
    ...section3(),
    ...section4(),
    ...section5(),
    ...section6(),
    ...section7(),
    ...section8(),
    ...section9(),
    ...section10(),
    ...section11(),
    ...section12(),
    ...section13(),
    ...section14(),
    ...section15(),
  ];

  const doc = new Document({
    title: 'Dossier Portail Recrutement SNH',
    description: 'Présentation au Directoire – Portail Numérique de Recrutement SNH',
    creator: 'SNH – Direction des Ressources Humaines',
    sections: [{
      properties: {
        page: {
          margin: { top: cm(2), bottom: cm(2), left: cm(2.5), right: cm(2.5) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { color: LGRAY, size: 4, space: 4, style: BorderStyle.SINGLE } },
              spacing: { before: 0, after: 80 },
              children: [
                new ImageRun({
                  data: readFileSync(path.join(__dirname, 'public/logoSNHFINAL.png')),
                  transformation: { width: 28, height: 33 },
                  type: 'png',
                }),
                new TextRun({ text: '   Portail Numérique de Recrutement SNH', size: pt(9), color: SUBTXT, font: 'Calibri' }),
                new TextRun({ text: '\t', size: pt(9) }),
                new TextRun({ text: 'Dossier de présentation – Usage interne confidentiel', size: pt(8.5), color: SUBTXT, font: 'Calibri', italics: true }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: cm(16) }],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { color: LGRAY, size: 4, space: 4, style: BorderStyle.SINGLE } },
              spacing: { before: 80, after: 0 },
              children: [
                new TextRun({ text: '© 2026 SNH – DAD-RH', size: pt(8.5), color: SUBTXT, font: 'Calibri' }),
                new TextRun({ text: '\t', size: pt(8.5) }),
                new TextRun({ text: 'Page ', size: pt(8.5), color: SUBTXT, font: 'Calibri' }),
                new TextRun({ children: [PageNumber.CURRENT], size: pt(8.5), color: GREEN, font: 'Calibri' }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: cm(16) }],
            }),
          ],
        }),
      },
      children,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, 'Dossier_Presentation_Portail_Recrutement_SNH.docx');
  writeFileSync(outPath, buf);
  console.log('✅  Document généré :', outPath);
  console.log('   Taille :', (buf.length / 1024).toFixed(1), 'Ko');
}

main().catch(console.error);
