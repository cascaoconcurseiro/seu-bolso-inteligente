import { useState } from "react";
import { TransactionItem, CurrencyDisplay, type TransactionCategory, type TransactionType } from "@/components/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowUpDown,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";

// Dados mock para demonstração
const mockTransactions = [
  {
    id: "1",
    description: "Supermercado Extra",
    value: 342.50,
    type: "expense" as TransactionType,
    category: "alimentacao" as TransactionCategory,
    date: new Date(2025, 11, 23),
  },
  {
    id: "2",
    description: "Salário",
    value: 8500,
    type: "income" as TransactionType,
    category: "outros" as TransactionCategory,
    date: new Date(2025, 11, 20),
  },
  {
    id: "3",
    description: "Parcela TV Samsung",
    value: 299.90,
    type: "expense" as TransactionType,
    category: "lazer" as TransactionCategory,
    date: new Date(2025, 11, 18),
    installment: { current: 3, total: 12 },
  },
  {
    id: "4",
    description: "Conta de Luz",
    value: 187.30,
    type: "expense" as TransactionType,
    category: "moradia" as TransactionCategory,
    date: new Date(2025, 11, 15),
    isShared: true,
    sharedWith: ["Ana", "Carlos"],
  },
  {
    id: "5",
    description: "Freelance Design",
    value: 2500,
    type: "income" as TransactionType,
    category: "outros" as TransactionCategory,
    date: new Date(2025, 11, 12),
  },
  {
    id: "6",
    description: "Uber",
    value: 45.80,
    type: "expense" as TransactionType,
    category: "transporte" as TransactionCategory,
    date: new Date(2025, 11, 10),
  },
  {
    id: "7",
    description: "Farmácia",
    value: 89.90,
    type: "expense" as TransactionType,
    category: "saude" as TransactionCategory,
    date: new Date(2025, 11, 8),
  },
  {
    id: "8",
    description: "Netflix",
    value: 55.90,
    type: "expense" as TransactionType,
    category: "lazer" as TransactionCategory,
    date: new Date(2025, 11, 5),
  },
];

const categories = [
  { value: "all", label: "Todas" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "moradia", label: "Moradia" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "saude", label: "Saúde" },
  { value: "viagem", label: "Viagem" },
  { value: "outros", label: "Outros" },
];

const transactionTypes = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Saídas" },
  { value: "transfer", label: "Transferências" },
];

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar transações
  const filteredTransactions = mockTransactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesType = selectedType === "all" || t.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // Calcular totais
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.value, 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-foreground">
            Movimentações
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredTransactions.length} transações encontradas
          </p>
        </div>
        <Link to="/transacoes/nova">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nova Movimentação
          </Button>
        </Link>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Entradas</p>
          <CurrencyDisplay value={totalIncome} size="lg" className="text-positive mt-1" />
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Saídas</p>
          <CurrencyDisplay value={totalExpense} size="lg" className="text-negative mt-1" />
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Resultado</p>
          <CurrencyDisplay value={totalIncome - totalExpense} size="lg" showSign className="mt-1" />
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar movimentações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {(selectedCategory !== "all" || selectedType !== "all") && (
              <Badge variant="default" className="ml-1">
                {[selectedCategory !== "all", selectedType !== "all"].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Filtros Expandidos */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Button variant="outline" className="gap-2 w-40 justify-start">
                <Calendar className="h-4 w-4" />
                Este mês
              </Button>
            </div>
            {(selectedCategory !== "all" || selectedType !== "all") && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedType("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Transações */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl">
            <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
            <Link to="/transacoes/nova">
              <Button variant="ghost" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Adicionar primeira movimentação
              </Button>
            </Link>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              {...transaction}
              onClick={() => {}}
            />
          ))
        )}
      </div>
    </div>
  );
}