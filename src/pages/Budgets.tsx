import { moneyUtils } from "@/utils/money";
import { useState, useMemo } from "react";
import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Wallet,
  Target,
  TrendingUp,
  Check,
  ChevronsUpDown,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { BudgetCard } from "@/components/budgets/BudgetCard";
import { logger } from "@/utils/logger";

export function Budgets() {
  const { currentDate } = useMonth();
  const safeCurrentDate = useMemo(() => {
    if (!currentDate || isNaN(currentDate.getTime())) {
      return new Date();
    }
    return currentDate;
  }, [currentDate]);

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
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
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [currency, setCurrency] = useState("BRL");
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);

  const availableCurrencies = useMemo(() => {
    const set = new Set<string>(["BRL"]);
    accounts.forEach((acc) => {
      if (acc.is_international && acc.currency) set.add(acc.currency);
    });
    return Array.from(set);
  }, [accounts]);

  const resetForm = () => {
    setAmount("");
    setCategoryId("");
    setCurrency("BRL");
  };

  const handleSubmit = async () => {
    const generatedName = categoryId
      ? categories.find((c) => c.id === categoryId)?.name || "Orçamento"
      : "Orçamento Global";

    const data = {
      name: generatedName,
      amount: moneyUtils.parse(amount),
      category_id: categoryId || null,
      currency,
      period: "MONTHLY" as const,
      is_active: true,
      start_date: null,
      end_date: null,
    };

    try {
      showActionFeedback("success");
      if (editingBudget) {
        setTimeout(() => setEditingBudget(null), 80);
        updateBudget({ id: editingBudget.id, ...data });
      } else {
        setTimeout(() => setShowNewBudgetDialog(false), 80);
        createBudget(data);
      }
      resetForm();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch (err) {
      logger.error("Erro ao salvar orçamento", err);
    }
  };

  const totalBudgeted = useMemo(
    () => budgetsWithProgress.reduce((sum, b) => sum + b.budget_amount, 0),
    [budgetsWithProgress]
  );
  const totalSpent = useMemo(
    () => budgetsWithProgress.reduce((sum, b) => sum + b.spent_amount, 0),
    [budgetsWithProgress]
  );

  // Alertas de orçamento estourado ou próximo do limite
  const overBudgetAlerts = useMemo(() => {
    const over: Array<{ name: string; percentage: number; isOver: boolean }> = [];
    budgetsWithProgress.forEach((b) => {
      const pct = Number(b.percentage_used) || 0;
      if (pct >= 80) {
        over.push({
          name: b.category_name || "Orçamento Global",
          percentage: pct,
          isOver: pct > 100,
        });
      }
    });
    return over;
  }, [budgetsWithProgress]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in pb-20">
        <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 border border-border/50 bg-card/50">
          <div className="space-y-3">
            <div className="skeleton h-10 w-56 rounded-xl" />
            <div className="skeleton h-4 w-72 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header com Glassmorphism */}
      <div className="sticky top-2 z-40 relative overflow-hidden rounded-4xl p-5 md:p-8 transition-all duration-700 ease-out bg-background/60 backdrop-blur-xl border border-border/40 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-3xl md:text-3xl tracking-tighter">
                Orçamentos
              </h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center cursor-help transition-transform hover:scale-110">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
                    <p className="font-bold text-sm">Controle Inteligente</p>
                    <p className="text-sm text-muted-foreground">
                      Aqui você define limites de gastos por categoria. O sistema possui{" "}
                      <strong>Rollover Automático</strong>: se você gastar menos que o limite em um
                      mês, o que sobrou será somado ao limite do mês seguinte!
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-muted-foreground mt-2 text-sm md:text-base font-medium flex items-center gap-2">
              Gestão de limites para{" "}
              {dateFns.format(safeCurrentDate, "MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button
            onClick={() => setShowNewBudgetDialog(true)}
            size="default"
            className="shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-12 px-6 w-full sm:w-auto font-bold rounded-2xl"
          >
            <Plus className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
            Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Mini Dashboard de Orçamentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-4xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Target className="w-16 h-16 text-primary" />
          </div>
          <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Target className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-sm sm:text-sm text-muted-foreground uppercase font-semibold tracking-widest truncate">
              Total Planejado
            </p>
            <p className="text-base sm:text-3xl font-display font-black truncate">
              {moneyUtils.format(totalBudgeted, "BRL")}
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 rounded-4xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-16 h-16 text-warning" />
          </div>
          <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-warning/10 flex items-center justify-center text-warning shrink-0">
            <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-sm sm:text-sm text-muted-foreground uppercase font-semibold tracking-widest truncate">
              Total Consumido
            </p>
            <p className="text-base sm:text-3xl font-display font-black truncate">
              {moneyUtils.format(totalSpent, "BRL")}
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 rounded-4xl border border-border/40 bg-gradient-to-br from-positive/10 to-card shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-16 h-16 text-positive" />
          </div>
          <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-positive/10 flex items-center justify-center text-positive shrink-0">
            <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-sm sm:text-sm text-muted-foreground uppercase font-semibold tracking-widest truncate">
              Disponível Total
            </p>
            <p className="text-base sm:text-3xl font-display font-black truncate text-positive">
              {moneyUtils.format(Math.max(0, totalBudgeted - totalSpent), "BRL")}
            </p>
          </div>
        </div>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Comece a planejar seus gastos"
          description="Estabeleça limites por categoria e conquiste paz de espírito acompanhando o orçamento em tempo real."
          action={
            <Button
              onClick={() => setShowNewBudgetDialog(true)}
              size="lg"
              className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Criar Primeiro Orçamento
            </Button>
          }
        />
      ) : (
        <>
          {/* Alertas de orçamento */}
          {overBudgetAlerts.length > 0 && (
            <div className="space-y-2">
              {overBudgetAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium animate-fade-in",
                    alert.isOver
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-warning/30 bg-warning/5 text-warning"
                  )}
                >
                  {alert.isOver ? (
                    <AlertCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                  )}
                  <span>
                    <strong>{alert.name}:</strong>{" "}
                    {alert.isOver
                      ? `${alert.percentage.toFixed(0)}% consumido — acima do limite!`
                      : `${alert.percentage.toFixed(0)}% consumido — próximo do limite.`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {budgetsWithProgress.map((b) => (
              <BudgetCard
                key={b.budget_id}
                budget={b}
                formatCurrency={(val, curr) => moneyUtils.format(val, curr || "BRL")}
                onEdit={(orig) => {
                  const budget = budgets.find((x) => x.id === orig.budget_id);
                  if (budget) {
                    setEditingBudget(budget);
                    setAmount(budget.amount.toString());
                    setCategoryId(budget.category_id || "");
                    setCurrency(budget.currency);
                  }
                }}
                onDelete={(id) => {
                  showActionFeedback("error");
                  deleteBudget(id);
                }}
              />
            ))}
          </div>
        </>
      )}

      <Dialog
        open={showNewBudgetDialog || !!editingBudget}
        onOpenChange={(o) => {
          if (!o) {
            setShowNewBudgetDialog(false);
            setEditingBudget(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:rounded-lg rounded-b-none sm:rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-2 bg-muted rounded-full" />
          </div>
          <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
            <DialogTitle className="font-display text-2xl font-bold">
              {editingBudget ? "Ajustar Planejamento" : "Novo Limite Mensal"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-6">
            <div className="space-y-2 mt-4">
              <Label className="text-sm uppercase font-bold tracking-widest text-muted-foreground">
                Categoria (Opcional)
              </Label>
              <Popover
                open={openCategoryPopover}
                onOpenChange={setOpenCategoryPopover}
                modal={true}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategoryPopover}
                    className="w-full justify-between rounded-xl h-12 font-normal"
                  >
                    {categoryId ? (
                      categories.find((c) => c.id === categoryId) ? (
                        <span className="flex items-center gap-2">
                          {categories.find((c) => c.id === categoryId)?.icon}{" "}
                          {categories.find((c) => c.id === categoryId)?.name}
                        </span>
                      ) : (
                        "Filtro Global"
                      )
                    ) : (
                      "Filtro Global"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar categoria…" />
                    <CommandList>
                      <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          key="all"
                          value="all"
                          onSelect={() => {
                            setCategoryId("");
                            setOpenCategoryPopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !categoryId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Filtro Global
                        </CommandItem>
                        {categories
                          .filter((c) => c.type === "expense")
                          .map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setCategoryId(c.id);
                                setOpenCategoryPopover(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  categoryId === c.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.icon} {c.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm uppercase font-bold tracking-widest text-muted-foreground">
                  Valor Limite
                </Label>
                <CurrencyInput
                  id="budgetAmount"
                  name="budgetAmount"
                  value={amount}
                  onChange={setAmount}
                  currency={currency}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm uppercase font-bold tracking-widest text-muted-foreground">
                  Moeda
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger
                    id="budgetCurrency"
                    name="budgetCurrency"
                    className="rounded-xl h-12"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableCurrencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {moneyUtils.getSymbol(c)} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl h-12"
                onClick={() => {
                  setShowNewBudgetDialog(false);
                  setEditingBudget(null);
                  resetForm();
                }}
              >
                Descartar
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 font-bold"
                onClick={handleSubmit}
                disabled={!amount || isCreating || isUpdating}
              >
                {editingBudget ? "Salvar" : "Ativar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
