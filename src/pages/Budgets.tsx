import { moneyUtils } from "@/utils/money";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Wallet, Target, TrendingUp, Check, ChevronsUpDown, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { useMonth } from "@/contexts/MonthContext";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { BudgetCard } from "@/components/budgets/BudgetCard";

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
  const { budgets = [], budgetsWithProgress = [], isLoading, createBudget, updateBudget, deleteBudget, isCreating, isUpdating } = useBudgets();
  
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [currency, setCurrency] = useState("BRL");
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);

  const availableCurrencies = useMemo(() => {
    const set = new Set<string>(["BRL"]);
    accounts.forEach(acc => { if (acc.is_international && acc.currency) set.add(acc.currency); });
    return Array.from(set);
  }, [accounts]);

  const resetForm = () => { setAmount(""); setCategoryId(""); setCurrency("BRL"); };

  const handleSubmit = () => {
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
      end_date: null 
    };
    if (editingBudget) { 
      updateBudget({ id: editingBudget.id, ...data }); 
      setEditingBudget(null); 
    } else { 
      createBudget(data); 
      setShowNewBudgetDialog(false); 
    }
    resetForm();
  };

  const totalBudgeted = useMemo(() => budgetsWithProgress.reduce((sum, b) => sum + b.budget_amount, 0), [budgetsWithProgress]);
  const totalSpent = useMemo(() => budgetsWithProgress.reduce((sum, b) => sum + b.spent_amount, 0), [budgetsWithProgress]);

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="space-y-3">
          <div className="skeleton h-10 w-56 rounded-xl" />
          <div className="skeleton h-4 w-72 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="skeleton h-24 rounded-3xl" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-3xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter">Orçamentos</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
                    <p className="font-bold text-sm">Controle Inteligente</p>
                    <p className="text-xs text-muted-foreground">
                      Aqui você define limites de gastos por categoria. O sistema possui <strong>Rollover Automático</strong>: se você gastar menos que o limite em um mês, o que sobrou será somado ao limite do mês seguinte!
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-muted-foreground mt-1 font-medium">
              Gestão de limites para {dateFns.format(safeCurrentDate, "MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button 
            onClick={() => setShowNewBudgetDialog(true)} 
            size="default"
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group h-11 w-full sm:w-auto font-bold"
          >
            <Plus className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" /> 
            Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total Planejado</p>
            <p className="text-2xl font-display font-bold">{moneyUtils.format(totalBudgeted, 'BRL')}</p>
          </div>
        </div>
        <div className="p-6 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total Consumido</p>
            <p className="text-2xl font-display font-bold">{moneyUtils.format(totalSpent, 'BRL')}</p>
          </div>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-[2rem] bg-muted/20">
          <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium text-lg">Comece a planejar seus gastos mensais</p>
          <Button variant="ghost" onClick={() => setShowNewBudgetDialog(true)} className="mt-4 text-primary">Criar meu primeiro orçamento</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgetsWithProgress.map(b => (
            <BudgetCard 
              key={b.budget_id} 
              budget={b} 
              formatCurrency={(val, curr) => moneyUtils.format(val, curr || 'BRL')} 
              onEdit={(orig) => { 
                const budget = budgets.find(x => x.id === orig.budget_id); 
                if (budget) { 
                  setEditingBudget(budget); 
                  setAmount(budget.amount.toString()); 
                  setCategoryId(budget.category_id || ""); 
                  setCurrency(budget.currency); 
                } 
              }} 
              onDelete={deleteBudget} 
            />
          ))}
        </div>
      )}

      <Dialog open={showNewBudgetDialog || !!editingBudget} onOpenChange={(o) => { if (!o) { setShowNewBudgetDialog(false); setEditingBudget(null); resetForm(); } }}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingBudget ? "Ajustar Planejamento" : "Novo Limite Mensal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Categoria (Opcional)</Label>
              <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategoryPopover}
                    className="w-full justify-between rounded-xl h-12 font-normal"
                  >
                    {categoryId
                      ? categories.find((c) => c.id === categoryId)
                        ? <span className="flex items-center gap-2">{categories.find((c) => c.id === categoryId)?.icon} {categories.find((c) => c.id === categoryId)?.name}</span>
                        : "Filtro Global"
                      : "Filtro Global"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar categoria..." />
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
                        {categories.filter(c => c.type === "expense").map((c) => (
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
                <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Valor Limite</Label>
                <CurrencyInput value={amount} onChange={setAmount} currency={currency} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableCurrencies.map(c => <SelectItem key={c} value={c}>{moneyUtils.getSymbol(c)} {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl h-12" onClick={() => { setShowNewBudgetDialog(false); setEditingBudget(null); resetForm(); }}>Descartar</Button>
            <Button className="rounded-xl h-12 px-8 font-bold" onClick={handleSubmit} disabled={!amount || isCreating || isUpdating}>
              {editingBudget ? "Salvar Alterações" : "Ativar Orçamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
