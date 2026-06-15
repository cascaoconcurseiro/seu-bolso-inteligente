import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface ExportData {
  month: Date;
  transactions: any[];
  sharedPurchases: any[];
  debts: any[];
  cashFlow: any;
}

export const exportMonthlyReport = async (data: ExportData) => {
  try {
    // 1. Download template from Supabase Storage
    const { data: templateData, error: downloadError } = await supabase
      .storage
      .from('templates')
      .download('template_base.xlsx');

    let workbook = new ExcelJS.Workbook();

    if (downloadError || !templateData) {
      console.warn('Template não encontrado no Supabase. Criando planilha em branco como fallback.');
      // Fallback: create empty workbook if template is missing
      workbook.addWorksheet('Fluxo de Caixa');
      workbook.addWorksheet('Transações Mês a Mês');
      workbook.addWorksheet('Compartilhado Fran (Compras Mês)');
      workbook.addWorksheet('Dívidas Fran');
    } else {
      // Load existing template
      const arrayBuffer = await templateData.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      // Rename existing sheets if they match the old names
      const mercadoSheet = workbook.worksheets.find(s => s.name.toLowerCase() === 'mercado');
      if (mercadoSheet) mercadoSheet.name = 'Compartilhado Fran (Compras Mês)';

      const compartilhadoSheet = workbook.worksheets.find(s => s.name.toLowerCase() === 'compartilhado fran');
      if (compartilhadoSheet) compartilhadoSheet.name = 'Dívidas Fran';

      // Ensure 'Transações Mês a Mês' exists
      if (!workbook.worksheets.find(s => s.name === 'Transações Mês a Mês')) {
        workbook.addWorksheet('Transações Mês a Mês');
      }
    }

    // 2. Transações Mês a Mês
    const transacoesSheet = workbook.getWorksheet('Transações Mês a Mês')!;
    transacoesSheet.spliceRows(2, Math.max(transacoesSheet.rowCount, 2)); // Clear old data if any
    transacoesSheet.getRow(1).values = ['Data', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Tipo'];
    transacoesSheet.getRow(1).font = { bold: true };
    
    data.transactions.forEach((tx, index) => {
      transacoesSheet.addRow([
        format(new Date(tx.date || tx.competency_date), 'dd/MM/yyyy'),
        tx.description,
        tx.category?.name || '',
        Array.isArray(tx.account) ? tx.account[0]?.name : tx.account?.name || '',
        tx.amount,
        tx.type
      ]);
    });

    // 3. Compartilhado Fran (Compras Mês)
    const comprasSheet = workbook.getWorksheet('Compartilhado Fran (Compras Mês)');
    if (comprasSheet) {
      comprasSheet.spliceRows(2, Math.max(comprasSheet.rowCount, 2));
      comprasSheet.getRow(1).values = ['Data', 'Descrição', 'Valor Total', 'Sua Parte', 'Parte Fran', 'Status'];
      data.sharedPurchases.forEach(tx => {
        const meuValor = tx.transaction_splits?.find((s:any) => s.member_id !== null)?.amount || (tx.amount / 2);
        const franValor = tx.amount - meuValor;
        comprasSheet.addRow([
          format(new Date(tx.date || tx.competency_date), 'dd/MM/yyyy'),
          tx.description,
          tx.amount,
          meuValor,
          franValor,
          tx.status
        ]);
      });
    }

    // 4. Dívidas Fran
    const dividasSheet = workbook.getWorksheet('Dívidas Fran');
    if (dividasSheet) {
      dividasSheet.spliceRows(2, Math.max(dividasSheet.rowCount, 2));
      dividasSheet.getRow(1).values = ['Dívida/Fatura', 'Valor Original', 'Falta Pagar'];
      data.debts.forEach(debt => {
        dividasSheet.addRow([
          debt.description || debt.name,
          debt.total_amount || debt.amount,
          debt.remaining_amount || 0
        ]);
      });
    }

    // 5. Fluxo de Caixa
    // Se o usuário precisa que a planilha de Fluxo de Caixa tenha valores atualizados:
    const fluxoSheet = workbook.getWorksheet('Fluxo de Caixa');
    if (fluxoSheet) {
      // Deixamos intacta caso o Excel resolva tudo via fórmulas vinculadas às outras abas.
    }

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Fechamento_${format(data.month, 'MM_yyyy')}.xlsx`;
    saveAs(blob, fileName);

    return true;
  } catch (error) {
    console.error('Erro ao exportar planilha:', error);
    throw error;
  }
};
