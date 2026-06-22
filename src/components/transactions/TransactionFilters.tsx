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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Filter, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TransactionFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  categories: any[];
  accounts: any[];
  hasFilters: boolean;
  clearFilters: () => void;
}

export function TransactionFilters({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedCategory,
  setSelectedCategory,
  selectedAccount,
  setSelectedAccount,
  selectedPeriod,
  setSelectedPeriod,
  showFilters,
  setShowFilters,
  categories,
  accounts,
  hasFilters,
  clearFilters
}: TransactionFiltersProps) {
  
  const FilterFields = () => (
    <>
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full h-12 md:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="INCOME">Receitas</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full h-12 md:h-10">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((cat) => (
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
      
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Conta</label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-full h-12 md:h-10">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Período</label>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full h-12 md:h-10">
            <SelectValue placeholder="Todo período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Últimos 7 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="lastMonth">Mês passado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 md:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 md:h-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 h-12 md:h-10 min-w-[44px]"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {hasFilters && (
            <span className="w-2 h-2 rounded-full bg-background" />
          )}
        </Button>
      </div>

      {/* Desktop Filters (Inline Grid) */}
      <div className="hidden sm:block">
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-border animate-fade-in">
            <FilterFields />
            {hasFilters && (
              <div className="flex items-end col-span-2 lg:col-span-4 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-muted-foreground w-full sm:w-auto"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Filters (Drawer via Dialog) */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:hidden !bottom-0 !top-auto !translate-y-0 rounded-t-[2rem] !rounded-b-none p-0 w-full shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500">
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-2 bg-muted rounded-full" />
          </div>
          <DialogHeader className="px-6 pt-2 pb-4 text-left">
            <DialogTitle className="font-display text-base font-bold">Filtros de Transação</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="px-6 pb-6 space-y-5">
              <FilterFields />
            </div>
          </ScrollArea>
          
          <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
            <Button onClick={() => setShowFilters(false)} className="w-full h-12 font-semibold">
              Aplicar Filtros
            </Button>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
                className="w-full h-12 gap-2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Limpar Todos
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
