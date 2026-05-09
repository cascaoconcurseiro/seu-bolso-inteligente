/**
 * Utilitário para exportação de dados para Excel (CSV)
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // Use UTF-8 with BOM for Excel to properly read special characters (á, ç, etc)
  const BOM = "\uFEFF";
  
  // Format cells: if string contains comma, wrap in quotes
  const formatCell = (cell: string | number | null | undefined) => {
    if (cell === null || cell === undefined) return '""';
    const cellStr = String(cell).replace(/"/g, '""'); // escape quotes
    return `"${cellStr}"`;
  };

  const csvContent = BOM + 
    headers.map(formatCell).join(";") + "\\n" +
    rows.map(row => row.map(formatCell).join(";")).join("\\n");
    
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename + ".csv");
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename + ".csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
