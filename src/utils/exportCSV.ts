import { toast } from "sonner";
import { format } from "date-fns";
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

// Helper para formatação de datas de forma ultra-segura
export const safeFormatDate = (dateVal: unknown): string => {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return format(utcDate, "dd/MM/yyyy");
  } catch {
    return "N/A";
  }
};

// Helper para disparar download de Excel (.xls) com formatação HTML/XML Premium
export const downloadExcel = (htmlContent: string, filename: string) => {
  const safeFilename = filename.replace(/\.csv$/, ".xls");
  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", safeFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToCSV = (
  transactions: ExportTransaction[],
  filename = "transacoes_seu_bolso_inteligente.csv"
) => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString("pt-BR");
  const totalsByCurrency = calculateTransactionTotalsByCurrency(transactions);
  const balance = Object.values(totalsByCurrency).reduce((sum, total) => sum + total.balance, 0);
  const summaryRows = Object.entries(totalsByCurrency)
    .map(
      ([currency, total]) => `
      <tr>
        <td class="text-cell">${currency}</td>
        <td colspan="2" class="value-cell text-cell green-text">${formatExportMoney(total.income, currency)}</td>
        <td colspan="2" class="value-cell text-cell red-text">${formatExportMoney(total.expense, currency)}</td>
        <td colspan="2" class="value-cell text-cell ${total.balance >= 0 ? "green-text" : "red-text"}">${formatExportMoney(total.balance, currency)}</td>
      </tr>
  `
    )
    .join("");

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
        <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, "income")}</td>
        <td class="label-cell">Total de Despesas:</td>
        <td colspan="3" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, "expense")}</td>
      </tr>
      <tr>
        <td class="label-cell">Saldo Líquido:</td>
        <td colspan="2" class="value-cell text-cell">${formatTotalsInline(totalsByCurrency, "balance")}</td>
        <td class="label-cell">Status Financeiro:</td>
        <td colspan="3" class="value-cell text-cell" style="font-weight: bold; color: ${balance >= 0 ? "#059669" : "#dc2626"}">${balance >= 0 ? "Superavitário" : "Deficitário"}</td>
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
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : "";
    const dateFormatted = safeFormatDate(t.date);
    const amountVal = Number(t.amount || 0);
    const currency = resolveItemCurrency(t);

    html += `
      <tr ${zebraClass}>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell" style="color: ${t.type === "INCOME" ? "#059669" : "#dc2626"}">${t.type === "INCOME" ? "Receita" : "Despesa"}</td>
        <td class="text-cell">${t.description || "Sem descrição"}</td>
        <td class="text-cell">${t.category?.name || "Sem categoria"}</td>
        <td class="text-cell" style="font-weight: bold; color: ${t.type === "INCOME" ? "#059669" : "#dc2626"}">${formatExportMoney(amountVal, currency)}</td>
        <td class="text-cell">${currency}</td>
        <td class="text-cell">${t.account?.name || ""}</td>
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

export const exportAccountsToCSV = (
  transactions: ExportTransaction[],
  accounts: ExportAccount[],
  periodLabel: string
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

  const today = new Date().toLocaleDateString("pt-BR");
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
        <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, "income")}</td>
        <td class="label-cell">Total de Saídas:</td>
        <td colspan="4" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, "expense")}</td>
      </tr>
      <tr>
        <td class="label-cell">Saldo do Período:</td>
        <td colspan="2" class="value-cell text-cell ${balance >= 0 ? "green-text" : "red-text"}">${formatTotalsInline(totalsByCurrency, "balance")}</td>
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
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : "";
    const dateFormatted = safeFormatDate(t.date);
    let typeText = "Despesa";
    if (t.type === "INCOME") typeText = "Receita";
    else if (t.type === "TRANSFER") typeText = "Transferência";
    else if (t.type === "DEPOSIT") typeText = "Depósito";
    else if (t.type === "WITHDRAWAL") typeText = "Saque";

    const originAccount = accounts.find((a) => a.id === t.account_id)?.name || "";
    const destAccount = accounts.find((a) => a.id === t.destination_account_id)?.name || "";
    const amountVal = Number(t.amount || 0);
    const currency = resolveItemCurrency(t, accounts);

    html += `
      <tr ${zebraClass}>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell" style="color: ${t.type === "INCOME" ? "#059669" : t.type === "EXPENSE" ? "#dc2626" : "#4b5563"}">${typeText}</td>
        <td class="text-cell">${t.description || "Sem descrição"}</td>
        <td class="text-cell">${t.category?.name || "Sem categoria"}</td>
        <td class="text-cell">${currency}</td>
        <td class="text-cell" style="font-weight: bold; color: ${t.type === "INCOME" ? "#059669" : t.type === "EXPENSE" ? "#dc2626" : "#4b5563"}">${formatExportMoney(amountVal, currency)}</td>
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

  downloadExcel(html, `extrato_contas_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.xls`);
};

export const exportCardsToCSV = (
  transactions: ExportTransaction[],
  cards: ExportCard[],
  periodLabel: string
) => {
  const cardIds = cards.map((c) => c.id);
  const cardTransactions = transactions.filter(
    (t) => t.account_id && cardIds.includes(t.account_id)
  );

  if (cardTransactions.length === 0) {
    toast.error("Não há lançamentos de cartões no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString("pt-BR");
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
        <td colspan="2" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, "expense")}</td>
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
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : "";
    const dateFormatted = safeFormatDate(t.date);
    const cardName = cards.find((c) => c.id === t.account_id)?.name || "";
    const installmentText = t.is_installment
      ? `Parc. ${t.current_installment}/${t.total_installments}`
      : "À vista";
    const amountVal = Number(t.amount || 0);
    const currency = resolveItemCurrency(t, cards);

    html += `
      <tr ${zebraClass}>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell">${t.description || "Sem descrição"}</td>
        <td class="text-cell">${t.category?.name || "Sem categoria"}</td>
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

  downloadExcel(html, `extrato_cartoes_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.xls`);
};

export const exportSharedToCSV = (invoiceItems: ExportInvoiceItem[], periodLabel: string) => {
  if (!invoiceItems || invoiceItems.length === 0) {
    toast.error("Não há lançamentos compartilhados no período selecionado para exportar.");
    return;
  }

  const today = new Date().toLocaleDateString("pt-BR");
  const totalsByCurrency = invoiceItems.reduce<
    Record<string, { income: number; expense: number; balance: number }>
  >((acc, item) => {
    const currency = item.currency || "BRL";
    if (!acc[currency]) acc[currency] = { income: 0, expense: 0, balance: 0 };
    if (item.type === "CREDIT") acc[currency].income += Number(item.amount || 0);
    if (item.type === "DEBIT") acc[currency].expense += Number(item.amount || 0);
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
        <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, "income")}</td>
        <td class="label-cell">Total a Pagar:</td>
        <td colspan="4" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, "expense")}</td>
      </tr>
      <tr>
        <td class="label-cell">Balanço Líquido:</td>
        <td colspan="2" class="value-cell text-cell ${balance >= 0 ? "green-text" : "red-text"}">${formatTotalsInline(totalsByCurrency, "balance")}</td>
        <td class="label-cell">Status do Grupo:</td>
        <td colspan="4" class="value-cell text-cell" style="font-weight: bold; color: ${balance >= 0 ? "#059669" : "#dc2626"}">${balance >= 0 ? "Credor Líquido" : "Devedor Líquido"}</td>
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
    const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : "";
    const dateFormatted = safeFormatDate(item.date);
    const amountVal = Number(item.amount || 0);

    html += `
      <tr ${zebraClass}>
        <td class="text-cell">${item.memberName || "Desconhecido"}</td>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell">${item.description || "Sem descrição"}</td>
        <td class="text-cell">${item.category?.name || "Sem categoria"}</td>
        <td class="text-cell" style="color: ${item.type === "CREDIT" ? "#059669" : "#dc2626"}">${item.type === "CREDIT" ? "Você Recebe" : "Você Deve"}</td>
        <td class="text-cell" style="font-weight: bold; color: ${item.type === "CREDIT" ? "#059669" : "#dc2626"}">${formatExportMoney(amountVal, item.currency || "BRL")}</td>
        <td class="text-cell" style="font-weight: bold; color: ${item.isPaid ? "#059669" : "#d97706"}">${item.isPaid ? "Pago" : "Pendente"}</td>
        <td class="text-cell">${item.tripId ? "Sim" : "Não"}</td>
      </tr>
    `;
  });

  html += `
    </table>
    </body>
    </html>
  `;

  downloadExcel(
    html,
    `extrato_compartilhado_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.xls`
  );
};

export const exportDetailedCardReportToCSV = (
  transactions: ExportTransaction[],
  card: ExportCard,
  periodLabel: string
) => {
  if (!transactions || transactions.length === 0) {
    toast.error("Não há lançamentos no período selecionado para exportar.");
    return;
  }

  const currency = card?.currency || "BRL";

  let totalExpense = 0;
  transactions.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.type === "EXPENSE") totalExpense += amt;
    else if (t.type === "INCOME") totalExpense -= amt;
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
        <th colspan="6" class="brand-title">Relatório Detalhado: Cartão ${card?.name || ""} - ${periodLabel}</th>
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
      : "À vista";
    const amountVal = Number(t.amount || 0);
    const tCurrency = resolveItemCurrency(t, [card]);

    html += `
      <tr>
        <td class="date-cell">${dateFormatted}</td>
        <td class="text-cell">${t.description || "Sem descrição"}</td>
        <td class="text-cell">${t.category?.name || "Sem categoria"}</td>
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

  downloadExcel(
    html,
    `relatorio_detalhado_${card?.name?.replace(/\s+/g, "_")}_${periodLabel.toLowerCase().replace(/\s+/g, "_")}.xls`
  );
};
