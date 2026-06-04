import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export type DRELineType = 'OPERATIONAL_INC' | 'FINANCIAL_INC' | 'DEDUCTION' | 'VARIABLE_EXP' | 'FIXED_EXP' | 'FINANCIAL_EXP';

interface DRETableProps {
  dreData: {
    lines: Record<DRELineType, { total: number; subcategories: Record<string, number> }>;
    grossRevenue: number;
    netRevenue: number;
    contributionMargin: number;
    ebitda: number;
    netSavings: number;
  };
  expandedLines: Record<string, boolean>;
  toggleExpand: (line: string) => void;
  formatCurrency: (val: number) => string;
  formatNegativeCurrency: (val: number) => string;
}

export function DRETable({ dreData, expandedLines, toggleExpand, formatCurrency, formatNegativeCurrency }: DRETableProps) {
  const renderSubcategories = (lineType: DRELineType, isExpense: boolean) => {
    const sub = dreData.lines[lineType].subcategories;
    if (Object.keys(sub).length === 0) {
      return (
        <tr className="bg-muted/10 text-xs text-muted-foreground font-mono">
          <td className="pl-12 py-1.5 text-left italic">Nenhuma movimentação registrada</td>
          <td className="pr-6 py-1.5 text-right font-semibold">-</td>
          <td className="pr-6 py-1.5 text-right">-</td>
        </tr>
      );
    }
    return Object.entries(sub).map(([name, val]) => {
      const parentTotal = dreData.lines[lineType].total;
      const subPercent = parentTotal > 0 ? `${((val / parentTotal) * 100).toFixed(1)}%` : "0.0%";
      return (
        <tr key={name} className="hover:bg-muted/30 text-xs text-muted-foreground border-b border-border/10 font-mono transition-colors">
          <td className="pl-12 py-2 text-left">{name}</td>
          <td className="pr-6 py-2 text-right font-medium">{isExpense ? formatNegativeCurrency(val) : formatCurrency(val)}</td>
          <td className="pr-6 py-2 text-right text-[10px]">{subPercent}</td>
        </tr>
      );
    });
  };

  return (
    <Card className="overflow-hidden border border-border bg-card/50 shadow-sm rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/5 text-xs text-muted-foreground border-b border-border font-medium">
              <th className="pl-6 py-3.5 text-left uppercase tracking-wider">Descrição das Contas Contábeis</th>
              <th className="pr-6 py-3.5 text-right uppercase tracking-wider w-[200px]">Valor</th>
              <th className="pr-6 py-3.5 text-right uppercase tracking-wider w-[120px]">Ações / Vert.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            
            <tr className="font-semibold text-foreground bg-muted/10 hover:bg-muted/20 transition-colors">
              <td className="pl-6 py-3 text-left">1. RECEITAS OPERACIONAIS BRUTAS</td>
              <td className="pr-6 py-3 text-right font-mono text-emerald-600 dark:text-emerald-500">{formatCurrency(dreData.grossRevenue)}</td>
              <td className="pr-6 py-3 text-right text-xs text-muted-foreground font-mono">100.0%</td>
            </tr>
            
            <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
              <td className="pl-10 py-2.5 text-left">1.1 Receitas de Trabalho / Pró-labore</td>
              <td className="pr-6 py-2.5 text-right font-mono text-emerald-600/80 dark:text-emerald-500/80">{formatCurrency(dreData.lines.OPERATIONAL_INC.total)}</td>
              <td className="pr-6 py-2.5 text-right">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('OPERATIONAL_INC')}>
                  {expandedLines.OPERATIONAL_INC ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </td>
            </tr>
            {expandedLines.OPERATIONAL_INC && renderSubcategories('OPERATIONAL_INC', false)}

            <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
              <td className="pl-10 py-2.5 text-left">1.2 Receitas Financeiras / Investimentos</td>
              <td className="pr-6 py-2.5 text-right font-mono text-emerald-600/80 dark:text-emerald-500/80">{formatCurrency(dreData.lines.FINANCIAL_INC.total)}</td>
              <td className="pr-6 py-2.5 text-right">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('FINANCIAL_INC')}>
                  {expandedLines.FINANCIAL_INC ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </td>
            </tr>
            {expandedLines.FINANCIAL_INC && renderSubcategories('FINANCIAL_INC', false)}

            <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
              <td className="pl-6 py-3 text-left font-semibold text-foreground">2. (-) ESTORNOS E DEDUÇÕES DO EXERCÍCIO</td>
              <td className="pr-6 py-3 text-right font-mono font-semibold text-red-600 dark:text-red-500">{formatNegativeCurrency(dreData.lines.DEDUCTION.total)}</td>
              <td className="pr-6 py-3 text-right">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('DEDUCTION')}>
                  {expandedLines.DEDUCTION ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </td>
            </tr>
            {expandedLines.DEDUCTION && renderSubcategories('DEDUCTION', false)}

            <tr className="font-bold text-primary bg-primary/5 border-y border-primary/20">
              <td className="pl-6 py-3.5 text-left">(=) RECEITA OPERACIONAL LÍQUIDA</td>
              <td className="pr-6 py-3.5 text-right font-mono">{formatCurrency(dreData.netRevenue)}</td>
              <td className="pr-6 py-3.5 text-right font-mono text-xs">100.0%</td>
            </tr>

            <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
              <td className="pl-6 py-3 text-left font-semibold text-foreground">3. (-) CUSTOS OPERACIONAIS E CONSUMO VARIÁVEL</td>
              <td className="pr-6 py-3 text-right font-mono font-semibold text-red-600 dark:text-red-500">{formatNegativeCurrency(dreData.lines.VARIABLE_EXP.total)}</td>
              <td className="pr-6 py-3 text-right font-mono text-xs text-muted-foreground flex items-center justify-end gap-2">
                <span>{dreData.netRevenue > 0 ? ((dreData.lines.VARIABLE_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('VARIABLE_EXP')}>
                  {expandedLines.VARIABLE_EXP ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </td>
            </tr>
            {expandedLines.VARIABLE_EXP && renderSubcategories('VARIABLE_EXP', true)}

            <tr className="font-bold text-foreground bg-muted/5 border-y border-border/20">
              <td className="pl-6 py-3 text-left">(=) MARGEM DE CONTRIBUIÇÃO OPERACIONAL</td>
              <td className="pr-6 py-3 text-right font-mono">{formatCurrency(dreData.contributionMargin)}</td>
              <td className="pr-6 py-3 text-right font-mono text-xs">-</td>
            </tr>

            <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
              <td className="pl-6 py-3 text-left font-semibold text-foreground">4. (-) DESPESAS ADMINISTRATIVAS E ESTRUTURA FIXA</td>
              <td className="pr-6 py-3 text-right font-mono font-semibold text-red-600 dark:text-red-500">{formatNegativeCurrency(dreData.lines.FIXED_EXP.total)}</td>
              <td className="pr-6 py-3 text-right font-mono text-xs text-muted-foreground flex items-center justify-end gap-2">
                <span>{dreData.netRevenue > 0 ? ((dreData.lines.FIXED_EXP.total / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('FIXED_EXP')}>
                  {expandedLines.FIXED_EXP ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </td>
            </tr>
            {expandedLines.FIXED_EXP && renderSubcategories('FIXED_EXP', true)}

            <tr className="font-bold text-foreground bg-muted/5 border-y border-border/20">
              <td className="pl-6 py-3 text-left">(=) RESULTADO OPERACIONAL BRUTO (EBITDA)</td>
              <td className="pr-6 py-3 text-right font-mono">{formatCurrency(dreData.ebitda)}</td>
              <td className="pr-6 py-3 text-right font-mono text-xs">-</td>
            </tr>

            <tr className="hover:bg-muted/10 border-b border-border/20 transition-colors">
              <td className="pl-6 py-3 text-left font-semibold text-foreground">5. (-) TARIFAS E DESPESAS FINANCEIRAS / TRIBUTOS</td>
              <td className="pr-6 py-3 text-right font-mono font-semibold text-red-600 dark:text-red-500">{formatNegativeCurrency(dreData.lines.FINANCIAL_EXP.total)}</td>
              <td className="pr-6 py-3 text-right">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('FINANCIAL_EXP')}>
                  {expandedLines.FINANCIAL_EXP ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </td>
            </tr>
            {expandedLines.FINANCIAL_EXP && renderSubcategories('FINANCIAL_EXP', true)}

            <tr className="font-black text-lg text-primary bg-primary/10 border-y-2 border-primary border-double">
              <td className="pl-6 py-4 text-left uppercase tracking-tight">(=) RESULTADO LÍQUIDO DO EXERCÍCIO (Economia Real)</td>
              <td className="pr-6 py-4 text-right font-mono text-primary">{formatCurrency(dreData.netSavings)}</td>
              <td className="pr-6 py-4 text-right font-mono text-xs font-semibold">
                {dreData.netRevenue > 0 ? ((dreData.netSavings / dreData.netRevenue) * 100).toFixed(1) + "%" : "0.0%"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
