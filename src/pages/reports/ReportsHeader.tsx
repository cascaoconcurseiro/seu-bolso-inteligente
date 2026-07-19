import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Download } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { Input } from "@/components/ui/input";
import { isValidCustomRange, type ReportViewType } from "./reportPeriod";

interface ReportsHeaderProps {
  viewType: ReportViewType;
  setViewType: (type: ReportViewType) => void;
  customStartDate: string;
  customEndDate: string;
  setCustomStartDate: (date: string) => void;
  setCustomEndDate: (date: string) => void;
  safeCurrentDate: Date;
  availableCurrencies: string[];
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  handleExport: (format: "csv" | "pdf") => void;
}

export function ReportsHeader({
  viewType,
  setViewType,
  customStartDate,
  customEndDate,
  setCustomStartDate,
  setCustomEndDate,
  safeCurrentDate,
  availableCurrencies,
  selectedCurrency,
  setSelectedCurrency,
  handleExport,
}: ReportsHeaderProps) {
  return (
    <div className="sticky top-2 z-40 relative overflow-hidden rounded-3xl p-4 md:p-6 transition-all duration-700 ease-out bg-background/60 backdrop-blur-xl border border-border/40 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tighter">Relatórios</h1>
          <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {"Análise das suas finanças -"}{" "}
            {viewType === "MONTH"
              ? dateFns.format(safeCurrentDate, "MMMM yyyy", { locale: ptBR })
              : viewType === "YEAR"
                ? dateFns.format(safeCurrentDate, "yyyy", { locale: ptBR })
                : customStartDate && customEndDate
                  ? `${dateFns.format(new Date(`${customStartDate}T12:00:00`), "dd/MM/yyyy")} a ${dateFns.format(new Date(`${customEndDate}T12:00:00`), "dd/MM/yyyy")}`
                  : "Selecione as datas"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Segmented Control: Mês / Ano */}
          <div className="flex p-2 bg-card/60 backdrop-blur-md rounded-3xl border border-border/40 shadow-inner w-fit mx-auto sm:mx-0">
            <button
              className={cn(
                "px-5 py-2 rounded-2xl text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewType === "MONTH"
                  ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.1)] shadow-primary/30 uppercase tracking-widest scale-100"
                  : "text-muted-foreground hover:bg-white/5 dark:hover:bg-white/5 uppercase tracking-widest scale-95 opacity-80"
              )}
              onClick={() => setViewType("MONTH")}
            >
              Mensal
            </button>
            <button
              className={cn(
                "px-5 py-2 rounded-2xl text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewType === "YEAR"
                  ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.1)] shadow-primary/30 uppercase tracking-widest scale-100"
                  : "text-muted-foreground hover:bg-white/5 dark:hover:bg-white/5 uppercase tracking-widest scale-95 opacity-80"
              )}
              onClick={() => setViewType("YEAR")}
            >
              Anual
            </button>
            <button
              className={cn(
                "px-5 py-2 rounded-2xl text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewType === "CUSTOM"
                  ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.1)] shadow-primary/30 uppercase tracking-widest scale-100"
                  : "text-muted-foreground hover:bg-white/5 dark:hover:bg-white/5 uppercase tracking-widest scale-95 opacity-80"
              )}
              onClick={() => setViewType("CUSTOM")}
            >
              Personalizado
            </button>
          </div>

          {viewType === "CUSTOM" && (
            <div className="flex flex-wrap items-end gap-2" aria-label="Intervalo personalizado">
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Início
                <Input
                  type="date"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="h-10 w-[145px] rounded-xl bg-card/50"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Fim
                <Input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="h-10 w-[145px] rounded-xl bg-card/50"
                />
              </label>
              {!isValidCustomRange({
                viewType,
                currentDate: safeCurrentDate,
                customStartDate,
                customEndDate,
              }) && (
                <p className="w-full text-xs text-destructive">
                  A data final deve ser igual ou posterior à inicial.
                </p>
              )}
            </div>
          )}

          {availableCurrencies.length > 1 && (
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-[140px] rounded-xl border-border/40 bg-card/50">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{getCurrencySymbol(selectedCurrency)}</span>
                    {selectedCurrency}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectGroup>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="font-mono w-6">{getCurrencySymbol(currency)}</span>
                        {currency}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl border-border/40 bg-card/50 hover:bg-card/80 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                Exportar em PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Exportar em Excel (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
