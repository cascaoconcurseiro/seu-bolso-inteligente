import { useState } from "react";
import { CurrencyDisplay } from "@/components/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  Users,
  Download,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mock
const mockCategoryData = [
  { category: "Alimentação", value: 1850.00, percent: 35, color: "bg-primary" },
  { category: "Moradia", value: 1200.00, percent: 23, color: "bg-accent" },
  { category: "Transporte", value: 680.00, percent: 13, color: "bg-warning" },
  { category: "Lazer", value: 520.00, percent: 10, color: "bg-purple-500" },
  { category: "Saúde", value: 450.00, percent: 9, color: "bg-pink-500" },
  { category: "Outros", value: 550.00, percent: 10, color: "bg-muted-foreground" },
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
  const [selectedCategory, setSelectedCategory] = useState("all");

  const totalExpense = mockCategoryData.reduce((sum, c) => sum + c.value, 0);
  const totalIncome = 15800;
  const balance = totalIncome - totalExpense;

  const maxMonthValue = Math.max(...mockMonthlyData.flatMap(m => [m.income, m.expense]));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-foreground">
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise completa das suas finanças
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </header>

      {/* Resumo Geral */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4 text-positive" />
            Entradas
          </div>
          <CurrencyDisplay value={totalIncome} size="xl" className="text-positive" />
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4 text-negative" />
            Saídas
          </div>
          <CurrencyDisplay value={totalExpense} size="xl" className="text-negative" />
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Resultado
          </div>
          <CurrencyDisplay value={balance} size="xl" showSign />
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <PieChart className="h-4 w-4 text-accent" />
            Taxa de Economia
          </div>
          <p className="text-3xl font-display font-semibold text-foreground">
            {((balance / totalIncome) * 100).toFixed(0)}%
          </p>
        </div>
      </section>

      {/* Grid de Relatórios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <section className="bg-card rounded-xl p-6 shadow-sm">
          <h2 className="font-display font-medium text-lg text-foreground mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Evolução Mensal
          </h2>
          <div className="space-y-4">
            {mockMonthlyData.map((month) => (
              <div key={month.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground w-10">{month.month}</span>
                  <div className="flex-1 mx-4 space-y-1">
                    {/* Barra de entrada */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-positive rounded-full transition-all"
                          style={{ width: `${(month.income / maxMonthValue) * 100}%` }}
                        />
                      </div>
                      <CurrencyDisplay value={month.income} size="sm" className="w-24 text-right text-positive" />
                    </div>
                    {/* Barra de saída */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-negative rounded-full transition-all"
                          style={{ width: `${(month.expense / maxMonthValue) * 100}%` }}
                        />
                      </div>
                      <CurrencyDisplay value={month.expense} size="sm" className="w-24 text-right text-negative" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-positive" />
              <span className="text-sm text-muted-foreground">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-negative" />
              <span className="text-sm text-muted-foreground">Saídas</span>
            </div>
          </div>
        </section>

        {/* Gastos por Categoria */}
        <section className="bg-card rounded-xl p-6 shadow-sm">
          <h2 className="font-display font-medium text-lg text-foreground mb-6 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Gastos por Categoria
          </h2>
          
          {/* Gráfico de Pizza Simplificado */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {mockCategoryData.reduce((acc, cat, index) => {
                  const startAngle = acc.offset;
                  const angle = (cat.percent / 100) * 360;
                  const endAngle = startAngle + angle;
                  
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  
                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  
                  const colors = ["#C4683C", "#5A7A60", "#D97706", "#8B5CF6", "#EC4899", "#6B7280"];
                  
                  acc.paths.push(
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={colors[index]}
                      className="transition-all hover:opacity-80"
                    />
                  );
                  
                  acc.offset = endAngle;
                  return acc;
                }, { offset: 0, paths: [] as JSX.Element[] }).paths}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-display font-semibold text-foreground">
                    <CurrencyDisplay value={totalExpense} size="sm" />
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Categorias */}
          <div className="space-y-3">
            {mockCategoryData.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", cat.color)} />
                  <span className="text-sm text-foreground">{cat.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CurrencyDisplay value={cat.value} size="sm" />
                  <Badge variant="muted" className="w-12 justify-center">
                    {cat.percent}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Relatório por Pessoa */}
        <section className="bg-card rounded-xl p-6 shadow-sm lg:col-span-2">
          <h2 className="font-display font-medium text-lg text-foreground mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Resumo por Pessoa
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Pessoa</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Entradas</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Saídas</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Saldo</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {mockPeopleData.map((person) => (
                  <tr key={person.name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {person.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">{person.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay value={person.income} size="sm" className="text-positive" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay value={person.expense} size="sm" className="text-negative" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay value={person.balance} size="sm" showSign />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Badge variant="muted">
                        {((person.expense / totalExpense) * 100).toFixed(0)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-4 px-4 font-semibold text-foreground">Total</td>
                  <td className="py-4 px-4 text-right">
                    <CurrencyDisplay value={totalIncome} size="sm" className="font-semibold text-positive" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <CurrencyDisplay value={totalExpense} size="sm" className="font-semibold text-negative" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <CurrencyDisplay value={balance} size="sm" showSign className="font-semibold" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Badge variant="default">100%</Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}