import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CellHookData } from "jspdf-autotable";
import { toast } from "sonner";
import {
  calculateTransactionTotalsByCurrency,
  formatExportMoney,
  formatTotalsInline,
  resolveItemCurrency,
  ExportAccount,
  ExportCard,
  ExportInvoiceItem,
  ExportTransaction,
} from "./exportCurrency";
import { safeFormatDate } from "./exportCSV";
import { logger } from "@/utils/logger";

const BRAND_COLOR: [number, number, number] = [5, 150, 105]; // Esmeralda / Verde Premium
const TEXT_COLOR: [number, number, number] = [31, 41, 55]; // Cinza Escuro

/* eslint-disable @typescript-eslint/no-explicit-any */
export const safeCallAutoTable = (doc: jsPDF, options: any) => {
  try {
    if (typeof autoTable === "function") {
      autoTable(doc, options);
    } else if (autoTable && typeof (autoTable as any).default === "function") {
      (autoTable as any).default(doc, options);
    } else if (typeof (doc as any).autoTable === "function") {
      (doc as any).autoTable(options);
    } else {
      logger.warn("Método autoTable não encontrado no escopo global ou local do jsPDF.");
    }
  } catch (error) {
    logger.error("Erro ao renderizar autoTable no PDF:", error);
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// Helper para calcular dinamicamente o início do próximo bloco
export const getNextStartY = (doc: jsPDF, fallbackY: number): number => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastAutoTable = (doc as any).lastAutoTable;
  if (lastAutoTable && typeof lastAutoTable.finalY === "number") {
    return lastAutoTable.finalY + 12;
  }
  return fallbackY;
};

// Helper para adicionar rodapé e numeração de página
export const addFooter = (doc: jsPDF) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gestão Financeira | Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
  }
};

export const exportToPDF = (
  transactions: ExportTransaction[],
  filename = "relatorio_seu_bolso_inteligente.pdf"
) => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // 1. Cabeçalho Premium com Marca
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("controle financeiro", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Financeiro Consolidado", 14, 28);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 20);

  // 2. Resumo de Saldo
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro do Período", 14, 48);

  const totalsByCurrency = calculateTransactionTotalsByCurrency(transactions);

  safeCallAutoTable(doc, {
    head: [["Moeda", "Receitas", "Despesas", "Saldo"]],
    body: Object.entries(totalsByCurrency).map(([currency, total]) => [
      currency,
      formatExportMoney(total.income, currency),
      formatExportMoney(total.expense, currency),
      formatExportMoney(total.balance, currency),
    ]),
    startY: 52,
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120] },
      1: { fontStyle: "bold", textColor: [16, 185, 129], halign: "right" },
      2: { fontStyle: "bold", textColor: [239, 68, 68], halign: "right" },
      3: { fontStyle: "bold", halign: "right" },
    },
  });

  const nextStartY = getNextStartY(doc, 80);

  // 3. Tabela de Transações Detalhada
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Lista de Lançamentos", 14, nextStartY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Moeda", "Valor"];
  const tableRows = transactions.map((t) => {
    const currency = resolveItemCurrency(t);
    return [
      safeFormatDate(t.date),
      t.description || "Sem descrição",
      t.category?.name || "Sem categoria",
      t.type === "INCOME" ? "Receita" : "Despesa",
      currency,
      formatExportMoney(Number(t.amount || 0), currency),
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: nextStartY + 5,
    theme: "striped",
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "right", fontStyle: "bold" },
      5: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (cellData: CellHookData) => {
      if (cellData.section === "body" && cellData.column.index === 3) {
        const typeVal = cellData.cell.text[0];
        if (typeVal === "Receita") cellData.cell.styles.textColor = [16, 185, 129];
        else if (typeVal === "Despesa") cellData.cell.styles.textColor = [239, 68, 68];
      }
    },
  });

  addFooter(doc);
  doc.save(filename);
};

export const exportAccountsToPDF = (
  transactions: ExportTransaction[],
  accounts: ExportAccount[],
  periodLabel: string,
  totalBalance: number
) => {
  const accountIds = accounts.map((a) => a.id);
  const accTransactions = transactions.filter(
    (t) =>
      (t.account_id && accountIds.includes(t.account_id)) ||
      (t.destination_account_id && accountIds.includes(t.destination_account_id))
  );

  if (accTransactions.length === 0) {
    toast.error("Não há lançamentos de contas no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");

  // Header
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("controle financeiro", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Extrato de Contas Bancárias - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today}`, 150, 20);

  // Summary
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro das Contas", 14, 48);

  void totalBalance;
  const totalsByCurrency = calculateTransactionTotalsByCurrency(accTransactions, accounts);
  const accountBalancesByCurrency = accounts.reduce<
    Record<string, { income: number; expense: number; balance: number }>
  >((acc, account) => {
    const currency = account.currency || "BRL";
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    acc[currency].balance += Number(account.balance || 0);
    return acc;
  }, {});

  safeCallAutoTable(doc, {
    body: [
      [
        "Total de Entradas:",
        formatTotalsInline(totalsByCurrency, "income"),
        "Total de Saídas:",
        formatTotalsInline(totalsByCurrency, "expense"),
      ],
      [
        "Saldo do Período:",
        formatTotalsInline(totalsByCurrency, "balance"),
        "Saldo Atual das Contas:",
        formatTotalsInline(accountBalancesByCurrency, "balance"),
      ],
    ],
    startY: 52,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120] },
      1: { fontStyle: "bold", textColor: [16, 185, 129] },
      2: { fontStyle: "bold", textColor: [100, 110, 120] },
      3: { fontStyle: "bold", textColor: [31, 41, 55] },
    },
  });

  const startY = getNextStartY(doc, 75);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Lançamentos Recentes", 14, startY);

  const tableColumn = [
    "Data",
    "Descrição",
    "Categoria",
    "Tipo",
    "Conta Origem/Destino",
    "Moeda",
    "Valor",
  ];
  const tableRows = accTransactions.map((t) => {
    let typeText = "Despesa";
    if (t.type === "INCOME") typeText = "Receita";
    else if (t.type === "TRANSFER") typeText = "Transf.";
    else if (t.type === "DEPOSIT") typeText = "Depósito";
    else if (t.type === "WITHDRAWAL") typeText = "Saque";

    const accountName =
      t.type === "TRANSFER"
        ? `${accounts.find((a) => a.id === t.account_id)?.name || ""} -> ${accounts.find((a) => a.id === t.destination_account_id)?.name || ""}`
        : accounts.find((a) => a.id === t.account_id)?.name ||
          accounts.find((a) => a.id === t.destination_account_id)?.name ||
          "";

    const currency = resolveItemCurrency(t, accounts);
    return [
      safeFormatDate(t.date),
      t.description || "Sem descrição",
      t.category?.name || "Sem categoria",
      typeText,
      accountName,
      currency,
      formatExportMoney(Number(t.amount || 0), currency),
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY + 5,
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      6: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (cellData: CellHookData) => {
      if (cellData.section === "body" && cellData.column.index === 3) {
        const typeVal = cellData.cell.text[0];
        if (typeVal === "Receita") cellData.cell.styles.textColor = [16, 185, 129];
        else if (typeVal === "Despesa") cellData.cell.styles.textColor = [239, 68, 68];
      }
    },
  });

  addFooter(doc);
  doc.save(`extrato_contas_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.pdf`);
};

export const exportCardsToPDF = (
  transactions: ExportTransaction[],
  cards: ExportCard[],
  periodLabel: string,
  totalLimit: number,
  totalInvoices: number
) => {
  const cardIds = cards.map((c) => c.id);
  const cardTransactions = transactions.filter(
    (t) => t.account_id && cardIds.includes(t.account_id)
  );

  if (cardTransactions.length === 0) {
    toast.error("Não há lançamentos de cartões no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");

  // Header
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("controle financeiro", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Extrato de Cartões de Crédito - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today}`, 150, 20);

  // Summary
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo das Faturas de Cartão", 14, 48);

  void totalLimit;
  void totalInvoices;
  const totalsByCurrency = calculateTransactionTotalsByCurrency(cardTransactions, cards);
  const cardLimitsByCurrency = cards.reduce<
    Record<string, { income: number; expense: number; balance: number }>
  >((acc, card) => {
    const currency = card.currency || "BRL";
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    acc[currency].balance += Number(card.credit_limit || 0);
    return acc;
  }, {});
  const cardInvoicesByCurrency = cards.reduce<
    Record<string, { income: number; expense: number; balance: number }>
  >((acc, card) => {
    const currency = card.currency || "BRL";
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    acc[currency].balance += Number(card.balance || 0);
    return acc;
  }, {});

  safeCallAutoTable(doc, {
    body: [
      [
        "Total Gasto no Período:",
        formatTotalsInline(totalsByCurrency, "expense"),
        "Faturas Totais Atuais:",
        formatTotalsInline(cardInvoicesByCurrency, "balance"),
      ],
      [
        "Limite Total de Crédito:",
        formatTotalsInline(cardLimitsByCurrency, "balance"),
        "Uso de Limite Consolidado:",
        "Por moeda",
      ],
    ],
    startY: 52,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120] },
      1: { fontStyle: "bold", textColor: [239, 68, 68] },
      2: { fontStyle: "bold", textColor: [100, 110, 120] },
      3: { fontStyle: "bold", textColor: [31, 41, 55] },
    },
  });

  const startY = getNextStartY(doc, 75);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Lançamentos nas Faturas", 14, startY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Cartão", "Parcela", "Moeda", "Valor"];
  const tableRows = cardTransactions.map((t) => {
    const cardName = cards.find((c) => c.id === t.account_id)?.name || "";
    const installmentText = t.is_installment
      ? `${t.current_installment}/${t.total_installments}`
      : "À vista";

    const currency = resolveItemCurrency(t, cards);
    return [
      safeFormatDate(t.date),
      t.description || "Sem descrição",
      t.category?.name || "Sem categoria",
      cardName,
      installmentText,
      currency,
      formatExportMoney(Number(t.amount || 0), currency),
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY + 5,
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      6: { halign: "right", fontStyle: "bold" },
    },
  });

  addFooter(doc);
  doc.save(`extrato_cartoes_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.pdf`);
};

export const exportSharedToPDF = (
  invoiceItems: ExportInvoiceItem[],
  periodLabel: string,
  totalsByCurrency: Record<string, unknown>
) => {
  if (!invoiceItems || invoiceItems.length === 0) {
    toast.error("Não há lançamentos compartilhados no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");

  // Header
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("controle financeiro", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Extrato de Despesas Compartilhadas - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today}`, 150, 20);

  // Summary
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Balanço Consolidado de Acertos por Moeda", 14, 48);

  safeCallAutoTable(doc, {
    head: [["Moeda", "A Receber", "A Pagar", "Balanço", "Liquidado"]],
    body: Object.entries(totalsByCurrency).map(([currency, totals]) => [
      currency,
      formatExportMoney(Number((totals as any).owedToMe || 0), currency),
      formatExportMoney(Number((totals as any).iOwe || 0), currency),
      formatExportMoney(Number((totals as any).balance || 0), currency),
      formatExportMoney(Number((totals as any).settled || 0), currency),
    ]),
    startY: 52,
    theme: "striped",
    styles: { fontSize: 9.5, cellPadding: 2 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120] },
      1: { fontStyle: "bold", textColor: [16, 185, 129] }, // Verde
      2: { fontStyle: "bold", textColor: [100, 110, 120] },
      3: { fontStyle: "bold", textColor: [239, 68, 68] }, // Vermelho
    },
  });

  const startY = getNextStartY(doc, 75);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento de Lançamentos Compartilhados", 14, startY);

  const tableColumn = [
    "Membro",
    "Data",
    "Descrição",
    "Categoria",
    "Relação",
    "Status",
    "Moeda",
    "Valor",
  ];
  const tableRows = invoiceItems.map((item) => [
    item.memberName || "Desconhecido",
    safeFormatDate(item.date),
    item.description || "Sem descrição",
    item.category?.name || "Sem categoria",
    item.type === "CREDIT" ? "A Receber" : "A Pagar",
    item.isPaid ? "Acertado" : "Pendente",
    item.currency || "BRL",
    formatExportMoney(Number(item.amount || 0), item.currency || "BRL"),
  ]);

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY + 5,
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      7: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (cellData: CellHookData) => {
      if (cellData.section === "body") {
        if (cellData.column.index === 4) {
          const rel = cellData.cell.text[0];
          if (rel === "A Receber") cellData.cell.styles.textColor = [16, 185, 129];
          else cellData.cell.styles.textColor = [239, 68, 68];
        }
        if (cellData.column.index === 5) {
          const status = cellData.cell.text[0];
          if (status === "Acertado") cellData.cell.styles.textColor = [16, 185, 129];
          else cellData.cell.styles.textColor = [245, 158, 11]; // Laranja
        }
      }
    },
  });

  addFooter(doc);
  doc.save(`extrato_compartilhado_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.pdf`);
};

export const exportDetailedCardReportToPDF = (
  transactions: ExportTransaction[],
  card: ExportCard,
  periodLabel: string
) => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // 1. Cabeçalho Premium
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("controle financeiro", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Relatório Detalhado: Cartão ${card?.name || ""} - ${periodLabel}`, 14, 28);
  doc.text(`Emitido em: ${today} às ${now}`, 150, 20);

  // Calcular TOTAIS e CATEGORIAS
  let totalExpense = 0;
  const categoriesMap: Record<string, number> = {};

  const currency = card?.currency || "BRL";

  transactions.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.type === "EXPENSE") {
      totalExpense += amt;
      const catName = t.category?.name || "Outros";
      categoriesMap[catName] = (categoriesMap[catName] || 0) + amt;
    } else if (t.type === "INCOME") {
      totalExpense -= amt;
    }
  });

  const categoriesList = Object.entries(categoriesMap)
    .sort((a, b) => b[1] - a[1]) // maior pra menor
    .filter(([_, val]) => val > 0);

  // 2. Resumo da Fatura/Período
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do Cartão", 14, 48);

  safeCallAutoTable(doc, {
    body: [
      ["Gasto Total no Período:", formatExportMoney(totalExpense, currency)],
      ["Limite do Cartão:", formatExportMoney(Number(card?.credit_limit || 0), currency)],
    ],
    startY: 52,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 120], cellWidth: 50 },
      1: { fontStyle: "bold", textColor: [239, 68, 68] },
    },
  });

  let nextStartY = getNextStartY(doc, 75);

  // 3. Distribuição por Categoria
  if (categoriesList.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    doc.text("Maiores Gastos por Categoria", 14, nextStartY);

    safeCallAutoTable(doc, {
      head: [["Categoria", "Valor", "% do Total"]],
      body: categoriesList
        .slice(0, 10)
        .map(([cat, val]) => [
          cat,
          formatExportMoney(val, currency),
          ((val / Math.max(totalExpense, 1)) * 100).toFixed(1) + "%",
        ]),
      startY: nextStartY + 5,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 110, 120] },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    });

    nextStartY = getNextStartY(doc, nextStartY + 30);
  }

  // 4. Lista de Lançamentos
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Lançamentos Detalhados", 14, nextStartY);

  const tableColumn = ["Data", "Descrição", "Categoria", "Parcela", "Moeda", "Valor"];
  const tableRows = transactions.map((t) => {
    const installmentText = t.is_installment
      ? `Parc. ${t.current_installment}/${t.total_installments}`
      : "À vista";

    const tCurrency = resolveItemCurrency(t, [card]);
    return [
      safeFormatDate(t.date),
      t.description || "Sem descrição",
      t.category?.name || "Sem categoria",
      installmentText,
      tCurrency,
      formatExportMoney(Number(t.amount || 0), tCurrency),
    ];
  });

  safeCallAutoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: nextStartY + 5,
    theme: "striped",
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: {
      5: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (cellData: CellHookData) => {
      if (cellData.section === "body" && cellData.column.index === 5) {
        cellData.cell.styles.textColor = [239, 68, 68]; // Red for expenses
      }
    },
  });

  addFooter(doc);
  doc.save(
    `relatorio_detalhado_${card?.name?.replace(/\s+/g, "_")}_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.pdf`
  );
};
