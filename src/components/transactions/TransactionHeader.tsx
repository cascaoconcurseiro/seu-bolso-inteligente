import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, FileText } from "lucide-react";
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
  loadAnnualTransactions: () => Promise<Transaction[]>;
  onImportOFX: () => void;
}

export function TransactionHeader({
  count,
  filteredTransactions,
  loadAnnualTransactions,
  onImportOFX,
}: TransactionHeaderProps) {
  return (
    <header className="mb-6 border-b border-border pb-5 md:pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Movimentações</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Transações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count === 1 ? "1 registro neste período" : `${count} registros neste período`}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button
            variant="default"
            size="sm"
            className="h-11 w-full gap-2 px-3 sm:w-auto"
            onClick={onImportOFX}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="truncate text-sm">Importar OFX</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 w-full gap-2 px-3 sm:w-auto">
                <Download className="h-4 w-4" />
                <span className="text-sm">Exportar</span>
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
                onClick={async () => {
                  try {
                    exportTransactions(await loadAnnualTransactions(), "csv");
                    toast.success("Transações anuais exportadas em Excel");
                  } catch {
                    toast.error("Não foi possível carregar as transações anuais");
                  }
                }}
                className="gap-2 border-t border-border mt-1 pt-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Anual em Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    exportTransactions(await loadAnnualTransactions(), "pdf");
                    toast.success("Transações anuais exportadas em PDF");
                  } catch {
                    toast.error("Não foi possível carregar as transações anuais");
                  }
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
    </header>
  );
}
