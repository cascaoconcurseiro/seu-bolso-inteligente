import { moneyUtils } from "@/utils/money";
import { Clock } from "lucide-react";

interface InstallmentPerson {
  name: string;
  periodAmount: number;
  totalAmount: number;
  remainingAmount: number;
  totalInstallments: number;
  remainingInstallments: number;
  seriesCount: number;
}

interface InstallmentsTableProps {
  data: InstallmentPerson[];
  formatCurrency: (value: number, currency?: string) => string;
  currency: string;
}

export function InstallmentsTable({ data, formatCurrency, currency }: InstallmentsTableProps) {
  if (data.length === 0) return null;

  return (
    <section className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Parcelamentos por Pessoa</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Exibindo o valor real devido no período selecionado e o saldo restante total.</p>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Pessoa</th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/5 rounded-t-lg">No Período</th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Séries</th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Restante Total</th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Parcelas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((person) => (
              <tr key={person.name} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-all group">
                <td className="py-4 px-4 font-bold text-foreground/80">{person.name}</td>
                <td className="py-4 px-4 text-right font-mono font-black text-primary bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  {formatCurrency(person.periodAmount, currency)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-sm text-muted-foreground">{formatCurrency(person.totalAmount, currency)}</td>
                <td className="py-4 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(person.remainingAmount, currency)}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-foreground">
                      {person.remainingInstallments} <span className="text-muted-foreground font-normal">restantes</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">de {person.totalInstallments} totais</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border/50 bg-muted/10">
            <tr className="font-bold">
              <td className="py-5 px-4 text-sm">TOTAL CONSOLIDADO</td>
              <td className="py-5 px-4 text-right font-mono text-lg text-primary bg-primary/5">
                {formatCurrency(data.reduce((sum, p) => sum + p.periodAmount, 0), currency)}
              </td>
              <td className="py-5 px-4 text-right font-mono text-sm text-muted-foreground">
                {formatCurrency(data.reduce((sum, p) => sum + p.totalAmount, 0), currency)}
              </td>
              <td className="py-5 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(data.reduce((sum, p) => sum + p.remainingAmount, 0), currency)}
              </td>
              <td className="py-5 px-4 text-right text-[10px] text-muted-foreground uppercase tracking-tighter">
                {data.reduce((sum, p) => sum + p.seriesCount, 0)} séries ativas
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
