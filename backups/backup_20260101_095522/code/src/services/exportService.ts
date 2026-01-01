import { Transaction } from "@/hooks/useTransactions";

export interface ExportOptions {
  format: "csv" | "json";
  dateRange?: { start: Date; end: Date };
  includeFields?: string[];
}

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

const formatCurrency = (value: number, currency: string = "BRL") => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
};

const escapeCSV = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = [
    "Data",
    "Descrição",
    "Tipo",
    "Categoria",
    "Valor",
    "Moeda",
    "Conta",
    "Parcela",
    "Compartilhada",
    "Observação",
  ];

  const rows = transactions.map((tx) => [
    formatDate(tx.date),
    escapeCSV(tx.description),
    tx.type === "RECEITA" ? "Receita" : tx.type === "DESPESA" ? "Despesa" : "Transferência",
    escapeCSV(tx.category || ""),
    tx.amount,
    tx.currency || "BRL",
    escapeCSV(tx.account?.name || ""),
    tx.is_installment ? `${tx.current_installment}/${tx.total_installments}` : "",
    tx.is_shared ? "Sim" : "Não",
    escapeCSV(tx.observation || ""),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => escapeCSV(cell)).join(",")),
  ].join("\n");

  return csvContent;
}

export function exportTransactionsToJSON(transactions: Transaction[]): string {
  const data = transactions.map((tx) => ({
    data: tx.date,
    descricao: tx.description,
    tipo: tx.type,
    categoria: tx.category,
    valor: tx.amount,
    moeda: tx.currency || "BRL",
    conta: tx.account?.name || null,
    parcela: tx.is_installment
      ? { atual: tx.current_installment, total: tx.total_installments }
      : null,
    compartilhada: tx.is_shared,
    observacao: tx.observation || null,
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

export function exportTransactions(
  transactions: Transaction[],
  format: "csv" | "json" = "csv"
) {
  const date = new Date().toISOString().split("T")[0];
  
  if (format === "csv") {
    const content = exportTransactionsToCSV(transactions);
    downloadFile(content, `transacoes_${date}.csv`, "text/csv;charset=utf-8;");
  } else {
    const content = exportTransactionsToJSON(transactions);
    downloadFile(content, `transacoes_${date}.json`, "application/json");
  }
}
