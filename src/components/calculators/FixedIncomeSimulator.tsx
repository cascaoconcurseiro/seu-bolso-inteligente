import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEconomicIndicators } from "@/hooks/useEconomicIndicators";
import { moneyUtils } from "@/utils/money";
import { Download, Info } from "lucide-react";
import { exportCalculatorToPDF } from "@/utils/calculatorExport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FixedIncomeSimulator() {
  const { data: indicators } = useEconomicIndicators();
  
  const [initialAmount, setInitialAmount] = useState<number>(1000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(500);
  const [term, setTerm] = useState<number>(5);
  const [termType, setTermType] = useState<"YEARS" | "MONTHS">("YEARS");
  const [rateType, setRateType] = useState<"CDI" | "SELIC" | "FIXED">("CDI");
  const [percentRate, setPercentRate] = useState<number>(100); // 100% of CDI/Selic or 10% Fixed
  const [investmentType, setInvestmentType] = useState<"CDB" | "LCI" | "FREE">("CDB");
  const [viewMode, setViewMode] = useState<"YEARLY" | "MONTHLY">("YEARLY");
  
  // Sincroniza dados API
  const baseRate = useMemo(() => {
    if (rateType === "CDI") return indicators?.cdi?.value || 10.4;
    if (rateType === "SELIC") return indicators?.selic?.value || 10.5;
    return 1; // Para FIXED, a base é 1 e o usuário digita o percentual direto
  }, [rateType, indicators]);

  const annualRate = rateType === "FIXED" ? percentRate : (baseRate * percentRate) / 100;

  const results = useMemo(() => {
    const months = termType === "YEARS" ? term * 12 : term;
    const monthlyRate = Math.pow(1 + (annualRate / 100), 1 / 12) - 1;
    
    let totalInvested = initialAmount;
    let balance = initialAmount;
    
    const monthlyData = [];
    
    for (let i = 1; i <= months; i++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      totalInvested += monthlyContribution;
      
      monthlyData.push({
        month: i,
        year: Math.ceil(i / 12),
        invested: totalInvested,
        grossBalance: balance,
        grossYield: balance - totalInvested
      });
    }

    const grossYield = balance - totalInvested;
    
    // Cálculo do IR (Tabela Regressiva)
    let taxRate = 0;
    if (investmentType === "CDB") {
      const days = months * 30;
      if (days <= 180) taxRate = 0.225;
      else if (days <= 360) taxRate = 0.20;
      else if (days <= 720) taxRate = 0.175;
      else taxRate = 0.15;
    } else if (investmentType === "LCI" || investmentType === "FREE") {
      taxRate = 0; // Isento
    }

    const totalTax = grossYield * taxRate;
    const netYield = grossYield - totalTax;
    const netBalance = totalInvested + netYield;

    return {
      totalInvested,
      grossBalance: balance,
      grossYield,
      totalTax,
      netYield,
      netBalance,
      monthlyData,
      taxRate: taxRate * 100,
      months
    };
  }, [initialAmount, monthlyContribution, term, termType, annualRate, investmentType]);

  const visibleData = viewMode === "YEARLY" 
    ? results.monthlyData.filter(d => d.month % 12 === 0 || d.month === results.months)
    : results.monthlyData;

  const handleExportPDF = () => {
    exportCalculatorToPDF({
      title: "Simulação de Renda Fixa",
      parameters: [
        { label: "Investimento Inicial", value: moneyUtils.format(initialAmount, 'BRL') },
        { label: "Aporte Mensal", value: moneyUtils.format(monthlyContribution, 'BRL') },
        { label: "Prazo", value: `${term} ${termType === 'YEARS' ? 'anos' : 'meses'} (${results.months} meses)` },
        { label: "Tipo / Imposto", value: `${investmentType} (IR: ${results.taxRate.toFixed(1)}%)` },
        { label: "Taxa Bruta Projetada", value: `${annualRate.toFixed(2)}% ao ano` }
      ],
      summary: [
        { label: "Total Investido", value: moneyUtils.format(results.totalInvested, 'BRL') },
        { label: "Saldo Líquido", value: moneyUtils.format(results.netBalance, 'BRL'), isWarning: true },
        { label: "Rendimento Líquido", value: moneyUtils.format(results.netYield, 'BRL'), isWarning: true },
        { label: "Imposto Retido", value: moneyUtils.format(results.totalTax, 'BRL') }
      ],
      tableHead: ["Tempo", "Total Investido", "Saldo Bruto", "Rendimento Bruto"],
      tableBody: visibleData.map(d => [
        `Mês ${d.month} (Ano ${d.year})`,
        moneyUtils.format(d.invested, 'BRL'),
        moneyUtils.format(d.grossBalance, 'BRL'),
        moneyUtils.format(d.grossYield, 'BRL')
      ])
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 bg-card/50 border-border/50 shadow-sm h-fit">
        <CardHeader>
          <CardTitle className="text-xl">Parâmetros</CardTitle>
          <CardDescription>Configure os aportes e a taxa de juros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Investimento Inicial (R$)</Label>
              <Input type="number" inputMode="decimal" 
                value={initialAmount || ''} 
                onChange={e => setInitialAmount(Number(e.target.value))}
                className="font-mono bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Aporte Mensal (R$)</Label>
              <Input type="number" inputMode="decimal" 
                value={monthlyContribution || ''} 
                onChange={e => setMonthlyContribution(Number(e.target.value))}
                className="font-mono bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <div className="flex items-center gap-2">
                <Input type="number" inputMode="decimal" 
                  value={term || ''} 
                  onChange={e => setTerm(Number(e.target.value))}
                  className="font-mono bg-background flex-1"
                />
                <Select value={termType} onValueChange={(v: any) => setTermType(v)}>
                  <SelectTrigger className="w-[110px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YEARS">Anos</SelectItem>
                    <SelectItem value="MONTHS">Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Label>Produto</Label>
              <Select value={investmentType} onValueChange={(v: any) => setInvestmentType(v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDB">CDB / Tesouro Direto (Tributado)</SelectItem>
                  <SelectItem value="LCI">LCI / LCA / Poupança (Isento)</SelectItem>
                  <SelectItem value="FREE">Juros Compostos Livres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-2">
                <Label className="flex h-5 items-center">Indexador</Label>
                <Select value={rateType} onValueChange={(v: any) => setRateType(v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="SELIC">Selic</SelectItem>
                    <SelectItem value="FIXED">Prefixado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex h-5 justify-between items-center">
                  <span>{rateType === 'FIXED' ? 'Taxa (a.a)' : 'Percentual'}</span>
                  {rateType !== 'FIXED' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Ex: 100% do CDI ({indicators?.cdi?.value}% a.a.)
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <Input type="number" inputMode="decimal" 
                    value={percentRate || ''} 
                    onChange={e => setPercentRate(Number(e.target.value))}
                    className="font-mono bg-background"
                  />
                  <span className="text-sm font-bold text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between text-sm border border-border/50">
              <span className="text-muted-foreground font-medium">Rentabilidade Bruta:</span>
              <div className="flex flex-col items-end">
                <span className="font-bold text-primary font-mono">{annualRate.toFixed(2)}% a.a</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({((Math.pow(1 + annualRate / 100, 1 / 12) - 1) * 100).toFixed(2)}% a.m)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border/50 shadow-sm relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Investido</p>
              <p className="text-2xl font-mono font-bold text-foreground">
                {moneyUtils.format(results.totalInvested, 'BRL')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50 shadow-sm relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Rendimento Líquido</p>
              <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-500">
                + {moneyUtils.format(results.netYield, 'BRL')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden sm:col-span-3 lg:col-span-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-primary mb-1 font-bold">Saldo Final Líquido</p>
              <p className="text-3xl font-mono font-black text-primary tracking-tighter">
                {moneyUtils.format(results.netBalance, 'BRL')}
              </p>
              {results.totalTax > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                  Já descontado {moneyUtils.format(results.totalTax, 'BRL')} de IR ({results.taxRate}%).
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 border-border/50 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
            <div>
              <CardTitle className="text-lg">Evolução do Patrimônio</CardTitle>
              <CardDescription>O poder dos juros compostos com o tempo</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YEARLY">Visão Anual</SelectItem>
                  <SelectItem value="MONTHLY">Visão Mensal</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 h-8">
                <Download className="h-4 w-4" /> PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 overflow-hidden mt-4">
              <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold bg-muted/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3 text-right">Total Investido</th>
                      <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-500">Rendimento Acum.</th>
                      <th className="px-4 py-3 text-right text-primary">Saldo Bruto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {visibleData.map((d) => (
                      <tr key={d.month} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-xs">
                          Mês {d.month} <span className="text-muted-foreground font-normal">(Ano {d.year})</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-xs text-muted-foreground">
                          {moneyUtils.format(d.invested, 'BRL')}
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-xs font-bold text-emerald-600/80 dark:text-emerald-500/80">
                          +{moneyUtils.format(d.grossYield, 'BRL')}
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-xs font-bold text-foreground">
                          {moneyUtils.format(d.grossBalance, 'BRL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
