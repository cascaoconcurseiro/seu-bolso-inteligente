import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data
const mockCategoryData = [
  { category: "Alimentação", value: 1850.00, percent: 35 },
  { category: "Moradia", value: 1200.00, percent: 23 },
  { category: "Transporte", value: 680.00, percent: 13 },
  { category: "Lazer", value: 520.00, percent: 10 },
  { category: "Saúde", value: 450.00, percent: 9 },
  { category: "Outros", value: 550.00, percent: 10 },
];

const mockMonthlyData = [
  { month: "Jul", income: 12000, expense: 8500 },
  { month: "Ago", income: 12500, expense: 9200 },
  { month: "Set", income: 11800, expense: 8100 },
  { month: "Out", income: 13200, expense: 9800 },
  { month: "Nov", income: 12800, expense: 8600 },
  { month: "Dez", income: 15800, expense: 5250 },
];

const mockPeopleData = [
  { name: "Eu", income: 8500, expense: 2800, balance: 5700 },
  { name: "Ana", income: 4500, expense: 1650, balance: 2850 },
  { name: "Carlos", income: 2800, expense: 800, balance: 2000 },
];

export function Reports() {
  const [period, setPeriod] = useState("month");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const totalExpense = mockCategoryData.reduce((sum, c) => sum + c.value, 0);
  const totalIncome = 15800;
  const balance = totalIncome - totalExpense;
  const maxMonthValue = Math.max(...mockMonthlyData.flatMap(m => [m.income, m.expense]));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4 text-positive" />
            Entradas
          </div>
          <p className="font-mono text-2xl font-bold text-positive">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4 text-negative" />
            Saídas
          </div>
          <p className="font-mono text-2xl font-bold text-negative">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="p-5 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-2">Resultado</p>
          <p className={cn(
            "font-mono text-2xl font-bold",
            balance >= 0 ? "text-positive" : "text-negative"
          )}>
            {balance >= 0 ? "+" : ""}{formatCurrency(balance)}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-foreground text-background">
          <p className="text-sm opacity-70 mb-2">Taxa de Economia</p>
          <p className="font-display text-3xl font-bold">
            {((balance / totalIncome) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <section className="p-6 rounded-xl border border-border">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
            Evolução Mensal
          </h2>
          <div className="space-y-4">
            {mockMonthlyData.map((month) => (
              <div key={month.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium w-10">{month.month}</span>
                  <div className="flex-1 mx-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-positive rounded-full transition-all"
                          style={{ width: `${(month.income / maxMonthValue) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-positive w-20 text-right">
                        {formatCurrency(month.income)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-negative rounded-full transition-all"
                          style={{ width: `${(month.expense / maxMonthValue) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-negative w-20 text-right">
                        {formatCurrency(month.expense)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-positive" />
              <span className="text-xs text-muted-foreground">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-negative" />
              <span className="text-xs text-muted-foreground">Saídas</span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="p-6 rounded-xl border border-border">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
            Gastos por Categoria
          </h2>
          <div className="space-y-3">
            {mockCategoryData.map((cat, index) => (
              <div key={cat.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{formatCurrency(cat.value)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{cat.percent}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ 
                      width: `${cat.percent}%`,
                      opacity: 1 - (index * 0.12)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* By Person */}
        <section className="p-6 rounded-xl border border-border lg:col-span-2">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
            Resumo por Pessoa
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Pessoa</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Entradas</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Saídas</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-muted-foreground font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {mockPeopleData.map((person) => (
                  <tr key={person.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {person.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{person.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-positive">{formatCurrency(person.income)}</td>
                    <td className="py-4 px-4 text-right font-mono text-negative">{formatCurrency(person.expense)}</td>
                    <td className="py-4 px-4 text-right font-mono font-semibold text-positive">+{formatCurrency(person.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-4 px-4 font-semibold">Total</td>
                  <td className="py-4 px-4 text-right font-mono font-semibold text-positive">{formatCurrency(totalIncome)}</td>
                  <td className="py-4 px-4 text-right font-mono font-semibold text-negative">{formatCurrency(totalExpense)}</td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-positive">+{formatCurrency(balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
