export const convertHTMLToPDF = (htmlContent: string, filename: string = 'rapport.pdf') => {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Veuillez autoriser les popups pour générer le PDF');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

export const openHTMLReport = (htmlContent: string, title: string = 'Rapport') => {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');

  if (newWindow) {
    newWindow.document.title = title;
  } else {
    alert('Veuillez autoriser les popups pour afficher le rapport');
  }

  return newWindow;
};

export const downloadHTML = (htmlContent: string, filename: string = 'rapport.html') => {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
