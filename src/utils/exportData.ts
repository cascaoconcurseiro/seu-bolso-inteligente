/**
 * Facade de exportação de dados (CSV e PDF).
 * Reexporta todas as funções de exportCSV.ts e exportPDF.ts para garantir retrocompatibilidade.
 */
export {
  downloadExcel,
  exportToCSV,
  exportAccountsToCSV,
  exportCardsToCSV,
  exportSharedToCSV,
  exportDetailedCardReportToCSV,
} from "./exportCSV";

export {
  exportToPDF,
  exportAccountsToPDF,
  exportCardsToPDF,
  exportSharedToPDF,
  exportDetailedCardReportToPDF,
} from "./exportPDF";
