import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { calculateTransactionTotalsByCurrency, formatExportMoney, formatTotalsInline, resolveItemCurrency } from './exportCurrency';

const BRAND_COLOR: [number, number, number] = [5, 150, 105]; // Esmeralda / Verde Premium
const TEXT_COLOR: [number, number, number] = [31, 41, 55]; // Cinza Escuro

// Helper para invocar autoTable de forma resiliente diante de variações de bundler
const safeCallAutoTable = (doc: jsPDF, options: any) => {
  try {
    if (typeof autoTable === 'function') {
      autoTable(doc, options);
    } else if (autoTable && typeof (autoTable as any).default === 'function') {
      (autoTable as any).default(doc, options);
    } else if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable(options);
    } else {
      console.warn('Método autoTable não encontrado no escopo global ou local do jsPDF.');
    }
  } catch (error) {
    console.error('Erro ao renderizar autoTable no PDF:', error);
  }
};

// Helper para calcular dinamicamente o início do próximo bloco
const getNextStartY = (doc: jsPDF, fallbackY: number): number => {
  const lastAutoTable = (doc as any).lastAutoTable;
  if (lastAutoTable && typeof lastAutoTable.finalY === 'number') {
    return lastAutoTable.finalY + 12;
  }
  return fallbackY;
};

// Helper para formatação de datas de forma ultra-segura
const safeFormatDate = (dateVal: any): string => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    // Corrige fuso horário local na renderização
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return format(utcDate, 'dd/MM/yyyy');
  } catch (e) {
    return 'N/A';
  }
};

// Helper para disparar download de CSV com caractere BOM para Excel BR
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper para disparar download de Excel (.xls) com formatação HTML/XML Premium
const downloadExcel = (htmlContent: string, filename: string) => {
  const safeFilename = filename.replace(/\.csv$/, '.xls');
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper para adicionar rodapé e numeração de página
const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gestão Financeira | Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }
};

// =========================================================================
// 1. EXPORTAÇÕES DE RELATÓRIOS GERAIS
// =========================================================================

export const exportToCSV = (transactions: any[], filename = 'transacoes_seu_bolso_inteligente.csv') => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString('pt-BR');
  const totalsByCurrency = calculateTransactionTotalsByCurrency(transactions);
  const balance = Object.values(totalsByCurrency).reduce((sum, total) => sum + total.balance, 0);
  const summaryRows = Object.entries(totalsByCurrency).map(([currency, total]) => `
      <tr>
        <td class="text-cell">${currency}</td>
        <td colspan="2" class="value-cell text-cell green-text">${formatExportMoney(total.income, currency)}</td>
        <td colspan="2" class="value-cell text-cell red-text">${formatExportMoney(total.expense, currency)}</td>
        <td colspan="2" class="value-cell text-cell ${total.balance >= 0 ? 'green-text' : 'red-text'}">${formatExportMoney(total.balance, currency)}</td>
      </tr>
  `).join('');

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Relatório Geral</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 120px; }
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
      <tr>
        <th colspan="7" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="7" class="brand-subtitle">Relatório Financeiro Consolidado — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="7" style="border:none; height: 10px;"></td></tr>

      <tr>
        <th colspan="7" class="section-title">1. RESUMO FINANCEIRO DO PERÍODO</th>
      </tr>
      <tr>
        <td class="label-cell">Total de Receitas:</td>
        <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, 'income')}</td>
        <td class="label-cell">Total de Despesas:</td>
        <td colspan="3" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, 'expense')}</td>
      </tr>
      <tr>
        <td class="label-cell">Saldo Líquido:</td>
        <td colspan="2" class="value-cell text-cell">${formatTotalsInline(totalsByCurrency, 'balance')}</td>
        <td class="label-cell">Status Financeiro:</td>
        <td colspan="3" class="value-cell text-cell" style="font-weight: bold; color: ${balance >= 0 ? '#059669' : '#dc2626'}">${balance >= 0 ? 'Superavitário' : 'Deficitário'}</td>
      </tr>
      ${summaryRows}
      <tr><td colspan="7" style="border:none; height: 15px;"></td></tr>

      <tr>
        <th colspan="7" class="section-title">2. DETALHAMENTO DE LANÇAMENTOS</th>
      </tr>
      <tr>
        <th class="th-premium date-cell">Data</th>
        <th class="th-premium text-cell">Tipo</th>
        <th class="th-premium text-cell" style="width: 200px;">Descrição</th>
        <th class="th-premium text-cell">Categoria</th>
        <th class="th-premium number-cell">Valor</th>
        <th class="th-premium text-cell">Moeda</th>
        <th class="th-premium text-cell">Conta</th>
      </tr>
  `;

  transactions.forEach((t, index) => {
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
    const dateFormatted = safeFormatDate(t.date);
    const amountVal = Number(t.amount || 0);
    const currency = resolveItemCurrency(t);

    html += `
      <tr ${zebraClass}>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell" style="color: ${t.type === 'INCOME' ? '#059669' : '#dc2626'}">${t.type === 'INCOME' ? 'Receita' : 'Despesa'}</td>
        <td class="text-cell">${t.description || 'Sem descrição'}</td>
        <td class="text-cell">${t.category?.name || 'Sem categoria'}</td>
        <td class="text-cell" style="font-weight: bold; color: ${t.type === 'INCOME' ? '#059669' : '#dc2626'}">${formatExportMoney(amountVal, currency)}</td>
        <td class="text-cell">${currency}</td>
        <td class="text-cell">${t.account?.name || ''}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, filename);
};

export const exportToPDF = (transactions: any[], totalIncome: number, totalExpense: number, filename = 'relatorio_seu_bolso_inteligente.pdf') => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Cabeçalho Premium com Marca
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Financeiro Consolidado', 14, 28);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 20);

  // 2. Resumo de Saldo
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Financeiro do Período', 14, 48);

  const totalsByCurrency = calculateTransactionTotalsByCurrency(transactions);
  void totalIncome;
  void totalExpense;

  safeCallAutoTable(doc, {
    head: [['Moeda', 'Receitas', 'Despesas', 'Saldo']],
    body: Object.entries(totalsByCurrency).map(([currency, total]) => [
      currency,
      formatExportMoney(total.income, currency),
      formatExportMoney(total.expense, currency),
      formatExportMoney(total.balance, currency),
    ]),
    startY: 52,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: { 
      0: { fontStyle: 'bold', textColor: [100, 110, 120] },
      1: { fontStyle: 'bold', textColor: [16, 185, 129], halign: 'right' },
      2: { fontStyle: 'bold', textColor: [239, 68, 68], halign: 'right' },
      3: { fontStyle: 'bold', halign: 'right' }
    }
  });

  const nextStartY = getNextStartY(doc, 80);

  // 3. Tabela de Transações Detalhada
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Lista de Lançamentos', 14, nextStartY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Moeda", "Valor"];
  const tableRows = transactions.map(t => {
    const currency = resolveItemCurrency(t);
    return [
      safeFormatDate(t.date),
      t.description || 'Sem descrição',
      t.category?.name || 'Sem categoria',
      t.type === 'INCOME' ? 'Receita' : 'Despesa',
      currency,
      formatExportMoney(Number(t.amount || 0), currency)
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: nextStartY + 5,
    theme: 'striped',
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (cellData: any) => {
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const typeVal = cellData.cell.text[0];
        if (typeVal === 'Receita') cellData.cell.styles.textColor = [16, 185, 129];
        else if (typeVal === 'Despesa') cellData.cell.styles.textColor = [239, 68, 68];
      }
    }
  });

  addFooter(doc);
  doc.save(filename);
};

// =========================================================================
// 2. EXPORTAÇÕES DE CONTAS BANCÁRIAS (CHECKING/SAVINGS ETC.)
// =========================================================================

export const exportAccountsToCSV = (transactions: any[], accounts: any[], periodLabel: string) => {
  const accountIds = accounts.map(a => a.id);
  const accTransactions = transactions.filter(t => 
    (t.account_id && accountIds.includes(t.account_id)) || 
    (t.destination_account_id && accountIds.includes(t.destination_account_id))
  );

  if (accTransactions.length === 0) {
    toast.error("Não há lançamentos de contas no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString('pt-BR');
  const totalsByCurrency = calculateTransactionTotalsByCurrency(accTransactions, accounts);
  const balance = Object.values(totalsByCurrency).reduce((sum, total) => sum + total.balance, 0);

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Extrato Contas</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 120px; }
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
      <tr>
        <th colspan="8" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="8" class="brand-subtitle">Extrato de Contas Bancárias — ${periodLabel} — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="8" style="border:none; height: 10px;"></td></tr>

      <tr>
        <th colspan="8" class="section-title">1. RESUMO FINANCEIRO DAS CONTAS</th>
      </tr>
      <tr>
        <td class="label-cell">Total de Entradas:</td>
        <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, 'income')}</td>
        <td class="label-cell">Total de Saídas:</td>
        <td colspan="4" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, 'expense')}</td>
      </tr>
      <tr>
        <td class="label-cell">Saldo do Período:</td>
        <td colspan="2" class="value-cell text-cell ${balance >= 0 ? 'green-text' : 'red-text'}">${formatTotalsInline(totalsByCurrency, 'balance')}</td>
        <td class="label-cell">Período Selecionado:</td>
        <td colspan="4" class="value-cell text-cell">${periodLabel}</td>
      </tr>
      <tr><td colspan="8" style="border:none; height: 15px;"></td></tr>

      <tr>
        <th colspan="8" class="section-title">2. LANÇAMENTOS RECENTES DAS CONTAS</th>
      </tr>
      <tr>
        <th class="th-premium date-cell">Data</th>
        <th class="th-premium text-cell">Tipo</th>
        <th class="th-premium text-cell" style="width: 200px;">Descrição</th>
        <th class="th-premium text-cell">Categoria</th>
        <th class="th-premium text-cell">Moeda</th>
        <th class="th-premium number-cell">Valor</th>
        <th class="th-premium text-cell">Conta Origem</th>
        <th class="th-premium text-cell">Conta Destino</th>
      </tr>
  `;

  accTransactions.forEach((t, index) => {
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
    const dateFormatted = safeFormatDate(t.date);
    let typeText = 'Despesa';
    if (t.type === 'INCOME') typeText = 'Receita';
    else if (t.type === 'TRANSFER') typeText = 'Transferência';
    else if (t.type === 'DEPOSIT') typeText = 'Depósito';
    else if (t.type === 'WITHDRAWAL') typeText = 'Saque';

    const originAccount = accounts.find(a => a.id === t.account_id)?.name || '';
    const destAccount = accounts.find(a => a.id === t.destination_account_id)?.name || '';
    const amountVal = Number(t.amount || 0);
    const currency = resolveItemCurrency(t, accounts);

    html += `
      <tr ${zebraClass}>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell" style="color: ${t.type === 'INCOME' ? '#059669' : t.type === 'EXPENSE' ? '#dc2626' : '#4b5563'}">${typeText}</td>
        <td class="text-cell">${t.description || 'Sem descrição'}</td>
        <td class="text-cell">${t.category?.name || 'Sem categoria'}</td>
        <td class="text-cell">${currency}</td>
        <td class="text-cell" style="font-weight: bold; color: ${t.type === 'INCOME' ? '#059669' : t.type === 'EXPENSE' ? '#dc2626' : '#4b5563'}">${formatExportMoney(amountVal, currency)}</td>
        <td class="text-cell">${originAccount}</td>
        <td class="text-cell">${destAccount}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, `extrato_contas_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.xls`);
};

export const exportAccountsToPDF = (transactions: any[], accounts: any[], periodLabel: string, totalBalance: number) => {
  const accountIds = accounts.map(a => a.id);
  const accTransactions = transactions.filter(t => 
    (t.account_id && accountIds.includes(t.account_id)) || 
    (t.destination_account_id && accountIds.includes(t.destination_account_id))
  );

  if (accTransactions.length === 0) {
    toast.error("Não há lançamentos de contas no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Extrato de Contas Bancárias - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today}`, 150, 20);

  // Summary
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Financeiro das Contas', 14, 48);

  void totalBalance;
  const totalsByCurrency = calculateTransactionTotalsByCurrency(accTransactions, accounts);
  const accountBalancesByCurrency = accounts.reduce<Record<string, { income: number; expense: number; balance: number }>>((acc, account) => {
    const currency = account.currency || 'BRL';
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    acc[currency].balance += Number(account.balance || 0);
    return acc;
  }, {});

  safeCallAutoTable(doc, {
    body: [
      ['Total de Entradas:', formatTotalsInline(totalsByCurrency, 'income'), 'Total de Saídas:', formatTotalsInline(totalsByCurrency, 'expense')],
      ['Saldo do Período:', formatTotalsInline(totalsByCurrency, 'balance'), 'Saldo Atual das Contas:', formatTotalsInline(accountBalancesByCurrency, 'balance')]
    ],
    startY: 52,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 110, 120] },
      1: { fontStyle: 'bold', textColor: [16, 185, 129] },
      2: { fontStyle: 'bold', textColor: [100, 110, 120] },
      3: { fontStyle: 'bold', textColor: [31, 41, 55] }
    }
  });

  const startY = getNextStartY(doc, 75);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Lançamentos Recentes', 14, startY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Conta Origem/Destino", "Moeda", "Valor"];
  const tableRows = accTransactions.map(t => {
    let typeText = 'Despesa';
    if (t.type === 'INCOME') typeText = 'Receita';
    else if (t.type === 'TRANSFER') typeText = 'Transf.';
    else if (t.type === 'DEPOSIT') typeText = 'Depósito';
    else if (t.type === 'WITHDRAWAL') typeText = 'Saque';

    const accountName = t.type === 'TRANSFER'
      ? `${accounts.find(a => a.id === t.account_id)?.name || ''} -> ${accounts.find(a => a.id === t.destination_account_id)?.name || ''}`
      : (accounts.find(a => a.id === t.account_id)?.name || accounts.find(a => a.id === t.destination_account_id)?.name || '');

    const currency = resolveItemCurrency(t, accounts);
    return [
      safeFormatDate(t.date),
      t.description || 'Sem descrição',
      t.category?.name || 'Sem categoria',
      typeText,
      accountName,
      currency,
      formatExportMoney(Number(t.amount || 0), currency)
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY + 5,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      6: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (cellData: any) => {
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const typeVal = cellData.cell.text[0];
        if (typeVal === 'Receita') cellData.cell.styles.textColor = [16, 185, 129];
        else if (typeVal === 'Despesa') cellData.cell.styles.textColor = [239, 68, 68];
      }
    }
  });

  addFooter(doc);
  doc.save(`extrato_contas_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

// =========================================================================
// 3. EXPORTAÇÕES DE CARTÕES DE CRÉDITO
// =========================================================================

export const exportCardsToCSV = (transactions: any[], cards: any[], periodLabel: string) => {
  const cardIds = cards.map(c => c.id);
  const cardTransactions = transactions.filter(t => t.account_id && cardIds.includes(t.account_id));

  if (cardTransactions.length === 0) {
    toast.error("Não há lançamentos de cartões no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString('pt-BR');
  const totalsByCurrency = calculateTransactionTotalsByCurrency(cardTransactions, cards);

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Extrato Cartões</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 120px; }
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
      <tr>
        <th colspan="7" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="7" class="brand-subtitle">Extrato de Cartões de Crédito — ${periodLabel} — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="7" style="border:none; height: 10px;"></td></tr>

      <tr>
        <th colspan="7" class="section-title">1. RESUMO DE FATURAS</th>
      </tr>
      <tr>
        <td class="label-cell">Total Gasto no Período:</td>
        <td colspan="2" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, 'expense')}</td>
        <td class="label-cell">Período de Referência:</td>
        <td colspan="3" class="value-cell text-cell">${periodLabel}</td>
      </tr>
      <tr><td colspan="7" style="border:none; height: 15px;"></td></tr>

      <tr>
        <th colspan="7" class="section-title">2. LANÇAMENTOS NAS FATURAS DOS CARTÕES</th>
      </tr>
      <tr>
        <th class="th-premium date-cell">Data</th>
        <th class="th-premium text-cell" style="width: 200px;">Descrição</th>
        <th class="th-premium text-cell">Categoria</th>
        <th class="th-premium text-cell">Cartão</th>
        <th class="th-premium text-cell">Parcelamento</th>
        <th class="th-premium text-cell">Moeda</th>
        <th class="th-premium number-cell">Valor</th>
      </tr>
  `;

  cardTransactions.forEach((t, index) => {
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
    const dateFormatted = safeFormatDate(t.date);
    const cardName = cards.find(c => c.id === t.account_id)?.name || '';
    const installmentText = t.is_installment 
      ? `Parc. ${t.current_installment}/${t.total_installments}` 
      : 'À vista';
    const amountVal = Number(t.amount || 0);
    const currency = resolveItemCurrency(t, cards);

    html += `
      <tr ${zebraClass}>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell">${t.description || 'Sem descrição'}</td>
        <td class="text-cell">${t.category?.name || 'Sem categoria'}</td>
        <td class="text-cell">${cardName}</td>
        <td class="text-cell">${installmentText}</td>
        <td class="text-cell">${currency}</td>
        <td class="text-cell" style="font-weight: bold; color: #dc2626;">${formatExportMoney(amountVal, currency)}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, `extrato_cartoes_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.xls`);
};

export const exportCardsToPDF = (transactions: any[], cards: any[], periodLabel: string, totalLimit: number, totalInvoices: number) => {
  const cardIds = cards.map(c => c.id);
  const cardTransactions = transactions.filter(t => t.account_id && cardIds.includes(t.account_id));

  if (cardTransactions.length === 0) {
    toast.error("Não há lançamentos de cartões no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Extrato de Cartões de Crédito - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today}`, 150, 20);

  // Summary
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo das Faturas de Cartão', 14, 48);

  void totalLimit;
  void totalInvoices;
  const totalsByCurrency = calculateTransactionTotalsByCurrency(cardTransactions, cards);
  const cardLimitsByCurrency = cards.reduce<Record<string, { income: number; expense: number; balance: number }>>((acc, card) => {
    const currency = card.currency || 'BRL';
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    acc[currency].balance += Number(card.credit_limit || 0);
    return acc;
  }, {});
  const cardInvoicesByCurrency = cards.reduce<Record<string, { income: number; expense: number; balance: number }>>((acc, card) => {
    const currency = card.currency || 'BRL';
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    acc[currency].balance += Number(card.balance || 0);
    return acc;
  }, {});

  safeCallAutoTable(doc, {
    body: [
      ['Total Gasto no Período:', formatTotalsInline(totalsByCurrency, 'expense'), 'Faturas Totais Atuais:', formatTotalsInline(cardInvoicesByCurrency, 'balance')],
      ['Limite Total de Crédito:', formatTotalsInline(cardLimitsByCurrency, 'balance'), 'Uso de Limite Consolidado:', 'Por moeda']
    ],
    startY: 52,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 110, 120] },
      1: { fontStyle: 'bold', textColor: [239, 68, 68] },
      2: { fontStyle: 'bold', textColor: [100, 110, 120] },
      3: { fontStyle: 'bold', textColor: [31, 41, 55] }
    }
  });

  const startY = getNextStartY(doc, 75);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Lançamentos nas Faturas', 14, startY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Cartão", "Parcela", "Moeda", "Valor"];
  const tableRows = cardTransactions.map(t => {
    const cardName = cards.find(c => c.id === t.account_id)?.name || '';
    const installmentText = t.is_installment 
      ? `${t.current_installment}/${t.total_installments}` 
      : 'À vista';

    const currency = resolveItemCurrency(t, cards);
    return [
      safeFormatDate(t.date),
      t.description || 'Sem descrição',
      t.category?.name || 'Sem categoria',
      cardName,
      installmentText,
      currency,
      formatExportMoney(Number(t.amount || 0), currency)
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY + 5,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      6: { halign: 'right', fontStyle: 'bold' }
    }
  });

  addFooter(doc);
  doc.save(`extrato_cartoes_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

// =========================================================================
// 4. EXPORTAÇÕES DE DESPESAS COMPARTILHADAS (SHARED FINANCES)
// =========================================================================

export const exportSharedToCSV = (invoiceItems: any[], periodLabel: string) => {
  if (!invoiceItems || invoiceItems.length === 0) {
    toast.error("Não há lançamentos compartilhados no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString('pt-BR');
  const totalsByCurrency = invoiceItems.reduce<Record<string, { income: number; expense: number; balance: number }>>((acc, item) => {
    const currency = item.currency || 'BRL';
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    if (item.type === 'CREDIT') acc[currency].income += Number(item.amount || 0);
    if (item.type === 'DEBIT') acc[currency].expense += Number(item.amount || 0);
    acc[currency].balance = acc[currency].income - acc[currency].expense;
    return acc;
  }, {});
  const balance = Object.values(totalsByCurrency).reduce((sum, total) => sum + total.balance, 0);

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Compartilhado</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .brand-subtitle { background-color: #047857; color: #ffffff; font-size: 10px; text-align: center; height: 20px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .label-cell { font-weight: bold; color: #4b5563; background-color: #f9fafb; width: 120px; }
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
      <tr>
        <th colspan="8" class="brand-title">CONTROLE FINANCEIRO</th>
      </tr>
      <tr>
        <th colspan="8" class="brand-subtitle">Extrato de Despesas Compartilhadas — ${periodLabel} — Emitido em ${today}</th>
      </tr>
      <tr><td colspan="8" style="border:none; height: 10px;"></td></tr>

      <tr>
        <th colspan="8" class="section-title">1. BALANÇO CONSOLIDADO DO GRUPO</th>
      </tr>
      <tr>
        <td class="label-cell">Total a Receber:</td>
        <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, 'income')}</td>
        <td class="label-cell">Total a Pagar:</td>
        <td colspan="4" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, 'expense')}</td>
      </tr>
      <tr>
        <td class="label-cell">Balanço Líquido:</td>
        <td colspan="2" class="value-cell text-cell ${balance >= 0 ? 'green-text' : 'red-text'}">${formatTotalsInline(totalsByCurrency, 'balance')}</td>
        <td class="label-cell">Status do Grupo:</td>
        <td colspan="4" class="value-cell text-cell" style="font-weight: bold; color: ${balance >= 0 ? '#059669' : '#dc2626'}">${balance >= 0 ? 'Credor Líquido' : 'Devedor Líquido'}</td>
      </tr>
      <tr><td colspan="8" style="border:none; height: 15px;"></td></tr>

      <tr>
        <th colspan="8" class="section-title">2. DETALHAMENTO DE LANÇAMENTOS COMPARTILHADOS</th>
      </tr>
      <tr>
        <th class="th-premium text-cell">Membro</th>
        <th class="th-premium date-cell">Data</th>
        <th class="th-premium text-cell" style="width: 200px;">Descrição</th>
        <th class="th-premium text-cell">Categoria</th>
        <th class="th-premium text-cell">Relação</th>
        <th class="th-premium number-cell">Valor</th>
        <th class="th-premium text-cell">Status</th>
        <th class="th-premium text-cell">Viagem</th>
      </tr>
  `;

  invoiceItems.forEach((item, index) => {
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
    const dateFormatted = safeFormatDate(item.date);
    const amountVal = Number(item.amount || 0);

    html += `
      <tr ${zebraClass}>
        <td class="text-cell">${item.memberName || 'Desconhecido'}</td>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell">${item.description || 'Sem descrição'}</td>
        <td class="text-cell">${item.category?.name || 'Sem categoria'}</td>
        <td class="text-cell" style="color: ${item.type === 'CREDIT' ? '#059669' : '#dc2626'}">${item.type === 'CREDIT' ? 'Você Recebe' : 'Você Deve'}</td>
        <td class="text-cell" style="font-weight: bold; color: ${item.type === 'CREDIT' ? '#059669' : '#dc2626'}">${formatExportMoney(amountVal, item.currency || 'BRL')}</td>
        <td class="text-cell" style="font-weight: bold; color: ${item.isPaid ? '#059669' : '#d97706'}">${item.isPaid ? 'Pago' : 'Pendente'}</td>
        <td class="text-cell">${item.tripId ? 'Sim' : 'Não'}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, `extrato_compartilhado_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.xls`);
};

export const exportSharedToPDF = (invoiceItems: any[], periodLabel: string, totalsByCurrency: Record<string, any>) => {
  if (!invoiceItems || invoiceItems.length === 0) {
    toast.error("Não há lançamentos compartilhados no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Extrato de Despesas Compartilhadas - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today}`, 150, 20);

  // Summary
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Balanço Consolidado de Acertos por Moeda', 14, 48);

  safeCallAutoTable(doc, {
    head: [['Moeda', 'A Receber', 'A Pagar', 'Balanço', 'Liquidado']],
    body: Object.entries(totalsByCurrency).map(([currency, totals]) => [
      currency,
      formatExportMoney(Number(totals.owedToMe || 0), currency),
      formatExportMoney(Number(totals.iOwe || 0), currency),
      formatExportMoney(Number(totals.balance || 0), currency),
      formatExportMoney(Number(totals.settled || 0), currency),
    ]),
    startY: 52,
    theme: 'striped',
    styles: { fontSize: 9.5, cellPadding: 2 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 110, 120] },
      1: { fontStyle: 'bold', textColor: [16, 185, 129] }, // Verde
      2: { fontStyle: 'bold', textColor: [100, 110, 120] },
      3: { fontStyle: 'bold', textColor: [239, 68, 68] } // Vermelho
    }
  });

  const startY = getNextStartY(doc, 75);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento de Lançamentos Compartilhados', 14, startY);

  const tableColumn = ["Membro", "Data", "Descrição", "Categoria", "Relação", "Status", "Moeda", "Valor"];
  const tableRows = invoiceItems.map(item => [
    item.memberName || 'Desconhecido',
    safeFormatDate(item.date),
    item.description || 'Sem descrição',
    item.category?.name || 'Sem categoria',
    item.type === 'CREDIT' ? 'A Receber' : 'A Pagar',
    item.isPaid ? 'Acertado' : 'Pendente',
    item.currency || 'BRL',
    formatExportMoney(Number(item.amount || 0), item.currency || 'BRL')
  ]);

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY + 5,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      7: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (cellData: any) => {
      if (cellData.section === 'body') {
        if (cellData.column.index === 4) {
          const rel = cellData.cell.text[0];
          if (rel === 'A Receber') cellData.cell.styles.textColor = [16, 185, 129];
          else cellData.cell.styles.textColor = [239, 68, 68];
        }
        if (cellData.column.index === 5) {
          const status = cellData.cell.text[0];
          if (status === 'Acertado') cellData.cell.styles.textColor = [16, 185, 129];
          else cellData.cell.styles.textColor = [245, 158, 11]; // Laranja
        }
      }
    }
  });

  addFooter(doc);
  doc.save(`extrato_compartilhado_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

// =========================================================================
// RELATÓRIOS DETALHADOS DE UM CARTÃO ESPECÍFICO (CICLO / ANUAL)
// =========================================================================

export const exportDetailedCardReportToPDF = (transactions: any[], card: any, periodLabel: string) => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Cabeçalho Premium
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('controle financeiro', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Detalhado: Cartão ${card?.name || ''} - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 20);

  // Calcular TOTAIS e CATEGORIAS
  let totalExpense = 0;
  let ownerExpense = 0;
  let otherExpense = 0;
  const categoriesMap: Record<string, number> = {};
  
  const currency = card?.currency || 'BRL';
  const ownerId = card?.user_id;

  transactions.forEach(t => {
     const amt = Number(t.amount || 0);
     if (t.type === 'EXPENSE') {
       totalExpense += amt;
       if (t.user_id === ownerId) {
         ownerExpense += amt;
       } else {
         otherExpense += amt;
       }
       const catName = t.category?.name || 'Outros';
       categoriesMap[catName] = (categoriesMap[catName] || 0) + amt;
     } else if (t.type === 'INCOME') {
       totalExpense -= amt;
       if (t.user_id === ownerId) {
         ownerExpense -= amt;
       } else {
         otherExpense -= amt;
       }
     }
  });

  const categoriesList = Object.entries(categoriesMap)
    .sort((a, b) => b[1] - a[1]) // maior pra menor
    .filter(([_, val]) => val > 0);

  // 2. Resumo da Fatura/Período
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Cartão', 14, 48);

  safeCallAutoTable(doc, {
    body: [
      ['Gasto Total no Período:', formatExportMoney(totalExpense, currency)],
      ['Limite do Cartão:', formatExportMoney(Number(card?.credit_limit || 0), currency)]
    ],
    startY: 52,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 110, 120], cellWidth: 50 },
      1: { fontStyle: 'bold', textColor: [239, 68, 68] }
    }
  });

  let nextStartY = getNextStartY(doc, 75);

  // 3. Distribuição por Categoria
  if (categoriesList.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    doc.text('Maiores Gastos por Categoria', 14, nextStartY);

    safeCallAutoTable(doc, {
      head: [['Categoria', 'Valor', '% do Total']],
      body: categoriesList.slice(0, 10).map(([cat, val]) => [
        cat,
        formatExportMoney(val, currency),
        ((val / Math.max(totalExpense, 1)) * 100).toFixed(1) + '%'
      ]),
      startY: nextStartY + 5,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 110, 120] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });

    nextStartY = getNextStartY(doc, nextStartY + 30);
  }

  // 4. Lista de Lançamentos
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Lançamentos Detalhados', 14, nextStartY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Parcela", "Moeda", "Valor"];
  const tableRows = transactions.map(t => {
    const installmentText = t.is_installment 
      ? `Parc. ${t.current_installment}/${t.total_installments}` 
      : 'À vista';

    const tCurrency = resolveItemCurrency(t, [card]);
    return [
      safeFormatDate(t.date),
      t.description || 'Sem descrição',
      t.category?.name || 'Sem categoria',
      installmentText,
      tCurrency,
      formatExportMoney(Number(t.amount || 0), tCurrency)
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: nextStartY + 5,
    theme: 'striped',
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (cellData: any) => {
      if (cellData.section === 'body' && cellData.column.index === 5) {
         cellData.cell.styles.textColor = [239, 68, 68]; // Red for expenses
      }
    }
  });

  addFooter(doc);
  doc.save(`relatorio_detalhado_${card?.name?.replace(/\s+/g, '_')}_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

export const exportDetailedCardReportToCSV = (transactions: any[], card: any, periodLabel: string) => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const currency = card?.currency || 'BRL';
  
  let totalExpense = 0;
  transactions.forEach(t => {
     const amt = Number(t.amount || 0);
     if (t.type === 'EXPENSE') totalExpense += amt;
     else if (t.type === 'INCOME') totalExpense -= amt;
  });

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
      .brand-title { background-color: #059669; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; height: 35px; }
      .section-title { font-size: 12px; font-weight: bold; background-color: #f3f4f6; color: #1f2937; height: 25px; border-bottom: 2px solid #d1d5db; }
      .th-premium { background-color: #059669; color: #ffffff; font-weight: bold; font-size: 10px; height: 25px; }
      .text-cell { mso-number-format:"\\@"; text-align: left; }
      .number-cell { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
      .date-cell { mso-number-format:"dd\\/mm\\/yyyy"; text-align: center; }
    </style>
    </head>
    <body>
    <table>
      <tr>
        <th colspan="6" class="brand-title">Relatório Detalhado: Cartão ${card?.name || ''} - ${periodLabel}</th>
      </tr>
      <tr><td colspan="6" style="border:none; height: 10px;"></td></tr>
      <tr>
        <th colspan="6" class="section-title">1. RESUMO</th>
      </tr>
      <tr>
        <td colspan="2"><b>Gasto Total no Período:</b></td>
        <td colspan="4" class="text-cell" style="color: red; font-weight: bold;">${formatExportMoney(totalExpense, currency)}</td>
      </tr>
      <tr><td colspan="6" style="border:none; height: 15px;"></td></tr>
      <tr>
        <th colspan="6" class="section-title">2. LANÇAMENTOS</th>
      </tr>
      <tr>
        <th class="th-premium date-cell">Data</th>
        <th class="th-premium text-cell">Descrição</th>
        <th class="th-premium text-cell">Categoria</th>
        <th class="th-premium text-cell">Parcela</th>
        <th class="th-premium text-cell">Moeda</th>
        <th class="th-premium number-cell">Valor</th>
      </tr>
  `;

  transactions.forEach((t) => {
    const dateFormatted = safeFormatDate(t.date);
    const installmentText = t.is_installment 
      ? `Parc. ${t.current_installment}/${t.total_installments}` 
      : 'À vista';
    const amountVal = Number(t.amount || 0);
    const tCurrency = resolveItemCurrency(t, [card]);

    html += `
      <tr>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell">${t.description || 'Sem descrição'}</td>
        <td class="text-cell">${t.category?.name || 'Sem categoria'}</td>
        <td class="text-cell">${installmentText}</td>
        <td class="text-cell">${tCurrency}</td>
        <td class="text-cell" style="font-weight: bold; color: #dc2626;">${formatExportMoney(amountVal, tCurrency)}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(html, `relatorio_detalhado_${card?.name?.replace(/\s+/g, '_')}_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.xls`);
};
