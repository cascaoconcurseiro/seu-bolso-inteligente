import { moneyUtils } from "@/utils/money";
import { Users, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonData {
  name: string;
  spent: number;
  received: number;
  balance: number;
  count: number;
}

interface SharedFinancesTableProps {
  data: PersonData[];
  formatCurrency: (value: number, currency?: string) => string;
  currency: string;
}

export function SharedFinancesTable({ data, formatCurrency, currency }: SharedFinancesTableProps) {
  if (data.length === 0) return null;

  return (
    <section className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Gastos Compartilhados por Pessoa
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Resumo de quem pagou e quem deve no período selecionado.</p>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Pessoa</th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <div className="flex items-center justify-end gap-1">
                   <ArrowUpCircle className="h-3 w-3 text-green-500" />
                   Total Pago
                </div>
              </th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <div className="flex items-center justify-end gap-1">
                   <ArrowDownCircle className="h-3 w-3 text-red-500" />
                   Custo
                </div>
              </th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold italic">A Pagar / Receber</th>
              <th className="text-right py-4 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((person) => (
              <tr key={person.name} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-all">
                <td className="py-4 px-4 font-bold text-foreground/80">{person.name}</td>
                <td className="py-4 px-4 text-right font-mono text-green-600 dark:text-green-400 font-medium">
                  {formatCurrency(person.spent, currency)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-red-600 dark:text-red-400 font-medium">
                  {formatCurrency(person.received, currency)}
                </td>
                <td className={cn(
                  "py-4 px-4 text-right font-mono font-black text-lg tracking-tighter", 
                  person.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {person.balance > 0 ? "A Receber: " : (person.balance < 0 ? "A Pagar: " : "")}{formatCurrency(Math.abs(person.balance), currency)}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {person.count} tx
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border/50 bg-muted/10 font-bold">
            <tr>
              <td className="py-5 px-4 text-sm">TOTAIS DO GRUPO</td>
              <td className="py-5 px-4 text-right font-mono text-green-600 dark:text-green-400">
                {formatCurrency(data.reduce((sum, p) => sum + p.spent, 0), currency)}
              </td>
              <td className="py-5 px-4 text-right font-mono text-red-600 dark:text-red-400">
                {formatCurrency(data.reduce((sum, p) => sum + p.received, 0), currency)}
              </td>
              <td className="py-5 px-4 text-right font-mono text-foreground">
                {formatCurrency(data.reduce((sum, p) => sum + p.balance, 0), currency)}
              </td>
              <td className="py-5 px-4 text-right text-[10px] text-muted-foreground uppercase">
                {data.reduce((sum, p) => sum + p.count, 0)} total
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
