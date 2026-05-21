export function generatePayslipPDF(payslip: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPeriod = (month: number, year: number) => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const getTotalAllowances = (payslip: any) => {
    if (!payslip.allowances) return 0;
    return Object.values(payslip.allowances as Record<string, number>).reduce((sum, val) => sum + val, 0);
  };

  const getTotalDeductions = (payslip: any) => {
    if (!payslip.deductions) return 0;
    return Object.values(payslip.deductions as Record<string, number>).reduce((sum, val) => sum + val, 0);
  };

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bulletin de Paie - ${payslip.employees?.first_name} ${payslip.employees?.last_name} - ${formatPeriod(payslip.period_month, payslip.period_year)}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          background: white;
          color: #1e293b;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
        }

        .header {
          border-bottom: 4px solid #16a34a;
          padding-bottom: 30px;
          margin-bottom: 30px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 20px;
        }

        .company-info h1 {
          color: #16a34a;
          font-size: 28px;
          margin-bottom: 5px;
        }

        .company-info p {
          color: #64748b;
          font-size: 14px;
        }

        .document-type {
          text-align: right;
        }

        .document-type h2 {
          font-size: 24px;
          color: #1e293b;
          margin-bottom: 5px;
        }

        .document-type p {
          color: #64748b;
          font-size: 14px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .info-section h3 {
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
          font-weight: 600;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .info-label {
          color: #64748b;
          font-size: 14px;
        }

        .info-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }

        .salary-breakdown {
          margin: 30px 0;
        }

        .breakdown-section {
          margin-bottom: 25px;
        }

        .breakdown-section h3 {
          background: #f8fafc;
          padding: 12px 15px;
          font-size: 16px;
          color: #1e293b;
          border-left: 4px solid #16a34a;
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        table thead {
          background: #f8fafc;
        }

        table th {
          text-align: left;
          padding: 12px 15px;
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        table td {
          padding: 10px 15px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }

        table tr:hover {
          background: #f8fafc;
        }

        .amount {
          text-align: right;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .total-row {
          background: #f8fafc;
          font-weight: bold;
        }

        .total-row td {
          padding: 15px;
          border-top: 2px solid #cbd5e1;
          border-bottom: 2px solid #cbd5e1;
        }

        .net-salary {
          background: #16a34a;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
        }

        .net-salary-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .net-salary h3 {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .net-salary .amount {
          font-size: 32px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }

        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #f1f5f9;
          color: #64748b;
          font-size: 12px;
          text-align: center;
        }

        .footer p {
          margin: 5px 0;
        }

        @media print {
          body {
            padding: 0;
          }

          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-top">
            <div class="company-info">
              <h1>SNH</h1>
              <p>Société Nationale des Hydrocarbures</p>
              <p>Yaoundé, Cameroun</p>
            </div>
            <div class="document-type">
              <h2>Bulletin de Paie</h2>
              <p>${formatPeriod(payslip.period_month, payslip.period_year)}</p>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-section">
            <h3>Informations Employé</h3>
            <div class="info-item">
              <span class="info-label">Nom complet</span>
              <span class="info-value">${payslip.employees?.first_name} ${payslip.employees?.last_name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Matricule</span>
              <span class="info-value">${payslip.employees?.employee_number}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>Période de Paie</h3>
            <div class="info-item">
              <span class="info-label">Mois</span>
              <span class="info-value">${formatPeriod(payslip.period_month, payslip.period_year)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date de génération</span>
              <span class="info-value">${payslip.generated_at ? new Date(payslip.generated_at).toLocaleDateString('fr-FR') : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="salary-breakdown">
          <div class="breakdown-section">
            <h3>Rémunération Brute</h3>
            <table>
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th style="text-align: right;">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Salaire de base</td>
                  <td class="amount">${formatCurrency(payslip.base_salary)}</td>
                </tr>
                ${payslip.allowances ? Object.entries(payslip.allowances as Record<string, number>).map(([key, value]) => `
                <tr>
                  <td>${key}</td>
                  <td class="amount">${formatCurrency(value)}</td>
                </tr>
                `).join('') : ''}
                <tr class="total-row">
                  <td>Total Brut</td>
                  <td class="amount">${formatCurrency(payslip.base_salary + getTotalAllowances(payslip))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${payslip.deductions && Object.keys(payslip.deductions).length > 0 ? `
          <div class="breakdown-section">
            <h3>Retenues et Cotisations</h3>
            <table>
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th style="text-align: right;">Montant</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(payslip.deductions as Record<string, number>).map(([key, value]) => `
                <tr>
                  <td>${key}</td>
                  <td class="amount">${formatCurrency(value)}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Total Retenues</td>
                  <td class="amount">${formatCurrency(getTotalDeductions(payslip))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>

        <div class="net-salary">
          <div class="net-salary-content">
            <h3>SALAIRE NET À PAYER</h3>
            <div class="amount">${formatCurrency(payslip.net_salary)}</div>
          </div>
        </div>

        <div class="footer">
          <p>Ce document est un bulletin de paie officiel.</p>
          <p>Société Nationale des Hydrocarbures - SNH</p>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export function downloadPayslipPDF(payslip: any) {
  generatePayslipPDF(payslip);
}
