import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportToCSV = (transactions: any[], filename = 'transacoes.csv') => {
  if (!transactions || transactions.length === 0) return;

  const data = transactions.map(t => ({
    Data: format(new Date(t.date), 'dd/MM/yyyy'),
    Tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
    Descrição: t.description,
    Categoria: t.category,
    Valor: t.amount,
    Moeda: t.currency || 'BRL',
    Conta: t.account?.name || '',
    Membro: t.member?.name || ''
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (transactions: any[], totalIncome: number, totalExpense: number, filename = 'relatorio.pdf') => {
  if (!transactions || transactions.length === 0) return;

  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Relatório Financeiro', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, 30);
  
  // Resumo
  doc.text(`Total de Receitas: R$ ${totalIncome.toFixed(2)}`, 14, 40);
  doc.text(`Total de Despesas: R$ ${totalExpense.toFixed(2)}`, 14, 46);
  doc.text(`Saldo do Período: R$ ${(totalIncome - totalExpense).toFixed(2)}`, 14, 52);

  // Tabela
  const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Valor (R$)"];
  const tableRows: any[] = [];

  transactions.forEach(t => {
    const row = [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.description,
      t.category,
      t.type === 'INCOME' ? 'Receita' : 'Despesa',
      t.amount.toFixed(2)
    ];
    tableRows.push(row);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 60,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] } // Verde do tema
  });

  doc.save(filename);
};
