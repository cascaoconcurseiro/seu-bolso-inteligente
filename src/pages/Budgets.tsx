import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Wallet,
  AlertTriangle,
  Trash2,
  Pencil,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets, BudgetWithProgress } from "@/hooks/useBudgets";
import { useMonth } from "@/contexts/MonthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import { toast } from "sonner";

interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  currency: string;
  period: string;
  is_active: boolean;
  created_at: string;
}

export function Budgets() {
  const { currentDate } = useMonth();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  
  // SINGLE SOURCE OF TRUTH: Usar hook que busca orçamentos com progresso calculado pelo banco
  const { 
    budgets = [], 
    budgetsWithProgress = [], 
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
    isCreating,
    isUpdating,
  } = useBudgets();
  
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [currency, setCurrency] = useState("BRL");

  // Moedas disponíveis
  const availableCurrencies = useMemo(() => {
    const currencySet = new Set<string>(["BRL"]);
    accounts.forEach(acc => {
      if (acc.is_international && acc.currency) {
        currencySet.add(acc.currency);
      }
    });
    return Array.from(currencySet);
  }, [accounts]);

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategoryId("");
    setCurrency("BRL");
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setName(budget.name);
    setAmount(budget.amount.toString());
    setCategoryId(budget.category_id || "");
    setCurrency(budget.currency);
  };

  const handleSubmit = () => {
    const budgetData = {
      name: name.trim(),
      amount: parseFloat(amount),
      category_id: categoryId || null,
      currency,
      period: "MONTHLY",
      is_active: true,
    };

    if (editingBudget) {
      updateBudget({ id: editingBudget.id, ...budgetData });
      resetForm();
      setEditingBudget(null);
    } else {
      createBudget(budgetData as any);
      resetForm();
      setShowNewBudgetDialog(false);
    }
  };

  const formatCurrency = (value: number, curr: string = "BRL") => {
    const symbol = getCurrencySymbol(curr);
    if (curr === "BRL") {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    return `${symbol} ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  const expenseCategories = categories.filter(c => c.type === "expense");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            Controle seus gastos por categoria - {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button onClick={() => setShowNewBudgetDialog(true)} className="gap-2 h-11 md:h-10">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Orçamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Nenhum orçamento</h3>
          <p className="text-muted-foreground mb-6">Crie orçamentos para controlar seus gastos</p>
          <Button onClick={() => setShowNewBudgetDialog(true)} className="h-11 md:h-10">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Criar Orçamento</span>
            <span className="md:hidden">Criar</span>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* SINGLE SOURCE OF TRUTH: Usar budgetsWithProgress que tem os gastos calculados pelo banco */}
          {budgetsWithProgress.map((budget) => {
            const spent = Number(budget.spent_amount) || 0;
            const budgetAmount = Number(budget.budget_amount) || 0;
            const percentage = Number(budget.percentage_used) || 0;
            const remaining = Number(budget.remaining_amount) || 0;
            const isOverBudget = percentage > 100;
            const isWarning = percentage > 80 && percentage <= 100;

            return (
              <div
                key={budget.budget_id}
                className={cn(
                  "p-5 rounded-xl border transition-all",
                  isOverBudget 
                    ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                    : isWarning
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                      : "border-border"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                      isOverBudget 
                        ? "bg-red-100 dark:bg-red-900/30"
                        : isWarning
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-muted"
                    )}>
                      {budget.category_icon || "💰"}
                    </div>
                    <div>
                      <h3 className="font-semibold">{budget.budget_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {budget.category_name || "Todas categorias"}
                        {budget.currency !== "BRL" && (
                          <span className="ml-1 text-blue-500">
                            <Globe className="h-3 w-3 inline" /> {budget.currency}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const originalBudget = budgets?.find(b => b.id === budget.budget_id);
                        if (originalBudget) handleEdit(originalBudget as Budget);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteBudget(budget.budget_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(spent, budget.currency)} de {formatCurrency(budgetAmount, budget.currency)}
                    </span>
                    <span className={cn(
                      "font-mono font-semibold",
                      isOverBudget ? "text-red-600" : isWarning ? "text-amber-600" : ""
                    )}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isOverBudget 
                          ? "bg-red-500"
                          : isWarning
                            ? "bg-amber-500"
                            : "bg-primary"
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    {isOverBudget ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Excedido em {formatCurrency(Math.abs(remaining), budget.currency)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Restam {formatCurrency(remaining, budget.currency)}
                      </span>
                    )}
                    {isWarning && !isOverBudget && (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Atenção
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Budget Dialog */}
      <Dialog 
        open={showNewBudgetDialog || !!editingBudget} 
        onOpenChange={(open) => {
          if (!open) {
            setShowNewBudgetDialog(false);
            setEditingBudget(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
            <DialogDescription>
              Defina um limite de gastos para uma categoria
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Alimentação do mês"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId || "all"} onValueChange={(val) => setCategoryId(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Limite</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{getCurrencySymbol(curr)}</span>
                          {curr}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewBudgetDialog(false);
                setEditingBudget(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!name.trim() || !amount || isCreating || isUpdating}
            >
              {editingBudget ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
