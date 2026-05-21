const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const today = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const COMPANY = {
  name: 'Société Nationale des Hydrocarbures (SNH)',
  address: 'BP 955 Yaoundé, Cameroun',
  phone: '+237 222 22 30 44',
  email: 'drh@snh.cm',
  website: 'www.snh.cm',
};

let _cachedLogo: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (_cachedLogo !== null) return _cachedLogo;
  try {
    const res = await fetch('/logoSNH.png');
    const blob = await res.blob();
    _cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    _cachedLogo = '';
  }
  return _cachedLogo;
}

const getBaseStyles = () => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @media print {
    @page { size: A4; margin: 2cm; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; padding-top: 0 !important; }
    .no-print { display: none !important; }
    .print-spacer { display: none !important; }
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    padding: 50px;
    background: #f8fafc;
    color: #1e293b;
    font-size: 12pt;
    line-height: 1.6;
  }
  .page {
    background: white;
    max-width: 210mm;
    margin: 0 auto;
    padding: 40px 50px 60px;
    box-shadow: 0 1px 8px rgba(0,0,0,0.08);
    min-height: 297mm;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #15803d;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-logo { height: 64px; object-fit: contain; }
  .company-info h1 { font-size: 14pt; font-weight: bold; color: #15803d; }
  .company-info p { font-size: 8.5pt; color: #475569; line-height: 1.5; margin-top: 3px; }
  .doc-ref { text-align: right; font-size: 9pt; color: #475569; }
  .doc-ref p { margin-bottom: 3px; }
  .doc-title {
    text-align: center;
    margin: 28px 0 8px;
    font-size: 17pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #15803d;
    text-decoration: underline;
    text-underline-offset: 6px;
  }
  .doc-subtitle {
    text-align: center;
    font-size: 10pt;
    color: #64748b;
    margin-bottom: 28px;
  }
  .body-text {
    text-align: justify;
    margin-bottom: 16px;
    font-size: 12pt;
  }
  .highlight { font-weight: bold; }
  .signature-block {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .sig-left, .sig-right { width: 45%; }
  .sig-right { text-align: right; }
  .sig-title { font-weight: bold; margin-bottom: 4px; }
  .sig-name { font-size: 11pt; color: #475569; }
  .sig-line {
    margin-top: 60px;
    border-bottom: 1px solid #94a3b8;
    margin-bottom: 8px;
  }
  .footer {
    margin-top: 50px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
  }
  .info-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #15803d;
    padding: 16px 20px;
    margin: 20px 0;
    border-radius: 0 6px 6px 0;
  }
  .info-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 11pt; }
  .info-label { font-weight: bold; min-width: 220px; color: #374151; }
  .info-value { color: #1e293b; }
`;

const getToolbarStyles = () => `
  .toolbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #0f172a;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 9999;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .toolbar-left { display: flex; align-items: center; gap: 12px; }
  .toolbar-logo { height: 28px; object-fit: contain; }
  .toolbar-title { color: #94a3b8; font-size: 13px; }
  .toolbar-badge {
    background: #15803d;
    color: white;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .toolbar-right { display: flex; gap: 8px; }
  .btn-print {
    background: #15803d;
    color: white;
    border: none;
    padding: 7px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s;
  }
  .btn-print:hover { background: #166534; }
  .btn-download {
    background: transparent;
    color: #e2e8f0;
    border: 1px solid #334155;
    padding: 7px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s;
  }
  .btn-download:hover { background: #1e293b; }
  .print-spacer { height: 56px; }
`;

function buildToolbar(logoBase64: string, title: string, filename: string): string {
  const logoImg = logoBase64
    ? `<img src="${logoBase64}" class="toolbar-logo" alt="SNH" />`
    : `<span style="color:#15803d;font-weight:bold;font-size:15px;">SNH</span>`;
  return `
    <div class="toolbar no-print">
      <div class="toolbar-left">
        ${logoImg}
        <span class="toolbar-title">${title}</span>
        <span class="toolbar-badge">PDF</span>
      </div>
      <div class="toolbar-right">
        <button class="btn-print" onclick="window.print()">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8" rx="1"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/></svg>
          Imprimer / Enregistrer PDF
        </button>
        <button class="btn-download" onclick="downloadDoc('${filename.replace(/'/g, "\\'")}')">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Telecharger
        </button>
      </div>
    </div>
    <div class="print-spacer"></div>
  `;
}

function buildScript(filename: string): string {
  return `<script>
    function downloadDoc(name) {
      var html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    }
  <\/script>`;
}

async function openDocument(bodyHtml: string, title: string): Promise<void> {
  const logoBase64 = await getLogoBase64();
  const filename = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
  const toolbar = buildToolbar(logoBase64, title, filename);
  const logoImg = logoBase64
    ? `<img src="${logoBase64}" class="header-logo" alt="SNH" />`
    : '';

  const full = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    ${getBaseStyles()}
    ${getToolbarStyles()}
  </style>
</head>
<body>
  ${toolbar}
  <div class="page">
    ${bodyHtml.replace('__LOGO__', logoImg)}
  </div>
  ${buildScript(filename)}
</body>
</html>`;

  const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

function docHeader(logoPlaceholder: boolean, refCode: string): string {
  return `
    <div class="header">
      <div class="header-left">
        ${logoPlaceholder ? '__LOGO__' : ''}
        <div class="company-info">
          <h1>${COMPANY.name}</h1>
          <p>${COMPANY.address}<br />${COMPANY.phone} — ${COMPANY.email}</p>
        </div>
      </div>
      <div class="doc-ref">
        <p><strong>Ref :</strong> ${refCode}</p>
        <p><strong>Date :</strong> ${today()}</p>
      </div>
    </div>
  `;
}

function docFooter(validity?: string): string {
  return `
    <div class="footer">
      ${COMPANY.name} — ${COMPANY.address} — ${COMPANY.website}<br />
      Document généré le ${today()}${validity ? ` — Valable ${validity} à compter de sa date de délivrance.` : ''}
    </div>
  `;
}

function sigBlock(): string {
  return `
    <div class="signature-block">
      <div class="sig-left">
        <p>Fait à Yaoundé, le ${today()}</p>
      </div>
      <div class="sig-right">
        <p class="sig-title">Le Directeur des Ressources Humaines</p>
        <div class="sig-line"></div>
        <p class="sig-name">SNH — Direction des Ressources Humaines</p>
      </div>
    </div>
  `;
}

function ref(code: string): string {
  return `SNH/DRH/${code}/${new Date().getFullYear()}/${String(Date.now()).slice(-5)}`;
}

const positionOf = (e: any) =>
  e?.position?.title || e?.position?.name || e?.positions?.title || e?.positions?.name || '—';
const departmentOf = (e: any) =>
  e?.department?.name || e?.departments?.name || '—';

// ─── Generators ────────────────────────────────────────────────────────────

export async function generateAttestationTravail(employee: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const body = `
    ${docHeader(true, ref('AT'))}
    <div class="doc-title">Attestation de Travail</div>
    <p class="body-text">
      Je soussigné(e), le Directeur des Ressources Humaines de la
      <span class="highlight">Société Nationale des Hydrocarbures (SNH)</span>,
      atteste par la présente que :
    </p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Nom et Prénom :</span><span class="info-value highlight">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${employee.employee_number || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poste occupé :</span><span class="info-value">${positionOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Département :</span><span class="info-value">${departmentOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Date d'entrée :</span><span class="info-value">${formatDate(employee.hire_date)}</span></div>
      <div class="info-row"><span class="info-label">Type de contrat :</span><span class="info-value">${employee.contract_type || 'CDI'}</span></div>
    </div>
    <p class="body-text">
      est bien employé(e) au sein de notre société en qualité de
      <span class="highlight">${positionOf(employee)}</span>
      au département <span class="highlight">${departmentOf(employee)}</span>,
      et ce depuis le <span class="highlight">${formatDate(employee.hire_date)}</span>.
    </p>
    <p class="body-text">
      La présente attestation est délivrée à l'intéressé(e) à sa demande pour servir
      et valoir ce que de droit.
    </p>
    ${sigBlock()}
    ${docFooter('3 mois')}
  `;
  await openDocument(body, `Attestation de Travail — ${fullName}`);
}

export async function generateCertificatSalaire(employee: any, payslip?: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const salary = payslip?.gross_salary || payslip?.base_salary || employee.current_salary || employee.base_salary || 0;
  const netSalary = payslip?.net_salary || 0;
  const fmtSalary = salary > 0 ? new Intl.NumberFormat('fr-FR').format(salary) + ' XAF' : '[montant non disponible]';

  const body = `
    ${docHeader(true, ref('CS'))}
    <div class="doc-title">Certificat de Salaire</div>
    <p class="body-text">
      Je soussigné(e), le Directeur des Ressources Humaines de la
      <span class="highlight">Société Nationale des Hydrocarbures (SNH)</span>,
      certifie que :
    </p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Nom et Prénom :</span><span class="info-value highlight">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${employee.employee_number || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poste occupé :</span><span class="info-value">${positionOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Département :</span><span class="info-value">${departmentOf(employee)}</span></div>
      ${salary > 0 ? `<div class="info-row"><span class="info-label">Salaire brut mensuel :</span><span class="info-value highlight">${new Intl.NumberFormat('fr-FR').format(salary)} XAF</span></div>` : ''}
      ${netSalary > 0 ? `<div class="info-row"><span class="info-label">Salaire net mensuel :</span><span class="info-value highlight">${new Intl.NumberFormat('fr-FR').format(netSalary)} XAF</span></div>` : ''}
    </div>
    <p class="body-text">
      perçoit un salaire mensuel brut de <span class="highlight">${fmtSalary}</span>
      dans le cadre de ses fonctions au sein de notre société.
    </p>
    <p class="body-text">
      La présente attestation est délivrée à l'intéressé(e) à sa demande pour servir
      et valoir ce que de droit, notamment pour toute démarche bancaire ou administrative.
    </p>
    ${sigBlock()}
    ${docFooter('3 mois')}
  `;
  await openDocument(body, `Certificat de Salaire — ${fullName}`);
}

export async function generateAttestationPresence(employee: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const period = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const body = `
    ${docHeader(true, ref('AP'))}
    <div class="doc-title">Attestation de Présence</div>
    <p class="body-text">
      Je soussigné(e), le Directeur des Ressources Humaines de la
      <span class="highlight">Société Nationale des Hydrocarbures (SNH)</span>,
      atteste que :
    </p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Nom et Prénom :</span><span class="info-value highlight">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${employee.employee_number || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poste occupé :</span><span class="info-value">${positionOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Département :</span><span class="info-value">${departmentOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Période attestée :</span><span class="info-value">${period}</span></div>
    </div>
    <p class="body-text">
      est bien présent(e) et en activité au sein de notre société durant la période indiquée ci-dessus.
      L'intéressé(e) exerce ses fonctions conformément aux exigences de son poste.
    </p>
    <p class="body-text">
      La présente attestation est délivrée à l'intéressé(e) à sa demande pour servir et valoir ce que de droit.
    </p>
    ${sigBlock()}
    ${docFooter('1 mois')}
  `;
  await openDocument(body, `Attestation de Présence — ${fullName}`);
}

export async function generateLettreRecommandation(employee: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;

  const body = `
    ${docHeader(true, ref('LR'))}
    <div class="doc-title">Lettre de Recommandation</div>
    <p class="body-text">À qui de droit,</p>
    <p class="body-text">
      J'ai le plaisir de vous adresser la présente lettre afin de recommander
      <span class="highlight">M./Mme ${fullName}</span>, qui a exercé les fonctions de
      <span class="highlight">${positionOf(employee)}</span>
      au sein du département <span class="highlight">${departmentOf(employee)}</span>
      de la <span class="highlight">Société Nationale des Hydrocarbures (SNH)</span>
      depuis le <span class="highlight">${formatDate(employee.hire_date)}</span>.
    </p>
    <p class="body-text">
      Durant sa période d'activité au sein de notre organisation, <span class="highlight">${fullName}</span>
      a fait preuve de sérieux, de professionnalisme et d'un engagement constant envers les missions
      qui lui ont été confiées. Sa rigueur dans l'exécution des tâches et sa capacité à travailler
      en équipe ont été appréciées par ses collaborateurs et ses responsables.
    </p>
    <p class="body-text">
      Je recommande chaleureusement <span class="highlight">${fullName}</span> et ne doute pas
      qu'il/elle saura s'intégrer avec succès dans toute nouvelle mission ou organisation.
      Je reste disponible pour tout renseignement complémentaire que vous jugerez utile.
    </p>
    ${sigBlock()}
    ${docFooter()}
  `;
  await openDocument(body, `Lettre de Recommandation — ${fullName}`);
}

export async function generateAttestationConge(employee: any, leave?: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const startDate = leave?.start_date ? formatDate(leave.start_date) : '__________';
  const endDate = leave?.end_date ? formatDate(leave.end_date) : '__________';
  const days = leave?.days_count ?? '____';
  const leaveType = leave?.leave_type || 'Congé annuel';

  const body = `
    ${docHeader(true, ref('AC'))}
    <div class="doc-title">Attestation de Congé</div>
    <p class="doc-subtitle">Document officiel — Direction des Ressources Humaines</p>
    <p class="body-text">
      Le Directeur des Ressources Humaines de la Société Nationale des Hydrocarbures (SNH)
      atteste que <span class="highlight">M./Mme ${fullName}</span>,
      <span class="highlight">${positionOf(employee)}</span> au sein du département
      <span class="highlight">${departmentOf(employee)}</span>, bénéficie d'une période de
      <span class="highlight">${leaveType}</span> approuvée dans le respect des procédures internes.
    </p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Nom complet :</span><span class="info-value">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${employee.employee_number || '—'}</span></div>
      <div class="info-row"><span class="info-label">Type de congé :</span><span class="info-value">${leaveType}</span></div>
      <div class="info-row"><span class="info-label">Date de début :</span><span class="info-value">${startDate}</span></div>
      <div class="info-row"><span class="info-label">Date de fin :</span><span class="info-value">${endDate}</span></div>
      <div class="info-row"><span class="info-label">Nombre de jours :</span><span class="info-value">${days}</span></div>
    </div>
    <p class="body-text">
      En foi de quoi, la présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
    </p>
    ${sigBlock()}
    ${docFooter()}
  `;
  await openDocument(body, `Attestation de Congé — ${fullName}`);
}

export async function generateDuplicataBulletin(employee: any, payslip?: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const period = payslip?.period_start
    ? new Date(payslip.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const gross = payslip?.gross_salary || employee.current_salary || 0;
  const net = payslip?.net_salary || Math.round(gross * 0.82);
  const cnps = payslip?.cnps_employee || Math.round(gross * 0.042);
  const irpp = payslip?.irpp || Math.round(gross * 0.09);
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const body = `
    ${docHeader(true, ref('PAIE'))}
    <div class="doc-title">Bulletin de Paie — Duplicata</div>
    <p class="doc-subtitle">Période : ${period}</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Nom complet :</span><span class="info-value">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${employee.employee_number || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poste :</span><span class="info-value">${positionOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Département :</span><span class="info-value">${departmentOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Date d'embauche :</span><span class="info-value">${formatDate(employee.hire_date)}</span></div>
    </div>
    <table style="width:100%; border-collapse:collapse; margin:24px 0; font-size:11pt;">
      <thead>
        <tr style="background:#f0fdf4; border-bottom:2px solid #15803d;">
          <th style="padding:10px; text-align:left; font-weight:bold;">Désignation</th>
          <th style="padding:10px; text-align:right; font-weight:bold;">Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:9px 10px; border-bottom:1px solid #e5e7eb;">Salaire brut</td>
          <td style="padding:9px 10px; text-align:right; border-bottom:1px solid #e5e7eb;">${fmt(gross)}</td>
        </tr>
        <tr>
          <td style="padding:9px 10px; border-bottom:1px solid #e5e7eb; color:#ef4444;">Cotisation CNPS (employé)</td>
          <td style="padding:9px 10px; text-align:right; border-bottom:1px solid #e5e7eb; color:#ef4444;">− ${fmt(cnps)}</td>
        </tr>
        <tr>
          <td style="padding:9px 10px; border-bottom:1px solid #e5e7eb; color:#ef4444;">IRPP</td>
          <td style="padding:9px 10px; text-align:right; border-bottom:1px solid #e5e7eb; color:#ef4444;">− ${fmt(irpp)}</td>
        </tr>
        <tr style="background:#f0fdf4; font-weight:bold; font-size:12pt;">
          <td style="padding:12px 10px; border-top:2px solid #15803d;">Net à payer</td>
          <td style="padding:12px 10px; text-align:right; border-top:2px solid #15803d; color:#15803d;">${fmt(net)}</td>
        </tr>
      </tbody>
    </table>
    <p class="body-text" style="font-size:10pt; color:#64748b;">
      Ce document constitue un duplicata du bulletin de paie de la période indiquée.
      Il a la même valeur que l'original.
    </p>
    <div class="signature-block">
      <div class="sig-left"><p>Fait à Yaoundé, le ${today()}</p></div>
      <div class="sig-right">
        <p class="sig-title">Le Responsable Paie</p>
        <div class="sig-line"></div>
        <p class="sig-name">SNH — Direction des Ressources Humaines</p>
      </div>
    </div>
    ${docFooter()}
  `;
  await openDocument(body, `Duplicata Bulletin de Paie — ${fullName}`);
}

export async function generateContratTravail(employee: any): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const contractType = employee.contract_type || 'CDI';
  const salary = employee.current_salary || 0;

  const body = `
    ${docHeader(true, ref('CT'))}
    <div class="doc-title">Contrat de Travail — Copie</div>
    <p class="doc-subtitle">Document établi conformément au Code du Travail camerounais</p>
    <p class="body-text"><strong>Entre les soussignés :</strong></p>
    <p class="body-text">
      La <span class="highlight">Société Nationale des Hydrocarbures (SNH)</span>, dont le siège
      social est sis à ${COMPANY.address}, représentée par son Directeur des Ressources Humaines,
      ci-après dénommée "l'Employeur",
    </p>
    <p class="body-text"><strong>Et :</strong></p>
    <p class="body-text">
      <span class="highlight">M./Mme ${fullName}</span>, matricule
      <span class="highlight">${employee.employee_number || '—'}</span>, ci-après dénommé(e)
      "l'Employé(e)".
    </p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Type de contrat :</span><span class="info-value">${contractType}</span></div>
      <div class="info-row"><span class="info-label">Poste occupé :</span><span class="info-value">${positionOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Département :</span><span class="info-value">${departmentOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Date de prise de fonction :</span><span class="info-value">${formatDate(employee.hire_date)}</span></div>
      <div class="info-row"><span class="info-label">Rémunération brute mensuelle :</span><span class="info-value">${salary > 0 ? salary.toLocaleString('fr-FR') + ' FCFA' : '— FCFA'}</span></div>
      <div class="info-row"><span class="info-label">Lieu de travail :</span><span class="info-value">Yaoundé, Cameroun</span></div>
    </div>
    <p class="body-text">
      Le présent contrat est régi par les dispositions du Code du Travail camerounais, par la
      Convention Collective applicable et par le Règlement Intérieur de la SNH. Les parties
      s'engagent à en respecter toutes les clauses.
    </p>
    <p class="body-text" style="font-size:10pt; color:#64748b;">
      La présente copie est délivrée à titre informatif et reproduit fidèlement les éléments
      essentiels du contrat initial signé par les parties.
    </p>
    <div class="signature-block">
      <div class="sig-left">
        <p class="sig-title">L'Employé(e)</p>
        <div class="sig-line"></div>
        <p class="sig-name">${fullName}</p>
      </div>
      <div class="sig-right">
        <p class="sig-title">Pour l'Employeur</p>
        <div class="sig-line"></div>
        <p class="sig-name">SNH — Direction des Ressources Humaines</p>
      </div>
    </div>
    ${docFooter()}
  `;
  await openDocument(body, `Contrat de Travail — ${fullName}`);
}

export async function generateAutreDocument(employee: any, purpose?: string): Promise<void> {
  const fullName = `${employee.first_name} ${employee.last_name}`;

  const body = `
    ${docHeader(true, ref('DIV'))}
    <div class="doc-title">Document Administratif</div>
    <p class="doc-subtitle">Direction des Ressources Humaines — SNH</p>
    <p class="body-text">
      Le Directeur des Ressources Humaines de la Société Nationale des Hydrocarbures (SNH),
      soussigné, certifie par la présente les éléments d'information suivants concernant :
    </p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Nom complet :</span><span class="info-value">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${employee.employee_number || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poste occupé :</span><span class="info-value">${positionOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Département :</span><span class="info-value">${departmentOf(employee)}</span></div>
      <div class="info-row"><span class="info-label">Date d'embauche :</span><span class="info-value">${formatDate(employee.hire_date)}</span></div>
    </div>
    ${purpose ? `<p class="body-text"><strong>Objet :</strong> ${purpose}</p>` : ''}
    <p class="body-text">
      La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
    </p>
    ${sigBlock()}
    ${docFooter()}
  `;
  await openDocument(body, `Document Administratif — ${fullName}`);
}

export async function generateDocumentByType(
  type: string,
  employee: any,
  payslip?: any,
  extra?: any,
): Promise<void> {
  switch (type) {
    case 'attestation_travail':   return generateAttestationTravail(employee);
    case 'certificat_salaire':    return generateCertificatSalaire(employee, payslip);
    case 'attestation_presence':  return generateAttestationPresence(employee);
    case 'attestation_conge':     return generateAttestationConge(employee, extra);
    case 'lettre_recommandation': return generateLettreRecommandation(employee);
    case 'bulletin_paie':         return generateDuplicataBulletin(employee, payslip);
    case 'contrat_travail':       return generateContratTravail(employee);
    case 'autre':                 return generateAutreDocument(employee, extra?.purpose);
    default:                      return generateAttestationTravail(employee);
  }
}
