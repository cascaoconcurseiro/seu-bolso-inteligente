/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEconomicIndicators } from "@/hooks/useEconomicIndicators";
import { moneyUtils } from "@/utils/money";
import { RefreshCcw, Download, Info } from "lucide-react";
import { exportCalculatorToPDF } from "@/utils/calculatorExport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PurchasingPowerSimulator() {
  const { data: indicators, isLoading } = useEconomicIndicators();

  const [initialAmount, setInitialAmount] = useState<number>(10000);
  const [term, setTerm] = useState<number>(5);
  const [termType, setTermType] = useState<"YEARS" | "MONTHS">("YEARS");
  const [inflationRate, setInflationRate] = useState<number>(4.5);
  const [viewMode, setViewMode] = useState<"YEARLY" | "MONTHLY">("YEARLY");

  // Sincroniza com a API quando carrega, mas permite edição
  const [hasSynced, setHasSynced] = useState(false);
  if (indicators?.ipca && !hasSynced) {
    setInflationRate(indicators.ipca.value);
    setHasSynced(true);
  }

  const results = useMemo(() => {
    const rateDecimal = inflationRate / 100;
    const months = termType === "YEARS" ? term * 12 : term;
    const monthlyRate = Math.pow(1 + rateDecimal, 1 / 12) - 1;

    const requiredFutureAmount = initialAmount * Math.pow(1 + monthlyRate, months);
    const futurePurchasingPower = initialAmount / Math.pow(1 + monthlyRate, months);
    const lostPower = initialAmount - futurePurchasingPower;

    const monthlyData = [];
    for (let i = 1; i <= months; i++) {
      monthlyData.push({
        month: i,
        year: Math.ceil(i / 12),
        requiredToMaintain: initialAmount * Math.pow(1 + monthlyRate, i),
        purchasingPowerOfInitial: initialAmount / Math.pow(1 + monthlyRate, i),
      });
    }

    return {
      requiredFutureAmount,
      futurePurchasingPower,
      lostPower,
      monthlyData,
      months,
    };
  }, [initialAmount, term, termType, inflationRate]);

  const visibleData =
    viewMode === "YEARLY"
      ? results.monthlyData.filter((d) => d.month % 12 === 0 || d.month === results.months)
      : results.monthlyData;

  const handleExportPDF = () => {
    exportCalculatorToPDF({
      title: "Simulação de Poder de Compra (Inflação)",
      parameters: [
        { label: "Valor Base", value: moneyUtils.format(initialAmount, "BRL") },
        { label: "Prazo", value: `${term} ${termType === "YEARS" ? "anos" : "meses"}` },
        { label: "Inflação (IPCA) Projetada", value: `${inflationRate.toFixed(2)}% ao ano` },
      ],
      summary: [
        {
          label: "Valor necessário no futuro",
          value: moneyUtils.format(results.requiredFutureAmount, "BRL"),
        },
        {
          label: "Poder de compra real no futuro",
          value: moneyUtils.format(results.futurePurchasingPower, "BRL"),
          isWarning: true,
        },
        {
          label: "Poder de compra perdido",
          value: moneyUtils.format(results.lostPower, "BRL"),
          isWarning: true,
        },
      ],
      tableHead: ["Período", "Necessário p/ Manter Padrão", "Poder de Compra Real"],
      tableBody: visibleData.map((d) => [
        `Mês ${d.month} (Ano ${d.year})`,
        moneyUtils.format(d.requiredToMaintain, "BRL"),
        moneyUtils.format(d.purchasingPowerOfInitial, "BRL"),
      ]),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 bg-card/50 border-border/50 shadow-sm h-fit">
        <CardHeader>
          <CardTitle className="text-base">Parâmetros</CardTitle>
          <CardDescription>Ajuste os valores para simular a inflação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="purchasing-power-base">Valor base (R$)</Label>
            <Input
              id="purchasing-power-base"
              type="number"
              inputMode="decimal"
              value={initialAmount || ""}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="text-base font-mono bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchasing-power-term">Prazo</Label>
            <div className="flex items-center gap-2">
              <Input
                id="purchasing-power-term"
                type="number"
                inputMode="decimal"
                value={term || ""}
                onChange={(e) => setTerm(Number(e.target.value))}
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

          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                Inflação (IPCA) a.a.
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="w-64">
                      A inflação acumulada de 12 meses pelo Banco Central hoje é de{" "}
                      {indicators?.ipca?.value}%.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-sm uppercase gap-1"
                onClick={() => setInflationRate(indicators?.ipca?.value || 4.5)}
                disabled={isLoading}
              >
                <RefreshCcw className="h-3 w-3" /> Puxar do BCB
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={inflationRate || ""}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="font-mono bg-background"
              />
              <span className="text-muted-foreground font-bold">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Necessário no futuro</p>
              <p className="text-3xl font-mono font-bold text-foreground">
                {moneyUtils.format(results.requiredFutureAmount, "BRL")}
              </p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Para comprar as mesmas coisas que{" "}
                <strong className="text-foreground">
                  {moneyUtils.format(initialAmount, "BRL")}
                </strong>{" "}
                compra hoje.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-warning/5 border-warning/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Poder de compra real</p>
              <p className="text-3xl font-mono font-bold text-warning dark:text-warning">
                {moneyUtils.format(results.futurePurchasingPower, "BRL")}
              </p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Seus {moneyUtils.format(initialAmount, "BRL")} debaixo do colchão terão o poder de
                compra equivalente a este valor.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 border-border/50 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
            <div>
              <CardTitle className="text-base">Evolução da Desvalorização</CardTitle>
              <CardDescription>Mesa a mês, como a inflação corrói o dinheiro</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[130px] h-8 text-sm bg-background">
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
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-sm text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Período</th>
                      <th className="px-4 py-3 font-medium text-right">Manter Padrão</th>
                      <th className="px-4 py-3 font-medium text-right text-warning dark:text-warning">
                        Poder de Compra Real
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {visibleData.map((d) => (
                      <tr key={d.month} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-sm">
                          Mês {d.month}{" "}
                          <span className="text-muted-foreground font-normal">(Ano {d.year})</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-sm">
                          {moneyUtils.format(d.requiredToMaintain, "BRL")}
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-warning dark:text-warning text-sm font-bold">
                          {moneyUtils.format(d.purchasingPowerOfInitial, "BRL")}
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
