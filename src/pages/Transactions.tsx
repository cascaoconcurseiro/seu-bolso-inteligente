import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Mock data
const mockTransactions = [
  { id: "1", description: "Supermercado Extra", value: -342.50, category: "Alimentação", date: new Date(2025, 11, 23) },
  { id: "2", description: "Salário", value: 8500, category: "Renda", date: new Date(2025, 11, 20) },
  { id: "3", description: "Parcela TV Samsung", value: -299.90, category: "Compras", date: new Date(2025, 11, 18), installment: "3/12" },
  { id: "4", description: "Conta de Luz", value: -187.30, category: "Moradia", date: new Date(2025, 11, 15), shared: true },
  { id: "5", description: "Freelance Design", value: 2500, category: "Renda", date: new Date(2025, 11, 12) },
  { id: "6", description: "Uber", value: -45.80, category: "Transporte", date: new Date(2025, 11, 10) },
  { id: "7", description: "Farmácia", value: -89.90, category: "Saúde", date: new Date(2025, 11, 8) },
  { id: "8", description: "Netflix", value: -55.90, category: "Assinaturas", date: new Date(2025, 11, 5) },
];

const categories = [
  { value: "all", label: "Todas" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "moradia", label: "Moradia" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "saude", label: "Saúde" },
];

const transactionTypes = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Saídas" },
];

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  };

  const filteredTransactions = mockTransactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || 
      (selectedType === "income" && t.value > 0) || 
      (selectedType === "expense" && t.value < 0);
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions.filter((t) => t.value > 0).reduce((sum, t) => sum + t.value, 0);
  const totalExpense = filteredTransactions.filter((t) => t.value < 0).reduce((sum, t) => sum + Math.abs(t.value), 0);

  const hasFilters = selectedCategory !== "all" || selectedType !== "all";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Transações</h1>
          <p className="text-muted-foreground mt-1">{filteredTransactions.length} registros</p>
        </div>
        <Link to="/transacoes/nova">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Nova transação
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Entradas</p>
          <p className="font-mono text-lg font-medium text-positive">{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Saídas</p>
          <p className="font-mono text-lg font-medium text-negative">{formatCurrency(totalExpense)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Resultado</p>
          <p className={cn(
            "font-mono text-lg font-medium",
            totalIncome - totalExpense >= 0 ? "text-positive" : "text-negative"
          )}>
            {totalIncome - totalExpense >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totalIncome - totalExpense))}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasFilters && (
              <span className="w-2 h-2 rounded-full bg-foreground" />
            )}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</label>
              <Button variant="outline" className="w-36 justify-start gap-2">
                <Calendar className="h-4 w-4" />
                Este mês
              </Button>
            </div>
            {hasFilters && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedCategory("all"); setSelectedType("all"); }}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="space-y-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            <Link to="/transacoes/nova">
              <Button variant="ghost" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Adicionar primeira
              </Button>
            </Link>
          </div>
        ) : (
          filteredTransactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className="group flex items-center justify-between py-4 border-b border-border last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  transaction.value > 0 ? "bg-positive" : "bg-muted-foreground/30"
                )} />
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{transaction.category}</span>
                    <span>·</span>
                    <span>{formatDate(transaction.date)}</span>
                    {transaction.installment && (
                      <>
                        <span>·</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{transaction.installment}</span>
                      </>
                    )}
                    {transaction.shared && (
                      <>
                        <span>·</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">Dividido</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className={cn(
                "font-mono font-medium text-right",
                transaction.value > 0 ? "text-positive" : "text-foreground"
              )}>
                {transaction.value > 0 ? "+" : ""}{formatCurrency(transaction.value)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
