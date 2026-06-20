import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Download, 
  FileText 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportTransactions } from "@/services/exportService";
import { toast } from "sonner";
import { Transaction } from "@/utils/transactionUtils";

interface TransactionHeaderProps {
  count: number;
  filteredTransactions: Transaction[];
  filteredAnnualTransactions: Transaction[];
  onImportOFX: () => void;
}

export function TransactionHeader({ count, filteredTransactions, filteredAnnualTransactions, onImportOFX }: TransactionHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-4xl tracking-tighter">Transações</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base font-medium">{count} registros</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="default" size="sm" className="w-full sm:w-auto gap-1 md:gap-2 h-10 md:h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 px-2" onClick={onImportOFX}>
          <FileSpreadsheet className="h-4 w-4" />
          <span className="text-xs md:text-sm truncate">Importar OFX</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1 md:gap-2 h-10 md:h-11 px-2">
              <Download className="h-4 w-4" />
              <span className="text-xs md:text-sm">Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => {
                exportTransactions(filteredTransactions, "csv");
                toast.success("Transações mensais exportadas em Excel");
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Mensal em Excel
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                exportTransactions(filteredTransactions, "pdf");
                toast.success("Transações mensais exportadas em PDF");
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Mensal em PDF
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                exportTransactions(filteredAnnualTransactions, "csv");
                toast.success("Transações anuais exportadas em Excel");
              }}
              className="gap-2 border-t border-border mt-1 pt-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Anual em Excel
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                exportTransactions(filteredAnnualTransactions, "pdf");
                toast.success("Transações anuais exportadas em PDF");
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4 text-primary" />
              Anual em PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    </div>
  );
}
