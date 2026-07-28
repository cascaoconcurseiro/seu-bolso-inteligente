import { useState } from "react";
import { Calculator, TrendingUp, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FixedIncomeSimulator } from "@/components/calculators/FixedIncomeSimulator";
import { PurchasingPowerSimulator } from "@/components/calculators/PurchasingPowerSimulator";

export function Calculators() {
  const [activeTab, setActiveTab] = useState("fixed-income");

  return (
    <div className="space-y-6 pb-24">
      <header className="border-b border-border pb-5 md:pb-6">
        <p className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Ferramentas de decisão
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Simuladores
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Compare cenários de investimento e entenda o impacto da inflação no seu dinheiro.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="h-auto p-1 bg-muted/50 w-full justify-start md:justify-start flex min-w-max">
            <TabsTrigger
              value="fixed-income"
              className="gap-2 py-2.5 px-4 md:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <TrendingUp className="h-4 w-4" />
              Renda Fixa & Tesouro
            </TabsTrigger>
            <TabsTrigger
              value="purchasing-power"
              className="gap-2 py-2.5 px-4 md:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <DollarSign className="h-4 w-4" />
              Poder de Compra (IPCA)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fixed-income" className="m-0 border-none p-0 outline-none">
          <FixedIncomeSimulator />
        </TabsContent>

        <TabsContent value="purchasing-power" className="m-0 border-none p-0 outline-none">
          <PurchasingPowerSimulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
