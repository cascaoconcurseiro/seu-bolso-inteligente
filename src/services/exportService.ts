import { calculateTransactionTotalsByCurrency, formatExportMoney, formatTotalsInline, resolveItemCurrency } from "@/utils/exportCurrency";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { logger } from '@/utils/logger';
export interface ExportOptions {
  format: "csv" | "json";
  dateRange?: { start: Date; end: Date };
  includeFields?: string[];
}

const safeFormatDate = (dateVal: any): string => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    // Corrige fuso horário local na renderização
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const day = String(utcDate.getDate()).padStart(2, '0');
    const month = String(utcDate.getMonth() + 1).padStart(2, '0');
    const year = utcDate.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return 'N/A';
  }
};

export function exportTransactionsToJSON(transactions: any[]): string {
  const data = transactions.map((tx) => ({
    data: tx.date,
    descricao: tx.description,
    tipo: tx.type,
    categoria: tx.category?.name || tx.category || null,
    valor: tx.amount,
    moeda: resolveItemCurrency(tx),
    conta: tx.account?.name || null,
    parcela: tx.is_installment
      ? { atual: tx.current_installment, total: tx.total_installments }
      : null,
    compartilhada: tx.is_shared,
    observacao: tx.notes || tx.observation || null,
  }));

  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportTransactions(
  transactions: any[],
  format: "csv" | "json" | "pdf" = "csv"
) {
  const date = new Date().toISOString().split("T")[0];
  const today = new Date().toLocaleDateString('pt-BR');
  
  const totalIncome = transactions.filter(t => t.type === 'INCOME' || t.type === 'RECEITA').reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount || 0)), 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' || t.type === 'DESPESA').reduce((sum, t) => SafeFinancialCalculator.add(sum, Number(t.amount || 0)), 0);
  const totalsByCurrency = calculateTransactionTotalsByCurrency(transactions);

  if (format === "pdf") {
    const { exportToPDF } = await import("@/utils/exportData");
    exportToPDF(transactions, totalIncome, totalExpense, `transacoes_${date}.pdf`);
  } else if (format === "csv") {
    // Formatação de Excel Premium em XML/HTML
    const balance = SafeFinancialCalculator.subtract(totalIncome, totalExpense);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Transações</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
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
        <!-- Título Principal -->
        <tr>
          <th colspan="9" class="brand-title">CONTROLE FINANCEIRO</th>
        </tr>
        <tr>
          <th colspan="9" class="brand-subtitle">Extrato de Transações — Emitido em ${today}</th>
        </tr>
        <tr><td colspan="9" style="border:none; height: 10px;"></td></tr>

        <!-- Resumo Financeiro -->
        <tr>
          <th colspan="9" class="section-title">1. RESUMO FINANCEIRO DAS TRANSAÇÕES EXPORTADAS</th>
        </tr>
        <tr>
          <td class="label-cell">Total de Receitas:</td>
          <td colspan="2" class="value-cell text-cell green-text">${formatTotalsInline(totalsByCurrency, "income")}</td>
          <td class="label-cell">Total de Despesas:</td>
          <td colspan="2" class="value-cell text-cell red-text">${formatTotalsInline(totalsByCurrency, "expense")}</td>
          <td class="label-cell">Saldo Líquido:</td>
          <td colspan="2" class="value-cell text-cell ${balance >= 0 ? 'green-text' : 'red-text'}">${formatTotalsInline(totalsByCurrency, "balance")}</td>
        </tr>
        <tr><td colspan="9" style="border:none; height: 15px;"></td></tr>

        <!-- Tabela Principal -->
        <tr>
          <th colspan="9" class="section-title">2. DETALHAMENTO DAS TRANSAÇÕES</th>
        </tr>
        <tr>
          <th class="th-premium date-cell" style="width: 80px;">Data</th>
          <th class="th-premium text-cell" style="width: 80px;">Tipo</th>
          <th colspan="2" class="th-premium text-cell" style="width: 250px;">Descrição</th>
          <th class="th-premium text-cell" style="width: 120px;">Categoria</th>
          <th class="th-premium number-cell" style="width: 100px;">Valor</th>
          <th class="th-premium text-cell" style="width: 60px;">Moeda</th>
          <th class="th-premium text-cell" style="width: 120px;">Conta</th>
          <th class="th-premium text-cell" style="width: 100px;">Parcelamento</th>
        </tr>
    `;

    transactions.forEach((t, index) => {
      const zebraClass = index % 2 === 1 ? 'class="tr-zebra"' : '';
      const dateFormatted = safeFormatDate(t.date);
      const isIncome = t.type === 'INCOME' || t.type === 'RECEITA';
      const typeText = isIncome ? 'Receita' : t.type === 'EXPENSE' || t.type === 'DESPESA' ? 'Despesa' : 'Transferência';
      const amountVal = Number(t.amount || 0);
      const currency = resolveItemCurrency(t);
      const installmentText = t.is_installment 
        ? `Parc. ${t.current_installment}/${t.total_installments}` 
        : '';

      html += `
        <tr ${zebraClass}>
          <td class="date-cell">${dateFormatted}</td>
          <td class="text-cell" style="color: ${isIncome ? '#059669' : t.type === 'TRANSFER' ? '#4b5563' : '#dc2626'}">${typeText}</td>
          <td colspan="2" class="text-cell">${t.description || 'Sem descrição'}</td>
          <td class="text-cell">${t.category?.name || t.category || 'Sem categoria'}</td>
          <td class="text-cell" style="font-weight: bold; color: ${isIncome ? '#059669' : t.type === 'TRANSFER' ? '#4b5563' : '#dc2626'}">${formatExportMoney(amountVal, currency)}</td>
          <td class="text-cell">${currency}</td>
          <td class="text-cell">${t.account?.name || ''}</td>
          <td class="text-cell">${installmentText}</td>
        </tr>
      `;
    });

    html += `
      </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transacoes_${date}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const content = exportTransactionsToJSON(transactions);
    downloadFile(content, `transacoes_${date}.json`, "application/json");
  }
}

export interface ExportData {
  month: Date;
  transactions: any[];
  sharedPurchases: any[];
  debts: any[];
  cashFlow: any;
}

export const exportMonthlyReport = async (data: ExportData) => {
  try {
    const { data: templateData, error: downloadError } = await supabase
      .storage
      .from('templates')
      .download('template_base.xlsx');

    const workbook = new ExcelJS.Workbook();

    if (downloadError || !templateData) {
      logger.warn('Template não encontrado no Supabase. Criando planilha em branco como fallback.');
      workbook.addWorksheet('Fluxo de Caixa');
      workbook.addWorksheet('Transações Mês a Mês');
      workbook.addWorksheet('Compras Compartilhadas');
      workbook.addWorksheet('Dívidas');
    } else {
      const arrayBuffer = await templateData.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      const mercadoSheet = workbook.worksheets.find(s => s.name.toLowerCase() === 'mercado');
      if (mercadoSheet) mercadoSheet.name = 'Compras Compartilhadas';

      const compartilhadoSheet = workbook.worksheets.find(s => s.name.toLowerCase() === 'compartilhado fran' || s.name.toLowerCase() === 'dívidas');
      if (compartilhadoSheet) compartilhadoSheet.name = 'Dívidas';

      if (!workbook.worksheets.find(s => s.name === 'Transações Mês a Mês')) {
        workbook.addWorksheet('Transações Mês a Mês');
      }
    }

    const transacoesSheet = workbook.getWorksheet('Transações Mês a Mês')!;
    if (transacoesSheet) {
      transacoesSheet.spliceRows(2, Math.max(transacoesSheet.rowCount, 2));
      transacoesSheet.getRow(1).values = ['Data', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Tipo'];
      transacoesSheet.getRow(1).font = { bold: true };
      
      (data.transactions || []).forEach((tx) => {
        transacoesSheet.addRow([
          format(new Date(tx.date || tx.competency_date), 'dd/MM/yyyy'),
          tx.description,
          tx.category?.name || '',
          Array.isArray(tx.account) ? tx.account[0]?.name : tx.account?.name || '',
          tx.amount,
          tx.type
        ]);
      });
    }

    const comprasSheet = workbook.getWorksheet('Compras Compartilhadas');
    if (comprasSheet) {
      comprasSheet.spliceRows(2, Math.max(comprasSheet.rowCount, 2));
      comprasSheet.getRow(1).values = ['Data', 'Descrição', 'Valor Total', 'Sua Parte', 'Parte Terceiros', 'Status'];
      (data.sharedPurchases || []).forEach(tx => {
        const meuValor = tx.transaction_splits?.find((s:any) => s.member_id !== null)?.amount || SafeFinancialCalculator.divide(tx.amount, 2);
        const outroValor = SafeFinancialCalculator.subtract(tx.amount, meuValor);
        comprasSheet.addRow([
          format(new Date(tx.date || tx.competency_date), 'dd/MM/yyyy'),
          tx.description,
          tx.amount,
          meuValor,
          outroValor,
          tx.status
        ]);
      });
    }

    const dividasSheet = workbook.getWorksheet('Dívidas');
    if (dividasSheet) {
      dividasSheet.spliceRows(2, Math.max(dividasSheet.rowCount, 2));
      dividasSheet.getRow(1).values = ['Dívida/Fatura', 'Valor Original', 'Falta Pagar'];
      const allDebts = Array.isArray(data.debts) ? data.debts : Object.values(data.debts || {}).flat();
      allDebts.forEach((debt: any) => {
        dividasSheet.addRow([
          debt.description || debt.name,
          debt.total_amount || debt.amount,
          debt.remaining_amount || 0
        ]);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Fechamento_${format(data.month, 'MM_yyyy')}.xlsx`;
    saveAs(blob, fileName);

    return true;
  } catch (error) {
    logger.error('Erro ao exportar planilha:', error);
    throw error;
  }
};
