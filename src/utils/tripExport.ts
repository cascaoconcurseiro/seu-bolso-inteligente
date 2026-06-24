import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from './currencyFormatter';
import { logger } from '@/utils/logger';

const BRAND_COLOR: [number, number, number] = [5, 150, 105]; // Esmeralda / Verde Premium
const TEXT_COLOR: [number, number, number] = [31, 41, 55]; // Cinza Escuro

export interface TripExportData {
  trip: Record<string, any>;
  participants: Record<string, any>[];
  tripTransactions: Record<string, any>[];
  balances: Record<string, any>[];
  user: Record<string, any>;
}

// Helper para formatação de datas de forma ultra-segura
const safeFormatDate = (dateVal: unknown): string => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal as string | number | Date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'dd/MM/yyyy');
  } catch (e) {
    return 'N/A';
  }
};

export const exportTripToPDF = (data: TripExportData) => {
  const { trip, participants = [], tripTransactions = [], balances = [] } = data;
  
  if (!trip) {
    logger.error("Dados da viagem ausentes para exportação em PDF.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Cabeçalho e Branding Premium
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('pé de meia', 14, 23);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Financeiro de Viagem', 14, 31);
  
  doc.setFontSize(9);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 23);

  // 2. Detalhes Gerais da Viagem
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Informações da Viagem', 14, 52);

  const startDateFormatted = safeFormatDate(trip.start_date);
  const endDateFormatted = safeFormatDate(trip.end_date);

  // Cálculos Financeiros
  const totalExpenses = tripTransactions
    .filter(t => t && t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  
  const budgetValue = Number(trip.budget) || 0;
  const balanceValue = budgetValue - totalExpenses;
  const perPersonCost = participants.length > 0 ? totalExpenses / participants.length : 0;

  autoTable(doc, {
    body: [
      ['Viagem/Destino:', trip.name || trip.destination || 'N/A', 'Período:', `${startDateFormatted} a ${endDateFormatted}`],
      ['Orçamento Definido:', budgetValue > 0 ? formatCurrency(budgetValue, trip.currency) : 'Não informado', 'Total de Gastos:', formatCurrency(totalExpenses, trip.currency)],
      ['Saldo Disponível:', budgetValue > 0 ? formatCurrency(balanceValue, trip.currency) : 'N/A', 'Custo por Participante:', formatCurrency(perPersonCost, trip.currency)]
    ],
    startY: 57,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 
      0: { fontStyle: 'bold', textColor: [100, 110, 120], cellWidth: 45 },
      1: { fontStyle: 'bold', textColor: TEXT_COLOR },
      2: { fontStyle: 'bold', textColor: [100, 110, 120], cellWidth: 45 },
      3: { fontStyle: 'bold', textColor: TEXT_COLOR }
    }
  });

  let currentY = (doc as Record<string, any>).lastAutoTable.finalY + 12;

  // 3. Participantes e Saldos de Acerto
  if (participants && participants.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Participantes e Balanços', 14, currentY);

    const participantRows = balances.map(b => {
      const owesText = b.balance > 0 
        ? `Recebe ${formatCurrency(Math.abs(b.balance), trip.currency)}`
        : b.balance < 0 
        ? `Deve ${formatCurrency(Math.abs(b.balance), trip.currency)}`
        : 'Acertado';
      
      return [
        b.name || 'Desconhecido',
        formatCurrency(b.paid || 0, trip.currency),
        formatCurrency(b.owes || 0, trip.currency),
        owesText
      ];
    });

    autoTable(doc, {
      head: [['Nome', 'Valor Pago', 'Custo Individual (Rateio)', 'Balanço de Acerto']],
      body: participantRows,
      startY: currentY + 5,
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, fontSize: 10, halign: 'left' },
      bodyStyles: { fontSize: 9.5, halign: 'left' },
      columnStyles: {
        3: { fontStyle: 'bold' }
      },
      didParseCell: (cellData: Record<string, any>) => {
        if (cellData.section === 'body' && cellData.column.index === 3) {
          const text = cellData.cell.text[0];
          if (text.startsWith('Recebe')) cellData.cell.styles.textColor = [16, 185, 129]; // Verde
          else if (text.startsWith('Deve')) cellData.cell.styles.textColor = [239, 68, 68]; // Vermelho
        }
      }
    });

    currentY = (doc as Record<string, any>).lastAutoTable.finalY + 12;
  }

  // 4. Detalhamento de Gastos (Tabela Principal)
  if (currentY > 220) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Detalhamento de Gastos', 14, currentY);

  const expenses = tripTransactions.filter(t => t && t.type === 'EXPENSE');

  if (expenses.length > 0) {
    const expenseRows = expenses.map(t => {
      const payer = participants.find(p => p.user_id === t.payer_id || p.member_id === t.payer_id);
      const payerName = payer?.name || t.account?.name || 'Desconhecido';
      
      return [
        safeFormatDate(t.date),
        t.description || 'Sem descrição',
        t.category?.name || 'Sem categoria',
        payerName,
        t.is_shared ? 'Compartilhado' : 'Individual',
        formatCurrency(t.amount, trip.currency)
      ];
    });

    autoTable(doc, {
      head: [['Data', 'Descrição', 'Categoria', 'Quem Pagou', 'Tipo', 'Valor']],
      body: expenseRows,
      startY: currentY + 5,
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        5: { fontStyle: 'bold', halign: 'right' }
      }
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhuma despesa registrada nesta viagem.', 14, currentY + 8);
  }

  // 5. Paginação e Rodapé Automático
  const pageCount = (doc as Record<string, any>).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gestão Financeira | Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  const filename = `relatorio_viagem_${trip.name.toLowerCase().replace(/\s+/g, '_')}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
};

export const exportTripToExcel = (data: TripExportData) => {
  const { trip, participants = [], tripTransactions = [], balances = [] } = data;
  
  if (!trip) {
    logger.error("Dados da viagem ausentes para exportação em Excel.");
    return;
  }

  const today = new Date().toLocaleDateString('pt-BR');
  const totalExpenses = tripTransactions
    .filter(t => t && t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const budgetValue = Number(trip.budget) || 0;
  const balanceValue = budgetValue - totalExpenses;
  const perPersonCost = participants.length > 0 ? totalExpenses / participants.length : 0;
  
  const startDateFormatted = safeFormatDate(trip.start_date);
  const endDateFormatted = safeFormatDate(trip.end_date);

  // Montagem do HTML/XML formatado com folha de estilos lida diretamente pelo Excel
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Relatório de Viagem</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 150px; }
      .value-cell { font-weight: 500; color: #111827; }
      .th-premium { background-color: #059669; color: #ffffff; font-weight: bold; font-size: 10px; height: 25px; }
      .tr-zebra { background-color: #f9fafb; }
      .text-cell { mso-number-format:"\\@"; text-align: left; }
      .number-cell { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
      .date-cell { mso-number-format:"dd\\/mm\\/yyyy"; text-align: center; }
      .green-text { color: #059669; font-weight: bold; }
      .red-text { color: #dc2626; font-weight: bold; }
    </style>
    </head>
    <body>
    <table>
      <!-- Título Principal -->
      <tr>
        <th colspan="6" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="6" class="brand-subtitle">Relatório Financeiro de Viagem — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="6" style="border:none; height: 10px;"></td></tr>

      <!-- Informações Gerais -->
      <tr>
        <th colspan="6" class="section-title">1. INFORMAÇÕES GERAIS DA VIAGEM</th>
      </tr>
      <tr>
        <td class="label-cell">Destino/Viagem:</td>
        <td colspan="2" class="value-cell text-cell">${trip.name || trip.destination || 'N/A'}</td>
        <td class="label-cell">Período:</td>
        <td colspan="2" class="value-cell text-cell">${startDateFormatted} a ${endDateFormatted}</td>
      </tr>
      <tr>
        <td class="label-cell">Orçamento da Viagem:</td>
        <td colspan="2" class="value-cell number-cell">${budgetValue}</td>
        <td class="label-cell">Total de Gastos:</td>
        <td colspan="2" class="value-cell number-cell" style="font-weight: bold; color: ${balanceValue >= 0 ? '#059669' : '#dc2626'}">${totalExpenses}</td>
      </tr>
      <tr>
        <td class="label-cell">Saldo Disponível:</td>
        <td colspan="2" class="value-cell number-cell" style="font-weight: bold; color: ${balanceValue >= 0 ? '#059669' : '#dc2626'}">${budgetValue > 0 ? balanceValue : 0}</td>
        <td class="label-cell">Moeda Oficial:</td>
        <td colspan="2" class="value-cell text-cell">${trip.currency}</td>
      </tr>
      <tr>
        <td class="label-cell">Participantes:</td>
        <td colspan="2" class="value-cell text-cell">${participants.length} pessoas</td>
        <td class="label-cell">Custo por Pessoa (Rateio):</td>
        <td colspan="2" class="value-cell number-cell">${perPersonCost}</td>
      </tr>
      <tr><td colspan="6" style="border:none; height: 15px;"></td></tr>
  `;

  // Seção Participantes e Balanços
  if (participants && participants.length > 0) {
    html += `
      <tr>
        <th colspan="6" class="section-title">2. PARTICIPANTES E BALANÇO DE ACERTOS</th>
      </tr>
      <tr>
        <th colspan="2" class="th-premium text-cell">Nome</th>
        <th class="th-premium number-cell">Total Pago</th>
        <th class="th-premium number-cell">Custo Individual</th>
        <th colspan="2" class="th-premium text-cell">Balanço de Acerto</th>
      </tr>
    `;

    balances.forEach((b, index) => {
      const owesText = b.balance > 0 
        ? `Recebe ${b.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : b.balance < 0 
        ? `Deve ${Math.abs(b.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Acertado';
      
      const balanceClass = b.balance > 0 ? 'green-text' : b.balance < 0 ? 'red-text' : '';
      const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';

      html += `
        <tr ${zebraClass}>
          <td colspan="2" class="text-cell">${b.name || 'Desconhecido'}</td>
          <td class="number-cell">${b.paid || 0}</td>
          <td class="number-cell">${b.owes || 0}</td>
          <td colspan="2" class="text-cell ${balanceClass}">${owesText}</td>
        </tr>
      `;
    });

    html += `<tr><td colspan="6" style="border:none; height: 15px;"></td></tr>`;
  }

  // Seção Lista de Gastos
  html += `
    <tr>
      <th colspan="6" class="section-title">3. DETALHAMENTO DE DESPESAS</th>
    </tr>
    <tr>
      <th class="th-premium date-cell" style="width: 80px;">Data</th>
      <th colspan="2" class="th-premium text-cell">Descrição</th>
      <th class="th-premium text-cell">Categoria</th>
      <th class="th-premium text-cell">Quem Pagou</th>
      <th class="th-premium number-cell" style="width: 100px;">Valor (${trip.currency})</th>
    </tr>
  `;

  const expenses = tripTransactions.filter(t => t && t.type === 'EXPENSE');
  if (expenses.length > 0) {
    expenses.forEach((t, index) => {
      const payer = participants.find(p => p.user_id === t.payer_id || p.member_id === t.payer_id);
      const payerName = payer?.name || t.account?.name || 'Desconhecido';
      const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
      const dateFormatted = safeFormatDate(t.date);

      html += `
        <tr ${zebraClass}>
          <td class="date-cell">${dateFormatted}</td>
          <td colspan="2" class="text-cell">${t.description || 'Sem descrição'}</td>
          <td class="text-cell">${t.category?.name || 'Sem categoria'}</td>
          <td class="text-cell">${payerName}</td>
          <td class="number-cell" style="font-weight: bold;">${Number(t.amount)}</td>
        </tr>
      `;
    });
  } else {
    html += `
      <tr>
        <td colspan="6" class="text-cell" style="font-style: italic; color: #6b7280; text-align: center;">Nenhuma despesa registrada nesta viagem.</td>
      </tr>
    `;
  }

  html += `
    </table>
    </body>
    </html>
  `;

  // Geração do arquivo blob com formato de planilha Excel do Microsoft
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const safeTripName = trip.name.toLowerCase().replace(/\s+/g, '_');
  const todayFilename = today.replace(/\//g, '-');
  
  link.setAttribute("href", url);
  link.setAttribute("download", `viagem_${safeTripName}_${todayFilename}.xls`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
