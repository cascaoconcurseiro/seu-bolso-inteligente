import type jsPDF from "jspdf";

const BRAND_COLOR: [number, number, number] = [5, 150, 105]; // Esmeralda / Verde Premium
const TEXT_COLOR: [number, number, number] = [31, 41, 55]; // Cinza Escuro

// Lazy-load jsPDF (dynamic import — só carrega quando usuário exporta PDF)
let _jsPDF: typeof jsPDF | null = null;
let _autoTable: typeof import("jspdf-autotable").default | null = null;
async function getJsPDF() {
  if (!_jsPDF) {
    const [pdfModule, tableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    _jsPDF = pdfModule.default;
    _autoTable = tableModule.default || (tableModule as any);
  }
  return { jsPDF: _jsPDF, autoTable: _autoTable };
}

export interface CalculatorExportData {
  title: string;
  parameters: { label: string; value: string }[];
  summary: { label: string; value: string; isWarning?: boolean }[];
  tableHead: string[];
  tableBody: string[][];
}

export const exportCalculatorToPDF = async (data: CalculatorExportData) => {
  const { jsPDF: JsPDF, autoTable } = await getJsPDF();
  const doc = new JsPDF();
  const today = new Date().toLocaleDateString("pt-BR");
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // 1. Cabeçalho e Branding Premium
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("pé de meia", 14, 23);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.title, 14, 31);

  doc.setFontSize(9);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 23);

  // 2. Parâmetros
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Parâmetros Utilizados", 14, 52);

  const paramRows = data.parameters.map((p) => [p.label, p.value]);

  autoTable(doc, {
    body: paramRows,
    startY: 57,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120], cellWidth: 80 },
      1: { fontStyle: "bold", textColor: TEXT_COLOR },
    },
  });

  let currentY = (doc as Record<string, any>).lastAutoTable.finalY + 12;

  // 3. Resultados Resumo
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do Cenário", 14, currentY);

  const summaryRows = data.summary.map((s) => [s.label, s.value]);

  autoTable(doc, {
    body: summaryRows,
    startY: currentY + 5,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120], cellWidth: 80 },
      1: { fontStyle: "bold", textColor: TEXT_COLOR },
    },
    didParseCell: (cellData) => {
      const rowIndex = cellData.row.index;
      if (
        cellData.section === "body" &&
        data.summary[rowIndex].isWarning &&
        cellData.column.index === 1
      ) {
        cellData.cell.styles.textColor = [5, 150, 105]; // Highlight as primary color (or warning depending on logic, here we use primary green for good outcomes)
      }
    },
  });

  currentY = (doc as Record<string, any>).lastAutoTable.finalY + 12;

  // 4. Detalhamento Mensal/Anual (Tabela Principal)
  if (currentY > 220) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.text("Evolução do Patrimônio", 14, currentY);

  autoTable(doc, {
    head: [data.tableHead],
    body: data.tableBody,
    startY: currentY + 5,
    theme: "striped",
    headStyles: { fillColor: BRAND_COLOR, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
  });

  // 5. Paginação e Rodapé Automático
  const pageCount = (doc as Record<string, any>).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Simulador Inteligente | Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
  }

  const filename = `simulacao_${data.title.toLowerCase().replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
};
