import { useState } from "react";
import { Calculator, TrendingUp, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FixedIncomeSimulator } from "@/components/calculators/FixedIncomeSimulator";
import { PurchasingPowerSimulator } from "@/components/calculators/PurchasingPowerSimulator";

export function Calculators() {
  const [activeTab, setActiveTab] = useState("fixed-income");

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header com Design System */}
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-8 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Inteligência Financeira</span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight">
              Simuladores
            </h1>
            <p className="text-muted-foreground font-medium max-w-lg">
              Projete o futuro do seu patrimônio usando dados reais do Banco Central. Simule investimentos e o impacto da inflação.
            </p>
          </div>
        </div>
      </div>

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
