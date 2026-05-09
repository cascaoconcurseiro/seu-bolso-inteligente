import { useState } from "react";
import { Plus, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoalsAndInvestments() {
  const [activeTab, setActiveTab] = useState<'GOALS' | 'INVESTMENTS'>('GOALS');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Metas e Investimentos</h1>
          <p className="text-muted-foreground mt-1">
            Planeje seu futuro e acompanhe a evolução do seu patrimônio.
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto h-11 sm:h-10">
          <Plus className="h-4 w-4" />
          {activeTab === 'GOALS' ? 'Nova Meta' : 'Novo Ativo'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/50 p-1 rounded-lg w-full max-w-sm">
        <button
          onClick={() => setActiveTab('GOALS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${
            activeTab === 'GOALS' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="h-4 w-4" />
          Metas
        </button>
        <button
          onClick={() => setActiveTab('INVESTMENTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${
            activeTab === 'INVESTMENTS' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Investimentos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'GOALS' ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-muted/20 border border-dashed rounded-xl">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Nenhuma meta configurada</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Defina objetivos financeiros, como "Comprar um carro" ou "Reserva de Emergência", e acompanhe o progresso.
            </p>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Criar Primeira Meta
            </Button>
          </div>
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-muted/20 border border-dashed rounded-xl">
            <div className="h-16 w-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Carteira de Investimentos vazia</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Registre seus investimentos em Renda Fixa, Ações ou Fundos e veja seu dinheiro render ao longo do tempo.
            </p>
            <Button variant="outline" className="gap-2 text-blue-500 hover:text-blue-600">
              <Plus className="h-4 w-4" /> Adicionar Investimento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
